// functions/adminTasks.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

// Basic Admin Auth Check (REPLACE WITH ROBUST CUSTOM CLAIMS OR SECURE METHOD)
const checkAdminAuth = (context) => {
    if (!context.auth) { // Basic check if user is authenticated
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required.');
    }
    // TODO: Implement a real admin check, e.g., based on UID or custom claims
    // const adminUIDs = ["YOUR_FIREBASE_ADMIN_UID_1", "YOUR_FIREBASE_ADMIN_UID_2"];
    // if (!adminUIDs.includes(context.auth.uid)) {
    //     throw new functions.https.HttpsError('permission-denied', 'User not authorized for admin actions.');
    // }
    console.warn("Performing admin task with basic auth check for UID:", context.auth.uid); // Log for now
};

/**
 * Updates the curated list of tokens displayed on The King's Dex.
 * data: { tokens: [ { name, symbol, address (checksummed), iconUrl, decimals, chain ('ronin'), isWhitelistedForSwap, isWhitelistedForLP } ] }
 */
exports.updateCuratedTokenList = functions.https.onCall(async (data, context) => {
    checkAdminAuth(context);
    const { tokens } = data;
    if (!Array.isArray(tokens)) {
        throw new functions.https.HttpsError('invalid-argument', '"tokens" must be an array.');
    }

    try {
        const batch = db.batch();
        const listRef = db.collection('kingsDexInfo').doc('tokenLists').collection('curatedTokens');

        // Simple approach: clear old list and add new ones.
        // Or, update based on address if you want to preserve other fields.
        const snapshot = await listRef.get();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));

        tokens.forEach(token => {
            if (token.address && token.symbol && token.name && typeof token.decimals === 'number') {
                const docRef = listRef.doc(token.address.toLowerCase()); // Use address as ID
                batch.set(docRef, {
                    name: token.name,
                    symbol: token.symbol,
                    address: token.address.toLowerCase(), // Store consistently
                    iconUrl: token.iconUrl || '',
                    decimals: token.decimals,
                    chain: token.chain || 'ronin',
                    isWhitelistedForSwap: typeof token.isWhitelistedForSwap === 'boolean' ? token.isWhitelistedForSwap : true,
                    isWhitelistedForLP: typeof token.isWhitelistedForLP === 'boolean' ? token.isWhitelistedForLP : true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                console.warn("Skipping invalid token data:", token);
            }
        });

        await batch.commit();
        return { success: true, message: `Curated token list updated with ${tokens.length} tokens.` };
    } catch (error) {
        console.error("Error in updateCuratedTokenList:", error);
        throw new functions.https.HttpsError('internal', 'Failed to update token list.', error.message);
    }
});


/**
 * Updates the list of featured/curated farms displayed on The King's Dex.
 * data: { farms: [ { farmId (e.g., "NXS-RON-LP-Katana" or "KD-NXS-Single-Stake-V2"),
 * stakeTokenSymbol, stakeTokenAddress, rewardTokenSymbol, rewardTokenAddress,
 * platformLink (e.g., to Katana or King's Dex Phase 2 farm),
 * notes, isActive, sortOrder, aprSource (e.g., "KatanaAPI", "KingDexContract") } ] }
 */
exports.updateFeaturedFarms = functions.https.onCall(async (data, context) => {
    checkAdminAuth(context);
    const { farms } = data;
    if (!Array.isArray(farms)) {
        throw new functions.https.HttpsError('invalid-argument', '"farms" must be an array.');
    }

    try {
        const batch = db.batch();
        const listRef = db.collection('kingsDexInfo').doc('featuredFarms').collection('farms');

        farms.forEach(farm => {
            if (farm.farmId && farm.stakeTokenSymbol && farm.rewardTokenSymbol) {
                const docRef = listRef.doc(farm.farmId);
                batch.set(docRef, {
                    farmId: farm.farmId,
                    stakeTokenSymbol: farm.stakeTokenSymbol,
                    stakeTokenAddress: farm.stakeTokenAddress || null, // May not always be a single address for LP
                    stakeTokenIconUrl1: farm.stakeTokenIconUrl1 || '', // For LP pairs
                    stakeTokenIconUrl2: farm.stakeTokenIconUrl2 || '', // For LP pairs
                    rewardTokenSymbol: farm.rewardTokenSymbol,
                    rewardTokenAddress: farm.rewardTokenAddress || null,
                    rewardTokenIconUrl: farm.rewardTokenIconUrl || '',
                    platformName: farm.platformName || "Katana DEX (via King's Dex)", // "The King's Dex" for Phase 2
                    platformLink: farm.platformLink || '', // Link to Katana UI or your farm UI
                    notes: farm.notes || '',
                    isActive: typeof farm.isActive === 'boolean' ? farm.isActive : true,
                    sortOrder: typeof farm.sortOrder === 'number' ? farm.sortOrder : 0,
                    // aprSource: farm.aprSource || 'manual', // How APR is fetched/updated
                    // currentAPR: farm.currentAPR || "Fetching...", // Can be updated by another job
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            } else {
                console.warn("Skipping invalid farm data:", farm);
            }
        });

        await batch.commit();
        return { success: true, message: `Featured farms updated with ${farms.length} entries.` };
    } catch (error) {
        console.error("Error in updateFeaturedFarms:", error);
        throw new functions.https.HttpsError('internal', 'Failed to update farms list.', error.message);
    }
});
