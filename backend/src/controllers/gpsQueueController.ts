import { Request, Response } from 'express';
import { gpsQueueService, QueuedGPSData } from '../services/gpsQueueService';

/**
 * Batch upload GPS data from offline queue
 * POST /api/v1/gps-tracking/batch-upload
 */
export const batchUpload = async (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Data must be an array of GPS points',
      });
    }

    // Process the batch
    const result = await gpsQueueService.processBatch(data as QueuedGPSData[]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Batch processing failed',
        errors: result.errors,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Batch processed successfully',
      data: {
        created: result.created,
        duplicates: result.duplicates,
        conflicts: result.conflicts,
        total: data.length,
      },
    });
  } catch (error: any) {
    console.error('Error in batch upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get sync status for an employee
 * GET /api/v1/gps-tracking/sync-status/:employeeId
 */
export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const status = await gpsQueueService.getSyncStatus(employeeId);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message,
    });
  }
};

/**
 * Get pending conflicts for an employee
 * GET /api/v1/gps-tracking/conflicts/:employeeId
 */
export const getPendingConflicts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const conflicts = await gpsQueueService.getPendingConflicts(employeeId);

    return res.status(200).json({
      success: true,
      data: conflicts,
    });
  } catch (error: any) {
    console.error('Error getting conflicts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get conflicts',
      error: error.message,
    });
  }
};

/**
 * Resolve a GPS conflict
 * POST /api/v1/gps-tracking/resolve-conflict/:id
 */
export const resolveConflict = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, manualData } = req.body;

    if (!['client', 'server', 'manual'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution type. Must be: client, server, or manual',
      });
    }

    if (resolution === 'manual' && !manualData) {
      return res.status(400).json({
        success: false,
        message: 'Manual data required for manual resolution',
      });
    }

    await gpsQueueService.resolveConflict(id, resolution, manualData);

    return res.status(200).json({
      success: true,
      message: 'Conflict resolved successfully',
    });
  } catch (error: any) {
    console.error('Error resolving conflict:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve conflict',
      error: error.message,
    });
  }
};

/**
 * Reject a GPS conflict
 * POST /api/v1/gps-tracking/reject-conflict/:id
 */
export const rejectConflict = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await gpsQueueService.rejectConflict(id);

    return res.status(200).json({
      success: true,
      message: 'Conflict rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting conflict:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject conflict',
      error: error.message,
    });
  }
};
