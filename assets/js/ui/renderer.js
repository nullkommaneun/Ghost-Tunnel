/**
 * UI RENDERER
 * Handles all DOM manipulations. Pure View logic.
 */
export class UIRenderer {
    constructor() {
        this.elems = {
            chatWindow: document.getElementById('chat-window'),
            msgList: document.getElementById('message-list'),
            statusDot: document.getElementById('connection-status'),
            peerIdDisplay: document.getElementById('my-peer-id'),
            input: document.getElementById('msg-input'),
            sendBtn: document.getElementById('btn-send'),
            fileBtn: document.getElementById('btn-attach'),
            fileInput: document.getElementById('file-input')
        };
    }

    /**
     * Zeigt die eigene ID an und macht sie klickbar (Copy-to-Clipboard)
     */
    setMyId(id) {
        this.elems.peerIdDisplay.textContent = "ID: " + id;
        this.elems.peerIdDisplay.onclick = () => {
            navigator.clipboard.writeText(id);
            this.logSystem('ID in die Zwischenablage kopiert.');
        };
    }

    updateStatus(state) {
        // state: 'disconnected', 'connecting', 'connected', 'secure'
        this.elems.statusDot.className = 'status-dot ' + state;
        this.elems.statusDot.title = state.toUpperCase();
    }

    /**
     * Rendert eine Chat-Nachricht (Text)
     * @param {string} text - Inhalt
     * @param {string} type - 'in' (eingehend) oder 'out' (ausgehend)
     */
    renderMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('msg', type);
        msgDiv.textContent = text;
        
        this.elems.msgList.appendChild(msgDiv);
        this.scrollToBottom();
    }

    /**
     * System-Nachrichten (grau, zentriert)
     */
    logSystem(text) {
        const sysDiv = document.createElement('div');
        sysDiv.classList.add('system-message');
        sysDiv.textContent = `> ${text}`;
        this.elems.msgList.appendChild(sysDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.elems.chatWindow.scrollTop = this.elems.chatWindow.scrollHeight;
    }

    /**
     * Ändert den Placeholder des Inputs je nach Status
     */
    setInputState(state) {
        if (state === 'await_id') {
            this.elems.input.placeholder = "Ziel-ID eingeben zum Verbinden...";
            this.elems.input.disabled = false;
        } else if (state === 'chat_ready') {
            this.elems.input.placeholder = "Nachricht eingeben...";
            this.elems.input.disabled = false;
            this.elems.input.focus();
        } else if (state === 'disabled') {
            this.elems.input.disabled = true;
            this.elems.input.placeholder = "Initialisiere...";
        }
    }
}
