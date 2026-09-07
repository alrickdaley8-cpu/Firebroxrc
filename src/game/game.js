/**
 * Firebrox FPS - Main Game Controller
 * Orchestrates all game systems: physics, weapons, network, UI
 */

import * as THREE from 'three';
import { CONSTANTS } from '../constants.js';

/**
 * Game class - Main game controller
 * Manages the game loop, rendering, and coordinates all subsystems
 */
export class Game {
    constructor(scene, camera, renderer, physics, weaponSystem, network, ui) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.physics = physics;
        this.weaponSystem = weaponSystem;
        this.network = network;
        this.ui = ui;
        
        // Player reference from physics
        this.player = physics.player;
        
        // Game state
        this.running = false;
        this.paused = false;
        this.sceneMode = 'menu'; // 'menu', 'playing', 'paused', 'death'
        this.time = 0;
        this.delta = 0;
        this.clock = new THREE.Clock();
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;
        
        // Settings (loaded from localStorage)
        this.settings = {
            sensitivity: 0.002,
            volume: 0.8,
            sfxVolume: 0.9,
            graphicsQuality: 'medium',
            shadowsEnabled: true
        };
        
        // Load settings
        this.loadSettings();
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.update = this.update.bind(this);
        this.togglePause = this.togglePause.bind(this);
        
        // Network state
        this.isMultiplayer = false;
    }
    
    /**
     * Start the game loop
     */
    start() {
        this.running = true;
        this.clock.start();
        this.animate();
        console.log('[Game] Game loop started');
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
        this.clock.stop();
        console.log('[Game] Game loop stopped');
    }
    
    /**
     * Main animation loop
     * @param {number} timestamp - Current timestamp
     */
    animate(timestamp) {
        if (!this.running) return;
        
        requestAnimationFrame(this.animate);
        
        // Calculate delta time
        this.delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent large jumps
        this.time += this.delta;
        
        // Update FPS counter
        this.frameCount++;
        this.fpsTimer += this.delta;
        if (this.fpsTimer >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }
        
        // Update all systems
        this.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update game logic
     * Called once per frame
     */
    update() {
        // Update physics
        if (this.sceneMode === 'playing' && !this.paused) {
            this.physics.update(this.delta, window.keys, this.settings.sensitivity);
        }
        
        // Update weapon system (animation, effects, etc.)
        this.weaponSystem.update(this.delta);
        
        // Update network (if multiplayer)
        if (this.isMultiplayer && this.sceneMode === 'playing') {
            this.network.update(this.delta);
        }
        
        // Update UI (if needed)
        // This is handled by UI manager based on events
        
        // Update player FOV based on sprinting/crouching
        if (this.sceneMode === 'playing') {
            let targetFOV = 75;
            
            if (this.player.isSprinting) {
                targetFOV = 80;
                document.getElementById('crosshair').classList.add('sprinting');
            } else {
                document.getElementById('crosshair').classList.remove('sprinting');
            }
            
            if (this.player.isCrouching) {
                targetFOV = 65;
                document.getElementById('crosshair').classList.add('crouching');
            } else {
                document.getElementById('crosshair').classList.remove('crouching');
            }
            
            // Smoothly interpolate FOV
            this.camera.fov += (targetFOV - this.camera.fov) * this.delta * 10;
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.sceneMode === 'playing') {
            this.paused = !this.paused;
            
            if (this.paused) {
                this.ui.showPauseMenu();
            } else {
                this.ui.hidePauseMenu();
            }
            
            return this.paused;
        }
        return false;
    }
    
    /**
     * Set scene mode
     * @param {string} mode - 'menu', 'playing', 'paused', 'death'
     */
    setSceneMode(mode) {
        this.sceneMode = mode;
        
        switch(mode) {
            case 'menu':
                this.running = false;
                this.ui.showMainMenu();
                break;
            case 'playing':
                this.running = true;
                this.clock.start();
                this.ui.hideAllMenus();
                document.getElementById('hud').classList.remove('hidden');
                
                // Reset player state
                this.player.setPosition(0, 1.8, 0);
                this.player.quaternion.identity();
                this.player.health = CONSTANTS.PLAYER_MAX_HEALTH;
                this.player.isDead = false;
                this.ui.updateHUD();
                
                this.weaponSystem.switchWeapon('primary', true);
                break;
            case 'paused':
                this.ui.showPauseMenu();
                break;
            case 'death':
                this.running = false;
                this.ui.showDeathScreen();
                break;
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('firebrox-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings.sensitivity = parsed.sensitivity || this.settings.sensitivity;
                this.settings.volume = parsed.volume || this.settings.volume;
                this.settings.sfxVolume = parsed.sfxVolume || this.settings.sfxVolume;
                this.settings.graphicsQuality = parsed.graphicsQuality || this.settings.graphicsQuality;
                this.settings.shadowsEnabled = parsed.shadowsEnabled ?? this.settings.shadowsEnabled;
            }
        } catch (e) {
            console.warn('[Game] Failed to load settings:', e);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('firebrox-settings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('[Game] Failed to save settings:', e);
        }
    }
    
    /**
     * Update settings
     * @param {object} newSettings - Settings to update
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.saveSettings();
    }
    
    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getSettings() {
        return this.settings;
    }
    
    /**
     * Check if main menu is visible
     * @returns {boolean} True if main menu is visible
     */
    isMainMenuVisible() {
        const mainMenu = document.getElementById('main-menu');
        return !mainMenu.classList.contains('hidden');
    }
    
    /**
     * Handle player death
     */
    playerDied() {
        this.sceneMode = 'death';
        this.running = false;
        this.ui.showDeathScreen();
        console.log('[Game] Player died');
    }
    
    /**
     * Reset player after death
     */
    respawnPlayer() {
        this.player.setPosition(0, 1.8, 0);
        this.player.quaternion.identity();
        this.player.health = CONSTANTS.PLAYER_MAX_HEALTH;
        this.player.isDead = false;
        this.weaponSystem.switchWeapon('primary');
        this.sceneMode = 'playing';
        this.running = true;
        this.clock.start();
        this.ui.hideAllMenus();
        this.ui.updateHUD();
        console.log('[Game] Player respawned');
    }
    
    /**
     * Exit to main menu
     */
    exitToMainMenu() {
        this.sceneMode = 'menu';
        this.running = false;
        this.network.disconnect();
        this.ui.showMainMenu();
        document.getElementById('hud').classList.add('hidden');
        this.ui.resetPlayerList();
        console.log('[Game] Returned to main menu');
    }
}

export default Game;
