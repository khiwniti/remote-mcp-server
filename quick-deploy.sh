#!/bin/bash

# Quick deployment script with pre-configured credentials
# Uses the provided Cloudflare API token

set -e

echo "🚀 Quick Deploy - AI Code Assistant MCP Server"
echo "=============================================="
echo ""

# Set credentials
export CLOUDFLARE_API_TOKEN="4clZ9eD_zyqUkOILaIDsnCvaTyjniQqHJZ93Wd0u"
export CLOUDFLARE_ACCOUNT_ID="5adf62efd6cf179a8939c211b155e229"

echo "✅ Using pre-configured Cloudflare credentials"
echo "   Account ID: $CLOUDFLARE_ACCOUNT_ID"
echo ""

# Try to bypass proxy for Cloudflare API
export no_proxy="${no_proxy},*.cloudflare.com,api.cloudflare.com,cloudflare.com"
export NO_PROXY="${NO_PROXY},*.cloudflare.com,api.cloudflare.com,cloudflare.com"

echo "📦 Deploying to Cloudflare Workers..."
echo ""

# Run deployment
if npm run deploy; then
    echo ""
    echo "✅ =============================================="
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "✅ =============================================="
    echo ""
    echo "Your AI Code Assistant MCP Server is live!"
    echo ""
    echo "🔗 Server URL:"
    echo "   https://remote-mcp-server.<your-subdomain>.workers.dev/sse"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Test your server:"
    echo "   ./test-server.sh https://remote-mcp-server.<your-subdomain>.workers.dev"
    echo ""
    echo "2. Test in Cloudflare AI Playground:"
    echo "   https://playground.ai.cloudflare.com/"
    echo ""
    echo "3. Connect to Claude Desktop:"
    echo "   See DEPLOYMENT_GUIDE.md for instructions"
    echo ""
    echo "4. Start using AI code assistance:"
    echo "   - analyze_code: Find bugs and issues"
    echo "   - improve_code: Get optimization suggestions"
    echo "   - fix_code_issues: Auto-fix problems"
    echo "   - code_review: Comprehensive review"
    echo "   - explain_code: Understand code"
    echo ""
else
    echo ""
    echo "❌ =============================================="
    echo "❌ DEPLOYMENT FAILED"
    echo "❌ =============================================="
    echo ""
    echo "This might be due to network restrictions."
    echo ""
    echo "Alternative deployment methods:"
    echo ""
    echo "1. Deploy from your local machine:"
    echo "   - Clone this repo"
    echo "   - Run: export CLOUDFLARE_API_TOKEN=4clZ9eD_zyqUkOILaIDsnCvaTyjniQqHJZ93Wd0u"
    echo "   - Run: npm install && npm run deploy"
    echo ""
    echo "2. Use browser authentication:"
    echo "   - Run: npx wrangler login"
    echo "   - Run: npm run deploy"
    echo ""
    echo "3. Deploy via GitHub Actions:"
    echo "   - Push to GitHub"
    echo "   - Add CLOUDFLARE_API_TOKEN to secrets"
    echo "   - Use GitHub Actions workflow"
    echo ""
    echo "See DEPLOYMENT_GUIDE.md for detailed instructions"
    echo ""
    exit 1
fi
