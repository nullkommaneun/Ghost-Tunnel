import { P2PEngine } from './core/p2p.js';
import { CryptoGuard } from './core/crypto.js'; // NEU
import { UIRenderer } from './ui/renderer.js';
import { DiagOverlay } from './ui/diag.js';
import { SYSTEM } from './config.js';

class AppController {
    constructor() {
        this.p2p = new P2PEngine();
        this.crypto = new CryptoGuard(); // NEU
        this.ui = new UIRenderer();
        this.diag = new DiagOverlay();
        
        this.isConnected = false;
        this.isSecure = false; // Security State
    }

    async init() {
        this.ui.setInputState('disabled');
        this.diag.log('System init...');

        // Crypto Engine hochfahren (Keys generieren)
        try {
            await this.crypto.init();
            this.diag.log('Crypto: ECDH Keys generated.');
        } catch (e) {
            this.ui.logSystem('KRITISCHER FEHLER: Krypto-Init fehlgeschlagen.');
            console.error(e);
            return;
        }

        // --- P2P Events ---

        this.p2p.onIdAssigned = (id) => {
            this.ui.setMyId(id);
            this.ui.updateStatus('disconnected');
            this.ui.logSystem('System bereit. ID teilen zum Verbinden.');
            this.ui.setInputState('await_id');
            
            // Auto-Connect Support
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('connect');
            if (targetId) this.p2p.connect(targetId);
        };

        this.p2p.onConnect = async (conn) => {
            this.isConnected = true;
            this.ui.updateStatus('connected'); // Gelb/Orange (noch nicht sicher)
            this.ui.logSystem(`Verbindung zu ${conn.peer}. Starte Handshake...`);
            this.diag.log(`Channel Open: ${conn.peer}`);

            // SOFORT Handshake starten: Meinen Public Key senden
            const myPublicKey = await this.crypto.getPublicKeyJwk();
            this.p2p.send({
                type: 'HANDSHAKE',
                key: myPublicKey
            });
            this.diag.log('Crypto: Public Key sent.');
        };

        this.p2p.onData = async (payload) => {
            // Router für Datenpakete
            
            // 1. Handshake Paket
            if (payload.type === 'HANDSHAKE') {
                this.diag.log('Crypto: Peer Key received.');
                const fingerprint = await this.crypto.computeSharedSecret(payload.key);
                
                this.isSecure = true;
                this.ui.updateStatus('secure'); // GRÜN!
                this.ui.setInputState('chat_ready');
                this.ui.logSystem(`🔒 SICHERER KANAL ETABLIERT.`);
                
                // Update Diagnostics
                this.diag.setCryptoStatus('ACTIVE (AES-GCM-256)');
                this.diag.metrics.fingerprint.textContent = fingerprint;
                this.diag.log(`Shared Secret derived. Fingerprint: ${fingerprint}`);
                return;
            }

            // 2. Verschlüsselte Nachricht
            if (payload.type === 'MSG') {
                if (!this.isSecure) return; // Ignorieren, wenn kein Key da ist
                try {
                    const plaintext = await this.crypto.decrypt(payload.cipher);
                    this.ui.renderMessage(plaintext, 'in');
                } catch (e) {
                    this.ui.logSystem('Fehler: Konnte Nachricht nicht entschlüsseln.');
                    this.diag.log('Crypto Error: Decrypt Fail');
                }
            }
        };

        this.p2p.onDisconnect = () => {
            this.isConnected = false;
            this.isSecure = false;
            this.ui.updateStatus('disconnected');
            this.ui.logSystem('Verbindung getrennt.');
            this.ui.setInputState('await_id');
            this.diag.log('Channel Closed');
            this.diag.setCryptoStatus('Inactive');
        };

        this.p2p.onStatusUpdate = (status) => {
            if (status.type === 'TELEMETRY') this.diag.updateTelemetry(status);
            else if (status.type === 'LOG') this.diag.log(status.message);
        };

        this.bindUserEvents();
        this.p2p.init();
    }

    bindUserEvents() {
        const { sendBtn, input, fileBtn, fileInput } = this.ui.elems;

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;

            if (text === SYSTEM.TRIGGER_CMD) {
                this.diag.toggle();
                input.value = '';
                return;
            }

            if (!this.isConnected) {
                this.ui.logSystem(`Verbinde zu ${text}...`);
                this.p2p.connect(text);
                input.value = '';
            } else if (this.isSecure) {
                // VERSCHLÜSSELT SENDEN
                try {
                    const encryptedPackage = await this.crypto.encrypt(text);
                    
                    this.p2p.send({
                        type: 'MSG',
                        cipher: encryptedPackage
                    });
                    
                    this.ui.renderMessage(text, 'out');
                    input.value = '';
                } catch (e) {
                    this.ui.logSystem('Fehler beim Verschlüsseln.');
                }
            } else {
                this.ui.logSystem('Warte auf Secure Handshake...');
            }
        };

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        fileBtn.addEventListener('click', () => fileInput.click());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.init();
});
