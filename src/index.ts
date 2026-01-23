import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Memory storage interfaces
interface Entity {
	name: string;
	entityType: string;
	observations: string[];
}

interface Relation {
	from: string;
	to: string;
	relationType: string;
}

interface KnowledgeGraph {
	entities: Record<string, Entity>;
	relations: Relation[];
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Remote MCP Server - Multi-Tool",
		version: "1.0.0",
	});

	static currentEnv: Env | undefined;

	private get env(): Env | undefined {
		return MyMCP.currentEnv;
	}

	// Helper methods for memory management
	private async loadGraph(): Promise<KnowledgeGraph> {
		if (!this.env?.MEMORY_KV) {
			return { entities: {}, relations: [] };
		}

		const data = await this.env.MEMORY_KV.get("knowledge_graph");
		if (!data) {
			return { entities: {}, relations: [] };
		}

		try {
			return JSON.parse(data);
		} catch {
			return { entities: {}, relations: [] };
		}
	}

	private async saveGraph(graph: KnowledgeGraph): Promise<void> {
		if (!this.env?.MEMORY_KV) {
			throw new Error("MEMORY_KV binding not available");
		}
		await this.env.MEMORY_KV.put("knowledge_graph", JSON.stringify(graph));
	}

	async init() {
		// ============================================
		// CALCULATOR TOOLS
		// ============================================

		// Simple addition tool
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);

		// ============================================
		// TIME TOOLS
		// ============================================

		// Get current time in a specific timezone
		this.server.tool(
			"get_current_time",
			{
				timezone: z.string().describe("IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'UTC')"),
			},
			async ({ timezone }) => {
				try {
					const now = new Date();
					const timeStr = now.toLocaleString("en-US", {
						timeZone: timezone,
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
						hour12: false,
					});

					return {
						content: [{
							type: "text",
							text: `Current time in ${timezone}: ${timeStr}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: Invalid timezone "${timezone}". Please use a valid IANA timezone name.`
						}],
					};
				}
			},
		);

		// Convert time between timezones
		this.server.tool(
			"convert_time",
			{
				source_timezone: z.string().describe("Source IANA timezone name"),
				time: z.string().describe("Time in 24-hour format (HH:MM)"),
				target_timezone: z.string().describe("Target IANA timezone name"),
			},
			async ({ source_timezone, time, target_timezone }) => {
				try {
					// Parse the time string (HH:MM)
					const [hours, minutes] = time.split(":").map(Number);
					if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
						return {
							content: [{
								type: "text",
								text: `Error: Invalid time format "${time}". Please use HH:MM format (00:00 to 23:59).`
							}],
						};
					}

					// Create a date object with today's date and the specified time in source timezone
					const now = new Date();
					const dateStr = now.toLocaleDateString("en-US", { timeZone: source_timezone });
					const sourceDate = new Date(`${dateStr} ${time}:00`);

					// Convert to target timezone
					const targetTimeStr = sourceDate.toLocaleString("en-US", {
						timeZone: target_timezone,
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
						hour12: false,
					});

					return {
						content: [{
							type: "text",
							text: `${time} in ${source_timezone} is ${targetTimeStr} in ${target_timezone}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to convert time"}`
						}],
					};
				}
			},
		);

		// ============================================
		// FETCH TOOL
		// ============================================

		// Fetch web content and convert to markdown
		this.server.tool(
			"fetch",
			{
				url: z.string().url().describe("URL to fetch"),
				max_length: z.number().optional().describe("Maximum number of characters to return (default: 5000)"),
				start_index: z.number().optional().describe("Start content from this character index (default: 0)"),
				raw: z.boolean().optional().describe("Get raw content without markdown conversion (default: false)"),
			},
			async ({ url, max_length = 5000, start_index = 0, raw = false }) => {
				try {
					const response = await fetch(url);
					if (!response.ok) {
						return {
							content: [{
								type: "text",
								text: `Error: HTTP ${response.status} - ${response.statusText}`
							}],
						};
					}

					let content = await response.text();

					// Basic HTML to Markdown conversion if not raw
					if (!raw && response.headers.get("content-type")?.includes("text/html")) {
						// Remove script and style tags
						content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
						content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

						// Convert common HTML tags to markdown
						content = content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n");
						content = content.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
						content = content.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n");
						content = content.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
						content = content.replace(/<br\s*\/?>/gi, "\n");
						content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
						content = content.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
						content = content.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
						content = content.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
						content = content.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

						// Remove remaining HTML tags
						content = content.replace(/<[^>]+>/g, "");

						// Decode HTML entities
						content = content.replace(/&nbsp;/g, " ");
						content = content.replace(/&amp;/g, "&");
						content = content.replace(/&lt;/g, "<");
						content = content.replace(/&gt;/g, ">");
						content = content.replace(/&quot;/g, '"');

						// Clean up extra whitespace
						content = content.replace(/\n{3,}/g, "\n\n");
						content = content.trim();
					}

					// Apply start_index and max_length
					const slicedContent = content.slice(start_index, start_index + max_length);
					const truncated = content.length > (start_index + max_length);

					return {
						content: [{
							type: "text",
							text: slicedContent + (truncated ? "\n\n[Content truncated...]" : "")
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`
						}],
					};
				}
			},
		);

		// ============================================
		// SEQUENTIAL THINKING TOOL
		// ============================================

		// Sequential thinking for complex problem-solving
		this.server.tool(
			"sequential_thinking",
			{
				thought: z.string().describe("The current thinking step"),
				nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
				thoughtNumber: z.number().int().describe("Current thought number"),
				totalThoughts: z.number().int().describe("Estimated total thoughts needed"),
				isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
				revisesThought: z.number().int().optional().describe("Which thought is being reconsidered"),
				branchFromThought: z.number().int().optional().describe("Branching point thought number"),
				branchId: z.string().optional().describe("Branch identifier"),
				needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed"),
			},
			async (params) => {
				const {
					thought,
					nextThoughtNeeded,
					thoughtNumber,
					totalThoughts,
					isRevision,
					revisesThought,
					branchFromThought,
					branchId,
					needsMoreThoughts,
				} = params;

				let response = `[Thought ${thoughtNumber}/${totalThoughts}]`;

				if (isRevision && revisesThought) {
					response += ` [Revision of thought ${revisesThought}]`;
				}

				if (branchId && branchFromThought) {
					response += ` [Branch "${branchId}" from thought ${branchFromThought}]`;
				}

				response += `\n${thought}`;

				if (needsMoreThoughts) {
					response += "\n\n[More thoughts needed to complete analysis]";
				} else if (nextThoughtNeeded) {
					response += "\n\n[Proceeding to next thought...]";
				} else {
					response += "\n\n[Thinking sequence complete]";
				}

				return {
					content: [{ type: "text", text: response }],
				};
			},
		);

		// ============================================
		// MEMORY / KNOWLEDGE GRAPH TOOLS
		// ============================================

		// Create entities
		this.server.tool(
			"create_entities",
			{
				entities: z.array(z.object({
					name: z.string(),
					entityType: z.string(),
					observations: z.array(z.string()),
				})),
			},
			async ({ entities }) => {
				try {
					const graph = await this.loadGraph();

					for (const entity of entities) {
						if (graph.entities[entity.name]) {
							return {
								content: [{
									type: "text",
									text: `Error: Entity "${entity.name}" already exists`
								}],
							};
						}
						graph.entities[entity.name] = {
							name: entity.name,
							entityType: entity.entityType,
							observations: entity.observations,
						};
					}

					await this.saveGraph(graph);

					return {
						content: [{
							type: "text",
							text: `Successfully created ${entities.length} entit${entities.length === 1 ? "y" : "ies"}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to create entities"}`
						}],
					};
				}
			},
		);

		// Create relations
		this.server.tool(
			"create_relations",
			{
				relations: z.array(z.object({
					from: z.string(),
					to: z.string(),
					relationType: z.string(),
				})),
			},
			async ({ relations }) => {
				try {
					const graph = await this.loadGraph();

					for (const relation of relations) {
						if (!graph.entities[relation.from]) {
							return {
								content: [{
									type: "text",
									text: `Error: Entity "${relation.from}" does not exist`
								}],
							};
						}
						if (!graph.entities[relation.to]) {
							return {
								content: [{
									type: "text",
									text: `Error: Entity "${relation.to}" does not exist`
								}],
							};
						}

						// Check if relation already exists
						const exists = graph.relations.some(
							r => r.from === relation.from && r.to === relation.to && r.relationType === relation.relationType
						);

						if (!exists) {
							graph.relations.push(relation);
						}
					}

					await this.saveGraph(graph);

					return {
						content: [{
							type: "text",
							text: `Successfully created ${relations.length} relation${relations.length === 1 ? "" : "s"}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to create relations"}`
						}],
					};
				}
			},
		);

		// Add observations
		this.server.tool(
			"add_observations",
			{
				observations: z.array(z.object({
					entityName: z.string(),
					contents: z.array(z.string()),
				})),
			},
			async ({ observations }) => {
				try {
					const graph = await this.loadGraph();

					for (const obs of observations) {
						if (!graph.entities[obs.entityName]) {
							return {
								content: [{
									type: "text",
									text: `Error: Entity "${obs.entityName}" does not exist`
								}],
							};
						}

						for (const content of obs.contents) {
							if (!graph.entities[obs.entityName].observations.includes(content)) {
								graph.entities[obs.entityName].observations.push(content);
							}
						}
					}

					await this.saveGraph(graph);

					return {
						content: [{
							type: "text",
							text: "Successfully added observations"
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to add observations"}`
						}],
					};
				}
			},
		);

		// Delete entities
		this.server.tool(
			"delete_entities",
			{
				entityNames: z.array(z.string()),
			},
			async ({ entityNames }) => {
				try {
					const graph = await this.loadGraph();

					for (const name of entityNames) {
						delete graph.entities[name];
						// Remove all relations involving this entity
						graph.relations = graph.relations.filter(
							r => r.from !== name && r.to !== name
						);
					}

					await this.saveGraph(graph);

					return {
						content: [{
							type: "text",
							text: `Successfully deleted ${entityNames.length} entit${entityNames.length === 1 ? "y" : "ies"}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to delete entities"}`
						}],
					};
				}
			},
		);

		// Delete observations
		this.server.tool(
			"delete_observations",
			{
				deletions: z.array(z.object({
					entityName: z.string(),
					observations: z.array(z.string()),
				})),
			},
			async ({ deletions }) => {
				try {
					const graph = await this.loadGraph();

					for (const deletion of deletions) {
						if (!graph.entities[deletion.entityName]) {
							return {
								content: [{
									type: "text",
									text: `Error: Entity "${deletion.entityName}" does not exist`
								}],
							};
						}

						graph.entities[deletion.entityName].observations =
							graph.entities[deletion.entityName].observations.filter(
								obs => !deletion.observations.includes(obs)
							);
					}

					await this.saveGraph(graph);

					return {
						content: [{
							type: "text",
							text: "Successfully deleted observations"
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to delete observations"}`
						}],
					};
				}
			},
		);

		// Delete relations
		this.server.tool(
			"delete_relations",
			{
				relations: z.array(z.object({
					from: z.string(),
					to: z.string(),
					relationType: z.string(),
				})),
			},
			async ({ relations }) => {
				try {
					const graph = await this.loadGraph();

					for (const relation of relations) {
						graph.relations = graph.relations.filter(
							r => !(r.from === relation.from && r.to === relation.to && r.relationType === relation.relationType)
						);
					}

					await this.saveGraph(graph);

					return {
						content: [{
							type: "text",
							text: `Successfully deleted ${relations.length} relation${relations.length === 1 ? "" : "s"}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to delete relations"}`
						}],
					};
				}
			},
		);

		// Read entire graph
		this.server.tool(
			"read_graph",
			{},
			async () => {
				try {
					const graph = await this.loadGraph();

					const entityCount = Object.keys(graph.entities).length;
					const relationCount = graph.relations.length;

					if (entityCount === 0) {
						return {
							content: [{
								type: "text",
								text: "Knowledge graph is empty"
							}],
						};
					}

					let output = `Knowledge Graph:\n\n`;
					output += `Entities (${entityCount}):\n`;

					for (const [name, entity] of Object.entries(graph.entities)) {
						output += `\n- ${name} (${entity.entityType})\n`;
						if (entity.observations.length > 0) {
							output += `  Observations:\n`;
							for (const obs of entity.observations) {
								output += `    • ${obs}\n`;
							}
						}
					}

					output += `\nRelations (${relationCount}):\n`;
					for (const relation of graph.relations) {
						output += `- ${relation.from} -> [${relation.relationType}] -> ${relation.to}\n`;
					}

					return {
						content: [{ type: "text", text: output }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to read graph"}`
						}],
					};
				}
			},
		);

		// Search nodes
		this.server.tool(
			"search_nodes",
			{
				query: z.string(),
			},
			async ({ query }) => {
				try {
					const graph = await this.loadGraph();
					const queryLower = query.toLowerCase();
					const matches: string[] = [];

					for (const [name, entity] of Object.entries(graph.entities)) {
						// Search in entity name
						if (name.toLowerCase().includes(queryLower)) {
							matches.push(`Entity: ${name} (${entity.entityType})`);
							continue;
						}

						// Search in entity type
						if (entity.entityType.toLowerCase().includes(queryLower)) {
							matches.push(`Entity: ${name} (${entity.entityType})`);
							continue;
						}

						// Search in observations
						for (const obs of entity.observations) {
							if (obs.toLowerCase().includes(queryLower)) {
								matches.push(`Entity: ${name} - Observation: "${obs}"`);
								break;
							}
						}
					}

					if (matches.length === 0) {
						return {
							content: [{
								type: "text",
								text: `No matches found for "${query}"`
							}],
						};
					}

					return {
						content: [{
							type: "text",
							text: `Found ${matches.length} match${matches.length === 1 ? "" : "es"}:\n\n${matches.join("\n")}`
						}],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to search nodes"}`
						}],
					};
				}
			},
		);

		// Open specific nodes
		this.server.tool(
			"open_nodes",
			{
				names: z.array(z.string()),
			},
			async ({ names }) => {
				try {
					const graph = await this.loadGraph();
					let output = "";

					for (const name of names) {
						const entity = graph.entities[name];
						if (!entity) {
							output += `Entity "${name}" not found\n\n`;
							continue;
						}

						output += `Entity: ${name}\n`;
						output += `Type: ${entity.entityType}\n`;
						output += `Observations:\n`;
						for (const obs of entity.observations) {
							output += `  • ${obs}\n`;
						}

						// Find relations
						const outgoing = graph.relations.filter(r => r.from === name);
						const incoming = graph.relations.filter(r => r.to === name);

						if (outgoing.length > 0) {
							output += `Outgoing Relations:\n`;
							for (const rel of outgoing) {
								output += `  → [${rel.relationType}] → ${rel.to}\n`;
							}
						}

						if (incoming.length > 0) {
							output += `Incoming Relations:\n`;
							for (const rel of incoming) {
								output += `  ← [${rel.relationType}] ← ${rel.from}\n`;
							}
						}

						output += "\n";
					}

					return {
						content: [{ type: "text", text: output.trim() }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to open nodes"}`
						}],
					};
				}
			},
		);

		// ============================================
		// ENCODING / DECODING TOOLS
		// ============================================

		// Base64 encode
		this.server.tool(
			"base64_encode",
			{
				text: z.string().describe("Text to encode to base64"),
			},
			async ({ text }) => {
				try {
					const encoded = btoa(text);
					return {
						content: [{ type: "text", text: encoded }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to encode"}`
						}],
					};
				}
			},
		);

		// Base64 decode
		this.server.tool(
			"base64_decode",
			{
				encoded: z.string().describe("Base64 encoded string to decode"),
			},
			async ({ encoded }) => {
				try {
					const decoded = atob(encoded);
					return {
						content: [{ type: "text", text: decoded }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to decode"}`
						}],
					};
				}
			},
		);

		// URL encode
		this.server.tool(
			"url_encode",
			{
				text: z.string().describe("Text to URL encode"),
			},
			async ({ text }) => {
				return {
					content: [{ type: "text", text: encodeURIComponent(text) }],
				};
			},
		);

		// URL decode
		this.server.tool(
			"url_decode",
			{
				encoded: z.string().describe("URL encoded string to decode"),
			},
			async ({ encoded }) => {
				try {
					return {
						content: [{ type: "text", text: decodeURIComponent(encoded) }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to decode"}`
						}],
					};
				}
			},
		);

		// HTML entity encode
		this.server.tool(
			"html_encode",
			{
				text: z.string().describe("Text to HTML entity encode"),
			},
			async ({ text }) => {
				const encoded = text
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#39;");
				return {
					content: [{ type: "text", text: encoded }],
				};
			},
		);

		// HTML entity decode
		this.server.tool(
			"html_decode",
			{
				encoded: z.string().describe("HTML entity encoded string to decode"),
			},
			async ({ encoded }) => {
				const decoded = encoded
					.replace(/&amp;/g, "&")
					.replace(/&lt;/g, "<")
					.replace(/&gt;/g, ">")
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'")
					.replace(/&nbsp;/g, " ");
				return {
					content: [{ type: "text", text: decoded }],
				};
			},
		);

		// Hex encode
		this.server.tool(
			"hex_encode",
			{
				text: z.string().describe("Text to hex encode"),
			},
			async ({ text }) => {
				const hex = Array.from(text)
					.map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
					.join("");
				return {
					content: [{ type: "text", text: hex }],
				};
			},
		);

		// Hex decode
		this.server.tool(
			"hex_decode",
			{
				hex: z.string().describe("Hex encoded string to decode"),
			},
			async ({ hex }) => {
				try {
					const text = hex.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join("") || "";
					return {
						content: [{ type: "text", text }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to decode"}`
						}],
					};
				}
			},
		);

		// ============================================
		// HASH GENERATION TOOLS
		// ============================================

		// Generate hash (SHA-256, SHA-1, SHA-512)
		this.server.tool(
			"generate_hash",
			{
				text: z.string().describe("Text to hash"),
				algorithm: z.enum(["SHA-1", "SHA-256", "SHA-512"]).describe("Hash algorithm"),
			},
			async ({ text, algorithm }) => {
				try {
					const encoder = new TextEncoder();
					const data = encoder.encode(text);
					const hashBuffer = await crypto.subtle.digest(algorithm, data);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
					return {
						content: [{ type: "text", text: hashHex }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Failed to generate hash"}`
						}],
					};
				}
			},
		);

		// ============================================
		// UUID GENERATOR
		// ============================================

		// Generate UUID v4
		this.server.tool(
			"generate_uuid",
			{},
			async () => {
				const uuid = crypto.randomUUID();
				return {
					content: [{ type: "text", text: uuid }],
				};
			},
		);

		// ============================================
		// TEXT MANIPULATION TOOLS
		// ============================================

		// Convert text case
		this.server.tool(
			"convert_case",
			{
				text: z.string().describe("Text to convert"),
				case_type: z.enum(["upper", "lower", "title", "camel", "snake", "kebab", "pascal"]).describe("Target case type"),
			},
			async ({ text, case_type }) => {
				let result = text;

				switch (case_type) {
					case "upper":
						result = text.toUpperCase();
						break;
					case "lower":
						result = text.toLowerCase();
						break;
					case "title":
						result = text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
						break;
					case "camel":
						result = text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
						break;
					case "snake":
						result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
						break;
					case "kebab":
						result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
						break;
					case "pascal":
						result = text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^(.)/, c => c.toUpperCase());
						break;
				}

				return {
					content: [{ type: "text", text: result }],
				};
			},
		);

		// Reverse text
		this.server.tool(
			"reverse_text",
			{
				text: z.string().describe("Text to reverse"),
			},
			async ({ text }) => {
				const reversed = text.split("").reverse().join("");
				return {
					content: [{ type: "text", text: reversed }],
				};
			},
		);

		// Count text statistics
		this.server.tool(
			"text_statistics",
			{
				text: z.string().describe("Text to analyze"),
			},
			async ({ text }) => {
				const chars = text.length;
				const charsNoSpaces = text.replace(/\s/g, "").length;
				const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
				const lines = text.split("\n").length;
				const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

				const stats = `Characters: ${chars}
Characters (no spaces): ${charsNoSpaces}
Words: ${words}
Lines: ${lines}
Sentences: ${sentences}`;

				return {
					content: [{ type: "text", text: stats }],
				};
			},
		);

		// Repeat text
		this.server.tool(
			"repeat_text",
			{
				text: z.string().describe("Text to repeat"),
				count: z.number().int().min(1).max(1000).describe("Number of times to repeat (1-1000)"),
				separator: z.string().optional().describe("Separator between repetitions (default: empty)"),
			},
			async ({ text, count, separator = "" }) => {
				const repeated = Array(count).fill(text).join(separator);
				return {
					content: [{ type: "text", text: repeated }],
				};
			},
		);

		// Trim and clean text
		this.server.tool(
			"clean_text",
			{
				text: z.string().describe("Text to clean"),
				options: z.object({
					trim: z.boolean().optional().describe("Remove leading/trailing whitespace"),
					remove_extra_spaces: z.boolean().optional().describe("Replace multiple spaces with single space"),
					remove_empty_lines: z.boolean().optional().describe("Remove empty lines"),
				}).optional(),
			},
			async ({ text, options = {} }) => {
				let result = text;

				if (options.trim !== false) {
					result = result.trim();
				}

				if (options.remove_extra_spaces) {
					result = result.replace(/  +/g, " ");
				}

				if (options.remove_empty_lines) {
					result = result.split("\n").filter(line => line.trim().length > 0).join("\n");
				}

				return {
					content: [{ type: "text", text: result }],
				};
			},
		);

		// ============================================
		// JSON UTILITIES
		// ============================================

		// Format JSON
		this.server.tool(
			"format_json",
			{
				json: z.string().describe("JSON string to format"),
				indent: z.number().int().min(0).max(8).optional().describe("Number of spaces for indentation (default: 2)"),
			},
			async ({ json, indent = 2 }) => {
				try {
					const parsed = JSON.parse(json);
					const formatted = JSON.stringify(parsed, null, indent);
					return {
						content: [{ type: "text", text: formatted }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: Invalid JSON - ${error instanceof Error ? error.message : "Parse failed"}`
						}],
					};
				}
			},
		);

		// Minify JSON
		this.server.tool(
			"minify_json",
			{
				json: z.string().describe("JSON string to minify"),
			},
			async ({ json }) => {
				try {
					const parsed = JSON.parse(json);
					const minified = JSON.stringify(parsed);
					return {
						content: [{ type: "text", text: minified }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: Invalid JSON - ${error instanceof Error ? error.message : "Parse failed"}`
						}],
					};
				}
			},
		);

		// Validate JSON
		this.server.tool(
			"validate_json",
			{
				json: z.string().describe("JSON string to validate"),
			},
			async ({ json }) => {
				try {
					JSON.parse(json);
					return {
						content: [{ type: "text", text: "Valid JSON" }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Invalid JSON: ${error instanceof Error ? error.message : "Parse failed"}`
						}],
					};
				}
			},
		);

		// ============================================
		// MATH UTILITIES
		// ============================================

		// Advanced math operations
		this.server.tool(
			"math_operation",
			{
				operation: z.enum(["power", "sqrt", "log", "log10", "abs", "ceil", "floor", "round", "sin", "cos", "tan", "min", "max"]).describe("Math operation"),
				values: z.array(z.number()).describe("Input values (1 or 2 numbers depending on operation)"),
			},
			async ({ operation, values }) => {
				try {
					let result: number;

					switch (operation) {
						case "power":
							if (values.length !== 2) throw new Error("Power requires exactly 2 values");
							result = Math.pow(values[0], values[1]);
							break;
						case "sqrt":
							if (values.length !== 1) throw new Error("Square root requires exactly 1 value");
							result = Math.sqrt(values[0]);
							break;
						case "log":
							if (values.length !== 1) throw new Error("Natural log requires exactly 1 value");
							result = Math.log(values[0]);
							break;
						case "log10":
							if (values.length !== 1) throw new Error("Log10 requires exactly 1 value");
							result = Math.log10(values[0]);
							break;
						case "abs":
							if (values.length !== 1) throw new Error("Absolute value requires exactly 1 value");
							result = Math.abs(values[0]);
							break;
						case "ceil":
							if (values.length !== 1) throw new Error("Ceil requires exactly 1 value");
							result = Math.ceil(values[0]);
							break;
						case "floor":
							if (values.length !== 1) throw new Error("Floor requires exactly 1 value");
							result = Math.floor(values[0]);
							break;
						case "round":
							if (values.length !== 1) throw new Error("Round requires exactly 1 value");
							result = Math.round(values[0]);
							break;
						case "sin":
							if (values.length !== 1) throw new Error("Sin requires exactly 1 value");
							result = Math.sin(values[0]);
							break;
						case "cos":
							if (values.length !== 1) throw new Error("Cos requires exactly 1 value");
							result = Math.cos(values[0]);
							break;
						case "tan":
							if (values.length !== 1) throw new Error("Tan requires exactly 1 value");
							result = Math.tan(values[0]);
							break;
						case "min":
							result = Math.min(...values);
							break;
						case "max":
							result = Math.max(...values);
							break;
						default:
							throw new Error(`Unknown operation: ${operation}`);
					}

					return {
						content: [{ type: "text", text: String(result) }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Math operation failed"}`
						}],
					};
				}
			},
		);

		// Random number generator
		this.server.tool(
			"random_number",
			{
				min: z.number().describe("Minimum value (inclusive)"),
				max: z.number().describe("Maximum value (inclusive)"),
				decimals: z.number().int().min(0).max(10).optional().describe("Number of decimal places (default: 0 for integers)"),
			},
			async ({ min, max, decimals = 0 }) => {
				const random = Math.random() * (max - min) + min;
				const result = decimals > 0 ? random.toFixed(decimals) : Math.floor(random).toString();
				return {
					content: [{ type: "text", text: result }],
				};
			},
		);

		// Number formatting
		this.server.tool(
			"format_number",
			{
				number: z.number().describe("Number to format"),
				format: z.enum(["thousands", "currency", "percentage", "binary", "octal", "hex"]).describe("Format type"),
				currency_symbol: z.string().optional().describe("Currency symbol (default: $)"),
			},
			async ({ number, format, currency_symbol = "$" }) => {
				let result: string;

				switch (format) {
					case "thousands":
						result = number.toLocaleString("en-US");
						break;
					case "currency":
						result = `${currency_symbol}${number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
						break;
					case "percentage":
						result = `${(number * 100).toFixed(2)}%`;
						break;
					case "binary":
						result = Math.floor(number).toString(2);
						break;
					case "octal":
						result = Math.floor(number).toString(8);
						break;
					case "hex":
						result = Math.floor(number).toString(16).toUpperCase();
						break;
					default:
						result = String(number);
				}

				return {
					content: [{ type: "text", text: result }],
				};
			},
		);

		// ============================================
		// REGEX TOOLS
		// ============================================

		// Test regex
		this.server.tool(
			"regex_test",
			{
				pattern: z.string().describe("Regex pattern (without delimiters)"),
				text: z.string().describe("Text to test against"),
				flags: z.string().optional().describe("Regex flags (e.g., 'gi' for global, case-insensitive)"),
			},
			async ({ pattern, text, flags = "" }) => {
				try {
					const regex = new RegExp(pattern, flags);
					const matches = text.match(regex);

					if (!matches || matches.length === 0) {
						return {
							content: [{ type: "text", text: "No matches found" }],
						};
					}

					const result = `Found ${matches.length} match${matches.length === 1 ? "" : "es"}:\n\n${matches.map((m, i) => `${i + 1}. "${m}"`).join("\n")}`;

					return {
						content: [{ type: "text", text: result }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: Invalid regex - ${error instanceof Error ? error.message : "Pattern failed"}`
						}],
					};
				}
			},
		);

		// Regex replace
		this.server.tool(
			"regex_replace",
			{
				pattern: z.string().describe("Regex pattern (without delimiters)"),
				text: z.string().describe("Text to perform replacement on"),
				replacement: z.string().describe("Replacement string"),
				flags: z.string().optional().describe("Regex flags (e.g., 'g' for global)"),
			},
			async ({ pattern, text, replacement, flags = "" }) => {
				try {
					const regex = new RegExp(pattern, flags);
					const result = text.replace(regex, replacement);

					return {
						content: [{ type: "text", text: result }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: Invalid regex - ${error instanceof Error ? error.message : "Pattern failed"}`
						}],
					};
				}
			},
		);

		// Extract with regex
		this.server.tool(
			"regex_extract",
			{
				pattern: z.string().describe("Regex pattern with capture groups"),
				text: z.string().describe("Text to extract from"),
				flags: z.string().optional().describe("Regex flags"),
			},
			async ({ pattern, text, flags = "" }) => {
				try {
					const regex = new RegExp(pattern, flags);
					const matches = [...text.matchAll(new RegExp(pattern, flags.includes("g") ? flags : flags + "g"))];

					if (matches.length === 0) {
						return {
							content: [{ type: "text", text: "No matches found" }],
						};
					}

					let result = `Found ${matches.length} match${matches.length === 1 ? "" : "es"}:\n\n`;

					for (let i = 0; i < matches.length; i++) {
						const match = matches[i];
						result += `Match ${i + 1}:\n`;
						result += `  Full: "${match[0]}"\n`;

						if (match.length > 1) {
							for (let j = 1; j < match.length; j++) {
								result += `  Group ${j}: "${match[j]}"\n`;
							}
						}

						result += "\n";
					}

					return {
						content: [{ type: "text", text: result.trim() }],
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error: Invalid regex - ${error instanceof Error ? error.message : "Pattern failed"}`
						}],
					};
				}
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Store env for memory tools
		MyMCP.currentEnv = env;

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
