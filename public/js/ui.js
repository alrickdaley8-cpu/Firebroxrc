/**
 * Firebrox FPS - UI Manager
 * Handles all UI menus, HUD, and visual elements
 */

class UIManager {
    constructor(network, weaponSystem, camera) {
        this.network = network;
        this.weaponSystem = weaponSystem;
        this.camera = camera;
        
        this.currentMenu = null;
        
        this.setupEventListeners();
    }
    
    /**
     * Show main menu
     */
    showMainMenu() {
        this.hideAllMenus();
        
        const mainMenu = document.getElementById('main-menu');
        mainMenu.classList.remove('hidden');
        this.currentMenu = 'main';
        
        console.log('[UI] Main menu shown');
    }
    
    /**
     * Hide all menus
     */
    hideAllMenus() {
        this.currentMenu = null;
        
        const menuIds = [
            'main-menu', 'settings-menu', 'controls-menu',
            'pause-menu', 'customize-menu', 'loadout-menu',
            'inventory-menu', 'death-screen', 'loading-screen'
        ];
        
        menuIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }
    
    /**
     * Hide specific menu
     */
    hideMenu(menuId) {
        const el = document.getElementById(menuId);
        if (el) el.classList.add('hidden');
    }
    
    /**
     * Show settings menu
     */
    showSettingsMenu() {
        this.hideAllMenus();
        const settingsMenu = document.getElementById('settings-menu');
        settingsMenu.classList.remove('hidden');
        this.currentMenu = 'settings';
        
        this.loadSettingsToForm();
    }
    
    /**
     * Show controls menu
     */
    showControlsMenu() {
        this.hideAllMenus();
        const controlsMenu = document.getElementById('controls-menu');
        controlsMenu.classList.remove('hidden');
        this.currentMenu = 'controls';
    }
    
    /**
     * Show pause menu
     */
    showPauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        pauseMenu.classList.remove('hidden');
    }
    
    /**
     * Hide pause menu
     */
    hidePauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');
    }
    
    /**
     * Show weapon customization menu
     */
    showCustomizeMenu() {
        this.hideAllMenus();
        const customizeMenu = document.getElementById('customize-menu');
        customizeMenu.classList.remove('hidden');
        this.currentMenu = 'customize';
        
        this.populateWeaponList();
        this.loadCurrentCustomization();
    }
    
    /**
     * Show loadout menu
     */
    showLoadoutMenu() {
        this.hideAllMenus();
        const loadoutMenu = document.getElementById('loadout-menu');
        loadoutMenu.classList.remove('hidden');
        this.currentMenu = 'loadout';
        
        this.populateLoadoutMenu();
    }
    
    /**
     * Show inventory menu
     */
    showInventoryMenu() {
        this.hideAllMenus();
        const inventoryMenu = document.getElementById('inventory-menu');
        inventoryMenu.classList.remove('hidden');
        this.currentMenu = 'inventory';
        
        this.populateInventory();
    }
    
    /**
     * Show death screen
     */
    showDeathScreen(kills = 0, deaths = 1) {
        const deathScreen = document.getElementById('death-screen');
        deathScreen.classList.remove('hidden');
        
        const killsEl = document.getElementById('death-kills');
        const deathsEl = document.getElementById('death-deaths');
        
        if (killsEl) killsEl.textContent = kills;
        if (deathsEl) deathsEl.textContent = deaths;
        
        this.currentMenu = 'death';
    }
    
    /**
     * Check if main menu is visible
     */
    isMainMenuVisible() {
        const mainMenu = document.getElementById('main-menu');
        return mainMenu && !mainMenu.classList.contains('hidden');
    }
    
    /**
     * Check if paused
     */
    isPaused() {
        const pauseMenu = document.getElementById('pause-menu');
        return pauseMenu && !pauseMenu.classList.contains('hidden');
    }
    
    /**
     * Populate weapon list in customization menu
     */
    populateWeaponList() {
        const container = document.getElementById('weapon-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        const weaponTypes = Object.keys(CONSTANTS.weapons || {});
        
        weaponTypes.forEach(type => {
            const config = CONSTANTS.weapons[type];
            const div = document.createElement('div');
            div.className = 'weapon-list-item';
            div.dataset.weapon = type;
            
            div.innerHTML = `
                <input type="radio" name="weapon-select" value="${type}">
                <span class="weapon-icon">${config.name.charAt(0)}</span>
                <label>${config.name}</label>
            `;
            
            const radio = div.querySelector('input');
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.selectWeaponForCustomization(type);
                }
            });
            
            container.appendChild(div);
        });
        
        // Select first
        const firstRadio = container.querySelector('input');
        if (firstRadio) {
            firstRadio.checked = true;
            firstRadio.dispatchEvent(new Event('change'));
        }
    }
    
    /**
     * Select weapon for customization
     */
    selectWeaponForCustomization(weaponType) {
        document.querySelectorAll('.weapon-list-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.weapon === weaponType) {
                item.classList.add('selected');
            }
        });
        
        this.loadCurrentCustomization(weaponType);
        this.updateWeaponStats();
    }
    
    /**
     * Load current customization
     */
    loadCurrentCustomization(weaponType) {
        const customization = this.weaponSystem.getCustomization(weaponType);
        
        document.querySelectorAll('input[name="optic"]').forEach(radio => {
            radio.checked = radio.value === (customization.attachments?.optic || 'none');
        });
        
        document.querySelectorAll('input[name="barrel"]').forEach(radio => {
            radio.checked = radio.value === (customization.attachments?.barrel || 'none');
        });
        
        document.querySelectorAll('input[name="stock"]').forEach(radio => {
            radio.checked = radio.value === (customization.attachments?.stock || 'none');
        });
        
        document.querySelectorAll('input[name="skin"]').forEach(radio => {
            radio.checked = radio.value === (customization.attachments?.skin || 'default');
        });
    }
    
    /**
     * Update weapon stats display
     */
    updateWeaponStats() {
        const stats = this.weaponSystem.getCurrentStats();
        if (!stats) return;
        
        const damageBar = document.getElementById('stat-damage');
        const accuracyBar = document.getElementById('stat-accuracy');
        const recoilBar = document.getElementById('stat-recoil');
        const rofBar = document.getElementById('stat-rof');
        
        if (damageBar) damageBar.style.width = '80%';
        if (accuracyBar) accuracyBar.style.width = '75%';
        if (recoilBar) recoilBar.style.width = '40%';
        if (rofBar) rofBar.style.width = '65%';
    }
    
    /**
     * Populate loadout menu
     */
    populateLoadoutMenu() {
        const loadout = this.weaponSystem.getLoadout();
        
        if (loadout) {
            const primarySelect = document.getElementById('primary-weapon-select');
            if (primarySelect) primarySelect.value = loadout.primary || 'rifle';
            
            const secondarySelect = document.getElementById('secondary-weapon-select');
            if (secondarySelect) secondarySelect.value = loadout.secondary || 'pistol';
            
            const meleeSelect = document.getElementById('melee-weapon-select');
            if (meleeSelect) meleeSelect.value = loadout.melee || 'knife';
            
            const grenadesCheck = document.getElementById('equip-grenades');
            if (grenadesCheck) grenadesCheck.checked = loadout.items?.grenades > 0;
            
            const healthCheck = document.getElementById('equip-healthpacks');
            if (healthCheck) healthCheck.checked = loadout.items?.healthPack > 0;
            
            const ammoCheck = document.getElementById('equip-ammo');
            if (ammoCheck) ammoCheck.checked = loadout.items?.extraAmmo;
        }
    }
    
    /**
     * Populate inventory display
     */
    populateInventory() {
        const weaponContainer = document.getElementById('inventory-weapon-list');
        const itemContainer = document.getElementById('inventory-item-list');
        
        if (weaponContainer) {
            weaponContainer.innerHTML = '';
            
            const weapon = this.weaponSystem.currentWeapon;
            if (weapon && weapon.config) {
                const item = document.createElement('div');
                item.className = 'inventory-weapon-item selected';
                item.innerHTML = `
                    <span class="weapon-icon">🔫</span>
                    <div class="weapon-info">
                        <div class="weapon-name">${weapon.config.name}</div>
                        <div class="weapon-type">CURRENT</div>
                    </div>
                    <span class="weapon-rarity rarity-common">COMMON</span>
                `;
                weaponContainer.appendChild(item);
            }
            
            // Add other weapons
            ['pistol', 'knife'].forEach(type => {
                const config = CONSTANTS.weapons[type];
                if (config) {
                    const item = document.createElement('div');
                    item.className = 'inventory-weapon-item';
                    item.innerHTML = `
                        <span class="weapon-icon">🔫</span>
                        <div class="weapon-info">
                            <div class="weapon-name">${config.name}</div>
                            <div class="weapon-type">EQUIPPED</div>
                        </div>
                        <span class="weapon-rarity rarity-common">COMMON</span>
                    `;
                    weaponContainer.appendChild(item);
                }
            });
        }
        
        if (itemContainer) {
            itemContainer.innerHTML = '';
            
            const items = [
                { name: 'Grenades', desc: 'Explosive projectile', qty: this.weaponSystem.inventory.grenades, icon: '💣', equip: this.weaponSystem.inventory.grenades > 0 },
                { name: 'Health Pack', desc: 'Restores 25 HP', qty: this.weaponSystem.inventory.healthPack, icon: '💊', equip: this.weaponSystem.inventory.healthPack > 0 },
                { name: 'Extra Ammo', desc: 'Additional reserves', qty: '∞', icon: '📦', equip: this.weaponSystem.inventory.extraAmmo }
            ];
            
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'inventory-item' + (item.equip ? ' selected' : '');
                div.innerHTML = `
                    <span class="item-icon">${item.icon}</span>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-description">${item.desc}</div>
                    </div>
                    <span class="item-quantity">${item.qty}</span>
                `;
                div.addEventListener('click', () => div.classList.toggle('selected'));
                itemContainer.appendChild(div);
            });
        }
    }
    
    /**
     * Update HUD
     */
    updateHUD() {
        const weapon = this.weaponSystem.currentWeapon;
        if (!weapon || !weapon.config) return;
        
        document.getElementById('weapon-name').textContent = weapon.config.name;
        document.getElementById('ammo-display').textContent = '30 / ' + 
            (this.weaponSystem.inventory.extraAmmo ? '300' : '100');
        document.getElementById('weapon-attachments').textContent = 'OPTIC: NONE';
    }
    
    /**
     * Update players list
     */
    updatePlayersList() {
        this.network.updatePlayersList();
    }
    
    /**
     * Reset players list
     */
    resetPlayerList() {
        this.network.resetPlayerList();
    }
    
    /**
     * Load settings from form
     */
    loadSettingsToForm() {
        document.getElementById('master-volume').value = 80;
        document.getElementById('sfx-volume').value = 90;
        document.getElementById('music-volume').value = 50;
        document.getElementById('mouse-sensitivity').value = 50;
    }
    
    /**
     * Apply settings from form
     */
    applySettingsFromForm() {
        const sensitivity = (document.getElementById('mouse-sensitivity').value / 100) * 0.002;
        if (window.gameInstance) {
            window.gameInstance.settings.sensitivity = sensitivity;
        }
        
        this.showNotification('Settings saved!', 'success');
    }
    
    /**
     * Start game
     */
    startGame() {
        console.log('[UI] Starting game...');
        
        document.getElementById('loading-screen').classList.remove('hidden');
        
        if (window.AudioManager && !window.AudioManager.initialized) {
            window.AudioManager.init();
        }
        
        if (this.network && !this.network.connected) {
            this.network.connect();
        }
        
        setTimeout(() => {
            if (window.gameInstance) {
                window.gameInstance.setSceneMode('playing');
                document.getElementById('loading-screen').classList.add('hidden');
            }
        }, 500);
    }
    
    /**
     * Confirm loadout
     */
    confirmLoadout() {
        const primary = document.getElementById('primary-weapon-select').value;
        const secondary = document.getElementById('secondary-weapon-select').value;
        const melee = document.getElementById('melee-weapon-select').value;
        
        const loadout = {
            primary: primary === 'rifle' ? 'assaultRifle' : primary === 'smg' ? 'smg' : 'shotgun',
            secondary: secondary === 'no-secondary' ? null : 'pistol',
            melee: melee === 'no-melee' ? null : 'knife',
            items: {
                grenades: document.getElementById('equip-grenades').checked ? 5 : 0,
                healthPack: document.getElementById('equip-healthpacks').checked ? 3 : 0,
                extraAmmo: document.getElementById('equip-ammo').checked
            }
        };
        
        this.weaponSystem.setLoadout(loadout);
        this.showNotification('Loadout confirmed!', 'success');
        this.showMainMenu();
    }
    
    /**
     * Set default loadout
     */
    setDefaultLoadout() {
        document.getElementById('primary-weapon-select').value = 'rifle';
        document.getElementById('secondary-weapon-select').value = 'pistol';
        document.getElementById('melee-weapon-select').value = 'knife';
        document.getElementById('equip-grenades').checked = true;
        document.getElementById('equip-healthpacks').checked = true;
        document.getElementById('equip-ammo').checked = true;
    }
    
    /**
     * Apply customization
     */
    applyCustomization() {
        const selectedWeapon = document.querySelector('input[name="weapon-select"]:checked');
        if (!selectedWeapon) {
            this.showNotification('Please select a weapon', 'warning');
            return;
        }
        
        const weaponType = selectedWeapon.value;
        const attachments = {
            optic: document.querySelector('input[name="optic"]:checked')?.value || 'none',
            barrel: document.querySelector('input[name="barrel"]:checked')?.value || 'none',
            stock: document.querySelector('input[name="stock"]:checked')?.value || 'none',
            skin: document.querySelector('input[name="skin"]:checked')?.value || 'default'
        };
        
        this.weaponSystem.applyCustomization(weaponType, attachments);
        this.updateWeaponStats();
        this.showNotification('Customization applied!', 'success');
    }
    
    /**
     * Customize weapon from loadout
     */
    customizeWeapon(slot) {
        const weaponSelect = slot === 'primary' 
            ? document.getElementById('primary-weapon-select') 
            : document.getElementById('secondary-weapon-select');
        
        if (weaponSelect) {
            this.showCustomizeMenu();
            const radio = document.querySelector(`input[name="weapon-select"][value="${weaponSelect.value}"]`);
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `notification ${type} visible`;
        
        setTimeout(() => {
            toast.className = `notification ${type} hidden`;
        }, 3000);
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Main menu
        document.getElementById('btn-play').addEventListener('click', () => this.startGame());
        document.getElementById('btn-customize').addEventListener('click', () => this.showCustomizeMenu());
        document.getElementById('btn-loadout').addEventListener('click', () => this.showLoadoutMenu());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettingsMenu());
        document.getElementById('btn-controls').addEventListener('click', () => this.showControlsMenu());
        document.getElementById('btn-quit').addEventListener('click', () => {
            this.showNotification('Thanks for playing!', 'info');
        });
        
        // Back buttons
        document.getElementById('settings-back').addEventListener('click', () => this.showMainMenu());
        document.getElementById('controls-back').addEventListener('click', () => this.showMainMenu());
        document.getElementById('customize-back').addEventListener('click', () => this.showMainMenu());
        document.getElementById('loadout-back').addEventListener('click', () => this.showMainMenu());
        document.getElementById('inventory-back').addEventListener('click', () => this.showMainMenu());
        
        // Pause menu
        document.getElementById('btn-resume').addEventListener('click', () => {
            if (window.gameInstance) window.gameInstance.togglePause();
        });
        document.getElementById('btn-pause-settings').addEventListener('click', () => this.showSettingsMenu());
        document.getElementById('btn-exit-to-menu').addEventListener('click', () => {
            if (window.gameInstance) window.gameInstance.exitToMainMenu();
        });
        
        // Death screen
        document.getElementById('btn-respawn').addEventListener('click', () => {
            if (window.gameInstance) window.gameInstance.respawnPlayer();
        });
        document.getElementById('btn-spectate').addEventListener('click', () => {
            this.showNotification('Spectating...', 'info');
        });
        document.getElementById('btn-return-menu').addEventListener('click', () => {
            if (window.gameInstance) window.gameInstance.exitToMainMenu();
        });
        
        // Customization
        document.getElementById('btn-apply-attachments').addEventListener('click', () => this.applyCustomization());
        
        // Loadout
        document.getElementById('btn-confirm-loadout').addEventListener('click', () => this.confirmLoadout());
        document.getElementById('btn-default-loadout').addEventListener('click', () => this.setDefaultLoadout());
        document.getElementById('btn-primary-customize').addEventListener('click', () => this.customizeWeapon('primary'));
        document.getElementById('btn-secondary-customize').addEventListener('click', () => this.customizeWeapon('secondary'));
        
        // Settings sliders
        document.getElementById('master-volume').addEventListener('input', (e) => {
            document.getElementById('volume-value').textContent = e.target.value;
        });
        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            document.getElementById('sfx-value').textContent = e.target.value;
        });
        document.getElementById('music-volume').addEventListener('input', (e) => {
            document.getElementById('music-value').textContent = e.target.value;
        });
        document.getElementById('mouse-sensitivity').addEventListener('input', (e) => {
            document.getElementById('sensitivity-value').textContent = e.target.value;
        });
    }
}

export default UIManager;
export { UIManager };
