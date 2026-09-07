/**
 * Firebrox FPS - Weapon Customization UI
 * Handles weapon customization screen with attachments
 */

/**
 * CustomizationManager - Controls weapon customization UI
 */
export class CustomizationManager {
    constructor(ui, weaponSystem) {
        this.ui = ui;
        this.weaponSystem = weaponSystem;
        
        // Current weapon being customized
        this.currentWeapon = 'assaultRifle';
        
        // Current customization state
        this.customization = {
            optic: 'none',
            barrel: 'none',
            stock: 'none',
            skin: 'default'
        };
        
        this.currentWeaponStats = {
            damage: 35,
            accuracy: 100,
            recoil: 5
        };
    }
    
    /**
     * Show customization for a weapon
     */
    showCustomization(weaponType) {
        this.currentWeapon = weaponType;
        this.loadCustomization(weaponType);
        this.updateStats();
    }
    
    /**
     * Load existing customization
     */
    loadCustomization(weaponType) {
        const saved = this.weaponSystem.getCustomization(weaponType);
        this.customization = { ...saved };
    }
    
    /**
     * Update weapon stats based on customization
     */
    updateStats() {
        const weapon = this.weaponSystem.weapons.find(w => w.type === this.currentWeapon);
        if (weapon) {
            this.currentWeaponStats.damage = weapon.stats.damage;
            this.currentWeaponStats.accuracy = weapon.stats.accuracy;
            this.currentWeaponStats.recoil = weapon.stats.recoil;
        }
    }
    
    /**
     * Apply customization
     */
    applyCustomization() {
        this.weaponSystem.applyCustomization(this.currentWeapon, this.customization);
        this.updateStats();
    }
    
    /**
     * Reset to default
     */
    resetCustomization() {
        const defaults = CONSTANTS.defaultAttachments;
        this.customization = { ...defaults };
        this.updateStats();
    }
    
    /**
     * Get stat bars data for UI
     */
    getStatBars() {
        const maxDamage = 60;
        const maxAccuracy = 100;
        const maxRecoil = 20;
        
        return {
            damage: Math.min(100, (this.currentWeaponStats.damage / maxDamage) * 100),
            accuracy: Math.min(100, this.currentWeaponStats.accuracy),
            recoil: 100 - Math.min(100, (this.currentWeaponStats.recoil / maxRecoil) * 100)
        };
    }
}
