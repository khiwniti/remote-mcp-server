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
