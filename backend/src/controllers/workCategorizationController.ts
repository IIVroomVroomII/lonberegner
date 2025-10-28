import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { WorkCategorizationService } from '../services/workCategorizationService';
import { logger } from '../config/logger';

/**
 * Analyserer GPS data for en arbejdsdag og foreslår arbejdstyper
 */
export const categorizeWorkDay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { timeEntryId } = req.params;

    logger.info(`Analyserer arbejdsdag for time entry: ${timeEntryId}`);

    const result = await WorkCategorizationService.categorizeWorkDay(timeEntryId);

    logger.info(
      `Arbejdsdag analyse færdig: ${result.workPeriods.length} perioder identificeret`
    );

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
