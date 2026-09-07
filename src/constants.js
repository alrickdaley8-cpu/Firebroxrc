// Game Constants - Firebrox FPS
// This file defines all tuning parameters for the game

export const CONSTANTS = {
    // Movement
    MOVE_SPEED: 6,                    // Base walk speed m/s
    SPRINT_SPEED: 10,                 // Sprint speed m/s
    CROUCH_SPEED: 2.5,                // Crouch speed m/s
    JUMP_FORCE: 7,                    // Jump velocity (m/s)
    GRAVITY: -20,                     // Gravity (m/s²)
    FRICTION: 10,                     // Ground friction coefficient
    SLIDE_FRICTION: 0.8,              // Air resistance
    
    // Player
    PLAYER_HEIGHT: 1.8,               // Normal standing height
    CROUCH_HEIGHT: 0.8,              // Crouching height
    PLAYER_RADIUS: 0.4,              // Collision radius
    PLAYER_MAX_HEALTH: 100,          // Maximum health points
    HEALTH_REGEN_RATE: 2,            // Health regen per second (when not taking damage)
    HEALTH_REGEN_DELAY: 3,           // Delay before health regen starts (seconds)
    
    // Weapons
    PRIMARY_MAX_AMMO: 120,            // Total ammo capacity for primary
    PRIMARY_RESERVE: 300,            // Reserve ammo for primary
    SECONDARY_MAX_AMMO: 30,          // Ammo per magazine for secondary
    SECONDARY_RESERVE: 120,          // Reserve ammo for secondary
    MELEE_RANGE: 3,                   // Melee attack range (meters)
    
    // Weapon Configurations
    WEAPON_CONFIGS: {
        'assault-rifle': {
            name: 'ASSAULT RIFLE',
            damage: 35,
            range: 100,
            fireRate: 0.12,           // Seconds between shots
            spread: 0.03,            // Base spread in radians
            reloadTime: 2.5,
            magSize: 30,
            reserve: 300,
            muzzleVelocity: 900,
            accessories: {
                optics: { damage: 0, accuracy: 0, recoil: 0, weight: 0 },
                barrel: { damage: 0, accuracy: 0, recoil: 0, range: 0, weight: 0 },
                stock: { damage: 0, accuracy: 0, recoil: 0, stability: 0, weight: 0 },
                skin: { damage: 0, accuracy: 0, recoil: 0 }
            }
        },
        'smg': {
            name: 'SUBMACHINE GUN',
            damage: 22,
            range: 50,
            fireRate: 0.06,
            spread: 0.08,
            reloadTime: 2.0,
            magSize: 40,
            reserve: 200,
            muzzleVelocity: 600,
            accessories: {
                optics: { damage: 0, accuracy: 0, recoil: 0, weight: 0 },
                barrel: { damage: 0, accuracy: 0, recoil: -5, range: -10, weight: 0 },
                stock: { damage: 0, accuracy: 0, recoil: -10, stability: -10, weight: 0 },
                skin: { damage: 0, accuracy: 0, recoil: 0 }
            }
        },
        'pistol': {
            name: 'PISTOL',
            damage: 40,
            range: 40,
            fireRate: 0.25,
            spread: 0.02,
            reloadTime: 2.0,
            magSize: 15,
            reserve: 60,
            muzzleVelocity: 700,
            accessories: {
                optics: { damage: 0, accuracy: 0, recoil: 0, weight: 0 },
                barrel: { damage: 0, accuracy: 0, recoil: 0, range: 0, weight: 0 },
                stock: { damage: 0, accuracy: 0, recoil: 0, stability: 0, weight: 0 },
                skin: { damage: 0, accuracy: 0, recoil: 0 }
            }
        },
        'shotgun': {
            name: 'SHOTGUN',
            damage: 15,              // Base damage per pellet
            range: 25,
            fireRate: 1.2,
            spread: 0.15,           // Shotgun spread
            reloadTime: 2.8,
            magSize: 8,
            reserve: 40,
            muzzleVelocity: 400,
            pellets: 8,             // Number of pellets
            accessories: {
                optics: { damage: 0, accuracy: 0, recoil: 0, weight: 0 },
                barrel: { damage: 0, accuracy: 0, recoil: 0, range: 0, weight: 0 },
                stock: { damage: 0, accuracy: 0, recoil: 0, stability: 0, weight: 0 },
                skin: { damage: 0, accuracy: 0, recoil: 0 }
            }
        },
        'knife': {
            name: 'COMBAT KNIFE',
            damage: 55,
            range: 3,
            fireRate: 0.8,
            spread: 0,
            melee: true,
            accessories: {
                skin: { damage: 0, accuracy: 0, recoil: 0 }
            }
        }
    },
    
    // Attachment Effects
    ATTACHMENT_EFFECTS: {
        optics: {
            'none': { damage: 0, accuracy: 0, recoil: 0, weight: 0 },
            'holo': { damage: 0, accuracy: 10, recoil: 5, weight: 5 },
            'red-dot': { damage: 0, accuracy: 15, recoil: 5, weight: 3 },
            'scope-3x': { damage: 0, accuracy: 25, recoil: 10, weight: 10 },
            'scope-4x': { damage: 0, accuracy: 35, recoil: 8, weight: 12 },
            'reflex': { damage: 0, accuracy: 20, recoil: 5, weight: 5 }
        },
        barrel: {
            'none': { damage: 0, accuracy: 0, recoil: 0, range: 0, weight: 0 },
            'muzzle-brake': { damage: 0, accuracy: -5, recoil: -20, range: 0, weight: 10 },
            'extended-barrel': { damage: 5, accuracy: 5, recoil: 5, range: 10, weight: 15 },
            'suppressor': { damage: 0, accuracy: 10, recoil: -10, range: -20, weight: 15 }
        },
        stock: {
            'none': { damage: 0, accuracy: -10, recoil: 15, stability: -15, weight: -10 },
            'collapsible': { damage: 0, accuracy: 5, recoil: 0, stability: 5, weight: 0 },
            'solid': { damage: 0, accuracy: 10, recoil: 5, stability: 15, weight: 10 },
            'adjustable': { damage: 0, accuracy: 15, recoil: -5, stability: 15, weight: 12 }
        },
        skin: {
            'default': { damage: 0, accuracy: 0, recoil: 0 },
            'desert-camo': { damage: 0, accuracy: 2, recoil: 0 },
            'stealth-black': { damage: 0, accuracy: 3, recoil: 0, stealth: 5 },
            'urban-camo': { damage: 0, accuracy: 2, recoil: 0 },
            'camo-olivedrab': { damage: 0, accuracy: 1, recoil: 0 },
            'charcoal': { damage: 0, accuracy: 1, recoil: 0 }
        }
    },
    
    // Networking
    SERVER_PORT: 3000,
    UPDATE_INTERVAL: 30,              // Network update interval (ms)
    PLAYER_SYNC_RATE: 20,            // How often player position syncs (Hz)
    MAX_PLAYERS: 16,
    TICK_RATE: 60,                   // Server tick rate (Hz)
    
    // Audio
    AUDIO: {
        masterVolume: 0.8,
        sfxVolume: 0.9,
        musicVolume: 0.5,
        footstepVolume: 0.3,
        reloadVolume: 0.5
    },
    
    // Graphics
    GRAPHICS: {
        quality: 'medium',
        shadows: true,
        shadowResolution: 1024,
        antiAliasing: true,
        bloom: false,
        fogEnabled: true,
        fogDensity: 0.02
    },
    
    // Physics
    PHYSICS: {
        friction: 0.8,
        restitution: 0.3,
        maxSlope: 0.7,               // Max slope angle (sin of angle) player can walk on
        slideSpeed: 0.5
    }
};

// Weapon restrictions for loadout
export const LOADOUT_LIMITS = {
    primaryTypes: ['assault-rifle', 'smg', 'shotgun'],
    secondaryTypes: ['pistol'],
    meleeTypes: ['knife']
};

// Available weapons in customization
export const AVAILABLE_WEAPONS = [
    { id: 'assault-rifle', name: 'ASSAULT RIFLE', icon: '🔫', category: 'primary', maxRange: 300 }),
    { id: 'smg', name: 'SUBMACHINE GUN', icon: '🔫', category: 'primary', maxRange: 150 }),
    { id: 'shotgun', name: 'SHOTGUN', icon: '🔫', category: 'primary', maxRange: 60 }),
    { id: 'pistol', name: 'PISTOL', icon: '🔫', category: 'secondary', maxRange: 50 }),
    { id: 'knife', name: 'COMBAT KNIFE', icon: '🔪', category: 'melee', maxRange: 5 })
];

// Default attachments
export const defaultAttachments = {
    optic: 'none',
    barrel: 'none',
    stock: 'none',
    skin: 'default'
};
