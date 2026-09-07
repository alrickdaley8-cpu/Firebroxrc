/**
 * Firebrox FPS - Physics Manager
 * Handles player movement, collision detection, and physics simulation
 */

import * as THREE from 'three';
import { CONSTANTS } from '../constants.js';

/**
 * PhysicsManager class
 * Manages player physics, collision detection with level geometry
 */
export class PhysicsManager {
    constructor(scene) {
        this.scene = scene;
        this.clock = new THREE.Clock();
        
        // Static colliders (level geometry)
        this.colliders = [];
        
        // Player physics state
        this.player = {
            position: new THREE.Vector3(0, 1.8, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            quaternion: new THREE.Quaternion(),
            euler: new THREE.Euler(0, 0, 0, 'YXZ'),
            
            health: CONSTANTS.PLAYER_MAX_HEALTH,
            maxHealth: CONSTANTS.PLAYER_MAX_HEALTH,
            
            isGrounded: false,
            isCrouching: false,
            isSprinting: false,
            isDead: false,
            
            height: CONSTANTS.PLAYER_HEIGHT,
            radius: CONSTANTS.PLAYER_RADIUS,
            
            crouchTimer: 0,
            
            // Input state (set by game loop)
            moveX: 0,
            moveZ: 0,
            lookX: 0,
            lookY: 0,
            
            // Network
            needsSync: false,
            lastPositionUpdate: 0
        };
        
        // Movement state
        this.moveSpeed = CONSTANTS.MOVE_SPEED;
        this.sprintCooldown = 0;
        this.playerDirection = new THREE.Vector3();
        this.moveDirection = new THREE.Vector3();
        
        console.log('[Physics] Physics manager initialized');
    }
    
    /**
     * Add a static collider to the physics world
     * @param {THREE.Box3} box - Bounding box of the collision object
     * @param {object} data - Optional data about the collider
     */
    addStaticCollider(box, data = {}) {
        this.colliders.push({
            box: box,
            data: data
        });
        
        // Update player position based on colliders (prevent spawn inside walls)
        if (this.player.position.x === 0 && this.player.position.z === 0) {
            this.resolvePlayerCollision(this.player.position);
        }
    }
    
    /**
     * Clear all colliders (for level changes)
     */
    clearColliders() {
        this.colliders = [];
    }
    
    /**
     * Update physics simulation
     * @param {number} delta - Delta time in seconds
     * @param {object} keys - Keyboard state
     * @param {number} sensitivity - Mouse sensitivity
     */
    update(delta, keys, sensitivity) {
        if (this.player.isDead) return;
        
        // Handle movement
        this.handleMovement(delta, keys);
        
        // Handle jumping
        this.handleJump(delta, keys);
        
        // Handle crouching
        this.handleCrouching(delta, keys);
        
        // Handle sprinting
        this.handleSprinting(delta, keys);
        
        // Apply gravity
        this.applyGravity(delta);
        
        // Resolve collisions
        this.resolvePlayerCollision(this.player.position);
        
        // Update player transform
        this.updatePlayerTransform(delta, sensitivity);
        
        // Health regen
        this.updateHealthRegen(delta);
    }
    
    /**
     * Handle player movement based on input
     * @param {number} delta - Delta time
     * @param {object} keys - Keyboard state
     */
    handleMovement(delta, keys) {
        // Get WASD input
        this.player.moveX = 0;
        this.player.moveZ = 0;
        
        if (keys['KeyW']) this.player.moveZ -= 1;
        if (keys['KeyS']) this.player.moveZ += 1;
        if (keys['KeyA']) this.player.moveX -= 1;
        if (keys['KeyD']) this.player.moveX += 1;
        
        // Normalize diagonal movement
        const length = Math.sqrt(this.player.moveX * this.player.moveX + this.player.moveZ * this.player.moveZ);
        if (length > 0) {
            this.player.moveX /= length;
            this.player.moveZ /= length;
        }
        
        // Calculate movement direction in world space
        this.playerDirection.set(0, 0, -this.player.moveZ);
        this.playerDirection.applyQuaternion(this.player.quaternion);
        
        // Calculate movement velocity
        const targetSpeed = this.isSprinting() ? CONSTANTS.SPRINT_SPEED 
            : this.isCrouching() ? CONSTANTS.CROUCH_SPEED 
            : CONSTANTS.MOVE_SPEED;
        
        this.moveDirection.copy(this.playerDirection).multiplyScalar(targetSpeed);
        this.moveDirection.y = 0;
    }
    
    /**
     * Handle jumping
     * @param {number} delta - Delta time
     * @param {object} keys - Keyboard state
     */
    handleJump(delta, keys) {
        if (keys['Space'] && this.player.isGrounded && !this.player.isCrouching) {
            this.player.velocity.y = CONSTANTS.JUMP_FORCE;
            this.player.isGrounded = false;
        }
    }
    
    /**
     * Handle crouching
     * @param {number} delta - Delta time
     * @param {object} keys - Keyboard state
     */
    handleCrouching(delta, keys) {
        if (keys['ControlLeft'] || keys['ControlRight']) {
            if (!this.player.isCrouching) {
                // Start crouching
                this.player.isCrouching = true;
                this.crouchStartHeight = this.player.height;
            }
            this.crouchTimer = 0;
        } else if (this.player.isCrouching) {
            // Stand up after a short delay
            this.crouchTimer += delta;
            if (this.crouchTimer > 0.3) {
                this.player.isCrouching = false;
            }
        }
        
        // Smooth height transition
        const targetHeight = this.player.isCrouching ? CONSTANTS.CROUCH_HEIGHT : CONSTANTS.PLAYER_HEIGHT;
        this.player.height += (targetHeight - this.player.height) * delta * 10;
    }
    
    /**
     * Handle sprinting
     * @param {number} delta - Delta time
     * @param {object} keys - Keyboard state
     */
    handleSprinting(delta, keys) {
        const wantSprint = keys['ShiftLeft'] || keys['ShiftRight'];
        const canSprint = this.player.isGrounded && !this.player.isCrouching && this.player.moveZ !== 0;
        
        if (wantSprint && canSprint) {
            this.player.isSprinting = true;
            this.sprintCooldown = 2.0; // Sprint stamina
        } else if (!wantSprint || this.sprintCooldown <= 0) {
            this.player.isSprinting = false;
        }
        
        if (this.sprintCooldown > 0) {
            this.sprintCooldown -= delta;
        }
    }
    
    /**
     * Check if player is sprinting
     * @returns {boolean}
     */
    isSprinting() {
        return this.player.isSprinting && this.player.isGrounded;
    }
    
    /**
     * Apply gravity to player
     * @param {number} delta - Delta time
     */
    applyGravity(delta) {
        this.player.velocity.y += CONSTANTS.GRAVITY * delta;
    }
    
    /**
     * Resolve player collision with level geometry
     * @param {THREE.Vector3} position - Player position
     */
    resolvePlayerCollision(position) {
        const px = position.x;
        const py = position.y;
        const pz = position.z;
        
        const playerHalfHeight = this.player.height / 2;
        const playerRadius = this.player.radius;
        
        let minPenetration = Infinity;
        let resolvedPosition = position.clone();
        
        for (const collider of this.colliders) {
            const box = collider.box;
            
            // Get box extents
            const min = box.min;
            const max = box.max;
            
            // Expand box by player size for collision detection
            const expandedMin = new THREE.Vector3(
                min.x - playerRadius,
                min.y - playerHalfHeight,
                min.z - playerRadius
            );
            const expandedMax = new THREE.Vector3(
                max.x + playerRadius,
                max.y + playerHalfHeight,
                max.z + playerRadius
            );
            
            // Check if player intersects expanded box
            if (px >= expandedMin.x && px <= expandedMax.x &&
                py >= expandedMin.y && py <= expandedMax.y &&
                pz >= expandedMin.z && pz <= expandedMax.z) {
                
                // Calculate penetration depths on each axis
                let penX = Math.min(px - expandedMin.x, expandedMax.x - px);
                let penY = Math.min(py - expandedMin.y, expandedMax.y - py);
                let penZ = Math.min(pz - expandedMin.z, expandedMax.z - pz);
                
                // Find minimum penetration
                if (penX < minPenetration) {
                    minPenetration = penX;
                    resolvedPosition.x = px < box.center.x ? expandedMin.x : expandedMax.x;
                }
                if (penY < minPenetration) {
                    minPenetration = penY;
                    resolvedPosition.y = py < box.center.y ? expandedMin.y : expandedMax.y;
                }
                if (penZ < minPenetration) {
                    minPenetration = penZ;
                    resolvedPosition.z = pz < box.center.z ? expandedMin.z : expandedMax.z;
                }
            }
        }
        
        // Apply resolution
        position.copy(resolvedPosition);
        
        // Ground detection - check if player is on ground
        this.player.isGrounded = false;
        for (const collider of this.colliders) {
            const box = collider.box;
            if (py >= box.min.y - 0.1 && py <= box.min.y + 0.5 &&
                px >= box.min.x && px <= box.max.x &&
                pz >= box.min.z && pz <= box.max.z) {
                this.player.isGrounded = true;
                break;
            }
        }
    }
    
    /**
     * Update player transform (position and rotation)
     * @param {number} delta - Delta time
     * @param {number} sensitivity - Mouse sensitivity
     */
    updatePlayerTransform(delta, sensitivity) {
        // Apply velocity
        const newPosition = this.player.position.clone();
        
        // Add movement velocity
        newPosition.add(this.moveDirection.clone().multiplyScalar(delta));
        
        // Add vertical velocity (gravity/jump)
        newPosition.y += this.player.velocity.y * delta;
        
        // Clamp to ground level if needed (simple approach)
        if (newPosition.y < 0.5) {
            newPosition.y = this.player.height;
            this.player.velocity.y = 0;
            this.player.isGrounded = true;
        }
        
        // Resolve collisions
        this.resolvePlayerCollision(newPosition);
        this.player.position.copy(newPosition);
        
        // Apply rotation (mouse look)
        this.player.euler.y -= this.player.lookX * sensitivity;
        this.player.euler.x -= this.player.lookY * sensitivity;
        
        // Clamp vertical rotation
        this.player.euler.x = THREE.MathUtils.clamp(this.player.euler.x, -Math.PI/2 + 0.1, Math.PI/2 - 0.1);
        
        // Update quaternion
        this.player.quaternion.setFromEuler(this.player.euler);
        
        // Reset look delta
        this.player.lookX = 0;
        this.player.lookY = 0;
    }
    
    /**
     * Update player health regeneration
     * @param {number} delta - Delta time
     */
    updateHealthRegen(delta) {
        if (this.player.health < this.player.maxHealth && this.player.isGrounded) {
            // Simple health regen - can be enhanced with more features
            this.player.health += CONSTANTS.HEALTH_REGEN_RATE * delta * 0.5;
            this.player.health = Math.min(this.player.health, this.player.maxHealth);
        }
    }
    
    /**
     * Apply damage to player
     * @param {number} damage - Amount of damage
     * @param {string} source - Source of damage (optional)
     */
    applyDamage(damage) {
        if (this.player.isDead) return;
        
        this.player.health = Math.max(0, this.player.health - damage);
        
        if (this.player.health <= 0) {
            this.player.health = 0;
            this.player.isDead = true;
            console.log('[Physics] Player died!');
        }
    }
    
    /**
     * Heal player
     * @param {number} amount - Amount to heal
     */
    heal(amount) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
    }
    
    /**
     * Apply accumulated mouse look
     * @param {number} deltaX - Mouse movement X
     * @param {number} deltaY - Mouse movement Y
     */
    applyMouseLook(deltaX, deltaY) {
        this.player.lookX += deltaX;
        this.player.lookY += deltaY;
    }
    
    /**
     * Reset player to starting position
     */
    resetPlayer() {
        this.player.position.set(0, 1.8, 0);
        this.player.velocity.set(0, 0, 0);
        this.player.quaternion.identity();
        this.player.euler.set(0, 0, 0);
        this.player.health = this.player.maxHealth;
        this.player.isDead = false;
        this.player.isGrounded = false;
        this.player.isCrouching = false;
        this.player.isSprinting = false;
        this.player.height = CONSTANTS.PLAYER_HEIGHT;
    }
    
    /**
     * Get player world position
     * @returns {THREE.Vector3} Player position
     */
    getPlayerPosition() {
        return this.player.position.clone();
    }
    
    /**
     * Get player world quaternion
     * @returns {THREE.Quaternion} Player rotation
     */
    getPlayerQuaternion() {
        return this.player.quaternion.clone();
    }
    
    /**
     * Jump (called by game controller)
     */
    playerJump() {
        if (this.player.isGrounded && !this.player.isCrouching) {
            this.player.velocity.y = CONSTANTS.JUMP_FORCE;
            this.player.isGrounded = false;
        }
    }
    
    /**
     * Get player state for network sync
     * @returns {object} Player state
     */
    getPlayerState() {
        return {
            position: this.player.position.toArray(),
            quaternion: this.player.quaternion.toArray(),
            health: this.player.health,
            isCrouching: this.player.isCrouching,
            isSprinting: this.player.isSprinting
        };
    }
    
    /**
     * Set player state from network
     * @param {object} state - Player state from server
     */
    setPlayerState(state) {
        if (state.position) {
            this.player.position.fromArray(state.position);
        }
        if (state.quaternion) {
            this.player.quaternion.fromArray(state.quaternion);
            this.player.euler.setFromQuaternion(this.player.quaternion);
        }
        if (state.health !== undefined) {
            this.player.health = state.health;
        }
        if (state.isCrouching !== undefined) {
            this.player.isCrouching = state.isCrouching;
        }
        if (state.isSprinting !== undefined) {
            this.player.isSprinting = state.isSprinting;
        }
    }
}
