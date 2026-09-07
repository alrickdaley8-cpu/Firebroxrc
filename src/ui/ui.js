/**
 * Firebrox FPS - UI Manager
 * Handles all UI menus, HUD, and visual elements
 */

/**
 * UIManager class - Central UI controller
 */
export class UIManager {
    constructor(network, weaponSystem, camera) {
        this.network = network;
        this.weaponSystem = weaponSystem;
        this.camera = camera;
        
        this.currentMenu = null;
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('[UI] UI manager initialized');
    }
    
    /**
     * Show main menu
     */
    showMainMenu() {
        this.hideAllMenus();
        
        const mainMenu = document.getElementById('main-menu');
        mainMenu.classList.remove('hidden');
        this.currentMenu = 'main';
        
        // Start menu background animation if needed
        this.startMenuBackground();
        
        console.log('[UI] Main menu shown');
    }
    
    /**
     * Hide all menus
     */
    hideAllMenus() {
        this.currentMenu = null;
        
        const menus = [
            'main-menu',
            'settings-menu',
            'controls-menu',
            'pause-menu',
            'customize-menu',
            'loadout-menu',
            'inventory-menu',
            'death-screen',
            'loading-screen'
        ];
        
        menus.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        
        // Also hide HUD if needed
        // document.getElementById('hud')?.classList.add('hidden');
    }
    
    /**
     * Hide specific menu
     * @param {string} menuId - Menu identifier
     */
    hideMenu(menuId) {
        const el = document.getElementById(menuId);
        if (el) {
            el.classList.add('hidden');
        }
    }
    
    /**
     * Show settings menu
     */
    showSettingsMenu() {
        this.hideAllMenus();
        
        const settingsMenu = document.getElementById('settings-menu');
        settingsMenu.classList.remove('hidden');
        this.currentMenu = 'settings';
        
        // Load current values into form
        this.loadSettingsToForm();
        
        console.log('[UI] Settings menu shown');
    }
    
    /**
     * Show controls menu
     */
    showControlsMenu() {
        this.hideAllMenus();
        
        const controlsMenu = document.getElementById('controls-menu');
        controlsMenu.classList.remove('hidden');
        this.currentMenu = 'controls';
        
        console.log('[UI] Controls menu shown');
    }
    
    /**
     * Show pause menu
     */
    showPauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        pauseMenu.classList.remove('hidden');
        
        // Show pause overlay on HUD
        // Could add pause overlay here
        
        console.log('[UI] Pause menu shown');
    }
    
    /**
     * Hide pause menu
     */
    hidePauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.classList.add('hidden');
        }
        
        console.log('[UI] Pause menu hidden');
    }
    
    /**
     * Check if main menu is visible
     * @returns {boolean}
     */
    isMainMenuVisible() {
        const mainMenu = document.getElementById('main-menu');
        return !mainMenu.classList.contains('hidden');
    }
    
    /**
     * Check if paused
     * @returns {boolean}
     */
    isPaused() {
        const pauseMenu = document.getElementById('pause-menu');
        return !pauseMenu.classList.contains('hidden');
    }
    
    /**
     * Show weapon customization menu
     */
    showCustomizeMenu() {
        this.hideAllMenus();
        
        const customizeMenu = document.getElementById('customize-menu');
        customizeMenu.classList.remove('hidden');
        this.currentMenu = 'customize';
        
        // Populate weapon list
        this.populateWeaponList();
        
        // Set initial customization state
        this.loadCurrentCustomization();
        
        console.log('[UI] Customize menu shown');
    }
    
    /**
     * Show loadout menu
     */
    showLoadoutMenu() {
        this.hideAllMenus();
        
        const loadoutMenu = document.getElementById('loadout-menu');
        loadoutMenu.classList.remove('hidden');
        this.currentMenu = 'loadout';
        
        // Populate loadout options
        this.populateLoadoutMenu();
        
        console.log('[UI] Loadout menu shown');
    }
    
    /**
     * Show inventory menu
     */
    showInventoryMenu() {
        this.hideAllMenus();
        
        const inventoryMenu = document.getElementById('inventory-menu');
        inventoryMenu.classList.remove('hidden');
        this.currentMenu = 'inventory';
        
        // Populate inventory display
        this.populateInventory();
        
        console.log('[UI] Inventory menu shown');
    }
    
    /**
     * Show death screen
     */
    showDeathScreen(kills = 0, deaths = 1) {
        const deathScreen = document.getElementById('death-screen');
        deathScreen.classList.remove('hidden');
        
        // Update death stats
        const killsEl = document.getElementById('death-kills');
        const deathsEl = document.getElementById('death-deaths');
        
        if (killsEl) killsEl.textContent = kills;
        if (deathsEl) deathsEl.textContent = deaths;
        
        this.currentMenu = 'death';
        
        // Stop game loop if running
        if (window.gameInstance) {
            window.gameInstance.stop();
        }
        
        console.log('[UI] Death screen shown');
    }
    
    /**
     * Populate weapon list in customization menu
     */
    populateWeaponList() {
        const container = document.getElementById('weapon-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Available weapons for customization
        const weaponTypes = Object.keys(CONSTANTS.WEAPON_CONFIGS || {});
        
        weaponTypes.forEach(type => {
            const config = CONSTANTS.WEAPON_CONFIGS[type];
            const div = document.createElement('div');
            div.className = 'weapon-list-item';
            div.dataset.weapon = type;
            
            div.innerHTML = `
                <input type="radio" name="weapon-select" value="${type}">
                <span class="weapon-icon">${config.name.charAt(0)}</span>
                <label>${config.name}</label>
            `;
            
            // Event listener
            const radio = div.querySelector('input');
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.selectWeaponForCustomization(type);
                }
            });
            
            container.appendChild(div);
        });
        
        // Select first weapon by default
        const firstRadio = container.querySelector('input');
        if (firstRadio) {
            firstRadio.checked = true;
            firstRadio.dispatchEvent(new Event('change'));
        }
    }
    
    /**
     * Select weapon for customization
     * @param {string} weaponType - Weapon type
     */
    selectWeaponForCustomization(weaponType) {
        // Update UI to highlight selected weapon
        document.querySelectorAll('.weapon-list-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.weapon === weaponType) {
                item.classList.add('selected');
            }
        });
        
        // Load current customization state
        this.loadCurrentCustomization(weaponType);
        
        // Update weapon preview and stats
        this.updateWeaponStats();
        
        console.log('[UI] Selected weapon for customization:', weaponType);
    }
    
    /**
     * Load current customization state
     * @param {string} weaponType - Optional weapon type
     */
    loadCurrentCustomization(weaponType) {
        // Get customization from weapon system or defaults
        let customization;
        
        if (weaponType) {
            customization = this.weaponSystem.getCustomization(weaponType);
        } else {
            customization = CONSTANTS.defaultAttachments;
        }
        
        // Set radio buttons
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
        const stats = this.weaponSystem.getWeaponStats();
        if (!stats) return;
        
        // Update stat bars
        const damageBar = document.getElementById('stat-damage');
        const accuracyBar = document.getElementById('stat-accuracy');
        const recoilBar = document.getElementById('stat-recoil');
        const rofBar = document.getElementById('stat-rof');
        
        if (damageBar) {
            const damage = Math.min(100, (stats.damage / 55) * 100);
            damageBar.style.width = `${damage}%`;
            document.getElementById('stat-damage-value').textContent = stats.damage.toFixed(0);
        }
        
        if (accuracyBar) {
            const accuracy = Math.min(100, stats.accuracy);
            accuracyBar.style.width = `${accuracy}%`;
            document.getElementById('stat-accuracy-value').textContent = accuracy.toFixed(0);
        }
        
        if (recoilBar) {
            const recoil = Math.min(100, stats.recoil);
            recoilBar.style.width = `${recoil}%`;
            document.getElementById('stat-recoil-value').textContent = recoil.toFixed(0);
        }
        
        if (rofBar) {
            const rof = Math.min(100, (stats.fireRate / 0.06) * 100);
            rofBar.style.width = `${rof}%`;
            document.getElementById('stat-rof-value').textContent = (1 / stats.fireRate).toFixed(0) + ' RPM';
        }
    }
    
    /**
     * Populate loadout menu
     */
    populateLoadoutMenu() {
        // Load current loadout into form
        const loadout = this.weaponSystem.getLoadout();
        
        if (loadout) {
            document.getElementById('primary-weapon-select').value = loadout.primary || 'assault-rifle';
            document.getElementById('secondary-weapon-select').value = loadout.secondary || 'pistol';
            document.getElementById('melee-weapon-select').value = loadout.melee || 'knife';
            
            document.getElementById('equip-grenades').checked = loadout.items?.grenades > 0;
            document.getElementById('equip-healthpacks').checked = loadout.items?.healthPacks > 0;
            document.getElementById('equip-ammo').checked = loadout.items?.extraAmmo;
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
            
            // Get current weapon
            const weapon = this.weaponSystem.getCurrentWeapon();
            const weaponType = this.weaponSystem.getCurrentWeaponType();
            const config = CONSTANTS.WEAPON_CONFIGS[weaponType];
            
            if (config) {
                const item = document.createElement('div');
                item.className = 'inventory-weapon-item selected';
                item.innerHTML = `
                    <span class="weapon-icon">🔫</span>
                    <div class="weapon-info">
                        <div class="weapon-name">${config.name}</div>
                        <div class="weapon-type">PRIMARY</div>
                    </div>
                    <span class="weapon-rarity rarity-common">COMMON</span>
                `;
                weaponContainer.appendChild(item);
            }
            
            // Add other equipped weapons
            const otherWeapons = ['pistol', 'knife'];
            otherWeapons.forEach(type => {
                const cfg = CONSTANTS.WEAPON_CONFIGS[type];
                if (cfg && this.weaponSystem.weapons.has(type)) {
                    const w = this.weaponSystem.weapons.get(type);
                    if (w && w.ammo > 0) {
                        const item = document.createElement('div');
                        item.className = 'inventory-weapon-item';
                        item.innerHTML = `
                            <span class="weapon-icon">🔫</span>
                            <div class="weapon-info">
                                <div class="weapon-name">${cfg.name}</div>
                                <div class="weapon-type">${type === 'pistol' ? 'SECONDARY' : 'MELEE'}</div>
                            </div>
                            <span class="weapon-rarity rarity-common">COMMON</span>
                        `;
                        weaponContainer.appendChild(item);
                    }
                }
            });
        }
        
        if (itemContainer) {
            itemContainer.innerHTML = '';
            
            // Add items
            const items = [
                {
                    name: 'Grenades',
                    description: 'Explosive projectile',
                    quantity: this.weaponSystem.items?.grenades || 5,
                    icon: '💣',
                    equipped: this.weaponSystem.items?.grenades > 0
                },
                {
                    name: 'Health Pack',
                    description: 'Restores 25 HP',
                    quantity: this.weaponSystem.items?.healthPacks || 3,
                    icon: '💊',
                    equipped: this.weaponSystem.items?.healthPacks > 0
                },
                {
                    name: 'Extra Ammo',
                    description: 'Additional reserves',
                    quantity: this.weaponSystem.items?.extraAmmo ? 'Unlimited' : 0,
                    icon: '📦',
                    equipped: this.weaponSystem.items?.extraAmmo
                }
            ];
            
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'inventory-item';
                if (item.equipped) div.classList.add('selected');
                
                div.innerHTML = `
                    <span class="item-icon">${item.icon}</span>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-description">${item.description}</div>
                    </div>
                    <span class="item-quantity">${item.quantity}</span>
                `;
                
                // Toggle item
                div.addEventListener('click', () => {
                    div.classList.toggle('selected');
                });
                
                itemContainer.appendChild(div);
            });
        }
    }
    
    /**
     * Update HUD
     */
    updateHUD() {
        if (this.weaponSystem) {
            this.weaponSystem.updateHUD();
        }
    }
    
    /**
     * Update player list display
     */
    updatePlayersList() {
        this.network.updatePlayersList();
    }
    
    /**
     * Reset player list
     */
    resetPlayerList() {
        this.network.resetPlayerList();
    }
    
    /**
     * Load settings from form
     */
    loadSettingsToForm() {
        if (!window.gameInstance) return;
        
        const settings = window.gameInstance.getSettings();
        
        // Graphics quality
        const qualitySelect = document.getElementById('graphics-quality');
        if (qualitySelect) qualitySelect.value = settings.graphicsQuality || 'medium';
        
        // Shadow resolution (not in the HTML but could be added)
        // For now, just use defaults
        
        // Audio sliders
        document.getElementById('master-volume').value = settings.volume * 100;
        this.updateSliderDisplay('volume-value', settings.volume * 100);
        
        document.getElementById('sfx-volume').value = settings.sfxVolume * 100;
        this.updateSliderDisplay('sfx-value', settings.sfxVolume * 100);
        
        document.getElementById('music-volume').value = settings.musicVolume * 100;
        this.updateSliderDisplay('music-value', settings.musicVolume * 100);
        
        // Mouse sensitivity
        document.getElementById('mouse-sensitivity').value = settings.sensitivity * 50; // Scale to 0-50
        this.updateSliderDisplay('sensitivity-value', settings.sensitivity * 50);
    }
    
    /**
     * Update slider display value
     * @param {string} id - Display element ID
     * @param {number} value - Value to display
     */
    updateSliderDisplay(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = Math.round(value);
    }
    
    /**
     * Apply settings from form
     */
    applySettingsFromForm() {
        if (!window.gameInstance) return;
        
        const settings = {
            sensitivity: (document.getElementById('mouse-sensitivity').value / 50) * 0.002,
            volume: document.getElementById('master-volume').value / 100,
            sfxVolume: document.getElementById('sfx-volume').value / 100,
            musicVolume: document.getElementById('music-volume').value / 100,
            graphicsQuality: document.getElementById('graphics-quality').value,
        };
        
        // Update graphics quality
        if (settings.graphicsQuality === 'low') {
            settings.shadowsEnabled = false;
        } else {
            settings.shadowsEnabled = true;
        }
        
        // Apply to game
        window.gameInstance.updateSettings(settings);
        
        // Update audio
        if (window.AudioManager) {
            window.AudioManager.updateVolumes({
                master: settings.volume,
                sfx: settings.sfxVolume,
                music: settings.musicVolume
            });
        }
        
        // Update camera FOV based on sensitivity
        // (sensitivity is handled in game loop)
        
        console.log('[UI] Settings applied');
        
        // Show confirmation
        this.showNotification('Settings saved!', 'success');
    }
    
    /**
     * Start menu background animation
     */
    startMenuBackground() {
        const container = document.getElementById('menu-background');
        if (!container) return;
        
        // Simple CSS animation for menu background
        // Could be enhanced with Three.js scene
    }
    
    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - 'success', 'error', 'warning', 'info'
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
        // Main menu buttons
        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('btn-customize')?.addEventListener('click', () => {
            this.showCustomizeMenu();
        });
        
        document.getElementById('btn-loadout')?.addEventListener('click', () => {
            this.showLoadoutMenu();
        });
        
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.showSettingsMenu();
        });
        
        document.getElementById('btn-controls')?.addEventListener('click', () => {
            this.showControlsMenu();
        });
        
        document.getElementById('btn-quit')?.addEventListener('click', () => {
            this.showNotification('Thanks for playing!', 'info');
            // Could redirect or show credits
        });
        
        // Back buttons
        document.getElementById('settings-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('controls-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('customize-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('loadout-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('inventory-back')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // Pause menu buttons
        document.getElementById('btn-resume')?.addEventListener('click', () => {
            if (window.gameInstance) {
                window.gameInstance.togglePause();
            }
        });
        
        document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
            this.showSettingsMenu();
        });
        
        document.getElementById('btn-exit-to-menu')?.addEventListener('click', () => {
            if (window.gameInstance) {
                window.gameInstance.exitToMainMenu();
            }
        });
        
        // Settings apply
        document.getElementById('btn-apply-attachments')?.addEventListener('click', () => {
            this.applyCustomization();
        });
        
        // Death screen buttons
        document.getElementById('btn-respawn')?.addEventListener('click', () => {
            if (window.gameInstance) {
                window.gameInstance.respawnPlayer();
            }
        });
        
        document.getElementById('btn-spectate')?.addEventListener('click', () => {
            this.showNotification('Spectating...', 'info');
        });
        
        document.getElementById('btn-return-menu')?.addEventListener('click', () => {
            if (window.gameInstance) {
                window.gameInstance.exitToMainMenu();
            }
        });
        
        // Loadout buttons
        document.getElementById('btn-confirm-loadout')?.addEventListener('click', () => {
            this.confirmLoadout();
        });
        
        document.getElementById('btn-default-loadout')?.addEventListener('click', () => {
            this.setDefaultLoadout();
        });
        
        document.getElementById('btn-primary-customize')?.addEventListener('click', () => {
            this.customizeWeapon('primary');
        });
        
        document.getElementById('btn-secondary-customize')?.addEventListener('click', () => {
            this.customizeWeapon('secondary');
        });
        
        // Settings menu sliders
        document.getElementById('master-volume')?.addEventListener('input', (e) => {
            this.updateSliderDisplay('volume-value', e.target.value);
        });
        
        document.getElementById('sfx-volume')?.addEventListener('input', (e) => {
            this.updateSliderDisplay('sfx-value', e.target.value);
        });
        
        document.getElementById('music-volume')?.addEventListener('input', (e) => {
            this.updateSliderDisplay('music-value', e.target.value);
        });
        
        document.getElementById('mouse-sensitivity')?.addEventListener('input', (e) => {
            this.updateSliderDisplay('sensitivity-value', e.target.value);
        });
        
        // Settings apply button
        document.getElementById('settings-menu')?.addEventListener('change', (e) => {
            // Auto-apply or wait for submit
        });
    }
    
    /**
     * Start game
     */
    startGame() {
        console.log('[UI] Starting game...');
        
        // Show loading screen
        document.getElementById('loading-screen')?.classList.remove('hidden');
        
        // Initialize audio on user interaction
        if (window.AudioManager && !window.AudioManager.initialized) {
            window.AudioManager.init();
        }
        
        // Connect to server if multiplayer
        if (this.network && !this.network.connected) {
            this.network.connect();
        }
        
        // Set up game state
        setTimeout(() => {
            if (window.gameInstance) {
                // Update sensitivity from settings
                const settings = window.gameInstance.getSettings();
                window.gameInstance.settings.sensitivity = settings.sensitivity;
                
                // Start game
                window.gameInstance.setSceneMode('playing');
                
                // Hide loading screen
                document.getElementById('loading-screen')?.classList.add('hidden');
            }
        }, 500);
    }
    
    /**
     * Apply weapon customization
     */
    applyCustomization() {
        const selectedWeapon = document.querySelector('input[name="weapon-select"]:checked');
        if (!selectedWeapon) {
            this.showNotification('Please select a weapon', 'warning');
            return;
        }
        
        const weaponType = selectedWeapon.value;
        
        // Get attachment selections
        const attachments = {
            optic: document.querySelector('input[name="optic"]:checked')?.value || 'none',
            barrel: document.querySelector('input[name="barrel"]:checked')?.value || 'none',
            stock: document.querySelector('input[name="stock"]:checked')?.value || 'none',
            skin: document.querySelector('input[name="skin"]:checked')?.value || 'default'
        };
        
        // Apply to weapon system
        this.weaponSystem.applyCustomization(weaponType, attachments);
        
        // Update stats display
        this.updateWeaponStats();
        
        this.showNotification(`${CONSTANTS.WEAPON_CONFIGS[weaponType]?.name || 'Weapon'} customization applied!`, 'success');
        
        console.log('[UI] Customization applied:', weaponType, attachments);
    }
    
    /**
     * Confirm loadout selection
     */
    confirmLoadout() {
        const primary = document.getElementById('primary-weapon-select').value;
        const secondary = document.getElementById('secondary-weapon-select').value;
        const melee = document.getElementById('melee-weapon-select').value;
        
        const grenades = document.getElementById('equip-grenades').checked;
        const healthpacks = document.getElementById('equip-healthpacks').checked;
        const ammo = document.getElementById('equip-ammo').checked;
        
        const loadout = {
            primaryTypes: [primary],
            secondaryTypes: secondary !== 'no-secondary' ? [secondary] : [],
            meleeTypes: melee !== 'no-melee' ? [melee] : [],
            items: {
                grenades: grenades ? 5 : 0,
                healthPacks: healthpacks ? 3 : 0,
                extraAmmo: ammo
            }
        };
        
        this.weaponSystem.setLoadout(loadout);
        
        this.showNotification('Loadout confirmed!', 'success');
        
        // Return to main menu
        this.showMainMenu();
        
        console.log('[UI] Loadout confirmed:', loadout);
    }
    
    /**
     * Set default loadout
     */
    setDefaultLoadout() {
        const defaultLoadout = {
            primaryTypes: ['assault-rifle'],
            secondaryTypes: ['pistol'],
            meleeTypes: ['knife'],
            items: {
                grenades: 5,
                healthPacks: 3,
                extraAmmo: true
            }
        };
        
        this.weaponSystem.setLoadout(defaultLoadout);
        
        // Update form
        document.getElementById('primary-weapon-select').value = 'assault-rifle';
        document.getElementById('secondary-weapon-select').value = 'pistol';
        document.getElementById('melee-weapon-select').value = 'knife';
        document.getElementById('equip-grenades').checked = true;
        document.getElementById('equip-healthpacks').checked = true;
        document.getElementById('equip-ammo').checked = true;
        
        this.showNotification('Default loadout selected', 'info');
    }
    
    /**
     * Customize a weapon from loadout screen
     * @param {string} slot - 'primary' or 'secondary'
     */
    customizeWeapon(slot) {
        const weaponSelect = document.getElementById(
            slot === 'primary' ? 'primary-weapon-select' : 'secondary-weapon-select'
        );
        const weaponType = weaponSelect.value;
        
        // Switch to customization menu for this weapon
        this.showCustomizeMenu();
        
        // Select the weapon for customization
        const radio = document.querySelector(`input[name="weapon-select"][value="${weaponType}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        }
    }
}
