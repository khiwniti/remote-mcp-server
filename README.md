# Building a Remote MCP Server on Cloudflare (Without Auth)

This example allows you to deploy a remote MCP server that doesn't require authentication on Cloudflare Workers. This server includes multiple MCP tools adapted from the official Model Context Protocol servers repository.

## Available Tools

This MCP server includes **50+ tools** across the following categories:

### Calculator Tools (2 tools)
- `add` - Simple addition of two numbers
- `calculate` - Multi-operation calculator (add, subtract, multiply, divide)

### Time Tools (2 tools)
- `get_current_time` - Get current time in any timezone using IANA timezone names
- `convert_time` - Convert time between different timezones

### Fetch Tool (1 tool)
- `fetch` - Fetch web content and convert HTML to markdown

### Sequential Thinking Tool (1 tool)
- `sequential_thinking` - Step-by-step problem-solving with revision and branching support

### Memory / Knowledge Graph Tools (9 tools)
- `create_entities` - Create new entities in the knowledge graph
- `create_relations` - Create relations between entities
- `add_observations` - Add observations to existing entities
- `delete_entities` - Remove entities and their relations
- `delete_observations` - Remove specific observations
- `delete_relations` - Remove specific relations
- `read_graph` - View the entire knowledge graph
- `search_nodes` - Search across entity names, types, and observations
- `open_nodes` - Retrieve specific nodes by name

### Encoding / Decoding Tools (8 tools)
- `base64_encode` - Encode text to base64
- `base64_decode` - Decode base64 to text
- `url_encode` - URL encode text
- `url_decode` - URL decode text
- `html_encode` - HTML entity encode
- `html_decode` - HTML entity decode
- `hex_encode` - Encode text to hexadecimal
- `hex_decode` - Decode hexadecimal to text

### Hash Generation Tools (1 tool)
- `generate_hash` - Generate SHA-1, SHA-256, or SHA-512 hash

### UUID Generator (1 tool)
- `generate_uuid` - Generate UUID v4

### Text Manipulation Tools (5 tools)
- `convert_case` - Convert text case (upper, lower, title, camel, snake, kebab, pascal)
- `reverse_text` - Reverse text string
- `text_statistics` - Count characters, words, lines, sentences
- `repeat_text` - Repeat text with optional separator
- `clean_text` - Trim and clean text (remove extra spaces, empty lines)

### JSON Utilities (3 tools)
- `format_json` - Format/pretty-print JSON with configurable indentation
- `minify_json` - Minify JSON by removing whitespace
- `validate_json` - Validate JSON syntax

### Math Utilities (3 tools)
- `math_operation` - Advanced math operations (power, sqrt, log, trig functions, min, max, etc.)
- `random_number` - Generate random numbers with configurable precision
- `format_number` - Format numbers (thousands separator, currency, percentage, binary, octal, hex)

### Regex Tools (3 tools)
- `regex_test` - Test regex patterns and find matches
- `regex_replace` - Find and replace using regex
- `regex_extract` - Extract data using regex capture groups

## Adapted from Official and Community MCP Servers

This server adapts tools from multiple sources:

### Official MCP Servers (modelcontextprotocol/servers)
- ✅ **Time** - Timezone operations and time conversion
- ✅ **Fetch** - Web content fetching and HTML to markdown conversion
- ✅ **Memory** - Knowledge graph with entities, relations, and observations
- ✅ **Sequential Thinking** - Step-by-step problem-solving
- ❌ **Filesystem** - Not compatible (requires local filesystem)
- ❌ **Git** - Not compatible (requires git binary)

### Community MCP Server Capabilities
- ✅ **Text Toolkit** - Text manipulation, case conversion, statistics
- ✅ **IT Tools MCP** - Encoding/decoding (base64, URL, HTML, hex)
- ✅ **Hash Generators** - SHA-1, SHA-256, SHA-512
- ✅ **UUID Generator** - UUID v4 generation
- ✅ **JSON Tools** - JSON validation, formatting, minification
- ✅ **Regex Tools** - Pattern testing, replacement, extraction
- ✅ **Math Utilities** - Advanced math operations, random generation, number formatting

### Why Some Servers Couldn't Be Adapted
The following require external dependencies not available in Cloudflare Workers:
- **Puppeteer/Selenium** - Requires browser automation (needs headless Chrome)
- **Database servers** (PostgreSQL, SQLite, etc.) - Need database connections
- **API-dependent servers** - Require API keys or external services
- **File system operations** - Cloudflare Workers is serverless with no persistent filesystem

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
