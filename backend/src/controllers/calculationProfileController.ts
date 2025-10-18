import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as calculationProfileService from '../services/calculationProfileService';

/**
 * GET /api/v1/calculation-profiles
 * Hent alle beregningsprofiler for teamet
 */
export async function getAllProfiles(req: AuthRequest, res: Response) {
  try {
    const teamId = req.user?.teamId || '1'; // Default team
    const profiles = await calculationProfileService.getAllProfiles(teamId);

    return res.json({
      success: true,
      data: profiles,
      count: profiles.length
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af beregningsprofiler',
      error: error.message
    });
  }
}

/**
 * GET /api/v1/calculation-profiles/:id
 * Hent specifik beregningsprofil
 */
export async function getProfileById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const profile = await calculationProfileService.getProfileById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Beregningsprofil ikke fundet'
      });
    }

    return res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af beregningsprofil',
      error: error.message
    });
  }
}

/**
 * POST /api/v1/calculation-profiles
 * Opret ny beregningsprofil
 */
export async function createProfile(req: AuthRequest, res: Response) {
  try {
    const teamId = req.user?.teamId || '1';
    const profile = await calculationProfileService.createProfile({
      ...req.body,
      teamId
    });

    return res.status(201).json({
      success: true,
      data: profile,
      message: 'Beregningsprofil oprettet'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Fejl ved oprettelse af beregningsprofil',
      error: error.message
    });
  }
}

/**
 * PUT /api/v1/calculation-profiles/:id
 * Opdater beregningsprofil
 */
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const profile = await calculationProfileService.updateProfile(id, req.body);

    return res.json({
      success: true,
      data: profile,
      message: 'Beregningsprofil opdateret'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Fejl ved opdatering af beregningsprofil',
      error: error.message
    });
  }
}

/**
 * DELETE /api/v1/calculation-profiles/:id
 * Slet beregningsprofil
 */
export async function deleteProfile(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await calculationProfileService.deleteProfile(id);

    return res.json({
      success: true,
      message: 'Beregningsprofil slettet'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Fejl ved sletning af beregningsprofil',
      error: error.message
    });
  }
}

/**
 * GET /api/v1/calculation-profiles/stats
 * Hent brugsstatistik for profiler
 */
export async function getProfileStats(req: AuthRequest, res: Response) {
  try {
    const teamId = req.user?.teamId || '1';
    const stats = await calculationProfileService.getProfileUsageStats(teamId);

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
