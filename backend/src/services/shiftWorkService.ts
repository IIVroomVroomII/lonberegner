/**
 * Holddriftsaftale - Shift Work Agreement Service
 *
 * Håndterer:
 * - Turnus/skiftplaner (rotating shifts)
 * - Skifttillæg
 * - Erstatningsfridage
 * - Skiftrotation
 * - Weekend skifttillæg
 *
 * Baseret på Holddriftsaftale 2025-2028
 */

import { Employee } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

export const SHIFT_WORK_RULES = {
  // Skifttyper og tillæg
  SHIFT_SUPPLEMENTS: {
    MORNING_SHIFT: 15, // % tillæg 06:00-14:00
    AFTERNOON_SHIFT: 20, // % tillæg 14:00-22:00
    NIGHT_SHIFT: 40, // % tillæg 22:00-06:00
    ROTATING_SHIFT_BASE: 12, // % tillæg for roterende skift generelt
  },

  // Weekend tillæg
  WEEKEND_SUPPLEMENTS: {
    SATURDAY: 50, // % tillæg lørdag
    SUNDAY: 100, // % tillæg søndag
    BANK_HOLIDAY: 100, // % tillæg helligdage
  },

  // Skiftrotation
  ROTATION: {
    MINIMUM_DAYS_BETWEEN_NIGHT_SHIFTS: 2, // Minimum pause mellem nattevagter
    MAX_CONSECUTIVE_NIGHT_SHIFTS: 5, // Max antal nattevagter i træk
    MAX_CONSECUTIVE_SHIFTS: 6, // Max antal skift i træk (generelt)
    MINIMUM_REST_HOURS: 11, // Minimum hvile mellem skift
  },

  // Erstatningsfridage
  COMPENSATION_DAYS: {
    DAYS_PER_YEAR: 5, // Ekstra fridage per år for skiftarbejde
    ACCRUAL_PER_MONTH: 0.417, // 5 dage / 12 måneder
    WEEKEND_WORK_COMPENSATION: 1.5, // Dage per weekend arbejdet
  },

  // Skiftperioder (timer)
  SHIFT_PERIODS: {
    MORNING_START: 6, // 06:00
    MORNING_END: 14, // 14:00
    AFTERNOON_START: 14, // 14:00
    AFTERNOON_END: 22, // 22:00
    NIGHT_START: 22, // 22:00
    NIGHT_END: 6, // 06:00 (næste dag)
  },

  // Turnus (cycle)
  STANDARD_ROTATION_WEEKS: 4, // Standard rotationscyklus i uger
  FAIR_DISTRIBUTION: true, // Alle skal have samme antal weekend/nattevagter
};

export enum ShiftType {
  MORNING = 'MORNING', // Dagvagt 06:00-14:00
  AFTERNOON = 'AFTERNOON', // Eftermiddagsvagt 14:00-22:00
  NIGHT = 'NIGHT', // Nattevagt 22:00-06:00
  ROTATING = 'ROTATING', // Roterende skift
  DAY = 'DAY', // Normal dagvagt (ikke holddrift)
}

export enum DayType {
  WEEKDAY = 'WEEKDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
  BANK_HOLIDAY = 'BANK_HOLIDAY',
}

export interface ShiftSchedule {
  employeeId: string;
  date: Date;
  shiftType: ShiftType;
  startTime: Date;
  endTime: Date;
  dayType: DayType;
  hoursWorked: number;
  basePayment: Decimal;
  shiftSupplement: Decimal;
  weekendSupplement: Decimal;
  totalPayment: Decimal;
  isRotating: boolean;
}

export interface RotationPattern {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  pattern: ShiftType[]; // Array of shift types in rotation
  cycleWeeks: number;
  nightShiftsCount: number;
  weekendShiftsCount: number;
  isBalanced: boolean; // Fair distribution
}

export interface CompensationDaysBalance {
  employeeId: string;
  year: number;
  accruedDays: Decimal;
  usedDays: Decimal;
  remainingDays: Decimal;
  weekendShiftsWorked: number;
  extraCompensation: Decimal; // Fra weekend arbejde
}

export interface ShiftValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Beregner skifttype baseret på tidspunkt
 */
export function determineShiftType(startTime: Date, endTime: Date): ShiftType {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();

  // Night shift: 22:00-06:00
  if (startHour >= SHIFT_WORK_RULES.SHIFT_PERIODS.NIGHT_START || startHour < SHIFT_WORK_RULES.SHIFT_PERIODS.NIGHT_END) {
    return ShiftType.NIGHT;
  }

  // Morning shift: 06:00-14:00
  if (
    startHour >= SHIFT_WORK_RULES.SHIFT_PERIODS.MORNING_START &&
    startHour < SHIFT_WORK_RULES.SHIFT_PERIODS.MORNING_END
  ) {
    return ShiftType.MORNING;
  }

  // Afternoon shift: 14:00-22:00
  if (
    startHour >= SHIFT_WORK_RULES.SHIFT_PERIODS.AFTERNOON_START &&
    startHour < SHIFT_WORK_RULES.SHIFT_PERIODS.AFTERNOON_END
  ) {
    return ShiftType.AFTERNOON;
  }

  // Default to day shift
  return ShiftType.DAY;
}

/**
 * Beregner dagtype (hverdag, weekend, helligdag)
 */
export function determineDayType(date: Date): DayType {
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0) {
    return DayType.SUNDAY;
  }
  if (dayOfWeek === 6) {
    return DayType.SATURDAY;
  }

  // Simplified: ikke helligdagsdetektion implementeret her
  return DayType.WEEKDAY;
}

/**
 * Beregner skifttillæg procent
 */
export function getShiftSupplementPercent(shiftType: ShiftType, isRotating: boolean = false): number {
  let supplement = 0;

  switch (shiftType) {
    case ShiftType.MORNING:
      supplement = SHIFT_WORK_RULES.SHIFT_SUPPLEMENTS.MORNING_SHIFT;
      break;
    case ShiftType.AFTERNOON:
      supplement = SHIFT_WORK_RULES.SHIFT_SUPPLEMENTS.AFTERNOON_SHIFT;
      break;
    case ShiftType.NIGHT:
      supplement = SHIFT_WORK_RULES.SHIFT_SUPPLEMENTS.NIGHT_SHIFT;
      break;
    case ShiftType.DAY:
    default:
      supplement = 0;
  }

  // Tilføj roterende skift tillæg
  if (isRotating && shiftType !== ShiftType.DAY) {
    supplement += SHIFT_WORK_RULES.SHIFT_SUPPLEMENTS.ROTATING_SHIFT_BASE;
  }

  return supplement;
}

/**
 * Beregner weekend tillæg procent
 */
export function getWeekendSupplementPercent(dayType: DayType): number {
  switch (dayType) {
    case DayType.SATURDAY:
      return SHIFT_WORK_RULES.WEEKEND_SUPPLEMENTS.SATURDAY;
    case DayType.SUNDAY:
      return SHIFT_WORK_RULES.WEEKEND_SUPPLEMENTS.SUNDAY;
    case DayType.BANK_HOLIDAY:
      return SHIFT_WORK_RULES.WEEKEND_SUPPLEMENTS.BANK_HOLIDAY;
    case DayType.WEEKDAY:
    default:
      return 0;
  }
}

/**
 * Beregner arbejdstimer fra start- og sluttidspunkt
 */
export function calculateHoursWorked(startTime: Date, endTime: Date): number {
  const milliseconds = endTime.getTime() - startTime.getTime();
  return milliseconds / (1000 * 60 * 60);
}

/**
 * Beregner betaling for et skift
 */
export function calculateShiftPayment(
  employee: Employee,
  date: Date,
  startTime: Date,
  endTime: Date,
  hourlyRate: number,
  isRotating: boolean = false
): ShiftSchedule {
  const shiftType = determineShiftType(startTime, endTime);
  const dayType = determineDayType(date);
  const hoursWorked = calculateHoursWorked(startTime, endTime);

  // Basis betaling
  const basePayment = new Decimal(hourlyRate).mul(hoursWorked);

  // Skifttillæg
  const shiftSupplementPercent = getShiftSupplementPercent(shiftType, isRotating);
  const shiftSupplement = basePayment.mul(shiftSupplementPercent).div(100);

  // Weekend tillæg
  const weekendSupplementPercent = getWeekendSupplementPercent(dayType);
  const weekendSupplement = basePayment.mul(weekendSupplementPercent).div(100);

  // Total betaling
  const totalPayment = basePayment.add(shiftSupplement).add(weekendSupplement);

  logger.info('Calculated shift payment', {
    employeeId: employee.id,
    date,
    shiftType,
    dayType,
    hoursWorked,
    totalPayment: totalPayment.toNumber(),
  });

  return {
    employeeId: employee.id,
    date,
    shiftType,
    startTime,
    endTime,
    dayType,
    hoursWorked,
    basePayment,
    shiftSupplement,
    weekendSupplement,
    totalPayment,
    isRotating,
  };
}

/**
 * Validerer skiftrotation
 */
export function validateShiftRotation(shifts: ShiftSchedule[]): ShiftValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (shifts.length === 0) {
    errors.push('Ingen skift angivet for validering');
    return { isValid: false, errors, warnings };
  }

  // Sort shifts by date
  const sortedShifts = [...shifts].sort((a, b) => a.date.getTime() - b.date.getTime());

  let consecutiveNightShifts = 0;
  let consecutiveShifts = 0;
  let lastShiftEnd: Date | null = null;

  for (let i = 0; i < sortedShifts.length; i++) {
    const shift = sortedShifts[i];

    // Check consecutive night shifts
    if (shift.shiftType === ShiftType.NIGHT) {
      consecutiveNightShifts++;
      if (consecutiveNightShifts > SHIFT_WORK_RULES.ROTATION.MAX_CONSECUTIVE_NIGHT_SHIFTS) {
        errors.push(
          `Mere end ${SHIFT_WORK_RULES.ROTATION.MAX_CONSECUTIVE_NIGHT_SHIFTS} nattevagter i træk (${shift.date.toISOString().split('T')[0]})`
        );
      }
    } else {
      consecutiveNightShifts = 0;
    }

    // Check consecutive shifts
    consecutiveShifts++;
    if (consecutiveShifts > SHIFT_WORK_RULES.ROTATION.MAX_CONSECUTIVE_SHIFTS) {
      warnings.push(
        `Mere end ${SHIFT_WORK_RULES.ROTATION.MAX_CONSECUTIVE_SHIFTS} skift i træk (${shift.date.toISOString().split('T')[0]})`
      );
    }

    // Check rest period between shifts
    if (lastShiftEnd) {
      const restHours = calculateHoursWorked(lastShiftEnd, shift.startTime);
      if (restHours < SHIFT_WORK_RULES.ROTATION.MINIMUM_REST_HOURS) {
        errors.push(
          `Utilstrækkelig hviletid mellem skift (${restHours.toFixed(1)} timer, minimum ${SHIFT_WORK_RULES.ROTATION.MINIMUM_REST_HOURS})`
        );
      }
    }

    lastShiftEnd = shift.endTime;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Opretter rotationsmønster
 */
export function createRotationPattern(
  employeeId: string,
  startDate: Date,
  pattern: ShiftType[],
  cycleWeeks: number = SHIFT_WORK_RULES.STANDARD_ROTATION_WEEKS
): RotationPattern {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + cycleWeeks * 7);

  // Count night and weekend shifts
  let nightShiftsCount = 0;
  let weekendShiftsCount = 0;

  for (const shiftType of pattern) {
    if (shiftType === ShiftType.NIGHT) {
      nightShiftsCount++;
    }
  }

  // Check if pattern is balanced (simplified)
  const isBalanced = nightShiftsCount <= SHIFT_WORK_RULES.ROTATION.MAX_CONSECUTIVE_NIGHT_SHIFTS;

  return {
    employeeId,
    startDate,
    endDate,
    pattern,
    cycleWeeks,
    nightShiftsCount,
    weekendShiftsCount,
    isBalanced,
  };
}

/**
 * Beregner erstatningsfridage
 */
export function calculateCompensationDays(
  employeeId: string,
  year: number,
  monthsWorked: number,
  weekendShiftsWorked: number
): CompensationDaysBalance {
  // Base accrual
  const accruedDays = new Decimal(SHIFT_WORK_RULES.COMPENSATION_DAYS.ACCRUAL_PER_MONTH).mul(
    monthsWorked
  );

  // Extra compensation for weekend work
  const extraCompensation = new Decimal(
    SHIFT_WORK_RULES.COMPENSATION_DAYS.WEEKEND_WORK_COMPENSATION
  ).mul(weekendShiftsWorked);

  const totalAccrued = accruedDays.add(extraCompensation);

  return {
    employeeId,
    year,
    accruedDays: totalAccrued,
    usedDays: new Decimal(0), // Should be tracked separately
    remainingDays: totalAccrued,
    weekendShiftsWorked,
    extraCompensation,
  };
}

/**
 * Beregner total månedlig indtjening fra skiftarbejde
 */
export function calculateMonthlyShiftEarnings(shifts: ShiftSchedule[]): {
  totalShifts: number;
  totalHours: Decimal;
  totalBasePayment: Decimal;
  totalShiftSupplements: Decimal;
  totalWeekendSupplements: Decimal;
  totalEarnings: Decimal;
  nightShifts: number;
  weekendShifts: number;
  averagePerShift: Decimal;
  averagePerHour: Decimal;
} {
  const totalShifts = shifts.length;
  let totalHours = new Decimal(0);
  let totalBasePayment = new Decimal(0);
  let totalShiftSupplements = new Decimal(0);
  let totalWeekendSupplements = new Decimal(0);
  let nightShifts = 0;
  let weekendShifts = 0;

  for (const shift of shifts) {
    totalHours = totalHours.add(shift.hoursWorked);
    totalBasePayment = totalBasePayment.add(shift.basePayment);
    totalShiftSupplements = totalShiftSupplements.add(shift.shiftSupplement);
    totalWeekendSupplements = totalWeekendSupplements.add(shift.weekendSupplement);

    if (shift.shiftType === ShiftType.NIGHT) {
      nightShifts++;
    }

    if (shift.dayType === DayType.SATURDAY || shift.dayType === DayType.SUNDAY) {
      weekendShifts++;
    }
  }

  const totalEarnings = totalBasePayment.add(totalShiftSupplements).add(totalWeekendSupplements);

  const averagePerShift = totalShifts > 0 ? totalEarnings.div(totalShifts) : new Decimal(0);
  const averagePerHour = totalHours.gt(0) ? totalEarnings.div(totalHours) : new Decimal(0);

  return {
    totalShifts,
    totalHours,
    totalBasePayment,
    totalShiftSupplements,
    totalWeekendSupplements,
    totalEarnings,
    nightShifts,
    weekendShifts,
    averagePerShift,
    averagePerHour,
  };
}

/**
 * Formaterer skifttype
 */
export function formatShiftType(type: ShiftType): string {
  switch (type) {
    case ShiftType.MORNING:
      return 'Dagvagt (06:00-14:00)';
    case ShiftType.AFTERNOON:
      return 'Eftermiddagsvagt (14:00-22:00)';
    case ShiftType.NIGHT:
      return 'Nattevagt (22:00-06:00)';
    case ShiftType.ROTATING:
      return 'Roterende skift';
    case ShiftType.DAY:
      return 'Normal dagvagt';
    default:
      return 'Ukendt skifttype';
  }
}

/**
 * Formaterer dagtype
 */
export function formatDayType(type: DayType): string {
  switch (type) {
    case DayType.WEEKDAY:
      return 'Hverdag';
    case DayType.SATURDAY:
      return 'Lørdag';
    case DayType.SUNDAY:
      return 'Søndag';
    case DayType.BANK_HOLIDAY:
      return 'Helligdag';
    default:
      return 'Ukendt dagtype';
  }
}

/**
 * Analyserer skiftfordeling for retfærdighed
 */
export function analyzeShiftDistribution(
  shifts: ShiftSchedule[]
): {
  totalShifts: number;
  nightShiftPercentage: number;
  weekendShiftPercentage: number;
  isBalanced: boolean;
  recommendations: string[];
} {
  const total = shifts.length;
  let nightCount = 0;
  let weekendCount = 0;

  for (const shift of shifts) {
    if (shift.shiftType === ShiftType.NIGHT) nightCount++;
    if (shift.dayType === DayType.SATURDAY || shift.dayType === DayType.SUNDAY) weekendCount++;
  }

  const nightPercentage = total > 0 ? (nightCount / total) * 100 : 0;
  const weekendPercentage = total > 0 ? (weekendCount / total) * 100 : 0;

  const recommendations: string[] = [];

  // Fair distribution guidelines
  if (nightPercentage > 40) {
    recommendations.push('For mange nattevagter - overvej mere balanceret fordeling');
  }

  if (weekendPercentage > 30) {
    recommendations.push('For mange weekendvagter - sikr fair rotation');
  }

  if (nightPercentage < 10 && total > 20) {
    recommendations.push('Meget få nattevagter - verificer skiftplan');
  }

  const isBalanced =
    nightPercentage <= 40 && weekendPercentage <= 30 && recommendations.length === 0;

  return {
    totalShifts: total,
    nightShiftPercentage: nightPercentage,
    weekendShiftPercentage: weekendPercentage,
    isBalanced,
    recommendations,
  };
}
