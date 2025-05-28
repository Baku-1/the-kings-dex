// functions/utils/roninWeb3.js
const { Web3 } = require('web3');
const functions = require('firebase-functions');

// Configure your Ronin RPC Node URL
// For production, use the mainnet RPC. For testing, use Saigon.
// Store this in Firebase environment configuration for security:
// firebase functions:config:set ronin.rpc_url="YOUR_RONIN_MAINNET_RPC_URL"
// firebase functions:config:set ronin.saigon_rpc_url="YOUR_RONIN_SAIGON_RPC_URL"
// const rpcUrl = functions.config().ronin?.rpc_url || 'https://api.roninchain.com/rpc'; // Default, adjust as needed

// Using a placeholder for now, ensure you set this in Firebase config ^
const RONIN_RPC_URL = functions.config().ronin?.rpc_url || (process.env.FUNCTIONS_EMULATOR === 'true' 
    ? 'http://localhost:8545' // Example for local Ronin node via emulator or testnet
    : 'https://api.roninchain.com/rpc'); // Default to mainnet


let web3Instance;

function getWeb3Instance() {
    if (!web3Instance) {
        if (!RONIN_RPC_URL) {
            const errorMessage = "Ronin RPC URL is not configured. Set ronin.rpc_url in Firebase config.";
            console.error(errorMessage);
            throw new functions.https.HttpsError('internal', errorMessage);
        }
        try {
            const provider = new Web3.providers.HttpProvider(RONIN_RPC_URL);
            web3Instance = new Web3(provider);
        } catch (error) {
            console.error("Failed to initialize Web3 provider:", error);
            throw new functions.https.HttpsError('internal', 'Could not connect to Ronin RPC.');
        }
    }
    return web3Instance;
}

module.exports = { getWeb3Instance };
