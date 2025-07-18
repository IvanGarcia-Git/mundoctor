#!/bin/bash

# MunDoctor Backup Script
# Automated backup solution for todostore.es deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/deployment/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
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

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    # Check if postgres container is running
    if ! docker compose -f "$PROJECT_DIR/docker-compose.yml" ps postgres | grep -q "Up"; then
        error "PostgreSQL container is not running"
        return 1
    fi
    
    # Create SQL dump
    docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres pg_dump -U mundoctor_user -d mundoctor_prod > "$BACKUP_DIR/db_backup_$DATE.sql"
    
    if [ $? -eq 0 ]; then
        log "Database backup completed: db_backup_$DATE.sql"
        
        # Compress the backup
        gzip "$BACKUP_DIR/db_backup_$DATE.sql"
        log "Database backup compressed: db_backup_$DATE.sql.gz"
    else
        error "Database backup failed"
        return 1
    fi
}

# Volume backup
backup_volumes() {
    log "Starting volume backup..."
    
    # Backup PostgreSQL data volume
    docker run --rm \
        -v postgres_data:/data \
        -v "$BACKUP_DIR:/backup" \
        alpine:latest \
        tar czf "/backup/postgres_volume_$DATE.tar.gz" /data
    
    if [ $? -eq 0 ]; then
        log "PostgreSQL volume backup completed: postgres_volume_$DATE.tar.gz"
    else
        error "PostgreSQL volume backup failed"
        return 1
    fi
    
    # Backup Redis data volume
    docker run --rm \
        -v redis_data:/data \
        -v "$BACKUP_DIR:/backup" \
        alpine:latest \
        tar czf "/backup/redis_volume_$DATE.tar.gz" /data
    
    if [ $? -eq 0 ]; then
        log "Redis volume backup completed: redis_volume_$DATE.tar.gz"
    else
        error "Redis volume backup failed"
        return 1
    fi
}

# Configuration backup
backup_configuration() {
    log "Starting configuration backup..."
    
    # Create configuration backup
    tar czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" \
        "$PROJECT_DIR/docker-compose.yml" \
        "$PROJECT_DIR/traefik/" \
        "$PROJECT_DIR/.env.production" \
        "$PROJECT_DIR/backend/migrations-consolidated/" \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Configuration backup completed: config_backup_$DATE.tar.gz"
    else
        error "Configuration backup failed"
        return 1
    fi
}

# Upload files backup
backup_uploads() {
    log "Starting uploads backup..."
    
    # Check if uploads directory exists
    if [ -d "$PROJECT_DIR/backend/uploads" ]; then
        tar czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" "$PROJECT_DIR/backend/uploads/"
        
        if [ $? -eq 0 ]; then
            log "Uploads backup completed: uploads_backup_$DATE.tar.gz"
        else
            error "Uploads backup failed"
            return 1
        fi
    else
        warning "Uploads directory not found, skipping uploads backup"
    fi
}

# SSL certificates backup
backup_certificates() {
    log "Starting SSL certificates backup..."
    
    if [ -f "$PROJECT_DIR/traefik/acme/acme.json" ]; then
        cp "$PROJECT_DIR/traefik/acme/acme.json" "$BACKUP_DIR/acme_backup_$DATE.json"
        
        if [ $? -eq 0 ]; then
            log "SSL certificates backup completed: acme_backup_$DATE.json"
        else
            error "SSL certificates backup failed"
            return 1
        fi
    else
        warning "ACME certificates file not found, skipping certificates backup"
    fi
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    MANIFEST_FILE="$BACKUP_DIR/backup_manifest_$DATE.txt"
    
    cat > "$MANIFEST_FILE" << EOF
MunDoctor Backup Manifest
========================
Date: $(date)
Domain: todostore.es
Backup ID: $DATE

Files included in this backup:
$(ls -la "$BACKUP_DIR"/*$DATE* 2>/dev/null || echo "No backup files found")

System Information:
- Docker Version: $(docker --version 2>/dev/null || echo "N/A")
- Docker Compose Version: $(docker compose version 2>/dev/null || echo "N/A")
- Server: $(hostname)
- Disk Space: $(df -h "$BACKUP_DIR" | tail -1)

Notes:
- Database: PostgreSQL backup with full schema and data
- Volumes: Docker volumes for PostgreSQL and Redis
- Configuration: All Traefik, Docker Compose, and environment files
- Uploads: User-uploaded files (medical documents, avatars)
- SSL: Let's Encrypt certificates
EOF
    
    log "Backup manifest created: backup_manifest_$DATE.txt"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    
    # Find and delete old backup files
    find "$BACKUP_DIR" -name "*backup_*" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*volume_*" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*manifest_*" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "acme_backup_*" -type f -mtime +$RETENTION_DAYS -delete
    
    log "Old backups cleaned up"
}

# Calculate backup size
calculate_backup_size() {
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR"/*$DATE* 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
    log "Total backup size: $(du -sh "$BACKUP_DIR"/*$DATE* 2>/dev/null | awk '{sum+=$1} END {print sum "B"}' || echo "0B")"
}

# Main backup function
main() {
    log "Starting MunDoctor backup process..."
    log "Project directory: $PROJECT_DIR"
    log "Backup directory: $BACKUP_DIR"
    
    # Pre-flight checks
    check_docker
    create_backup_dir
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Perform backups
    backup_database
    backup_volumes
    backup_configuration
    backup_uploads
    backup_certificates
    create_manifest
    
    # Post-backup tasks
    calculate_backup_size
    cleanup_old_backups
    
    log "Backup process completed successfully!"
    log "Backup ID: $DATE"
    
    # List all files created in this backup
    echo ""
    log "Files created in this backup:"
    ls -la "$BACKUP_DIR"/*$DATE* 2>/dev/null || echo "No backup files found"
}

# Trap to handle script interruption
trap 'error "Backup process interrupted"; exit 1' INT TERM

# Run main function
main "$@"