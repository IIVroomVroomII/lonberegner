import prisma from '../config/database';
import { CalculationProfile, RoundingDirection, TimeStartMode, ConflictHandling } from '@prisma/client';

export interface CreateCalculationProfileDTO {
  teamId: string;
  name: string;
  description?: string;
  timeRoundingMinutes?: number;
  timeRoundingDirection?: RoundingDirection;
  countPreMeetingTime?: boolean;
  maxPreMeetingMinutes?: number;
  timeStartsAt?: TimeStartMode;
  conflictHandling?: ConflictHandling;
  conflictThresholdPercent?: number;
  isDefault?: boolean;
}

export interface UpdateCalculationProfileDTO {
  name?: string;
  description?: string | null;
  timeRoundingMinutes?: number;
  timeRoundingDirection?: RoundingDirection;
  countPreMeetingTime?: boolean;
  maxPreMeetingMinutes?: number;
  timeStartsAt?: TimeStartMode;
  conflictHandling?: ConflictHandling;
  conflictThresholdPercent?: number;
  isDefault?: boolean;
}

/**
 * Hent alle beregningsprofiler for et team
 */
export async function getAllProfiles(teamId: string): Promise<CalculationProfile[]> {
  return await prisma.calculationProfile.findMany({
    where: { teamId },
    include: {
      _count: {
        select: { employees: true }
      }
    },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' }
    ]
  });
}

/**
 * Hent en specifik beregningsprofil
 */
export async function getProfileById(id: string): Promise<CalculationProfile | null> {
  return await prisma.calculationProfile.findUnique({
    where: { id },
    include: {
      _count: {
        select: { employees: true }
      }
    }
  });
}

/**
 * Hent standard beregningsprofil for et team
 */
export async function getDefaultProfile(teamId: string): Promise<CalculationProfile | null> {
  return await prisma.calculationProfile.findFirst({
    where: {
      teamId,
      isDefault: true
    }
  });
}

/**
 * Opret ny beregningsprofil
 */
export async function createProfile(data: CreateCalculationProfileDTO): Promise<CalculationProfile> {
  // Hvis dette skal være default profil, fjern default fra andre profiler
  if (data.isDefault) {
    await prisma.calculationProfile.updateMany({
      where: {
        teamId: data.teamId,
        isDefault: true
      },
      data: {
        isDefault: false
      }
    });
  }

  return await prisma.calculationProfile.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      timeRoundingMinutes: data.timeRoundingMinutes ?? 0,
      timeRoundingDirection: data.timeRoundingDirection ?? RoundingDirection.NEAREST,
      countPreMeetingTime: data.countPreMeetingTime ?? false,
      maxPreMeetingMinutes: data.maxPreMeetingMinutes ?? 30,
      timeStartsAt: data.timeStartsAt ?? TimeStartMode.SCHEDULED,
      conflictHandling: data.conflictHandling ?? ConflictHandling.MANUAL_REVIEW,
      conflictThresholdPercent: data.conflictThresholdPercent ?? 10,
      isDefault: data.isDefault ?? false
    }
  });
}

/**
 * Opdater eksisterende beregningsprofil
 */
export async function updateProfile(
  id: string,
  data: UpdateCalculationProfileDTO
): Promise<CalculationProfile> {
  const profile = await prisma.calculationProfile.findUnique({
    where: { id }
  });

  if (!profile) {
    throw new Error('Beregningsprofil ikke fundet');
  }

  // Hvis dette skal være default profil, fjern default fra andre profiler
  if (data.isDefault) {
    await prisma.calculationProfile.updateMany({
      where: {
        teamId: profile.teamId,
        isDefault: true,
        id: { not: id }
      },
      data: {
        isDefault: false
      }
    });
  }

  return await prisma.calculationProfile.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      timeRoundingMinutes: data.timeRoundingMinutes,
      timeRoundingDirection: data.timeRoundingDirection,
      countPreMeetingTime: data.countPreMeetingTime,
      maxPreMeetingMinutes: data.maxPreMeetingMinutes,
      timeStartsAt: data.timeStartsAt,
      conflictHandling: data.conflictHandling,
      conflictThresholdPercent: data.conflictThresholdPercent,
      isDefault: data.isDefault
    }
  });
}

/**
 * Slet beregningsprofil
 */
export async function deleteProfile(id: string): Promise<void> {
  const profile = await prisma.calculationProfile.findUnique({
    where: { id },
    include: {
      _count: {
        select: { employees: true }
      }
    }
  });

  if (!profile) {
    throw new Error('Beregningsprofil ikke fundet');
  }

  if (profile._count.employees > 0) {
    throw new Error(
      `Kan ikke slette profil der bruges af ${profile._count.employees} medarbejdere. Fjern først profilen fra medarbejderne.`
    );
  }

  await prisma.calculationProfile.delete({
    where: { id }
  });
}

/**
 * Tildel profil til medarbejder
 */
export async function assignProfileToEmployee(
  employeeId: string,
  profileId: string | null
): Promise<void> {
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      calculationProfileId: profileId
    }
  });
}

/**
 * Hent medarbejdere med en specifik profil
 */
export async function getEmployeesWithProfile(profileId: string) {
  return await prisma.employee.findMany({
    where: {
      calculationProfileId: profileId
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
}

/**
 * Beregn antal medarbejdere per profil for et team
 */
export async function getProfileUsageStats(teamId: string) {
  const profiles = await prisma.calculationProfile.findMany({
    where: { teamId },
    select: {
      id: true,
      name: true,
      isDefault: true,
      _count: {
        select: { employees: true }
      }
    }
  });

  return profiles.map(profile => ({
    profileId: profile.id,
    profileName: profile.name,
    isDefault: profile.isDefault,
    employeeCount: profile._count.employees
  }));
}
