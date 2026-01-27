#!/bin/bash

set -euo pipefail

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/terminus-web"
TERMINUS_USER="terminus"

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
║       TERMINUS-WEB UNINSTALL SCRIPT            ║
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

stop_pm2_processes() {
    log_step "Stopping PM2 processes..."
    
    if id "$TERMINUS_USER" &>/dev/null; then
        # Stop all PM2 processes
        sudo -u "$TERMINUS_USER" pm2 stop all 2>/dev/null || true
        log_success "PM2 processes stopped"
    else
        log_warning "User $TERMINUS_USER does not exist, skipping PM2 stop"
    fi
}

remove_pm2_processes() {
    log_step "Removing PM2 processes..."
    
    if id "$TERMINUS_USER" &>/dev/null; then
        # Delete all PM2 processes
        sudo -u "$TERMINUS_USER" pm2 delete all 2>/dev/null || true
        sudo -u "$TERMINUS_USER" pm2 save 2>/dev/null || true
        log_success "PM2 processes removed"
    else
        log_warning "User $TERMINUS_USER does not exist, skipping PM2 deletion"
    fi
}

remove_pm2_startup() {
    log_step "Removing PM2 systemd startup..."
    
    if id "$TERMINUS_USER" &>/dev/null && command -v pm2 &> /dev/null; then
        # Remove PM2 startup configuration
        pm2 unstartup systemd -u "$TERMINUS_USER" --hp "/home/$TERMINUS_USER" 2>/dev/null || true
        log_success "PM2 startup removed"
    else
        log_warning "PM2 or user not found, skipping startup removal"
    fi
}

remove_application_directory() {
    log_step "Removing application directory..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        rm -rf "$INSTALL_DIR"
        log_success "Application directory removed: $INSTALL_DIR"
    else
        log_warning "Application directory not found: $INSTALL_DIR"
    fi
}

restore_caddy_config() {
    log_step "Restoring Caddy configuration..."
    
    if [[ -f /etc/caddy/Caddyfile ]]; then
        # Find most recent backup
        local BACKUP=$(ls -t /etc/caddy/Caddyfile.backup.* 2>/dev/null | head -1)
        
        if [[ -n "$BACKUP" && -f "$BACKUP" ]]; then
            cp "$BACKUP" /etc/caddy/Caddyfile
            log_success "Caddy configuration restored from: $BACKUP"
        else
            # No backup found, remove the Caddyfile
            rm -f /etc/caddy/Caddyfile
            log_warning "No backup found, Caddyfile removed"
        fi
    else
        log_warning "Caddyfile not found, skipping"
    fi
}

restart_caddy() {
    log_step "Restarting Caddy..."
    
    if command -v caddy &> /dev/null && systemctl list-unit-files | grep -q "^caddy.service"; then
        systemctl restart caddy 2>/dev/null || true
        log_success "Caddy restarted"
    else
        log_warning "Caddy not installed or not managed by systemd, skipping"
    fi
}

remove_firewall_rules() {
    log_step "Removing firewall rules..."
    
    if ! command -v ufw &> /dev/null; then
        log_warning "UFW not installed, skipping firewall cleanup"
        return
    fi
    
    # Remove Terminus-specific firewall rules
    ufw delete allow 80/tcp 2>/dev/null || true
    ufw delete allow 443/tcp 2>/dev/null || true
    ufw delete deny 3000/tcp 2>/dev/null || true
    ufw delete deny 3001/tcp 2>/dev/null || true
    
    log_success "Firewall rules removed"
}

remove_log_files() {
    log_step "Removing log files..."
    
    # Remove PM2 logs
    if [[ -d /var/log/pm2 ]]; then
        rm -rf /var/log/pm2
        log_success "PM2 logs removed"
    fi
    
    # Remove Caddy logs for terminus
    if [[ -f /var/log/caddy/terminus.log ]]; then
        rm -f /var/log/caddy/terminus.log
        log_success "Caddy logs removed"
    fi
}

remove_terminus_user() {
    log_step "Checking terminus user..."
    
    if ! id "$TERMINUS_USER" &>/dev/null; then
        log_warning "User $TERMINUS_USER does not exist, skipping"
        return
    fi
    
    # In non-interactive mode, we skip user removal by default
    # Users can manually remove with: userdel -r terminus
    log_warning "System user '$TERMINUS_USER' still exists"
    log_warning "To remove manually, run: sudo userdel -r $TERMINUS_USER"
}

verify_removal() {
    log_step "Verifying removal..."
    
    local WARNINGS=0
    
    # Check if directory still exists
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Application directory still exists: $INSTALL_DIR"
        ((WARNINGS++))
    fi
    
    # Check if PM2 processes are still running
    if id "$TERMINUS_USER" &>/dev/null; then
        if sudo -u "$TERMINUS_USER" pm2 list 2>/dev/null | grep -q "online"; then
            log_warning "Some PM2 processes are still running"
            ((WARNINGS++))
        fi
    fi
    
    # Check if ports are still listening
    if ss -tlnp 2>/dev/null | grep -q ":3000"; then
        log_warning "Port 3000 is still in use"
        ((WARNINGS++))
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":3001"; then
        log_warning "Port 3001 is still in use"
        ((WARNINGS++))
    fi
    
    if [[ $WARNINGS -gt 0 ]]; then
        log_warning "Removal completed with $WARNINGS warnings (see above)"
    else
        log_success "All components removed successfully"
    fi
}

print_summary() {
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                ║${NC}"
    echo -e "${GREEN}║     TERMINUS-WEB UNINSTALL COMPLETE! ✓         ║${NC}"
    echo -e "${GREEN}║                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}Removed Components:${NC}"
    echo -e "  ${GREEN}✓${NC} PM2 processes (terminus-web, terminus-pty)"
    echo -e "  ${GREEN}✓${NC} PM2 systemd startup"
    echo -e "  ${GREEN}✓${NC} Application directory ($INSTALL_DIR)"
    echo -e "  ${GREEN}✓${NC} Caddy configuration restored"
    echo -e "  ${GREEN}✓${NC} Firewall rules removed"
    echo -e "  ${GREEN}✓${NC} Log files removed"
    echo
    echo -e "${CYAN}Not Removed (may be used by other applications):${NC}"
    echo -e "  ${YELLOW}•${NC} Node.js"
    echo -e "  ${YELLOW}•${NC} PM2 (global package)"
    echo -e "  ${YELLOW}•${NC} Caddy web server"
    echo -e "  ${YELLOW}•${NC} System user: $TERMINUS_USER"
    echo
    echo -e "${CYAN}Manual Cleanup (if needed):${NC}"
    echo -e "  Remove user:    ${YELLOW}sudo userdel -r $TERMINUS_USER${NC}"
    echo -e "  Remove Node.js: ${YELLOW}sudo apt remove nodejs${NC}"
    echo -e "  Remove PM2:     ${YELLOW}sudo npm uninstall -g pm2${NC}"
    echo -e "  Remove Caddy:   ${YELLOW}sudo apt remove caddy${NC}"
    echo
}

main() {
    print_banner
    
    check_root
    
    echo
    log_step "Starting uninstallation..."
    echo
    
    stop_pm2_processes
    remove_pm2_processes
    remove_pm2_startup
    remove_application_directory
    remove_log_files
    restore_caddy_config
    restart_caddy
    remove_firewall_rules
    remove_terminus_user
    verify_removal
    
    print_summary
}

main "$@"
