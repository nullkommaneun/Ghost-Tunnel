import { P2PEngine } from './core/p2p.js';
import { CryptoGuard } from './core/crypto.js';
import { UIRenderer } from './ui/renderer.js';
import { DiagOverlay } from './ui/diag.js';
import { SYSTEM } from './config.js';

class AppController {
    constructor() {
        this.p2p = new P2PEngine();
        this.crypto = new CryptoGuard();
        this.ui = new UIRenderer();
        this.diag = new DiagOverlay();
        
        this.isConnected = false;
        this.isSecure = false;
    }

    async init() {
        this.ui.setInputState('disabled');
        this.diag.log('System init...');

        try {
            await this.crypto.init();
            this.diag.log('Crypto: ECDH Keys generated.');
        } catch (e) {
            this.ui.logSystem('KRITISCH: Krypto-Init Fehler.');
            console.error(e);
            return;
        }

        // --- P2P Events ---

        this.p2p.onIdAssigned = (id) => {
            this.ui.setMyId(id);
            this.ui.updateStatus('disconnected');
            this.ui.logSystem('Bereit. ID zum Verbinden nutzen.');
            this.ui.setInputState('await_id');
            
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('connect');
            if (targetId) this.p2p.connect(targetId);
        };

        this.p2p.onConnect = async (conn) => {
            this.isConnected = true;
            this.ui.updateStatus('connected');
            this.ui.logSystem(`Verbunden. Starte Handshake...`);
            this.diag.log(`Channel Open: ${conn.peer}`);

            const myPublicKey = await this.crypto.getPublicKeyJwk();
            this.p2p.send({
                type: 'HANDSHAKE',
                key: myPublicKey
            });
            this.diag.log('Crypto: Public Key sent.');
        };

        this.p2p.onData = async (payload) => {
            // 1. Handshake
            if (payload.type === 'HANDSHAKE') {
                this.diag.log('Crypto: Peer Key received.');
                
                try {
                    const fingerprint = await this.crypto.computeSharedSecret(payload.key);
                    
                    this.isSecure = true;
                    this.ui.updateStatus('secure');
                    this.ui.setInputState('chat_ready');
                    this.ui.logSystem(`🔒 SICHERER KANAL ETABLIERT.`);
                    
                    this.diag.setCryptoStatus('ACTIVE (AES-GCM-256)');
                    this.diag.metrics.fingerprint.textContent = fingerprint;
                    this.diag.log(`Shared Secret derived. FP: ${fingerprint}`);
                } catch (err) {
                    this.ui.logSystem('❌ Handshake Fehler (siehe Status)');
                    this.diag.log('CRITICAL: ' + err.message);
                }
                return;
            }

            // 2. Message
            if (payload.type === 'MSG') {
                if (!this.isSecure) return;
                try {
                    const plaintext = await this.crypto.decrypt(payload.cipher);
                    this.ui.renderMessage(plaintext, 'in');
                } catch (e) {
                    this.ui.logSystem('Entschlüsselung fehlgeschlagen.');
                    this.diag.log('Decrypt Error: ' + e.message);
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
