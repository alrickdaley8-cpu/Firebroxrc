/**
 * Firebrox FPS - Main Entry Point
 * Initializes the complete Three.js FPS game system
 */

import * as THREE from 'three';
import { CONSTANTS } from './constants.js';
import { Game } from './game/game.js';
import { PhysicsManager } from './game/physics.js';
import { NetworkManager } from './networking/network.js';
import { UIManager } from './ui/ui.js';
import { WeaponSystem } from './weapon/weapon.js';

// Global references for legacy script access (non-module)
window.THREE = THREE;
window.CONSTANTS = CONSTANTS;

// Game state
let gameInstance = null;
let physics = null;
let network = null;
let ui = null;
let weaponSystem = null;

/**
 * Initialize the complete game
 * Called when DOM is ready and page loads
 */
async function initGame() {
    console.log('[Firebrox] Initializing Firebrox FPS...');
    
    try {
        // 1. Create Three.js renderer and scene
        const renderer = new THREE.WebGLRenderer({
            antialias: CONSTANTS.GRAPHICS.antiAliasing,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = CONSTANTS.GRAPHICS.shadows;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        
        document.getElementById('game-container').appendChild(renderer.domElement);
        
        // 2. Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // Sky blue
        scene.fog = new THREE.Fog(0x87ceeb, 50, 100);
        
        // 3. Create camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 1.8, 0);
        
        // 4. Initialize physics
        physics = new PhysicsManager(scene);
        
        // 5. Initialize weapon system
        weaponSystem = new WeaponSystem(scene, camera, physics);
        
        // 6. Initialize network manager
        network = new NetworkManager(physics, weaponSystem);
        
        // 7. Initialize UI
        ui = new UIManager(network, weaponSystem, camera);
        
        // 8. Initialize main game
        gameInstance = new Game(
            scene,
            camera,
            renderer,
            physics,
            weaponSystem,
            network,
            ui
        );
        
        // 9. Set up event listeners
        setupEventListeners(window, renderer, camera);
        
        // 10. Load level
        await loadLevel(scene, physics);
        
        // 11. Start game loop
        gameInstance.start();
        
        console.log('[Firebrox] Game initialized successfully!');
        
        // Show initial states
        ui.showMainMenu();
        
    } catch (error) {
        console.error('[Firebrox] Failed to initialize game:', error);
        showError('Failed to initialize game. Please refresh the page.');
    }
}

/**
 * Load the game level
 */
async function loadLevel(scene, physics) {
    console.log('[Firebrox] Loading game level...');
    
    // Create lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = CONSTANTS.GRAPHICS.shadowResolution;
    directionalLight.shadow.mapSize.height = CONSTANTS.GRAPHICS.shadowResolution;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    scene.add(directionalLight);
    
    // Create skybox
    const skyboxGeometry = new THREE.CubeGeometry(500, 500, 500);
    const skyboxMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb,
        side: THREE.BackSide 
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
    
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create game level
    createLevel(scene, physics);
    
    console.log('[Firebrox] Level loaded!');
}

/**
 * Create the game level with buildings, obstacles, etc.
 */
function createLevel(scene, physics) {
    console.log('[Firebrox] Creating level geometry...');
    
    const levelGroup = new THREE.Group();
    scene.add(levelGroup);
    
    // Building materials
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.0
    });
    
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        roughness: 0.9,
        metalness: 0.0
    });
    
    const obstacleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        roughness: 0.7,
        metalness: 0.2
    });
    
    // Helper to create box with physics
    function createBuilding(x, y, z, width, height, depth, material) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        levelGroup.add(mesh);
        
        // Add physics collider
        physics.addStaticCollider(
            new THREE.Box3(
                new THREE.Vector3(x - width/2, y - height/2, z - depth/2),
                new THREE.Vector3(x + width/2, y + height/2, z + depth/2)
            ),
            { type: 'box', x, y, z, w: width, h: height, d: depth }
        );
        
        return mesh;
    }
    
    // Create central building complex
    // Main HQ building (center)
    createBuilding(0, 3, 0, 20, 6, 15, wallMaterial);
    createBuilding(0, 3.5, -8, 20, 1, 15, roofMaterial);
    
    // Left building
    createBuilding(-25, 2.5, 0, 10, 5, 12, wallMaterial);
    createBuilding(-25, 3, 6, 10, 1, 12, roofMaterial);
    
    // Right building
    createBuilding(25, 3, 0, 12, 6, 14, wallMaterial);
    createBuilding(25, 3.5, 7, 12, 1, 14, roofMaterial);
    
    // Far left
    createBuilding(-15, 2, -30, 8, 4, 10, wallMaterial);
    
    // Far right
    createBuilding(12, 2.5, -25, 12, 5, 8, wallMaterial);
    
    // Small structures
    createBuilding(-8, 1.5, 20, 6, 3, 6, wallMaterial);
    createBuilding(10, 1.5, 25, 8, 3, 6, wallMaterial);
    
    // Create obstacles (crates, barriers, etc.)
    const obstaclePositions = [
        { x: -12, z: 8, w: 2, h: 1.5, d: 2 },
        { x: 12, z: -5, w: 3, h: 1.5, d: 2 },
        { x: -5, z: -18, w: 2, h: 1, d: 2 },
        { x: 8, z: 15, w: 2.5, h: 1.2, d: 1.5 },
        { x: -18, z: -10, w: 2, h: 0.8, d: 2 },
        { x: 16, z: 12, w: 1.5, h: 1.8, d: 1.5 },
        { x: -22, z: 15, w: 3, h: 1.5, d: 2.5 },
        { x: 20, z: -15, w: 2.5, h: 1.5, d: 2 },
    ];
    
    obstaclePositions.forEach(pos => {
        const geo = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
        const mesh = new THREE.Mesh(geo, obstacleMaterial);
        mesh.position.set(pos.x, pos.h/2, pos.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        levelGroup.add(mesh);
        
        // Add physics
        physics.addStaticCollider(
            new THREE.Box3(
                new THREE.Vector3(pos.x - pos.w/2, 0, pos.z - pos.d/2),
                new THREE.Vector3(pos.x + pos.w/2, pos.h, pos.z + pos.d/2)
            ),
            { type: 'box', x: pos.x, y: pos.h/2, z: pos.z, w: pos.w, h: pos.h, d: pos.d }
        );
    });
    
    // Create some cover barriers
    for (let i = 0; i < 8; i++) {
        const wallWidth = 3 + Math.random() * 4;
        const wallHeight = 1.5 + Math.random() * 1;
        const wallDepth = 0.2;
        
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth),
            obstacleMaterial
        );
        
        // Place around perimeter
        const angle = (i / 8) * Math.PI * 2;
        const radius = 25 + Math.random() * 10;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        wall.position.set(x, wallHeight/2, z);
        wall.rotation.y = Math.random() * Math.PI * 2;
        wall.castShadow = true;
        wall.receiveShadow = true;
        levelGroup.add(wall);
        
        // Add physics
        const halfWidth = wallWidth / 2;
        const halfDepth = wallDepth / 2;
        physics.addStaticCollider(
            new THREE.Box3(
                new THREE.Vector3(x - halfWidth, 0, z - halfDepth),
                new THREE.Vector3(x + halfWidth, wallHeight, z + halfDepth)
            ),
            { type: 'box', x, y: wallHeight/2, z, w: wallWidth, h: wallHeight, d: wallDepth }
        );
    }
    
    // Create some raised platforms
    const platformPositions = [
        { x: -35, z: -35, w: 10, h: 0.5, d: 10, y: 0 },
        { x: 35, z: 35, w: 8, h: 0.5, d: 8, y: 0 },
        { x: -20, z: 40, w: 6, h: 0.5, d: 6, y: 0 },
    ];
    
    platformPositions.forEach(p => {
        const plat = new THREE.Mesh(
            new THREE.BoxGeometry(p.w, p.h, p.d),
            floorMaterial
        );
        plat.position.set(p.x, p.h/2 + 0.01, p.z);
        plat.receiveShadow = true;
        levelGroup.add(plat);
        
        // Add physics for level geometry (floor is implicit via ground plane)
    });
    
    // Add some decorations/transparent boundaries
    // (Optional: add trees, light poles, etc. here)
    
    console.log('[Firebrox] Level geometry complete!');
}

/**
 * Set up global event listeners
 */
function setupEventListeners(window, renderer, camera) {
    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Keyboard state tracking
    const keys = {};
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        // Handle key-specific actions
        switch(e.code) {
            case 'KeyR':
                weaponSystem.reload();
                break;
            case 'Space':
                e.preventDefault();
                if (!ui.isMainMenuVisible() && !ui.isPaused()) {
                    physics.playerJump();
                }
                break;
            case 'KeyG':
                weaponSystem.useItem('grenade');
                break;
            case 'KeyH':
                weaponSystem.useItem('healthPack');
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    window.keys = keys; // Global access for player controller
    
    // Scroll wheel for weapon switching
    window.addEventListener('wheel', (e) => {
        if (e.deltaY > 50 && !ui.isMainMenuVisible() && !ui.isPaused()) {
            weaponSystem.switchWeapon('next');
        } else if (e.deltaY < -50 && !ui.isMainMenuVisible() && !ui.isPaused()) {
            weaponSystem.switchWeapon('prev');
        }
    }, { passive: true });
}

/**
 * Show error notification
 */
function showError(message) {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.className = 'notification error visible';
    
    setTimeout(() => {
        toast.className = 'notification error hidden';
    }, 5000);
}

/**
 * Export for use in other modules
 */
export { 
    initGame, 
    gameInstance, 
    physics, 
    network, 
    ui, 
    weaponSystem 
};
