import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { decrypt } from '../../utils/encryption';
import { HttpExecutor } from './executors/HttpExecutor';
import { MappingExecutor } from './executors/MappingExecutor';
import { ValidationExecutor } from './executors/ValidationExecutor';
import { ExecutionContext, ExecutionResult } from './types';

export class IntegrationEngine {
  private httpExecutor = new HttpExecutor();
  private mappingExecutor = new MappingExecutor();
  private validationExecutor = new ValidationExecutor();

  /**
   * Execute an integration (either dry-run or real execution)
   * @param integrationId Integration ID from database
   * @param dryRun If true, don't save data to database
   * @param dateRange Optional date range for data import
   */
  async execute(
    integrationId: string,
    options: {
      dryRun?: boolean;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Load integration configuration
      const integration = await prisma.aIIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      if (!integration.mappingRules) {
        throw new Error('Integration mapping rules not configured');
      }

      logger.info('Starting integration execution', {
        integrationId,
        name: integration.name,
        dryRun: options.dryRun,
      });

      // Decrypt credentials
      const apiKey = integration.apiKey ? decrypt(integration.apiKey) : undefined;

      // Build execution context
      const context: ExecutionContext = {
        apiKey,
        startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: options.endDate || new Date().toISOString().split('T')[0],
        limit: options.limit,
      };

      const config = integration.mappingRules as any;

      // Step 1: HTTP Request to fetch data
      logger.info('Step 1: Fetching data from API');
      const rawData = await this.httpExecutor.execute(config.source, null, context);

      logger.info('Data fetched', {
        rows: Array.isArray(rawData) ? rawData.length : 'N/A',
      });

      // Ensure rawData is an array
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];

      // Step 2: Map fields
      logger.info('Step 2: Mapping fields');
      const mappedData = await this.mappingExecutor.execute(
        {
          mapping: config.fieldMapping,
          transformation: config.transformation,
        },
        dataArray,
        context
      );

      logger.info('Fields mapped', { rows: mappedData.length });

      // Step 3: Validate data
      logger.info('Step 3: Validating data');
      const validationResult = await this.validationExecutor.execute(
        config.validation || {},
        mappedData,
        context
      );

      logger.info('Validation complete', {
        valid: validationResult.valid.length,
        invalid: validationResult.invalid.length,
        errors: validationResult.errors.length,
      });

      // Step 4: Save to database (if not dry run and target entity is specified)
      let savedCount = 0;
      if (!options.dryRun && config.targetEntity && validationResult.valid.length > 0) {
        logger.info('Step 4: Saving to database');
        savedCount = await this.saveToDatabase(config.targetEntity, validationResult.valid);
        logger.info('Data saved', { count: savedCount });
      }

      const duration = Date.now() - startTime;

      const result: ExecutionResult = {
        success: validationResult.errors.length === 0,
        data: options.dryRun ? validationResult.valid : undefined,
        errors: validationResult.errors,
        metadata: {
          rowsProcessed: dataArray.length,
          rowsSucceeded: validationResult.valid.length,
          rowsFailed: validationResult.errors.length,
          duration,
        },
      };

      // Update integration last sync status
      await prisma.aIIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSuccessAt: result.success ? new Date() : undefined,
          lastErrorMessage: result.success ? null : `${result.errors?.length || 0} validation errors`,
        },
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Integration execution failed', {
        integrationId,
        error: error.message,
      });

      // Update integration with error
      await prisma.aIIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastErrorMessage: error.message,
          status: 'ERROR',
        },
      });

      return {
        success: false,
        errors: [{ message: error.message }],
        metadata: { duration },
      };
    }
  }

  private async saveToDatabase(entityType: string, data: any[]): Promise<number> {
    // Simple implementation for TimeEntry
    // This would be extended to support other entity types

    if (entityType === 'TimeEntry') {
      return await this.saveTimeEntries(data);
    }

    throw new Error(`Unsupported entity type: ${entityType}`);
  }

  private async saveTimeEntries(data: any[]): Promise<number> {
    let count = 0;

    for (const item of data) {
      try {
        // Look up employee by employeeNumber
        const employee = await prisma.employee.findFirst({
          where: { employeeNumber: item.employeeNumber },
        });

        if (!employee) {
          logger.warn('Employee not found', { employeeNumber: item.employeeNumber });
          continue;
        }

        // Create or update time entry
        await prisma.timeEntry.upsert({
          where: {
            // Composite unique key would be better, but for now use a simple approach
            id: item.id || 'new',
          },
          create: {
            employeeId: employee.id,
            date: item.date || item.startTime,
            startTime: item.startTime,
            endTime: item.endTime,
            breakDuration: item.breakDuration || 0,
            location: item.location,
            taskType: item.taskType || 'DISTRIBUTION',
            status: 'PENDING',
            comment: item.comment,
          },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
            breakDuration: item.breakDuration || 0,
            location: item.location,
            comment: item.comment,
          },
        });

        count++;
      } catch (error: any) {
        logger.error('Failed to save time entry', {
          item,
          error: error.message,
        });
      }
    }

    return count;
  }
}
