import { StepExecutor, ValidationConfig, ExecutionContext, ExecutionError } from '../types';
import { logger } from '../../../config/logger';

export class ValidationExecutor implements StepExecutor {
  async execute(config: ValidationConfig, input: any[], context: ExecutionContext): Promise<any> {
    if (!Array.isArray(input)) {
      throw new Error('ValidationExecutor expects array input');
    }

    logger.info('Validating data', { rows: input.length });

    const errors: ExecutionError[] = [];
    const validatedData: any[] = [];

    input.forEach((item, index) => {
      const itemErrors = this.validateItem(item, config, index);

      if (itemErrors.length > 0) {
        errors.push(...itemErrors);
      } else {
        validatedData.push(item);
      }
    });

    return {
      valid: validatedData,
      invalid: input.filter((_, i) => !validatedData.includes(input[i])),
      errors,
      success: errors.length === 0,
    };
  }

  private validateItem(item: any, config: ValidationConfig, rowIndex: number): ExecutionError[] {
    const errors: ExecutionError[] = [];

    // Check required fields
    if (config.required) {
      for (const field of config.required) {
        if (item[field] === null || item[field] === undefined || item[field] === '') {
          errors.push({
            row: rowIndex,
            field,
            message: `Field '${field}' is required`,
            code: 'REQUIRED_FIELD',
          });
        }
      }
    }

    // Check unique fields (would need context of all items)
    // This is a simplified version - real implementation would track duplicates

    // Check validation rules
    if (config.rules) {
      for (const [field, rule] of Object.entries(config.rules)) {
        const value = item[field];

        // Required check
        if (rule.required && (value === null || value === undefined || value === '')) {
          errors.push({
            row: rowIndex,
            field,
            message: `Field '${field}' is required`,
            code: 'REQUIRED_FIELD',
          });
          continue;
        }

        // Skip other validations if value is null/undefined (and not required)
        if (value === null || value === undefined) {
          continue;
        }

        // Type validation
        if (rule.type) {
          const typeError = this.validateType(value, rule.type, field);
          if (typeError) {
            errors.push({ row: rowIndex, ...typeError });
            continue;
          }
        }

        // Min/Max validation
        if (rule.min !== undefined) {
          if (typeof value === 'number' && value < rule.min) {
            errors.push({
              row: rowIndex,
              field,
              message: `Field '${field}' must be at least ${rule.min}`,
              code: 'MIN_VALUE',
            });
          } else if (typeof value === 'string' && value.length < rule.min) {
            errors.push({
              row: rowIndex,
              field,
              message: `Field '${field}' must be at least ${rule.min} characters`,
              code: 'MIN_LENGTH',
            });
          }
        }

        if (rule.max !== undefined) {
          if (typeof value === 'number' && value > rule.max) {
            errors.push({
              row: rowIndex,
              field,
              message: `Field '${field}' must be at most ${rule.max}`,
              code: 'MAX_VALUE',
            });
          } else if (typeof value === 'string' && value.length > rule.max) {
            errors.push({
              row: rowIndex,
              field,
              message: `Field '${field}' must be at most ${rule.max} characters`,
              code: 'MAX_LENGTH',
            });
          }
        }

        // Pattern validation
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(String(value))) {
            errors.push({
              row: rowIndex,
              field,
              message: `Field '${field}' does not match required pattern`,
              code: 'PATTERN_MISMATCH',
            });
          }
        }

        // Custom validation
        if (rule.custom) {
          const result = rule.custom(value);
          if (result !== true) {
            errors.push({
              row: rowIndex,
              field,
              message: typeof result === 'string' ? result : `Field '${field}' failed validation`,
              code: 'CUSTOM_VALIDATION',
            });
          }
        }
      }
    }

    return errors;
  }

  private validateType(
    value: any,
    expectedType: string,
    field: string
  ): Omit<ExecutionError, 'row'> | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return { field, message: `Field '${field}' must be a string`, code: 'TYPE_ERROR' };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { field, message: `Field '${field}' must be a number`, code: 'TYPE_ERROR' };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { field, message: `Field '${field}' must be a boolean`, code: 'TYPE_ERROR' };
        }
        break;

      case 'date':
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          return { field, message: `Field '${field}' must be a valid date`, code: 'TYPE_ERROR' };
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return { field, message: `Field '${field}' must be a valid email`, code: 'TYPE_ERROR' };
        }
        break;

      default:
        break;
    }

    return null;
  }
}
