#!/bin/bash

# Deployment script for AI Code Assistant MCP Server
# This script helps deploy your MCP server to Cloudflare Workers

set -e

echo "🚀 Deploying AI Code Assistant MCP Server to Cloudflare..."
echo ""

# Check if CLOUDFLARE_API_TOKEN is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  CLOUDFLARE_API_TOKEN not found in environment"
    echo ""
    echo "Please set your Cloudflare API token:"
    echo "  export CLOUDFLARE_API_TOKEN=your_token_here"
    echo ""
    echo "Or login via browser:"
    echo "  npx wrangler login"
    echo ""
    exit 1
fi

# Check if CLOUDFLARE_ACCOUNT_ID is set
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "⚠️  CLOUDFLARE_ACCOUNT_ID not found in environment"
    echo "Using account ID from API token..."
    export CLOUDFLARE_ACCOUNT_ID="5adf62efd6cf179a8939c211b155e229"
fi

echo "✅ Using Cloudflare Account ID: $CLOUDFLARE_ACCOUNT_ID"
echo ""

# Deploy to Cloudflare Workers
echo "📦 Deploying to Cloudflare Workers..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Your MCP server is now available at:"
    echo "  https://remote-mcp-server.<your-account>.workers.dev/sse"
    echo ""
    echo "Next steps:"
    echo "  1. Test your server: npm run test"
    echo "  2. Connect to Claude Desktop (see README.md)"
    echo "  3. Start using AI code assistance tools!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error message above."
    exit 1
fi
