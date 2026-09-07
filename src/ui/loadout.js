/**
 * Firebrox FPS - Loadout System
 * Manages player weapon loadout selection with attachments
 */

/**
 * LoadoutSystem class - Handles weapon loadout configuration
 */
export class LoadoutSystem {
    constructor(weaponSystem, ui) {
        this.weaponSystem = weaponSystem;
        this.ui = ui;
        
        // User's saved loadout
        this.savedLoadout = null;
        this.currentLoadout = null;
        
        // Load saved loadout
        this.loadSavedLoadout();
        
        console.log('[Loadout] Loadout system initialized');
    }
    
    /**
     * Load saved loadout from localStorage
     */
    loadSavedLoadout() {
        try {
            const saved = localStorage.getItem('firebrox-loadout');
            if (saved) {
                this.savedLoadout = JSON.parse(saved);
                this.currentLoadout = this.savedLoadout;
                
                // Apply loadout to weapon system
                this.weaponSystem.setLoadout(this.savedLoadout);
                
                console.log('[Loadout] Loaded saved loadout');
            }
        } catch (error) {
            console.warn('[Loadout] Failed to load saved loadout:', error);
        }
        
        // If no saved loadout, create default
        if (!this.savedLoadout) {
            this.setDefaultLoadout();
        }
    }
    
    /**
     * Save current loadout
     */
    saveLoadout() {
        try {
            const loadout = this.getCurrentLoadout();
            localStorage.setItem('firebrox-loadout', JSON.stringify(loadout));
            this.savedLoadout = loadout;
            
            console.log('[Loadout] Loadout saved');
        } catch (error) {
            console.warn('[Loadout] Failed to save loadout:', error);
        }
    }
    
    /**
     * Set loadout
     * @param {object} loadout - Loadout configuration
     */
    setLoadout(loadout) {
        this.currentLoadout = loadout;
        this.weaponSystem.setLoadout(loadout);
    }
    
    /**
     * Get current loadout
     * @returns {object}
     */
    getCurrentLoadout() {
        if (this.weaponSystem) {
            return this.weaponSystem.getLoadout();
        }
        
        return {
            primary: this.currentLoadout?.primary || 'assault-rifle',
            secondary: this.currentLoadout?.secondary || 'pistol',
            melee: this.currentLoadout?.melee || 'knife',
            items: { ...this.currentLoadout?.items }
        };
    }
    
    /**
     * Set primary weapon
     * @param {string} weaponType - Weapon type
     */
    setPrimaryWeapon(weaponType) {
        if (this.currentLoadout) {
            this.currentLoadout.primary = weaponType;
            this.saveLoadout();
        }
        
        this.weaponSystem.switchWeapon(weaponType);
    }
    
    /**
     * Set secondary weapon
     * @param {string} weaponType - Weapon type
     */
    setSecondaryWeapon(weaponType) {
        if (this.currentLoadout) {
            this.currentLoadout.secondary = weaponType;
            this.saveLoadout();
        }
    }
    
    /**
     * Set melee weapon
     * @param {string} weaponType - Weapon type
     */
    setMeleeWeapon(weaponType) {
        if (this.currentLoadout) {
            this.currentLoadout.melee = weaponType;
            this.saveLoadout();
        }
    }
    
    /**
     * Set loadout items
     * @param {object} items - Items configuration
     */
    setItems(items) {
        if (this.currentLoadout) {
            this.currentLoadout.items = { ...this.currentLoadout.items, ...items };
            this.saveLoadout();
        }
        
        // Update weapon system items
        this.weaponSystem.items = {
            ...this.weaponSystem.items,
            ...items
        };
    }
    
    /**
     * Set default loadout
     */
    setDefaultLoadout() {
        const defaultLoadout = {
            primary: 'assault-rifle',
            secondary: 'pistol',
            melee: 'knife',
            items: {
                grenades: 5,
                healthPacks: 3,
                extraAmmo: true
            }
        };
        
        this.currentLoadout = defaultLoadout;
        this.savedLoadout = defaultLoadout;
        
        this.weaponSystem.setLoadout(defaultLoadout);
        this.saveLoadout();
        
        console.log('[Loadout] Default loadout set');
    }
    
    /**
     * Apply loadout customization
     * @param {string} weaponType - Weapon to customize
     * @param {object} attachments - Attachment configuration
     */
    applyCustomization(weaponType, attachments) {
        this.weaponSystem.applyCustomization(weaponType, attachments);
        
        // Update saved loadout with customization
        if (this.savedLoadout && this.savedLoadout.attachments) {
            if (!this.savedLoadout.attachments[weaponType]) {
                this.savedLoadout.attachments[weaponType] = {};
            }
            this.savedLoadout.attachments[weaponType] = {
                ...this.savedLoadout.attachments[weaponType],
                ...attachments
            };
            this.saveLoadout();
        }
    }
    
    /**
     * Reset customization
     * @param {string} weaponType - Weapon to reset
     */
    resetCustomization(weaponType) {
        this.weaponSystem.applyCustomization(weaponType, CONSTANTS.defaultAttachments);
        
        if (this.savedLoadout?.attachments?.[weaponType]) {
            delete this.savedLoadout.attachments[weaponType];
            this.saveLoadout();
        }
    }
    
    /**
     * Get weapon customization state
     * @param {string} weaponType - Weapon type
     * @returns {object}
     */
    getCustomization(weaponType) {
        return this.weaponSystem.getCustomization(weaponType);
    }
    
    /**
     * Reset to default loadout
     */
    resetLoadout() {
        this.setDefaultLoadout();
        this.ui.showNotification('Loadout reset to defaults', 'info');
    }
    
    /**
     * Load loadout from form
     * @param {HTMLFormElement} form - Loadout form element
     */
    loadFromForm(form) {
        const primary = form.querySelector('#primary-weapon-select').value;
        const secondary = form.querySelector('#secondary-weapon-select').value;
        const melee = form.querySelector('#melee-weapon-select').value;
        
        const items = {
            grenades: form.querySelector('#equip-grenades').checked ? 5 : 0,
            healthPacks: form.querySelector('#equip-healthpacks').checked ? 3 : 0,
            extraAmmo: form.querySelector('#equip-ammo').checked
        };
        
        this.setLoadout({
            primary,
            secondary,
            melee,
            items
        });
        
        console.log('[Loadout] Loadout loaded from form');
    }
}
