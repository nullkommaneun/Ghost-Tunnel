/**
 * DIAGNOSTICS MODULE
 * The "Hidden Layer" overlay logic.
 */
export class DiagOverlay {
    constructor() {
        this.overlay = document.getElementById('diag-overlay');
        this.btnClose = document.getElementById('btn-close-diag');
        
        // Metriken Elemente
        this.metrics = {
            e2ee: document.getElementById('diag-e2ee'),
            ice: document.getElementById('diag-ice'),
            rtt: document.getElementById('diag-rtt'),
            fingerprint: document.getElementById('diag-fingerprint'),
            log: document.getElementById('diag-log')
        };

        this.init();
    }

    init() {
        // Close Button Logic
        this.btnClose.addEventListener('click', () => {
            this.toggle(false);
        });
    }

    toggle(forceState = null) {
        if (forceState !== null) {
            if (forceState) this.overlay.classList.remove('hidden');
            else this.overlay.classList.add('hidden');
        } else {
            this.overlay.classList.toggle('hidden');
        }
    }

    /**
     * Fügt einen Log-Eintrag in die Konsole hinzu
     */
    log(msg) {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.textContent = `[${time}] ${msg}`;
        entry.style.fontFamily = 'var(--font-mono)';
        this.metrics.log.prepend(entry); // Neueste oben
    }

    /**
     * Aktualisiert die Live-Metriken
     */
    updateTelemetry(data) {
        if (data.rtt) this.metrics.rtt.textContent = data.rtt;
        if (data.ice) this.metrics.ice.textContent = data.ice.toUpperCase();
        
        // Status einfärben
        this.metrics.rtt.style.color = parseInt(data.rtt) > 200 ? 'var(--accent-warn)' : 'var(--accent-ok)';
    }

    setCryptoStatus(status) {
        this.metrics.e2ee.textContent = status;
        this.metrics.e2ee.style.color = status === 'ACTIVE' ? 'var(--accent-ok)' : 'var(--accent-warn)';
    }
}
