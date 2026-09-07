/**
 * Firebrox FPS - Weapon System
 * Handles weapon switching, firing, reloading, attachments
 */

class Weapon {
    constructor(type, config, scene, camera) {
        this.type = type;
        this.config = config;
        
        // Stats (modified by attachments)
        this.stats = {
            damage: config.damage,
            range: config.range,
            fireRate: config.fireRate,
            spread: config.spread,
            reloadTime: config.reloadTime,
            magSize: config.magSize || 30,
            reserveAmmo: config.reserveAmmo || 300
        };
        
        // Ammo
        this.ammo = config.magSize || 30;
        this.reserveAmmo = config.reserveAmmo || 300;
        
        // State
        this.isReloading = false;
        this.reloadTimer = 0;
        this.canFire = true;
        this.lastFireTime = 0;
        
        // Scene references
        this.scene = scene;
        this.camera = camera;
        
        // Visual effects
        this.muzzleLight = null;
        this.muzzleFlash = null;
        
        this.createVisualEffects();
    }
    
    createVisualEffects() {
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 5);
        this.scene.add(this.muzzleLight);
        
        this.muzzleFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 })
        );
        this.muzzleFlash.visible = false;
        this.scene.add(this.muzzleFlash);
    }
    
    fire() {
        if (!this.canFire || this.isReloading) {
            return { hit: false };
        }
        
        const now = performance.now();
        if (now - this.lastFireTime < this.stats.fireRate * 1000) {
            return { hit: false };
        }
        
        // Play sound if available
        if (window.AudioManager) {
            window.AudioManager.playGunshot();
        }
        
        this.lastFireTime = now;
        this.ammo--;
        
        // Calculate spread
        const spreadX = (Math.random() - 0.5) * this.stats.spread * 2;
        const spreadY = (Math.random() - 0.5) * this.stats.spread * 2;
        
        // Get fire direction from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        const spreadDir = direction.clone();
        const euler = new THREE.Euler(spreadY, spreadX, 0);
        spreadDir.applyEuler(euler);
        
        // Raycast
        const raycaster = new THREE.Raycaster(
            this.camera.position,
            spreadDir,
            0,
            this.stats.range
        );
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        let hitResult = { hit: false, distance: 0, position: null, damage: this.stats.damage };
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            hitResult.hit = true;
            hitResult.distance = hit.distance;
            hitResult.position = hit.point.clone();
        }
        
        // Muzzle flash
        this.muzzleFlashEffect();
        
        // Check reload
        if (this.ammo <= 0) {
            this.startReload();
        }
        
        return hitResult;
    }
    
    muzzleFlashEffect() {
        this.muzzleLight.intensity = 2;
        this.muzzleLight.position.copy(this.camera.position);
        this.muzzleLight.position.add(
            new THREE.Vector3(0, 0, -0.5).applyQuaternion(this.camera.quaternion)
        );
        
        this.muzzleFlash.visible = true;
        this.muzzleFlash.material.opacity = 1;
        
        const start = performance.now();
        const animate = () => {
            const elapsed = (performance.now() - start) / 1000;
            if (elapsed < 0.2) {
                const fade = 1 - (elapsed / 0.2);
                this.muzzleLight.intensity = fade * 2;
                this.muzzleFlash.material.opacity = fade;
                requestAnimationFrame(animate);
            } else {
                this.muzzleLight.intensity = 0;
                this.muzzleFlash.visible = false;
            }
        };
        animate();
    }
    
    startReload() {
        if (this.isReloading || this.ammo === this.config.magSize) return;
        
        this.isReloading = true;
        this.reloadTimer = this.stats.reloadTime;
        
        if (window.AudioManager) {
            window.AudioManager.playReload();
        }
    }
    
    cancelReload() {
        if (!this.isReloading) return;
        this.isReloading = false;
        this.reloadTimer = 0;
    }
    
    update(delta) {
        if (this.isReloading) {
            this.reloadTimer -= delta;
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }
        
        if (!this.canFire) {
            if (performance.now() - this.lastFireTime > this.stats.fireRate * 1000) {
                this.canFire = true;
            }
        }
    }
    
    finishReload() {
        this.isReloading = false;
        this.ammo = this.config.magSize;
    }
    
    getAmmoDisplay() {
        return `${this.ammo} / ${this.reserveAmmo}`;
    }
    
    applyAttachment(type, attachment) {
        const effects = CONSTANTS.attachments[type];
        if (effects && effects[attachment]) {
            const effect = effects[attachment];
            this.stats.damage = this.stats.damage + (effect.damage || 0);
            this.stats.spread = this.stats.spread + (effect.accuracy ? -effect.accuracy * 0.001 : 0);
        }
    }
}

class WeaponSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.currentWeapon = null;
        
        this.inventory = {
            grenades: 5,
            healthPack: 3,
            extraAmmo: true
        };
        
        this.customizations = {};
        
        this.initDefaultWeapons();
    }
    
    initDefaultWeapons() {
        const rifleConfig = CONSTANTS.weapons.assaultRifle;
        const pistolConfig = CONSTANTS.weapons.pistol;
        const knifeConfig = CONSTANTS.weapons.knife;
        
        // Use simple objects since we don't have three.js imported in this scope
        // The actual Weapon class needs THREE, so we'll use wrapper approach
        this.weapons = [
            { type: 'assaultRifle', config: rifleConfig },
            { type: 'pistol', config: pistolConfig },
            { type: 'knife', config: knifeConfig }
        ];
        
        this.currentWeapon = this.weapons[0];
        
        this.customizations['assaultRifle'] = { ...CONSTANTS.defaultAttachments };
        this.customizations['pistol'] = { ...CONSTANTS.defaultAttachments };
    }
    
    switchToNext() {
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
    }
    
    switchToPrevious() {
        this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
    }
    
    switchToWeapon(key) {
        if (key === '1') this.currentWeaponIndex = 0;
        else if (key === '2') this.currentWeaponIndex = 1;
        else if (key === '3') this.currentWeaponIndex = 2;
        
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
    }
    
    fire() {
        // This would use the actual Weapon class with three.js
        // For now, return a mock result
        return { hit: false };
    }
    
    reload() {
        // Mock reload
        console.log('Reloading...');
    }
    
    useItem(item) {
        switch (item) {
            case 'grenade':
                if (this.inventory.grenades > 0) {
                    this.inventory.grenades--;
                    return true;
                }
                break;
            case 'healthPack':
                if (this.inventory.healthPack > 0) {
                    this.inventory.healthPack--;
                    return true;
                }
                break;
        }
        return false;
    }
    
    getCurrentStats() {
        if (!this.currentWeapon) return null;
        
        return {
            name: this.currentWeapon.config.name,
            ammo: `${30} / ${this.inventory.extraAmmo ? 300 : 100}`,
            attachments: 'None'
        };
    }
    
    applyCustomization(weaponType, attachments) {
        this.customizations[weaponType] = { ...attachments };
        console.log(`Weapon ${weaponType} customized`);
    }
    
    getCustomization(weaponType) {
        return this.customizations[weaponType] || { ...CONSTANTS.defaultAttachments };
    }
    
    getLoadout() {
        return {
            primary: this.weapons[0]?.type || 'assaultRifle',
            secondary: this.weapons[1]?.type || 'pistol',
            melee: this.weapons[2]?.type || 'knife',
            items: { ...this.inventory }
        };
    }
    
    setLoadout(loadout) {
        // Update weapons based on loadout
        if (loadout.primary) {
            this.weapons[0] = { type: loadout.primary, config: CONSTANTS.weapons[loadout.primary] };
        }
        if (loadout.secondary && loadout.secondary !== 'no-secondary') {
            this.weapons[1] = { type: loadout.secondary, config: CONSTANTS.weapons[loadout.secondary] };
        } else {
            this.weapons[1] = null;
        }
        if (loadout.melee && loadout.melee !== 'no-melee') {
            this.weapons[2] = { type: loadout.melee, config: CONSTANTS.weapons[loadout.melee] };
        }
        
        // Update items
        if (loadout.items) {
            Object.assign(this.inventory, loadout.items);
        }
        
        this.currentWeaponIndex = 0;
        this.currentWeapon = this.weapons[0];
    }
}

export default WeaponSystem;
export { Weapon, WeaponSystem };
