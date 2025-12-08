# AI Code Assistant - Remote MCP Server on Cloudflare

This is an AI-powered code assistance MCP server deployed on Cloudflare Workers. It provides intelligent tools to help analyze, improve, fix, review, and explain code using Cloudflare Workers AI.

## Available Tools

This MCP server provides 5 powerful code assistance tools:

### 1. **analyze_code**
Analyzes code quality and identifies issues including:
- Potential bugs or errors
- Security vulnerabilities
- Performance issues
- Code smells and anti-patterns
- Best practice violations

### 2. **improve_code**
Suggests improvements for code with focus areas:
- Performance optimization
- Readability enhancement
- Maintainability improvements
- Overall code quality

### 3. **fix_code_issues**
Automatically fixes common code problems based on described issues.

### 4. **code_review**
Performs comprehensive code review including:
- Overall assessment
- Strengths and weaknesses
- Specific recommendations
- Security considerations
- Quality rating (X/10)

### 5. **explain_code**
Explains what code does with three detail levels:
- **brief**: Concise summary
- **detailed**: Step-by-step explanations
- **expert**: Expert-level technical depth

## Get Started

### Deploy to Cloudflare

```bash
npm install
npm run deploy
```

This will deploy your MCP server to a URL like: `remote-mcp-server.<your-account>.workers.dev/sse`

## Customizing Your MCP Server

To add more tools to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`. 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server.<your-account>.workers.dev/sse`)
3. Start using the AI code assistance tools!

## Connect Claude Desktop to Your MCP Server

You can connect to your remote MCP server from Claude Desktop using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

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
        "https://remote-mcp-server.<your-account>.workers.dev/sse"
      ]
    }
  }
}
```

4. Restart Claude Desktop
5. Your AI code assistance tools will be available!

## Example Usage

Once connected, you can use tools like:

- "Analyze this Python function for potential issues"
- "Improve this JavaScript code for better performance"
- "Review this TypeScript class and rate it"
- "Explain what this code does in detail"
- "Fix the null pointer issues in this code" 
