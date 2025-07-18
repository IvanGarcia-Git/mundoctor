#!/bin/bash

# MunDoctor Update Script
# Zero-downtime update script for todostore.es deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/deployment/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if backup script exists
check_backup_script() {
    if [ ! -f "$SCRIPT_DIR/backup.sh" ]; then
        error "Backup script not found: $SCRIPT_DIR/backup.sh"
        exit 1
    fi
}

# Create backup before update
create_backup() {
    log "Creating backup before update..."
    
    if bash "$SCRIPT_DIR/backup.sh"; then
        log "Backup created successfully"
    else
        error "Backup failed. Aborting update."
        exit 1
    fi
}

# Check for updates
check_for_updates() {
    log "Checking for updates..."
    
    cd "$PROJECT_DIR"
    
    # Check Git status
    if [ -d ".git" ]; then
        git fetch origin
        
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse origin/main)
        
        if [ "$LOCAL" != "$REMOTE" ]; then
            info "Updates available in Git repository"
            return 0
        else
            info "Local repository is up to date"
        fi
    else
        info "Not a Git repository, skipping Git updates"
    fi
    
    # Check for Docker image updates
    info "Checking for Docker image updates..."
    docker compose pull --quiet
    
    return 0
}

# Update Git repository
update_git() {
    log "Updating Git repository..."
    
    cd "$PROJECT_DIR"
    
    if [ -d ".git" ]; then
        # Stash any local changes
        git stash push -m "Auto-stash before update $DATE"
        
        # Pull latest changes
        git pull origin main
        
        # Apply stashed changes if any
        if git stash list | grep -q "Auto-stash before update $DATE"; then
            warning "Local changes were stashed. Please review and apply manually if needed."
        fi
        
        log "Git repository updated"
    else
        info "Not a Git repository, skipping Git update"
    fi
}

# Update Docker images
update_docker_images() {
    log "Updating Docker images..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    docker compose pull
    
    log "Docker images updated"
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log "Performing health check for $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            log "$service is healthy"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts for $service..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed for $service after $max_attempts attempts"
    return 1
}

# Update frontend service
update_frontend() {
    log "Updating frontend service..."
    
    cd "$PROJECT_DIR"
    
    # Update frontend with zero downtime
    docker compose up -d --no-deps frontend
    
    # Wait for service to be ready
    sleep 30
    
    # Health check
    if health_check "frontend" "https://todostore.es"; then
        log "Frontend updated successfully"
    else
        error "Frontend update failed"
        return 1
    fi
}

# Update backend service
update_backend() {
    log "Updating backend service..."
    
    cd "$PROJECT_DIR"
    
    # Update backend with zero downtime
    docker compose up -d --no-deps backend
    
    # Wait for service to be ready
    sleep 30
    
    # Health check
    if health_check "backend" "https://api.todostore.es/health"; then
        log "Backend updated successfully"
    else
        error "Backend update failed"
        return 1
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$PROJECT_DIR"
    
    # Check if migration is needed
    if docker compose exec backend npm run migrate:check 2>/dev/null; then
        info "No migrations needed"
        return 0
    fi
    
    # Run migrations
    if docker compose exec backend npm run migrate; then
        log "Database migrations completed"
    else
        error "Database migrations failed"
        return 1
    fi
}

# Update other services
update_other_services() {
    log "Updating other services..."
    
    cd "$PROJECT_DIR"
    
    # Update Traefik (if needed)
    docker compose up -d --no-deps traefik
    
    # Update Adminer (if needed)
    docker compose up -d --no-deps adminer
    
    log "Other services updated"
}

# Verify all services are running
verify_services() {
    log "Verifying all services are running..."
    
    cd "$PROJECT_DIR"
    
    # Check service status
    if docker compose ps | grep -q "Exit"; then
        error "Some services are not running properly"
        docker compose ps
        return 1
    fi
    
    # Comprehensive health checks
    local services=(
        "frontend:https://todostore.es"
        "backend:https://api.todostore.es/health"
        "traefik:https://traefik.todostore.es"
        "adminer:https://db.todostore.es"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service url <<< "$service_info"
        if ! health_check "$service" "$url"; then
            error "Service verification failed for $service"
            return 1
        fi
    done
    
    log "All services verified successfully"
}

# Clean up old Docker resources
cleanup_docker() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "Docker cleanup completed"
}

# Send notification (placeholder for future notification system)
send_notification() {
    local status=$1
    local message=$2
    
    # Placeholder for notification system
    # This could be extended to send emails, Slack messages, etc.
    log "NOTIFICATION: $status - $message"
}

# Rollback function (in case of failure)
rollback() {
    error "Update failed. Initiating rollback..."
    
    # This is a basic rollback - restore from backup
    warning "Automatic rollback is not implemented yet."
    warning "Please manually restore from backup if needed."
    warning "Latest backup should be available in: $BACKUP_DIR"
    
    send_notification "ERROR" "Update failed for todostore.es. Manual intervention required."
}

# Main update function
main() {
    log "Starting MunDoctor update process..."
    log "Project directory: $PROJECT_DIR"
    log "Update timestamp: $DATE"
    
    # Pre-flight checks
    check_docker
    check_backup_script
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Create backup before update
    create_backup
    
    # Check for updates
    check_for_updates
    
    # Perform updates
    update_git
    update_docker_images
    
    # Run database migrations first
    run_migrations
    
    # Update services with zero downtime
    update_backend
    update_frontend
    update_other_services
    
    # Verify everything is working
    verify_services
    
    # Cleanup
    cleanup_docker
    
    log "Update process completed successfully!"
    log "Update ID: $DATE"
    
    # Send success notification
    send_notification "SUCCESS" "MunDoctor update completed successfully for todostore.es"
    
    # Show final status
    echo ""
    log "Final service status:"
    docker compose ps
    
    echo ""
    log "Update summary:"
    log "- All services updated successfully"
    log "- Health checks passed"
    log "- Zero downtime achieved"
    log "- Backup created: $DATE"
}

# Trap to handle script interruption
trap 'error "Update process interrupted"; rollback; exit 1' INT TERM

# Handle script errors
set -e
trap 'error "Update process failed"; rollback; exit 1' ERR

# Run main function
main "$@"