import { NET_CONFIG } from '../config.js';

/**
 * P2P Engine
 * Wraps PeerJS implementation to provide a clean API for the controller.
 */
export class P2PEngine {
    constructor() {
        this.peer = null;       // My Identity
        this.conn = null;       // The Active Connection
        this.myId = null;
        
        // Callbacks (to be bound by Controller)
        this.onIdAssigned = (id) => console.log('ID Assigned:', id);
        this.onConnect = (conn) => console.log('Connected to:', conn.peer);
        this.onData = (data) => console.log('Data received:', data);
        this.onStatusUpdate = (status) => {}; // For Diagnostics
        this.onDisconnect = () => console.log('Disconnected');
    }

    /**
     * Initialize the Peer instance (Get an ID from Broker)
     */
    init() {
        // Wir nutzen window.Peer (muss via Script Tag geladen sein)
        this.peer = new Peer(null, {
            debug: NET_CONFIG.debug,
            config: {
                iceServers: NET_CONFIG.iceServers
            }
        });

        this.peer.on('open', (id) => {
            this.myId = id;
            this.onIdAssigned(id);
            this.updateStatus('Ready. ID: ' + id);
        });

        // Incoming Connection Handler
        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer Error:', err);
            this.updateStatus('Error: ' + err.type);
        });
    }

    /**
     * Initiate outgoing connection
     * @param {string} targetPeerId 
     */
    connect(targetPeerId) {
        if (!this.peer) return;
        const conn = this.peer.connect(targetPeerId, {
            reliable: true // Uses DataChannel reliability
        });
        this.handleConnection(conn);
    }

    /**
     * Central Connection Logic (In & Out)
     */
    handleConnection(conn) {
        this.conn = conn;

        this.conn.on('open', () => {
            // Connection is effectively established here
            this.onConnect(this.conn);
            this.monitorStats(); // Start the Hidden Layer diagnostics
        });

        this.conn.on('data', (data) => {
            // Routing raw data to controller (encryption layer will verify this later)
            this.onData(data);
        });

        this.conn.on('close', () => {
            this.conn = null;
            this.onDisconnect();
            this.updateStatus('Connection closed');
        });

        this.conn.on('error', (err) => {
            console.error('Conn Error:', err);
        });
    }

    /**
     * Send Data (Wrapper)
     * @param {Object} payload 
     */
    send(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send(payload);
        } else {
            console.warn('Cannot send: Connection not open');
        }
    }

    /**
     * The Hidden Layer: Gather WebRTC Stats
     * Extracts RTT and ICE candidates for the !systemstatus overlay
     */
    async monitorStats() {
        if (!this.conn) return;
        
        // WebRTC Internals access via the underlying RTCPeerConnection
        const peerConn = this.conn.peerConnection;
        
        // Periodic check (every 2 seconds)
        setInterval(async () => {
            if(!peerConn) return;
            
            try {
                const stats = await peerConn.getStats(null);
                let rtt = 'N/A';
                let candidateType = 'Unknown';

                stats.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        // Round Trip Time calculation
                        rtt = report.currentRoundTripTime ? (report.currentRoundTripTime * 1000).toFixed(0) + 'ms' : 'N/A';
                    }
                    if (report.type === 'local-candidate') {
                        candidateType = report.candidateType; // host, srflx (stun), prflx
                    }
                });

                // Send raw telemetry to the UI/Controller
                this.onStatusUpdate({
                    type: 'TELEMETRY',
                    rtt: rtt,
                    ice: candidateType,
                    state: peerConn.iceConnectionState
                });

            } catch (e) {
                // Silent fail in monitoring is acceptable
            }
        }, 2000);
    }

    updateStatus(msg) {
        // Helper to send simple text status updates
        this.onStatusUpdate({ type: 'LOG', message: msg });
    }
}
