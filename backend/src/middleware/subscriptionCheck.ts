import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import { logger } from '../config/logger';

/**
 * Middleware til at tjekke om team har aktivt abonnement
 *
 * Dette middleware skal bruges på endpoints der kræver betalt abonnement.
 * Det tillader adgang hvis:
 * - Team er i trial period
 * - Team har aktivt betalt abonnement
 *
 * Det blokerer adgang hvis:
 * - Trial er udløbet uden betaling
 * - Abonnement er opsagt og perioden er udløbet
 * - Betaling er fejlet (PAST_DUE status)
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { teamId },
    });

    // Hvis ingen subscription findes, tillad ikke adgang
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'Ingen abonnement fundet. Opret venligst et abonnement for at få adgang.',
        code: 'NO_SUBSCRIPTION',
      });
    }

    // Tjek subscription status
    const allowedStatuses = ['TRIALING', 'ACTIVE'];

    if (!allowedStatuses.includes(subscription.status)) {
      let message = 'Abonnement er ikke aktivt';
      let code = 'SUBSCRIPTION_INACTIVE';

      if (subscription.status === 'PAST_DUE') {
        message =
          'Betalingen fejlede. Opdater venligst betalingsoplysninger for at fortsætte.';
        code = 'PAYMENT_FAILED';
      } else if (subscription.status === 'CANCELED') {
        message = 'Abonnement er opsagt. Genaktiver for at fortsætte.';
        code = 'SUBSCRIPTION_CANCELED';
      } else if (subscription.status === 'UNPAID') {
        message = 'Ubetalt abonnement. Gennemfør venligst betaling.';
        code = 'SUBSCRIPTION_UNPAID';
      }

      return res.status(403).json({
        success: false,
        message,
        code,
      });
    }

    // Hvis i trial, tjek om trial er udløbet
    if (subscription.status === 'TRIALING' && subscription.trialEnd) {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEnd);

      if (now > trialEnd) {
        return res.status(403).json({
          success: false,
          message:
            'Gratis prøveperiode er udløbet. Tilføj venligst betalingsoplysninger for at fortsætte.',
          code: 'TRIAL_EXPIRED',
        });
      }
    }

    // Alt OK - tillad adgang
    next();
  } catch (error: any) {
    logger.error('Fejl ved subscription check', {
      error: error.message,
      teamId: (req as AuthRequest).user?.teamId,
    });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved verifikation af abonnement',
    });
  }
};

/**
 * Middleware der blot tilføjer subscription info til request
 * men ikke blokerer adgang
 */
export const addSubscriptionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (teamId) {
      const subscription = await prisma.subscription.findUnique({
        where: { teamId },
      });

      // Tilføj subscription til request object
      (authReq as any).subscription = subscription;
    }

    next();
  } catch (error: any) {
    logger.error('Fejl ved hentning af subscription info', {
      error: error.message,
      teamId: (req as AuthRequest).user?.teamId,
    });
    // Fortsæt alligevel - blokér ikke request
    next();
  }
};
