/**
 * Garbage-collect
 *
 *   When a user resets their vault ("I lost my recovery key"), recovery.service
 *   deletes their ConversationKey rows but deliberately leaves Message rows alone -
 *   in a group, the other members still need that shared ciphertext.
 *
 *   But in a 1:1 chat where BOTH sides have reset, or a group everyone has left,
 *   zero ConversationKey rows remain. The ciphertext is now undecryptable by every
 *   living key on the planet: pure dead storage, forever.
 *
 *   This job finds those conversations and deletes their messages. It is the only
 *   safe place to do it
 *
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { ConversationModel } from '../src/infrastructure/database/mongodb/models/conversation.model.js';
import { ConversationKeyModel } from '../src/infrastructure/database/mongodb/models/conversationKey.model.js';
import { MessageModel } from '../src/infrastructure/database/mongodb/models/message.model.js';

const DRY_RUN = process.argv.includes('--dry');
const GRACE_DAYS = 7;
const BATCH_SIZE = 100;


const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[purge] connected${DRY_RUN ? ' (DRY RUN)' : ''}`);

    const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);

    const cursor = ConversationModel.find(
        {lastSeq: {$gt: 0}, updatedAt: {$lt: cutoff}},
        {_id: 1, type: 1, lastSeq: 1}
    ).lean().cursor({batchSize: BATCH_SIZE});

    let examined = 0;
    let purgedConversations = 0;
    let purgedMessages = 0;

    for await (const conversation of cursor) {
        examined += 1;
        const conversationId = conversation._id.toString();

        const keyCount = await ConversationKeyModel.countDocuments({ conversationId });
        if (keyCount > 0) continue;   // somebody can still read it - leave it alone

        const messageCount = await MessageModel.countDocuments({ conversationId });
        if (messageCount === 0) continue;

        if (DRY_RUN) {
            console.log(`[purge] would delete ${messageCount} messages from ${conversationId} (${conversation.type})`);
        } else {
            const result = await MessageModel.deleteMany({ conversationId });
            await ConversationModel.updateOne({ _id: conversationId }, { $set: { isActive: false } });
            purgedMessages += result.deletedCount;
        }

        purgedConversations += 1;
    }

    console.log(`[purge] done. examined=${examined} conversations=${purgedConversations} messages=${purgedMessages}`);
    await mongoose.disconnect();

    run().catch((error) => {
        console.error('[purge] failed:', error);
        process.exit(1);
    });

}
