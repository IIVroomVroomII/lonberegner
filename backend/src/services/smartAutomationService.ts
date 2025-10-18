/**
 * Smart Automatisering Service
 *
 * Automatisk detektion og håndtering af:
 * - Helligdage (danske helligdage)
 * - Natarbejde (18:00-06:00)
 * - Geografisk detektion (København vs. Provinsen)
 * - Weekend arbejde
 * - Forskudt arbejdstid
 * - Overarbejde
 * - Pauser og hviletid
 *
 * Dette er et intelligens-lag der analyserer tidsregistreringer
 * og automatisk anvender korrekte overenskomstregler
 */

import { TimeEntry, Employee } from '@prisma/client';
import { logger } from '../config/logger';
import { isHoliday, isWeekend, calculateWeekendHolidayAllowance } from './freedomDaysService';
import { isNightWork, calculateNightHours, validateBreakRequirements } from './workingHoursService';
import { calculateAllowances } from './allowanceCalculationService';

export interface SmartAnalysis {
  // Tidspunkt klassifikation
  isNightWork: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;

  // Timer beregninger
  totalHours: number;
  nightHours: number;
  regularHours: number;
  overtimeHours: number;

  // Geografisk
  isCopenhagenArea: boolean;
  postalCode?: string;

  // Tillæg
  allowances: {
    driverAllowance: number;
    warehouseAllowance: number;
    nightAllowance: number;
    weekendAllowance: number;
    holidayAllowance: number;
  };

  // Valideringer
  breakValidation: {
    isValid: boolean;
    requiredBreakMinutes: number;
    actualBreakMinutes: number;
    warning?: string;
  };

  // Anbefalinger
  recommendations: string[];
  warnings: string[];
}

/**
 * Analyserer en tidsregistrering og returnerer smart analyse
 */
export async function analyzeTimeEntry(
  timeEntry: TimeEntry,
  employee: Employee
): Promise<SmartAnalysis> {
  const recommendations: string[] = [];
  const warnings: string[] = [];

  // 1. Tidspunkt klassifikation
  const startTime = new Date(timeEntry.startTime);
  const endTime = timeEntry.endTime ? new Date(timeEntry.endTime) : new Date();

  const nightWorkCheck = isNightWork(startTime, endTime);
  const weekendCheck = isWeekend(startTime);
  const holidayCheck = isHoliday(startTime);

  // 2. Timer beregninger
  const totalMinutes = timeEntry.endTime
    ? (endTime.getTime() - startTime.getTime()) / (1000 * 60) - timeEntry.breakDuration
    : 0;
  const totalHours = totalMinutes / 60;

  const nightHours = nightWorkCheck ? calculateNightHours(startTime, endTime) : 0;
  const regularHours = totalHours - nightHours;

  // Simpel overarbejde beregning (kan raffineres)
  const standardDailyHours = 7.4;
  const overtimeHours = Math.max(0, totalHours - standardDailyHours);

  // 3. Geografisk detektion
  const isCopenhagenArea = isCopenhagenPostalCode(employee.postalCode);

  // 4. Tillæg beregninger
  const employeeAllowances = calculateAllowances(employee);

  // Weekend/helligdagstillæg
  const weekendHolidayAllowance = calculateWeekendHolidayAllowance(
    totalHours,
    Number(employee.baseSalary),
    startTime
  );

  const allowances = {
    driverAllowance: employeeAllowances.driverAllowance * totalHours,
    warehouseAllowance: employeeAllowances.warehouseAllowance * totalHours,
    nightAllowance: nightHours * 18.50, // § 4 stk. 5 - forskudt tid
    weekendAllowance: weekendCheck && !holidayCheck.isHoliday
      ? weekendHolidayAllowance.allowanceAmount
      : 0,
    holidayAllowance: holidayCheck.isHoliday ? weekendHolidayAllowance.allowanceAmount : 0,
  };

  // 5. Pause validering
  const breakValidation = validateBreakRequirements(totalHours, timeEntry.breakDuration);

  if (!breakValidation.isValid) {
    warnings.push(breakValidation.error || 'Utilstrækkelig pause');
  }

  // 6. Intelligente anbefalinger

  // Natarbejde anbefaling
  if (nightWorkCheck && !timeEntry.isNightWork) {
    recommendations.push(
      'Tidsregistreringen indeholder natarbejde (18:00-06:00). Marker som natarbejde for korrekt tillæg.'
    );
  }

  // Weekend anbefaling
  if (weekendCheck && !timeEntry.isWeekend) {
    recommendations.push('Arbejde udført i weekend. Marker som weekendarbejde for korrekt tillæg.');
  }

  // Helligdag anbefaling
  if (holidayCheck.isHoliday && !timeEntry.isHoliday) {
    recommendations.push(
      `Arbejde udført på helligdag (${holidayCheck.holiday?.name}). Marker som helligdag for korrekt tillæg.`
    );
  }

  // Overarbejde anbefaling
  if (overtimeHours > 0) {
    recommendations.push(
      `${overtimeHours.toFixed(1)} timer overarbejde detekteret. Overvej afspadsering eller overarbejdsbetaling.`
    );
  }

  // Lange arbejdsdage
  if (totalHours > 12) {
    warnings.push(
      `Meget lang arbejdsdag (${totalHours.toFixed(1)} timer). Vær opmærksom på arbejdsmiljøloven og hviletidskrav.`
    );
  }

  // Manglende pause
  if (!breakValidation.isValid) {
    recommendations.push(
      `Tilføj ${breakValidation.requiredBreakMinutes - timeEntry.breakDuration} minutter pause for at overholde krav.`
    );
  }

  logger.debug('Smart analysis completed', {
    timeEntryId: timeEntry.id,
    employeeId: employee.id,
    isNightWork: nightWorkCheck,
    isWeekend: weekendCheck,
    isHoliday: holidayCheck.isHoliday,
    totalHours,
    nightHours,
    overtimeHours,
    recommendationsCount: recommendations.length,
    warningsCount: warnings.length,
  });

  return {
    isNightWork: nightWorkCheck,
    isWeekend: weekendCheck,
    isHoliday: holidayCheck.isHoliday,
    holidayName: holidayCheck.holiday?.name,
    totalHours,
    nightHours,
    regularHours,
    overtimeHours,
    isCopenhagenArea,
    postalCode: employee.postalCode || undefined,
    allowances,
    breakValidation: {
      isValid: breakValidation.isValid,
      requiredBreakMinutes: breakValidation.requiredBreakMinutes,
      actualBreakMinutes: timeEntry.breakDuration,
      warning: breakValidation.error,
    },
    recommendations,
    warnings,
  };
}

/**
 * Auto-opdaterer tidsregistrering med detekterede værdier
 */
export async function autoEnrichTimeEntry(
  timeEntry: TimeEntry,
  employee: Employee
): Promise<Partial<TimeEntry>> {
  const analysis = await analyzeTimeEntry(timeEntry, employee);

  const updates: Partial<TimeEntry> = {};

  // Auto-marker natarbejde
  if (analysis.isNightWork && !timeEntry.isNightWork) {
    updates.isNightWork = true;
  }

  // Auto-marker weekend
  if (analysis.isWeekend && !timeEntry.isWeekend) {
    updates.isWeekend = true;
  }

  // Auto-marker helligdag
  if (analysis.isHoliday && !timeEntry.isHoliday) {
    updates.isHoliday = true;
  }

  // Auto-marker irregulære timer
  if (
    (analysis.isNightWork || analysis.isWeekend || analysis.isHoliday) &&
    !timeEntry.isIrregularHours
  ) {
    updates.isIrregularHours = true;
  }

  logger.info('Auto-enriched time entry', {
    timeEntryId: timeEntry.id,
    updates,
  });

  return updates;
}

/**
 * Batch analyserer multiple tidsregistreringer
 */
export async function batchAnalyzeTimeEntries(
  timeEntries: TimeEntry[],
  employee: Employee
): Promise<{
  analyses: SmartAnalysis[];
  summary: {
    totalNightHours: number;
    totalWeekendHours: number;
    totalHolidayHours: number;
    totalOvertimeHours: number;
    totalAllowances: number;
    validationIssues: number;
  };
}> {
  const analyses: SmartAnalysis[] = [];

  let totalNightHours = 0;
  let totalWeekendHours = 0;
  let totalHolidayHours = 0;
  let totalOvertimeHours = 0;
  let totalAllowances = 0;
  let validationIssues = 0;

  for (const entry of timeEntries) {
    const analysis = await analyzeTimeEntry(entry, employee);
    analyses.push(analysis);

    totalNightHours += analysis.nightHours;
    if (analysis.isWeekend) totalWeekendHours += analysis.totalHours;
    if (analysis.isHoliday) totalHolidayHours += analysis.totalHours;
    totalOvertimeHours += analysis.overtimeHours;

    totalAllowances +=
      analysis.allowances.driverAllowance +
      analysis.allowances.warehouseAllowance +
      analysis.allowances.nightAllowance +
      analysis.allowances.weekendAllowance +
      analysis.allowances.holidayAllowance;

    if (!analysis.breakValidation.isValid || analysis.warnings.length > 0) {
      validationIssues++;
    }
  }

  return {
    analyses,
    summary: {
      totalNightHours,
      totalWeekendHours,
      totalHolidayHours,
      totalOvertimeHours,
      totalAllowances,
      validationIssues,
    },
  };
}

/**
 * Checker om et postnummer er i København området
 */
function isCopenhagenPostalCode(postalCode: string | null): boolean {
  if (!postalCode) return false;

  const cleanCode = postalCode.trim().replace(/\s/g, '');
  const code = parseInt(cleanCode);

  // København og Frederiksberg: 1000-1999
  if (code >= 1000 && code <= 1999) return true;

  // Storkøbenhavn: 2000-2990
  if (code >= 2000 && code <= 2990) return true;

  return false;
}

/**
 * Foreslår optimal arbejdstidsfordeling baseret på regler
 */
export function suggestOptimalSchedule(
  weeklyHours: number,
  workDays: number = 5
): {
  dailyHours: number;
  remainingHours: number;
  suggestions: string[];
} {
  const dailyHours = Math.floor((weeklyHours / workDays) * 10) / 10;
  const remainingHours = weeklyHours - dailyHours * workDays;

  const suggestions: string[] = [];

  if (dailyHours > 8) {
    suggestions.push(
      `Daglig arbejdstid på ${dailyHours} timer overstiger 8 timer. Overvej at fordele timerne over flere dage.`
    );
  }

  if (dailyHours < 6) {
    suggestions.push(
      `Daglig arbejdstid på ${dailyHours} timer er lav. Overvej at konsolidere arbejdstiden.`
    );
  }

  if (remainingHours > 0) {
    suggestions.push(
      `${remainingHours.toFixed(1)} timer resterende. Disse kan fordeles jævnt eller lægges til én dag.`
    );
  }

  return {
    dailyHours,
    remainingHours,
    suggestions,
  };
}

/**
 * Detekterer potentielle fejl i tidsregistreringer
 */
export function detectTimeEntryAnomalies(timeEntry: TimeEntry): {
  hasAnomalies: boolean;
  anomalies: Array<{
    type: 'MISSING_BREAK' | 'EXCESSIVE_HOURS' | 'NEGATIVE_BREAK' | 'WEEKEND_MISSING_FLAG' | 'NIGHT_MISSING_FLAG';
    severity: 'ERROR' | 'WARNING';
    message: string;
  }>;
} {
  const anomalies: Array<{
    type: 'MISSING_BREAK' | 'EXCESSIVE_HOURS' | 'NEGATIVE_BREAK' | 'WEEKEND_MISSING_FLAG' | 'NIGHT_MISSING_FLAG';
    severity: 'ERROR' | 'WARNING';
    message: string;
  }> = [];

  // 1. Negativ pause
  if (timeEntry.breakDuration < 0) {
    anomalies.push({
      type: 'NEGATIVE_BREAK',
      severity: 'ERROR',
      message: 'Pause kan ikke være negativ',
    });
  }

  // 2. Ekstremt lange arbejdsdage
  if (timeEntry.endTime) {
    const start = new Date(timeEntry.startTime);
    const end = new Date(timeEntry.endTime);
    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const hours = totalMinutes / 60;

    if (hours > 16) {
      anomalies.push({
        type: 'EXCESSIVE_HOURS',
        severity: 'ERROR',
        message: `Arbejdstid på ${hours.toFixed(1)} timer overstiger 16 timer. Tjek for fejl.`,
      });
    } else if (hours > 12) {
      anomalies.push({
        type: 'EXCESSIVE_HOURS',
        severity: 'WARNING',
        message: `Arbejdstid på ${hours.toFixed(1)} timer er meget høj. Vær opmærksom på hviletidskrav.`,
      });
    }
  }

  // 3. Manglende weekend flag
  const startTime = new Date(timeEntry.startTime);
  if (isWeekend(startTime) && !timeEntry.isWeekend) {
    anomalies.push({
      type: 'WEEKEND_MISSING_FLAG',
      severity: 'WARNING',
      message: 'Arbejde udført i weekend men ikke markeret som weekend',
    });
  }

  // 4. Manglende natarbejde flag
  if (timeEntry.endTime) {
    const endTime = new Date(timeEntry.endTime);
    if (isNightWork(startTime, endTime) && !timeEntry.isNightWork) {
      anomalies.push({
        type: 'NIGHT_MISSING_FLAG',
        severity: 'WARNING',
        message: 'Natarbejde detekteret men ikke markeret',
      });
    }
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
  };
}
