/**
 * Firebrox FPS - Weapon System
 * Handles weapon switching, firing, reloading, attachments
 */

import * as THREE from 'three';

/**
 * Weapon class - Individual weapon with its own stats and state
 */
export class Weapon {
    constructor(type, config, scene, camera, player) {
        this.type = type;
        this.config = config;
        
        // Stats (will be modified by attachments)
        this.baseStats = {
            damage: config.damage,
            range: config.range,
            fireRate: config.fireRate,
            spread: config.spread,
            reloadTime: config.reloadTime,
            magSize: config.magSize,
            reserveAmmo: config.reserveAmmo || 300
        };
        
        this.stats = { ...this.baseStats };
        
        // Ammo
        this.ammo = config.magSize;
        this.reserveAmmo = config.reserveAmmo || 300;
        
        // State
        this.isReloading = false;
        this.reloadTimer = 0;
        this.canFire = true;
        this.lastFireTime = 0;
        this.fireCooldown = config.fireRate * 1000;
        
        // Visual effects
        this.muzzleFlash = null;
        this.muzzleLight = null;
        this.recoilAmount = 0;
        
        // Scene references
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        
        // Create muzzle flash effect
        this.createMuzzleFlash();
        
        console.log(`Weapon ${type} initialized: ${config.name}`);
    }
    
    /**
     * Create muzzle flash light
     */
    createMuzzleFlash() {
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 5);
        this.scene.add(this.muzzleLight);
        
        this.muzzleFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 })
        );
        this.muzzleFlash.visible = false;
        this.scene.add(this.muzzleFlash);
    }
    
    /**
     * Fire the weapon
     * @returns {object} Hit information
     */
    fire() {
        if (!this.canFire || this.isReloading) {
            return { hit: false };
        }
        
        const now = performance.now();
        if (now - this.lastFireTime < this.fireCooldown) {
            return { hit: false };
        }
        
        // Play sound
        if (window.AudioManager) {
            window.AudioManager.playGunshot();
        }
        
        this.lastFireTime = now;
        this.ammo--;
        
        // Calculate spread
        const spreadX = (Math.random() - 0.5) * this.stats.spread * 2;
        const spreadY = (Math.random() - 0.5) * this.stats.spread * 2;
        const spread = new THREE.Euler(spreadY, spreadX, 0);
        
        // Get fire direction from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Apply spread
        const spreadDirection = direction.clone().applyEuler(spread);
        
        // Raycast for hit detection
        const raycaster = new THREE.Raycaster(
            this.camera.position,
            spreadDirection,
            0,
            this.stats.range
        );
        
        // Check all objects in scene
        const meshes = [];
        this.scene.traverse((object) => {
            if (object.isMesh) {
                meshes.push(object);
            }
        });
        
        const intersects = raycaster.intersectObjects(meshes, false);
        
        let hitResult = {
            hit: false,
            distance: 0,
            position: null,
            normal: null,
            object: null,
            damage: this.stats.damage
        };
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            hitResult.hit = true;
            hitResult.distance = hit.distance;
            hitResult.position = hit.point.clone();
            hitResult.normal = hit.face.normal.clone();
            hitResult.object = hit.object;
        }
        
        // Muzzle flash effect
        this.muzzleFlash(0.3, 0);
        
        // Apply recoil
        this.applyRecoil();
        
        // Check for reload
        if (this.ammo <= 0) {
            this.startReload();
        }
        
        return hitResult;
    }
    
    /**
     * Apply muzzle flash visual
     */
    muzzleFlash(duration, intensity = 0.5) {
        this.muzzleLight.intensity = 2;
        this.muzzleLight.position.copy(this.camera.position);
        this.muzzleLight.position.add(
            new THREE.Vector3(0, 0, -0.5).applyQuaternion(this.camera.quaternion)
        );
        
        this.muzzleFlash.visible = true;
        this.muzzleFlash.material.opacity = 1;
        
        // Animate flash
        const startTime = performance.now();
        const animateFlash = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed < duration) {
                const fade = 1 - (elapsed / duration);
                this.muzzleLight.intensity = fade * 2;
                this.muzzleFlash.material.opacity = fade;
                this.muzzleFlash.scale.setScalar(1 + fade * 2);
                requestAnimationFrame(animateFlash);
            } else {
                this.muzzleLight.intensity = 0;
                this.muzzleFlash.visible = false;
            }
        };
        animateFlash();
    }
    
    /**
     * Apply recoil animation
     */
    applyRecoil() {
        this.recoilAmount = -0.1;
        this.camera.position.y -= 0.05;
    }
    
    /**
     * Start reload
     */
    startReload() {
        if (this.isReloading || this.ammo === this.config.magSize) {
            return;
        }
        
        this.isReloading = true;
        this.reloadTimer = this.stats.reloadTime;
        
        // Play reload sound
        if (window.AudioManager) {
            window.AudioManager.playReload();
        }
    }
    
    /**
     * Cancel reload
     */
    cancelReload() {
        if (!this.isReloading) return;
        
        this.isReloading = false;
        this.reloadTimer = 0;
    }
    
    /**
     * Update reload progress
     * @param {number} delta - Delta time
     */
    update(delta) {
        if (this.isReloading) {
            this.reloadTimer -= delta;
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }
        
        // Recover fire capability
        if (!this.canFire) {
            const now = performance.now();
            if (now - this.lastFireTime > this.fireCooldown) {
                this.canFire = true;
            }
        }
        
        // Recoil recovery
        if (this.recoilAmount !== 0) {
            this.camera.position.y += 0.02;
            this.recoilAmount += 0.02;
            if (this.recoilAmount > 0) {
                this.recoilAmount = 0;
            }
        }
    }
    
    /**
     * Finish reload
     */
    finishReload() {
        this.isReloading = false;
        this.ammo = this.config.magSize;
        console.log('Reload complete');
    }
    
    /**
     * Get ammo display string
     */
    getAmmoDisplay() {
        return `${this.ammo} / ${this.reserveAmmo}`;
    }
    
    /**
     * Apply attachment effects to weapon stats
     */
    applyAttachment(type, attachment) {
        const effects = CONSTANTS.attachments[type];
        if (effects && effects[attachment]) {
            const effect = effects[attachment];
            
            // Modify stats based on attachment
            this.stats.damage = this.baseStats.damage + (effect.damage || 0);
            this.stats.accuracy = (this.stats.accuracy || 100) + (effect.accuracy || 0);
            this.stats.recoil = (this.stats.recoil || 5) + (effect.recoil || 0);
            
            console.log(`Applied ${type}: ${attachment}`);
        }
    }
    
    /**
     * Reset weapon to base stats
     */
    reset() {
        this.stats = { ...this.baseStats };
        this.ammo = this.config.magSize;
        this.reserveAmmo = this.config.reserveAmmo || 300;
        this.isReloading = false;
        this.canFire = true;
        this.cancelReload();
    }
}

/**
 * Weapon System - Manages all weapons
 */
export class WeaponSystem {
    constructor(scene, camera, player) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.currentWeapon = null;
        
        // Items
        this.inventory = {
            grenades: 5,
            healthPack: 3,
            extraAmmo: true
        };
        
        // Customization
        this.customizations = {};
        
        this.initDefaultWeapons();
        console.log('Weapon system initialized');
    }
    
    /**
     * Initialize default weapon loadout
     */
    initDefaultWeapons() {
        // Create weapons
        const rifleConfig = CONSTANTS.weapons.assaultRifle;
        const pistolConfig = CONSTANTS.weapons.pistol;
        const knifeConfig = CONSTANTS.weapons.knife;
        
        const rifle = new Weapon('assaultRifle', rifleConfig, this.scene, this.camera, this.player);
        const pistol = new Weapon('pistol', pistolConfig, this.scene, this.camera, this.player);
        const knife = new Weapon('knife', knifeConfig, this.scene, this.camera, this.player);
        
        this.weapons = [rifle, pistol, knife];
        this.currentWeapon = rifle;
        
        // Default attachments
        this.customizations['assaultRifle'] = { ...CONSTANTS.defaultAttachments };
        this.customizations['pistol'] = { ...CONSTANTS.defaultAttachments };
        this.customizations['knife'] = { skin: 'default' };
    }
    
    /**
     * Switch to next weapon (scroll wheel)
     */
    switchToNext() {
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
        this.currentWeapon.cancelReload();
        console.log(`Weapon switched to: ${this.currentWeapon.config.name}`);
    }
    
    /**
     * Switch to previous weapon
     */
    switchToPrevious() {
        this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
        this.currentWeapon.cancelReload();
        console.log(`Weapon switched to: ${this.currentWeapon.config.name}`);
    }
    
    /**
     * Switch to specific weapon by key (1, 2, 3)
     */
    switchToWeapon(key) {
        if (key === '1') {
            this.currentWeaponIndex = 0;
        } else if (key === '2') {
            this.currentWeaponIndex = 1;
        } else if (key === '3') {
            this.currentWeaponIndex = 2;
        }
        
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
        this.currentWeapon.cancelReload();
        console.log(`Weapon switched to: ${this.currentWeapon.config.name} (key ${key})`);
    }
    
    /**
     * Fire current weapon
     * @returns {object} Hit result
     */
    fire() {
        if (this.currentWeapon) {
            return this.currentWeapon.fire();
        }
        return { hit: false };
    }
    
    /**
     * Reload current weapon
     */
    reload() {
        if (this.currentWeapon) {
            this.currentWeapon.startReload();
        }
    }
    
    /**
     * Update weapons
     * @param {number} delta - Delta time
     */
    update(delta) {
        if (this.currentWeapon) {
            this.currentWeapon.update(delta);
        }
    }
    
    /**
     * Use item from inventory
     * @param {string} item - Item name
     */
    useItem(item) {
        switch (item) {
            case 'grenade':
                if (this.inventory.grenades > 0) {
                    this.inventory.grenades--;
                    console.log('Grenade thrown!');
                    return true;
                }
                break;
                
            case 'healthPack':
                if (this.inventory.healthPack > 0) {
                    this.inventory.healthPack--;
                    this.player.heal(25);
                    console.log('Health pack used, healed 25 HP');
                    return true;
                }
                break;
                
            case 'ammo':
                if (this.inventory.extraAmmo) {
                    if (this.currentWeapon) {
                        const needed = this.currentWeapon.config.magSize - this.currentWeapon.ammo;
                        if (needed > 0 && this.currentWeapon.reserveAmmo >= needed) {
                            this.currentWeapon.ammo += needed;
                            this.currentWeapon.reserveAmmo -= needed;
                            console.log(`Resupplied ${needed} ammo`);
                            return true;
                        }
                    }
                }
                break;
        }
        
        return false;
    }
    
    /**
     * Get current weapon stats (for HUD)
     */
    getCurrentStats() {
        if (!this.currentWeapon) return null;
        
        return {
            name: this.currentWeapon.config.name,
            ammo: `${this.currentWeapon.ammo} / ${this.currentWeapon.reserveAmmo}`,
            // Simplified attachments display
            attachments: Object.values(this.customizations[this.currentWeapon.type] || {})
                .filter(v => v !== 'none')
                .join(', ') || 'None'
        };
    }
    
    /**
     * Apply weapon customization
     */
    applyCustomization(weaponType, attachments) {
        const weapon = this.weapons.find(w => w.type === weaponType);
        if (weapon) {
            for (const [type, attachment] of Object.entries(attachments)) {
                weapon.applyAttachment(type, attachment);
            }
            this.customizations[weaponType] = { ...attachments };
            console.log(`Weapon ${weaponType} customized`);
        }
    }
    
    /**
     * Get customization for weapon
     */
    getCustomization(weaponType) {
        return this.customizations[weaponType] || { ...CONSTANTS.defaultAttachments };
    }
}

export default WeaponSystem;
