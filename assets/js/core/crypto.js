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

    async init() {
        this.keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: CRYPTO_CONFIG.curve
            },
            false, // Private key is NOT extractable
            ["deriveKey", "deriveBits"] // Added deriveBits capability
        );
        return this.keyPair;
    }

    async getPublicKeyJwk() {
        return await window.crypto.subtle.exportKey(
            "jwk",
            this.keyPair.publicKey
        );
    }

    async computeSharedSecret(remoteJwk) {
        try {
            // 1. Sanitize Remote Key
            const cleanKey = {
                kty: remoteJwk.kty,
                crv: remoteJwk.crv,
                x: remoteJwk.x,
                y: remoteJwk.y,
                ext: true 
            };

            const remotePublicKey = await window.crypto.subtle.importKey(
                "jwk",
                cleanKey,
                { name: "ECDH", namedCurve: CRYPTO_CONFIG.curve },
                false, 
                []     
            );

            // 2. FIX: Derive Bits instead of Key directly
            // This allows us to hash the bits for the fingerprint WITHOUT exposing the final key
            const sharedSecretBits = await window.crypto.subtle.deriveBits(
                {
                    name: "ECDH",
                    public: remotePublicKey
                },
                this.keyPair.privateKey,
                256 // Length in bits
            );

            // 3. Generate Fingerprint from the raw bits
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", sharedSecretBits);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            this.fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();

            // 4. Import the bits as the final LOCKED working key
            this.sharedKey = await window.crypto.subtle.importKey(
                "raw",
                sharedSecretBits,
                {
                    name: "AES-GCM",
                    length: CRYPTO_CONFIG.length
                },
                false, // IMPORTANT: Key remains non-extractable!
                ["encrypt", "decrypt"]
            );
            
            return this.fingerprint;

        } catch (e) {
            console.error("Crypto Handshake Error:", e);
            throw new Error(`Handshake Failed: ${e.message}`);
        }
    }

    async encrypt(text) {
        if (!this.sharedKey) throw new Error("No Shared Key established");

        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); 

        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.sharedKey,
            enc.encode(text)
        );

        return {
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(ciphertextBuffer)
        };
    }

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
