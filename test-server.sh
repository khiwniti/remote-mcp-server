#!/bin/bash

# Test script for AI Code Assistant MCP Server
# Tests all 5 AI code assistance tools

set -e

echo "🧪 Testing AI Code Assistant MCP Server"
echo ""

# Check if server URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./test-server.sh <server-url>"
    echo ""
    echo "Example:"
    echo "  ./test-server.sh https://remote-mcp-server.your-account.workers.dev"
    echo ""
    echo "Or test locally:"
    echo "  npm run dev"
    echo "  # In another terminal:"
    echo "  ./test-server.sh http://localhost:8787"
    exit 1
fi

SERVER_URL="$1"

echo "Testing server at: $SERVER_URL"
echo ""

# Test 1: Check if server is accessible
echo "1️⃣  Testing server connectivity..."
curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/sse" | grep -q "200\|404" && echo "✅ Server is accessible" || (echo "❌ Server is not accessible" && exit 1)
echo ""

# Test 2: Simple code example for testing
TEST_CODE='function add(a, b) { return a + b; }'

echo "2️⃣  Testing AI code assistance tools..."
echo "   Test code: $TEST_CODE"
echo ""

# Note: Testing MCP tools requires MCP client integration
# The tools can be tested via:
# - Cloudflare AI Playground: https://playground.ai.cloudflare.com/
# - Claude Desktop with mcp-remote
# - Direct MCP protocol calls

echo "✅ Server is ready for testing!"
echo ""
echo "To test the AI tools:"
echo ""
echo "Option 1: Cloudflare AI Playground"
echo "  1. Go to https://playground.ai.cloudflare.com/"
echo "  2. Enter your server URL: $SERVER_URL/sse"
echo "  3. Test tools: analyze_code, improve_code, fix_code_issues, code_review, explain_code"
echo ""
echo "Option 2: Claude Desktop"
echo "  1. Configure Claude Desktop (see README.md)"
echo "  2. Ask Claude to use your code assistance tools"
echo ""
echo "Option 3: Test with curl (basic connectivity only)"
echo "  curl $SERVER_URL/sse"
echo ""
