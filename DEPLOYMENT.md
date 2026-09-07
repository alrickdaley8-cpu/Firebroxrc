# Deployment Guide - Always Running

This guide explains how to deploy Firebrox FPS so it's always running and accessible.

## Quick Summary

| Deployment Option | Frontend | Multiplayer Server | Cost | Complexity |
|-------------------|----------|-------------------|------|------------|
| GitHub Pages | ✅ Always On | ❌ Not Available | Free | Easy |
| VPS (DigitalOcean, Linode, etc.) | ✅ | ✅ Always On | $5-10/mo | Medium |
| VPS + Docker | ✅ | ✅ Always On | $5-10/mo | Easy |
| Vercel/Netlify | ✅ | ❌ Not Available | Free | Easy |

## Option 1: GitHub Pages (Frontend Only, Free) 🏆

The game is configured to auto-deploy to GitHub Pages on every push. This hosts the **frontend** (HTML/CSS/JS game).

### What Works:
- ✅ Full game client
- ✅ Single-player mode
- ✅ Always online at `https://alrickdaley8-cpu.github.io/Firebroxrc`
- ✅ Auto-deploy on push to `main`

### What Doesn't Work:
- ❌ Multiplayer server (need VPS for WebSocket server)

### Setup:
1. Go to **GitHub Repository → Settings → Pages**
2. Source: `main` branch, `/public` folder (or root)
3. Save

The site will be live at: `https://alrickdaley8-cpu.github.io/Firebroxrc`

### To Deploy:
Just push to `main` branch:
```bash
git push origin main
```

GitHub Actions will build and deploy automatically.

---

## Option 2: VPS + PM2 (Full Multiplayer, Recommended) 🚀

For the complete experience with multiplayer server always running.

### Requirements:
- VPS with Node.js 18+ (Ubuntu/Debian recommended)
- ~$5-10/month (DigitalOcean Droplet, Linode, Hetzner, etc.)
- SSH access

### Step 1: Set Up VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 (process manager - keeps it always running)
npm install -g pm2

# Create app directory
mkdir -p /var/www/firebrox-fps
cd /var/www/firebrox-fps
```

### Step 2: Clone and Setup

```bash
# Clone from GitHub
git clone https://github.com/alrickdaley8-cpu/Firebroxrc.git .
git checkout main

# Install dependencies
npm install --production

# Build (if needed - frontend is static)
npm run build:frontend || true
```

### Step 3: Configure Server

Create `/var/www/firebrox-fps/config.json`:
```json
{
  "port": 3000,
  "host": "0.0.0.0",
  "maxPlayers": 16
}
```

### Step 4: Start with PM2 (Auto-Start on Boot)

```bash
# Start the server with PM2
pm2 start server.js --name firebrox-server -- --port 3000 --host 0.0.0.0

# Save PM2 process list
pm2 save

# Configure PM2 to start on boot
pm2 startup systemd -u root --hp /root

# Enable and start
systemctl enable pm2-root
systemctl start pm2-root

# Check status
pm2 status
pm2 logs firebrox-server
```

The server will now:
- ✅ Start automatically on VPS reboot
- ✅ Restart automatically if it crashes
- ✅ Log output to `~/.pm2/logs/`
- ✅ Always listening on port 3000

### Step 5: Configure Firewall

```bash
# Allow HTTP/HTTPS traffic
ufw allow 80/tcp
ufw allow 443/tcp

# Allow WebSocket server (port 3000)
ufw allow 3000/tcp

# Enable firewall
ufw enable
```

### Step 6: Set Up Reverse Proxy (Optional but Recommended)

Use Nginx to serve frontend and proxy WebSocket:

```bash
apt install nginx

# Create Nginx config
cat > /etc/nginx/sites-available/firebrox << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /var/www/firebrox-fps/public;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/firebrox /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 7: Set Up Domain (Optional)

Buy a domain (e.g., from Namecheap, Cloudflare) and point it to your VPS IP. Update Nginx config with your domain.

### Step 8: Auto-Deploy from GitHub

Create a deploy script on VPS: `/var/www/firebrox-fps/deploy.sh`

```bash
#!/bin/bash
cd /var/www/firebrox-fps
git pull origin main
npm install --production
npm run build:frontend || true
pm2 restart firebrox-server
echo "Deployed at $(date)"
```

Make it executable: `chmod +x deploy.sh`

On GitHub, add a webhook or use GitHub Actions to trigger this deploy script.

---

## Option 3: Docker + Docker Compose (Easy VPS) 🐳

Simplest VPS deployment with containers.

### On Your VPS:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Clone repo
git clone https://github.com/alrickdaley8-cpu/Firebroxrc.git /var/www/firebrox-fps
cd /var/www/firebrox-fps

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

The server will:
- ✅ Run in a container
- ✅ Auto-restart on failure (`restart: unless-stopped`)
- ✅ Expose port 3000
- ✅ Always running

### Auto-Update with Docker

Create a cron job to auto-pull updates:

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour)
0 * * * * cd /var/www/firebrox-fps && docker-compose pull && docker-compose up -d 2>&1 | logger
```

Or use Watchtower for automatic container updates:
```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower --interval 300
```

---

## Option 4: Vercel/Netlify (Frontend Only, Free)

Similar to GitHub Pages but with more features.

### Setup for Vercel:
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Configure `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    { "src": "public/index.html", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "public/index.html" }
  ]
}
```

The frontend will be live at `https://your-app.vercel.app`

---

## Managing the Always-Running Server

### Check Status
```bash
# PM2
pm2 status
pm2 monit

# Docker
docker ps
docker stats

# Systemd
systemctl status firebrox
```

### View Logs
```bash
# PM2
pm2 logs firebrox-server

# Docker
docker logs -f firebrox-fps

# Systemd
journalctl -u firebrox -f
```

### Restart
```bash
# PM2
pm2 restart firebrox-server

# Docker
docker-compose restart

# Systemd
systemctl restart firebrox
```

### Stop
```bash
# PM2
pm2 stop firebrox-server
pm2 delete firebrox-server

# Docker
docker-compose down

# Systemd
systemctl stop firebrox
```

---

## Summary: What I Recommend

### For Free / Simple:
Use **GitHub Pages** for the frontend. Game is always accessible for single-player.

### For Full Experience:
1. Get a $5 VPS (DigitalOcean, Linode, Hetzner)
2. Use **Docker Compose** for easy setup
3. Server runs 24/7 with auto-restart
4. Set up auto-deploy from GitHub

### Quick Setup Script (VPS):
```bash
#!/bin/bash
# Quick VPS setup for Firebrox

# Install everything
apt update && apt install -y nodejs npm docker.io docker-compose nginx

# Clone and start
cd /var/www
git clone https://github.com/alrickdaley8-cpu/Firebroxrc firebrox-fps
cd firebrox-fps
npm install --production
docker-compose up -d

# Or with PM2
npm install -g pm2
pm2 start server.js --name firebrox -- --port 3000 --host 0.0.0.0
pm2 save
pm2 startup

echo "Firebrox FPS is now running!"
echo "Server: ws://$(curl -s ifconfig.me):3000"
```

---

## Having Issues?

- Check if port 3000 is listening: `netstat -tlnp | grep 3000`
- Check firewall: `ufw status`
- Check logs: `pm2 logs` or `docker logs -f firebrox-fps`
- Check Node.js version: `node --version` (needs 18+)
- Check npm: `npm --version`

---

**Firebrox FPS** - Always running, always ready to play! 🎮