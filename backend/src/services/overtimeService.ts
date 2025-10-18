/**
 * § 7 Overarbejde - Overtime Service
 *
 * Håndterer:
 * - "Timen før" (the hour before normal start)
 * - Regular overtime calculation
 * - Different rules for hourly vs. salaried employees
 * - Overtime rate progression (1-3 hours, 4+ hours)
 * - Weekend and holiday overtime
 * - Time-off in lieu vs. payment options
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 7
 */

import { Employee, WorkTimeType, TimeEntry } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateStandardWeeklyHours } from './workingHoursService';

// § 7 Overarbejde satser
export const OVERTIME_RULES = {
  // Overarbejdssatser (oveni grundlønnen)
  HOURLY_EMPLOYEES: {
    FIRST_3_HOURS: 50.00, // Kr. 50,00/time for første 1-3 timer
    ABOVE_3_HOURS: 75.00, // Kr. 75,00/time for 4+ timer
    HOUR_BEFORE: 60.00, // Kr. 60,00 for "timen før"
  },

  // Fuldlønnede med ikke-fastlagt arbejdstid
  SALARIED_NON_FIXED: {
    THRESHOLD_HOURS_PER_MONTH: 10, // Max 10 timer/måned uden betaling
    HOURLY_RATE_AFTER_THRESHOLD: 200.00, // Kr. 200/time efter 10 timer
  },

  // Weekend og helligdagsoverarbejde
  WEEKEND_HOLIDAY_MULTIPLIER: 1.5, // 150% af normal overarbejdssats

  // Maksimal daglig arbejdstid før særlige regler
  MAX_DAILY_HOURS_NORMAL: 12, // 12 timer/dag før særlige regler træder i kraft

  // Pause mellem vagter
  MINIMUM_REST_HOURS: 11, // Minimum 11 timers hvile mellem vagter
};

export interface OvertimeCalculation {
  regularOvertimeHours: number; // Normal overarbejde
  hourBeforeHours: number; // "Timen før"
  excessiveOvertimeHours: number; // 4+ timer (højere sats)
  weekendOvertimeHours: number;
  holidayOvertimeHours: number;
  totalOvertimeHours: number;
  overtimePay: number;
  hourBeforePay: number;
  canTakeAsTimeOff: boolean;
  breakdown: OvertimeBreakdown[];
}

export interface OvertimeBreakdown {
  type: 'REGULAR' | 'EXCESSIVE' | 'HOUR_BEFORE' | 'WEEKEND' | 'HOLIDAY';
  hours: number;
  rate: number;
  amount: number;
  description: string;
  agreementReference: string;
}

export interface SalariedOvertimeCalculation {
  totalExtraHours: number; // Total ekstra timer arbejdet
  monthlyThreshold: number; // Tærskel (typisk 10 timer/måned)
  hoursWithinThreshold: number; // Timer inden for tærskel (ingen betaling)
  hoursAboveThreshold: number; // Timer over tærskel (betales)
  overtimePay: number;
}

/**
 * Beregner overarbejde for timelønnede medarbejdere
 */
export function calculateHourlyOvertime(
  dailyHours: number,
  standardDailyHours: number,
  hasHourBefore: boolean = false,
  isWeekend: boolean = false,
  isHoliday: boolean = false,
  baseHourlyRate: number
): OvertimeCalculation {
  const breakdown: OvertimeBreakdown[] = [];

  let regularOvertimeHours = 0;
  let hourBeforeHours = 0;
  let excessiveOvertimeHours = 0;
  let weekendOvertimeHours = 0;
  let holidayOvertimeHours = 0;

  // "Timen før" - arbejde før normal starttid
  if (hasHourBefore) {
    hourBeforeHours = 1;
    const hourBeforePay = OVERTIME_RULES.HOURLY_EMPLOYEES.HOUR_BEFORE;

    breakdown.push({
      type: 'HOUR_BEFORE',
      hours: 1,
      rate: hourBeforePay,
      amount: hourBeforePay,
      description: 'Timen før (arbejde før normal starttid)',
      agreementReference: '§ 7 stk. 2 - Timen før',
    });
  }

  // Beregn overarbejdstimer
  let overtimeHours = Math.max(0, dailyHours - standardDailyHours);

  if (overtimeHours > 0) {
    // Weekend eller helligdag - højere satser
    const isSpecialDay = isWeekend || isHoliday;
    const multiplier = isSpecialDay ? OVERTIME_RULES.WEEKEND_HOLIDAY_MULTIPLIER : 1;

    if (isWeekend) {
      weekendOvertimeHours = overtimeHours;
    } else if (isHoliday) {
      holidayOvertimeHours = overtimeHours;
    }

    // Første 1-3 timer overarbejde
    const first3Hours = Math.min(overtimeHours, 3);
    regularOvertimeHours = first3Hours;

    const firstRate = OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS * multiplier;
    breakdown.push({
      type: isSpecialDay ? (isWeekend ? 'WEEKEND' : 'HOLIDAY') : 'REGULAR',
      hours: first3Hours,
      rate: firstRate,
      amount: first3Hours * firstRate,
      description: isSpecialDay
        ? `Overarbejde 1-3 timer (${isWeekend ? 'weekend' : 'helligdag'})`
        : 'Overarbejde 1-3 timer',
      agreementReference: '§ 7 stk. 1 - Overarbejde',
    });

    // 4+ timer - højere sats
    if (overtimeHours > 3) {
      const above3Hours = overtimeHours - 3;
      excessiveOvertimeHours = above3Hours;

      const excessiveRate = OVERTIME_RULES.HOURLY_EMPLOYEES.ABOVE_3_HOURS * multiplier;
      breakdown.push({
        type: 'EXCESSIVE',
        hours: above3Hours,
        rate: excessiveRate,
        amount: above3Hours * excessiveRate,
        description: isSpecialDay
          ? `Overarbejde 4+ timer (${isWeekend ? 'weekend' : 'helligdag'})`
          : 'Overarbejde 4+ timer',
        agreementReference: '§ 7 stk. 1 - Overarbejde over 3 timer',
      });
    }
  }

  const totalOvertimeHours = regularOvertimeHours + excessiveOvertimeHours + hourBeforeHours;
  const overtimePay = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const hourBeforePay = hourBeforeHours * OVERTIME_RULES.HOURLY_EMPLOYEES.HOUR_BEFORE;

  // Overarbejde kan altid tages som afspadsering for timelønnede
  const canTakeAsTimeOff = true;

  logger.debug('Calculated hourly overtime', {
    dailyHours,
    standardDailyHours,
    totalOvertimeHours,
    overtimePay,
    hasHourBefore,
    isWeekend,
    isHoliday,
  });

  return {
    regularOvertimeHours,
    hourBeforeHours,
    excessiveOvertimeHours,
    weekendOvertimeHours,
    holidayOvertimeHours,
    totalOvertimeHours,
    overtimePay,
    hourBeforePay,
    canTakeAsTimeOff,
    breakdown,
  };
}

/**
 * Beregner overarbejde for fuldlønnede medarbejdere med ikke-fastlagt arbejdstid
 *
 * § 7 stk. 3: Fuldlønnede med ikke-fastlagt arbejdstid har ret til betaling for
 * timer ud over den gennemsnitlige arbejdstid på 10 timer pr. måned
 */
export function calculateSalariedOvertime(
  monthlyExtraHours: number,
  hourlyRate: number,
  monthlyThreshold: number = OVERTIME_RULES.SALARIED_NON_FIXED.THRESHOLD_HOURS_PER_MONTH
): SalariedOvertimeCalculation {
  const hoursWithinThreshold = Math.min(monthlyExtraHours, monthlyThreshold);
  const hoursAboveThreshold = Math.max(0, monthlyExtraHours - monthlyThreshold);

  // Betaling sker kun for timer over tærsklen
  const overtimePay = hoursAboveThreshold *
    (hourlyRate || OVERTIME_RULES.SALARIED_NON_FIXED.HOURLY_RATE_AFTER_THRESHOLD);

  logger.info('Calculated salaried overtime', {
    monthlyExtraHours,
    monthlyThreshold,
    hoursWithinThreshold,
    hoursAboveThreshold,
    overtimePay,
  });

  return {
    totalExtraHours: monthlyExtraHours,
    monthlyThreshold,
    hoursWithinThreshold,
    hoursAboveThreshold,
    overtimePay,
  };
}

/**
 * Detector "timen før" - arbejde før normal arbejdstid
 */
export function detectHourBefore(
  actualStartTime: Date,
  normalStartTime: Date
): {
  hasHourBefore: boolean;
  minutesBefore: number;
} {
  const actualStart = actualStartTime.getTime();
  const normalStart = normalStartTime.getTime();

  const minutesBefore = Math.max(0, (normalStart - actualStart) / (1000 * 60));

  // "Timen før" gælder hvis der startes mindst 30 minutter før normal start
  const hasHourBefore = minutesBefore >= 30;

  return {
    hasHourBefore,
    minutesBefore,
  };
}

/**
 * Validerer hviletid mellem vagter
 * § 7: Minimum 11 timers hvile mellem vagter
 */
export function validateRestPeriod(
  previousEndTime: Date,
  nextStartTime: Date
): {
  isValid: boolean;
  actualRestHours: number;
  requiredRestHours: number;
  violation?: string;
} {
  const restMillis = nextStartTime.getTime() - previousEndTime.getTime();
  const actualRestHours = restMillis / (1000 * 60 * 60);
  const requiredRestHours = OVERTIME_RULES.MINIMUM_REST_HOURS;

  const isValid = actualRestHours >= requiredRestHours;

  return {
    isValid,
    actualRestHours,
    requiredRestHours,
    violation: isValid
      ? undefined
      : `Utilstrækkelig hviletid mellem vagter. Faktisk: ${actualRestHours.toFixed(1)} timer, påkrævet: ${requiredRestHours} timer`,
  };
}

/**
 * Beregner maksimal tilladt daglig arbejdstid
 */
export function validateDailyWorkHours(
  dailyHours: number
): {
  isValid: boolean;
  maxDailyHours: number;
  warning?: string;
} {
  const maxDailyHours = OVERTIME_RULES.MAX_DAILY_HOURS_NORMAL;
  const isValid = dailyHours <= maxDailyHours;

  return {
    isValid,
    maxDailyHours,
    warning: isValid
      ? undefined
      : `Daglig arbejdstid (${dailyHours} timer) overstiger anbefalet maksimum (${maxDailyHours} timer). Vær opmærksom på arbejdsmiljøloven og hviletidskrav.`,
  };
}

/**
 * Beregner samlet overarbejde for en periode (uge/måned)
 */
export async function calculatePeriodOvertime(
  employee: Employee,
  timeEntries: TimeEntry[],
  normalStartTime?: Date // For detection af "timen før"
): Promise<OvertimeCalculation> {
  let totalRegularOvertime = 0;
  let totalHourBefore = 0;
  let totalExcessiveOvertime = 0;
  let totalWeekendOvertime = 0;
  let totalHolidayOvertime = 0;
  let totalPay = 0;
  const allBreakdown: OvertimeBreakdown[] = [];

  const baseHourlyRate = Number(employee.baseSalary);
  const standardWeeklyHours = calculateStandardWeeklyHours(employee);
  const standardDailyHours = standardWeeklyHours / 5;

  // Grupper entries efter dag
  const entriesByDay = groupEntriesByDay(timeEntries);

  for (const [date, entries] of Object.entries(entriesByDay)) {
    // Beregn daglige timer
    let dailyHours = 0;
    let hasHourBefore = false;
    let isWeekend = false;
    let isHoliday = false;

    for (const entry of entries) {
      if (entry.endTime) {
        const start = new Date(entry.startTime);
        const end = new Date(entry.endTime);
        const minutes = (end.getTime() - start.getTime()) / (1000 * 60) - entry.breakDuration;
        dailyHours += minutes / 60;

        // Check for "timen før"
        if (normalStartTime) {
          const hourBeforeCheck = detectHourBefore(start, normalStartTime);
          if (hourBeforeCheck.hasHourBefore) {
            hasHourBefore = true;
          }
        }

        // Check weekend/holiday
        if (entry.isWeekend) isWeekend = true;
        if (entry.isHoliday) isHoliday = true;
      }
    }

    // Beregn overarbejde for dagen
    if (employee.workTimeType === WorkTimeType.HOURLY ||
        employee.workTimeType === WorkTimeType.SUBSTITUTE) {
      const dayOvertime = calculateHourlyOvertime(
        dailyHours,
        standardDailyHours,
        hasHourBefore,
        isWeekend,
        isHoliday,
        baseHourlyRate
      );

      totalRegularOvertime += dayOvertime.regularOvertimeHours;
      totalHourBefore += dayOvertime.hourBeforeHours;
      totalExcessiveOvertime += dayOvertime.excessiveOvertimeHours;
      totalWeekendOvertime += dayOvertime.weekendOvertimeHours;
      totalHolidayOvertime += dayOvertime.holidayOvertimeHours;
      totalPay += dayOvertime.overtimePay;
      allBreakdown.push(...dayOvertime.breakdown);
    }
  }

  return {
    regularOvertimeHours: totalRegularOvertime,
    hourBeforeHours: totalHourBefore,
    excessiveOvertimeHours: totalExcessiveOvertime,
    weekendOvertimeHours: totalWeekendOvertime,
    holidayOvertimeHours: totalHolidayOvertime,
    totalOvertimeHours: totalRegularOvertime + totalHourBefore + totalExcessiveOvertime,
    overtimePay: totalPay,
    hourBeforePay: totalHourBefore * OVERTIME_RULES.HOURLY_EMPLOYEES.HOUR_BEFORE,
    canTakeAsTimeOff: true,
    breakdown: allBreakdown,
  };
}

/**
 * Hjælpefunktion: Grupperer tidsregistreringer efter dag
 */
function groupEntriesByDay(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce((acc, entry) => {
    const dateKey = entry.date.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);
}
