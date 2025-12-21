// client/src/utils/e2ee.js
// E2EE Helper Functions for SafeSpace
// Includes ECDH key generation, AES-GCM encryption/decryption for DMs and Groups

export const E2EE_TYPES = new Set(["dm", "group"]);
export const E2EE_LOCAL_KEY_PREFIX = "e2eeKeyPair:";
export const E2EE_KEYRING_PREFIX = "e2eeKeyRing:";
export const E2EE_GROUP_KEY_PREFIX = "e2eeGroupKeys:";

export function isConversationE2EE(conv) {
    if (!conv) return false;
    return E2EE_TYPES.has(conv.type);
}

export function groupKeyStorageKey(userId, convId) {
    return `${E2EE_GROUP_KEY_PREFIX}${userId}:${convId}`;
}

export function keyRingStorageKey(userId) {
    return `${E2EE_KEYRING_PREFIX}${userId}`;
}

export function loadKeyRingForUser(userId) {
    if (!userId) return null;
    try {
        const raw = localStorage.getItem(keyRingStorageKey(userId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.keys || typeof parsed.keys !== "object") return null;
        return parsed;
    } catch {
        return null;
    }
}

export function persistKeyRingForUser(userId, ring) {
    if (!userId || !ring) return;
    try {
        localStorage.setItem(keyRingStorageKey(userId), JSON.stringify(ring));
    } catch {
        // ignore
    }
}

export function loadGroupKeyStringMap(userId, convId) {
    try {
        const raw = localStorage.getItem(groupKeyStorageKey(userId, convId));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return parsed;
    } catch {
        return {};
    }
}

export function persistGroupKeyString(userId, convId, version, keyString) {
    try {
        const map = loadGroupKeyStringMap(userId, convId);
        map[String(version)] = keyString;
        localStorage.setItem(groupKeyStorageKey(userId, convId), JSON.stringify(map));
    } catch {
        // ignore
    }
}

export async function computeKeyId(publicJwk) {
    if (!publicJwk || !window.crypto || !window.crypto.subtle) return null;
    const ordered = {
        crv: publicJwk.crv,
        kty: publicJwk.kty,
        x: publicJwk.x,
        y: publicJwk.y,
    };
    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(ordered));
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    return bytesToBase64Url(new Uint8Array(hash));
}

export async function importKeyPairFromJwks(publicJwk, privateJwk) {
    const [publicKey, privateKey] = await Promise.all([
        window.crypto.subtle.importKey(
            "jwk",
            publicJwk,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        ),
        window.crypto.subtle.importKey(
            "jwk",
            privateJwk,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            ["deriveKey", "deriveBits"]
        ),
    ]);
    return { publicKey, privateKey };
}

export async function loadOrCreateKeyPairForUser(userId) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error("Web Crypto not available in this browser");
    }

    const ring = loadKeyRingForUser(userId);
    if (ring && ring.currentKid && ring.keys?.[ring.currentKid]) {
        try {
            const { publicJwk, privateJwk } = ring.keys[ring.currentKid] || {};
            if (publicJwk && privateJwk) {
                const keyPair = await importKeyPairFromJwks(publicJwk, privateJwk);
                return { keyPair, kid: ring.currentKid, ring };
            }
        } catch (e) {
            console.error("Failed to import keyring pair, regenerating", e);
        }
    }

    const storageKey = `${E2EE_LOCAL_KEY_PREFIX}${userId}`;
    const existing = localStorage.getItem(storageKey);

    if (existing) {
        try {
            const parsed = JSON.parse(existing);
            const { publicJwk, privateJwk } = parsed || {};

            if (publicJwk && privateJwk) {
                const keyPair = await importKeyPairFromJwks(publicJwk, privateJwk);
                const kid = await computeKeyId(publicJwk);
                const migrated = {
                    version: 2,
                    currentKid: kid,
                    keys: {
                        [kid]: {
                            publicJwk,
                            privateJwk,
                            createdAt: new Date().toISOString(),
                        },
                    },
                };
                persistKeyRingForUser(userId, migrated);
                return { keyPair, kid, ring: migrated };
            }
        } catch (e) {
            console.error("Failed to import existing E2EE keypair, regenerating", e);
        }
    }

    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );

    const publicJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    const kid = await computeKeyId(publicJwk);
    const existingKeys =
        ring && ring.keys && typeof ring.keys === "object" ? ring.keys : {};
    const nextRing = {
        version: 2,
        currentKid: kid,
        keys: {
            ...existingKeys,
            [kid]: {
                publicJwk,
                privateJwk,
                createdAt: new Date().toISOString(),
            },
        },
    };
    persistKeyRingForUser(userId, nextRing);
    return { keyPair, kid, ring: nextRing };
}

export function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

export function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64ToBytes(b64) {
    const binary = window.atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export async function deriveDmKeyForConversation({
    conversation,
    currentUserId,
    myKeyPair,
    fetchUserPublicKeyJwk,
}) {
    const memberIds = conversation.memberIds || [];
    const otherId = memberIds.find((id) => id !== currentUserId);
    if (!otherId) throw new Error("No other member in DM");

    const otherJwk = await fetchUserPublicKeyJwk(otherId);
    if (!otherJwk) {
        throw new Error(
            "Recipient has no public key on server yet (they probably have not opened chat)"
        );
    }

    const otherPublicKey = await window.crypto.subtle.importKey(
        "jwk",
        otherJwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    const aesKey = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: otherPublicKey },
        myKeyPair.privateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    return aesKey;
}

export async function encryptWithAesGcm(plaintext, aesKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivBytes },
        aesKey,
        data
    );

    const ciphertextBytes = new Uint8Array(ciphertextBuffer);

    return {
        ciphertext: bytesToBase64(ciphertextBytes),
        iv: bytesToBase64(ivBytes),
    };
}

export async function decryptWithAesGcm(payload, aesKey) {
    const ivBytes = base64ToBytes(payload.iv);
    const ciphertextBytes = base64ToBytes(payload.ciphertext);

    const plaintextBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        aesKey,
        ciphertextBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
}

export async function encryptDmMessage(plaintext, aesKey) {
    const { ciphertext, iv } = await encryptWithAesGcm(plaintext, aesKey);
    return { e2ee: true, version: 1, algo: "AES-GCM", iv, ciphertext };
}

export async function decryptDmMessage(payload, aesKey) {
    return decryptWithAesGcm(payload, aesKey);
}

export function generateRandomGroupKeyString() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
}

export async function importAesKeyFromGroupKeyString(groupKeyString) {
    const keyBytes = base64ToBytes(groupKeyString);
    return window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

// --- FILE ENCRYPTION HELPERS ---

// Generate a random AES-GCM key for file encryption
export async function generateFileKey() {
    return window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt file bytes (ArrayBuffer) -> returns { encryptedBuffer (ArrayBuffer), iv (Uint8Array), key (CryptoKey) }
export async function encryptFile(buffer, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        buffer
    );
    return { encryptedBuffer, iv };
}

// Decrypt file bytes -> returns ArrayBuffer
export async function decryptFile(encryptedBuffer, key, iv) {
    return window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encryptedBuffer
    );
}

export async function exportKeyToString(key) {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return bytesToBase64(new Uint8Array(exported));
}

export async function importKeyFromString(keyStr) {
    const bytes = base64ToBytes(keyStr);
    return window.crypto.subtle.importKey(
        "raw",
        bytes,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"]
    );
}
