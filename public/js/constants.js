// Firebrox FPS - Game Constants
const CONSTANTS = {
    player: {
        height: 1.8,
        radius: 0.5,
        maxHealth: 100,
        sprintSpeed: 10,
        walkSpeed: 5,
        crouchSpeed: 2.5,
        jumpForce: 7,
        gravity: -20
    },
    
    weapons: {
        assaultRifle: {
            name: 'Assault Rifle',
            damage: 35,
            range: 100,
            fireRate: 0.12,
            spread: 0.03,
            reloadTime: 2.5,
            magSize: 30,
            reserveAmmo: 300
        },
        smg: {
            name: 'SMG',
            damage: 22,
            range: 50,
            fireRate: 0.06,
            spread: 0.08,
            reloadTime: 2.0,
            magSize: 40,
            reserveAmmo: 200
        },
        pistol: {
            name: 'Pistol',
            damage: 40,
            range: 40,
            fireRate: 0.25,
            spread: 0.02,
            reloadTime: 2.0,
            magSize: 15,
            reserveAmmo: 60
        },
        shotgun: {
            name: 'Shotgun',
            damage: 25,
            range: 25,
            fireRate: 1.2,
            spread: 0.15,
            reloadTime: 2.8,
            magSize: 8,
            reserveAmmo: 40
        },
        knife: {
            name: 'Knife',
            damage: 55,
            range: 3,
            melee: true
        }
    },
    
    attachments: {
        optics: {
            none: { damage: 0, accuracy: 0, recoil: 5 },
            holo: { damage: 0, accuracy: 10, recoil: 5 },
            'red-dot': { damage: 0, accuracy: 15, recoil: 5 },
            'scope-3x': { damage: 0, accuracy: 25, recoil: 10 },
            'scope-4x': { damage: 0, accuracy: 35, recoil: 8 }
        },
        barrels: {
            none: { damage: 0, accuracy: 0, recoil: 5 },
            'muzzle-brake': { damage: 0, accuracy: -5, recoil: -20 },
            'extended-barrel': { damage: 5, accuracy: 5, recoil: 5 },
            suppressor: { damage: 0, accuracy: 10, recoil: -10 }
        },
        stocks: {
            none: { damage: 0, accuracy: -10, recoil: 15 },
            collapsible: { damage: 0, accuracy: 5, recoil: 0 },
            solid: { damage: 0, accuracy: 10, recoil: 5 },
            adjustable: { damage: 0, accuracy: 15, recoil: -5 }
        },
        skins: {
            default: { damage: 0, accuracy: 0, recoil: 0 },
            'desert-camo': { damage: 0, accuracy: 2, recoil: 0 },
            'stealth-black': { damage: 0, accuracy: 3, recoil: 0 },
            'urban-camo': { damage: 0, accuracy: 2, recoil: 0 }
        }
    },
    
    networking: {
        serverPort: 3000,
        updateInterval: 30
    },
    
    audio: {
        masterVolume: 0.8,
        sfxVolume: 0.9,
        musicVolume: 0.5
    },
    
    graphics: {
        quality: 'medium',
        shadows: true,
        shadowResolution: 1024
    }
};

const defaultAttachments = {
    optic: 'none',
    barrel: 'none',
    stock: 'none',
    skin: 'default'
};

const LOADOUT_LIMITS = {
    primaryTypes: ['assaultRifle', 'smg', 'shotgun'],
    secondaryTypes: ['pistol'],
    meleeTypes: ['knife']
};

const AVAILABLE_WEAPONS = [
    { id: 'assaultRifle', name: 'ASSAULT RIFLE', icon: '🔫', category: 'primary', maxRange: 300 },
    { id: 'smg', name: 'SUBMACHINE GUN', icon: '🔫', category: 'primary', maxRange: 150 },
    { id: 'shotgun', name: 'SHOTGUN', icon: '🔫', category: 'primary', maxRange: 60 },
    { id: 'pistol', name: 'PISTOL', icon: '🔫', category: 'secondary', maxRange: 50 },
    { id: 'knife', name: 'COMBAT KNIFE', icon: '🔪', category: 'melee', maxRange: 5 }
];
