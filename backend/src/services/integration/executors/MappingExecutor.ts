import { StepExecutor, FieldMapping, TransformationConfig, ExecutionContext } from '../types';
import { logger } from '../../../config/logger';

export class MappingExecutor implements StepExecutor {
  async execute(
    config: { mapping: FieldMapping; transformation?: TransformationConfig },
    input: any[],
    context: ExecutionContext
  ): Promise<any[]> {
    if (!Array.isArray(input)) {
      throw new Error('MappingExecutor expects array input');
    }

    logger.info('Mapping data', { rows: input.length });

    return input.map((item, index) => {
      try {
        return this.mapItem(item, config.mapping, config.transformation, context);
      } catch (error: any) {
        logger.error('Mapping error', { row: index, error: error.message });
        throw new Error(`Row ${index}: ${error.message}`);
      }
    });
  }

  private mapItem(
    item: any,
    mapping: FieldMapping,
    transformation?: TransformationConfig,
    context?: ExecutionContext
  ): any {
    const mapped: any = {};

    // Apply field mapping
    for (const [targetField, source] of Object.entries(mapping)) {
      if (typeof source === 'string') {
        // Simple path mapping
        mapped[targetField] = this.getNestedValue(item, source);
      } else if (typeof source === 'object') {
        // Complex mapping with type
        mapped[targetField] = this.applyComplexMapping(item, source, context);
      }
    }

    // Apply transformations
    if (transformation) {
      for (const [field, transform] of Object.entries(transformation)) {
        if (mapped[field] !== undefined) {
          mapped[field] = this.transform(mapped[field], transform);
        }
      }
    }

    return mapped;
  }

  private getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private applyComplexMapping(item: any, config: any, context?: ExecutionContext): any {
    switch (config.type) {
      case 'constant':
        return config.value;

      case 'function':
        // Apply predefined function
        return this.applyFunction(this.getNestedValue(item, config.source), config.function);

      case 'lookup':
        const value = this.getNestedValue(item, config.source);
        return config.lookupTable?.[value] || value;

      default:
        return this.getNestedValue(item, config.source);
    }
  }

  private applyFunction(value: any, functionName: string): any {
    switch (functionName) {
      case 'toUpperCase':
        return value?.toString().toUpperCase();
      case 'toLowerCase':
        return value?.toString().toLowerCase();
      case 'trim':
        return value?.toString().trim();
      default:
        return value;
    }
  }

  private transform(value: any, transform: any): any {
    if (typeof transform === 'string') {
      return this.applySimpleTransform(value, transform);
    }

    if (typeof transform === 'object' && transform.type) {
      return this.applyComplexTransform(value, transform);
    }

    return value;
  }

  private applySimpleTransform(value: any, type: string): any {
    switch (type) {
      case 'parseISO8601':
      case 'parseDate':
        return value ? new Date(value) : null;

      case 'parseInt':
        return value ? parseInt(value, 10) : null;

      case 'parseFloat':
        return value ? parseFloat(value) : null;

      case 'toString':
        return value?.toString();

      case 'toUpperCase':
        return value?.toString().toUpperCase();

      case 'toLowerCase':
        return value?.toString().toLowerCase();

      case 'trim':
        return value?.toString().trim();

      default:
        return value;
    }
  }

  private applyComplexTransform(value: any, transform: any): any {
    const { type, args = [] } = transform;

    switch (type) {
      case 'default':
        return value !== null && value !== undefined ? value : args[0];

      case 'concat':
        return args.join('');

      case 'split':
        return value?.toString().split(args[0]);

      case 'replace':
        return value?.toString().replace(new RegExp(args[0], 'g'), args[1]);

      default:
        return value;
    }
  }
}
