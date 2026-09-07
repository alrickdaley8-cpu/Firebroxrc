/**
 * Firebrox FPS - Native Game Controller (Browser)
 * Main game loop, scene management, and system coordination
 */

import * as THREE from 'three';

class Game {
    constructor(scene, camera, renderer, physics, weaponSystem, network, ui) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.physics = physics;
        this.weaponSystem = weaponSystem;
        this.network = network;
        this.ui = ui;
        
        this.running = false;
        this.paused = false;
        this.sceneMode = 'menu';
        this.time = 0;
        this.clock = new THREE.Clock();
        
        // FPS tracking
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;
    }
    
    /**
     * Start the game loop
     */
    start() {
        this.running = true;
        this.clock.start();
        this.animate();
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
        this.clock.stop();
    }
    
    /**
     * Main animation loop
     */
    animate() {
        if (!this.running) return;
        
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = Math.min(this.clock.getDelta(), 0.1);
        this.time += delta;
        
        // FPS tracking
        this.frameCount++;
        this.fpsTimer += delta;
        if (this.fpsTimer >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }
        
        // Update systems
        this.update(delta);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update game logic
     */
    update(delta) {
        if (this.sceneMode === 'playing' && !this.paused) {
            // Update player
            this.physics.update(delta, window.keys || {});
            
            // Update weapon
            this.weaponSystem.update(delta);
            
            // Update network if multiplayer
            if (this.network && this.network.connected) {
                this.network.update(delta);
            }
            
            // Update FOV based on sprint/crouch
            let targetFOV = 75;
            if (this.physics.isSprinting) targetFOV = 80;
            if (this.physics.isCrouching) targetFOV = 65;
            
            this.camera.fov += (targetFOV - this.camera.fov) * delta * 10;
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Toggle pause
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
                this.physics.reset();
                this.weaponSystem.switchToWeapon('1');
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
     * Player died
     */
    playerDied() {
        this.sceneMode = 'death';
        this.stop();
        this.ui.showDeathScreen();
    }
    
    /**
     * Respawn player
     */
    respawnPlayer() {
        this.physics.reset();
        this.weaponSystem.switchToWeapon('1');
        this.sceneMode = 'playing';
        this.start();
        this.ui.hideAllMenus();
    }
    
    /**
     * Exit to main menu
     */
    exitToMainMenu() {
        this.sceneMode = 'menu';
        this.stop();
        if (this.network) this.network.disconnect();
        this.ui.showMainMenu();
        document.getElementById('hud').classList.add('hidden');
        this.ui.resetPlayerList();
    }
}

export default Game;
export { Game };
