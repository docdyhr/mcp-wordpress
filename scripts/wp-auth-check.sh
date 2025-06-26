#!/usr/bin/env bash

# wp-api-check.sh
# Check authenticated access to a WordPress site's REST API
# Supports .env file, environment variables, and CLI flags

set -euo pipefail

usage() {
    echo "Usage: $0 [-u username] [-p app_password] [-s site_url]"
    echo
    echo "Optional: create a .env file in the same directory:"
    echo "  WORDPRESS_USERNAME=..."
    echo "  WORDPRESS_APP_PASSWORD=..."
    echo "  WORDPRESS_SITE_URL=..."
    echo
    echo "Environment variables can also be set globally:"
    echo "  export WORDPRESS_USERNAME=..."
    echo
    echo "CLI flags override .env and environment variables."
    echo "Example:"
    echo "  $0 -s https://example.com"
    exit 1
}

# Load .env if present
if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    source .env
fi

# Defaults from env or .env
WP_USER="${WORDPRESS_USERNAME:-}"
WP_APP_PASSWORD="${WORDPRESS_APP_PASSWORD:-}"
WP_SITE_URL="${WORDPRESS_SITE_URL:-}"

# Parse CLI args
while getopts ":u:p:s:" opt; do
    case ${opt} in
    u) WP_USER="$OPTARG" ;;
    p) WP_APP_PASSWORD="$OPTARG" ;;
    s) WP_SITE_URL="$OPTARG" ;;
    *) usage ;;
    esac
done

# Require all inputs
[[ -z "$WP_USER" || -z "$WP_APP_PASSWORD" || -z "$WP_SITE_URL" ]] && usage

# Create auth header
AUTH_HEADER=$(echo -n "$WP_USER:$WP_APP_PASSWORD" | base64)

# Send request
response=$(curl -s -w "%{http_code}" -o /tmp/wp_api_response.json \
    -X GET "$WP_SITE_URL/wp-json/wp/v2/users/me" \
    -H "Authorization: Basic $AUTH_HEADER" \
    -H "Content-Type: application/json")

# Check result
if [[ "$response" == "200" ]]; then
    echo "✅ API connection successful:"
    jq '.' /tmp/wp_api_response.json
else
    echo "❌ API connection failed with HTTP $response"
    cat /tmp/wp_api_response.json
    exit 1
fi
