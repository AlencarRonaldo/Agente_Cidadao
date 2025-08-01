#!/bin/bash

# Deployment Orchestrator Script
# Sistema de Deploy Zero-Downtime com Blue-Green Strategy

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="$DEPLOYMENT_DIR/docker-compose.production.yml"
HEALTH_CHECK_TIMEOUT=300 # 5 minutes
HEALTH_CHECK_INTERVAL=10 # 10 seconds
DEPLOYMENT_ID="deploy_$(date +%s)"
DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Load environment configuration
if [ -f "$DEPLOYMENT_DIR/.env" ]; then
    source "$DEPLOYMENT_DIR/.env"
fi

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Detect current active environment
detect_active_environment() {
    log "Detecting active environment..."
    
    # Check nginx configuration or health monitor
    local blue_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health/simple --connect-timeout 5 || echo "000")
    
    if [ "$blue_status" = "200" ]; then
        # Try to determine which environment is active
        local active_env=$(curl -s http://localhost/health/simple | jq -r '.environment // "blue"' 2>/dev/null || echo "blue")
        echo "$active_env"
    else
        echo "blue"  # Default to blue if detection fails
    fi
}

# Determine target environment for deployment
get_target_environment() {
    local current_env="$1"
    if [ "$current_env" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Pre-deployment validation
validate_deployment_prerequisites() {
    log "Validating deployment prerequisites..."
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check required files
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    # Check disk space (minimum 2GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then  # 2GB in KB
        log_error "Insufficient disk space. At least 2GB required."
        exit 1
    fi
    
    # Validate environment variables
    local required_vars=("DATABASE_URL" "REDIS_URL")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_warning "Environment variable $var is not set"
        fi
    done
    
    log_success "Prerequisites validation passed"
}

# Build new version
build_new_version() {
    local target_env="$1"
    log "Building new version for $target_env environment..."
    
    # Set build environment variables
    export ENVIRONMENT_SLOT="$target_env"
    export DEPLOYMENT_ID="$DEPLOYMENT_ID"
    export DEPLOYMENT_TIME="$DEPLOYMENT_TIME"
    
    # Build the application
    cd "$PROJECT_ROOT"
    
    log "Building Docker image..."
    docker build -f "$DEPLOYMENT_DIR/Dockerfile.production" -t "bot-denuncia:$target_env-$DEPLOYMENT_ID" .
    
    if [ $? -ne 0 ]; then
        log_error "Docker build failed"
        exit 1
    fi
    
    # Tag as latest for the environment
    docker tag "bot-denuncia:$target_env-$DEPLOYMENT_ID" "bot-denuncia:$target_env-latest"
    
    log_success "Build completed successfully"
}

# Database migration (zero-downtime)
run_database_migration() {
    log "Running database migrations..."
    
    # Create backup first
    create_database_backup
    
    # Run migrations in a way that's compatible with both environments
    cd "$PROJECT_ROOT"
    
    # Use a temporary container to run migrations
    docker run --rm \
        --network bot-denuncia-network \
        -e DATABASE_URL="$DATABASE_URL" \
        -v "$PROJECT_ROOT:/app" \
        -w /app \
        node:20-alpine \
        sh -c "npm ci --production && npx prisma migrate deploy"
    
    if [ $? -ne 0 ]; then
        log_error "Database migration failed"
        log "Attempting to restore database backup..."
        restore_database_backup
        exit 1
    fi
    
    log_success "Database migration completed"
}

# Create database backup
create_database_backup() {
    log "Creating database backup..."
    
    local backup_file="$DEPLOYMENT_DIR/backups/db_backup_$DEPLOYMENT_ID.sql"
    mkdir -p "$(dirname "$backup_file")"
    
    # Extract database connection details
    local db_container="bot-denuncia-db"
    
    docker exec "$db_container" pg_dump -U admin botdenuncia > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log_success "Database backup created: $backup_file"
    else
        log_warning "Database backup failed (deployment will continue)"
    fi
}

# Restore database backup
restore_database_backup() {
    local backup_file="$DEPLOYMENT_DIR/backups/db_backup_$DEPLOYMENT_ID.sql"
    
    if [ -f "$backup_file" ]; then
        log "Restoring database backup..."
        
        local db_container="bot-denuncia-db"
        docker exec -i "$db_container" psql -U admin -d botdenuncia < "$backup_file"
        
        if [ $? -eq 0 ]; then
            log_success "Database backup restored"
        else
            log_error "Database backup restoration failed"
        fi
    else
        log_error "No backup file found for restoration"
    fi
}

# Deploy to target environment
deploy_to_environment() {
    local target_env="$1"
    log "Deploying to $target_env environment..."
    
    # Set environment variables for deployment
    export ENVIRONMENT_SLOT="$target_env"
    export DEPLOYMENT_ID="$DEPLOYMENT_ID"
    export DEPLOYMENT_TIME="$DEPLOYMENT_TIME"
    
    # Update the target container
    cd "$DEPLOYMENT_DIR"
    
    # Stop the target environment container
    docker-compose -f "$DOCKER_COMPOSE_FILE" stop "app-$target_env"
    
    # Remove old container
    docker-compose -f "$DOCKER_COMPOSE_FILE" rm -f "app-$target_env"
    
    # Start new container
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d "app-$target_env"
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start $target_env environment"
        exit 1
    fi
    
    log_success "Deployment to $target_env completed"
}

# Health check validation
validate_deployment_health() {
    local target_env="$1"
    log "Validating deployment health for $target_env..."
    
    local health_url="http://app-$target_env:3001/health/deployment"
    local attempts=0
    local max_attempts=$(($HEALTH_CHECK_TIMEOUT / $HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        log "Health check attempt $((attempts + 1))/$max_attempts..."
        
        local response=$(curl -s -w "%{http_code}" "$health_url" --max-time $HEALTH_CHECK_INTERVAL || echo "000")
        local status_code="${response: -3}"
        
        if [ "$status_code" = "200" ]; then
            # Parse response to check readyForProduction
            local ready=$(echo "${response%???}" | jq -r '.readyForProduction // false' 2>/dev/null || echo "false")
            
            if [ "$ready" = "true" ]; then
                log_success "Health check passed - deployment is ready for production"
                return 0
            fi
        fi
        
        attempts=$((attempts + 1))
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Switch traffic to new environment
switch_traffic() {
    local target_env="$1"
    log "Switching traffic to $target_env environment..."
    
    # Update nginx upstream configuration
    update_nginx_config "$target_env"
    
    # Reload nginx
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload
    
    if [ $? -eq 0 ]; then
        log_success "Traffic switched to $target_env"
    else
        log_error "Failed to switch traffic"
        return 1
    fi
    
    # Verify the switch
    sleep 5
    local active_env=$(detect_active_environment)
    if [ "$active_env" = "$target_env" ]; then
        log_success "Traffic switch verified successfully"
    else
        log_warning "Traffic switch verification failed"
        return 1
    fi
}

# Update nginx configuration
update_nginx_config() {
    local target_env="$1"
    
    # Create nginx config with new upstream
    cat > "$DEPLOYMENT_DIR/nginx/conf.d/upstream.conf" <<EOF
upstream app_backend {
    server app-$target_env:3000 max_fails=3 fail_timeout=30s;
    server app-$target_env:3000 backup;
}
EOF
    
    # Test nginx configuration
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -t
    
    if [ $? -ne 0 ]; then
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Post-deployment validation
post_deployment_validation() {
    local target_env="$1"
    log "Running post-deployment validation..."
    
    # End-to-end health check
    if ! validate_deployment_health "$target_env"; then
        return 1
    fi
    
    # Validate key functionality
    local api_response=$(curl -s -w "%{http_code}" "http://localhost/health/simple" --max-time 10 || echo "000")
    local api_status="${api_response: -3}"
    
    if [ "$api_status" != "200" ]; then
        log_error "API validation failed (HTTP $api_status)"
        return 1
    fi
    
    # Validate database connectivity
    local db_response=$(curl -s "http://localhost/health" | jq -r '.checks.database.status // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$db_response" != "healthy" ]; then
        log_error "Database connectivity validation failed"
        return 1
    fi
    
    log_success "Post-deployment validation passed"
}

# Rollback deployment
rollback_deployment() {
    local original_env="$1"
    log_error "Rolling back to $original_env environment..."
    
    # Switch traffic back
    switch_traffic "$original_env"
    
    # Restore database if backup exists
    restore_database_backup
    
    log_success "Rollback completed"
}

# Cleanup old deployments
cleanup_old_deployments() {
    log "Cleaning up old deployments..."
    
    # Remove old Docker images (keep last 3)
    local old_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "bot-denuncia:" | tail -n +4)
    
    if [ -n "$old_images" ]; then
        echo "$old_images" | xargs -r docker rmi
        log_success "Cleaned up old Docker images"
    fi
    
    # Remove old backups (keep last 5)
    find "$DEPLOYMENT_DIR/backups" -name "db_backup_*.sql" -type f | sort -r | tail -n +6 | xargs -r rm
    
    log_success "Cleanup completed"
}

# Generate deployment report
generate_deployment_report() {
    local target_env="$1"
    local status="$2"
    
    local report_file="$DEPLOYMENT_DIR/reports/deployment_report_$DEPLOYMENT_ID.json"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" <<EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "timestamp": "$DEPLOYMENT_TIME",
  "targetEnvironment": "$target_env",
  "status": "$status",
  "version": "${VERSION:-unknown}",
  "duration": $(( $(date +%s) - $(date -d "$DEPLOYMENT_TIME" +%s) )),
  "healthChecks": {
    "database": "$(curl -s http://localhost/health | jq -r '.checks.database.status // "unknown"' 2>/dev/null || echo "unknown")",
    "redis": "$(curl -s http://localhost/health | jq -r '.checks.redis.status // "unknown"' 2>/dev/null || echo "unknown")",
    "whatsapp": "$(curl -s http://localhost/health | jq -r '.checks.whatsapp.status // "unknown"' 2>/dev/null || echo "unknown")"
  },
  "metrics": {
    "responseTime": "$(curl -s http://localhost/health | jq -r '.responseTime // 0' 2>/dev/null || echo "0")",
    "memoryUsage": "$(curl -s http://localhost/health | jq -r '.metrics.memory.used // 0' 2>/dev/null || echo "0")"
  }
}
EOF
    
    log_success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    log "Starting Bot Denuncia deployment..."
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Deployment Time: $DEPLOYMENT_TIME"
    
    # Step 1: Pre-deployment validation
    validate_deployment_prerequisites
    
    # Step 2: Detect current environment and determine target
    local current_env=$(detect_active_environment)
    local target_env=$(get_target_environment "$current_env")
    
    log "Current environment: $current_env"
    log "Target environment: $target_env"
    
    # Step 3: Build new version
    build_new_version "$target_env"
    
    # Step 4: Database migration
    run_database_migration
    
    # Step 5: Deploy to target environment
    deploy_to_environment "$target_env"
    
    # Step 6: Health check validation
    if ! validate_deployment_health "$target_env"; then
        log_error "Deployment health validation failed"
        rollback_deployment "$current_env"
        generate_deployment_report "$target_env" "failed"
        exit 1
    fi
    
    # Step 7: Switch traffic
    if ! switch_traffic "$target_env"; then
        log_error "Traffic switch failed"
        rollback_deployment "$current_env"
        generate_deployment_report "$target_env" "failed"
        exit 1
    fi
    
    # Step 8: Post-deployment validation
    if ! post_deployment_validation "$target_env"; then
        log_error "Post-deployment validation failed"
        rollback_deployment "$current_env"
        generate_deployment_report "$target_env" "failed"
        exit 1
    fi
    
    # Step 9: Cleanup
    cleanup_old_deployments
    
    # Step 10: Generate report
    generate_deployment_report "$target_env" "success"
    
    log_success "Deployment completed successfully!"
    log "Active environment: $target_env"
    log "Deployment ID: $DEPLOYMENT_ID"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    log_warning "Running as root is not recommended"
fi

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        current_env=$(detect_active_environment)
        original_env=$(get_target_environment "$current_env")
        rollback_deployment "$original_env"
        ;;
    "status")
        current_env=$(detect_active_environment)
        echo "Active environment: $current_env"
        curl -s http://localhost/health/simple
        ;;
    "cleanup")
        cleanup_old_deployments
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|cleanup}"
        exit 1
        ;;
esac