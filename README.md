# Firebrox FPS

A AAA-quality Three.js first-person shooter built for the browser with multiplayer support, weapon customization, and inventory system.

## Features

- **First-Person Shooter Gameplay**: Smooth WASD movement, sprinting, crouching, jumping with pointer lock controls
- **3D Environment**: Detailed level with buildings, obstacles, cover, and verticality
- **Weapon System**: Assault rifle, SMG, pistol, shotgun, melee weapons with raycasting hit detection
- **Weapon Customization**: Attachments (scopes, barrels, stocks), skins with stat modifications
- **Inventory System**: Grenades, health packs, extra ammo
- **Loadout System**: Choose primary/secondary/melee weapons and equipment before match
- **Multiplayer**: WebSocket-based multiplayer with player sync, hit detection, and lobby
- **Audio**: Synthesized gunshots, reloads, footsteps, ambient sounds
- **UI/HUD**: Main menu, pause menu, settings, HUD with crosshair, health, ammo, weapon display

## Project Structure

```
firebrox-fps/
├── package.json          # Dependencies and scripts
├── server.js             # Node.js WebSocket multiplayer server
├── README.md             # This file
├── .gitignore            # Git ignore file
├── public/
│   ├── index.html        # Main HTML file
│   └── css/
│       ├── main.css      # Global styles
│       ├── hud.css       # In-game HUD styles
│       ├── menus.css     # Menu system styles
│       ├── customization.css  # Weapon customization styles
│       └── inventory.css # Inventory display styles
│   └── js/
│       ├── main.js       # Game entry point (browser)
│       ├── constants.js  # Game configuration
│       ├── loaders.js    # Asset loader
│       ├── player.js     # Player controller
│       ├── weapon.js     # Weapon system
│       ├── native-game.js  # Game controller
│       ├── networking.js # Client-side networking
│       ├── ui.js         # UI manager
│       ├── customization.js  # Customization UI
│       ├── loadout.js    # Loadout system
│       ├── inventory.js  # Inventory system
│       └── audio.js      # Audio manager
├── src/
│   ├── main.js           # Game entry point
│   ├── constants.js      # Game configuration
│   ├── game/
│   │   ├── game.js       # Main game controller
│   │   ├── physics.js    # Physics manager and collision
│   │   └── player.js     # Player controller
│   ├── weapon/
│   │   └── weapon.js     # Weapon system
│   ├── networking/
│   │   └── network.js    # Client-side networking
│   ├── ui/
│   │   ├── ui.js         # UI manager
│   │   ├── loadout.js    # Loadout system
│   │   ├── inventory.js  # Inventory system
│   │   └── customization.js  # Customization UI
│   ├── utils/
│   │   └── audio.js      # Audio manager
│   └── loaders.js        # Asset loader
└── assets/
    └── audio/            # Audio files (optional)
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher recommended)
- Modern web browser with WebGL support

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

**Option 1: Full Multiplayer Experience (Recommended)**

1. Start the multiplayer server:
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   node server.js
   ```
   The server runs on `ws://localhost:3000`

2. Open `public/index.html` in your browser:
   - Double-click the file, or
   - Use a local server: `npx live-server public --port=8080`
   
3. Click "Play" to start the game

4. To connect to multiplayer, click "Play" - the client will auto-connect to localhost:3000

**Option 2: Single Player Only**

1. Just open `public/index.html` in your browser
2. No server needed for single-player

### Controls

| Key | Action |
|-----|--------|
| W | Move Forward |
| A | Move Left |
| S | Move Backward |
| D | Move Right |
| Shift | Sprint |
| Ctrl | Crouch |
| Mouse | Look Around (pointer lock) |
| Left Click | Shoot |
| Right Click | Aim Down Sights (ADS) |
| R | Reload |
| Space | Jump |
| Scroll Wheel | Switch Weapon |
| 1 | Primary Weapon |
| 2 | Secondary Weapon |
| 3 | Melee Weapon |
| G | Throw Grenade |
| H | Use Health Pack |

### Game Settings

- **Graphics Quality**: Low/Medium/High (affects shadows)
- **Master Volume**: Audio volume control
- **SFX Volume**: Sound effects volume
- **Music Volume**: Background music volume
- **Mouse Sensitivity**: Mouse look speed

### Weapon Customization

1. From main menu, click "CUSTOMIZE WEAPONS"
2. Select a weapon from the list
3. Choose attachments:
   - **Optics**: Scope, Red Dot, Holographic, 3x Scope
   - **Barrel**: Muzzle Brake, Extended Barrel, Suppressor
   - **Stock**: Collapsible, Solid, Adjustable
   - **Skin**: Desert Camo, Stealth Black, Urban Camo
4. Each attachment modifies damage, accuracy, and recoil
5. Click "APPLY CHANGES" to save

### Loadout System

1. From main menu, click "LOADOUT"
2. Select your primary weapon (Assault Rifle, SMG, or Shotgun)
3. Select secondary weapon (Pistol or None)
4. Select melee weapon (Knife or None)
5. Equip items: Grenades, Health Packs, Extra Ammo
6. Click "CONFIRM LOADOUT" to save

## Multiplayer Server

### Starting the Server

```bash
npm start
```

The server will start on port 3000 by default. You can change the port:

```bash
PORT=8080 node server.js
```

### Server Features

- Manages up to 16 concurrent players
- Syncs player positions, rotations, and states at 30Hz
- Handles hit detection, damage, and kills
- Broadcasts player join/leave events
- Runs at 60 tick rate

### Client Connection

The client automatically connects to localhost:3000 when you click Play. To connect to a remote server:

1. Modify the `serverUrl` in `src/networking/network.js`
2. Or update the connection settings in the UI

## Extending the Game

### Adding New Weapons

1. Add weapon config to `src/constants.js` under `WEAPON_CONFIGS`
2. Create weapon class in `src/weapon/weapon.js`
3. Add to `WeaponSystem.initDefaultWeapons()`
4. Add to loadout selection in `src/ui/loadout.js`

### Adding New Attachments

1. Add attachment effects to `src/constants.js` under `ATTACHMENT_EFFECTS`
2. Add attachment options in the customization UI HTML
3. Handle application in `Weapon.applyAttachment()`

### Adding New Maps

1. Modify `createLevel()` in `src/main.js`
2. Add new buildings, obstacles, and decor
3. Ensure physics colliders are added for all geometry

### Adding Audio Files

1. Place audio files in `assets/audio/`
2. Update `src/utils/audio.js` to load and play them
3. The current implementation uses synthesized audio (no files needed)

## Performance Tips

- Use lower graphics quality for better performance
- Close other applications to free resources
- Reduce shadow resolution in settings
- Disable bloom for better performance on low-end systems

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Requires WebGL 2.0 support

## Troubleshooting

### "Failed to initialize game"

- Ensure your browser supports WebGL
- Update your graphics drivers
- Try a different browser

### "Connection refused"

- Ensure the server is running: `node server.js`
- Check that port 3000 is not blocked
- Firewall may need to allow localhost connections

### Audio not playing

- Browsers require user interaction before playing audio
- Click anywhere on the page first
- Check browser settings for audio permissions

### Low FPS

- Lower graphics quality in settings
- Reduce shadow resolution
- Close other tabs and applications
- Check for background processes using CPU

## Deployment

### Option 1: GitHub Pages (Frontend Only) ✅

The game is automatically deployed to GitHub Pages on every push to `main`:

**URL:** https://alrickdaley8-cpu.github.io/Firebroxrc

The CI/CD pipeline (`.github/workflows/deploy.yml`) handles:
- Testing and linting on every push
- Building the frontend
- Deploying to GitHub Pages automatically

### Option 2: VPS Deployment (Full Multiplayer) 🚀

For the full multiplayer experience with WebSocket server:

**Requirements:**
- VPS with Node.js 18+
- SSH access
- PM2 process manager

**Setup:**
```bash
# On your VPS
ssh root@your-server.com
apt update && apt install -y nodejs npm pm2
npm install -g pm2

# Clone and setup
git clone https://github.com/alrickdaley8-cpu/Firebroxrc.git /var/www/firebrox-fps
cd /var/www/firebrox-fps
npm install --production

# Start with PM2 (auto-restart on crash)
pm2 start server.js --name firebrox-server
pm2 save
pm2 startup
```

**Automated Deployment:**
```bash
# Set environment variables
export SERVER_HOST="your-server.com"
export SERVER_USER="root"
export DEPLOY_PATH="/var/www/firebrox-fps"

# Run deployment script
./deploy.sh
```

### Option 3: Docker Container 🐳

Deploy using Docker for containerized hosting:

```bash
# Build image
docker build -t firebrox-fps .

# Run container
docker run -d \
  --name firebrox-fps \
  -p 3000:3000 \
  --restart unless-stopped \
  firebrox-fps

# Or with docker-compose
docker-compose up -d
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  firebrox:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
```

### Option 4: Manual Build & Deploy

**For static hosting (GitHub Pages, Netlify, Vercel):**
```bash
npm install
npm run build:frontend
# Deploy the `public/` folder to your static host
```

**For Node.js server:**
```bash
npm install
npm start
# Server runs on port 3000
```

## CI/CD Pipeline

The `.github/workflows/deploy.yml` workflow includes:

| Stage | Description |
|-------|-------------|
| **Test** | Lint JavaScript, check syntax |
| **Build** | Build frontend assets |
| **Deploy Pages** | Auto-deploy to GitHub Pages on `main` pushes |
| **Deploy Server** | SSH deploy to VPS (requires secrets) |

**Required GitHub Secrets for VPS deployment:**
- `SERVER_HOST` - Your server hostname/IP
- `SERVER_USER` - SSH username
- `SERVER_SSH_KEY` - SSH private key for authentication

Add secrets in: **Settings → Secrets and variables → Actions**

## Always Running

### With PM2 (Recommended)
PM2 keeps the server running 24/7 with auto-restart:

```bash
npm install -g pm2
pm2 start server.js --name firebrox-server
pm2 save
pm2 startup
```

Monitor with:
```bash
pm2 monit
pm2 logs firebrox-server
pm2 status
```

### With Docker
The Docker setup includes a restart policy (`--restart unless-stopped`) to keep it running.

### With Systemd
Create `/etc/systemd/system/firebrox.service`:
```ini
[Unit]
Description=Firebrox FPS Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/firebrox-fps
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl enable firebrox
systemctl start firebrox
```

## Project Structure

```
firebrox-fps/
├── package.json          # Dependencies and scripts
├── server.js             # Node.js WebSocket multiplayer server
├── Dockerfile            # Container deployment
├── deploy.sh             # Deployment script
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD pipeline
├── .gitignore            # Git ignore file
├── README.md             # This file
├── public/
│   ├── index.html        # Main HTML file
│   ├── css/              # Stylesheets
│   └── js/               # Client-side JavaScript
├── src/
│   ├── main.js           # Game entry point
│   ├── constants.js      # Game configuration
│   ├── game/             # Core game logic
│   ├── weapon/           # Weapon system
│   ├── networking/       # Client-side networking
│   ├── ui/               # UI, loadout, inventory, customization
│   ├── utils/            # Audio utilities
│   └── loaders.js        # Asset loader
└── assets/
    └── audio/            # Audio files (optional)
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher recommended)
- Modern web browser with WebGL support

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

**Option 1: Full Multiplayer Experience (Recommended)**

1. Start the multiplayer server:
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   node server.js
   ```
   The server runs on `ws://localhost:3000`

2. Open `public/index.html` in your browser:
   - Double-click the file, or
   - Use a local server: `npx live-server public --port=8080`
   
3. Click "Play" to start the game

4. To connect to multiplayer, click "Play" - the client will auto-connect to localhost:3000

**Option 2: Single Player Only**

1. Just open `public/index.html` in your browser
2. No server needed for single-player

### Controls

| Key | Action |
|-----|--------|
| W | Move Forward |
| A | Move Left |
| S | Move Backward |
| D | Move Right |
| Shift | Sprint |
| Ctrl | Crouch |
| Mouse | Look Around (pointer lock) |
| Left Click | Shoot |
| Right Click | Aim Down Sights (ADS) |
| R | Reload |
| Space | Jump |
| Scroll Wheel | Switch Weapon |
| 1 | Primary Weapon |
| 2 | Secondary Weapon |
| 3 | Melee Weapon |
| G | Throw Grenade |
| H | Use Health Pack |

### Game Settings

- **Graphics Quality**: Low/Medium/High (affects shadows)
- **Master Volume**: Audio volume control
- **SFX Volume**: Sound effects volume
- **Music Volume**: Background music volume
- **Mouse Sensitivity**: Mouse look speed

### Weapon Customization

1. From main menu, click "CUSTOMIZE WEAPONS"
2. Select a weapon from the list
3. Choose attachments:
   - **Optics**: Scope, Red Dot, Holographic, 3x Scope
   - **Barrel**: Muzzle Brake, Extended Barrel, Suppressor
   - **Stock**: Collapsible, Solid, Adjustable
   - **Skin**: Desert Camo, Stealth Black, Urban Camo
4. Each attachment modifies damage, accuracy, and recoil
5. Click "APPLY CHANGES" to save

### Loadout System

1. From main menu, click "LOADOUT"
2. Select your primary weapon (Assault Rifle, SMG, or Shotgun)
3. Select secondary weapon (Pistol or None)
4. Select melee weapon (Knife or None)
5. Equip items: Grenades, Health Packs, Extra Ammo
6. Click "CONFIRM LOADOUT" to save

## Multiplayer Server

### Starting the Server

```bash
npm start
```

The server will start on port 3000 by default. You can change the port:

```bash
PORT=8080 node server.js
```

### Server Features

- Manages up to 16 concurrent players
- Syncs player positions, rotations, and states at 30Hz
- Handles hit detection, damage, and kills
- Broadcasts player join/leave events
- Runs at 60 tick rate

### Client Connection

The client automatically connects to localhost:3000 when you click Play. To connect to a remote server:

1. Modify the `serverUrl` in `src/networking/network.js`
2. Or update the connection settings in the UI

## Extending the Game

### Adding New Weapons

1. Add weapon config to `src/constants.js` under `WEAPON_CONFIGS`
2. Create weapon class in `src/weapon/weapon.js`
3. Add to `WeaponSystem.initDefaultWeapons()`
4. Add to loadout selection in `src/ui/loadout.js`

### Adding New Attachments

1. Add attachment effects to `src/constants.js` under `ATTACHMENT_EFFECTS`
2. Add attachment options in the customization UI HTML
3. Handle application in `Weapon.applyAttachment()`

### Adding New Maps

1. Modify `createLevel()` in `src/main.js`
2. Add new buildings, obstacles, and decor
3. Ensure physics colliders are added for all geometry

### Adding Audio Files

1. Place audio files in `assets/audio/`
2. Update `src/utils/audio.js` to load and play them
3. The current implementation uses synthesized audio (no files needed)

## Performance Tips

- Use lower graphics quality for better performance
- Close other applications to free resources
- Reduce shadow resolution in settings
- Disable bloom for better performance on low-end systems

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Requires WebGL 2.0 support

## Troubleshooting

### "Failed to initialize game"

- Ensure your browser supports WebGL
- Update your graphics drivers
- Try a different browser

### "Connection refused"

- Ensure the server is running: `node server.js`
- Check that port 3000 is not blocked
- Firewall may need to allow localhost connections

### Audio not playing

- Browsers require user interaction before playing audio
- Click anywhere on the page first
- Check browser settings for audio permissions

### Low FPS

- Lower graphics quality in settings
- Reduce shadow resolution
- Close other tabs and applications
- Check for background processes using CPU

## GitHub Integration

This project is ready to be hosted on GitHub:

1. The repository structure follows standard conventions
2. Includes README with setup instructions
3. Node.js server is deployable
4. Anyone can clone and run the multiplayer server

To contribute:
```bash
git clone https://github.com/yourusername/firebrox-fps.git
cd firebrox-fps
npm install
npm start
```

## License

MIT License

## Credits

- Three.js - 3D rendering library
- Node.js - Server runtime
- WebSocket - Network protocol

---

**Firebrox FPS** - Browser-based multiplayer FPS action!
