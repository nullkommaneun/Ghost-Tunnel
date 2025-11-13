import { P2PEngine } from './core/p2p.js';
import { UIRenderer } from './ui/renderer.js';
import { DiagOverlay } from './ui/diag.js';
import { SYSTEM } from './config.js';

class AppController {
    constructor() {
        this.p2p = new P2PEngine();
        this.ui = new UIRenderer();
        this.diag = new DiagOverlay();
        
        this.isConnected = false;
    }

    init() {
        this.ui.setInputState('disabled');
        this.diag.log('System init...');

        // 1. P2P Engine Events binden
        this.p2p.onIdAssigned = (id) => {
            this.ui.setMyId(id);
            this.ui.updateStatus('disconnected'); // Ready but not connected
            this.ui.logSystem('System bereit. Teile deine ID oder gib eine Ziel-ID ein.');
            this.ui.setInputState('await_id');
            
            // Check URL params for auto-connect (?connect=ID)
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('connect');
            if (targetId) {
                this.ui.logSystem(`Auto-Connect zu: ${targetId}`);
                this.p2p.connect(targetId);
            }
        };

        this.p2p.onConnect = (conn) => {
            this.isConnected = true;
            this.ui.updateStatus('connected'); // Später 'secure' wenn Crypto aktiv
            this.ui.logSystem(`Verbunden mit Peer: ${conn.peer}`);
            this.ui.setInputState('chat_ready');
            this.diag.log(`Channel Open: ${conn.peer}`);
        };

        this.p2p.onData = (data) => {
            // Später: Hier Decryption Hook
            // Aktuell: Plaintext handling
            if (typeof data === 'string') {
                this.ui.renderMessage(data, 'in');
            } else {
                this.ui.logSystem('Binäre Daten empfangen (noch nicht implementiert)');
            }
        };

        this.p2p.onDisconnect = () => {
            this.isConnected = false;
            this.ui.updateStatus('disconnected');
            this.ui.logSystem('Verbindung getrennt.');
            this.ui.setInputState('await_id');
            this.diag.log('Channel Closed');
        };

        this.p2p.onStatusUpdate = (status) => {
            if (status.type === 'TELEMETRY') {
                this.diag.updateTelemetry(status);
            } else if (status.type === 'LOG') {
                this.diag.log(status.message);
            }
        };

        // 2. UI Events binden (Input Handling)
        this.bindUserEvents();

        // 3. Engine starten
        this.p2p.init();
    }

    bindUserEvents() {
        const { sendBtn, input, fileBtn, fileInput } = this.ui.elems;

        const handleSend = () => {
            const text = input.value.trim();
            if (!text) return;

            // --- THE HIDDEN LAYER TRIGGER ---
            if (text === SYSTEM.TRIGGER_CMD) {
                this.diag.toggle();
                input.value = '';
                return;
            }

            // Logic Split: Connect vs. Chat
            if (!this.isConnected) {
                // Mode: Connect
                this.ui.logSystem(`Verbinde zu ${text}...`);
                this.p2p.connect(text);
                input.value = '';
            } else {
                // Mode: Chat
                // Später: Hier Encryption Hook
                this.p2p.send(text);
                this.ui.renderMessage(text, 'out');
                input.value = '';
            }
        };

        sendBtn.addEventListener('click', handleSend);
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // File Attach (Dummy Implementation for now)
        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                this.ui.logSystem(`Datei gewählt: ${fileInput.files[0].name} (Versand noch inaktiv)`);
            }
        });
    }
}

// Main Execution
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.init();
});
