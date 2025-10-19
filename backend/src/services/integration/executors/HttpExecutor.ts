import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { StepExecutor, SourceConfig, AuthConfig, ExecutionContext, ExecutionError } from '../types';
import { logger } from '../../../config/logger';

export class HttpExecutor implements StepExecutor {
  async execute(config: SourceConfig, input: any, context: ExecutionContext): Promise<any> {
    try {
      const requestConfig = this.buildRequestConfig(config, context);

      logger.info('Executing HTTP request', {
        method: requestConfig.method,
        url: requestConfig.url,
      });

      const response: AxiosResponse = await axios(requestConfig);

      // Extract data from response if dataPath is specified
      if (config.dataPath) {
        return this.extractData(response.data, config.dataPath);
      }

      return response.data;
    } catch (error: any) {
      logger.error('HTTP request failed', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      throw new Error(
        `HTTP request failed: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private buildRequestConfig(config: SourceConfig, context: ExecutionContext): AxiosRequestConfig {
    const { baseUrl, endpoint, auth } = config;

    // Build full URL
    const url = baseUrl + this.replaceVariables(endpoint.path, context);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Lonberegning-Integration/1.0',
      ...(endpoint.headers || {}),
    };

    // Add authentication
    this.addAuth(headers, auth, context);

    // Build query params
    const params = this.replaceVariables(endpoint.queryParams || {}, context);

    // Build request body
    const data = endpoint.body ? this.replaceVariables(endpoint.body, context) : undefined;

    return {
      method: endpoint.method,
      url,
      headers,
      params,
      data,
      timeout: 30000, // 30 seconds
      validateStatus: (status) => status >= 200 && status < 300,
    };
  }

  private addAuth(headers: Record<string, string>, auth: AuthConfig, context: ExecutionContext): void {
    switch (auth.type) {
      case 'API_KEY':
        if (auth.header) {
          headers[auth.header] = context.apiKey || '';
        } else if (auth.queryParam) {
          // Query param auth is handled in params, not headers
        }
        break;

      case 'BEARER_TOKEN':
        headers['Authorization'] = `Bearer ${context.apiKey || ''}`;
        break;

      case 'BASIC_AUTH':
        if (auth.username && context.password) {
          const encoded = Buffer.from(`${auth.username}:${context.password}`).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;

      case 'CUSTOM':
        // Custom auth handled by user-specified headers
        break;

      default:
        break;
    }
  }

  private replaceVariables(obj: any, context: ExecutionContext): any {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '');
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceVariables(item, context));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariables(value, context);
      }
      return result;
    }

    return obj;
  }

  private extractData(data: any, path: string): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new Error(`Cannot extract data: path '${path}' not found`);
      }
      current = current[part];
    }

    return current;
  }
}
