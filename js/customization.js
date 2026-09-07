/**
 * Firebrox FPS - Weapon Customization
 * Handles weapon attachment selection and stat modification
 */

class WeaponCustomization {
    constructor(weaponSystem, ui) {
        this.weaponSystem = weaponSystem;
        this.ui = ui;
        this.currentWeapon = 'assaultRifle';
        this.customization = { ...CONSTANTS.defaultAttachments };
    }
    
    /**
     * Show customization for a weapon
     */
    showCustomization(weaponType) {
        this.currentWeapon = weaponType;
        this.customization = this.weaponSystem.getCustomization(weaponType);
    }
    
    /**
     * Apply customization
     */
    apply() {
        this.weaponSystem.applyCustomization(this.currentWeapon, this.customization);
        this.ui.updateWeaponStats();
    }
    
    /**
     * Reset to defaults
     */
    reset() {
        this.customization = { ...CONSTANTS.defaultAttachments };
    }
    
    /**
     * Get stat changes
     */
    getStatChanges() {
        let damageChange = 0;
        let accuracyChange = 0;
        let recoilChange = 0;
        
        if (this.customization.optic && this.customization.optic !== 'none') {
            const effects = CONSTANTS.attachments.optics[this.customization.optic];
            if (effects) {
                accuracyChange += effects.accuracy || 0;
                recoilChange += effects.recoil || 0;
            }
        }
        
        if (this.customization.barrel && this.customization.barrel !== 'none') {
            const effects = CONSTANTS.attachments.barrels[this.customization.barrel];
            if (effects) {
                damageChange += effects.damage || 0;
                accuracyChange += effects.accuracy || 0;
                recoilChange += effects.recoil || 0;
            }
        }
        
        if (this.customization.stock && this.customization.stock !== 'none') {
            const effects = CONSTANTS.attachments.stocks[this.customization.stock];
            if (effects) {
                accuracyChange += effects.accuracy || 0;
                recoilChange += effects.recoil || 0;
            }
        }
        
        if (this.customization.skin && this.customization.skin !== 'default') {
            const effects = CONSTANTS.attachments.skins[this.customization.skin];
            if (effects) {
                accuracyChange += effects.accuracy || 0;
                recoilChange += effects.recoil || 0;
            }
        }
        
        return {
            damage: damageChange,
            accuracy: accuracyChange,
            recoil: recoilChange
        };
    }
}

export default WeaponCustomization;
