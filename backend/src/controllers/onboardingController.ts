import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Get onboarding status for current team
export const getOnboardingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: {
        id: true,
        name: true,
        onboardingCompleted: true,
        currentOnboardingStep: true,
        onboardingStepsCompleted: true,
      },
    });

    if (!team) {
      throw new AppError('Team ikke fundet', 404);
    }

    // Get counts to check which steps can be completed
    const [employeeCount, calculationProfileCount, integrationCount] = await Promise.all([
      prisma.employee.count({ where: { user: { teamId: team.id } } }),
      prisma.calculationProfile.count({ where: { teamId: team.id } }),
      prisma.integrationConfig.count({ where: { teamId: team.id, isActive: true } }),
    ]);

    res.json({
      status: 'success',
      data: {
        team: {
          id: team.id,
          name: team.name,
          onboardingCompleted: team.onboardingCompleted,
          currentOnboardingStep: team.currentOnboardingStep,
          stepsCompleted: team.onboardingStepsCompleted || [],
        },
        stats: {
          employeeCount,
          calculationProfileCount,
          integrationCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Complete a specific onboarding step
export const completeStep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { stepId } = req.body;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    if (typeof stepId !== 'number') {
      throw new AppError('stepId skal være et nummer', 400);
    }

    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
    });

    if (!team) {
      throw new AppError('Team ikke fundet', 404);
    }

    // Get current completed steps
    const completedSteps = (team.onboardingStepsCompleted as number[]) || [];

    // Add step if not already completed
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    // Update current step to next one
    const nextStep = stepId + 1;

    // Update team
    await prisma.team.update({
      where: { id: team.id },
      data: {
        currentOnboardingStep: nextStep,
        onboardingStepsCompleted: completedSteps,
      },
    });

    logger.info(`Team ${team.name} completed onboarding step ${stepId}`);

    res.json({
      status: 'success',
      data: {
        currentStep: nextStep,
        completedSteps,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Skip/complete entire onboarding
export const skipOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    const team = await prisma.team.update({
      where: { id: user.teamId },
      data: {
        onboardingCompleted: true,
      },
    });

    logger.info(`Team ${team.name} skipped onboarding`);

    res.json({
      status: 'success',
      data: { onboardingCompleted: true },
    });
  } catch (error) {
    next(error);
  }
};

// Complete entire onboarding
export const completeOnboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user.teamId) {
      throw new AppError('Bruger har ikke et team', 400);
    }

    const team = await prisma.team.update({
      where: { id: user.teamId },
      data: {
        onboardingCompleted: true,
      },
    });

    logger.info(`Team ${team.name} completed onboarding`);

    res.json({
      status: 'success',
      data: { onboardingCompleted: true },
    });
  } catch (error) {
    next(error);
  }
};
