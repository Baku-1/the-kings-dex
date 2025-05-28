// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    admin.initializeApp();
}

const dexDataFunctions = require('./dexData');
const adminTaskFunctions = require('./adminTasks');
// const scheduledTaskFunctions = require('./scheduledTasks'); // If you create scheduled tasks

// Export HTTPS Callable functions for DEX data
exports.getDexPublicStats = dexDataFunctions.getDexPublicStats;
exports.getKatanaPoolInfo = dexDataFunctions.getKatanaPoolInfo; // Specific to Phase 1
exports.getFarmDetails = dexDataFunctions.getFarmDetails;     // Will evolve for Phase 2

// Export HTTPS Callable functions for Admin tasks
exports.updateCuratedTokenList = adminTaskFunctions.updateCuratedTokenList;
exports.updateFeaturedFarms = adminTaskFunctions.updateFeaturedFarms;

// Example of a scheduled function (if you create scheduledTasks.js)
// exports.updateCachedDexStats = scheduledTaskFunctions.updateCachedDexStats;

// Example of Firestore trigger (if needed)
// exports.myFirestoreTrigger = functions.firestore
//    .document('someCollection/{docId}')
//    .onCreate((snap, context) => {
//        console.log('New document created:', snap.data());
//        return null;
//    });
