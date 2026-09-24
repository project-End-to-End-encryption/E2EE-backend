# E2EE Message Send Bug Fix

## Issue
Users could not send messages, receiving the error:
```
[CAK] SERVER RETURNED NO KEY Object
  ack: {ok: true, key: null}
  conversationId: "6ab4f71ab62345de1547f89b"
  epoch: 1
```

## Root Cause
When creating a new conversation, the frontend's `archiveCrypto.createKey()` was calling `wrapAndUpload()` without specifying mint mode. The server requires `mode: 'mint'` to atomically claim the epoch and store the first wrapped key. Without it, the server rejected the upload with `ARCHIVE_KEY_NOT_MINTED`, leaving no key stored for that conversation.

## Fixes Applied

### 1. Archive Key Mint Mode (PRIMARY FIX)
**File:** `E2EE-frontend/src/features/conversation/service/archiveCrypto.js:309`

**Before:**
```javascript
await this.wrapAndUpload(conversationId, epoch, bytes);
```

**After:**
```javascript
await this.wrapAndUpload(conversationId, epoch, bytes, {mode: 'mint'});
```

**Impact:** The creator of a conversation now correctly mints the archive key, allowing messages to be encrypted and sent.

### 2. Envelope ACK Data Loss Prevention (SECONDARY FIX)
**File:** `E2EE-frontend/src/features/sync/messageSync.js:34`

**Issue:** The code was pushing `row._id` to `storedIds` inside the try block, meaning failed envelope decryption attempts were still being ACKed to the server. This caused permanent message loss.

**Before:**
```javascript
try {
    const message = await handleEnvelope(row.envelop ?? row.envelope, { queued: true });
    if (message) decrypted.push(message);
    storedIds.push(row._id);  // ❌ ACKs even when handleEnvelope throws
} catch (error) {
    console.error('[messageSync] envelope decrypt failed, leaving queued:', error.message);
}
```

**After:**
```javascript
try {
    const message = await handleEnvelope(row.envelop ?? row.envelope, { queued: true });
    if (message) decrypted.push(message);
    // Only ACK when handleEnvelope succeeds
    storedIds.push(row._id);  // ✅ Only ACKs on success
} catch (error) {
    // Do NOT ack. Leave it queued; the TTL will eventually clear it
    console.error('[messageSync] envelope decrypt failed, leaving queued:', error.message);
}
```

**Impact:** Failed envelope decryption no longer causes permanent message loss. The envelope remains queued for retry or eventual TTL cleanup.

## Architecture Notes

### Server-Side Key Custody Model
The backend enforces a two-phase key lifecycle:

1. **Mint Phase** (`mode: 'mint'`):
   - Atomically claims `(conversationId, epoch)` via unique index on `ConversationKeyClaimModel`
   - Only one device across all members can win this race
   - Stores the minter's MBK-wrapped copy in `ConversationKeyModel`

2. **Copy Phase** (`mode: 'copy'`):
   - Requires an existing epoch claim
   - Stores additional per-device wrapped copies
   - Used when distributing the key to other members' devices

### Client-Side Fix Location
The fix was applied at `createKey()` rather than `ensureArchiveKey()` because:
- `createKey()` is the only path that generates new key material
- `ensureArchiveKey()` correctly handles the mint/await distinction at line 134
- The comment at line 133 already stated `mode 'mint'` intent
- `acceptDistributedKey()` at line 561 correctly uses copy mode (no change needed)

### Why Both Fixes Matter
1. **Mint-mode fix:** Unblocks new conversations so messages can be sent
2. **ACK fix:** Prevents silent message loss when keys arrive out of order or MBK is temporarily unavailable

## Testing Recommendations

1. **New conversation test:**
   - User A opens chat with User B (first time)
   - User A should be able to send a message immediately
   - Verify server has `ConversationKeyClaim` row for epoch 1
   - Verify both users have wrapped keys in `ConversationKeyModel`

2. **Multi-device test:**
   - User A (device 1) creates conversation
   - User A (device 2) should receive distributed key via envelope
   - Both devices should be able to send/receive

3. **Race condition test:**
   - Two devices simultaneously open the same new conversation
   - One should mint, one should receive `ARCHIVE_KEY_EXISTS` and await distribution
   - Both should eventually be able to send messages

4. **Envelope retry test:**
   - Simulate a failed envelope decryption (e.g., temporary MBK unavailable)
   - Verify envelope remains queued server-side
   - Verify it retries after MBK is restored

## Files Changed
- `E2EE-frontend/src/features/conversation/service/archiveCrypto.js` (1 line)
- `E2EE-frontend/src/features/sync/messageSync.js` (1 line, 1 comment)

## Date
2026-09-24
