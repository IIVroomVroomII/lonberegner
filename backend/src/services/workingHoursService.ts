/**
 * § 4 Arbejdstid - Working Hours Service
 *
 * Håndterer:
 * - Varierende ugentlig arbejdstid
 * - Afspadsering (time-off in lieu)
 * - Timebank administration
 * - Forskudt tid (shifted hours / night work)
 *
 * Baseret på Transport- og Logistikoverenskomst 2025-2028 § 4
 */

import prisma from '../config/database';
import { Employee, TimeBankType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

// § 4 Arbejdstidsregler
export const WORKING_HOURS_RULES = {
  // Standard ugentlig arbejdstid
  STANDARD_WEEKLY_HOURS: {
    HOURLY: 37, // Timelønnede
    SALARIED: 37, // Fuldlønnede
    FIRST_SHIFT: 37, // 1. skift (dag)
    SECOND_SHIFT: 34, // 2. skift (aften)
    THIRD_SHIFT: 34, // 3. skift (nat)
  },

  // Daglig arbejdstid
  STANDARD_DAILY_HOURS: 7.4, // 37 timer / 5 dage

  // Timebank regler
  TIME_BANK: {
    MAX_STORAGE_MONTHS: 6, // Maksimum opbevaringstid i måneder
    EXPIRY_WARNING_DAYS: 30, // Advarsel X dage før udløb
  },

  // Natarbejde definition
  NIGHT_WORK: {
    START_HOUR: 18, // Kl. 18:00
    END_HOUR: 6, // Kl. 06:00
  },

  // Pauser (ikke inkluderet i arbejdstid)
  BREAKS: {
    MINIMUM_DAILY: 30, // Minimum 30 min pause ved 6+ timers arbejde
    REQUIRED_AFTER_HOURS: 6, // Pause påkrævet efter 6 timers arbejde
  },
};

export interface WorkingHoursCalculation {
  standardWeeklyHours: number;
  actualHours: number;
  variance: number; // Difference from standard
  isOvertime: boolean;
  isUndertime: boolean;
  overtimeHours?: number;
  undertimeHours?: number;
}

export interface TimeBankSummary {
  totalBalance: number; // Total timer i banken
  earnedHours: number; // Optjente timer
  takenHours: number; // Afspadserede timer
  expiredHours: number; // Udløbne timer
  expiringEntries: Array<{
    id: string;
    hours: number;
    expiresAt: Date;
    daysUntilExpiry: number;
  }>;
}

/**
 * Beregner standard ugentlig arbejdstid baseret på medarbejdertype
 */
export function calculateStandardWeeklyHours(employee: Employee): number {
  switch (employee.workTimeType) {
    case WorkTimeType.HOURLY:
      return WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.HOURLY;
    case WorkTimeType.SALARIED:
      return WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.SALARIED;
    case WorkTimeType.SHIFT_WORK:
      // For shift work, check specific shift type from turnus schedule
      // Default to 34 hours (2nd/3rd shift standard)
      return WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.SECOND_SHIFT;
    case WorkTimeType.SUBSTITUTE:
      return WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.HOURLY;
    default:
      return WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.HOURLY;
  }
}

/**
 * Beregner arbejdstidsvariance for en given periode
 */
export async function calculateWorkingHoursVariance(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WorkingHoursCalculation> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  // Beregn antal uger i perioden
  const weeks = calculateWeeksBetween(periodStart, periodEnd);
  const standardWeeklyHours = calculateStandardWeeklyHours(employee);
  const standardTotalHours = standardWeeklyHours * weeks;

  // Hent faktiske arbejdstimer for perioden
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      employeeId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      status: 'APPROVED',
    },
  });

  let actualHours = 0;
  for (const entry of timeEntries) {
    if (entry.endTime) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const workMinutes = totalMinutes - entry.breakDuration;
      actualHours += workMinutes / 60;
    }
  }

  const variance = actualHours - standardTotalHours;

  const result: WorkingHoursCalculation = {
    standardWeeklyHours,
    actualHours,
    variance,
    isOvertime: variance > 0,
    isUndertime: variance < 0,
  };

  if (variance > 0) {
    result.overtimeHours = variance;
  } else if (variance < 0) {
    result.undertimeHours = Math.abs(variance);
  }

  logger.info('Working hours variance calculated', {
    employeeId,
    periodStart,
    periodEnd,
    weeks,
    standardTotalHours,
    actualHours,
    variance,
  });

  return result;
}

/**
 * Tilføjer timer til medarbejderens timebank
 */
export async function addToTimeBank(
  employeeId: string,
  hours: number,
  type: TimeBankType,
  description: string,
  date: Date = new Date()
): Promise<string> {
  // Beregn udløbsdato (6 måneder fra nu)
  const expiresAt = new Date(date);
  expiresAt.setMonth(expiresAt.getMonth() + WORKING_HOURS_RULES.TIME_BANK.MAX_STORAGE_MONTHS);

  const entry = await prisma.timeBankEntry.create({
    data: {
      employeeId,
      hours: new Decimal(hours),
      type,
      description,
      date,
      expiresAt,
    },
  });

  logger.info('Time bank entry created', {
    id: entry.id,
    employeeId,
    hours,
    type,
    expiresAt,
  });

  return entry.id;
}

/**
 * Registrerer afspadsering (time-off taken from time bank)
 */
export async function takeTimeOff(
  employeeId: string,
  hours: number,
  description: string,
  date: Date = new Date()
): Promise<string> {
  const balance = await getTimeBankBalance(employeeId);

  if (balance < hours) {
    throw new Error(
      `Ikke nok timer i timebanken. Balance: ${balance} timer, forsøgt at tage: ${hours} timer`
    );
  }

  const entry = await prisma.timeBankEntry.create({
    data: {
      employeeId,
      hours: new Decimal(-hours), // Negative value for time taken
      type: TimeBankType.TIME_OFF_TAKEN,
      description,
      date,
      expiresAt: null, // Time off taken doesn't expire
    },
  });

  logger.info('Time off registered', {
    id: entry.id,
    employeeId,
    hours,
    remainingBalance: balance - hours,
  });

  return entry.id;
}

/**
 * Henter medarbejderens aktuelle timebank balance
 */
export async function getTimeBankBalance(employeeId: string): Promise<number> {
  const entries = await prisma.timeBankEntry.findMany({
    where: {
      employeeId,
    },
  });

  let balance = 0;
  for (const entry of entries) {
    balance += Number(entry.hours);
  }

  return balance;
}

/**
 * Henter detaljeret timebank oversigt
 */
export async function getTimeBankSummary(employeeId: string): Promise<TimeBankSummary> {
  const entries = await prisma.timeBankEntry.findMany({
    where: {
      employeeId,
    },
    orderBy: {
      date: 'desc',
    },
  });

  let earnedHours = 0;
  let takenHours = 0;
  let expiredHours = 0;

  for (const entry of entries) {
    const hours = Number(entry.hours);

    switch (entry.type) {
      case TimeBankType.OVERTIME_EARNED:
        earnedHours += hours;
        break;
      case TimeBankType.TIME_OFF_TAKEN:
        takenHours += Math.abs(hours);
        break;
      case TimeBankType.EXPIRED:
        expiredHours += Math.abs(hours);
        break;
      case TimeBankType.PAYOUT:
        // Payout removes from balance but isn't "taken" time off
        break;
    }
  }

  const totalBalance = earnedHours - takenHours - expiredHours;

  // Find entries expiring soon
  const now = new Date();
  const warningDate = new Date();
  warningDate.setDate(
    warningDate.getDate() + WORKING_HOURS_RULES.TIME_BANK.EXPIRY_WARNING_DAYS
  );

  const expiringEntries = entries
    .filter((entry) => {
      if (!entry.expiresAt) return false;
      const expiresAt = new Date(entry.expiresAt);
      return expiresAt > now && expiresAt <= warningDate && Number(entry.hours) > 0;
    })
    .map((entry) => {
      const expiresAt = new Date(entry.expiresAt!);
      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: entry.id,
        hours: Number(entry.hours),
        expiresAt,
        daysUntilExpiry,
      };
    });

  return {
    totalBalance,
    earnedHours,
    takenHours,
    expiredHours,
    expiringEntries,
  };
}

/**
 * Udløber timer der er ældre end 6 måneder
 */
export async function expireOldTimeBankEntries(): Promise<{
  expiredCount: number;
  totalHoursExpired: number;
}> {
  const now = new Date();

  // Find alle entries der er udløbet
  const expiredEntries = await prisma.timeBankEntry.findMany({
    where: {
      expiresAt: {
        lt: now,
      },
      type: TimeBankType.OVERTIME_EARNED,
    },
  });

  let totalHoursExpired = 0;

  for (const entry of expiredEntries) {
    const hours = Number(entry.hours);
    totalHoursExpired += hours;

    // Marker som udløbet
    await prisma.timeBankEntry.update({
      where: { id: entry.id },
      data: {
        type: TimeBankType.EXPIRED,
      },
    });

    logger.warn('Time bank entry expired', {
      id: entry.id,
      employeeId: entry.employeeId,
      hours,
      expiresAt: entry.expiresAt,
    });
  }

  logger.info('Time bank expiry process completed', {
    expiredCount: expiredEntries.length,
    totalHoursExpired,
  });

  return {
    expiredCount: expiredEntries.length,
    totalHoursExpired,
  };
}

/**
 * Udbetaler timebank ved fratræden
 */
export async function payoutTimeBankOnTermination(
  employeeId: string,
  hourlyRate: number
): Promise<{
  hours: number;
  payoutAmount: number;
  entryId: string;
}> {
  const balance = await getTimeBankBalance(employeeId);

  if (balance <= 0) {
    throw new Error('Ingen timer at udbetale');
  }

  const payoutAmount = balance * hourlyRate;

  // Registrer udbetaling
  const entry = await prisma.timeBankEntry.create({
    data: {
      employeeId,
      hours: new Decimal(-balance), // Remove all hours from bank
      type: TimeBankType.PAYOUT,
      description: `Timebank udbetaling ved fratræden: ${balance} timer á ${hourlyRate} kr/time`,
      date: new Date(),
      expiresAt: null,
    },
  });

  logger.info('Time bank payout on termination', {
    employeeId,
    hours: balance,
    hourlyRate,
    payoutAmount,
    entryId: entry.id,
  });

  return {
    hours: balance,
    payoutAmount,
    entryId: entry.id,
  };
}

/**
 * Checker om et tidspunkt er natarbejde
 * § 4 stk. 5: Arbejde mellem kl. 18:00 og 06:00
 */
export function isNightWork(startTime: Date, endTime: Date): boolean {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();

  // Natarbejde er mellem 18:00 og 06:00
  const nightStart = WORKING_HOURS_RULES.NIGHT_WORK.START_HOUR; // 18
  const nightEnd = WORKING_HOURS_RULES.NIGHT_WORK.END_HOUR; // 6

  // Check if start is during night hours (18:00-23:59 or 00:00-05:59)
  const startIsNight = startHour >= nightStart || startHour < nightEnd;

  // Check if end is during night hours
  // Note: endHour is the hour when work ends, so we need to check if it's within night period
  const endIsNight = endHour > nightStart || (endHour > 0 && endHour <= nightEnd);

  // If either start or end is during night, it's night work
  if (startIsNight || endIsNight) {
    return true;
  }

  // Check if shift spans through the entire night period (e.g., 16:00-20:00 spans through 18:00)
  // This happens when start is before night start and end is after night start
  if (startHour < nightStart && endHour > nightStart) {
    return true;
  }

  return false;
}

/**
 * Beregner antal nattimer i et arbejdsskift
 */
export function calculateNightHours(startTime: Date, endTime: Date): number {
  let nightMinutes = 0;
  const nightStart = WORKING_HOURS_RULES.NIGHT_WORK.START_HOUR;
  const nightEnd = WORKING_HOURS_RULES.NIGHT_WORK.END_HOUR;

  // Clone dates to avoid modifying originals
  let current = new Date(startTime);
  const end = new Date(endTime);

  while (current < end) {
    const hour = current.getHours();

    // Check if current hour is night work
    if (hour >= nightStart || hour < nightEnd) {
      nightMinutes += 1;
    }

    // Move to next minute
    current.setMinutes(current.getMinutes() + 1);
  }

  return nightMinutes / 60;
}

/**
 * Validerer at påkrævede pauser er registreret
 */
export function validateBreakRequirements(
  workHours: number,
  breakMinutes: number
): {
  isValid: boolean;
  requiredBreakMinutes: number;
  error?: string;
} {
  const requiredBreak = workHours >= WORKING_HOURS_RULES.BREAKS.REQUIRED_AFTER_HOURS
    ? WORKING_HOURS_RULES.BREAKS.MINIMUM_DAILY
    : 0;

  const isValid = breakMinutes >= requiredBreak;

  return {
    isValid,
    requiredBreakMinutes: requiredBreak,
    error: isValid
      ? undefined
      : `Minimum ${requiredBreak} minutters pause påkrævet ved ${workHours} timers arbejde. Registreret: ${breakMinutes} minutter.`,
  };
}

/**
 * Hjælpefunktion: Beregner antal uger mellem to datoer
 */
function calculateWeeksBetween(startDate: Date, endDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffMs / msPerWeek);
}
