/**
 * § 14 Sygeløn - Sickness Pay Service
 *
 * Håndterer:
 * - Sygeløn i op til 11 uger (fra 1.5.2025)
 * - Karensdag regler
 * - Fuld løn ved sygdom
 * - Pension under sygdom
 * - Feriepenge af sygeløn
 * - Langvarig sygdom
 * - Dokumentationskrav
 * - Integration med offentlig sygedagpenge
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 14
 */

import prisma from '../config/database';
import { Employee, AbsenceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateEffectiveHourlyWage } from './allowanceCalculationService';

// § 14 Sygeløn regler
export const SICKNESS_PAY_RULES = {
  // Varighed af sygeløn
  DURATION: {
    WEEKS_BEFORE_2025_05_01: 9, // 9 uger før 1.5.2025
    WEEKS_FROM_2025_05_01: 11, // 11 uger fra 1.5.2025
    CHANGE_DATE: new Date('2025-05-01'),
  },

  // Karensdag
  WAITING_DAY: {
    HAS_WAITING_DAY: false, // Ingen karensdag i transport overenskomst
    DAYS: 0,
  },

  // Lønprocent
  PAY_PERCENTAGE: {
    FULL_PAY: 100, // Fuld løn under sygdom
  },

  // Pension under sygdom
  PENSION: {
    EMPLOYER_CONTRIBUTION: true, // Arbejdsgiver fortsætter pension
    PERCENTAGE: 11, // 11% arbejdsgiver bidrag
  },

  // Feriepenge
  VACATION_PAY: {
    ACCRUAL: true, // Optjener feriepenge under sygdom
    PERCENTAGE: 12.5, // 12,5% feriepenge
  },

  // Dokumentation
  DOCUMENTATION: {
    SELF_CERTIFICATION_DAYS: 3, // Egen tro og love i 3 dage
    DOCTOR_NOTE_REQUIRED_AFTER_DAYS: 3, // Lægeerklæring efter 3 dage
  },

  // Graviditet
  PREGNANCY_RELATED: {
    COVERED: true, // Graviditetsrelateret sygdom er dækket
  },
};

export interface SicknessPayCalculation {
  startDate: Date;
  endDate: Date | null;
  daysCount: number;
  weeksCount: number;
  remainingWeeks: number;
  dailyPay: number;
  totalPay: number;
  pensionContribution: number;
  vacationPay: number;
  requiresDoctorNote: boolean;
  hasExceededMaxDuration: boolean;
  effectiveDate: Date; // Hvilken dato gælder (9 eller 11 uger)
  maxWeeks: number;
}

export interface SicknessHistory {
  employeeId: string;
  totalSicknessDays: number;
  totalSicknessWeeks: number;
  currentSicknessStreak: number; // Nuværende sygeperiode i dage
  sicknessPeriodsThisYear: number;
  averageDaysPerPeriod: number;
  longestPeriod: number; // Længste sygeperiode i dage
}

/**
 * Beregner sygeløn for en periode
 */
export async function calculateSicknessPay(
  employee: Employee,
  startDate: Date,
  endDate: Date | null = null,
  isPregnancyRelated: boolean = false
): Promise<SicknessPayCalculation> {
  // Bestem hvor mange ugers sygeløn medarbejderen har ret til
  const maxWeeks = getMaxSicknessWeeks(startDate);

  // Beregn antal dage og uger
  const actualEndDate = endDate || new Date();
  const daysCount = calculateWorkDays(startDate, actualEndDate);
  const weeksCount = Math.floor(daysCount / 5); // 5 arbejdsdage per uge

  // Check om grænsen er overskredet
  const hasExceededMaxDuration = weeksCount > maxWeeks;

  // Beregn daglig løn (inkl. tillæg)
  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4; // Standard daglig arbejdstid
  const dailyPay = effectiveHourlyWage * dailyHours;

  // Total sygeløn (fuld løn)
  const payableDays = hasExceededMaxDuration ? maxWeeks * 5 : daysCount;
  const totalPay = dailyPay * payableDays;

  // Pension (11% arbejdsgiver bidrag)
  const pensionContribution = (totalPay * SICKNESS_PAY_RULES.PENSION.PERCENTAGE) / 100;

  // Feriepenge (12,5%)
  const vacationPay = (totalPay * SICKNESS_PAY_RULES.VACATION_PAY.PERCENTAGE) / 100;

  // Kræver lægeerklæring?
  const requiresDoctorNote = daysCount > SICKNESS_PAY_RULES.DOCUMENTATION.SELF_CERTIFICATION_DAYS;

  // Resterende uger
  const remainingWeeks = Math.max(0, maxWeeks - weeksCount);

  logger.info('Calculated sickness pay', {
    employeeId: employee.id,
    startDate,
    endDate: actualEndDate,
    daysCount,
    weeksCount,
    maxWeeks,
    hasExceededMaxDuration,
    dailyPay,
    totalPay,
    pensionContribution,
    vacationPay,
  });

  return {
    startDate,
    endDate,
    daysCount,
    weeksCount,
    remainingWeeks,
    dailyPay,
    totalPay,
    pensionContribution,
    vacationPay,
    requiresDoctorNote,
    hasExceededMaxDuration,
    effectiveDate: startDate,
    maxWeeks,
  };
}

/**
 * Registrerer sygdomsfravær
 */
export async function registerSickness(
  employeeId: string,
  startDate: Date,
  endDate: Date | null = null,
  note?: string,
  isPregnancyRelated: boolean = false
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  // Beregn sygeløn
  const sicknessCalc = await calculateSicknessPay(employee, startDate, endDate, isPregnancyRelated);

  if (sicknessCalc.hasExceededMaxDuration) {
    logger.warn('Sickness period exceeds maximum duration', {
      employeeId,
      weeksCount: sicknessCalc.weeksCount,
      maxWeeks: sicknessCalc.maxWeeks,
    });
  }

  // Opret fraværsregistrering
  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: AbsenceType.SICKNESS,
      startDate,
      endDate,
      daysCount: sicknessCalc.daysCount,
      isPaid: !sicknessCalc.hasExceededMaxDuration, // Betalt hvis indenfor grænse
      paymentAmount: new Decimal(sicknessCalc.totalPay),
      note: note || `Sygdom (${sicknessCalc.daysCount} dage, ${sicknessCalc.weeksCount} uger)`,
    },
  });

  logger.info('Registered sickness absence', {
    absenceId: absence.id,
    employeeId,
    startDate,
    endDate,
    daysCount: sicknessCalc.daysCount,
    totalPay: sicknessCalc.totalPay,
  });

  return absence.id;
}

/**
 * Henter sygehistorik for medarbejder
 */
export async function getSicknessHistory(
  employeeId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<SicknessHistory> {
  const whereClause: any = {
    employeeId,
    type: AbsenceType.SICKNESS,
  };

  if (fromDate || toDate) {
    whereClause.startDate = {};
    if (fromDate) whereClause.startDate.gte = fromDate;
    if (toDate) whereClause.startDate.lte = toDate;
  }

  const absences = await prisma.absenceEntry.findMany({
    where: whereClause,
    orderBy: { startDate: 'desc' },
  });

  let totalSicknessDays = 0;
  let longestPeriod = 0;
  let currentStreak = 0;

  // Beregn nuværende streak (hvis stadig syg)
  const now = new Date();
  const currentSickness = absences.find(
    (a) => a.startDate <= now && (!a.endDate || a.endDate >= now)
  );
  if (currentSickness) {
    currentStreak = currentSickness.daysCount;
  }

  // Beregn total og længste periode
  for (const absence of absences) {
    totalSicknessDays += absence.daysCount;
    if (absence.daysCount > longestPeriod) {
      longestPeriod = absence.daysCount;
    }
  }

  const totalSicknessWeeks = Math.floor(totalSicknessDays / 5);
  const sicknessPeriodsThisYear = absences.length;
  const averageDaysPerPeriod =
    sicknessPeriodsThisYear > 0 ? totalSicknessDays / sicknessPeriodsThisYear : 0;

  return {
    employeeId,
    totalSicknessDays,
    totalSicknessWeeks,
    currentSicknessStreak: currentStreak,
    sicknessPeriodsThisYear,
    averageDaysPerPeriod,
    longestPeriod,
  };
}

/**
 * Checker om medarbejder har overskredet maksimal sygeperiode
 */
export async function checkMaxSicknessDuration(
  employeeId: string,
  currentStartDate: Date
): Promise<{
  hasExceeded: boolean;
  weeksUsed: number;
  weeksRemaining: number;
  maxWeeks: number;
  warning?: string;
}> {
  const maxWeeks = getMaxSicknessWeeks(currentStartDate);

  // Find alle sygeperioder i de sidste 12 måneder
  const twelveMonthsAgo = new Date(currentStartDate);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const history = await getSicknessHistory(employeeId, twelveMonthsAgo, currentStartDate);
  const weeksUsed = history.totalSicknessWeeks;
  const weeksRemaining = Math.max(0, maxWeeks - weeksUsed);
  const hasExceeded = weeksUsed > maxWeeks;

  let warning;
  if (hasExceeded) {
    warning = `Medarbejder har overskredet maksimal sygelønsperiode (${weeksUsed} uger brugt af ${maxWeeks} uger). Kontakt kommunen om sygedagpenge.`;
  } else if (weeksRemaining <= 2) {
    warning = `Kun ${weeksRemaining} uger sygeløn tilbage. Planlæg transition til sygedagpenge.`;
  }

  return {
    hasExceeded,
    weeksUsed,
    weeksRemaining,
    maxWeeks,
    warning,
  };
}

/**
 * Validerer dokumentationskrav
 */
export function validateDocumentation(daysCount: number): {
  requiresSelfCertification: boolean;
  requiresDoctorNote: boolean;
  message: string;
} {
  const selfCertDays = SICKNESS_PAY_RULES.DOCUMENTATION.SELF_CERTIFICATION_DAYS;
  const requiresSelfCertification = daysCount <= selfCertDays;
  const requiresDoctorNote = daysCount > selfCertDays;

  let message = '';
  if (requiresSelfCertification) {
    message = `Egen tro og love er tilstrækkeligt (${daysCount} dage ≤ ${selfCertDays} dage)`;
  } else {
    message = `Lægeerklæring påkrævet (${daysCount} dage > ${selfCertDays} dage)`;
  }

  return {
    requiresSelfCertification,
    requiresDoctorNote,
    message,
  };
}

/**
 * Beregner arbejdsdage mellem to datoer (ekskl. weekends)
 */
function calculateWorkDays(startDate: Date, endDate: Date): number {
  let workDays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Tæl kun hverdage (mandag-fredag)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workDays;
}

/**
 * Bestem maksimalt antal ugers sygeløn baseret på dato
 */
function getMaxSicknessWeeks(date: Date): number {
  const changeDate = SICKNESS_PAY_RULES.DURATION.CHANGE_DATE;

  if (date >= changeDate) {
    return SICKNESS_PAY_RULES.DURATION.WEEKS_FROM_2025_05_01; // 11 uger
  } else {
    return SICKNESS_PAY_RULES.DURATION.WEEKS_BEFORE_2025_05_01; // 9 uger
  }
}

/**
 * Afslutter sygeperiode
 */
export async function endSicknessPeriod(
  absenceId: string,
  endDate: Date
): Promise<void> {
  const absence = await prisma.absenceEntry.findUnique({
    where: { id: absenceId },
  });

  if (!absence) {
    throw new Error('Fraværsregistrering ikke fundet');
  }

  if (absence.type !== AbsenceType.SICKNESS) {
    throw new Error('Dette er ikke en sygeregistrering');
  }

  // Beregn nye dage
  const daysCount = calculateWorkDays(absence.startDate, endDate);

  // Genberegn løn
  const employee = await prisma.employee.findUnique({
    where: { id: absence.employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const sicknessCalc = await calculateSicknessPay(employee, absence.startDate, endDate);

  // Opdater fraværsregistrering
  await prisma.absenceEntry.update({
    where: { id: absenceId },
    data: {
      endDate,
      daysCount,
      paymentAmount: new Decimal(sicknessCalc.totalPay),
      isPaid: !sicknessCalc.hasExceededMaxDuration,
    },
  });

  logger.info('Ended sickness period', {
    absenceId,
    employeeId: absence.employeeId,
    startDate: absence.startDate,
    endDate,
    daysCount,
    totalPay: sicknessCalc.totalPay,
  });
}

/**
 * Genererer sygelønsrapport for medarbejder
 */
export async function generateSicknessReport(
  employeeId: string,
  year: number
): Promise<{
  employeeId: string;
  year: number;
  totalSickDays: number;
  totalSickWeeks: number;
  sicknessPercentage: number; // % af arbejdsdage
  totalSicknessPay: number;
  periods: Array<{
    startDate: Date;
    endDate: Date | null;
    days: number;
    weeks: number;
    pay: number;
  }>;
}> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const history = await getSicknessHistory(employeeId, yearStart, yearEnd);

  const absences = await prisma.absenceEntry.findMany({
    where: {
      employeeId,
      type: AbsenceType.SICKNESS,
      startDate: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    orderBy: { startDate: 'asc' },
  });

  let totalSicknessPay = 0;
  const periods = absences.map((a) => {
    const pay = Number(a.paymentAmount || 0);
    totalSicknessPay += pay;

    return {
      startDate: a.startDate,
      endDate: a.endDate,
      days: a.daysCount,
      weeks: Math.floor(a.daysCount / 5),
      pay,
    };
  });

  // Beregn sygdomsprocent (antag 260 arbejdsdage/år)
  const totalWorkDaysInYear = 260;
  const sicknessPercentage = (history.totalSicknessDays / totalWorkDaysInYear) * 100;

  return {
    employeeId,
    year,
    totalSickDays: history.totalSicknessDays,
    totalSickWeeks: history.totalSicknessWeeks,
    sicknessPercentage,
    totalSicknessPay,
    periods,
  };
}
