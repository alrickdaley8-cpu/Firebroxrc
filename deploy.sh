#!/bin/bash
# Firebrox FPS - Deployment Script
# Deploy the game to a VPS or platform

set -e

echo "=== Firebrox FPS Deployment ==="

# Configuration
SERVER_HOST="${SERVER_HOST:-localhost}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/firebrox-fps}"
NODE_ENV="${NODE_ENV:-production}"

# Check for SSH key
if [ ! -f "$HOME/.ssh/id_rsa" ]; then
    echo "No SSH key found. Please set up SSH key for passwordless login."
    echo "Run: ssh-keygen -t rsa -b 4096 -C 'firebrox-deploy'"
    exit 1
fi

# Build frontend
echo ""
echo "Building frontend..."
npm install
npm run build:frontend

# Tar and deploy
echo ""
echo "Deploying to $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH..."

tar -czf firebrox-build.tar.gz \
    --exclude node_modules \
    --exclude .git \
    --exclude .github \
    .

# Copy to server
scp -P $SERVER_PORT firebrox-build.tar.gz $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/

# Extract and setup on server
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << 'EOF'
    cd /var/www/firebrox-fps
    tar -xzf firebrox-build.tar.gz
    rm firebrox-build.tar.gz
    npm install --production
    pm2 restart firebrox-server || pm2 start server.js --name firebrox-server
    echo "Deployment complete!"
EOF

# Cleanup
rm -f firebrox-build.tar.gz

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: https://$SERVER_HOST"
echo "Server: ws://$SERVER_HOST:3000"
