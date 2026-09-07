/**
 * Firebrox FPS - Network Manager
 * Handles WebSocket multiplayer connectivity
 * Client-side networking for connecting to game server
 */

/**
 * NetworkManager class - Client-side multiplayer networking
 */
export class NetworkManager {
    constructor(physics, weaponSystem) {
        this.physics = physics;
        this.weaponSystem = weaponSystem;
        
        this.socket = null;
        this.connected = false;
        this.serverUrl = 'ws://localhost:3000';
        
        this.playerId = null;
        this.otherPlayers = new Map();
        
        this.lastSyncTime = 0;
        this.syncRate = 30; // 30 Hz sync
        
        this.serverInfo = {
            players: 1,
            maxPlayers: 16,
            serverName: 'Local Server'
        };
        
        console.log('[Network] Network manager initialized');
    }
    
    /**
     * Connect to game server
     * @param {string} url - WebSocket server URL (optional)
     */
    connect(url = null) {
        if (this.connected) {
            console.log('[Network] Already connected');
            return;
        }
        
        this.serverUrl = url || this.serverUrl;
        
        try {
            console.log('[Network] Connecting to server:', this.serverUrl);
            
            this.socket = new WebSocket(this.serverUrl);
            
            this.socket.onopen = this.onConnect.bind(this);
            this.socket.onclose = this.onDisconnect.bind(this);
            this.socket.onerror = this.onError.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            
            // Add connection indicator to UI
            this.updateConnectionStatus('connecting');
            
        } catch (error) {
            console.error('[Network] Failed to connect:', error);
            this.updateConnectionStatus('disconnected');
            this.showNotification('Failed to connect to server', 'error');
        }
    }
    
    /**
     * Connection established
     */
    onConnect() {
        console.log('[Network] Connected to server');
        this.connected = true;
        this.updateConnectionStatus('connected');
        this.showNotification('Connected to server!', 'success');
        
        // Send initial player info
        this.sendPlayerInfo();
        
        // Start sync loop
        this.startSyncLoop();
    }
    
    /**
     * Connection closed
     */
    onDisconnect() {
        console.log('[Network] Disconnected from server');
        this.connected = false;
        this.playerId = null;
        this.otherPlayers.clear();
        this.updateConnectionStatus('disconnected');
        this.showNotification('Disconnected from server', 'warning');
        
        // Reset other players in scene
        this.clearOtherPlayers();
    }
    
    /**
     * Connection error
     */
    onError(error) {
        console.error('[Network] Connection error:', error);
        this.updateConnectionStatus('disconnected');
    }
    
    /**
     * Handle incoming messages
     * @param {MessageEvent} event - WebSocket message
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
                    
                case 'player_hurt':
                    this.handlePlayerHurt(data);
                    break;
                    
                case 'hit':
                    this.handleHit(data);
                    break;
                    
                case 'server_info':
                    this.serverInfo = data.data;
                    this.updatePlayerCount();
                    break;
                    
                case 'kill':
                    this.handleKill(data);
                    break;
                    
                default:
                    console.log('[Network] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[Network] Error parsing message:', error);
        }
    }
    
    /**
     * Handle new player joining
     * @param {object} data - Player data
     */
    handlePlayerJoined(data) {
        console.log('[Network] Player joined:', data.id);
        
        // Store other player info
        this.otherPlayers.set(data.id, {
            id: data.id,
            name: data.name,
            position: data.position,
            quaternion: data.quaternion,
            health: data.health
        });
        
        // Update player list in UI
        this.updatePlayersList();
        
        // Update server info
        if (data.serverInfo) {
            this.serverInfo = data.serverInfo;
            this.updatePlayerCount();
        }
    }
    
    /**
     * Handle player leaving
     * @param {object} data - Player ID
     */
    handlePlayerLeft(data) {
        console.log('[Network] Player left:', data.id);
        
        this.otherPlayers.delete(data.id);
        this.updatePlayersList();
        
        if (data.serverInfo) {
            this.serverInfo = data.serverInfo;
            this.updatePlayerCount();
        }
    }
    
    /**
     * Handle player state update
     * @param {object} data - Player update data
     */
    handlePlayerUpdate(data) {
        const player = this.otherPlayers.get(data.id);
        if (player) {
            if (data.position) {
                player.position = data.position;
            }
            if (data.quaternion) {
                player.quaternion = data.quaternion;
            }
            if (data.health !== undefined) {
                player.health = data.health;
            }
        }
    }
    
    /**
     * Handle player being hurt
     * @param {object} data - Damage data
     */
    handlePlayerHurt(data) {
        if (data.id === this.playerId) {
            // This player was hurt
            if (data.damage) {
                console.log('[Network] Player took', data.damage, 'damage');
                this.updateHUD();
            }
        }
    }
    
    /**
     * Handle hit detection
     * @param {object} data - Hit data
     */
    handleHit(data) {
        if (data.fromPlayer === this.playerId) {
            // My shot hit someone
            console.log('[Network] My shot hit player:', data.toPlayer);
            this.showNotification('Hit enemy!', 'success');
        } else if (data.toPlayer === this.playerId) {
            // I was hit
            console.log('[Network] Player was hit by:', data.fromPlayer);
            
            if (data.damage) {
                this.physics.applyDamage(data.damage);
                
                // Visual feedback
                const damageIndicator = document.createElement('div');
                damageIndicator.className = 'damage-indicator';
                damageIndicator.textContent = `${data.damage}`;
                document.body.appendChild(damageIndicator);
                
                setTimeout(() => damageIndicator.remove(), 500);
                
                this.updateHUD();
                
                if (this.physics.player.health <= 0) {
                    this.physics.player.isDead = true;
                }
            }
        }
    }
    
    /**
     * Handle kill event
     * @param {object} data - Kill data
     */
    handleKill(data) {
        if (data.killer === this.playerId) {
            console.log('[Network] Killed player:', data.victim);
            this.showNotification('Eliminated an enemy!', 'success');
        } else if (data.victim === this.playerId) {
            console.log('[Network] Killed by:', data.killer);
            this.showNotification('You were eliminated!', 'error');
            
            // Game over screen
            setTimeout(() => {
                if (window.gameInstance) {
                    window.gameInstance.playerDied();
                }
            }, 1000);
        }
    }
    
    /**
     * Send player info to server on connect
     */
    sendPlayerInfo() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        const player = this.physics.player;
        this.socket.send(JSON.stringify({
            type: 'player_info',
            id: this.playerId,
            name: this.getPlayerName(),
            position: player.position.toArray(),
            quaternion: player.quaternion.toArray(),
            health: player.health,
            isCrouching: player.isCrouching,
            isSprinting: player.isSprinting
        }));
    }
    
    /**
     * Get player name (random or stored)
     */
    getPlayerName() {
        // Try to get from localStorage
        let name = localStorage.getItem('firebrox-player-name');
        if (!name) {
            // Generate random name
            const adjectives = ['Swift', 'Fierce', 'Bold', 'Silent', 'Lucky', 'Brave', 'Sharp'];
            const nouns = ['Wolf', 'Falcon', 'Tiger', 'Bear', 'Hawk', 'Eagle', 'Striker'];
            name = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                   nouns[Math.floor(Math.random() * nouns.length)];
            
            localStorage.setItem('firebrox-player-name', name);
        }
        return name;
    }
    
    /**
     * Start sync loop for sending player state
     */
    startSyncLoop() {
        // Send player updates at fixed rate
        setInterval(() => {
            if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
                const player = this.physics.player;
                
                // Throttle updates for performance
                const now = performance.now();
                if (now - this.lastSyncTime > 1000 / this.syncRate) {
                    this.lastSyncTime = now;
                    
                    this.socket.send(JSON.stringify({
                        type: 'player_update',
                        id: this.playerId,
                        position: player.position.toArray(),
                        quaternion: player.quaternion.toArray(),
                        health: player.health,
                        isCrouching: player.isCrouching,
                        isSprinting: player.isSprinting
                    }));
                }
            }
        }, 1000 / this.syncRate);
    }
    
    /**
     * Send hit detection to server
     * @param {object} hitData - Hit detection result
     */
    sendHit(hitData) {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        this.socket.send(JSON.stringify({
            type: 'hit',
            fromPlayer: this.playerId,
            hitData: {
                position: hitData.position?.toArray() || null,
                distance: hitData.distance,
                damage: hitData.damage
            }
        }));
    }
    
    /**
     * Send reload event
     */
    sendReload() {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        this.socket.send(JSON.stringify({
            type: 'weapon_action',
            player: this.playerId,
            action: 'reload',
            weapon: this.weaponSystem.getCurrentWeaponType()
        }));
    }
    
    /**
     * Send weapon switch
     * @param {string} weaponType - New weapon type
     */
    sendWeaponSwitch(weaponType) {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        this.socket.send(JSON.stringify({
            type: 'weapon_action',
            player: this.playerId,
            action: 'switch',
            weapon: weaponType
        }));
    }
    
    /**
     * Update connection status indicator
     * @param {string} status - 'connected', 'connecting', 'disconnected'
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
     * Update player count display
     */
    updatePlayerCount() {
        const playerCountEl = document.getElementById('player-count-value');
        if (playerCountEl) {
            playerCountEl.textContent = this.serverInfo.players || 1;
        }
    }
    
    /**
     * Update players list UI
     */
    updatePlayersList() {
        const container = document.getElementById('players-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Add local player
        const localPlayer = document.createElement('div');
        localPlayer.className = 'player-entry';
        localPlayer.innerHTML = `
            <span class="player-color" style="background: #ff4444"></span>
            <span class="player-name">${this.getPlayerName()} (You)</span>
            <span class="player-status">Online</span>
        `;
        container.appendChild(localPlayer);
        
        // Add other players
        for (const [id, player] of this.otherPlayers) {
            const entry = document.createElement('div');
            entry.className = 'player-entry';
            
            // Generate random color for player
            const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            
            entry.innerHTML = `
                <span class="player-color" style="background: ${color}"></span>
                <span class="player-name">${player.name || 'Player'}</span>
                <span class="player-status">Online</span>
            `;
            container.appendChild(entry);
        }
    }
    
    /**
     * Clear all other players from scene
     */
    clearOtherPlayers() {
        // Could remove player meshes from scene here
    }
    
    /**
     * Reset player list display
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
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        this.playerId = null;
        this.otherPlayers.clear();
        this.updateConnectionStatus('disconnected');
    }
    
    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - 'success', 'error', 'warning'
     */
    showNotification(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `notification ${type} visible`;
        
        setTimeout(() => {
            toast.className = `notification ${type} hidden`;
        }, 3000);
    }
    
    /**
     * Update HUD (for damage received)
     */
    updateHUD() {
        if (window.weaponSystem) {
            window.weaponSystem.updateHUD();
        }
    }
    
    /**
     * Toggle multiplayer
     */
    toggleMultiplayer() {
        if (this.connected) {
            this.disconnect();
            console.log('[Network] Multiplayer disabled');
        } else {
            this.connect();
            console.log('[Network] Multiplayer enabled');
        }
    }
    
    /**
     * Is multiplayer enabled
     */
    isMultiplayer() {
        return this.connected;
    }
}
