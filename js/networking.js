/**
 * Firebrox FPS - Network Manager (Client)
 * Handles WebSocket multiplayer connectivity
 */

class NetworkManager {
    constructor(physics, weaponSystem) {
        this.physics = physics;
        this.weaponSystem = weaponSystem;
        
        this.socket = null;
        this.connected = false;
        this.serverUrl = 'ws://localhost:3000';
        
        this.playerId = null;
        this.otherPlayers = {};
        
        this.lastSyncTime = 0;
        this.syncRate = 30;
        
        this.serverInfo = {
            players: 1,
            maxPlayers: 16,
            serverName: 'Local Server'
        };
    }
    
    /**
     * Connect to server
     */
    connect(url) {
        if (this.connected) return;
        
        this.serverUrl = url || this.serverUrl;
        
        try {
            console.log(`[Network] Connecting to ${this.serverUrl}`);
            
            this.socket = new WebSocket(this.serverUrl);
            
            this.socket.onopen = this.onConnect.bind(this);
            this.socket.onclose = this.onDisconnect.bind(this);
            this.socket.onerror = this.onError.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            
            this.updateConnectionStatus('connecting');
        } catch (error) {
            console.error('[Network] Connection failed:', error);
            this.updateConnectionStatus('disconnected');
        }
    }
    
    /**
     * Connection established
     */
    onConnect() {
        console.log('[Network] Connected to server');
        this.connected = true;
        this.updateConnectionStatus('connected');
        
        // Send player info
        this.sendPlayerInfo();
        
        // Start sync loop
        this.startSyncLoop();
    }
    
    /**
     * Connection closed
     */
    onDisconnect() {
        console.log('[Network] Disconnected');
        this.connected = false;
        this.playerId = null;
        this.updateConnectionStatus('disconnected');
    }
    
    /**
     * Handle errors
     */
    onError(error) {
        console.error('[Network] Error:', error);
        this.updateConnectionStatus('disconnected');
    }
    
    /**
     * Handle incoming messages
     */
    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'player_joined':
                    this.handlePlayerJoined(data);
                    break;
                case 'player_left':
                    this.handlePlayerLeft(data);
                    break;
                case 'player_update':
                    this.handlePlayerUpdate(data);
                    break;
                case 'server_info':
                    this.serverInfo = data.data;
                    break;
                default:
                    console.log('[Network] Unknown message:', data.type);
            }
        } catch (error) {
            console.error('[Network] Parse error:', error);
        }
    }
    
    /**
     * Handle new player
     */
    handlePlayerJoined(data) {
        console.log('[Network] Player joined:', data.id);
        this.otherPlayers[data.id] = {
            id: data.id,
            name: data.name,
            position: data.position,
            quaternion: data.quaternion
        };
        
        this.updatePlayersList();
        document.getElementById('player-count-value').textContent = 
            (Object.keys(this.otherPlayers).length + 1);
    }
    
    /**
     * Handle player leaving
     */
    handlePlayerLeft(data) {
        console.log('[Network] Player left:', data.id);
        delete this.otherPlayers[data.id];
        this.updatePlayersList();
    }
    
    /**
     * Handle player update
     */
    handlePlayerUpdate(data) {
        if (this.otherPlayers[data.id]) {
            this.otherPlayers[data.id].position = data.position;
            this.otherPlayers[data.id].quaternion = data.quaternion;
        }
    }
    
    /**
     * Send player info
     */
    sendPlayerInfo() {
        if (!this.socket || this.socket.readyState !== 1) return;
        
        const state = this.physics.getState();
        this.socket.send(JSON.stringify({
            type: 'player_info',
            name: 'Player_' + Math.floor(Math.random() * 1000),
            position: state.position,
            quaternion: state.quaternion,
            health: state.health
        }));
    }
    
    /**
     * Start sync loop
     */
    startSyncLoop() {
        setInterval(() => {
            if (this.connected && this.socket && this.socket.readyState === 1) {
                const state = this.physics.getState();
                this.socket.send(JSON.stringify({
                    type: 'player_update',
                    position: state.position,
                    quaternion: state.quaternion,
                    health: state.health
                }));
            }
        }, 1000 / this.syncRate);
    }
    
    /**
     * Update connection status UI
     */
    updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-indicator');
        if (!indicator) return;
        
        indicator.className = 'connection-indicator ' + status;
        
        switch (status) {
            case 'connected':
                indicator.textContent = '● Connected';
                break;
            case 'connecting':
                indicator.textContent = '○ Connecting...';
                break;
            case 'disconnected':
                indicator.textContent = '● Disconnected';
                break;
        }
    }
    
    /**
     * Update players list UI
     */
    updatePlayersList() {
        const container = document.getElementById('players-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Local player
        const local = document.createElement('div');
        local.className = 'player-entry';
        local.innerHTML = `
            <span class="player-color" style="background: #ff4444"></span>
            <span class="player-name">Local Player (You)</span>
            <span class="player-status">Online</span>
        `;
        container.appendChild(local);
        
        // Other players
        for (const [id, player] of Object.entries(this.otherPlayers)) {
            const entry = document.createElement('div');
            entry.className = 'player-entry';
            const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            entry.innerHTML = `
                <span class="player-color" style="background: ${color}"></span>
                <span class="player-name">Player_${id.slice(-4)}</span>
                <span class="player-status">Online</span>
            `;
            container.appendChild(entry);
        }
    }
    
    /**
     * Reset players list
     */
    resetPlayerList() {
        const container = document.getElementById('players-container');
        if (container) {
            container.innerHTML = `
                <div class="player-entry">
                    <span class="player-color" style="background: #ff4444"></span>
                    <span class="player-name">Local Player</span>
                    <span class="player-status">Offline</span>
                </div>
            `;
        }
    }
    
    /**
     * Disconnect
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        this.updateConnectionStatus('disconnected');
    }
    
    /**
     * Update (placeholder for future use)
     */
    update(delta) {
        // Can be used for prediction, lag compensation, etc.
    }
}

export default NetworkManager;
export { NetworkManager };
