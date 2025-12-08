import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with AI-powered code assistance tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "AI Code Assistant",
		version: "1.0.0",
	});

	async init() {
		// Code Analysis Tool - Analyzes code quality and identifies issues
		this.server.tool(
			"analyze_code",
			{
				code: z.string().describe("The code snippet to analyze"),
				language: z.string().optional().describe("Programming language (auto-detected if not provided)"),
			},
			async ({ code, language }) => {
				try {
					const ai = (this.env as any).AI;
					if (!ai) {
						return {
							content: [{
								type: "text",
								text: "AI binding not available. Please configure Workers AI in wrangler.jsonc"
							}]
						};
					}

					const prompt = `Analyze this ${language || 'code'} snippet and identify:
1. Potential bugs or errors
2. Security vulnerabilities
3. Performance issues
4. Code smell and anti-patterns
5. Best practice violations

Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide a detailed analysis with specific line references where applicable.`;

					const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
						messages: [{ role: "user", content: prompt }],
					});

					return {
						content: [{
							type: "text",
							text: response.response || "Analysis completed but no response generated."
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error analyzing code: ${error instanceof Error ? error.message : String(error)}`
						}]
					};
				}
			}
		);

		// Code Improvement Tool - Suggests improvements for code
		this.server.tool(
			"improve_code",
			{
				code: z.string().describe("The code snippet to improve"),
				language: z.string().optional().describe("Programming language"),
				focus: z.enum(["performance", "readability", "maintainability", "all"]).optional().describe("Area to focus on"),
			},
			async ({ code, language, focus = "all" }) => {
				try {
					const ai = (this.env as any).AI;
					if (!ai) {
						return {
							content: [{
								type: "text",
								text: "AI binding not available. Please configure Workers AI in wrangler.jsonc"
							}]
						};
					}

					const focusText = focus === "all" ? "overall code quality" : focus;
					const prompt = `Improve this ${language || 'code'} snippet focusing on ${focusText}.

Original Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. Improved version of the code
2. Explanation of changes made
3. Why these changes make the code better`;

					const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
						messages: [{ role: "user", content: prompt }],
					});

					return {
						content: [{
							type: "text",
							text: response.response || "Improvement suggestions generated."
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error improving code: ${error instanceof Error ? error.message : String(error)}`
						}]
					};
				}
			}
		);

		// Fix Code Issues Tool - Automatically fixes common code problems
		this.server.tool(
			"fix_code_issues",
			{
				code: z.string().describe("The code with issues to fix"),
				issues: z.string().describe("Description of the issues to fix"),
				language: z.string().optional().describe("Programming language"),
			},
			async ({ code, issues, language }) => {
				try {
					const ai = (this.env as any).AI;
					if (!ai) {
						return {
							content: [{
								type: "text",
								text: "AI binding not available. Please configure Workers AI in wrangler.jsonc"
							}]
						};
					}

					const prompt = `Fix the following issues in this ${language || 'code'} snippet:

Issues to fix: ${issues}

Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. The fixed code
2. Explanation of each fix applied`;

					const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
						messages: [{ role: "user", content: prompt }],
					});

					return {
						content: [{
							type: "text",
							text: response.response || "Code fixes applied."
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error fixing code: ${error instanceof Error ? error.message : String(error)}`
						}]
					};
				}
			}
		);

		// Code Review Tool - Comprehensive code review
		this.server.tool(
			"code_review",
			{
				code: z.string().describe("The code to review"),
				language: z.string().optional().describe("Programming language"),
				context: z.string().optional().describe("Additional context about the code"),
			},
			async ({ code, language, context }) => {
				try {
					const ai = (this.env as any).AI;
					if (!ai) {
						return {
							content: [{
								type: "text",
								text: "AI binding not available. Please configure Workers AI in wrangler.jsonc"
							}]
						};
					}

					const contextText = context ? `\n\nContext: ${context}` : '';
					const prompt = `Perform a comprehensive code review of this ${language || 'code'} snippet:${contextText}

Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. Overall assessment (Good/Needs Improvement/Poor)
2. Strengths of the code
3. Weaknesses and issues
4. Specific recommendations for improvement
5. Security considerations
6. Rating: X/10 with justification`;

					const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
						messages: [{ role: "user", content: prompt }],
					});

					return {
						content: [{
							type: "text",
							text: response.response || "Code review completed."
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error reviewing code: ${error instanceof Error ? error.message : String(error)}`
						}]
					};
				}
			}
		);

		// Code Explanation Tool - Explains what code does
		this.server.tool(
			"explain_code",
			{
				code: z.string().describe("The code to explain"),
				language: z.string().optional().describe("Programming language"),
				detail_level: z.enum(["brief", "detailed", "expert"]).optional().describe("Level of detail"),
			},
			async ({ code, language, detail_level = "detailed" }) => {
				try {
					const ai = (this.env as any).AI;
					if (!ai) {
						return {
							content: [{
								type: "text",
								text: "AI binding not available. Please configure Workers AI in wrangler.jsonc"
							}]
						};
					}

					const detailMap = {
						brief: "in a concise summary",
						detailed: "with detailed explanations",
						expert: "with expert-level technical depth",
					};

					const prompt = `Explain this ${language || 'code'} snippet ${detailMap[detail_level]}:

Code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. What the code does
2. How it works (step by step for ${detail_level} level)
3. Key concepts used
4. Potential use cases`;

					const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
						messages: [{ role: "user", content: prompt }],
					});

					return {
						content: [{
							type: "text",
							text: response.response || "Code explanation generated."
						}]
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error explaining code: ${error instanceof Error ? error.message : String(error)}`
						}]
					};
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
