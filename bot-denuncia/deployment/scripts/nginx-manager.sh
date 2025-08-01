#!/bin/bash

# Nginx Manager Script
# Gerencia configuração dinâmica do nginx para blue-green deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
NGINX_CONF_DIR="$DEPLOYMENT_DIR/nginx/conf.d"
UPSTREAM_CONF="$NGINX_CONF_DIR/upstream.conf"
DOCKER_COMPOSE_FILE="$DEPLOYMENT_DIR/docker-compose.production.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Get current active environment
get_active_environment() {
    if [ -f "$UPSTREAM_CONF" ]; then
        # Parse the upstream configuration to determine active environment
        local blue_weight=$(grep -A 5 "upstream app_backend" "$UPSTREAM_CONF" | grep "app-blue" | grep -o "weight=[0-9]*" | cut -d= -f2 || echo "0")
        local green_weight=$(grep -A 5 "upstream app_backend" "$UPSTREAM_CONF" | grep "app-green" | grep -o "weight=[0-9]*" | cut -d= -f2 || echo "0")
        
        if [ "$blue_weight" -gt "$green_weight" ]; then
            echo "blue"
        else
            echo "green"
        fi
    else
        echo "blue"  # Default
    fi
}

# Update upstream configuration
update_upstream() {
    local target_env="$1"
    local strategy="${2:-switch}"  # switch, canary, or split
    
    log "Updating upstream configuration to $target_env (strategy: $strategy)"
    
    case "$strategy" in
        "switch")
            update_upstream_switch "$target_env"
            ;;
        "canary")
            local canary_percent="${3:-10}"
            update_upstream_canary "$target_env" "$canary_percent"
            ;;
        "split")
            local split_percent="${3:-50}"
            update_upstream_split "$target_env" "$split_percent"
            ;;
        *)
            log_error "Unknown strategy: $strategy"
            return 1
            ;;
    esac
}

# Full traffic switch
update_upstream_switch() {
    local target_env="$1"
    
    if [ "$target_env" = "blue" ]; then
        local primary_env="blue"
        local backup_env="green"
    else
        local primary_env="green"
        local backup_env="blue"
    fi
    
    cat > "$UPSTREAM_CONF" <<EOF
# Dynamic Upstream Configuration
# Updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Active Environment: $primary_env
# Strategy: Full Switch

# Primary application upstream
upstream app_backend {
    server app-$primary_env:3000 max_fails=3 fail_timeout=30s weight=100;
    server app-$backup_env:3000 max_fails=3 fail_timeout=30s weight=0 backup;
    
    # Connection pooling
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
    
    # Load balancing method
    least_conn;
}

# Admin panel upstream
upstream admin_backend {
    server app-$primary_env:3000 max_fails=2 fail_timeout=30s weight=100;
    server app-$backup_env:3000 max_fails=2 fail_timeout=30s weight=0 backup;
    
    keepalive 16;
    keepalive_requests 50;
    keepalive_timeout 60s;
}
EOF
    
    log_success "Upstream configuration updated for full switch to $target_env"
}

# Canary deployment (small percentage to new environment)
update_upstream_canary() {
    local target_env="$1"
    local canary_percent="$2"
    local stable_percent=$((100 - canary_percent))
    
    if [ "$target_env" = "blue" ]; then
        local canary_env="blue"
        local stable_env="green"
    else
        local canary_env="green"
        local stable_env="blue"
    fi
    
    cat > "$UPSTREAM_CONF" <<EOF
# Dynamic Upstream Configuration
# Updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Canary Environment: $canary_env ($canary_percent%)
# Stable Environment: $stable_env ($stable_percent%)
# Strategy: Canary Deployment

# Primary application upstream
upstream app_backend {
    server app-$stable_env:3000 max_fails=3 fail_timeout=30s weight=$stable_percent;
    server app-$canary_env:3000 max_fails=3 fail_timeout=30s weight=$canary_percent;
    
    # Connection pooling
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
    
    # Load balancing method
    least_conn;
}

# Admin panel upstream (keep stable for admin)
upstream admin_backend {
    server app-$stable_env:3000 max_fails=2 fail_timeout=30s weight=100;
    server app-$canary_env:3000 max_fails=2 fail_timeout=30s weight=0 backup;
    
    keepalive 16;
    keepalive_requests 50;
    keepalive_timeout 60s;
}
EOF
    
    log_success "Upstream configuration updated for canary deployment: $canary_percent% to $target_env"
}

# Split traffic between environments
update_upstream_split() {
    local target_env="$1"
    local target_percent="$2"
    local other_percent=$((100 - target_percent))
    
    if [ "$target_env" = "blue" ]; then
        local blue_weight="$target_percent"
        local green_weight="$other_percent"
    else
        local blue_weight="$other_percent"
        local green_weight="$target_percent"
    fi
    
    cat > "$UPSTREAM_CONF" <<EOF
# Dynamic Upstream Configuration
# Updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Blue Environment: $blue_weight%
# Green Environment: $green_weight%
# Strategy: Traffic Split

# Primary application upstream
upstream app_backend {
    server app-blue:3000 max_fails=3 fail_timeout=30s weight=$blue_weight;
    server app-green:3000 max_fails=3 fail_timeout=30s weight=$green_weight;
    
    # Connection pooling
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
    
    # Load balancing method
    least_conn;
}

# Admin panel upstream (even split for admin)
upstream admin_backend {
    server app-blue:3000 max_fails=2 fail_timeout=30s weight=$blue_weight;
    server app-green:3000 max_fails=2 fail_timeout=30s weight=$green_weight;
    
    keepalive 16;
    keepalive_requests 50;
    keepalive_timeout 60s;
}
EOF
    
    log_success "Upstream configuration updated for traffic split: Blue $blue_weight%, Green $green_weight%"
}

# Test nginx configuration
test_nginx_config() {
    log "Testing nginx configuration..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -t 2>/dev/null; then
        log_success "Nginx configuration test passed"
        return 0
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Reload nginx configuration
reload_nginx() {
    log "Reloading nginx configuration..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload 2>/dev/null; then
        log_success "Nginx configuration reloaded successfully"
        return 0
    else
        log_error "Failed to reload nginx configuration"
        return 1
    fi
}

# Apply configuration changes with validation
apply_config() {
    local target_env="$1"
    local strategy="${2:-switch}"
    local percent="${3:-100}"
    
    # Backup current configuration
    local backup_file="/tmp/upstream.conf.backup.$(date +%s)"
    cp "$UPSTREAM_CONF" "$backup_file" 2>/dev/null || true
    
    # Update configuration
    update_upstream "$target_env" "$strategy" "$percent"
    
    # Test configuration
    if test_nginx_config; then
        # Apply configuration
        if reload_nginx; then
            log_success "Configuration applied successfully"
            
            # Verify the change took effect
            sleep 2
            verify_upstream_change "$target_env" "$strategy"
            
            return 0
        else
            log_error "Failed to reload nginx, restoring backup"
            cp "$backup_file" "$UPSTREAM_CONF" 2>/dev/null || true
            return 1
        fi
    else
        log_error "Configuration test failed, restoring backup"
        cp "$backup_file" "$UPSTREAM_CONF" 2>/dev/null || true
        return 1
    fi
}

# Verify upstream change
verify_upstream_change() {
    local target_env="$1"
    local strategy="$2"
    
    log "Verifying upstream change..."
    
    # Make test requests to verify routing
    local test_url="http://localhost/health/simple"
    local success_count=0
    local total_tests=5
    
    for i in $(seq 1 $total_tests); do
        local response=$(curl -s -w "%{http_code}" "$test_url" --max-time 5 2>/dev/null || echo "000")
        local status_code="${response: -3}"
        
        if [ "$status_code" = "200" ]; then
            success_count=$((success_count + 1))
        fi
        
        sleep 1
    done
    
    local success_rate=$((success_count * 100 / total_tests))
    
    if [ "$success_rate" -ge 80 ]; then
        log_success "Upstream verification passed ($success_rate% success rate)"
    else
        log_warning "Upstream verification shows low success rate ($success_rate%)"
    fi
}

# Get current upstream status
get_upstream_status() {
    if [ ! -f "$UPSTREAM_CONF" ]; then
        echo "Configuration file not found"
        return 1
    fi
    
    echo "Current upstream configuration:"
    echo "================================"
    
    # Extract active environment and strategy from comments
    local active_env=$(grep "# Active Environment:" "$UPSTREAM_CONF" | cut -d: -f2 | xargs || echo "unknown")
    local strategy=$(grep "# Strategy:" "$UPSTREAM_CONF" | cut -d: -f2 | xargs || echo "unknown")
    local updated=$(grep "# Updated:" "$UPSTREAM_CONF" | cut -d: -f2- | xargs || echo "unknown")
    
    echo "Active Environment: $active_env"
    echo "Strategy: $strategy"
    echo "Last Updated: $updated"
    echo
    
    # Show upstream servers and weights
    echo "Upstream servers:"
    grep -A 10 "upstream app_backend" "$UPSTREAM_CONF" | grep "server app-" | while read line; do
        echo "  $line"
    done
}

# Progressive traffic shift (for gradual deployments)
progressive_shift() {
    local target_env="$1"
    local steps="${2:-5}"
    local delay="${3:-300}"  # 5 minutes between steps
    
    log "Starting progressive traffic shift to $target_env"
    log "Steps: $steps, Delay between steps: ${delay}s"
    
    for i in $(seq 1 $steps); do
        local percent=$((i * 100 / steps))
        
        log "Step $i/$steps: Shifting $percent% traffic to $target_env"
        
        if ! apply_config "$target_env" "split" "$percent"; then
            log_error "Progressive shift failed at step $i"
            return 1
        fi
        
        # Monitor for issues during the shift
        log "Monitoring for ${delay}s before next step..."
        sleep "$delay"
        
        # Basic health check
        local health_check=$(curl -s "http://localhost/health/simple" | jq -r '.status // "error"' 2>/dev/null || echo "error")
        
        if [ "$health_check" != "ok" ]; then
            log_error "Health check failed during progressive shift, rolling back"
            apply_config "$(get_active_environment)" "switch"
            return 1
        fi
    done
    
    log_success "Progressive traffic shift completed successfully"
}

# Emergency rollback
emergency_rollback() {
    local current_env=$(get_active_environment)
    local rollback_env
    
    if [ "$current_env" = "blue" ]; then
        rollback_env="green"
    else
        rollback_env="blue"
    fi
    
    log_warning "Executing emergency rollback from $current_env to $rollback_env"
    
    if apply_config "$rollback_env" "switch"; then
        log_success "Emergency rollback completed"
    else
        log_error "Emergency rollback failed"
        return 1
    fi
}

# Main function
main() {
    case "${1:-status}" in
        "switch")
            local target_env="$2"
            if [ -z "$target_env" ]; then
                log_error "Target environment required for switch"
                exit 1
            fi
            apply_config "$target_env" "switch"
            ;;
        "canary")
            local target_env="$2"
            local percent="${3:-10}"
            if [ -z "$target_env" ]; then
                log_error "Target environment required for canary"
                exit 1
            fi
            apply_config "$target_env" "canary" "$percent"
            ;;
        "split")
            local target_env="$2"
            local percent="${3:-50}"
            if [ -z "$target_env" ]; then
                log_error "Target environment required for split"
                exit 1
            fi
            apply_config "$target_env" "split" "$percent"
            ;;
        "progressive")
            local target_env="$2"
            local steps="${3:-5}"
            local delay="${4:-300}"
            if [ -z "$target_env" ]; then
                log_error "Target environment required for progressive shift"
                exit 1
            fi
            progressive_shift "$target_env" "$steps" "$delay"
            ;;
        "rollback")
            emergency_rollback
            ;;
        "test")
            test_nginx_config
            ;;
        "reload")
            reload_nginx
            ;;
        "status")
            get_upstream_status
            ;;
        *)
            echo "Usage: $0 {switch|canary|split|progressive|rollback|test|reload|status} [environment] [options]"
            echo ""
            echo "Commands:"
            echo "  switch <env>              - Full traffic switch to environment"
            echo "  canary <env> [percent]    - Canary deployment (default: 10%)"
            echo "  split <env> [percent]     - Split traffic (default: 50%)"
            echo "  progressive <env> [steps] [delay] - Progressive shift (default: 5 steps, 300s delay)"
            echo "  rollback                  - Emergency rollback to other environment"
            echo "  test                      - Test nginx configuration"
            echo "  reload                    - Reload nginx configuration"
            echo "  status                    - Show current upstream status"
            echo ""
            echo "Examples:"
            echo "  $0 switch blue"
            echo "  $0 canary green 20"
            echo "  $0 progressive green 10 180"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

main "$@"