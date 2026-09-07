/**
 * Firebrox FPS - Inventory System
 * Manages player inventory items, grenades, health packs
 */

/**
 * InventoryManager - Handles player inventory
 */
export class InventoryManager {
    constructor(weaponSystem) {
        this.weaponSystem = weaponSystem;
        this.items = {
            grenades: 5,
            healthPacks: 3,
            extraAmmo: true
        };
        
        console.log('[Inventory] Inventory initialized');
    }
    
    /**
     * Get current inventory
     * @returns {object}
     */
    getInventory() {
        return { ...this.items };
    }
    
    /**
     * Add item
     * @param {string} item - Item name
     * @param {number} count - Quantity
     */
    addItem(item, count = 1) {
        if (item in this.items) {
            this.items[item] += count;
        }
    }
    
    /**
     * Remove item
     * @param {string} item - Item name
     * @param {number} count - Quantity
     * @returns {boolean} Success
     */
    removeItem(item, count = 1) {
        if (item in this.items && this.items[item] >= count) {
            this.items[item] -= count;
            return true;
        }
        return false;
    }
    
    /**
     * Use item
     * @param {string} item - Item name
     */
    useItem(item) {
        switch (item) {
            case 'grenade':
                if (this.removeItem('grenades', 1)) {
                    console.log('Used grenade');
                }
                break;
                
            case 'healthPack':
                if (this.removeItem('healthPacks', 1)) {
                    console.log('Used health pack');
                }
                break;
        }
    }
    
    /**
     * Check if item is available
     * @param {string} item - Item name
     * @returns {boolean}
     */
    hasItem(item) {
        return item in this.items && this.items[item] > 0;
    }
    
    /**
     * Equip items to loadout
     * @param {object} selectedItems - Items to equip
     */
    equipItems(selectedItems) {
        this.items.grenades = selectedItems.grenades ? 5 : 0;
        this.items.healthPacks = selectedItems.healthPacks ? 3 : 0;
        this.items.extraAmmo = selectedItems.extraAmmo ? true : false;
    }
}
