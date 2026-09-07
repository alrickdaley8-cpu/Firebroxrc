/**
 * Firebrox FPS - Asset Loaders
 * Handles loading 3D models, textures, and other assets
 */

import * as THREE from 'three';

/**
 * AssetLoader class - Manages loading 3D models and textures
 */
export class AssetLoader {
    constructor() {
        this.loadedAssets = {};
        this.loadingPromises = [];
        this.totalAssets = 0;
        this.loadedCount = 0;
    }
    
    /**
     * Load a texture
     * @param {string} url - Texture URL
     * @returns {Promise<THREE.Texture>}
     */
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (texture) => {
                    this.loadedCount++;
                    this.loadedAssets[url] = texture;
                    resolve(texture);
                },
                (xhr) => {
                    // Progress callback
                    const progress = (xhr.loaded / xhr.total * 100).toFixed(0);
                    console.log(`[Asset] Loading texture: ${progress}%`);
                },
                (error) => {
                    console.error(`[Asset] Failed to load texture: ${url}`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Load multiple textures
     * @param {array} urls - Array of texture URLs
     * @returns {Promise<object>}
     */
    loadTextures(urls) {
        const promises = urls.map(url => this.loadTexture(url));
        return Promise.all(promises);
    }
    
    /**
     * Create a simple 3D cube model (procedural)
     * @param {object} options - Model options
     * @returns {THREE.Mesh}
     */
    createCubeModel(options = {}) {
        const {
            size = 1,
            color = 0x808080,
            roughness = 0.8,
            metalness = 0.1,
            emissive = 0x000000,
            emissiveIntensity = 0
        } = options;
        
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness,
            emissive,
            emissiveIntensity
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    /**
     * Create a barrel/procedural weapon model
     * @param {object} options - Model options
     * @returns {THREE.Group}
     */
    createBarrelModel(options = {}) {
        const {
            length = 1,
            radius = 0.02,
            color = 0x333333,
            detail = 8
        } = options;
        
        const group = new THREE.Group();
        
        // Main barrel
        const barrelGeom = new THREE.CylinderGeometry(radius, radius, length, detail);
        const barrelMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.5,
            metalness: 0.7
        });
        const barrel = new THREE.Mesh(barrelGeom, barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.castShadow = true;
        group.add(barrel);
        
        // Muzzle
        const muzzleGeom = new THREE.CylinderGeometry(radius * 1.2, radius * 0.8, 0.05, detail);
        const muzzleMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.3,
            metalness: 0.9
        });
        const muzzle = new THREE.Mesh(muzzleGeom, muzzleMat);
        muzzle.position.x = length / 2;
        muzzle.rotation.x = Math.PI / 2;
        group.add(muzzle);
        
        // Sight
        const sightGeom = new THREE.BoxGeometry(0.02, 0.02, 0.1);
        const sightMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.3,
            metalness: 0.5
        });
        const sight = new THREE.Mesh(sightGeom, sightMat);
        sight.position.set(0, 0.03, -0.1);
        group.add(sight);
        
        // Handguard
        const guardGeom = new THREE.CylinderGeometry(radius * 1.1, radius * 1.3, length * 0.3, detail);
        const guardMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.3
        });
        const guard = new THREE.Mesh(guardGeom, guardMat);
        guard.position.x = length * 0.35;
        guard.rotation.x = Math.PI / 2;
        group.add(guard);
        
        return group;
    }
    
    /**
     * Create a pistol model (simplified)
     * @returns {THREE.Group}
     */
    createPistolModel() {
        const group = new THREE.Group();
        
        // Body
        const bodyGeom = new THREE.BoxGeometry(0.15, 0.05, 0.3);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.6
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        group.add(body);
        
        // Barrel
        const barrel = this.createBarrelModel({ length: 0.15, radius: 0.012, color: 0x444444 });
        barrel.position.z = 0.2;
        group.add(barrel);
        
        // Grip
        const gripGeom = new THREE.BoxGeometry(0.04, 0.1, 0.06);
        const gripMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.1
        });
        const grip = new THREE.Mesh(gripGeom, gripMat);
        grip.position.set(0, -0.025, -0.1);
        grip.rotation.x = 0.2;
        group.add(grip);
        
        // Trigger
        const triggerGeom = new THREE.BoxGeometry(0.02, 0.02, 0.015);
        const triggerMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.5
        });
        const trigger = new THREE.Mesh(triggerGeom, triggerMat);
        trigger.position.set(0, -0.01, -0.05);
        group.add(trigger);
        
        return group;
    }
    
    /**
     * Create an assault rifle model (simplified)
     * @returns {THREE.Group}
     */
    createRifleModel() {
        const group = new THREE.Group();
        
        // Main body
        const bodyGeom = new THREE.BoxGeometry(0.1, 0.08, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.5,
            metalness: 0.4
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.z = 0.2;
        group.add(body);
        
        // Barrel
        const barrel = this.createBarrelModel({ length: 0.3, radius: 0.015, color: 0x555555 });
        barrel.position.z = 0.4;
        group.add(barrel);
        
        // Handguard
        const guardGeom = new THREE.BoxGeometry(0.08, 0.1, 0.15);
        const guardMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.2
        });
        const guard = new THREE.Mesh(guardGeom, guardMat);
        guard.position.set(0, 0.05, 0.05);
        group.add(guard);
        
        // Stock
        const stockGeom = new THREE.BoxGeometry(0.1, 0.12, 0.15);
        const stockMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.1
        });
        const stock = new THREE.Mesh(stockGeom, stockMat);
        stock.position.set(0, -0.03, -0.25);
        stock.rotation.x = 0.1;
        group.add(stock);
        
        // Trigger
        const triggerGeom = new THREE.BoxGeometry(0.03, 0.02, 0.015);
        const triggerMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.5
        });
        const trigger = new THREE.Mesh(triggerGeom, triggerMat);
        trigger.position.set(0, -0.01, -0.1);
        group.add(trigger);
        
        // Gas tube
        const tubeGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.3,
            metalness: 0.8
        });
        const tube = new THREE.Mesh(tubeGeom, tubeMat);
        tube.rotation.z = Math.PI / 2;
        tube.position.set(0.05, 0.04, 0.15);
        group.add(tube);
        
        return group;
    }
    
    /**
     * Create a shotgun model (simplified)
     * @returns {THREE.Group}
     */
    createShotgunModel() {
        const group = new THREE.Group();
        
        // Barrel (wider for shotgun)
        const barrel = this.createBarrelModel({ length: 0.4, radius: 0.03, color: 0x666666 });
        barrel.position.z = 0.25;
        group.add(barrel);
        
        // Receiver
        const recGeom = new THREE.BoxGeometry(0.15, 0.1, 0.2);
        const recMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.5,
            metalness: 0.5
        });
        const rec = new THREE.Mesh(recGeom, recMat);
        rec.position.z = -0.05;
        group.add(rec);
        
        // Magazine
        const magGeom = new THREE.BoxGeometry(0.04, 0.12, 0.08);
        const magMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.1
        });
        const mag = new THREE.Mesh(magGeom, magMat);
        mag.position.set(0, -0.06, -0.15);
        group.add(mag);
        
        // Stock
        const stockGeom = new THREE.BoxGeometry(0.12, 0.15, 0.2);
        const stockMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.1
        });
        const stock = new THREE.Mesh(stockGeom, stockMat);
        stock.position.set(0, -0.02, -0.3);
        stock.rotation.x = 0.15;
        group.add(stock);
        
        return group;
    }
    
    /**
     * Create a knife model (simplified)
     * @returns {THREE.Group}
     */
    createKnifeModel() {
        const group = new THREE.Group();
        
        // Blade
        const bladeGeom = new THREE.BoxGeometry(0.02, 0.002, 0.15);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xffffff,
            emissiveIntensity: 0.1
        });
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.z = 0.05;
        blade.rotation.x = 0.2;
        group.add(blade);
        
        // Handle
        const handleGeom = new THREE.BoxGeometry(0.025, 0.025, 0.08);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.0
        });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.z = -0.06;
        group.add(handle);
        
        // Edge
        const edgeGeom = new THREE.BoxGeometry(0.02, 0.001, 0.14);
        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 0.1,
            metalness: 1.0
        });
        const edge = new THREE.Mesh(edgeGeom, edgeMat);
        edge.position.set(0.01, 0.001, 0.05);
        edge.rotation.x = 0.2;
        group.add(edge);
        
        return group;
    }
    
    /**
     * Create environment props (crates, barrels, etc.)
     * @param {string} type - Prop type
     * @returns {THREE.Mesh}
     */
    createProp(type) {
        switch (type) {
            case 'crate':
                return this.createCrate();
            case 'barrel':
                return this.createBarrelProp();
            case 'box':
                return this.createBox();
            default:
                return this.createBox();
        }
    }
    
    /**
     * Create a wooden crate
     * @returns {THREE.Mesh}
     */
    createCrate() {
        const size = 0.5 + Math.random() * 0.5;
        const height = 0.4 + Math.random() * 0.3;
        
        const geom = new THREE.BoxGeometry(size, height, size);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.08, 0.4, 0.3),
            roughness: 0.9,
            metalness: 0.0
        });
        
        const crate = new THREE.Mesh(geom, mat);
        crate.castShadow = true;
        crate.receiveShadow = true;
        
        // Add some detail lines
        const edgeGeom = new THREE.EdgesGeometry(geom);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 });
        const edges = new THREE.LineSegments(edgeGeom, edgeMat);
        crate.add(edges);
        
        return crate;
    }
    
    /**
     * Create a metal barrel
     * @returns {THREE.Mesh}
     */
    createBarrelProp() {
        const radius = 0.2 + Math.random() * 0.1;
        const height = 0.5 + Math.random() * 0.3;
        
        const geom = new THREE.CylinderGeometry(radius, radius, height, 16);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x556677,
            roughness: 0.4,
            metalness: 0.7
        });
        
        const barrel = new THREE.Mesh(geom, mat);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        
        return barrel;
    }
    
    /**
     * Create a simple box
     * @returns {THREE.Mesh}
     */
    createBox() {
        const size = 0.5 + Math.random() * 0.5;
        
        const geom = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
            roughness: 0.7,
            metalness: 0.1
        });
        
        const box = new THREE.Mesh(geom, mat);
        box.castShadow = true;
        box.receiveShadow = true;
        
        return box;
    }
    
    /**
     * Get loaded asset
     * @param {string} url - Asset URL
     * @returns {object|null}
     */
    getAsset(url) {
        return this.loadedAssets[url] || null;
    }
    
    /**
     * Clear all loaded assets
     */
    clear() {
        this.loadedAssets = {};
        this.loadedCount = 0;
        this.totalAssets = 0;
    }
    
    /**
     * Get loading progress
     * @returns {number}
     */
    getProgress() {
        if (this.totalAssets === 0) return 0;
        return this.loadedCount / this.totalAssets;
    }
}

export default AssetLoader;
