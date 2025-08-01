#!/bin/sh

# Health check script for containers
set -e

# Configuration
HEALTH_URL="http://localhost:${HEALTH_CHECK_PORT:-3001}/health"
TIMEOUT=10
MAX_RETRIES=3

# Function to check health endpoint
check_health() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time $TIMEOUT "$HEALTH_URL" > /dev/null 2>&1; then
            echo "Health check passed"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        echo "Health check attempt $retry_count failed, retrying..."
        sleep 2
    done
    
    echo "Health check failed after $MAX_RETRIES attempts"
    return 1
}

# Function to check database connectivity
check_database() {
    if [ -n "$DATABASE_URL" ]; then
        node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            prisma.\$queryRaw\`SELECT 1\`
                .then(() => {
                    console.log('Database connection OK');
                    process.exit(0);
                })
                .catch((err) => {
                    console.error('Database connection failed:', err.message);
                    process.exit(1);
                });
        " 2>/dev/null || return 1
    fi
    return 0
}

# Function to check Redis connectivity
check_redis() {
    if [ -n "$REDIS_URL" ]; then
        node -e "
            const Redis = require('ioredis');
            const redis = new Redis(process.env.REDIS_URL);
            redis.ping()
                .then((result) => {
                    console.log('Redis connection OK');
                    redis.disconnect();
                    process.exit(0);
                })
                .catch((err) => {
                    console.error('Redis connection failed:', err.message);
                    process.exit(1);
                });
        " 2>/dev/null || return 1
    fi
    return 0
}

# Function to check critical processes
check_processes() {
    # Check if main application process is running
    if ! pgrep -f "node.*src/index.js" > /dev/null; then
        echo "Main application process not found"
        return 1
    fi
    
    echo "Application processes OK"
    return 0
}

# Function to check memory usage
check_memory() {
    local memory_usage
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$memory_usage" -gt 90 ]; then
        echo "WARNING: High memory usage: ${memory_usage}%"
        return 1
    fi
    
    echo "Memory usage OK: ${memory_usage}%"
    return 0
}

# Main health check
main() {
    echo "Starting comprehensive health check..."
    
    # Check basic health endpoint
    if ! check_health; then
        exit 1
    fi
    
    # Check database connectivity
    if ! check_database; then
        echo "Database health check failed"
        exit 1
    fi
    
    # Check Redis connectivity
    if ! check_redis; then
        echo "Redis health check failed"
        exit 1
    fi
    
    # Check processes
    if ! check_processes; then
        exit 1
    fi
    
    # Check memory usage
    if ! check_memory; then
        echo "Memory check failed"
        exit 1
    fi
    
    echo "All health checks passed successfully"
    exit 0
}

# Run main function
main "$@"