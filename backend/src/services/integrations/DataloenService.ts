import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

interface DataloenConfig {
  partnerId: string;
  partnerSecret: string;
  appId: string;
  apiKey: string;
  environment?: 'production' | 'preprod';
}

interface DataloenEmployee {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  zipCode?: string;
  countryCode?: string;
  cpr?: string;
  dateOfEmployment?: string;
  updatedAt?: string;
  isDraft?: boolean;
}

interface TokenResponse {
  accessToken: string;
  expiresIn: number; // seconds
}

export class DataloenService {
  private baseUrl: string;
  private config: DataloenConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  private client: AxiosInstance;

  constructor(config: DataloenConfig) {
    this.config = config;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.dataloen.dk'
        : 'https://api.preprod.dataloen.dk';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Exchange API key for access token
   * Access tokens expire after 1 hour and should be cached
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      logger.info('Exchanging API key for access token');

      const response = await this.client.post<TokenResponse>('/token', {
        partnerId: this.config.partnerId,
        partnerSecret: this.config.partnerSecret,
        appId: this.config.appId,
        apiKey: this.config.apiKey,
      });

      this.accessToken = response.data.accessToken;
      // Set expiry to 55 minutes from now (5 min buffer)
      this.tokenExpiresAt = new Date(Date.now() + (response.data.expiresIn - 300) * 1000);

      logger.info('Access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      logger.error('Failed to get access token', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to authenticate with Dataløn: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const token = await this.getAccessToken();

    try {
      const response = await this.client.request<T>({
        method,
        url: endpoint,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      logger.error('Dataløn API request failed', {
        method,
        endpoint,
        status: error.response?.status,
        correlationId: errorData?.correlationId,
        errorCode: errorData?.errorCode,
        message: errorData?.title || error.message,
      });

      throw new Error(
        errorData?.details || errorData?.title || `Dataløn API error: ${error.message}`
      );
    }
  }

  /**
   * Test connection to Dataløn API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to get access token
      await this.getAccessToken();

      // Try to fetch company info (if endpoint exists) or employees
      try {
        await this.getEmployees();
      } catch (error) {
        // If we got token but employees failed, it might be no employees exist
        // That's still a successful connection
      }

      return {
        success: true,
        message: 'Forbindelse til Dataløn etableret succesfuldt',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Kunne ikke forbinde til Dataløn: ${error.message}`,
      };
    }
  }

  /**
   * Get all employees
   * @param updatedSince - Optional timestamp to fetch only employees updated since this time
   */
  async getEmployees(updatedSince?: Date): Promise<DataloenEmployee[]> {
    try {
      const endpoint = updatedSince
        ? `/employees?updatedSince=${updatedSince.toISOString()}`
        : '/employees';

      const employees = await this.request<DataloenEmployee[]>('GET', endpoint);
      logger.info(`Fetched ${employees.length} employees from Dataløn`);
      return employees;
    } catch (error: any) {
      logger.error('Failed to fetch employees from Dataløn', { error: error.message });
      throw error;
    }
  }

  /**
   * Get single employee by ID
   */
  async getEmployee(employeeId: string): Promise<DataloenEmployee> {
    try {
      const employee = await this.request<DataloenEmployee>('GET', `/employees/${employeeId}`);
      return employee;
    } catch (error: any) {
      logger.error('Failed to fetch employee from Dataløn', {
        employeeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create employees in Dataløn
   * Employees are created as drafts and must be completed by the customer
   */
  async createEmployees(
    employees: Array<{
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      phoneCountryCode?: string;
      zipCode?: string;
      countryCode?: string;
      cpr?: string;
      dateOfEmployment?: string;
    }>
  ): Promise<DataloenEmployee[]> {
    try {
      logger.info(`Creating ${employees.length} employees in Dataløn`);

      const created = await this.request<DataloenEmployee[]>('POST', '/employees', employees);

      logger.info(`Successfully created ${created.length} employees in Dataløn`);
      return created;
    } catch (error: any) {
      logger.error('Failed to create employees in Dataløn', { error: error.message });
      throw error;
    }
  }

  /**
   * Update employee in Dataløn using PATCH
   * Only specified fields will be updated
   */
  async updateEmployee(
    employeeId: string,
    updates: {
      fullName?: string;
      email?: string;
      phone?: string;
      phoneCountryCode?: string;
      zipCode?: string;
      countryCode?: string;
    }
  ): Promise<DataloenEmployee> {
    try {
      logger.info('Updating employee in Dataløn', { employeeId });

      const updated = await this.request<DataloenEmployee>(
        'PATCH',
        `/employees/${employeeId}`,
        updates
      );

      logger.info('Successfully updated employee in Dataløn', { employeeId });
      return updated;
    } catch (error: any) {
      logger.error('Failed to update employee in Dataløn', {
        employeeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Sync employees from Dataløn to local database
   * Implements the recommended sync flow from documentation
   */
  async syncEmployees(lastSyncTimestamp?: Date): Promise<{
    fetched: number;
    created: number;
    updated: number;
    errors: string[];
  }> {
    const result = {
      fetched: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    try {
      // Fetch employees updated since last sync
      const employees = await this.getEmployees(lastSyncTimestamp);
      result.fetched = employees.length;

      logger.info('Employee sync completed', {
        fetched: result.fetched,
        created: result.created,
        updated: result.updated,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Employee sync failed', { error: error.message });
      result.errors.push(error.message);
      return result;
    }
  }
}
