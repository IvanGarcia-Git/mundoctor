#!/bin/bash

# Test script for backend CORS and API functionality
echo "🧪 Testing Mundoctor Backend API..."
echo "=================================="

API_BASE="http://localhost:8000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local extra_headers=$4
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Method: $method | Endpoint: $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -H "Origin: http://localhost:5173" \
            -H "Content-Type: application/json" \
            $extra_headers \
            "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X $method \
            -H "Origin: http://localhost:5173" \
            -H "Content-Type: application/json" \
            $extra_headers \
            -d '{"test": "data"}' \
            "$API_BASE$endpoint")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
}

# Function to test CORS preflight
test_cors_preflight() {
    local endpoint=$1
    local description=$2
    
    echo -e "\n${YELLOW}Testing CORS Preflight: $description${NC}"
    echo "Endpoint: $endpoint"
    
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -X OPTIONS \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        "$API_BASE$endpoint")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✅ CORS Preflight Success (HTTP $http_code)${NC}"
    else
        echo -e "${RED}❌ CORS Preflight Failed (HTTP $http_code)${NC}"
    fi
}

echo "Starting tests..."

# 1. Test server is running
echo -e "\n${YELLOW}1. Testing if server is running...${NC}"
if curl -s "$API_BASE/health" > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running on $API_BASE${NC}"
    echo "Please start the backend server with: cd backend && npm run dev"
    exit 1
fi

# 2. Basic health check
test_endpoint "GET" "/health" "Health check endpoint"

# 3. Test CORS preflight for API endpoints
test_cors_preflight "/api/cors-test" "CORS test endpoint"
test_cors_preflight "/api/users/profile" "Users profile endpoint"

# 4. Test CORS-enabled endpoints
test_endpoint "GET" "/api/cors-test" "CORS test GET endpoint"
test_endpoint "POST" "/api/cors-test" "CORS test POST endpoint"

# 5. Test API endpoint (should fail with 401 but CORS should work)
test_endpoint "GET" "/api/users/profile" "Users profile (expect 401)" "-H 'Authorization: Bearer fake-token'"

# 6. Test webhook endpoint accessibility
test_endpoint "GET" "/api/webhooks/clerk" "Webhook info endpoint"

echo -e "\n${YELLOW}=================================="
echo "🎯 Test Summary:"
echo "- If you see CORS errors, check the backend console logs"
echo "- If server is not running, start it with: cd backend && npm run dev"
echo -e "- Open test-cors.html in your browser for frontend tests${NC}"

echo -e "\n${YELLOW}💡 Troubleshooting:${NC}"
echo "1. Make sure backend is running on port 8000"
echo "2. Check backend console for CORS-related logs"
echo "3. Verify frontend is running on port 5173"
echo "4. Open browser dev tools to check for CORS errors"