# Building a Remote MCP Server on Cloudflare (Without Auth)

This example allows you to deploy a remote MCP server that doesn't require authentication on Cloudflare Workers. This server includes multiple MCP tools adapted from the official Model Context Protocol servers repository.

## Available Tools

This MCP server includes the following categories of tools:

### Calculator Tools
- `add` - Simple addition of two numbers
- `calculate` - Multi-operation calculator (add, subtract, multiply, divide)

### Time Tools
- `get_current_time` - Get current time in any timezone using IANA timezone names
- `convert_time` - Convert time between different timezones

### Fetch Tool
- `fetch` - Fetch web content and convert HTML to markdown

### Sequential Thinking Tool
- `sequential_thinking` - Step-by-step problem-solving with revision and branching support

### Memory / Knowledge Graph Tools
- `create_entities` - Create new entities in the knowledge graph
- `create_relations` - Create relations between entities
- `add_observations` - Add observations to existing entities
- `delete_entities` - Remove entities and their relations
- `delete_observations` - Remove specific observations
- `delete_relations` - Remove specific relations
- `read_graph` - View the entire knowledge graph
- `search_nodes` - Search across entity names, types, and observations
- `open_nodes` - Retrieve specific nodes by name

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`.

## Setting up Memory Storage

The memory/knowledge graph tools require a Cloudflare KV namespace. To set this up:

1. Create a KV namespace:
```bash
wrangler kv:namespace create "MEMORY_KV"
```

2. Update the `wrangler.toml` file with the namespace ID returned from the command above.

3. For preview/development:
```bash
wrangler kv:namespace create "MEMORY_KV" --preview
``` 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-authless.<your-account>.workers.dev/sse`)
3. You can now use your MCP tools directly from the playground!

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote). 

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

Update with this configuration:

```json
{
  "mcpServers": {
    "remote-mcp-multi-tool": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"  // or remote-mcp-server.your-account.workers.dev/sse
      ]
    }
  }
}
```

Restart Claude and you should see the tools become available. 
