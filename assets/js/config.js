/**
 * GHOST TUNNEL CONFIGURATION
 * Centralized constants for networking and cryptography.
 */

export const NET_CONFIG = {
    // Google STUN servers are reliable and free. 
    // In a strictly enterprise env, you would host your own TURN server (Coturn).
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ],
    // PeerJS Debug Level (0=None, 3=All). Keep low for production.
    debug: 1 
};

export const CRYPTO_CONFIG = {
    algo: 'AES-GCM',
    length: 256,
    curve: 'P-256', // Elliptic Curve for Key Exchange
    hash: 'SHA-256' // For deriving keys
};

export const SYSTEM = {
    TRIGGER_CMD: '!systemstatus', // The magic word
    VERSION: '2.0.0-alpha'
};
