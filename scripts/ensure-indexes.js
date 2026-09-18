/**
 *  Build every index explicitly
 *  run this before prod
 *
 *  node scripts/ensure-indexes.js
 */

import 'dotenv/config'
import mongoose from 'mongoose'

import {ConversationModel} from "../src/infrastructure/database/mongodb/models/conversation.model.js";
import {MessageModel} from "../src/infrastructure/database/mongodb/models/message.model.js";
import {ConversationStateModel} from "../src/infrastructure/database/mongodb/models/conversationState.model.js";
import {ConversationKeyModel} from "../src/infrastructure/database/mongodb/models/conversationKey.model.js";
import {PendingEnvelopeModel} from "../src/infrastructure/database/mongodb/models/pendingEnvelope.model.js";
import {RecoveryBlobModel} from "../src/infrastructure/database/mongodb/models/recoveryBlob.model.js";

const models = [
    ['Conversation', ConversationModel],
    ['Message', MessageModel],
    ['ConversationKey', ConversationKeyModel],
    ['ConversationState', ConversationStateModel],
    ['PendingEnvelope', PendingEnvelopeModel],
    ['RecoveryBlob', RecoveryBlobModel]
];

const run = async ()=>{
    await mongoose.connect(process.env.MONGODB_URI);

    for (const [name, model] of models) {
        const started = Date.now();
        await model.createIndexes();
        console.log(`[indexes] ${name} ok (${Date.now() - started}ms)`);
    }

    await mongoose.disconnect();
    console.log('[indexes] all done');
};

run().catch((error) => {
    console.error('[indexes] failed:', error);
    process.exit(1);
});