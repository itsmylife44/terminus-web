# Terminus-Web Installer Script

## Context

### Original Request
Create a professional install script for Ubuntu 24.04 that:
- Asks for domain/IP interactively
- Creates system user with proper permissions
- Installs all dependencies (Node.js, PM2, Caddy)
- Configures Caddy with automatic HTTPS (Let's Encrypt)
- Sets up firewall rules
- Provides uninstall script
- Updates README with one-liner install

### Interview Summary
**Key Decisions**:
- **Reverse Proxy**: Caddy (automatic HTTPS, simplest configuration)
- **UI Mode**: Terminal with colors (no whiptail dependencies)
- **Target OS**: Ubuntu 24.04 LTS (with 22.04 fallback)
- **Process Manager**: PM2 (already configured in project)

**Research Findings** (from GitHub best practices):
- Use `set -euo pipefail` for safety
- Detect OS via `/etc/os-release`
- Create system users with `useradd -r -s /bin/bash`
- Caddy handles HTTPS automatically with Let's Encrypt
- Use trap for error handling
- Color output with ANSI codes for better UX

---

## Work Objectives

### Core Objective
Create a production-ready one-liner installer for Terminus-Web that automates the entire server setup process on Ubuntu 24.04.

### Concrete Deliverables
1. `scripts/install.sh` - Main installer script (~400 lines)
2. `scripts/uninstall.sh` - Clean removal script (~100 lines)
3. Updated `README.md` - One-liner install section

### Definition of Done
- [ ] `curl ... | sudo bash` installs Terminus-Web completely
- [ ] User can access terminal at configured domain
- [ ] HTTPS works automatically with domain (Let's Encrypt)
- [ ] Uninstall script removes everything cleanly
- [ ] README has clear install instructions

### Must Have
- Interactive domain/IP prompt with validation
- OpenCode path configuration
- System user creation (terminus)
- Node.js 20 installation
- PM2 setup with systemd integration
- Caddy reverse proxy with WebSocket support
- Automatic HTTPS for domains (Let's Encrypt)
- UFW firewall configuration
- Colored terminal output
- Error handling with trap
- Post-install summary with URLs and commands

### Must NOT Have (Guardrails)
- Nginx (using Caddy instead)
- Docker/containerization
- Support for non-Ubuntu distros
- Whiptail/dialog UI (keep it simple)
- Interactive prompts during uninstall (force mode)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (shell scripts)
- **User wants tests**: Manual verification
- **Framework**: None (bash scripts)

### Manual QA Approach
Test on fresh Ubuntu 24.04 VM:
1. Run install script with domain
2. Verify services running (PM2 status)
3. Access web interface
4. Test uninstall removes everything

---

## TODOs

- [x] 1. Create install.sh script

  **What to do**:
  - Create comprehensive bash installer at `scripts/install.sh`
  - Implement all sections:
    - Pre-flight checks (root, OS detection, existing install)
    - User input (domain, OpenCode path, email for SSL)
    - Dependencies (apt packages, Node.js, PM2, Caddy)
    - User creation (terminus system user)
    - Repository clone and build
    - Environment configuration (.env files)
    - Caddy configuration (reverse proxy + WebSocket)
    - PM2 configuration (ecosystem.config.js update)
    - Firewall rules (UFW)
    - Post-install summary
  - Add colored output and progress indicators
  - Handle errors gracefully with trap

  **Must NOT do**:
  - Add whiptail/dialog UI
  - Support other distros

  **References**:
  - Existing `scripts/install-opencode.sh` for patterns
  - Research findings from librarian agent

  **Acceptance Criteria**:
  - [ ] Script is executable (`chmod +x`)
  - [ ] `bash -n scripts/install.sh` shows no syntax errors
  - [ ] Script detects Ubuntu correctly
  - [ ] User input validation works
  - [ ] All sections have colored output

  **Commit**: NO (commit with all scripts together)

---

- [x] 2. Create uninstall.sh script

  **What to do**:
  - Create removal script at `scripts/uninstall.sh`
  - Stop and remove PM2 processes
  - Remove Caddy configuration
  - Delete application directory
  - Optionally remove terminus user
  - Remove firewall rules
  - Show completion message

  **Must NOT do**:
  - Remove Node.js/Caddy packages (might be used by other apps)
  - Interactive prompts (use force mode)

  **Acceptance Criteria**:
  - [ ] Script removes all Terminus-specific files
  - [ ] Services are stopped before removal
  - [ ] Caddy is not uninstalled (only config removed)

  **Commit**: NO (commit with all scripts together)

---

- [x] 3. Update README.md with install instructions

  **What to do**:
  - Add "Quick Install (Ubuntu 24.04)" section at top
  - Include one-liner install command
  - Add requirements section
  - Document what the installer does
  - Add uninstall instructions
  - Update "Production Deployment" section

  **README additions**:
  ```markdown
  ## Quick Install (Ubuntu 24.04)

  ```bash
  curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/main/scripts/install.sh | sudo bash
  ```

  This will:
  - Install Node.js 20, PM2, and Caddy
  - Create a `terminus` system user
  - Clone and build the application
  - Configure automatic HTTPS (for domains)
  - Set up firewall rules

  ### Requirements
  - Ubuntu 24.04 LTS (22.04 also supported)
  - Root access (sudo)
  - A domain pointing to your server (for HTTPS)
  - OpenCode installed (or install during setup)
  ```

  **Acceptance Criteria**:
  - [ ] One-liner is prominently displayed
  - [ ] Requirements are clear
  - [ ] Uninstall instructions included

  **Commit**: NO (commit with all scripts together)

---

- [ ] 4. Test scripts and commit

  **What to do**:
  - Verify all scripts with `bash -n` (syntax check)
  - Make scripts executable
  - Commit all changes with descriptive message
  - Push to GitHub

  **Acceptance Criteria**:
  - [ ] `bash -n scripts/install.sh` → no errors
  - [ ] `bash -n scripts/uninstall.sh` → no errors
  - [ ] Both scripts are executable
  - [ ] All changes committed and pushed

  **Commit**: YES
  - Message: `feat: add production installer for Ubuntu 24.04 with Caddy`
  - Files: `scripts/install.sh`, `scripts/uninstall.sh`, `README.md`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 4 | `feat: add production installer for Ubuntu 24.04 with Caddy` | `scripts/install.sh`, `scripts/uninstall.sh`, `README.md` |

---

## Success Criteria

### Verification Commands
```bash
# Syntax check
bash -n scripts/install.sh
bash -n scripts/uninstall.sh

# On Ubuntu 24.04 VM:
curl -fsSL https://raw.githubusercontent.com/.../install.sh | sudo bash
# → Should complete without errors
# → Should show access URL at the end

# Verify services
sudo -u terminus pm2 status
# → Should show terminus-web and terminus-pty running

# Test uninstall
curl -fsSL https://raw.githubusercontent.com/.../uninstall.sh | sudo bash
# → Should remove everything cleanly
```

### Final Checklist
- [ ] Install script works on fresh Ubuntu 24.04
- [ ] HTTPS works with real domain
- [ ] HTTP works with localhost/IP
- [ ] Uninstall removes all Terminus-specific files
- [ ] README has clear install instructions
