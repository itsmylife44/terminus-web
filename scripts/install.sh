#!/bin/bash

set -euo pipefail

if [[ -t 0 ]]; then
    :
elif [[ -e /dev/tty ]]; then
    exec < /dev/tty
else
    echo "Error: No TTY available. Run this script in an interactive terminal." >&2
    exit 1
fi

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/terminus-web"
TERMINUS_USER="terminus"
REPO_URL="https://github.com/itsmylife44/terminus-web.git"

# User input variables
DOMAIN=""
OPENCODE_PATH=""
SSL_EMAIL=""
USE_HTTPS=false

cleanup_on_error() {
    echo -e "${RED}[ERROR]${NC} Installation failed at line $1" >&2
    echo -e "${YELLOW}Check logs above for details${NC}" >&2
    exit 1
}

trap 'cleanup_on_error $LINENO' ERR

log_step() {
    echo -e "${BLUE}==>${NC} ${CYAN}$1${NC}"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
╔════════════════════════════════════════════════╗
║                                                ║
║        TERMINUS-WEB PRODUCTION INSTALLER       ║
║                                                ║
╚════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        echo "Please run: sudo $0"
        exit 1
    fi
}

detect_os() {
    log_step "Detecting operating system..."
    
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot detect OS. /etc/os-release not found"
        exit 1
    fi
    
    . /etc/os-release
    
    if [[ "$ID" != "ubuntu" ]]; then
        log_error "This installer only supports Ubuntu"
        echo "Detected: $PRETTY_NAME"
        exit 1
    fi
    
    if [[ "$VERSION_ID" != "24.04" && "$VERSION_ID" != "22.04" ]]; then
        log_warning "This installer is tested on Ubuntu 24.04 and 22.04"
        log_warning "You are running: $PRETTY_NAME"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "OS detected: $PRETTY_NAME"
}

check_existing_installation() {
    log_step "Checking for existing installation..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Existing installation found at $INSTALL_DIR"
        read -p "Remove existing installation? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_step "Stopping services..."
            su - "$TERMINUS_USER" -c "pm2 delete all" 2>/dev/null || true
            
            log_step "Removing existing installation..."
            rm -rf "$INSTALL_DIR"
            log_success "Existing installation removed"
        else
            log_error "Cannot proceed with existing installation"
            exit 1
        fi
    else
        log_success "No existing installation found"
    fi
}

gather_user_input() {
    log_step "Configuration"
    echo
    
    # Domain or IP
    while true; do
        read -p "Enter domain name or IP address (e.g., terminus.example.com or 192.168.1.100): " DOMAIN
        DOMAIN=$(echo "$DOMAIN" | xargs)
        
        if [[ -z "$DOMAIN" ]]; then
            log_error "Domain/IP cannot be empty"
            continue
        fi
        
        # Check if it looks like a domain (has dot and letters)
        if [[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9]$ && "$DOMAIN" == *.* ]]; then
            # Looks like a domain
            read -p "Enable HTTPS with automatic Let's Encrypt certificate? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                USE_HTTPS=true
                while true; do
                    read -p "Enter email for Let's Encrypt notifications: " SSL_EMAIL
                    SSL_EMAIL=$(echo "$SSL_EMAIL" | xargs)
                    if [[ "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                        break
                    else
                        log_error "Invalid email format"
                    fi
                done
            fi
            break
        # Check if it looks like an IP
        elif [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log_warning "Using IP address - HTTPS will not be available"
            break
        else
            log_error "Invalid domain/IP format"
        fi
    done
    
    # OpenCode path
    echo
    read -p "Enter OpenCode installation path [/usr/local/bin/opencode]: " OPENCODE_PATH
    OPENCODE_PATH=${OPENCODE_PATH:-/usr/local/bin/opencode}
    
    if [[ ! -f "$OPENCODE_PATH" ]]; then
        log_warning "OpenCode not found at: $OPENCODE_PATH"
        log_warning "You can install it later using: scripts/install-opencode.sh"
        read -p "Continue without OpenCode? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "OpenCode found at: $OPENCODE_PATH"
    fi
    
    # Confirmation
    echo
    echo -e "${CYAN}Configuration Summary:${NC}"
    echo "  Domain/IP: $DOMAIN"
    echo "  HTTPS: $([ "$USE_HTTPS" = true ] && echo "Enabled (${SSL_EMAIL})" || echo "Disabled")"
    echo "  OpenCode: $OPENCODE_PATH"
    echo "  Install Dir: $INSTALL_DIR"
    echo
    read -p "Proceed with installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
}

install_nodejs() {
    log_step "Installing Node.js 20..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_VERSION" -ge 20 ]]; then
            log_success "Node.js $(node -v) already installed"
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    log_success "Node.js $(node -v) installed"
}

install_pm2() {
    log_step "Installing PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_success "PM2 already installed"
        return
    fi
    
    npm install -g pm2
    log_success "PM2 installed"
}

install_caddy() {
    log_step "Installing Caddy web server..."
    
    if command -v caddy &> /dev/null; then
        log_success "Caddy already installed"
        return
    fi
    
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
    
    log_success "Caddy installed"
}

install_dependencies() {
    log_step "Installing system dependencies..."
    
    apt-get update
    apt-get install -y git curl build-essential
    
    install_nodejs
    install_pm2
    install_caddy
    
    log_success "All dependencies installed"
}

create_system_user() {
    log_step "Creating system user: $TERMINUS_USER..."
    
    if id "$TERMINUS_USER" &>/dev/null; then
        log_success "User $TERMINUS_USER already exists"
        return
    fi
    
    useradd -r -s /bin/bash -m -d /home/$TERMINUS_USER $TERMINUS_USER
    log_success "User $TERMINUS_USER created"
}

clone_repository() {
    log_step "Cloning repository to $INSTALL_DIR..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Directory already exists, removing..."
        rm -rf "$INSTALL_DIR"
    fi
    
    git clone "$REPO_URL" "$INSTALL_DIR"
    chown -R $TERMINUS_USER:$TERMINUS_USER "$INSTALL_DIR"
    
    log_success "Repository cloned"
}

build_application() {
    log_step "Installing dependencies and building application..."
    log_warning "This may take several minutes..."
    
    su - "$TERMINUS_USER" -c "cd $INSTALL_DIR && npm install"
    su - "$TERMINUS_USER" -c "cd $INSTALL_DIR && npm run build"
    
    log_success "Application built successfully"
}

configure_environment() {
    log_step "Configuring environment variables..."
    
    # PTY Server .env
    local PTY_ENV="$INSTALL_DIR/apps/pty-server/.env"
    cat > "$PTY_ENV" << EOF
WS_PORT=3001
OPENCODE_PATH=$OPENCODE_PATH
NODE_ENV=production
EOF
    
    # Web Frontend .env.local
    local WEB_ENV="$INSTALL_DIR/apps/web/.env.local"
    local WS_PROTOCOL="ws"
    if [[ "$USE_HTTPS" = true ]]; then
        WS_PROTOCOL="wss"
    fi
    
    cat > "$WEB_ENV" << EOF
NEXT_PUBLIC_WS_URL=${WS_PROTOCOL}://${DOMAIN}/ws
NODE_ENV=production
EOF
    
    chown $TERMINUS_USER:$TERMINUS_USER "$PTY_ENV" "$WEB_ENV"
    
    log_success "Environment configured"
}

configure_pm2() {
    log_step "Configuring PM2 ecosystem..."
    
    local ECOSYSTEM_FILE="$INSTALL_DIR/ecosystem.config.js"
    
    cat > "$ECOSYSTEM_FILE" << EOF
module.exports = {
  apps: [
    {
      name: 'terminus-web',
      cwd: '$INSTALL_DIR/apps/web',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/terminus-web-error.log',
      out_file: '/var/log/pm2/terminus-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'terminus-pty',
      cwd: '$INSTALL_DIR/apps/pty-server',
      script: 'npm',
      args: 'start',
      env: {
        WS_PORT: 3001,
        OPENCODE_PATH: '$OPENCODE_PATH',
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/terminus-pty-error.log',
      out_file: '/var/log/pm2/terminus-pty-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF
    
    chown $TERMINUS_USER:$TERMINUS_USER "$ECOSYSTEM_FILE"
    
    mkdir -p /var/log/pm2
    chown -R $TERMINUS_USER:$TERMINUS_USER /var/log/pm2
    
    log_success "PM2 configured"
}

configure_caddy() {
    log_step "Configuring Caddy reverse proxy..."
    
    local CADDY_CONFIG="/etc/caddy/Caddyfile"
    
    # Backup existing config
    if [[ -f "$CADDY_CONFIG" ]]; then
        cp "$CADDY_CONFIG" "${CADDY_CONFIG}.backup.$(date +%s)"
    fi
    
    # Create Caddy config
    cat > "$CADDY_CONFIG" << EOF
$DOMAIN {
EOF
    
    if [[ "$USE_HTTPS" = true ]]; then
        cat >> "$CADDY_CONFIG" << EOF
    tls $SSL_EMAIL
EOF
    else
        cat >> "$CADDY_CONFIG" << EOF
    tls internal
EOF
    fi
    
    cat >> "$CADDY_CONFIG" << 'EOF'

    reverse_proxy localhost:3000

    @websocket {
        path /ws
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:3001

    log {
        output file /var/log/caddy/terminus.log
        format json
    }

    encode gzip

    header {
        -Server
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }
}
EOF
    
    mkdir -p /var/log/caddy
    touch /var/log/caddy/terminus.log
    chown -R caddy:caddy /var/log/caddy
    
    caddy fmt --overwrite "$CADDY_CONFIG"
    caddy validate --config "$CADDY_CONFIG"
    
    # Reload Caddy
    systemctl reload caddy
    
    log_success "Caddy configured and reloaded"
}

start_services() {
    log_step "Starting services with PM2..."
    
    # Start PM2 apps
    su - "$TERMINUS_USER" -c "cd $INSTALL_DIR && pm2 start ecosystem.config.js"
    su - "$TERMINUS_USER" -c "pm2 save"
    
    # Setup PM2 startup script
    local STARTUP_CMD=$(su - "$TERMINUS_USER" -c "pm2 startup systemd -u $TERMINUS_USER --hp /home/$TERMINUS_USER" | tail -n 1)
    eval "$STARTUP_CMD"
    
    # Ensure Caddy is enabled and running
    systemctl enable caddy
    systemctl restart caddy
    
    log_success "Services started"
}

configure_firewall() {
    log_step "Configuring UFW firewall..."
    
    if ! command -v ufw &> /dev/null; then
        log_warning "UFW not installed, skipping firewall configuration"
        return
    fi
    
    # Allow HTTP/HTTPS
    ufw allow 80/tcp comment 'Caddy HTTP'
    ufw allow 443/tcp comment 'Caddy HTTPS'
    
    # Deny direct access to application ports
    ufw deny 3000/tcp comment 'Block direct access to Next.js'
    ufw deny 3001/tcp comment 'Block direct access to PTY server'
    
    # Ensure SSH is allowed
    ufw allow ssh comment 'SSH access'
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        log_warning "UFW is not enabled. Enable it manually with: ufw enable"
    fi
    
    log_success "Firewall rules configured"
}

verify_installation() {
    log_step "Verifying installation..."
    
    local ERRORS=0
    
    # Check if PM2 apps are running
    if ! su - "$TERMINUS_USER" -c "pm2 list" | grep -q "terminus-web.*online"; then
        log_error "terminus-web is not running"
        ((ERRORS++))
    fi
    
    if ! su - "$TERMINUS_USER" -c "pm2 list" | grep -q "terminus-pty.*online"; then
        log_error "terminus-pty is not running"
        ((ERRORS++))
    fi
    
    # Check if Caddy is running
    if ! systemctl is-active --quiet caddy; then
        log_error "Caddy is not running"
        ((ERRORS++))
    fi
    
    # Check if ports are listening
    sleep 3
    if ! ss -tlnp | grep -q ":3000"; then
        log_error "Port 3000 (Next.js) is not listening"
        ((ERRORS++))
    fi
    
    if ! ss -tlnp | grep -q ":3001"; then
        log_error "Port 3001 (PTY server) is not listening"
        ((ERRORS++))
    fi
    
    if [[ $ERRORS -gt 0 ]]; then
        log_error "Verification failed with $ERRORS errors"
        return 1
    fi
    
    log_success "All services verified"
}

print_summary() {
    local PROTOCOL="http"
    if [[ "$USE_HTTPS" = true ]]; then
        PROTOCOL="https"
    fi
    
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                ║${NC}"
    echo -e "${GREEN}║     TERMINUS-WEB INSTALLATION COMPLETE! 🎉     ║${NC}"
    echo -e "${GREEN}║                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}Access your terminal:${NC}"
    echo -e "  ${GREEN}${PROTOCOL}://${DOMAIN}${NC}"
    echo
    echo -e "${CYAN}Service Management:${NC}"
    echo -e "  Status:  ${YELLOW}sudo su - $TERMINUS_USER -c 'pm2 status'${NC}"
    echo -e "  Logs:    ${YELLOW}sudo su - $TERMINUS_USER -c 'pm2 logs'${NC}"
    echo -e "  Restart: ${YELLOW}sudo su - $TERMINUS_USER -c 'pm2 restart all'${NC}"
    echo -e "  Stop:    ${YELLOW}sudo su - $TERMINUS_USER -c 'pm2 stop all'${NC}"
    echo
    echo -e "${CYAN}Caddy Web Server:${NC}"
    echo -e "  Status:  ${YELLOW}sudo systemctl status caddy${NC}"
    echo -e "  Restart: ${YELLOW}sudo systemctl restart caddy${NC}"
    echo -e "  Logs:    ${YELLOW}sudo journalctl -u caddy -f${NC}"
    echo
    echo -e "${CYAN}Installation Details:${NC}"
    echo -e "  Install Dir:  $INSTALL_DIR"
    echo -e "  System User:  $TERMINUS_USER"
    echo -e "  OpenCode:     $OPENCODE_PATH"
    echo -e "  Config File:  /etc/caddy/Caddyfile"
    echo
    if [[ "$USE_HTTPS" = true ]]; then
        echo -e "${CYAN}TLS Certificate:${NC}"
        echo -e "  Let's Encrypt will automatically provision certificate"
        echo -e "  Email: $SSL_EMAIL"
        echo
    fi
    echo -e "${CYAN}Uninstall:${NC}"
    echo -e "  ${YELLOW}sudo su - $TERMINUS_USER -c 'pm2 delete all && pm2 save'${NC}"
    echo -e "  ${YELLOW}sudo rm -rf $INSTALL_DIR${NC}"
    echo -e "  ${YELLOW}sudo userdel -r $TERMINUS_USER${NC}"
    echo
}

main() {
    print_banner
    
    check_root
    detect_os
    check_existing_installation
    gather_user_input
    
    echo
    log_step "Starting installation..."
    echo
    
    install_dependencies
    create_system_user
    clone_repository
    build_application
    configure_environment
    configure_pm2
    configure_caddy
    start_services
    configure_firewall
    verify_installation
    
    print_summary
}

main "$@"
