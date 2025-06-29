/**
 * Model Context Protocol (MCP) Types
 *
 * TypeScript definitions for MCP tools, requests, and responses
 */

import type {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// MCP Tool Schema Types
export interface MCPToolSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
}

// MCP Tool Definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolSchema;
}

// MCP Content Types
export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface MCPResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
}

export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

// MCP Response Types
export interface MCPToolResponse {
  content: MCPContent[];
  isError?: boolean;
}

export interface MCPSuccessResponse extends MCPToolResponse {
  isError?: false;
}

export interface MCPErrorResponse extends MCPToolResponse {
  isError: true;
}

// MCP Tool Handler Type
export type MCPToolHandler<TArgs = any, TResponse = MCPToolResponse> = (
  args: TArgs,
) => Promise<TResponse>;

// Generic MCP Tool Handler with Client
export type MCPToolHandlerWithClient<
  TClient,
  TArgs = any,
  TResponse = MCPToolResponse,
> = (client: TClient, args: TArgs) => Promise<TResponse>;

// MCP Request Types (based on SDK)
export type MCPListToolsRequest = typeof ListToolsRequestSchema;
export type MCPCallToolRequest = typeof CallToolRequestSchema;

// Tool Categories for Organization
export type MCPToolCategory =
  | 'authentication'
  | 'posts'
  | 'pages'
  | 'media'
  | 'users'
  | 'comments'
  | 'taxonomies'
  | 'site';

// Enhanced Tool Definition with Category
export interface CategorizedMCPTool extends MCPTool {
  category: MCPToolCategory;
}

// Tool Registry Type
export type MCPToolRegistry = Record<string, CategorizedMCPTool>;

// Handler Registry Type
export type MCPHandlerRegistry<TClient> = Record<
  string,
  MCPToolHandlerWithClient<TClient>
>;

// Tool Validation Result
export interface ToolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Common Response Helpers
export type CreateSuccessResponse = (
  text: string,
  additionalContent?: MCPContent[],
) => MCPSuccessResponse;
export type CreateErrorResponse = (
  error: string | Error,
  additionalContent?: MCPContent[],
) => MCPErrorResponse;

// Authentication Response Types
export interface AuthenticationResult {
  success: boolean;
  method: string;
  message: string;
  details?: Record<string, any>;
}

// Tool Execution Context
export interface MCPToolContext {
  toolName: string;
  category: MCPToolCategory;
  startTime: number;
  userId?: string;
  sessionId?: string;
}

// Tool Metrics
export interface MCPToolMetrics {
  executionTime: number;
  success: boolean;
  errorType?: string;
  inputSize?: number;
  outputSize?: number;
}

// Enhanced Error Types
export interface MCPToolError extends Error {
  toolName: string;
  category: MCPToolCategory;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

// Tool Configuration
export interface MCPToolConfig {
  timeout?: number;
  retries?: number;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  validation?: {
    strict: boolean;
    allowAdditionalProperties: boolean;
  };
}

// Server Configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPToolRegistry;
  handlers: MCPHandlerRegistry<any>;
  middleware?: MCPMiddleware[];
  config?: MCPToolConfig;
}

// Middleware Type
export type MCPMiddleware<_TClient = any> = (
  context: MCPToolContext,
  next: () => Promise<MCPToolResponse>,
) => Promise<MCPToolResponse>;

// Tool Execution Pipeline
export interface MCPExecutionPipeline<TClient> {
  validate: (toolName: string, args: any) => Promise<ToolValidationResult>;
  authenticate: (client: TClient) => Promise<boolean>;
  execute: (
    toolName: string,
    client: TClient,
    args: any,
  ) => Promise<MCPToolResponse>;
  postProcess: (
    response: MCPToolResponse,
    context: MCPToolContext,
  ) => Promise<MCPToolResponse>;
}

// Tool Documentation
export interface MCPToolDocumentation {
  name: string;
  category: MCPToolCategory;
  description: string;
  usage: string;
  examples: Array<{
    title: string;
    description: string;
    input: Record<string, any>;
    output: string;
  }>;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }>;
  errors: Array<{
    code: string;
    description: string;
    resolution: string;
  }>;
}

// Batch Operation Types
export interface MCPBatchRequest {
  operations: Array<{
    toolName: string;
    args: Record<string, any>;
    id?: string;
  }>;
  parallel?: boolean;
  stopOnError?: boolean;
}

export interface MCPBatchResponse {
  results: Array<{
    id?: string;
    success: boolean;
    response?: MCPToolResponse;
    error?: MCPToolError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    executionTime: number;
  };
}
