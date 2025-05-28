// functions/utils/contracts.js

// --- Ronin Chain Info ---
const RONIN_CHAIN_ID_MAINNET = '2020';
const RONIN_CHAIN_ID_SAIGON = '2021';
// Set this based on your target deployment (or get from env config)
const CURRENT_TARGET_CHAIN_ID = RONIN_CHAIN_ID_MAINNET;

// --- NXS Token (Your Deployed Token) ---
const NXS_TOKEN_ADDRESS = (CURRENT_TARGET_CHAIN_ID === RONIN_CHAIN_ID_MAINNET)
    ? '0xYOUR_NXS_MAINNET_ADDRESS' // Replace with your NXS mainnet address
    : '0xYOUR_NXS_SAIGON_ADDRESS';   // Replace with your NXS Saigon testnet address
const NXS_TOKEN_ABI = [/* --- PASTE YOUR NXS TOKEN ABI JSON HERE --- */];

// --- Katana DEX Contracts (Phase 1 - Ronin Mainnet Addresses) ---
// Replace with actual addresses if different or for Saigon
const KATANA_ROUTER_ADDRESS = (CURRENT_TARGET_CHAIN_ID === RONIN_CHAIN_ID_MAINNET)
    ? '0x7d0556d55ca1a92708681e2e231733ebd922597d' // Katana Router V3 (from search)
    : '0xSAIGON_KATANA_ROUTER_ADDRESS'; // Find and replace for Saigon
const KATANA_ROUTER_ABI = [/* --- PASTE KATANA ROUTER ABI JSON HERE --- */];
// You might also need Katana Factory ABI if you plan to list existing pools dynamically

const KATANA_FACTORY_ADDRESS = (CURRENT_TARGET_CHAIN_ID === RONIN_CHAIN_ID_MAINNET)
    ? '0xPcsFactoryAddressOnRoninMainnet' // Find actual Katana Factory address
    : '0xSAIGON_KATANA_FACTORY_ADDRESS';
const KATANA_FACTORY_ABI = [/* --- PASTE KATANA FACTORY ABI (e.g., UniswapV2Factory ABI) --- */];


// Minimal ERC20 ABI for common interactions
const ERC20_ABI_MINIMAL = [
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
    { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" },
    { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" },
    { "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "type": "function" },
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "type": "function" },
    { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "success", "type": "bool" }], "type": "function" }
];

// LP Token ABI (UniswapV2Pair ABI is common)
const LP_TOKEN_ABI = [
    {"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
    // ... add balanceOf, decimals, symbol, name if needed for LP tokens
];


// --- The King's Dex Custom Contracts (Phase 2 - Your Deployed Contracts) ---
// const KINGS_DEX_V2_FACTORY_ADDRESS = '0xYOUR_KD_V2_FACTORY_ADDRESS';
// const KINGS_DEX_V2_FACTORY_ABI = [/* ... */];
// const KINGS_DEX_V2_ROUTER_ADDRESS = '0xYOUR_KD_V2_ROUTER_ADDRESS';
// const KINGS_DEX_V2_ROUTER_ABI = [/* ... */];
// const KINGS_DEX_FARM_CONTROLLER_ADDRESS = '0xYOUR_KD_FARM_CONTROLLER_ADDRESS';
// const KINGS_DEX_FARM_CONTROLLER_ABI = [/* ... */];


module.exports = {
    NXS_TOKEN_ADDRESS,
    NXS_TOKEN_ABI,
    KATANA_ROUTER_ADDRESS,
    KATANA_ROUTER_ABI,
    KATANA_FACTORY_ADDRESS,
    KATANA_FACTORY_ABI,
    ERC20_ABI_MINIMAL,
    LP_TOKEN_ABI,
    // KINGS_DEX_V2_FACTORY_ADDRESS, KINGS_DEX_V2_FACTORY_ABI,
    // KINGS_DEX_V2_ROUTER_ADDRESS, KINGS_DEX_V2_ROUTER_ABI,
    // KINGS_DEX_FARM_CONTROLLER_ADDRESS, KINGS_DEX_FARM_CONTROLLER_ABI,
};
