import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

interface DanlonConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  environment?: 'production' | 'demo';
}

interface DanlonCompany {
  id: string;
  name: string;
}

interface DanlonEmployee {
  id: string;
  name: string;
  employeeNumber?: string;
}

interface DanlonPayPart {
  id?: string;
  code: string;
  units?: number;
  rate?: number;
  amount?: number;
  employee?: {
    id: string;
    name?: string;
  };
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export class DanlonService {
  private authBaseUrl: string;
  private apiBaseUrl: string;
  private config: DanlonConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  private client: AxiosInstance;

  constructor(config: DanlonConfig) {
    this.config = config;

    // Different URLs for demo vs production
    if (config.environment === 'demo') {
      this.authBaseUrl = 'https://auth.lessor.dk/auth/realms/danlon-integration-demo';
      this.apiBaseUrl = 'https://api-demo.danlon.dk/graphql';
    } else {
      this.authBaseUrl = 'https://auth.lessor.dk/auth/realms/danlon-integration';
      this.apiBaseUrl = 'https://api.danlon.dk/graphql';
    }

    this.client = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Exchange refresh token for access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      logger.info('Exchanging refresh token for access token');

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('refresh_token', this.config.refreshToken);

      const response = await this.client.post<TokenResponse>(
        `${this.authBaseUrl}/protocol/openid-connect/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;

      // Set expiry to 5 minutes before actual expiry as buffer
      const expiresIn = response.data.expires_in || 300;
      this.tokenExpiresAt = new Date(Date.now() + (expiresIn - 300) * 1000);

      // Update refresh token if a new one was provided
      if (response.data.refresh_token) {
        this.config.refreshToken = response.data.refresh_token;
      }

      logger.info('Access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      logger.error('Failed to get access token', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to authenticate with Danløn: ${error.message}`);
    }
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T>(query: string, variables?: any): Promise<T> {
    const token = await this.getAccessToken();

    try {
      const response = await this.client.post(
        this.apiBaseUrl,
        {
          query,
          variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.errors) {
        throw new Error(
          `GraphQL errors: ${response.data.errors.map((e: any) => e.message).join(', ')}`
        );
      }

      return response.data.data;
    } catch (error: any) {
      logger.error('Danløn GraphQL query failed', {
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * Test connection to Danløn API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to get access token and fetch current company
      const query = `
        {
          current_company {
            id
          }
        }
      `;

      await this.query(query);

      return {
        success: true,
        message: 'Forbindelse til Danløn etableret succesfuldt',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Kunne ikke forbinde til Danløn: ${error.message}`,
      };
    }
  }

  /**
   * Get current company
   */
  async getCurrentCompany(): Promise<DanlonCompany> {
    const query = `
      {
        current_company {
          id
        }
      }
    `;

    const result = await this.query<{ current_company: DanlonCompany }>(query);
    return result.current_company;
  }

  /**
   * Get all companies for the authenticated user
   */
  async getCompanies(companyIds?: string[]): Promise<DanlonCompany[]> {
    const query = `
      query($company_ids: [ID!]) {
        companies(company_ids: $company_ids) {
          id
          name
        }
      }
    `;

    const variables = companyIds ? { company_ids: companyIds } : undefined;
    const result = await this.query<{ companies: DanlonCompany[] }>(query, variables);
    return result.companies;
  }

  /**
   * Get employees for a company
   */
  async getEmployees(companyId: string, employeeIds?: string[]): Promise<DanlonEmployee[]> {
    const query = `
      query($company_id: ID!, $employee_ids: [ID!]) {
        companies(company_ids: [$company_id]) {
          id
          name
          employees(employee_ids: $employee_ids) {
            id
            name
          }
        }
      }
    `;

    const variables: any = { company_id: companyId };
    if (employeeIds) {
      variables.employee_ids = employeeIds;
    }

    const result = await this.query<{ companies: Array<{ employees: DanlonEmployee[] }> }>(
      query,
      variables
    );

    return result.companies[0]?.employees || [];
  }

  /**
   * Get pay parts for a company
   */
  async getPayParts(companyId: string): Promise<DanlonPayPart[]> {
    const query = `
      query($company_id: ID!) {
        pay_parts(company_id: $company_id) {
          id
          code
          units
          rate
          amount
          employee {
            id
            name
          }
        }
      }
    `;

    const result = await this.query<{ pay_parts: DanlonPayPart[] }>(query, {
      company_id: companyId,
    });

    return result.pay_parts;
  }

  /**
   * Get pay parts for a specific employee
   */
  async getEmployeePayParts(
    companyId: string,
    employeeId: string
  ): Promise<DanlonPayPart[]> {
    const query = `
      query($company_id: ID!, $employee_id: ID!) {
        companies(company_ids: [$company_id]) {
          id
          name
          employees(employee_ids: [$employee_id]) {
            pay_parts {
              id
              code
              units
              rate
              amount
            }
          }
        }
      }
    `;

    const result = await this.query<{
      companies: Array<{ employees: Array<{ pay_parts: DanlonPayPart[] }> }>;
    }>(query, {
      company_id: companyId,
      employee_id: employeeId,
    });

    return result.companies[0]?.employees[0]?.pay_parts || [];
  }

  /**
   * Create pay parts (lønarter)
   */
  async createPayParts(
    companyId: string,
    payParts: Array<{
      employeeId: string;
      code: string;
      units?: number;
      rate?: number;
      amount?: number;
    }>
  ): Promise<{ id: string }[]> {
    const mutation = `
      mutation($company_id: ID!, $pay_parts: [PayPartInput!]!) {
        create_pay_parts(
          company_id: $company_id
          pay_parts: $pay_parts
        ) {
          id
        }
      }
    `;

    const variables = {
      company_id: companyId,
      pay_parts: payParts.map((pp) => ({
        employee_id: pp.employeeId,
        code: pp.code,
        units: pp.units,
        rate: pp.rate,
        amount: pp.amount,
      })),
    };

    const result = await this.query<{ create_pay_parts: { id: string }[] }>(
      mutation,
      variables
    );

    logger.info(`Created ${result.create_pay_parts.length} pay parts in Danløn`);
    return result.create_pay_parts;
  }

  /**
   * Delete pay parts
   */
  async deletePayParts(companyId: string, payPartIds: string[]): Promise<boolean> {
    const mutation = `
      mutation($company_id: ID!, $pay_part_ids: [ID!]!) {
        delete_pay_parts(
          company_id: $company_id
          pay_part_ids: $pay_part_ids
        )
      }
    `;

    await this.query(mutation, {
      company_id: companyId,
      pay_part_ids: payPartIds,
    });

    logger.info(`Deleted ${payPartIds.length} pay parts from Danløn`);
    return true;
  }

  /**
   * Get pay parts metadata (valid codes, descriptions, allowed fields)
   */
  async getPayPartsMetadata(): Promise<
    Array<{
      code: string;
      description: string;
      units_allowed: boolean;
      rate_allowed: boolean;
      amount_allowed: boolean;
    }>
  > {
    const query = `
      {
        pay_parts_meta {
          code
          description
          units_allowed
          rate_allowed
          amount_allowed
        }
      }
    `;

    const result = await this.query<{
      pay_parts_meta: Array<{
        code: string;
        description: string;
        units_allowed: boolean;
        rate_allowed: boolean;
        amount_allowed: boolean;
      }>;
    }>(query);

    return result.pay_parts_meta;
  }

  /**
   * Sync employees from Danløn
   */
  async syncEmployees(companyId?: string): Promise<{
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
      // If no company ID provided, get current company
      if (!companyId) {
        const currentCompany = await this.getCurrentCompany();
        companyId = currentCompany.id;
      }

      // Fetch all employees for the company
      const employees = await this.getEmployees(companyId);
      result.fetched = employees.length;

      logger.info('Employee sync from Danløn completed', {
        fetched: result.fetched,
        companyId,
      });

      return result;
    } catch (error: any) {
      logger.error('Employee sync from Danløn failed', { error: error.message });
      result.errors.push(error.message);
      return result;
    }
  }
}
