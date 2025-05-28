// functions/dexData.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getWeb3Instance } = require('./utils/roninWeb3');
const {
    KATANA_ROUTER_ADDRESS, KATANA_ROUTER_ABI,
    KATANA_FACTORY_ADDRESS, KATANA_FACTORY_ABI,
    LP_TOKEN_ABI, ERC20_ABI_MINIMAL, NXS_TOKEN_ADDRESS
    // Import your Phase 2 contract details when ready
} = require('./utils/contracts');
const cors = require('cors')({ origin: true }); // Enable CORS for callable functions

const db = admin.firestore();

/**
 * Fetches overall public DEX statistics.
 * In Phase 1, this might fetch Katana's TVL/Volume or a subset relevant to King's Dex.
 * In Phase 2, it would fetch from your own deployed contracts.
 */
exports.getDexPublicStats = functions.https.onCall(async (data, context) => {
    // const web3 = getWeb3Instance();
    // const katanaFactory = new web3.eth.Contract(KATANA_FACTORY_ABI, KATANA_FACTORY_ADDRESS);

    try {
        // For Phase 1, fetching aggregated stats from a public DEX like Katana is complex
        // and often better handled by a dedicated indexing service or subgraph if available.
        // This function might serve cached data or simplified metrics.

        // Placeholder: Read from a cached document in Firestore updated by a scheduled job or admin
        const statsDoc = await db.collection('kingsDexInfo').doc('publicStats').get();
        if (statsDoc.exists && statsDoc.data().lastUpdated > Date.now() - (15 * 60 * 1000) /* 15 mins */) {
            return { success: true, stats: statsDoc.data() };
        }

        // --- Conceptual logic for fetching some data (highly simplified) ---
        // let totalValueLockedUSD = 0;
        // let volume24hUSD = 0;
        // const nxsPriceUSD = await getPriceOfToken(NXS_TOKEN_ADDRESS, web3); // Helper function needed

        // Example: Get number of pairs on Katana
        // const pairCount = await katanaFactory.methods.allPairsLength().call();
        // totalValueLockedUSD = ... complex calculation involving all pairs and their prices ...
        // volume24hUSD = ... typically requires event indexing or a subgraph ...
        // --- End conceptual logic ---


        const placeholderStats = {
            totalValueLockedUSD: "15,750,000", // Placeholder
            volume24hUSD: "2,300,000",       // Placeholder
            nxsPriceUSD: "0.35",             // Placeholder - needs a reliable NXS price feed
            source: "Katana DEX (via King's Dex - Phase 1 - Placeholder Data)",
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('kingsDexInfo').doc('publicStats').set(placeholderStats, {merge: true});
        return { success: true, stats: placeholderStats };

    } catch (error) {
        console.error("Error in getDexPublicStats:", error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch DEX stats.', error.message);
    }
});

/**
 * Fetches info for a specific Katana Liquidity Pool (Phase 1).
 * data: { tokenA_Address: string, tokenB_Address: string } OR { poolAddress: string }
 */
exports.getKatanaPoolInfo = functions.https.onCall(async (data, context) => {
    const { tokenA_Address, tokenB_Address, poolAddress: directPoolAddress } = data;
    const web3 = getWeb3Instance();

    if (!directPoolAddress && !(tokenA_Address && tokenB_Address)) {
        throw new functions.https.HttpsError('invalid-argument', 'Pool address or token pair addresses are required.');
    }

    try {
        const katanaFactory = new web3.eth.Contract(KATANA_FACTORY_ABI, KATANA_FACTORY_ADDRESS);
        let actualPoolAddress = directPoolAddress;

        if (!actualPoolAddress) {
            actualPoolAddress = await katanaFactory.methods.getPair(
                web3.utils.toChecksumAddress(tokenA_Address),
                web3.utils.toChecksumAddress(tokenB_Address)
            ).call();
        }

        if (!actualPoolAddress || actualPoolAddress === '0x0000000000000000000000000000000000000000') {
            throw new functions.https.HttpsError('not-found', 'Katana pool not found for the given tokens.');
        }

        const poolContract = new web3.eth.Contract(LP_TOKEN_ABI, actualPoolAddress);
        const reservesData = await poolContract.methods.getReserves().call();
        const token0_address = await poolContract.methods.token0().call();
        const token1_address = await poolContract.methods.token1().call();
        const totalSupplyLP = await poolContract.methods.totalSupply().call();

        // TODO: Fetch symbols, decimals, and prices for token0 and token1 to calculate TVL in USD
        // const token0_contract = new web3.eth.Contract(ERC20_ABI_MINIMAL, token0_address);
        // const token1_contract = new web3.eth.Contract(ERC20_ABI_MINIMAL, token1_address);
        // const token0_symbol = await token0_contract.methods.symbol().call();
        // const token1_symbol = await token1_contract.methods.symbol().call();
        // ... and so on

        return {
            success: true,
            poolAddress: actualPoolAddress,
            token0: { address: token0_address, /* symbol, */ reserves: reservesData._reserve0.toString() },
            token1: { address: token1_address, /* symbol, */ reserves: reservesData._reserve1.toString() },
            lpTotalSupply: totalSupplyLP.toString(),
            // tvlUSD: "...", // Requires price feeds and decimal adjustments
            // volume24hUSD: "...", // Requires event indexing or subgraph
            source: "Katana DEX Pool (via King's Dex - Phase 1)"
        };

    } catch (error) {
        console.error("Error in getKatanaPoolInfo:", error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch Katana pool info.', error.message);
    }
});


/**
 * Fetches details for featured farms (Phase 1 might point to Katana farms if relevant, Phase 2 for own farms).
 * data: { farmId: string (optional, for specific farm) }
 */
exports.getFarmDetails = functions.https.onCall(async (data, context) => {
    const { farmId } = data;

    try {
        // In Phase 1, this would likely read curated Katana farm info from Firestore.
        // In Phase 2, this would interact with your King's Dex Farm contracts.
        if (farmId) {
            const farmDoc = await db.collection('kingsDexInfo').doc('featuredFarms').collection('farms').doc(farmId).get();
            if (!farmDoc.exists) {
                throw new functions.https.HttpsError('not-found', `Farm with ID ${farmId} not found.`);
            }
            return { success: true, farm: farmDoc.data() };
        } else {
            const farmsSnapshot = await db.collection('kingsDexInfo').doc('featuredFarms').collection('farms').where('isActive', '==', true).orderBy('sortOrder').get();
            const farms = farmsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, farms: farms };
        }
    } catch (error) {
        console.error("Error in getFarmDetails:", error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch farm details.', error.message);
    }
});
