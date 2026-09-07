/**
 * Firebrox FPS - Player Controller
 * First-person player movement, physics, and camera control
 */

import * as THREE from 'three';

/**
 * PlayerController - Handles first-person player movement and camera
 */
class PlayerController {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        
        // Player state
        this.position = new THREE.Vector3(0, 1.8, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.height = 1.8;
        this.radius = 0.4;
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        
        // Movement
        this.isGrounded = false;
        this.isCrouching = false;
        this.isSprinting = false;
        this.speed = 6;
        this.sprintSpeed = 10;
        this.crouchSpeed = 2.5;
        this.jumpForce = 8;
        this.gravity = -25;
        this.friction = 0.85;
        
        // Camera rotation
        this.yaw = 0;
        this.pitch = 0;
        this.sensitivity = 0.002;
        
        // Input tracking
        this.keys = {};
        this.mouseDelta = { x: 0, y: 0 };
        
        // Physics
        this.colliders = [];
    }
    
    /**
     * Update player physics and movement
     * @param {number} delta - Delta time in seconds
     */
    update(delta) {
        if (this.isDead) return;
        
        // Handle mouse look
        this.handleMouseLook();
        
        // Handle movement
        this.handleMovement(delta);
        
        // Handle jumping
        this.handleJump(delta);
        
        // Handle crouching
        this.handleCrouching(delta);
        
        // Apply gravity
        this.applyGravity(delta);
        
        // Collision detection
        this.detectCollision();
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Update camera
        this.camera.position.copy(this.position);
        this.camera.quaternion.setFromEuler(
            new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
        );
    }
    
    /**
     * Handle WASD movement
     */
    handleMovement(delta) {
        const direction = new THREE.Vector3();
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x += 1;
        
        if (direction.length() > 0) {
            direction.normalize();
            
            // Get camera-relative direction
            const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            cameraDir.y = 0;
            cameraDir.normalize();
            
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            cameraRight.y = 0;
            cameraRight.normalize();
            
            const moveDir = new THREE.Vector3();
            moveDir.addScaledVector(cameraDir, -direction.z);
            moveDir.addScaledVector(cameraRight, direction.x);
            moveDir.y = 0;
            moveDir.normalize();
            
            const speed = this.isCrouching
                ? this.crouchSpeed
                : (this.isSprinting ? this.sprintSpeed : this.speed);
            
            this.velocity.x = moveDir.x * speed;
            this.velocity.z = moveDir.z * speed;
            this.velocity.y = 0;
            
            // Check sprint
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
                if (!this.isCrouching && direction.length() > 0) {
                    this.isSprinting = true;
                }
            } else {
                this.isSprinting = false;
            }
        } else {
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        }
    }
    
    /**
     * Handle jumping
     */
    handleJump(delta) {
        if (this.keys['Space'] && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
    }
    
    /**
     * Handle crouching
     */
    handleCrouching(delta) {
        if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
            if (!this.isCrouching) {
                this.isCrouching = true;
            }
        } else if (this.isCrouching) {
            if (this.isGrounded) {
                this.isCrouching = false;
            }
        }
    }
    
    /**
     * Apply gravity
     */
    applyGravity(delta) {
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * delta;
        }
    }
    
    /**
     * Detect collisions with environment
     */
    detectCollision() {
        this.isGrounded = false;
        
        // Ground plane
        if (this.position.y <= this.height / 2) {
            this.position.y = this.height / 2;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
        
        // Check against all colliders
        for (const collider of this.colliders) {
            if (this.checkCollision(collider)) {
                this.resolveCollision(collider);
            }
        }
    }
    
    /**
     * Simple collision detection
     */
    checkCollision(collider) {
        const p = this.position;
        const r = this.radius;
        
        const nearestX = THREE.MathUtils.clamp(p.x, collider.min.x, collider.max.x);
        const nearestY = THREE.MathUtils.clamp(p.y, collider.min.y, collider.max.y);
        const nearestZ = THREE.MathUtils.clamp(p.z, collider.min.z, collider.max.z);
        
        const dx = p.x - nearestX;
        const dy = p.y - nearestY;
        const dz = p.z - nearestZ;
        
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return dist < r;
    }
    
    /**
     * Resolve collision by pushing player out
     */
    resolveCollision(collider) {
        const p = this.position;
        const r = this.radius;
        
        const centerX = (collider.min.x + collider.max.x) / 2;
        const centerY = (collider.min.y + collider.max.y) / 2;
        const centerZ = (collider.min.z + collider.max.z) / 2;
        
        const dx = p.x - centerX;
        const dz = p.z - centerZ;
        
        const overlapX = r - Math.abs(dx);
        const overlapZ = r - Math.abs(dz);
        
        if (overlapX > overlapZ) {
            this.position.x += Math.sign(dx) * (overlapX + 0.01);
        } else {
            this.position.z += Math.sign(dz) * (overlapZ + 0.01);
        }
        
        // Check if standing on top
        if (p.y < collider.max.y + r && p.y > collider.min.y) {
            const floorDist = collider.max.y + r - p.y;
            if (floorDist < 0.1) {
                this.position.y = collider.max.y + r;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        }
    }
    
    /**
     * Add a static collider
     */
    addCollider(box) {
        this.colliders.push({
            min: box.min.clone(),
            max: box.max.clone()
        });
    }
    
    /**
     * Handle mouse look
     */
    handleMouseLook() {
        this.yaw -= this.mouseDelta.x * this.sensitivity;
        this.pitch -= this.mouseDelta.y * this.sensitivity;
        
        this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
        
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.isDead) return false;
        
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.isDead = true;
            return true;
        }
        return false;
    }
    
    /**
     * Heal player
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    /**
     * Reset player
     */
    reset() {
        this.position.set(0, 1.8, 0);
        this.velocity.set(0, 0, 0);
        this.yaw = 0;
        this.pitch = 0;
        this.health = this.maxHealth;
        this.isDead = false;
        this.isCrouching = false;
        this.isSprinting = false;
    }
    
    /**
     * Get serializable state for networking
     */
    getState() {
        return {
            position: [this.position.x, this.position.y, this.position.z],
            quaternion: [
                this.camera.quaternion.x,
                this.camera.quaternion.y,
                this.camera.quaternion.z,
                this.camera.quaternion.w
            ],
            health: this.health,
            isCrouching: this.isCrouching,
            isSprinting: this.isSprinting,
            isDead: this.isDead
        };
    }
    
    /**
     * Set state from network data
     */
    setState(state) {
        if (state.position) {
            this.position.fromArray(state.position);
        }
        if (state.quaternion) {
            this.camera.quaternion.fromArray(state.quaternion);
            this.yaw = this.camera.rotation.y;
            this.pitch = this.camera.rotation.x;
        }
        if (state.health !== undefined) {
            this.health = state.health;
        }
        if (state.isCrouching !== undefined) {
            this.isCrouching = state.isCrouching;
        }
        if (state.isSprinting !== undefined) {
            this.isSprinting = state.isSprinting;
        }
    }
    
    /**
     * Jump (called externally)
     */
    playerJump() {
        if (this.isGrounded && !this.isCrouching) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
    }
}

export default PlayerController;
export { PlayerController };
