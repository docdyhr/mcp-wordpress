#!/usr/bin/env bash

# wp-api-check.sh
# Check authenticated access to a WordPress site's REST API
# Supports .env file, environment variables, and CLI flags

set -euo pipefail

usage() {
    echo "WordPress Authentication Check Script"
    echo "======================================"
    echo
    echo "USAGE:"
    echo "  $0 [OPTIONS]"
    echo "  $0 --help"
    echo
    echo "OPTIONS:"
    echo "  -u USERNAME     WordPress username"
    echo "  -p PASSWORD     WordPress Application Password (for app-password auth)"
    echo "  -w PASSWORD     WordPress user password (for JWT auth)"
    echo "  -j JWT_SECRET   JWT secret key (for JWT auth)"
    echo "  -s SITE_URL     WordPress site URL (including https://)"
    echo "  -m METHOD       Authentication method: app-password, jwt (default: app-password)"
    echo "  --help          Show this help message"
    echo
    echo "AUTHENTICATION METHODS:"
    echo
    echo "  1. Application Passwords (default):"
    echo "     $0 -u admin -p \"xxxx xxxx xxxx xxxx xxxx xxxx\" -s https://site.com"
    echo
    echo "  2. JWT Authentication:"
    echo "     $0 -u admin -w \"user_password\" -j \"jwt_secret\" -s https://site.com -m jwt"
    echo
    echo "CONFIGURATION:"
    echo "  Environment variables:"
    echo "    # App Password method"
    echo "    export WORDPRESS_USERNAME=\"your_username\""
    echo "    export WORDPRESS_APP_PASSWORD=\"xxxx xxxx xxxx xxxx xxxx xxxx\""
    echo "    export WORDPRESS_SITE_URL=\"https://yoursite.com\""
    echo "    export WORDPRESS_AUTH_METHOD=\"app-password\""
    echo
    echo "    # JWT method"
    echo "    export WORDPRESS_USERNAME=\"your_username\""
    echo "    export WORDPRESS_PASSWORD=\"your_user_password\""
    echo "    export WORDPRESS_JWT_SECRET=\"your_jwt_secret_key\""
    echo "    export WORDPRESS_SITE_URL=\"https://yoursite.com\""
    echo "    export WORDPRESS_AUTH_METHOD=\"jwt\""
    echo
    echo "  .env file in script directory:"
    echo "    WORDPRESS_USERNAME=your_username"
    echo "    WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx"
    echo "    WORDPRESS_SITE_URL=https://yoursite.com"
    echo "    WORDPRESS_AUTH_METHOD=app-password"
    echo
    echo "EXAMPLES:"
    echo "  # Use environment variables or .env file"
    echo "  $0"
    echo
    echo "  # App Password authentication"
    echo "  $0 -u admin -p \"abcd efgh ijkl mnop qrst uvwx\" -s https://example.com"
    echo
    echo "  # JWT authentication"
    echo "  $0 -u admin -w \"mypassword\" -j \"jwt_secret_key\" -s https://example.com -m jwt"
    echo
    echo "  # Override method only"
    echo "  $0 -m jwt"
    echo
    echo "SETUP REQUIREMENTS:"
    echo
    echo "  Application Passwords:"
    echo "    - Generate in WordPress Admin → Users → Your Profile → Application Passwords"
    echo "    - Format: xxxx xxxx xxxx xxxx xxxx xxxx (24 characters with spaces)"
    echo
    echo "  JWT Authentication:"
    echo "    - Install JWT Authentication plugin in WordPress"
    echo "    - Add JWT_AUTH_SECRET_KEY to wp-config.php"
    echo "    - Configure plugin endpoints and settings"
    echo
    exit 1
}

# Load .env if present
if [[ -f .env ]]; then
    # Parse .env file line by line to handle spaces in values
    while IFS='=' read -r key value; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        # Remove leading/trailing whitespace from key
        key=$(echo "$key" | xargs)
        # Export the variable
        export "$key"="$value"
    done < .env
fi

# Defaults from env or .env
WP_USER="${WORDPRESS_USERNAME:-}"
WP_APP_PASSWORD="${WORDPRESS_APP_PASSWORD:-}"
WP_USER_PASSWORD="${WORDPRESS_JWT_PASSWORD:-}"
WP_JWT_SECRET="${WORDPRESS_JWT_SECRET:-}"
WP_SITE_URL="${WORDPRESS_SITE_URL:-}"
WP_AUTH_METHOD="${WORDPRESS_AUTH_METHOD:-app-password}"

# Check for help flag first
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
fi

# Parse CLI args
while getopts ":u:p:w:j:s:m:" opt; do
    case ${opt} in
    u) WP_USER="$OPTARG" ;;
    p) WP_APP_PASSWORD="$OPTARG" ;;
    w) WP_USER_PASSWORD="$OPTARG" ;;
    j) WP_JWT_SECRET="$OPTARG" ;;
    s) WP_SITE_URL="$OPTARG" ;;
    m) WP_AUTH_METHOD="$OPTARG" ;;
    *) usage ;;
    esac
done

# Validate auth method
if [[ "$WP_AUTH_METHOD" != "app-password" && "$WP_AUTH_METHOD" != "jwt" ]]; then
    echo "❌ Invalid auth method: $WP_AUTH_METHOD"
    echo "Valid methods: app-password, jwt"
    exit 1
fi

# Validate required inputs based on auth method
if [[ -z "$WP_USER" || -z "$WP_SITE_URL" ]]; then
    echo "❌ Missing required parameters: username and site URL"
    usage
fi

if [[ "$WP_AUTH_METHOD" == "app-password" ]]; then
    if [[ -z "$WP_APP_PASSWORD" ]]; then
        echo "❌ Application Password required for app-password method"
        usage
    fi
elif [[ "$WP_AUTH_METHOD" == "jwt" ]]; then
    if [[ -z "$WP_USER_PASSWORD" || -z "$WP_JWT_SECRET" ]]; then
        echo "❌ User password and JWT secret required for JWT method"
        usage
    fi
fi

# Function to generate JWT token
generate_jwt_token() {
    local username="$1"
    local password="$2"
    local site_url="$3"
    local jwt_secret="$4"
    
    # Get JWT token from WordPress
    local jwt_response
    jwt_response=$(curl -s -w "%{http_code}" -o /tmp/jwt_token_response.json \
        -X POST "$site_url/wp-json/jwt-auth/v1/token" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    local jwt_http_code="${jwt_response: -3}"
    
    if [[ "$jwt_http_code" == "200" ]]; then
        # Extract token from response
        local token
        token=$(jq -r '.token' /tmp/jwt_token_response.json 2>/dev/null)
        if [[ "$token" != "null" && -n "$token" ]]; then
            echo "$token"
            return 0
        else
            echo "❌ Failed to extract JWT token from response"
            cat /tmp/jwt_token_response.json
            return 1
        fi
    else
        echo "❌ JWT token request failed with HTTP $jwt_http_code"
        cat /tmp/jwt_token_response.json
        return 1
    fi
}

# Perform authentication based on method
echo "🔐 Testing $WP_AUTH_METHOD authentication for $WP_USER at $WP_SITE_URL"

if [[ "$WP_AUTH_METHOD" == "app-password" ]]; then
    # Application Password authentication
    AUTH_HEADER=$(echo -n "$WP_USER:$WP_APP_PASSWORD" | base64)
    
    response=$(curl -s -w "%{http_code}" -o /tmp/wp_api_response.json \
        -X GET "$WP_SITE_URL/wp-json/wp/v2/users/me" \
        -H "Authorization: Basic $AUTH_HEADER" \
        -H "Content-Type: application/json")

elif [[ "$WP_AUTH_METHOD" == "jwt" ]]; then
    # JWT authentication
    echo "🔑 Generating JWT token..."
    JWT_TOKEN=$(generate_jwt_token "$WP_USER" "$WP_USER_PASSWORD" "$WP_SITE_URL" "$WP_JWT_SECRET")
    
    if [[ $? -ne 0 ]]; then
        exit 1
    fi
    
    echo "✅ JWT token generated successfully"
    echo "🧪 Testing authenticated API call..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/wp_api_response.json \
        -X GET "$WP_SITE_URL/wp-json/wp/v2/users/me" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json")
fi

# Check result
if [[ "$response" == "200" ]]; then
    echo "✅ Authentication successful!"
    echo "📋 User details:"
    jq '.' /tmp/wp_api_response.json
else
    echo "❌ Authentication failed with HTTP $response"
    echo "📋 Error response:"
    cat /tmp/wp_api_response.json
    exit 1
fi

# Cleanup
rm -f /tmp/wp_api_response.json /tmp/jwt_token_response.json
