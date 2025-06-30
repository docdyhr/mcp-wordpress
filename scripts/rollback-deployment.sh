#!/bin/bash

# Automated rollback script for MCP WordPress deployments
# This script implements automated rollback mechanisms for production deployments

set -euo pipefail

# Configuration
DEPLOYMENT_LOG="/var/log/mcp-wordpress-deployment.log"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/health}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-300}" # 5 minutes
MAX_ROLLBACK_ATTEMPTS="${MAX_ROLLBACK_ATTEMPTS:-3}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${DEPLOYMENT_LOG}"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

# Send notification
send_notification() {
    local title="$1"
    local message="$2"
    local status="${3:-info}"
    
    if [[ -n "${NOTIFICATION_WEBHOOK}" ]]; then
        curl -s -X POST "${NOTIFICATION_WEBHOOK}" \
            -H "Content-Type: application/json" \
            -d "{\"title\":\"${title}\",\"message\":\"${message}\",\"status\":\"${status}\"}" \
            >/dev/null 2>&1 || true
    fi
    
    log_info "Notification sent: ${title} - ${message}"
}

# Health check function
health_check() {
    local max_attempts="${1:-10}"
    local attempt=1
    
    log_info "Starting health check (max attempts: ${max_attempts})"
    
    while [[ ${attempt} -le ${max_attempts} ]]; do
        log_info "Health check attempt ${attempt}/${max_attempts}"
        
        if curl -s -f "${HEALTH_CHECK_URL}" >/dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_warn "Health check failed, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after ${max_attempts} attempts"
    return 1
}

# Performance validation
validate_performance() {
    local performance_threshold="${1:-2000}" # 2 second response time threshold
    
    log_info "Validating performance (threshold: ${performance_threshold}ms)"
    
    # Run performance tests
    local response_time
    response_time=$(curl -w "%{time_total}" -s -o /dev/null "${HEALTH_CHECK_URL}" | awk '{print int($1*1000)}')
    
    if [[ ${response_time} -gt ${performance_threshold} ]]; then
        log_error "Performance validation failed: ${response_time}ms > ${performance_threshold}ms"
        return 1
    fi
    
    log_success "Performance validation passed: ${response_time}ms"
    return 0
}

# Get current deployment version
get_current_version() {
    if [[ -f "package.json" ]]; then
        node -p "require('./package.json').version" 2>/dev/null || echo "unknown"
    else
        echo "unknown"
    fi
}

# Get previous deployment from git
get_previous_deployment() {
    local previous_commit
    previous_commit=$(git log --oneline --grep="deploy" -n 2 | tail -n 1 | cut -d' ' -f1 2>/dev/null || echo "")
    
    if [[ -z "${previous_commit}" ]]; then
        # Fallback to previous commit
        previous_commit=$(git rev-parse HEAD~1 2>/dev/null || echo "")
    fi
    
    echo "${previous_commit}"
}

# Docker rollback
rollback_docker() {
    local previous_tag="${1:-latest-stable}"
    
    log_info "Starting Docker rollback to tag: ${previous_tag}"
    
    # Stop current container
    if docker ps -q -f name=mcp-wordpress >/dev/null 2>&1; then
        log_info "Stopping current container"
        docker stop mcp-wordpress || true
        docker rm mcp-wordpress || true
    fi
    
    # Start previous version
    log_info "Starting previous version: ${previous_tag}"
    docker run -d \
        --name mcp-wordpress \
        --restart unless-stopped \
        -p 3000:3000 \
        -e NODE_ENV=production \
        "mcp-wordpress:${previous_tag}"
    
    # Wait for container to start
    sleep 10
    
    if health_check 5; then
        log_success "Docker rollback completed successfully"
        return 0
    else
        log_error "Docker rollback failed - container health check failed"
        return 1
    fi
}

# Git rollback
rollback_git() {
    local target_commit="${1:-}"
    
    if [[ -z "${target_commit}" ]]; then
        target_commit=$(get_previous_deployment)
    fi
    
    if [[ -z "${target_commit}" ]]; then
        log_error "No previous deployment found for rollback"
        return 1
    fi
    
    log_info "Starting Git rollback to commit: ${target_commit}"
    
    # Create rollback branch
    local rollback_branch="rollback-$(date +%s)"
    git checkout -b "${rollback_branch}"
    
    # Reset to target commit
    git reset --hard "${target_commit}"
    
    # Rebuild application
    log_info "Rebuilding application after Git rollback"
    npm ci --production
    npm run build
    
    # Restart services
    if command -v pm2 >/dev/null 2>&1; then
        log_info "Restarting with PM2"
        pm2 restart all
    elif command -v systemctl >/dev/null 2>&1; then
        log_info "Restarting with systemctl"
        sudo systemctl restart mcp-wordpress
    else
        log_warn "No process manager found - manual restart required"
    fi
    
    # Wait for service to start
    sleep 15
    
    if health_check 5; then
        log_success "Git rollback completed successfully"
        return 0
    else
        log_error "Git rollback failed - service health check failed"
        return 1
    fi
}

# Kubernetes rollback
rollback_kubernetes() {
    local deployment_name="${1:-mcp-wordpress}"
    local namespace="${2:-default}"
    
    log_info "Starting Kubernetes rollback for deployment: ${deployment_name}"
    
    # Check if kubectl is available
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl not found - cannot perform Kubernetes rollback"
        return 1
    fi
    
    # Get rollout history
    local revision
    revision=$(kubectl rollout history deployment/"${deployment_name}" -n "${namespace}" | tail -n 2 | head -n 1 | awk '{print $1}' || echo "")
    
    if [[ -z "${revision}" ]]; then
        log_error "No previous revision found for rollback"
        return 1
    fi
    
    # Perform rollback
    log_info "Rolling back to revision: ${revision}"
    kubectl rollout undo deployment/"${deployment_name}" -n "${namespace}" --to-revision="${revision}"
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    kubectl rollout status deployment/"${deployment_name}" -n "${namespace}" --timeout=300s
    
    if health_check 10; then
        log_success "Kubernetes rollback completed successfully"
        return 0
    else
        log_error "Kubernetes rollback failed - health check failed"
        return 1
    fi
}

# Main rollback function
perform_rollback() {
    local rollback_type="${1:-auto}"
    local rollback_target="${2:-}"
    local attempt=1
    
    log_info "Starting rollback process (type: ${rollback_type}, attempt: ${attempt}/${MAX_ROLLBACK_ATTEMPTS})"
    send_notification "Rollback Started" "Initiating rollback for MCP WordPress deployment" "warning"
    
    while [[ ${attempt} -le ${MAX_ROLLBACK_ATTEMPTS} ]]; do
        log_info "Rollback attempt ${attempt}/${MAX_ROLLBACK_ATTEMPTS}"
        
        case "${rollback_type}" in
            "docker")
                if rollback_docker "${rollback_target}"; then
                    rollback_success
                    return 0
                fi
                ;;
            "git")
                if rollback_git "${rollback_target}"; then
                    rollback_success
                    return 0
                fi
                ;;
            "kubernetes"|"k8s")
                if rollback_kubernetes "${rollback_target}"; then
                    rollback_success
                    return 0
                fi
                ;;
            "auto"|*)
                # Try Docker first, then Git, then Kubernetes
                if command -v docker >/dev/null 2>&1 && docker images mcp-wordpress:latest-stable >/dev/null 2>&1; then
                    log_info "Attempting Docker rollback"
                    if rollback_docker "latest-stable"; then
                        rollback_success
                        return 0
                    fi
                elif [[ -d ".git" ]]; then
                    log_info "Attempting Git rollback"
                    if rollback_git; then
                        rollback_success
                        return 0
                    fi
                elif command -v kubectl >/dev/null 2>&1; then
                    log_info "Attempting Kubernetes rollback"
                    if rollback_kubernetes; then
                        rollback_success
                        return 0
                    fi
                else
                    log_error "No rollback method available"
                    rollback_failure "No rollback method available"
                    return 1
                fi
                ;;
        esac
        
        log_warn "Rollback attempt ${attempt} failed, waiting 30 seconds before retry..."
        sleep 30
        ((attempt++))
    done
    
    rollback_failure "All rollback attempts failed"
    return 1
}

# Rollback success handler
rollback_success() {
    local current_version
    current_version=$(get_current_version)
    
    log_success "Rollback completed successfully (version: ${current_version})"
    send_notification "Rollback Successful" "MCP WordPress rollback completed successfully (version: ${current_version})" "success"
    
    # Run post-rollback validation
    log_info "Running post-rollback validation"
    if validate_performance; then
        log_success "Post-rollback validation passed"
    else
        log_warn "Post-rollback validation failed - manual investigation required"
    fi
}

# Rollback failure handler
rollback_failure() {
    local reason="${1:-Unknown error}"
    
    log_error "Rollback failed: ${reason}"
    send_notification "Rollback Failed" "MCP WordPress rollback failed: ${reason}" "error"
    
    # Create incident report
    create_incident_report "${reason}"
}

# Create incident report
create_incident_report() {
    local reason="${1:-Unknown error}"
    local report_file="/tmp/rollback-incident-$(date +%s).json"
    
    cat > "${report_file}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "service": "mcp-wordpress",
  "incident_type": "rollback_failure",
  "reason": "${reason}",
  "current_version": "$(get_current_version)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "environment_info": {
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
    "os": "$(uname -a 2>/dev/null || echo 'unknown')"
  },
  "logs": "$(tail -n 50 "${DEPLOYMENT_LOG}" 2>/dev/null || echo 'No logs available')"
}
EOF
    
    log_info "Incident report created: ${report_file}"
}

# Validate deployment health
validate_deployment() {
    log_info "Validating current deployment health"
    
    # Health check
    if ! health_check 3; then
        log_error "Deployment validation failed - health check failed"
        return 1
    fi
    
    # Performance validation
    if ! validate_performance; then
        log_error "Deployment validation failed - performance check failed"
        return 1
    fi
    
    # Additional validations can be added here
    log_success "Deployment validation passed"
    return 0
}

# Main script logic
main() {
    local command="${1:-validate}"
    local rollback_type="${2:-auto}"
    local rollback_target="${3:-}"
    
    case "${command}" in
        "validate")
            validate_deployment
            ;;
        "rollback")
            perform_rollback "${rollback_type}" "${rollback_target}"
            ;;
        "health")
            health_check
            ;;
        "help"|"--help"|"-h")
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  validate              Validate current deployment health"
            echo "  rollback [type] [target]  Perform rollback"
            echo "  health                Run health check only"
            echo "  help                  Show this help message"
            echo ""
            echo "Rollback types:"
            echo "  auto                  Automatically detect rollback method (default)"
            echo "  docker [tag]          Rollback Docker deployment to specified tag"
            echo "  git [commit]          Rollback Git deployment to specified commit"
            echo "  kubernetes [name]     Rollback Kubernetes deployment"
            echo ""
            echo "Environment variables:"
            echo "  HEALTH_CHECK_URL      Health check endpoint (default: http://localhost:3000/health)"
            echo "  ROLLBACK_TIMEOUT      Rollback timeout in seconds (default: 300)"
            echo "  MAX_ROLLBACK_ATTEMPTS Maximum rollback attempts (default: 3)"
            echo "  NOTIFICATION_WEBHOOK  Webhook URL for notifications"
            ;;
        *)
            log_error "Unknown command: ${command}"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Trap signals for graceful shutdown
trap 'log_warn "Rollback script interrupted"; exit 130' INT TERM

# Run main function
main "$@"