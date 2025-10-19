// Integration configuration types

export interface IntegrationConfig {
  name: string;
  type: 'DATA_IMPORT' | 'DATA_EXPORT' | 'WEBHOOK' | 'SCHEDULED_SYNC' | 'REAL_TIME';
  targetEntity?: string;
  source?: SourceConfig;
  destination?: DestinationConfig;
  fieldMapping: FieldMapping;
  transformation?: TransformationConfig;
  validation?: ValidationConfig;
}

export interface SourceConfig {
  baseUrl: string;
  auth: AuthConfig;
  endpoint: EndpointConfig;
  responseType: 'json' | 'xml' | 'csv';
  dataPath?: string; // JSON path to extract data (e.g., "data.timesheets")
}

export interface DestinationConfig {
  baseUrl: string;
  auth: AuthConfig;
  endpoint: EndpointConfig;
  requestType: 'json' | 'xml' | 'csv';
}

export interface AuthConfig {
  type: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  header?: string; // e.g., "X-API-Key"
  queryParam?: string; // e.g., "api_key"
  username?: string;
  password?: string;
}

export interface EndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  body?: any;
}

export interface FieldMapping {
  [targetField: string]: string | FieldMappingConfig;
}

export interface FieldMappingConfig {
  source?: string; // Source field path
  type?: 'constant' | 'function' | 'lookup';
  value?: any; // For constant type
  function?: string; // For function type
  lookupTable?: Record<string, any>; // For lookup type
}

export interface TransformationConfig {
  [field: string]: TransformationType;
}

export type TransformationType =
  | 'parseISO8601'
  | 'parseDate'
  | 'parseInt'
  | 'parseFloat'
  | 'toString'
  | 'toUpperCase'
  | 'toLowerCase'
  | 'trim'
  | 'default'
  | { type: string; args?: any[] };

export interface ValidationConfig {
  required?: string[];
  unique?: string[];
  rules?: Record<string, ValidationRule>;
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email';
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: any) => boolean | string;
}

export interface ExecutionContext {
  [key: string]: any;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  errors?: ExecutionError[];
  metadata?: {
    rowsProcessed?: number;
    rowsSucceeded?: number;
    rowsFailed?: number;
    duration?: number;
  };
}

export interface ExecutionError {
  row?: number;
  field?: string;
  message: string;
  code?: string;
}

export interface StepExecutor {
  execute(config: any, input: any, context: ExecutionContext): Promise<any>;
}
