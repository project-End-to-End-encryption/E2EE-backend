#!/usr/bin/env node
/**
 * MongoDB persistence diagnostic
 *
 * Run against a running backend (or with MONGODB_URI set locally)
 * to answer: "are messages actually stored in MongoDB, or only in memory?"
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/yourdb node scripts/check-persistence.js
 *
 * If you don't have a script dir yet, drop this in the backend root
 * and run it with the same environment your server uses.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('Set MONGODB_URI env variable');
    process.exit(1);
}

async function run() {
    console.log(`Connecting to ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    const conn = mongoose.connection;

    console.log(`\nConnected to: ${conn.host}:${conn.port}/${conn.name}`);

    // List all collections
    const collections = await conn.db.listCollections().toArray();
    console.log(`\nCollections (${collections.length}):`);
    for (const c of collections.sort((a, b) => a.name.localeCompare(b.name))) {
        const count = await conn.db.collection(c.name).countDocuments();
        console.log(`  ${c.name}: ${count} documents`);
    }

    // Check the specific tables that matter by querying collections directly
    const importantCollections = [
        { name: 'messages', fields: ['senderId'] },
        { name: 'keybundles', fields: ['userId', 'deviceId'] },
        { name: 'conversations', fields: ['_id', 'memberIds'] },
        { name: 'pendingenvelopes', fields: ['toUserId', 'toDeviceId'] },
        { name: 'conversationstates', fields: ['userId', 'conversationId'] },
        { name: 'conversationkeys', fields: ['conversationId', 'userId', 'epoch'] }
    ];

    console.log('\n--- Key persistence checks ---\n');

    for (const collectionInfo of importantCollections) {
        const collectionName = collectionInfo.name;
        const collection = conn.db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`${collectionName}: ${count} documents`);

        if (count > 0) {
            const sample = await collection.findOne();
            console.log(`  sample._id: ${sample?._id}`);
            console.log(`  sample keys: ${Object.keys(sample || {}).slice(0, 10).join(', ')}`);
        }
    }

    // Check if MongoDB storage engine is in-memory (would not persist)
    console.log('\n--- Storage engine check ---\n');
    const serverInfo = await conn.db.admin().serverInfo();
    console.log(`Server version: ${serverInfo.version}`);
    const storageEngine = serverInfo.storageEngine || {};
    console.log(`Storage engine: ${storageEngine.name || 'unknown'}`);

    // Check if wiredTiger (default, persists) vs in-memory
    if (storageEngine.name === 'inMemory') {
        console.log('WARNING: MongoDB is running with in-memory storage engine!');
        console.log('Data will NOT survive a server restart unless you have journaling configured.');
    } else {
        console.log('OK: Using persistent storage engine');
    }

    // Removed: conn.db.collection(...).stats() is not a function

    console.log('\n--- Check for orphaned documents ---\n');
    // If keybundles has 0 entries for users who have sent messages,
    // that confirms the registration gap
    const messages = await conn.db.collection('messages').find().limit(5).toArray();
    const keyBundles = await conn.db.collection('keybundles').find().toArray();

    console.log(`Recent messages: ${messages.length}`);
    if (messages.length) {
        const userIds = [...new Set(messages.map(m => m.senderId?.toString()))].filter(Boolean);
        const bundleUserIds = new Set(keyBundles.map(k => k.userId?.toString()).filter(Boolean));
        const missing = userIds.filter(uid => !bundleUserIds.has(uid));
        if (missing.length) {
            console.log(`Users with messages but NO key bundle: ${missing.join(', ')}`);
            console.log('These users cannot be discovered via CONVERSATION_MEMBER_DEVICES');
        } else {
            console.log('All message senders have key bundles');
        }
    } else {
        console.log('No recent messages to check for orphaned key bundles.');
    }

    await mongoose.disconnect();
    console.log('\nDone.');
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});