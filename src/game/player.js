/**
 * Firebrox FPS - Player Module
 * First-person player controller with WASD, sprint, crouch, jump
 */

import * as THREE from 'three';

/**
 * Player Controller - Handles first-person movement and camera
 */
export class Player {
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
        
        // Movement state
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
        this.clock = new THREE.Clock();
        
        // Create player mesh (for multiplayer)
        this.mesh = this.createPlayerMesh();
        
        console.log('Player initialized');
    }
    
    /**
     * Create simple player mesh for multiplayer
     */
    createPlayerMesh() {
        const group = new THREE.Group();
        
        // Body (head + torso combined)
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x4488ff,
            roughness: 0.7,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.6, 0);
        head.castShadow = true;
        group.add(head);
        
        return group;
    }
    
    /**
     * Update player physics and movement
     * @param {number} delta - Delta time in seconds
     * @param {object} keys - Keyboard state
     * @param {object} mouse - Mouse delta for look
     */
    update(delta, keys, mouse) {
        if (this.isDead) return;
        
        // Store input
        this.keys = keys;
        this.mouseDelta.x = mouse.x;
        this.mouseDelta.y = mouse.y;
        
        // Handle mouse look
        this.handleMouseLook(mouse);
        
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
        
        // Update mesh for multiplayer
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.quaternion.setFromEuler(
                new THREE.Euler(0, this.yaw, 0)
            );
        }
    }
    
    /**
     * Handle mouse look
     */
    handleMouseLook(mouse) {
        this.yaw -= mouse.x * this.sensitivity;
        this.pitch -= mouse.y * this.sensitivity;
        
        // Clamp pitch
        this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
    }
    
    /**
     * Handle WASD movement
     */
    handleMovement(delta) {
        const direction = new THREE.Vector3();
        
        // Forward/backward
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            direction.z -= 1;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            direction.z += 1;
        }
        
        // Left/right
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            direction.x -= 1;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            direction.x += 1;
        }
        
        // Normalize
        if (direction.length() > 0) {
            direction.normalize();
            
            // Get camera-relative direction
            const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
                this.camera.quaternion
            );
            cameraDir.y = 0;
            cameraDir.normalize();
            
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
                this.camera.quaternion
            );
            cameraRight.y = 0;
            cameraRight.normalize();
            
            // Calculate movement vector in camera space
            const moveDir = new THREE.Vector3();
            moveDir.addScaledVector(cameraDir, -direction.z);
            moveDir.addScaledVector(cameraRight, direction.x);
            moveDir.y = 0;
            moveDir.normalize();
            
            // Apply speed
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
            // Apply friction when no input
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        }
    }
    
    /**
     * Handle jumping
     */
    handleJump(delta) {
        if ((this.keys['Space'] || this.keys['KeySpace']) && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            
            // Play footstep sound on jump
            if (window.AudioManager) {
                window.AudioManager.playFootstep();
            }
        }
    }
    
    /**
     * Handle crouching
     */
    handleCrouching(delta) {
        if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
            if (!this.isCrouching) {
                this.isCrouching = true;
                this.height = this.crouchSpeed;
            }
        } else if (this.isCrouching) {
            // Slowly stand up after releasing crouch
            if (this.isGrounded) {
                this.isCrouching = false;
                this.height = this.sprintSpeed;
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
     * Simple box collision detection
     */
    checkCollision(collider) {
        const p = this.position;
        const r = this.radius;
        const h = this.height / 2;
        
        // Check if player sphere intersects collider box
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
        
        // Calculate push direction
        const centerX = (collider.min.x + collider.max.x) / 2;
        const centerY = (collider.min.y + collider.max.y) / 2;
        const centerZ = (collider.min.z + collider.max.z) / 2;
        
        const dx = p.x - centerX;
        const dz = p.z - centerZ;
        
        const overlapX = r - Math.abs(dx);
        const overlapZ = r - Math.abs(dz);
        
        // Push out on the shortest axis
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
     * Add a static collider to the physics world
     */
    addCollider(box) {
        this.colliders.push({
            min: box.min.clone(),
            max: box.max.clone()
        });
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.isDead) return false;
        
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.isDead = true;
            return true; // Player died
        }
        return false; // Still alive
    }
    
    /**
     * Heal player
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    /**
     * Reset player to default state
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
        this.height = 1.8;
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
}

export default Player;
