/**
 * Firebrox FPS - Main Entry Point
 * Initializes the complete Three.js FPS game system
 * 
 * This script should be loaded after all other scripts
 */

// Use global THREE from CDN
const THREE = window.THREE;
const CONSTANTS = window.CONSTANTS;

// Game state (global)
window.gameInstance = null;
window.physics = null;
window.network = null;
window.ui = null;
window.weaponSystem = null;
window.AudioManager = null;

/**
 * Initialize the complete game
 */
function initGame() {
    console.log('[Firebrox] Initializing Firebrox FPS...');
    
    try {
        // 1. Create Three.js renderer and scene
        const renderer = new THREE.WebGLRenderer({
            antialias: CONSTANTS.graphics.shadows,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = CONSTANTS.graphics.shadows;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        
        document.getElementById('game-container').appendChild(renderer.domElement);
        
        // 2. Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0x87ceeb, 50, 100);
        
        // 3. Create camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 1.8, 0);
        
        // 4. Initialize physics
        window.physics = new PhysicsManager(scene);
        
        // 5. Initialize weapon system
        window.weaponSystem = new WeaponSystem(scene, camera);
        
        // 6. Initialize network manager
        window.network = new NetworkManager(window.physics, window.weaponSystem);
        
        // 7. Initialize audio
        window.AudioManager = new AudioManager();
        
        // 8. Initialize UI
        window.ui = new UIManager(window.network, window.weaponSystem, camera);
        
        // 9. Initialize main game
        window.gameInstance = new Game(
            scene,
            camera,
            renderer,
            window.physics,
            window.weaponSystem,
            window.network,
            window.ui
        );
        
        // 10. Set up event listeners
        setupEventListeners(window, renderer, camera);
        
        // 11. Load level
        loadLevel(scene, window.physics);
        
        // 12. Start game loop
        window.gameInstance.start();
        
        console.log('[Firebrox] Game initialized successfully!');
        
        // Show main menu
        window.ui.showMainMenu();
        
        // Initialize audio on first click
        document.addEventListener('click', () => {
            if (window.AudioManager && !window.AudioManager.initialized) {
                window.AudioManager.init();
            }
        }, { once: true });
        
    } catch (error) {
        console.error('[Firebrox] Failed to initialize game:', error);
        showError('Failed to initialize game. Please refresh the page.');
    }
}

/**
 * Load the game level
 */
function loadLevel(scene, physics) {
    console.log('[Firebrox] Loading game level...');
    
    // Create lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = CONSTANTS.graphics.shadowResolution;
    directionalLight.shadow.mapSize.height = CONSTANTS.graphics.shadowResolution;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    scene.add(directionalLight);
    
    // Create skybox
    const skyboxGeometry = new THREE.BoxGeometry(500, 500, 500);
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
    
    // Materials
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
    
    // Helper to create building with physics
    function createBuilding(x, y, z, w, h, d, material) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        levelGroup.add(mesh);
        
        physics.addCollider(new THREE.Box3(
            new THREE.Vector3(x - w/2, y - h/2, z - d/2),
            new THREE.Vector3(x + w/2, y + h/2, z + d/2)
        ));
        
        return mesh;
    }
    
    // Buildings
    createBuilding(0, 3, 0, 20, 6, 15, wallMaterial);
    createBuilding(0, 3.5, -8, 20, 1, 15, roofMaterial);
    createBuilding(-25, 2.5, 0, 10, 5, 12, wallMaterial);
    createBuilding(-25, 3, 6, 10, 1, 12, roofMaterial);
    createBuilding(25, 3, 0, 12, 6, 14, wallMaterial);
    createBuilding(25, 3.5, 7, 12, 1, 14, roofMaterial);
    createBuilding(-15, 2, -30, 8, 4, 10, wallMaterial);
    createBuilding(12, 2.5, -25, 12, 5, 8, wallMaterial);
    createBuilding(-8, 1.5, 20, 6, 3, 6, wallMaterial);
    createBuilding(10, 1.5, 25, 8, 3, 6, wallMaterial);
    
    // Obstacles
    const obstacles = [
        { x: -12, z: 8, w: 2, h: 1.5, d: 2 },
        { x: 12, z: -5, w: 3, h: 1.5, d: 2 },
        { x: -5, z: -18, w: 2, h: 1, d: 2 },
        { x: 8, z: 15, w: 2.5, h: 1.2, d: 1.5 },
        { x: -18, z: -10, w: 2, h: 0.8, d: 2 },
        { x: 16, z: 12, w: 1.5, h: 1.8, d: 1.5 },
        { x: -22, z: 15, w: 3, h: 1.5, d: 2.5 },
        { x: 20, z: -15, w: 2.5, h: 1.5, d: 2 },
    ];
    
    obstacles.forEach(pos => {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(pos.w, pos.h, pos.d),
            obstacleMaterial
        );
        mesh.position.set(pos.x, pos.h/2, pos.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        levelGroup.add(mesh);
        
        physics.addCollider(new THREE.Box3(
            new THREE.Vector3(pos.x - pos.w/2, 0, pos.z - pos.d/2),
            new THREE.Vector3(pos.x + pos.w/2, pos.h, pos.z + pos.d/2)
        ));
    });
    
    // Cover barriers
    for (let i = 0; i < 8; i++) {
        const w = 3 + Math.random() * 4;
        const h = 1.5 + Math.random() * 1;
        const d = 0.2;
        
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            obstacleMaterial
        );
        const angle = (i / 8) * Math.PI * 2;
        const radius = 25 + Math.random() * 10;
        wall.position.set(Math.cos(angle) * radius, h/2, Math.sin(angle) * radius);
        wall.rotation.y = Math.random() * Math.PI * 2;
        wall.castShadow = true;
        wall.receiveShadow = true;
        levelGroup.add(wall);
        
        physics.addCollider(new THREE.Box3(
            new THREE.Vector3(wall.position.x - w/2, 0, wall.position.z - d/2),
            new THREE.Vector3(wall.position.x + w/2, h, wall.position.z + d/2)
        ));
    }
    
    console.log('[Firebrox] Level geometry complete!');
}

/**
 * Set up global event listeners
 */
function setupEventListeners(win, renderer, camera) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Keyboard state
    const keys = {};
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        switch(e.code) {
            case 'KeyR':
                if (window.weaponSystem) window.weaponSystem.reload();
                break;
            case 'Space':
                e.preventDefault();
                if (window.gameInstance && !window.ui.isMainMenuVisible() && !window.ui.isPaused()) {
                    window.physics.playerJump();
                }
                break;
            case 'KeyG':
                if (window.weaponSystem) window.weaponSystem.useItem('grenade');
                break;
            case 'KeyH':
                if (window.weaponSystem) window.weaponSystem.useItem('healthPack');
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    window.keys = keys;
    
    // Scroll wheel weapon switching
    window.addEventListener('wheel', (e) => {
        if (e.deltaY > 50 && window.ui && !window.ui.isMainMenuVisible() && !window.ui.isPaused()) {
            if (window.weaponSystem) window.weaponSystem.switchToNext();
        } else if (e.deltaY < -50 && window.ui && !window.ui.isMainMenuVisible() && !window.ui.isPaused()) {
            if (window.weaponSystem) window.weaponSystem.switchToPrevious();
        }
    }, { passive: true });
}

/**
 * Show error notification
 */
function showError(message) {
    const toast = document.getElementById('notification-toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'notification error visible';
        setTimeout(() => {
            toast.className = 'notification error hidden';
        }, 5000);
    }
}

/**
 * Physics Manager class (simplified version)
 */
class PhysicsManager {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        
        this.position = new THREE.Vector3(0, 1.8, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.isGrounded = false;
        this.isCrouching = false;
        this.isSprinting = false;
        this.height = 1.8;
        this.radius = 0.4;
    }
    
    addCollider(box) {
        this.colliders.push({
            min: box.min.clone(),
            max: box.max.clone()
        });
    }
    
    update(delta, keys) {
        this.handleMovement(delta, keys);
        this.handleJump(delta, keys);
        this.applyGravity(delta);
        this.detectCollision();
        
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Update camera
        if (window.gameInstance && window.gameInstance.camera) {
            window.gameInstance.camera.position.copy(this.position);
        }
    }
    
    handleMovement(delta, keys) {
        const dir = new THREE.Vector3();
        
        if (keys['KeyW'] || keys['ArrowUp']) dir.z -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dir.z += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dir.x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dir.x += 1;
        
        if (dir.length() > 0) {
            dir.normalize();
            const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
                window.gameInstance.camera.quaternion
            );
            camDir.y = 0;
            camDir.normalize();
            
            const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
                window.gameInstance.camera.quaternion
            );
            camRight.y = 0;
            camRight.normalize();
            
            const moveDir = new THREE.Vector3();
            moveDir.addScaledVector(camDir, -dir.z);
            moveDir.addScaledVector(camRight, dir.x);
            moveDir.y = 0;
            moveDir.normalize();
            
            const speed = this.isCrouching ? 2.5 : (this.isSprinting ? 10 : 6);
            this.velocity.x = moveDir.x * speed;
            this.velocity.z = moveDir.z * speed;
            this.velocity.y = 0;
            
            if (keys['ShiftLeft'] || keys['ShiftRight']) {
                if (!this.isCrouching && dir.length() > 0) {
                    this.isSprinting = true;
                }
            } else {
                this.isSprinting = false;
            }
        } else {
            this.velocity.x *= 0.85;
            this.velocity.z *= 0.85;
        }
    }
    
    handleJump(delta, keys) {
        if (keys['Space'] && this.isGrounded) {
            this.velocity.y = 8;
            this.isGrounded = false;
        }
    }
    
    applyGravity(delta) {
        if (!this.isGrounded) {
            this.velocity.y += -25 * delta;
        }
    }
    
    detectCollision() {
        this.isGrounded = false;
        
        if (this.position.y <= this.height / 2) {
            this.position.y = this.height / 2;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
        
        for (const collider of this.colliders) {
            if (this.checkCollision(collider)) {
                this.resolveCollision(collider);
            }
        }
    }
    
    checkCollision(collider) {
        const p = this.position;
        const r = this.radius;
        const nearest = new THREE.Vector3(
            Math.max(collider.min.x, Math.min(p.x, collider.max.x)),
            Math.max(collider.min.y, Math.min(p.y, collider.max.y)),
            Math.max(collider.min.z, Math.min(p.z, collider.max.z))
        );
        
        const dx = p.x - nearest.x;
        const dy = p.y - nearest.y;
        const dz = p.z - nearest.z;
        
        return Math.sqrt(dx*dx + dy*dy + dz*dz) < r;
    }
    
    resolveCollision(collider) {
        const p = this.position;
        const center = new THREE.Vector3(
            (collider.min.x + collider.max.x) / 2,
            (collider.min.y + collider.max.y) / 2,
            (collider.min.z + collider.max.z) / 2
        );
        
        const dx = p.x - center.x;
        const dz = p.z - center.z;
        
        const overlapX = this.radius - Math.abs(dx);
        const overlapZ = this.radius - Math.abs(dz);
        
        if (overlapX > overlapZ) {
            this.position.x += Math.sign(dx) * (overlapX + 0.01);
        } else {
            this.position.z += Math.sign(dz) * (overlapZ + 0.01);
        }
    }
    
    playerJump() {
        if (this.isGrounded && !this.isCrouching) {
            this.velocity.y = 8;
            this.isGrounded = false;
        }
    }
    
    getState() {
        return {
            position: [this.position.x, this.position.y, this.position.z],
            quaternion: [
                window.gameInstance.camera.quaternion.x,
                window.gameInstance.camera.quaternion.y,
                window.gameInstance.camera.quaternion.z,
                window.gameInstance.camera.quaternion.w
            ],
            health: this.health,
            isCrouching: this.isCrouching,
            isSprinting: this.isSprinting,
            isDead: this.isDead
        };
    }
    
    reset() {
        this.position.set(0, 1.8, 0);
        this.velocity.set(0, 0, 0);
        this.health = this.maxHealth;
        this.isDead = false;
        this.isCrouching = false;
        this.isSprinting = false;
    }
}

/**
 * Audio Manager class
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.sfxGain = null;
        this.masterGain = null;
    }
    
    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.8;
            this.masterGain.connect(this.audioContext.destination);
            
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = 0.9;
            this.sfxGain.connect(this.masterGain);
            
            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }
    
    playGunshot() {
        if (!this.initialized) return;
        
        const bufSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufSize; i++) {
            const t = i / this.audioContext.sampleRate;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30);
        }
        
        const src = this.audioContext.createBufferSource();
        src.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        src.start();
        src.stop(this.audioContext.currentTime + 0.1);
    }
    
    playReload() {
        if (!this.initialized) return;
        
        const bufSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufSize; i++) {
            const t = i / this.audioContext.sampleRate;
            data[i] = Math.sin(t * 800) * Math.min(1, t * 20) * Math.exp(-t * 4) * 0.3;
        }
        
        const src = this.audioContext.createBufferSource();
        src.buffer = buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.5;
        
        src.connect(gain);
        gain.connect(this.sfxGain);
        
        src.start();
    }
}

export { initGame, gameInstance, physics, network, ui, weaponSystem };
