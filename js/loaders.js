/**
 * Firebrox FPS - Asset Loader
 * Handles loading 3D models, textures, and audio assets
 */

class AssetLoader {
    constructor() {
        this.loadedAssets = {};
        this.loading = false;
        this.totalToLoad = 0;
        this.loadedCount = 0;
    }
    
    /**
     * Load a texture
     */
    loadTexture(url, name) {
        return new Promise((resolve) => {
            const loader = new THREE.TextureLoader();
            loader.load(url, (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                this.loadedAssets[name || url] = texture;
                this.loadedCount++;
                console.log(`[Asset] Loaded texture: ${name || url}`);
                resolve(texture);
            });
        });
    }
    
    /**
     * Create procedural textures
     */
    createProceduralTexture(width, height, color, pattern = 'solid') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        
        if (pattern === 'checker') {
            const checkSize = width / 8;
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    if ((i + j) % 2 === 0) {
                        ctx.fillStyle = '#333';
                        ctx.fillRect(i * checkSize, j * checkSize, checkSize, checkSize);
                    }
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }
}

export default AssetLoader;
export { AssetLoader };
