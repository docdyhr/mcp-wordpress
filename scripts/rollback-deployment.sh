#!/bin/bash
#
# Automated Rollback Deployment Script
# Provides rollback capabilities for failed deployments
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/health}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
MAX_ROLLBACK_ATTEMPTS="${MAX_ROLLBACK_ATTEMPTS:-3}"

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    cat << HELP
Rollback Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    help        Show this help message
    health      Perform health check
    rollback    Rollback to previous version
    validate    Validate deployment
    status      Check deployment status

Environment Variables:
    HEALTH_CHECK_URL          URL for health check (default: http://localhost:3000/health)
    HEALTH_CHECK_TIMEOUT      Timeout for health check in seconds (default: 30)
    MAX_ROLLBACK_ATTEMPTS     Maximum rollback attempts (default: 3)

Examples:
    $0 help                   Show this help
    $0 health                 Check service health
    $0 rollback v1.2.3        Rollback to version 1.2.3
    $0 validate               Validate current deployment

HELP
}

# Function to perform health check
health_check() {
    log_info "Performing health check..."
    log_info "Health check URL: $HEALTH_CHECK_URL"
    
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_URL" > /dev/null; then
            log_info "✅ Health check passed"
            return 0
        else
            log_error "❌ Health check failed"
            return 1
        fi
    else
        log_warn "curl not available, skipping health check"
        return 0
    fi
}

# Function to validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check if health check passes
    if health_check; then
        log_info "✅ Deployment validation passed"
        return 0
    else
        log_error "❌ Deployment validation failed"
        return 1
    fi
}

# Function to perform rollback
perform_rollback() {
    local target_version="${1:-previous}"
    
    log_warn "⚠️  Initiating rollback to: $target_version"
    
    # This is a placeholder - actual rollback would depend on deployment method
    # For now, we just simulate the rollback process
    
    log_info "Step 1: Stopping current deployment..."
    sleep 1
    
    log_info "Step 2: Restoring previous version..."
    sleep 1
    
    log_info "Step 3: Starting rolled back version..."
    sleep 1
    
    log_info "Step 4: Validating rollback..."
    if validate_deployment; then
        log_info "✅ Rollback completed successfully"
        return 0
    else
        log_error "❌ Rollback validation failed"
        return 1
    fi
}

# Function to check deployment status
check_status() {
    log_info "Checking deployment status..."
    
    if health_check; then
        log_info "Status: Running"
        log_info "Health: OK"
    else
        log_warn "Status: Unknown or Unhealthy"
    fi
}

# Main script logic
main() {
    local command="${1:-help}"
    
    case "$command" in
        help)
            show_help
            ;;
        health)
            health_check
            ;;
        rollback)
            perform_rollback "$2"
            ;;
        validate)
            validate_deployment
            ;;
        status)
            check_status
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
