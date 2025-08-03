#!/bin/bash

# Blue-Green Deployment Script for MCP WordPress
# Implements zero-downtime deployments with automatic traffic switching and rollback

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENT_CONFIG="${DEPLOYMENT_CONFIG:-${PROJECT_ROOT}/deployment.config.json}"
DEPLOYMENT_LOG="${DEPLOYMENT_LOG:-${PROJECT_ROOT}/logs/mcp-wordpress-blue-green.log}"

# Environment configuration
HEALTH_CHECK_ENDPOINT="${HEALTH_CHECK_ENDPOINT:-/health}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}" # 10 minutes
TRAFFIC_SWITCH_DELAY="${TRAFFIC_SWITCH_DELAY:-5}" # seconds
MONITORING_PERIOD="${MONITORING_PERIOD:-300}" # 5 minutes post-deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${DEPLOYMENT_LOG}"
}

log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }
log_debug() { [[ "${DEBUG:-}" == "true" ]] && log "DEBUG" "${CYAN}$*${NC}" || true; }

# Initialize deployment configuration
init_deployment_config() {
    if [[ ! -f "${DEPLOYMENT_CONFIG}" ]]; then
        log_info "Creating default deployment configuration"
        cat > "${DEPLOYMENT_CONFIG}" <<EOF
{
  "environments": {
    "production": {
      "load_balancer": {
        "type": "nginx",
        "config_path": "/etc/nginx/conf.d/mcp-wordpress.conf",
        "reload_command": "nginx -s reload"
      },
      "blue": {
        "port": 3001,
        "health_url": "http://localhost:3001${HEALTH_CHECK_ENDPOINT}",
        "container_name": "mcp-wordpress-blue",
        "image_tag": "blue"
      },
      "green": {
        "port": 3002,
        "health_url": "http://localhost:3002${HEALTH_CHECK_ENDPOINT}",
        "container_name": "mcp-wordpress-green",
        "image_tag": "green"
      }
    }
  },
  "monitoring": {
    "metrics_endpoint": "/metrics",
    "alert_webhook": "",
    "performance_thresholds": {
      "response_time_ms": 2000,
      "error_rate_percent": 5,
      "cpu_percent": 80,
      "memory_percent": 85
    }
  },
  "rollback": {
    "auto_rollback": true,
    "rollback_triggers": ["health_check_failure", "performance_degradation", "error_spike"],
    "monitoring_duration": 300
  }
}
EOF
        log_success "Created deployment configuration at ${DEPLOYMENT_CONFIG}"
    fi
}

# Load deployment configuration
load_config() {
    if [[ ! -f "${DEPLOYMENT_CONFIG}" ]]; then
        init_deployment_config
    fi
    
    # Parse configuration using node (since we're in a Node.js project)
    BLUE_PORT=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.blue.port")
    GREEN_PORT=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.green.port")
    BLUE_CONTAINER=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.blue.container_name")
    GREEN_CONTAINER=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.green.container_name")
    BLUE_HEALTH_URL=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.blue.health_url")
    GREEN_HEALTH_URL=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.green.health_url")
    LB_CONFIG_PATH=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.load_balancer.config_path")
    LB_RELOAD_CMD=$(node -p "JSON.parse(require('fs').readFileSync('${DEPLOYMENT_CONFIG}', 'utf8')).environments.production.load_balancer.reload_command")
    
    log_debug "Configuration loaded: Blue=${BLUE_PORT}, Green=${GREEN_PORT}"
}

# Health check function
health_check() {
    local url="$1"
    local max_attempts="${2:-${HEALTH_CHECK_RETRIES}}"
    local timeout="${3:-${HEALTH_CHECK_TIMEOUT}}"
    local attempt=1
    
    log_info "Health checking ${url} (max attempts: ${max_attempts})"
    
    while [[ ${attempt} -le ${max_attempts} ]]; do
        log_debug "Health check attempt ${attempt}/${max_attempts}"
        
        if curl -s -f --max-time "${timeout}" "${url}" >/dev/null 2>&1; then
            log_success "Health check passed for ${url}"
            return 0
        fi
        
        if [[ ${attempt} -lt ${max_attempts} ]]; then
            log_debug "Health check failed, waiting 5 seconds..."
            sleep 5
        fi
        ((attempt++))
    done
    
    log_error "Health check failed for ${url} after ${max_attempts} attempts"
    return 1
}

# Performance validation
validate_performance() {
    local url="$1"
    local threshold_ms="${2:-2000}"
    
    log_info "Validating performance for ${url} (threshold: ${threshold_ms}ms)"
    
    # Run multiple requests to get average response time
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    
    for i in {1..5}; do
        local response_time
        if response_time=$(curl -w "%{time_total}" -s -o /dev/null --max-time 10 "${url}" 2>/dev/null); then
            local time_ms=$(echo "${response_time} * 1000" | bc -l | cut -d. -f1)
            total_time=$((total_time + time_ms))
            ((successful_requests++))
            log_debug "Request ${i}: ${time_ms}ms"
        else
            ((failed_requests++))
            log_debug "Request ${i}: failed"
        fi
    done
    
    if [[ ${successful_requests} -eq 0 ]]; then
        log_error "All performance test requests failed"
        return 1
    fi
    
    local average_time=$((total_time / successful_requests))
    local error_rate=$((failed_requests * 100 / 5))
    
    log_info "Performance results: avg ${average_time}ms, error rate ${error_rate}%"
    
    if [[ ${average_time} -gt ${threshold_ms} ]]; then
        log_error "Performance validation failed: ${average_time}ms > ${threshold_ms}ms"
        return 1
    fi
    
    if [[ ${error_rate} -gt 10 ]]; then
        log_error "Performance validation failed: error rate ${error_rate}% > 10%"
        return 1
    fi
    
    log_success "Performance validation passed"
    return 0
}

# Get current active environment
get_active_environment() {
    # Check which container is currently receiving traffic
    if docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -q "${BLUE_CONTAINER}.*:3000->"; then
        echo "blue"
    elif docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -q "${GREEN_CONTAINER}.*:3000->"; then
        echo "green"
    elif docker ps -q -f name="${BLUE_CONTAINER}" >/dev/null 2>&1; then
        echo "blue"
    elif docker ps -q -f name="${GREEN_CONTAINER}" >/dev/null 2>&1; then
        echo "green"
    else
        echo "none"
    fi
}

# Get inactive environment
get_inactive_environment() {
    local active=$(get_active_environment)
    case "${active}" in
        "blue") echo "green" ;;
        "green") echo "blue" ;;
        *) echo "blue" ;; # Default to blue if none active
    esac
}

# Build new version
build_new_version() {
    local version="${1:-$(date +%Y%m%d-%H%M%S)}"
    local image_tag="mcp-wordpress:${version}"
    
    log_info "Building new version: ${image_tag}"
    
    cd "${PROJECT_ROOT}"
    
    # Build Docker image
    docker build \
        --build-arg VERSION="${version}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        -t "${image_tag}" \
        -t "mcp-wordpress:latest-candidate" \
        .
    
    log_success "Built image: ${image_tag}"
    echo "${image_tag}"
}

# Deploy to inactive environment
deploy_to_inactive() {
    local image_tag="$1"
    local inactive_env=$(get_inactive_environment)
    
    log_info "Deploying ${image_tag} to ${inactive_env} environment"
    
    local container_name
    local port
    local health_url
    
    if [[ "${inactive_env}" == "blue" ]]; then
        container_name="${BLUE_CONTAINER}"
        port="${BLUE_PORT}"
        health_url="${BLUE_HEALTH_URL}"
    else
        container_name="${GREEN_CONTAINER}"
        port="${GREEN_PORT}"
        health_url="${GREEN_HEALTH_URL}"
    fi
    
    # Stop existing container if running
    if docker ps -q -f name="${container_name}" >/dev/null 2>&1; then
        log_info "Stopping existing ${container_name} container"
        docker stop "${container_name}" || true
        docker rm "${container_name}" || true
    fi
    
    # Start new container
    log_info "Starting new container: ${container_name} on port ${port}"
    docker run -d \
        --name "${container_name}" \
        --restart unless-stopped \
        -p "${port}:3000" \
        -e NODE_ENV=production \
        -e NODE_OPTIONS="--experimental-vm-modules" \
        -v "${PROJECT_ROOT}/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro" \
        "${image_tag}"
    
    # Wait for container to start
    log_info "Waiting for container to initialize..."
    sleep 10
    
    # Health check
    if health_check "${health_url}"; then
        log_success "Deployment to ${inactive_env} environment successful"
        return 0
    else
        log_error "Deployment to ${inactive_env} environment failed - health check failed"
        # Clean up failed deployment
        docker stop "${container_name}" || true
        docker rm "${container_name}" || true
        return 1
    fi
}

# Switch traffic to new environment
switch_traffic() {
    local new_active="$1"
    
    log_info "Switching traffic to ${new_active} environment"
    
    local new_port
    if [[ "${new_active}" == "blue" ]]; then
        new_port="${BLUE_PORT}"
    else
        new_port="${GREEN_PORT}"
    fi
    
    # Update load balancer configuration
    update_load_balancer "${new_port}"
    
    # Wait for traffic switch to take effect
    log_info "Waiting ${TRAFFIC_SWITCH_DELAY} seconds for traffic switch to take effect..."
    sleep "${TRAFFIC_SWITCH_DELAY}"
    
    log_success "Traffic switched to ${new_active} environment"
}

# Update load balancer configuration
update_load_balancer() {
    local backend_port="$1"
    
    log_info "Updating load balancer to use backend port ${backend_port}"
    
    # Generate nginx configuration
    local nginx_config="
upstream mcp_wordpress_backend {
    server localhost:${backend_port};
}

server {
    listen 3000;
    server_name _;
    
    location / {
        proxy_pass http://mcp_wordpress_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 30s;
        
        # Enable buffering for better performance
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    location ${HEALTH_CHECK_ENDPOINT} {
        proxy_pass http://mcp_wordpress_backend${HEALTH_CHECK_ENDPOINT};
        access_log off;
    }
}
"
    
    # Write nginx configuration
    if [[ -w "$(dirname "${LB_CONFIG_PATH}")" ]]; then
        echo "${nginx_config}" > "${LB_CONFIG_PATH}"
        log_info "Updated nginx configuration: ${LB_CONFIG_PATH}"
        
        # Reload nginx
        if command -v nginx >/dev/null 2>&1; then
            ${LB_RELOAD_CMD}
            log_success "Nginx configuration reloaded"
        else
            log_warn "Nginx not available - manual configuration reload required"
        fi
    else
        log_warn "Cannot write to ${LB_CONFIG_PATH} - manual load balancer update required"
        log_info "Required upstream configuration: localhost:${backend_port}"
    fi
}

# Monitor deployment
monitor_deployment() {
    local environment="$1"
    local duration="${2:-${MONITORING_PERIOD}}"
    
    log_info "Monitoring ${environment} environment for ${duration} seconds"
    
    local health_url
    if [[ "${environment}" == "blue" ]]; then
        health_url="${BLUE_HEALTH_URL}"
    else
        health_url="${GREEN_HEALTH_URL}"
    fi
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    local check_interval=30
    
    while [[ $(date +%s) -lt ${end_time} ]]; do
        local elapsed=$(($(date +%s) - start_time))
        log_info "Monitoring progress: ${elapsed}/${duration} seconds"
        
        # Health check
        if ! health_check "${health_url}" 1 10; then
            log_error "Health check failed during monitoring"
            return 1
        fi
        
        # Performance check
        if ! validate_performance "${health_url}" 2000; then
            log_error "Performance validation failed during monitoring"
            return 1
        fi
        
        sleep ${check_interval}
    done
    
    log_success "Monitoring completed successfully"
    return 0
}

# Clean up old environment
cleanup_old_environment() {
    local old_env="$1"
    
    log_info "Cleaning up ${old_env} environment"
    
    local container_name
    if [[ "${old_env}" == "blue" ]]; then
        container_name="${BLUE_CONTAINER}"
    else
        container_name="${GREEN_CONTAINER}"
    fi
    
    if docker ps -q -f name="${container_name}" >/dev/null 2>&1; then
        log_info "Stopping ${container_name} container"
        docker stop "${container_name}" || true
        docker rm "${container_name}" || true
        log_success "Cleaned up ${container_name} container"
    else
        log_info "No cleanup needed for ${old_env} environment"
    fi
}

# Perform rollback
perform_rollback() {
    local reason="${1:-Manual rollback requested}"
    
    log_warn "Performing rollback: ${reason}"
    
    local current_active=$(get_active_environment)
    local rollback_target
    
    if [[ "${current_active}" == "blue" ]]; then
        rollback_target="green"
    else
        rollback_target="blue"
    fi
    
    log_info "Rolling back from ${current_active} to ${rollback_target}"
    
    # Check if rollback target is available
    local rollback_container
    if [[ "${rollback_target}" == "blue" ]]; then
        rollback_container="${BLUE_CONTAINER}"
    else
        rollback_container="${GREEN_CONTAINER}"
    fi
    
    if ! docker ps -q -f name="${rollback_container}" >/dev/null 2>&1; then
        log_error "Rollback target ${rollback_target} environment not available"
        return 1
    fi
    
    # Switch traffic back
    switch_traffic "${rollback_target}"
    
    # Verify rollback
    local rollback_health_url
    if [[ "${rollback_target}" == "blue" ]]; then
        rollback_health_url="${BLUE_HEALTH_URL}"
    else
        rollback_health_url="${GREEN_HEALTH_URL}"
    fi
    
    if health_check "${rollback_health_url}"; then
        log_success "Rollback to ${rollback_target} completed successfully"
        
        # Clean up failed deployment
        cleanup_old_environment "${current_active}"
        return 0
    else
        log_error "Rollback verification failed"
        return 1
    fi
}

# Main deployment function
deploy() {
    local version="${1:-$(date +%Y%m%d-%H%M%S)}"
    local skip_monitoring="${2:-false}"
    
    log_info "Starting blue-green deployment (version: ${version})"
    
    # Load configuration
    load_config
    
    # Check prerequisites
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is required but not installed"
        return 1
    fi
    
    # Get current state
    local active_env=$(get_active_environment)
    local inactive_env=$(get_inactive_environment)
    
    log_info "Current active environment: ${active_env}"
    log_info "Deploying to inactive environment: ${inactive_env}"
    
    # Build new version
    local image_tag
    if ! image_tag=$(build_new_version "${version}"); then
        log_error "Build failed"
        return 1
    fi
    
    # Deploy to inactive environment
    if ! deploy_to_inactive "${image_tag}"; then
        log_error "Deployment to inactive environment failed"
        return 1
    fi
    
    # Run pre-switch validation
    local inactive_health_url
    if [[ "${inactive_env}" == "blue" ]]; then
        inactive_health_url="${BLUE_HEALTH_URL}"
    else
        inactive_health_url="${GREEN_HEALTH_URL}"
    fi
    
    log_info "Running pre-switch validation"
    if ! validate_performance "${inactive_health_url}"; then
        log_error "Pre-switch validation failed"
        cleanup_old_environment "${inactive_env}"
        return 1
    fi
    
    # Switch traffic
    switch_traffic "${inactive_env}"
    
    # Monitor deployment
    if [[ "${skip_monitoring}" != "true" ]]; then
        if ! monitor_deployment "${inactive_env}"; then
            log_error "Deployment monitoring failed - initiating rollback"
            perform_rollback "Deployment monitoring failed"
            return 1
        fi
    fi
    
    # Clean up old environment
    if [[ "${active_env}" != "none" ]]; then
        cleanup_old_environment "${active_env}"
    fi
    
    # Tag successful deployment
    docker tag "${image_tag}" "mcp-wordpress:latest-stable"
    
    log_success "Blue-green deployment completed successfully"
    log_info "New active environment: ${inactive_env}"
    log_info "Deployment version: ${version}"
    
    return 0
}

# Status check
status() {
    log_info "Blue-Green Deployment Status"
    log_info "==============================="
    
    load_config
    
    local active_env=$(get_active_environment)
    log_info "Active environment: ${active_env}"
    
    # Check blue environment
    log_info ""
    log_info "Blue Environment (${BLUE_CONTAINER}):"
    if docker ps -q -f name="${BLUE_CONTAINER}" >/dev/null 2>&1; then
        log_success "  Status: Running"
        log_info "  Port: ${BLUE_PORT}"
        if health_check "${BLUE_HEALTH_URL}" 1 5; then
            log_success "  Health: OK"
        else
            log_error "  Health: FAILED"
        fi
    else
        log_warn "  Status: Stopped"
    fi
    
    # Check green environment
    log_info ""
    log_info "Green Environment (${GREEN_CONTAINER}):"
    if docker ps -q -f name="${GREEN_CONTAINER}" >/dev/null 2>&1; then
        log_success "  Status: Running"
        log_info "  Port: ${GREEN_PORT}"
        if health_check "${GREEN_HEALTH_URL}" 1 5; then
            log_success "  Health: OK"
        else
            log_error "  Health: FAILED"
        fi
    else
        log_warn "  Status: Stopped"
    fi
    
    log_info ""
    log_info "Load Balancer Configuration: ${LB_CONFIG_PATH}"
    if [[ -f "${LB_CONFIG_PATH}" ]]; then
        log_success "  Configuration exists"
    else
        log_warn "  Configuration not found"
    fi
}

# Help function
show_help() {
    cat << EOF
Blue-Green Deployment Script for MCP WordPress

Usage: $0 [command] [options]

Commands:
  deploy [version]          Perform blue-green deployment
  rollback [reason]         Rollback to previous environment
  status                    Show deployment status
  switch <environment>      Manually switch traffic (blue|green)
  cleanup <environment>     Clean up specific environment (blue|green)
  init                      Initialize deployment configuration
  help                      Show this help message

Options:
  --skip-monitoring         Skip post-deployment monitoring
  --debug                   Enable debug logging

Environment Variables:
  DEPLOYMENT_CONFIG         Path to deployment configuration file
  HEALTH_CHECK_ENDPOINT     Health check endpoint (default: /health)
  HEALTH_CHECK_TIMEOUT      Health check timeout in seconds (default: 30)
  DEPLOYMENT_TIMEOUT        Overall deployment timeout (default: 600)
  DEBUG                     Enable debug logging (true/false)

Examples:
  $0 deploy                 Deploy with auto-generated version
  $0 deploy v2.4.3          Deploy specific version
  $0 rollback "Emergency fix"
  $0 status                 Check current deployment status
  $0 switch blue            Switch traffic to blue environment

EOF
}

# Main script logic
main() {
    local command="${1:-help}"
    shift || true
    
    case "${command}" in
        "deploy")
            local version="${1:-}"
            local skip_monitoring="false"
            
            # Parse additional arguments
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --skip-monitoring)
                        skip_monitoring="true"
                        shift
                        ;;
                    --debug)
                        export DEBUG="true"
                        shift
                        ;;
                    *)
                        if [[ -z "${version}" ]]; then
                            version="$1"
                        fi
                        shift
                        ;;
                esac
            done
            
            deploy "${version}" "${skip_monitoring}"
            ;;
        "rollback")
            local reason="${1:-Manual rollback requested}"
            perform_rollback "${reason}"
            ;;
        "status")
            status
            ;;
        "switch")
            local target_env="${1:-}"
            if [[ "${target_env}" != "blue" && "${target_env}" != "green" ]]; then
                log_error "Invalid environment. Use 'blue' or 'green'"
                exit 1
            fi
            load_config
            switch_traffic "${target_env}"
            ;;
        "cleanup")
            local target_env="${1:-}"
            if [[ "${target_env}" != "blue" && "${target_env}" != "green" ]]; then
                log_error "Invalid environment. Use 'blue' or 'green'"
                exit 1
            fi
            cleanup_old_environment "${target_env}"
            ;;
        "init")
            init_deployment_config
            log_success "Deployment configuration initialized"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: ${command}"
            show_help
            exit 1
            ;;
    esac
}

# Trap signals for graceful shutdown
trap 'log_warn "Blue-green deployment script interrupted"; exit 130' INT TERM

# Ensure log directory exists
mkdir -p "$(dirname "${DEPLOYMENT_LOG}")"

# Run main function
main "$@"