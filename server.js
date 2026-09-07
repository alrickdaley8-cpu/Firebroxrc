/**
 * Firebrox FPS - Multiplayer Server
 * Node.js WebSocket server for multiplayer game synchronization
 * 
 * Run with: node server.js
 * Default port: 3000
 */

const WebSocket = require('ws');
const http = require('http');

/**
 * Server configuration
 */
const CONFIG = {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    maxPlayers: 16,
    tickRate: 60,
    syncRate: 30,
    playerTimeout: 30, // seconds without update before disconnect
    damageCooldown: 200, // ms between damage events
};

/**
 * Player class - represents a connected player
 */
class Player {
    constructor(id, name, socket) {
        this.id = id;
        this.name = name;
        this.socket = socket;
        
        // Player state
        this.position = { x: 0, y: 1.8, z: 0 };
        this.quaternion = { x: 0, y: 0, z: 0, w: 1 };
        this.health = 100;
        this.maxHealth = 100;
        this.isCrouching = false;
        this.isSprinting = false;
        this.isDead = false;
        this.kills = 0;
        this.deaths = 0;
        
        // Connection tracking
        this.lastUpdate = Date.now();
        this.connectedAt = Date.now();
        this.isActive = true;
        
        // Input state
        this.moveX = 0;
        this.moveZ = 0;
        this.lookX = 0;
        this.lookY = 0;
        
        // Weapon state
        this.currentWeapon = 'assault-rifle';
        this.ammo = 30;
        this.totalAmmo = 300;
        
        // Inventory
        this.inventory = {
            grenades: 5,
            healthPacks: 3,
            extraAmmo: true
        };
    }
    
    /**
     * Update player state from client
     * @param {object} data - Player update data
     */
    updateFromClient(data) {
        if (data.position) {
            this.position = data.position;
        }
        if (data.quaternion) {
            this.quaternion = data.quaternion;
        }
        if (data.health !== undefined) {
            this.health = data.health;
        }
        if (data.isCrouching !== undefined) {
            this.isCrouching = data.isCrouching;
        }
        if (data.isSprinting !== undefined) {
            this.isSprinting = data.isSprinting;
        }
        if (data.currentWeapon) {
            this.currentWeapon = data.currentWeapon;
        }
        if (data.ammo !== undefined) {
            this.ammo = data.ammo;
        }
        if (data.totalAmmo !== undefined) {
            this.totalAmmo = data.totalAmmo;
        }
        
        this.lastUpdate = Date.now();
    }
    
    /**
     * Check if player has timed out
     * @returns {boolean}
     */
    hasTimedOut() {
        return Date.now() - this.lastUpdate > CONFIG.playerTimeout * 1000;
    }
    
    /**
     * Get serializable state for other clients
     * @returns {object}
     */
    getStateForOthers() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            quaternion: this.quaternion,
            health: this.health,
            isCrouching: this.isCrouching,
            isSprinting: this.isSprinting,
            isDead: this.isDead
        };
    }
    
    /**
     * Get serializable state for server logic
     * @returns {object}
     */
    getState() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            quaternion: this.quaternion,
            health: this.health,
            maxHealth: this.maxHealth,
            isCrouching: this.isCrouching,
            isSprinting: this.isSprinting,
            isDead: this.isDead,
            kills: this.kills,
            deaths: this.deaths,
            currentWeapon: this.currentWeapon,
            ammo: this.ammo,
            totalAmmo: this.totalAmmo,
            inventory: this.inventory,
            lastUpdate: this.lastUpdate,
            connectedAt: this.connectedAt
        };
    }
}

/**
 * GameServer class - Main server logic
 */
class GameServer {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // id -> Player
        this.playerIdCounter = 0;
        this.serverName = 'Firebrox FPS Server';
        this.players = 0;
        
        this.running = false;
        this.tickInterval = null;
        
        console.log('[Server] Initializing Firebrox FPS server...');
    }
    
    /**
     * Start the server
     */
    start() {
        // Create HTTP server
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                name: this.serverName,
                version: '1.0.0',
                players: this.players,
                maxPlayers: CONFIG.maxPlayers,
                status: 'running'
            }));
        });
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            server, 
            maxPayload: 64 * 1024 // 64KB max message
        });
        
        // Set up event handlers
        this.wss.on('connection', this.onConnection.bind(this));
        this.wss.on('error', this.onError.bind(this));
        this.wss.on('close', this.onClose.bind(this));
        
        // Start server listening
        server.listen(CONFIG.port, CONFIG.host, () => {
            console.log(`[Server] Server started on ws://${CONFIG.host}:${CONFIG.port}`);
            console.log(`[Server] Maximum players: ${CONFIG.maxPlayers}`);
            console.log(`[Server] Sync rate: ${CONFIG.syncRate} Hz`);
            console.log('[Server] Waiting for connections...');
        });
        
        this.running = true;
        
        // Start game loop
        this.startGameLoop();
        
        return this;
    }
    
    /**
     * Stop the server
     */
    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
        }
        
        for (const [id, player] of this.clients) {
            player.socket.close();
        }
        
        this.clients.clear();
        this.wss.close(() => {
            console.log('[Server] Server stopped');
            this.running = false;
        });
    }
    
    /**
     * Handle new connection
     * @param {WebSocket} socket - Client socket
     */
    onConnection(socket) {
        console.log('[Server] New connection attempt');
        
        // Check max players
        if (this.clients.size >= CONFIG.maxPlayers) {
            socket.send(JSON.stringify({
                type: 'server_full',
                message: 'Server is full. Maximum players reached.'
            }));
            socket.close();
            console.log('[Server] Connection rejected: server full');
            return;
        }
        
        // Generate unique player ID
        const playerId = `player_${this.playerIdCounter++}_${Date.now()}`;
        
        // Create player
        const player = new Player(playerId, 'Unknown', socket);
        
        // Store player
        this.clients.set(playerId, player);
        this.players = this.clients.size;
        
        console.log(`[Server] Player connected: ${playerId} (${this.players}/${CONFIG.maxPlayers})`);
        
        // Send welcome message
        socket.send(JSON.stringify({
            type: 'welcome',
            playerId: playerId,
            serverName: this.serverName,
            serverInfo: {
                players: this.players,
                maxPlayers: CONFIG.maxPlayers,
                name: this.serverName
            }
        }));
        
        // Notify other players
        this.broadcastToOthers(socket, JSON.stringify({
            type: 'player_joined',
            id: playerId,
            name: player.name,
            serverInfo: {
                players: this.players,
                maxPlayers: CONFIG.maxPlayers,
                name: this.serverName
            }
        }));
        
        // Handle messages from this player
        socket.on('message', this.onMessage.bind(this, player));
        socket.on('close', this.onPlayerDisconnect.bind(this, player));
        socket.on('error', this.onPlayerError.bind(this, player));
        
        // Ping to check connection
        socket.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
        }));
    }
    
    /**
     * Handle incoming message
     * @param {Player} player - Player who sent message
     * @param {string} data - Message data
     */
    onMessage(player, data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'player_info':
                    this.handlePlayerInfo(player, message);
                    break;
                    
                case 'player_update':
                    this.handlePlayerUpdate(player, message);
                    break;
                    
                case 'player_action':
                    this.handlePlayerAction(player, message);
                    break;
                    
                case 'hit':
                    this.handleHit(player, message);
                    break;
                    
                case 'chat':
                    this.handleChat(player, message);
                    break;
                    
                case 'ping':
                    // Respond to ping
                    player.socket.send(JSON.stringify({
                        type: 'pong',
                        timestamp: message.timestamp
                    }));
                    break;
                    
                default:
                    console.log(`[Server] Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error(`[Server] Error parsing message from ${player.id}:`, error);
        }
    }
    
    /**
     * Handle player info on connect
     * @param {Player} player - Player
     * @param {object} data - Player info
     */
    handlePlayerInfo(player, data) {
        if (data.name) {
            player.name = data.name;
        }
        
        if (data.position) {
            player.position = data.position;
        }
        
        if (data.quaternion) {
            player.quaternion = data.quaternion;
        }
        
        if (data.health !== undefined) {
            player.health = data.health;
        }
        
        console.log(`[Server] Player ${player.id} info: ${player.name} at (${player.position.x}, ${player.position.z})`);
        
        // Broadcast player joined with full info
        this.broadcastToOthers(player.socket, JSON.stringify({
            type: 'player_joined',
            id: player.id,
            name: player.name,
            position: player.position,
            quaternion: player.quaternion,
            health: player.health,
            serverInfo: {
                players: this.players,
                maxPlayers: CONFIG.maxPlayers,
                name: this.serverName
            }
        }));
    }
    
    /**
     * Handle player state update
     * @param {Player} player - Player
     * @param {object} data - Update data
     */
    handlePlayerUpdate(player, data) {
        player.updateFromClient(data);
        
        // Broadcast to other players
        this.broadcastToOthers(player.socket, JSON.stringify({
            type: 'player_update',
            id: player.id,
            position: player.position,
            quaternion: player.quaternion,
            health: player.health,
            isCrouching: player.isCrouching,
            isSprinting: player.isSprinting
        }));
    }
    
    /**
     * Handle player action
     * @param {Player} player - Player
     * @param {object} data - Action data
     */
    handlePlayerAction(player, data) {
        switch (data.action) {
            case 'reload':
                console.log(`[Server] Player ${player.id} reloading`);
                // Could add ammo manipulation here
                break;
                
            case 'switch':
                if (data.weapon) {
                    player.currentWeapon = data.weapon;
                    console.log(`[Server] Player ${player.id} switched to ${data.weapon}`);
                }
                break;
                
            case 'use_item':
                this.handleUseItem(player, data);
                break;
                
            default:
                console.log(`[Server] Unknown action: ${data.action}`);
        }
    }
    
    /**
     * Handle item use
     * @param {Player} player - Player
     * @param {object} data - Item use data
     */
    handleUseItem(player, data) {
        if (data.item === 'grenade' && player.inventory.grenades > 0) {
            player.inventory.grenades--;
            console.log(`[Server] Player ${player.id} used grenade (${player.inventory.grenades} remaining)`);
            
            // Broadcast grenade throw
            this.broadcastToOthers(player.socket, JSON.stringify({
                type: 'grenade_thrown',
                playerId: player.id,
                position: player.position
            }));
        }
        
        if (data.item === 'healthPack' && player.inventory.healthPacks > 0) {
            player.inventory.healthPacks--;
            player.health = Math.min(player.maxHealth, player.health + 25);
            console.log(`[Server] Player ${player.id} used health pack (HP: ${player.health})`);
        }
    }
    
    /**
     * Handle hit detection
     * @param {Player} player - Attacking player
     * @param {object} data - Hit data
     */
    handleHit(player, data) {
        const now = Date.now();
        if (now - player.lastDamage < CONFIG.damageCooldown) {
            return; // Rate limit damage
        }
        
        player.lastDamage = now;
        
        // Find potential targets (other players in range)
        const hitData = data.hitData || {};
        const hitPosition = hitData.position || null;
        
        if (hitPosition) {
            // Check distance to other players
            for (const [id, target] of this.clients) {
                if (id === player.id || target.isDead) continue;
                
                const dx = target.position.x - hitPosition[0];
                const dz = target.position.z - hitPosition[2];
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Check if within hit range
                if (distance < 2) { // 2m hit radius
                    this.applyDamage(player, target, hitData.damage || 35);
                    
                    // Break after first hit (could be multiple with shotgun)
                    break;
                }
            }
        }
    }
    
    /**
     * Apply damage to player
     * @param {Player} attacker - Damage source
     * @param {Player} target - Damage target
     * @param {number} damage - Damage amount
     */
    applyDamage(attacker, target, damage) {
        if (target.isDead) return;
        
        target.health = Math.max(0, target.health - damage);
        console.log(`[Server] Player ${attacker.id} damaged ${target.id} for ${damage} (HP: ${target.health})`);
        
        // Notify both players
        player.socket.send(JSON.stringify({
            type: 'player_hurt',
            id: target.id,
            damage: damage,
            fromPlayer: attacker.id
        }));
        
        target.socket.send(JSON.stringify({
            type: 'player_hurt',
            id: target.id,
            damage: damage,
            fromPlayer: attacker.id
        }));
        
        // Check for death
        if (target.health <= 0 && !target.isDead) {
            target.isDead = true;
            target.deaths++;
            
            // Notify kill
            this.broadcastToOthers(target.socket, JSON.stringify({
                type: 'kill',
                killer: attacker.id,
                victim: target.id,
                timestamp: Date.now()
            }));
            
            attacker.kills++;
            console.log(`[Server] Player ${attacker.id} killed ${target.id}`);
        }
    }
    
    /**
     * Handle chat message
     * @param {Player} player - Sender
     * @param {object} data - Chat data
     */
    handleChat(player, data) {
        if (data.message) {
            this.broadcastToOthers(player.socket, JSON.stringify({
                type: 'chat',
                playerId: player.id,
                name: player.name,
                message: data.message
            }));
        }
    }
    
    /**
     * Handle player disconnect
     * @param {Player} player - Disconnecting player
     */
    onPlayerDisconnect(player) {
        console.log(`[Server] Player disconnected: ${player.id}`);
        
        // Remove from clients
        this.clients.delete(player.id);
        this.players = this.clients.size;
        
        // Notify others
        this.broadcast(JSON.stringify({
            type: 'player_left',
            id: player.id,
            serverInfo: {
                players: this.players,
                maxPlayers: CONFIG.maxPlayers,
                name: this.serverName
            }
        }));
    }
    
    /**
     * Handle player connection error
     * @param {Player} player - Player with error
     */
    onPlayerError(player) {
        console.error(`[Server] Player error: ${player.id}`);
        this.onPlayerDisconnect(player);
    }
    
    /**
     * Handle server error
     */
    onError(error) {
        console.error('[Server] Server error:', error);
    }
    
    /**
     * Handle server close
     */
    onClose() {
        console.log('[Server] Server closed');
    }
    
    /**
     * Start game loop (tick)
     */
    startGameLoop() {
        const tickRate = CONFIG.tickRate;
        const syncRate = CONFIG.syncRate;
        
        // Main game tick
        this.tickInterval = setInterval(() => {
            this.tick();
        }, 1000 / tickRate);
        
        console.log(`[Server] Game loop started at ${tickRate} Hz`);
    }
    
    /**
     * Game tick - update players, check timeouts
     */
    tick() {
        // Check for timed out players
        const now = Date.now();
        for (const [id, player] of this.clients) {
            if (player.hasTimedOut()) {
                console.log(`[Server] Player ${id} timed out`);
                player.socket.close();
            }
        }
        
        // Clean up disconnected players
        // (handled by onPlayerDisconnect)
    }
    
    /**
     * Broadcast message to all clients
     * @param {string} message - JSON message
     */
    broadcast(message) {
        const msg = message;
        for (const [id, player] of this.clients) {
            if (player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(msg);
            }
        }
    }
    
    /**
     * Broadcast message to all except sender
     * @param {WebSocket} senderSocket - Sender's socket
     * @param {string} message - JSON message
     */
    broadcastToOthers(senderSocket, message) {
        const msg = message;
        for (const [id, player] of this.clients) {
            if (player.socket !== senderSocket && player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(msg);
            }
        }
    }
    
    /**
     * Get server status
     * @returns {object}
     */
    getStatus() {
        return {
            name: this.serverName,
            players: this.players,
            maxPlayers: CONFIG.maxPlayers,
            running: this.running,
            uptime: process.uptime()
        };
    }
}

/**
 * Start server
 */
const server = new GameServer();
server.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    server.stop();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Shutting down...');
    server.stop();
    process.exit();
});

module.exports = { GameServer, Player, CONFIG };
