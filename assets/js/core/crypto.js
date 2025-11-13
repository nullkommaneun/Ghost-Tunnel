import { CRYPTO_CONFIG } from '../config.js';

/**
 * CRYPTO GUARD
 * Handles ECDH Key Exchange and AES-GCM Encryption/Decryption.
 * Uses native Web Crypto API.
 */
export class CryptoGuard {
    constructor() {
        this.keyPair = null;    // My ECDH Key Pair
        this.sharedKey = null;  // The derived AES-GCM Key
        this.fingerprint = null; // Visual hash of the key for verification
    }

    /**
     * 1. Generate local ECDH Key Pair (Public & Private)
     */
    async init() {
        this.keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: CRYPTO_CONFIG.curve
            },
            false, // Private key is NOT extractable
            ["deriveKey"]
        );
        return this.keyPair;
    }

    /**
     * 2. Export my Public Key to send to peer (JWK format)
     */
    async getPublicKeyJwk() {
        return await window.crypto.subtle.exportKey(
            "jwk",
            this.keyPair.publicKey
        );
    }

    /**
     * 3. Derive Shared AES Key from Remote Public Key + My Private Key
     */
    async computeSharedSecret(remoteJwk) {
        // Import remote key first
        const remotePublicKey = await window.crypto.subtle.importKey(
            "jwk",
            remoteJwk,
            { name: "ECDH", namedCurve: CRYPTO_CONFIG.curve },
            true,
            []
        );

        // Derive the AES-GCM Key
        this.sharedKey = await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: remotePublicKey
            },
            this.keyPair.privateKey,
            {
                name: "AES-GCM",
                length: CRYPTO_CONFIG.length
            },
            false, // Shared key not extractable
            ["encrypt", "decrypt"]
        );

        // Generate a Fingerprint (SHA-256 hash of the key) for the UI
        // To do this, we temporarily export the key just for hashing
        const rawKey = await window.crypto.subtle.exportKey("raw", this.sharedKey);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", rawKey);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        this.fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
        
        return this.fingerprint;
    }

    /**
     * Encrypt Message (AES-GCM)
     * Returns object with { iv, ciphertext }
     */
    async encrypt(text) {
        if (!this.sharedKey) throw new Error("No Shared Key established");

        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV is standard for GCM

        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.sharedKey,
            enc.encode(text)
        );

        // Convert buffers to Base64 strings for transmission
        return {
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(ciphertextBuffer)
        };
    }

    /**
     * Decrypt Message
     */
    async decrypt(payload) {
        if (!this.sharedKey) throw new Error("No Shared Key established");

        const iv = this.base64ToArrayBuffer(payload.iv);
        const data = this.base64ToArrayBuffer(payload.data);

        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this.sharedKey,
                data
            );

            const dec = new TextDecoder();
            return dec.decode(decryptedBuffer);
        } catch (e) {
            console.error("Decryption failed:", e);
            throw new Error("DECRYPT_FAIL");
        }
    }

    // Helpers
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
