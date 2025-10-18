import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as conflictService from '../services/conflictService';
import { ConflictStatus, ConflictType } from '@prisma/client';

/**
 * GET /api/v1/conflicts
 * Hent alle konflikter med filtre
 */
export async function getAllConflicts(req: AuthRequest, res: Response) {
  try {
    const { status, employeeId, conflictType, fromDate, toDate } = req.query;

    const filters: any = {};
    if (status) filters.status = status as ConflictStatus;
    if (employeeId) filters.employeeId = employeeId as string;
    if (conflictType) filters.conflictType = conflictType as ConflictType;
    if (fromDate) filters.fromDate = new Date(fromDate as string);
    if (toDate) filters.toDate = new Date(toDate as string);

    const conflicts = await conflictService.getAllConflicts(filters);

    return res.json({
      success: true,
      data: conflicts,
      count: conflicts.length
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af konflikter',
      error: error.message
    });
  }
}

/**
 * GET /api/v1/conflicts/:id
 * Hent specifik konflikt
 */
export async function getConflictById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const conflict = await conflictService.getConflictById(id);

    if (!conflict) {
      return res.status(404).json({
        success: false,
        message: 'Konflikt ikke fundet'
      });
    }

    return res.json({
      success: true,
      data: conflict
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af konflikt',
      error: error.message
    });
  }
}

/**
 * POST /api/v1/conflicts/:id/resolve
 * Løs konflikt
 */
export async function resolveConflict(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '';

    const conflict = await conflictService.resolveConflict(id, {
      ...req.body,
      resolvedBy: userId
    });

    return res.json({
      success: true,
      data: conflict,
      message: 'Konflikt løst'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Fejl ved løsning af konflikt',
      error: error.message
    });
  }
}

/**
 * POST /api/v1/conflicts/:id/reject
 * Afvis konflikt
 */
export async function rejectConflict(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = req.user?.id || '';

    const conflict = await conflictService.rejectConflict(id, userId, note);

    return res.json({
      success: true,
      data: conflict,
      message: 'Konflikt afvist'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Fejl ved afvisning af konflikt',
      error: error.message
    });
  }
}

/**
 * POST /api/v1/conflicts/batch-approve
 * Godkend flere konflikter på én gang
 */
export async function batchApproveConflicts(req: AuthRequest, res: Response) {
  try {
    const { conflictIds } = req.body;
    const userId = req.user?.id || '';

    const count = await conflictService.batchApproveConflicts(conflictIds, userId);

    return res.json({
      success: true,
      message: `${count} konflikter godkendt`,
      count
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Fejl ved batch godkendelse',
      error: error.message
    });
  }
}

/**
 * GET /api/v1/conflicts/stats
 * Hent konflikt statistik
 */
export async function getConflictStats(req: AuthRequest, res: Response) {
  try {
    const { employeeId, fromDate, toDate } = req.query;

    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (fromDate) filters.fromDate = new Date(fromDate as string);
    if (toDate) filters.toDate = new Date(toDate as string);

    const stats = await conflictService.getConflictStats(filters);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af statistik',
      error: error.message
    });
  }
}
