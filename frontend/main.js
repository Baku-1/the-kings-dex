// main.js for The King's Dex

// --- Configuration ---
const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY", // IMPORTANT: Replace
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // IMPORTANT: Replace
    projectId: "YOUR_PROJECT_ID", // IMPORTANT: Replace
    storageBucket: "YOUR_PROJECT_ID.appspot.com", // IMPORTANT: Replace
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // IMPORTANT: Replace
    appId: "YOUR_APP_ID" // IMPORTANT: Replace
};

const RONIN_CHAIN_ID_MAINNET = '2020';
const RONIN_CHAIN_ID_SAIGON = '2021'; // Testnet
const TARGET_CHAIN_ID = RONIN_CHAIN_ID_MAINNET; // USE RONIN_CHAIN_ID_SAIGON for testing
const TARGET_CHAIN_ID_HEX = `0x${parseInt(TARGET_CHAIN_ID).toString(16)}`;

const KATANA_ROUTER_ADDRESS = '0x7d0556d55ca1a92708681e2e231733ebd922597d'; // Ronin Mainnet Katana Router (prefixed with 0x for web3.js)
const KATANA_ROUTER_ABI = [/* --- IMPORTANT: PASTE KATANA ROUTER ABI JSON HERE --- */]; // Example: UniswapV2Router02 ABI structure or Katana's specific one

const NXS_TOKEN_ADDRESS = '0xYOUR_NXS_TOKEN_ADDRESS_ON_RONIN'; // Ensure 0x prefix
const NXS_TOKEN_SYMBOL = 'NXS';
const NXS_DECIMALS = 18;
const NXS_BURN_RATE = 0.07;

// Minimal ERC20 ABI for balance, approval, allowance, decimals
const ERC20_ABI_MINIMAL = [
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
    { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "success", "type": "bool" }], "type": "function" },
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "type": "function" },
    { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" },
    { "constant":true, "inputs":[], "name":"symbol", "outputs":[{"name":"","type":"string"}], "type":"function"},
    { "constant":true, "inputs":[], "name":"name", "outputs":[{"name":"","type":"string"}], "type":"function"}
];
// Native asset representation (WRON is typically used, or a zero address for some router functions)
const NATIVE_ASSET_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder for native asset if router needs it. Often, it's WRON.
const WRON_ADDRESS = '0xe514d9debe52238518070ddc22744a0cb60c6040'; // WRON on Ronin

// --- Global State & Elements ---
let web3;
let katanaRouterContract;
let currentUserAddress = null;
let currentChainId = null;
let userBalances = {}; // Cache for token balances: { [tokenAddress]: balanceString }

let MOCK_TOKEN_LIST = [ // Will be replaced by Firestore fetch
    { symbol: 'RON', name: 'Ronin', address: WRON_ADDRESS, icon: 'https://cdn.axieinfinity.com/dapp-assets/tokens/ron.png', decimals: 18, isNative: true }, // Representing WRON as the common form of RON in LPs
    { symbol: 'AXS', name: 'Axie Infinity Shards', address: '0x97a9107c179342bdcfa5f8e6768efd527dfb58e4', icon: 'https://cdn.axieinfinity.com/dapp-assets/tokens/axs.png', decimals: 18 },
    { symbol: 'SLP', name: 'Smooth Love Potion', address: '0xa8754b9fa15fc18bb594588158ec0541a3adacd9', icon: 'https://cdn.axieinfinity.com/dapp-assets/tokens/slp.png', decimals: 0 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x0b7007c13325c48911f73a2dad5fa5dcbf808adc', icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png', decimals: 6 },
    { symbol: NXS_TOKEN_SYMBOL, name: 'Nexus', address: NXS_TOKEN_ADDRESS, icon: 'https://placehold.co/64x64/F85AFF/FFFFFF?text=NXS&font=orbitron', decimals: NXS_DECIMALS }
];


// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletInfoDiv = document.getElementById('walletInfo');
const walletAddressSpan = document.getElementById('walletAddress');
const dexNavLinks = document.querySelectorAll('#dexNav .dex-nav-item');

const messageModal = document.getElementById('messageModal');
const modalTitleEl = document.getElementById('modalTitle'); // Renamed from modalTitle to avoid conflict
const modalMessageText = document.getElementById('modalMessageText');
const modalActionSpinner = document.getElementById('modalActionSpinner');
const modalTransactionLinkContainer = document.getElementById('modalTransactionLinkContainer');
const modalTransactionLink = document.getElementById('modalTransactionLink');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalEstimatedGasFeeEl = document.getElementById('modalEstimatedGasFee'); // Ensure this exists in your modal HTML: <p class="text-xs text-text-secondary mt-2 hidden">Estimated Gas Fee: <span id="modalEstimatedGasFee">-- RON</span></p>

const tokenSelectModal = document.getElementById('tokenSelectModal');
const tokenSearchInput = document.getElementById('tokenSearchInput');
const tokenListContainer = document.getElementById('tokenListContainer');
const closeTokenSelectModalBtn = document.getElementById('closeTokenSelectModalBtn');

const slippageModal = document.getElementById('slippageModal');
const customSlippageInput = document.getElementById('customSlippageInput');
const slippageOptionBtns = document.querySelectorAll('.slippage-option-btn');
const saveSlippageBtn = document.getElementById('saveSlippageBtn');
const closeSlippageModalBtn = document.getElementById('closeSlippageModalBtn');
const slippageDisplay = document.getElementById('slippageDisplay');


// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("King's Dex Initializing...");
    initFirebase();
    initSharedComponents();
    setActiveNavLink();
    loadTokenListFromSource(); // Load tokens early
    await attemptAutoConnectWallet();

    const currentPage = identifyCurrentPage();
    console.log("Current Page:", currentPage);

    // Page-specific initializations
    if (currentPage === 'index.html' || currentPage === '') { initLandingPage(); }
    else if (currentPage === 'swap.html') { initSwapPage(); }
    else if (currentPage === 'pools.html') { initPoolsPage(); }
    else if (currentPage === 'add-liquidity.html') { initAddLiquidityPage(); }
    else if (currentPage === 'farm.html') { initFarmPage(); }
    else if (currentPage === 'learn.html') { initLearnPage(); }
});

// --- Firebase Initialization ---
function initFirebase() { /* ... (same as before) ... */ }

// --- Shared Component Initialization & Logic ---
function initSharedComponents() { /* ... (same as before) ... */ }
function identifyCurrentPage() { /* ... (same as before) ... */ }
function setActiveNavLink() { /* ... (same as before) ... */ }

// --- Wallet Management ---
async function attemptAutoConnectWallet() { /* ... (same as before) ... */ }

async function connectWallet(isAutoConnect = false) {
    if (!(window.ronin && window.ronin.provider)) {
        if (!isAutoConnect) showModal("Ronin Wallet Not Found", "Please install Ronin Wallet.", true);
        return;
    }
    try {
        const provider = window.ronin.provider;
        web3 = new Web3(provider);

        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
            currentUserAddress = web3.utils.toChecksumAddress(accounts[0]);
            currentChainId = await provider.request({ method: 'eth_chainId' });

            if (currentChainId !== TARGET_CHAIN_ID_HEX) {
                if (!isAutoConnect) showModal("Wrong Network", `Please switch to Ronin ${TARGET_CHAIN_ID === RONIN_CHAIN_ID_MAINNET ? 'Mainnet' : 'Saigon Testnet'}. Current: ${currentChainId}`, true);
                return disconnectWallet();
            }

            if (KATANA_ROUTER_ABI && KATANA_ROUTER_ABI.length > 0) {
                katanaRouterContract = new web3.eth.Contract(KATANA_ROUTER_ABI, KATANA_ROUTER_ADDRESS);
            } else {
                console.error("Katana Router ABI is missing or empty! Swap functionality will be affected.");
                if (!isAutoConnect) showModal("DEX Error", "Katana Router ABI not loaded. Swap functionality limited.", true);
            }

            updateWalletUI(currentUserAddress);
            sessionStorage.setItem('kingsDexWalletConnected', 'true');
            if (!isAutoConnect) showModal("Wallet Connected", `Connected: ${truncateAddress(currentUserAddress)}`, false, 3000);
            refreshPageDataForWallet();

            provider.on('accountsChanged', handleAccountsChanged);
            provider.on('chainChanged', handleChainChanged);
        } else { /* ... (handle no accounts) ... */ }
    } catch (error) { /* ... (handle error) ... */ }
}

function disconnectWallet() { /* ... (same as before) ... */ }
function handleAccountsChanged(accounts) { /* ... (same as before, ensure checksum address) ... */ }
function handleChainChanged(chainId) { /* ... (same as before) ... */ }

function refreshPageDataForWallet() {
    const currentPage = identifyCurrentPage();
    if (currentPage === 'swap.html') refreshSwapPageBalances();
    // ... other page refreshes
}

function updateWalletUI(address) {
    if (address) {
        if (walletAddressSpan) walletAddressSpan.textContent = truncateAddress(address);
        if (connectWalletBtn) connectWalletBtn.classList.add('hidden');
        if (walletInfoDiv) walletInfoDiv.classList.remove('hidden');
    } else {
        if (walletAddressSpan) walletAddressSpan.textContent = '';
        if (connectWalletBtn) connectWalletBtn.classList.remove('hidden');
        if (walletInfoDiv) walletInfoDiv.classList.add('hidden');
    }
    updateActionButtonStatesAllPages();
}
function truncateAddress(address) { /* ... (same as before) ... */ }

// --- Modal Controls & Gas Display ---
function showModal(title, message, isError = false, autoCloseDelay = 0, txHash = null, estimatedGasFeeRON = null) {
    if (!messageModal) return;
    if (modalTitleEl) modalTitleEl.textContent = title;
    if (modalMessageText) modalMessageText.textContent = message;

    if(modalTitleEl) modalTitleEl.className = `section-title text-xl mb-4 ${isError ? '!border-accent-red text-accent-red' : '!border-accent-green text-accent-green'}`;
    
    if (modalActionSpinner) modalActionSpinner.classList.add('hidden');

    const gasFeeDisplayParent = modalEstimatedGasFeeEl ? modalEstimatedGasFeeEl.parentElement : null;
    if (gasFeeDisplayParent) {
        if (estimatedGasFeeRON) {
            modalEstimatedGasFeeEl.textContent = `${estimatedGasFeeRON} RON`;
            gasFeeDisplayParent.classList.remove('hidden');
        } else {
            gasFeeDisplayParent.classList.add('hidden');
        }
    }

    if (txHash && modalTransactionLink && modalTransactionLinkContainer) {
        const explorerBase = TARGET_CHAIN_ID === RONIN_CHAIN_ID_SAIGON ? 'https://saigon-app.roninchain.com/tx/' : 'https://app.roninchain.com/tx/';
        modalTransactionLink.href = explorerBase + txHash;
        modalTransactionLinkContainer.classList.remove('hidden');
    } else if (modalTransactionLinkContainer) {
        modalTransactionLinkContainer.classList.add('hidden');
    }

    messageModal.classList.add('active');
    if (closeModalBtn && (isError || txHash || autoCloseDelay > 0)) { // Show close button for errors, tx, or if it's not a persistent loading
        closeModalBtn.classList.remove('hidden');
    }


    if (autoCloseDelay > 0) {
        setTimeout(hideModal, autoCloseDelay);
    }
}

function showTxModal(title, message, txHash, estimatedGasFeeRON = null) {
    showModal(title, message, false, 0, txHash, estimatedGasFeeRON);
}

function showLoadingModal(title, message = "Please wait...", estimatedGasFeeRON = null) {
    if (!messageModal) return;
    showModal(title, message, false, 0, null, estimatedGasFeeRON);
    if (modalActionSpinner) modalActionSpinner.classList.remove('hidden');
    if (closeModalBtn) closeModalBtn.classList.add('hidden');
}

function hideModal() {
    if (!messageModal) return;
    messageModal.classList.remove('active');
    if (modalActionSpinner) modalActionSpinner.classList.add('hidden');
    if (closeModalBtn) closeModalBtn.classList.remove('hidden');
}


// --- Token Management & Selection ---
async function loadTokenListFromSource() {
    // TODO: Replace MOCK_TOKEN_LIST with a fetch from Firestore
    // This list should be curated by Kingdom Koders and stored in Firestore.
    // For now, we use the mock. Ensure addresses are checksummed if not already.
    MOCK_TOKEN_LIST = MOCK_TOKEN_LIST.map(token => ({
        ...token,
        address: web3 ? web3.utils.toChecksumAddress(token.address) : token.address // Checksum if web3 is available
    }));
    console.log("Token list loaded/processed.");
}
let tokenSelectionContext = { type: null, currentTokenSymbol: null };

function openTokenSelectModal(contextType, currentSymbolToExclude = null) { /* ... (same as before, uses MOCK_TOKEN_LIST) ... */ }
function closeTokenSelectModal() { /* ... (same as before) ... */ }
function populateTokenList(tokens) { /* ... (same as before, ensure token addresses are checksummed) ... */ }

// --- Slippage Modal Logic ---
// ... (same as before, uses sessionStorage) ...

// --- Gas Estimation Helper ---
async function estimateTransactionGas(transactionMethod, txOptions = {}) {
    if (!web3 || !currentUserAddress || !transactionMethod) {
        console.warn("Web3 provider, user address or transaction method not available for gas estimation.");
        return { error: "Connection or contract issue." };
    }
    try {
        const gasAmount = await transactionMethod.estimateGas({ from: currentUserAddress, ...txOptions });
        const currentGasPrice = await web3.eth.getGasPrice();
        const gasFeeWei = BigInt(gasAmount) * BigInt(currentGasPrice);
        const gasFeeRON = web3.utils.fromWei(gasFeeWei.toString(), 'ether');
        return {
            gasAmount: gasAmount.toString(),
            gasPrice: currentGasPrice.toString(),
            gasFeeRON: parseFloat(gasFeeRON).toFixed(6) // Display friendly
        };
    } catch (error) {
        console.error("Gas estimation failed:", error);
        if (error.message && error.message.toLowerCase().includes("insufficient funds")) {
            return { error: "Insufficient RON for gas." };
        }
        // Attempt to extract revert reason
        if (error.message && error.data && error.data.message) {
             return { error: `Estimation failed: ${error.data.message}` };
        }
        return { error: "Gas estimation failed. Tx may revert." };
    }
}


// --- Page Specific Initializers & Logic ---

// ======= LANDING PAGE (index.html) =======
// ... (initLandingPage, fetchDexStats - same as before) ...

// ======= SWAP PAGE (swap.html) =======
let swapState = {
    fromToken: null, toToken: null, fromAmount: '', toAmount: '',
    slippage: parseFloat(sessionStorage.getItem('kingsDexSlippage') || '0.5') / 100,
    priceInfo: null,
    lastQuoteTimer: null
};
// ... (initSwapPage, selectTokenForSwap, handleSwapDirection, useMaxFromAmount remain largely same) ...
// ... (updateSwapPriceInfo, updateSwapButtonState also remain similar) ...

async function fetchTokenBalance(tokenAddress, balanceElement, tokenDecimals = 18) {
    if (!currentUserAddress || !web3) {
        if (balanceElement) balanceElement.textContent = '0.00';
        userBalances[tokenAddress] = '0';
        return '0';
    }
    try {
        let balanceWei;
        const checksumAddress = web3.utils.toChecksumAddress(tokenAddress);

        if (checksumAddress === web3.utils.toChecksumAddress(WRON_ADDRESS) || tokenAddress === NATIVE_ASSET_ADDRESS) { // Check for native RON / WRON
            balanceWei = await web3.eth.getBalance(currentUserAddress);
        } else {
            const tokenContract = new web3.eth.Contract(ERC20_ABI_MINIMAL, checksumAddress);
            balanceWei = await tokenContract.methods.balanceOf(currentUserAddress).call();
        }
        const formattedBalance = web3.utils.fromWei(balanceWei.toString(), 'ether'); // Assuming 18 decimals for display convenience
        // For precise formatting based on actual token decimals:
        // const formattedPrecise = web3.utils.fromWei(balanceWei.toString(), web3.utils.unitMap[Object.keys(web3.utils.unitMap).find(key => web3.utils.unitMap[key] === Math.pow(10, tokenDecimals).toString()) || 'ether']);
        
        const displayBalance = parseFloat(formattedBalance).toFixed(4);
        if (balanceElement) balanceElement.textContent = displayBalance;
        userBalances[tokenAddress] = balanceWei.toString(); // Store raw wei balance
        return balanceWei.toString();
    } catch (error) {
        console.error(`Error fetching balance for ${tokenAddress}:`, error);
        if (balanceElement) balanceElement.textContent = 'Error';
        userBalances[tokenAddress] = '0';
        return '0';
    }
}


async function getSwapQuote() {
    if (!swapState.fromToken || !swapState.toToken || !swapState.fromAmount || parseFloat(swapState.fromAmount) <= 0 || !katanaRouterContract) {
        if(document.getElementById('toAmount')) document.getElementById('toAmount').value = '';
        if(document.getElementById('priceInfoContainer')) document.getElementById('priceInfoContainer').classList.add('hidden');
        updateSwapButtonState();
        return;
    }

    const toAmountEl = document.getElementById('toAmount');
    if(toAmountEl) toAmountEl.value = 'Fetching...';

    // Debounce logic
    if (swapState.lastQuoteTimer) clearTimeout(swapState.lastQuoteTimer);
    swapState.lastQuoteTimer = setTimeout(async () => {
        try {
            const amountIn = web3.utils.toWei(swapState.fromAmount.toString(), swapState.fromToken.decimals);
            // Ensure path is correct, often WRON is used as intermediary instead of native RON address for pairs
            const path = [
                swapState.fromToken.isNative ? WRON_ADDRESS : swapState.fromToken.address,
                swapState.toToken.isNative ? WRON_ADDRESS : swapState.toToken.address
            ];
            // If one token is native (RON) and the other is not WRON, the path might just be [WRON, OtherToken] or [OtherToken, WRON]
            // Consult Katana documentation for exact pathing with native RON vs WRON.

            // Example call for UniswapV2-like router. Katana V3 might be different.
            const amountsOut = await katanaRouterContract.methods.getAmountsOut(amountIn, path).call();
            const receivedAmountWei = amountsOut[amountsOut.length - 1]; // Last element is the output amount
            
            swapState.toAmount = web3.utils.fromWei(receivedAmountWei.toString(), swapState.toToken.decimals);
            if(toAmountEl) toAmountEl.value = parseFloat(swapState.toAmount).toFixed(6); // Display up to 6 decimals

            const rate = parseFloat(swapState.toAmount) / parseFloat(swapState.fromAmount);
            updateSwapPriceInfo(rate);
        } catch (error) {
            console.error("Error getting swap quote from Katana:", error);
            if(toAmountEl) toAmountEl.value = 'N/A';
            if(document.getElementById('priceInfoContainer')) document.getElementById('priceInfoContainer').classList.add('hidden');
            showModal("Quote Error", "Could not fetch swap details. The pair might not exist or liquidity is low.", true, 3000);
        }
        updateSwapButtonState();
    }, 500); // 500ms debounce
}

async function handleConfirmSwap(event) {
    event.preventDefault();
    if (!currentUserAddress || !katanaRouterContract || !swapState.fromToken || !swapState.toToken || !swapState.fromAmount || parseFloat(swapState.fromAmount) <= 0) {
        showModal("Swap Error", "Please connect wallet, select tokens, and enter a valid amount.", true); return;
    }

    const amountIn = swapState.fromAmount.toString();
    const amountInWei = web3.utils.toWei(amountIn, swapState.fromToken.decimals);
    // Calculate minimum amount out based on slippage
    const amountOutMinWei = web3.utils.toWei(
        (parseFloat(swapState.toAmount) * (1 - swapState.slippage)).toFixed(swapState.toToken.decimals), // Ensure enough precision for toWei
        swapState.toToken.decimals
    );

    const path = [
        swapState.fromToken.isNative ? WRON_ADDRESS : swapState.fromToken.address,
        swapState.toToken.isNative ? WRON_ADDRESS : swapState.toToken.address
    ];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    let swapTxMethod;
    let txOptions = { from: currentUserAddress };

    // Determine correct Katana router method based on native token involvement
    if (swapState.fromToken.isNative) { // Swapping FROM Native RON (actually WRON if path uses it)
        // swapTxMethod = katanaRouterContract.methods.swapExactETHForTokens(amountOutMinWei, path, currentUserAddress, deadline);
        // txOptions.value = amountInWei; // Value is msg.value for native token swaps
        // For now, assume all swaps are Token-to-Token or require WRON
        showModal("Unsupported Swap", "Native RON swaps directly are complex with this mock. Please use WRON for now.", true); return;
    } else if (swapState.toToken.isNative) { // Swapping TO Native RON
        // swapTxMethod = katanaRouterContract.methods.swapExactTokensForETH(amountInWei, amountOutMinWei, path, currentUserAddress, deadline);
        showModal("Unsupported Swap", "Native RON swaps directly are complex with this mock. Please use WRON for now.", true); return;
    } else { // Token-to-Token
        swapTxMethod = katanaRouterContract.methods.swapExactTokensForTokens(amountInWei, amountOutMinWei, path, currentUserAddress, deadline);
    }

    if (!swapTxMethod) {
        showModal("Swap Error", "Could not determine swap method.", true); return;
    }
    
    showLoadingModal("Estimating Gas", "Calculating transaction cost...");
    const gasEstimateResult = await estimateTransactionGas(swapTxMethod, txOptions);
    hideModal();

    if (gasEstimateResult.error) {
        showModal("Gas Estimation Failed", gasEstimateResult.error, true); return;
    }

    const summary = `Swap ${amountIn} ${swapState.fromToken.symbol} for ~${swapState.toAmount} ${swapState.toToken.symbol}. Min received: ${web3.utils.fromWei(amountOutMinWei, swapState.toToken.decimals)} ${swapState.toToken.symbol}.`;
    const nxsWarning = (swapState.fromToken.symbol === NXS_TOKEN_SYMBOL || swapState.toToken.symbol === NXS_TOKEN_SYMBOL) ? `NXS 7% burn applies.` : "";

    showModal("Confirm Swap", `${summary}\n${nxsWarning}`, false, 0, null, gasEstimateResult.gasFeeRON);
    // Replace JS confirm with a styled modal confirmation step in a real app
    const userConfirmed = await new Promise(resolve => {
        // Add 'Confirm' and 'Cancel' buttons to your modal, call resolve(true/false)
        // For this example, using browser confirm:
        const browserConfirm = confirm(`Confirm Swap:\n${summary}\n${nxsWarning}\nEstimated Gas: ~${gasEstimateResult.gasFeeRON} RON\n\nProceed?`);
        resolve(browserConfirm);
    });
    hideModal(); // Close the confirmation modal if it was custom

    if (!userConfirmed) {
        showModal("Swap Cancelled", "The swap was cancelled.", false, 2000); return;
    }

    try {
        if (!swapState.fromToken.isNative) { // ERC20 token needs approval
            showLoadingModal("Approval Required", `Checking ${swapState.fromToken.symbol} allowance...`, gasEstimateResult.gasFeeRON);
            const allowanceMet = await checkAndRequestApproval(swapState.fromToken.address, KATANA_ROUTER_ADDRESS, amountInWei);
            if (!allowanceMet) {
                 hideModal(); // Hide approval loading
                 showModal("Approval Failed", `Could not get approval for ${swapState.fromToken.symbol}. Swap cancelled.`, true);
                 return;
            }
        }
        
        showLoadingModal("Executing Swap", "Please confirm transaction in your wallet.", gasEstimateResult.gasFeeRON);
        txOptions.gas = gasEstimateResult.gasAmount; // Pass estimated gas limit

        const txReceipt = await swapTxMethod.send(txOptions)
            .on('transactionHash', (hash) => {
                showLoadingModal("Swap Submitted", `Tx: ${truncateAddress(hash)}. Waiting for confirmation...`, gasEstimateResult.gasFeeRON);
            });

        hideModal();
        showTxModal("Swap Successful!", `${amountIn} ${swapState.fromToken.symbol} swapped.`, txReceipt.transactionHash, gasEstimateResult.gasFeeRON);
        if(document.getElementById('swapForm')) document.getElementById('swapForm').reset();
        swapState.fromAmount = ''; swapState.toAmount = '';
        updateSwapButtonState();
        refreshSwapPageBalances();

    } catch (error) {
        console.error("Swap execution error:", error);
        hideModal();
        showModal("Swap Failed", `Error: ${error.message || 'Transaction failed.'}`, true, 0, null, gasEstimateResult?.gasFeeRON);
    }
}

async function checkAndRequestApproval(tokenAddress, spenderAddress, amountToApproveWei) {
    if (!web3 || !currentUserAddress) return false;
    const tokenContract = new web3.eth.Contract(ERC20_ABI_MINIMAL, tokenAddress);
    const currentAllowance = await tokenContract.methods.allowance(currentUserAddress, spenderAddress).call();

    if (BigInt(currentAllowance) < BigInt(amountToApproveWei)) {
        showLoadingModal("Approval Required", `Approving ${MOCK_TOKEN_LIST.find(t => t.address === tokenAddress)?.symbol || 'token'} for Katana Router...`);
        try {
            const approveMethod = tokenContract.methods.approve(spenderAddress, amountToApproveWei); // Can also use MaxUint256
            const gasForApproval = await estimateTransactionGas(approveMethod);
            
            if(gasForApproval.error){
                showModal("Approval Gas Error", gasForApproval.error, true); return false;
            }
            // Update loading modal with gas info for approval
            showLoadingModal("Approval Required", `Approving token... Please confirm in wallet. Gas: ~${gasForApproval.gasFeeRON} RON`);


            const approvalReceipt = await approveMethod.send({ from: currentUserAddress, gas: gasForApproval.gasAmount });
            showTxModal("Approval Successful", `Approved spending of tokens.`, approvalReceipt.transactionHash, gasForApproval.gasFeeRON);
            await new Promise(r => setTimeout(r, 1500)); // Brief pause for user to see
            return true;
        } catch (err) {
            console.error("Approval failed:", err);
            hideModal();
            showModal("Approval Failed", `Could not approve token: ${err.message}`, true);
            return false;
        }
    }
    return true; // Allowance already sufficient
}


// ======= POOLS PAGE (pools.html) & ADD LIQUIDITY PAGE (add-liquidity.html) =======
// ... (init functions and UI updaters will need similar gas estimation for add/remove liquidity transactions) ...
// Example: Adding to an addLiquidity form submit handler:
// const addLiqTxObject = katanaRouterContract.methods.addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline);
// const gasEstimate = await estimateTransactionGas(addLiqTxObject, { value: (if adding native RON) });
// Then show confirmation with gas, then .send()

// ======= FARM PAGE (farm.html) =======
// ... (initFarmPage, loadAvailableFarms) ...
// handleConfirmStakeAction will need gas estimation similar to handleConfirmSwap
// const stakeTxObject = farmContract.methods.stake(amountInWei);
// const gasEstimate = await estimateTransactionGas(stakeTxObject);
// Then show confirmation with gas, then .send()

// ======= LEARN PAGE (learn.html) =======
// ... (initLearnPage, IL calculator logic - same as before) ...

// --- Utility Functions ---
function updateActionButtonStatesAllPages() { /* ... (same as before) ... */ }
// ... (token selection handlers and search input listener) ...

// Make sure to call loadTokenListFromSource early if it's an async fetch from Firestore
// window.onload or similar might be too late if other functions depend on MOCK_TOKEN_LIST immediately.
// For now, it's synchronous with the mock.
