# Deployment Guide - AI Code Assistant MCP Server

## Prerequisites

- Node.js installed (v18 or higher)
- Cloudflare account (free tier works!)
- Cloudflare API token with Workers permissions

## Step 1: Get Your Cloudflare API Token

### Method 1: Create API Token (Recommended)
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template
4. Click "Continue to summary" → "Create Token"
5. Copy your token

### Method 2: Use Existing Token
You can use the token provided:
```bash
export CLOUDFLARE_API_TOKEN=4clZ9eD_zyqUkOILaIDsnCvaTyjniQqHJZ93Wd0u
export CLOUDFLARE_ACCOUNT_ID=5adf62efd6cf179a8939c211b155e229
```

## Step 2: Deploy to Cloudflare

### Option A: Using the deployment script
```bash
chmod +x deploy.sh
export CLOUDFLARE_API_TOKEN=your_token_here
./deploy.sh
```

### Option B: Using wrangler directly
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
npm run deploy
```

### Option C: Browser authentication
```bash
npx wrangler login
npm run deploy
```

## Step 3: Get Your Server URL

After deployment, you'll see output like:
```
Published remote-mcp-server (X.XX sec)
  https://remote-mcp-server.your-account.workers.dev
```

Your MCP server URL will be:
```
https://remote-mcp-server.your-account.workers.dev/sse
```

## Step 4: Test Your Deployment

### Test server connectivity:
```bash
chmod +x test-server.sh
./test-server.sh https://remote-mcp-server.your-account.workers.dev
```

### Test in Cloudflare AI Playground:
1. Go to https://playground.ai.cloudflare.com/
2. Click "Add MCP Server" or similar option
3. Enter your server URL: `https://remote-mcp-server.your-account.workers.dev/sse`
4. Test the tools:
   - `analyze_code` - Analyze code for issues
   - `improve_code` - Get code improvement suggestions
   - `fix_code_issues` - Fix specific code problems
   - `code_review` - Get comprehensive code review
   - `explain_code` - Understand what code does

## Step 5: Connect to Claude Desktop

### Update Claude Desktop configuration:
1. Open Claude Desktop
2. Go to Settings > Developer > Edit Config
3. Add this configuration:

```json
{
  "mcpServers": {
    "ai-code-assistant": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server.your-account.workers.dev/sse"
      ]
    }
  }
}
```

4. Restart Claude Desktop
5. You should see the tools available!

## Step 6: Start Using

Now you can ask Claude (or your LLM) to:

- "Analyze this Python function for potential bugs"
- "Review this TypeScript code and rate it"
- "Explain what this recursive function does"
- "Improve this code for better performance"
- "Fix the null pointer issues in this code"

## Troubleshooting

### Deployment fails with network error
- Check your API token is valid
- Try browser authentication: `npx wrangler login`
- Check your internet connection

### Server deployed but tools don't work
- Verify Workers AI is enabled in your Cloudflare account
- Check the wrangler.jsonc has the AI binding configured
- View logs: `npx wrangler tail`

### Tools return "AI binding not available"
- Workers AI binding is missing in deployment
- Re-deploy after confirming wrangler.jsonc has:
  ```json
  "ai": {
    "binding": "AI"
  }
  ```

## Useful Commands

```bash
# Deploy
npm run deploy

# View logs
npx wrangler tail

# Test locally
npm run dev

# Check deployment status
npx wrangler deployments list

# Delete deployment
npx wrangler delete
```

## Cost

- Cloudflare Workers Free tier: 100,000 requests/day
- Workers AI Free tier: 10,000 neurons/day
- More than enough for personal use!

## Support

For issues:
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare AI: https://developers.cloudflare.com/workers-ai/
- MCP Protocol: https://modelcontextprotocol.io/
