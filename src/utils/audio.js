/**
 * Firebrox FPS - Audio Manager
 * Handles game audio: gunshots, reloads, footsteps, ambient sounds
 * Uses Web Audio API for browser-based audio without external files
 */

/**
 * AudioManager class - Simple synthesized audio system
 * Creates procedural audio using Web Audio API
 * No external audio files required
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.footstepGain = null;
        
        this.masterVolume = 0.8;
        this.sfxVolume = 0.9;
        this.musicVolume = 0.5;
        this.footstepVolume = 0.3;
        
        this.initialized = false;
        this.sounds = {};
    }
    
    /**
     * Initialize audio context
     */
    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create gain nodes
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            this.footstepGain = this.audioContext.createGain();
            this.footstepGain.gain.value = this.footstepVolume;
            this.footstepGain.connect(this.masterGain);
            
            this.initialized = true;
            console.log('[Audio] Audio system initialized');
            
            // Start ambient audio
            this.playAmbient();
        } catch (error) {
            console.warn('[Audio] Failed to initialize audio:', error);
        }
    }
    
    /**
     * Resume audio context (needed for browser autoplay policy)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    /**
     * Play a synthesized gunshot sound
     */
    playGunshot() {
        this.resume();
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Create noise buffer
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            // Gunshot: initial bang + decay
            const envelope = Math.exp(-t * 30);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
        
        // Create noise source
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = buffer;
        
        // Add bandpass filter for more realistic sound
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1000;
        bandpass.Q.value = 0.5;
        
        // Add gain envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0.8, now);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        // Connect
        noiseSource.connect(bandpass);
        bandpass.connect(envelope);
        envelope.connect(this.sfxGain);
        
        // Play
        noiseSource.start(now);
        noiseSource.stop(now + 0.1);
    }
    
    /**
     * Play reload sound
     */
    playReload() {
        this.resume();
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Metal sliding sound
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const envelope = Math.min(1, t * 20) * Math.exp(-t * 4);
            data[i] = Math.sin(t * 800) * envelope * 0.3 + (Math.random() - 0.5) * envelope * 0.2;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.5;
        
        source.connect(gain);
        gain.connect(this.sfxGain);
        
        source.start(now);
    }
    
    /**
     * Play footstep sound
     */
    playFootstep() {
        this.resume();
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Short thud sound
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const envelope = Math.exp(-t * 40);
            data[i] = Math.sin(t * 50) * envelope * 0.2;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = this.footstepVolume;
        
        source.connect(gain);
        gain.connect(this.footstepGain);
        
        source.start(now);
    }
    
    /**
     * Play hit marker sound
     */
    playHit() {
        this.resume();
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Click sound
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            data[i] = Math.sin(t * 2000) * Math.exp(-t * 50);
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.3;
        
        source.connect(gain);
        gain.connect(this.sfxGain);
        
        source.start(now);
    }
    
    /**
     * Play explosion sound
     */
    playExplosion() {
        this.resume();
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Low rumble
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const envelope = Math.exp(-t * 3);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 200;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.sfxGain);
        
        source.start(now);
    }
    
    /**
     * Play ambient drone
     */
    playAmbient() {
        this.resume();
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        // Create subtle ambient drone
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 55; // Low A
        
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 57.33; // Slightly detuned
        
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.2;
        
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 2;
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.08;
        
        osc1.connect(gain);
        osc2.connect(gain);
        
        gain.connect(this.musicGain);
        
        osc1.start(now);
        osc2.start(now);
        lfo.start(now);
        
        this.sounds.ambient = { osc1, osc2, lfo };
    }
    
    /**
     * Update volume settings
     * @param {object} volumes - Volume settings
     */
    updateVolumes(volumes) {
        if (volumes.master !== undefined) {
            this.masterVolume = volumes.master;
            if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
        }
        
        if (volumes.sfx !== undefined) {
            this.sfxVolume = volumes.sfx;
            if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
        }
        
        if (volumes.music !== undefined) {
            this.musicVolume = volumes.music;
            if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
        }
        
        if (volumes.footstep !== undefined) {
            this.footstepVolume = volumes.footstep;
            if (this.footstepGain) this.footstepGain.gain.value = this.footstepVolume;
        }
    }
    
    /**
     * Stop ambient audio
     */
    stopAmbient() {
        if (this.sounds.ambient) {
            const { osc1, osc2, lfo } = this.sounds.ambient;
            osc1.stop();
            osc2.stop();
            lfo.stop();
            this.sounds.ambient = null;
        }
    }
}

// Initialize audio on first user interaction
document.addEventListener('click', () => {
    if (window.AudioManager && !window.AudioManager.initialized) {
        window.AudioManager.init();
    }
}, { once: true });

// Export for use in other modules
export default AudioManager;
export { AudioManager };
