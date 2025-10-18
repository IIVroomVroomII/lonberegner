/**
 * § 16-17 Børns Sygdom og Hospitalsindlæggelse - Child Care Service
 *
 * Håndterer:
 * - Barnets 1., 2., og 3. sygedag (§ 16 stk. 1)
 * - Lægebesøg med barn (§ 16 stk. 2)
 * - Børneomsorgsdage - 2 dage/år (§ 16 stk. 3)
 * - Børnebørnsomsorgsdage - 2 dage/år (§ 16 stk. 4)
 * - Ledsagelse af nærtstående - 2-7 dage (§ 16 stk. 5)
 * - Børns hospitalsindlæggelse - max 1 uge/12 mdr (§ 17)
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 16-17
 */

import prisma from '../config/database';
import { Employee, AbsenceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateEffectiveHourlyWage } from './allowanceCalculationService';

// § 16-17 Børneomsorg regler
export const CHILD_CARE_RULES = {
  // § 16 stk. 1 - Barnets sygedag
  CHILD_SICK_DAY: {
    FIRST_DAY_PAID: true, // 1. sygedag betalt
    SECOND_DAY_PAID: true, // 2. sygedag betalt
    THIRD_DAY_PAID: true, // 3. sygedag betalt (hvis nødvendigt)
    MAX_DAYS_PER_ILLNESS: 3, // Max 3 dage per sygdomstilfælde
    PAY_PERCENTAGE: 100, // Fuld løn
  },

  // § 16 stk. 2 - Lægebesøg med barn
  DOCTOR_VISIT: {
    PAID: true, // Betalt frihed
    REQUIRES_DOCUMENTATION: true, // Kræver dokumentation
    PAY_PERCENTAGE: 100, // Fuld løn
  },

  // § 16 stk. 3 - Børneomsorgsdage
  CHILD_CARE_DAYS: {
    DAYS_PER_YEAR: 2, // 2 dage per år
    PAID: true, // Betalt
    PAY_PERCENTAGE: 100, // Fuld løn
    PURPOSE: 'Omsorg for barn', // Til omsorg for barn
  },

  // § 16 stk. 4 - Børnebørnsomsorgsdage
  GRANDCHILD_CARE_DAYS: {
    DAYS_PER_YEAR: 2, // 2 dage per år
    PAID: true, // Betalt
    PAY_PERCENTAGE: 100, // Fuld løn
    PURPOSE: 'Omsorg for børnebørn', // Til omsorg for børnebørn
  },

  // § 16 stk. 5 - Ledsagelse af nærtstående
  RELATIVE_ESCORT: {
    MIN_DAYS: 2, // Minimum 2 dage
    MAX_DAYS: 7, // Maximum 7 dage
    PAID: true, // Betalt
    PAY_PERCENTAGE: 100, // Fuld løn
    REQUIRES_DOCUMENTATION: true, // Kræver dokumentation (læge/hospital)
  },

  // § 17 - Børns hospitalsindlæggelse
  CHILD_HOSPITALIZATION: {
    MAX_DAYS_PER_12_MONTHS: 7, // Max 1 uge (7 dage) per 12 måneder
    PAID: true, // Betalt
    PAY_PERCENTAGE: 100, // Fuld løn
    REQUIRES_DOCUMENTATION: true, // Kræver hospitalsbekræftelse
  },
};

export interface ChildCareCalculation {
  careType: AbsenceType;
  date: Date;
  daysCount: number;
  dailyPay: number;
  totalPay: number;
  isPaid: boolean;
  requiresDocumentation: boolean;
  daysUsedThisYear?: number;
  daysRemainingThisYear?: number;
}

export interface ChildCareHistory {
  employeeId: string;
  year: number;
  childSickDaysUsed: number;
  doctorVisitsUsed: number;
  childCareDaysUsed: number;
  childCareDaysRemaining: number;
  grandchildCareDaysUsed: number;
  grandchildCareDaysRemaining: number;
  relativeEscortDaysUsed: number;
  hospitalizationDaysUsed: number;
  hospitalizationDaysRemaining: number;
  totalDaysTaken: number;
}

/**
 * Beregner barnets sygedag (1., 2., eller 3. dag)
 */
export async function calculateChildSickDay(
  employee: Employee,
  date: Date,
  dayNumber: 1 | 2 | 3
): Promise<ChildCareCalculation> {
  if (dayNumber < 1 || dayNumber > 3) {
    throw new Error('Ugyldigt dagnummer. Skal være 1, 2 eller 3.');
  }

  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4;
  const dailyPay = effectiveHourlyWage * dailyHours;

  const isPaid = CHILD_CARE_RULES.CHILD_SICK_DAY.FIRST_DAY_PAID; // Alle 3 dage er betalt

  logger.info('Calculated child sick day', {
    employeeId: employee.id,
    date,
    dayNumber,
    dailyPay,
    isPaid,
  });

  return {
    careType:
      dayNumber === 1
        ? AbsenceType.CHILD_FIRST_SICK_DAY
        : dayNumber === 2
          ? AbsenceType.CHILD_SECOND_SICK_DAY
          : AbsenceType.CHILD_THIRD_SICK_DAY,
    date,
    daysCount: 1,
    dailyPay,
    totalPay: dailyPay,
    isPaid,
    requiresDocumentation: false, // Ingen dokumentation nødvendig for barnets sygedag
  };
}

/**
 * Registrerer barnets sygedag
 */
export async function registerChildSickDay(
  employeeId: string,
  date: Date,
  dayNumber: 1 | 2 | 3,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const calc = await calculateChildSickDay(employee, date, dayNumber);

  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: calc.careType,
      startDate: date,
      endDate: date,
      daysCount: 1,
      isPaid: calc.isPaid,
      paymentAmount: new Decimal(calc.totalPay),
      note: note || `Barnets ${dayNumber}. sygedag`,
    },
  });

  logger.info('Registered child sick day', {
    absenceId: absence.id,
    employeeId,
    date,
    dayNumber,
  });

  return absence.id;
}

/**
 * Beregner lægebesøg med barn
 */
export async function calculateDoctorVisit(
  employee: Employee,
  date: Date
): Promise<ChildCareCalculation> {
  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4;
  const dailyPay = effectiveHourlyWage * dailyHours;

  return {
    careType: AbsenceType.CHILD_DOCTOR_VISIT,
    date,
    daysCount: 1,
    dailyPay,
    totalPay: dailyPay,
    isPaid: CHILD_CARE_RULES.DOCTOR_VISIT.PAID,
    requiresDocumentation: CHILD_CARE_RULES.DOCTOR_VISIT.REQUIRES_DOCUMENTATION,
  };
}

/**
 * Registrerer lægebesøg med barn
 */
export async function registerDoctorVisit(
  employeeId: string,
  date: Date,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const calc = await calculateDoctorVisit(employee, date);

  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: AbsenceType.CHILD_DOCTOR_VISIT,
      startDate: date,
      endDate: date,
      daysCount: 1,
      isPaid: calc.isPaid,
      paymentAmount: new Decimal(calc.totalPay),
      note: note || 'Lægebesøg med barn',
    },
  });

  logger.info('Registered doctor visit with child', {
    absenceId: absence.id,
    employeeId,
    date,
  });

  return absence.id;
}

/**
 * Beregner børneomsorgsdage
 */
export async function calculateChildCareDay(
  employee: Employee,
  date: Date,
  year: number
): Promise<ChildCareCalculation> {
  // Check hvor mange dage allerede brugt dette år
  const history = await getChildCareHistory(employee.id, year);
  const daysUsed = history.childCareDaysUsed;
  const daysRemaining = CHILD_CARE_RULES.CHILD_CARE_DAYS.DAYS_PER_YEAR - daysUsed;

  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4;
  const dailyPay = effectiveHourlyWage * dailyHours;

  return {
    careType: AbsenceType.CHILD_CARE_DAY,
    date,
    daysCount: 1,
    dailyPay,
    totalPay: dailyPay,
    isPaid: CHILD_CARE_RULES.CHILD_CARE_DAYS.PAID,
    requiresDocumentation: false,
    daysUsedThisYear: daysUsed,
    daysRemainingThisYear: daysRemaining,
  };
}

/**
 * Registrerer børneomsorgsdage
 */
export async function registerChildCareDay(
  employeeId: string,
  date: Date,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const year = date.getFullYear();
  const history = await getChildCareHistory(employeeId, year);

  // Check om medarbejderen har dage tilbage
  if (history.childCareDaysRemaining <= 0) {
    throw new Error(
      `Ingen børneomsorgsdage tilbage for ${year}. Allerede brugt ${history.childCareDaysUsed} af ${CHILD_CARE_RULES.CHILD_CARE_DAYS.DAYS_PER_YEAR} dage.`
    );
  }

  const calc = await calculateChildCareDay(employee, date, year);

  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: AbsenceType.CHILD_CARE_DAY,
      startDate: date,
      endDate: date,
      daysCount: 1,
      isPaid: calc.isPaid,
      paymentAmount: new Decimal(calc.totalPay),
      note: note || 'Børneomsorgsdage',
    },
  });

  logger.info('Registered child care day', {
    absenceId: absence.id,
    employeeId,
    date,
    daysRemaining: calc.daysRemainingThisYear,
  });

  return absence.id;
}

/**
 * Beregner børnebørnsomsorgsdage
 */
export async function calculateGrandchildCareDay(
  employee: Employee,
  date: Date,
  year: number
): Promise<ChildCareCalculation> {
  const history = await getChildCareHistory(employee.id, year);
  const daysUsed = history.grandchildCareDaysUsed;
  const daysRemaining = CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.DAYS_PER_YEAR - daysUsed;

  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4;
  const dailyPay = effectiveHourlyWage * dailyHours;

  return {
    careType: AbsenceType.GRANDCHILD_CARE_DAY,
    date,
    daysCount: 1,
    dailyPay,
    totalPay: dailyPay,
    isPaid: CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.PAID,
    requiresDocumentation: false,
    daysUsedThisYear: daysUsed,
    daysRemainingThisYear: daysRemaining,
  };
}

/**
 * Registrerer børnebørnsomsorgsdage
 */
export async function registerGrandchildCareDay(
  employeeId: string,
  date: Date,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const year = date.getFullYear();
  const history = await getChildCareHistory(employeeId, year);

  if (history.grandchildCareDaysRemaining <= 0) {
    throw new Error(
      `Ingen børnebørnsomsorgsdage tilbage for ${year}. Allerede brugt ${history.grandchildCareDaysUsed} af ${CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.DAYS_PER_YEAR} dage.`
    );
  }

  const calc = await calculateGrandchildCareDay(employee, date, year);

  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: AbsenceType.GRANDCHILD_CARE_DAY,
      startDate: date,
      endDate: date,
      daysCount: 1,
      isPaid: calc.isPaid,
      paymentAmount: new Decimal(calc.totalPay),
      note: note || 'Børnebørnsomsorgsdage',
    },
  });

  logger.info('Registered grandchild care day', {
    absenceId: absence.id,
    employeeId,
    date,
  });

  return absence.id;
}

/**
 * Beregner ledsagelse af nærtstående
 */
export async function calculateRelativeEscort(
  employee: Employee,
  startDate: Date,
  endDate: Date
): Promise<ChildCareCalculation> {
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Valider antal dage
  if (daysCount < CHILD_CARE_RULES.RELATIVE_ESCORT.MIN_DAYS) {
    throw new Error(
      `Ledsagelse af nærtstående skal være minimum ${CHILD_CARE_RULES.RELATIVE_ESCORT.MIN_DAYS} dage`
    );
  }

  if (daysCount > CHILD_CARE_RULES.RELATIVE_ESCORT.MAX_DAYS) {
    throw new Error(
      `Ledsagelse af nærtstående kan maksimalt være ${CHILD_CARE_RULES.RELATIVE_ESCORT.MAX_DAYS} dage`
    );
  }

  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4;
  const dailyPay = effectiveHourlyWage * dailyHours;
  const totalPay = dailyPay * daysCount;

  return {
    careType: AbsenceType.RELATIVE_ESCORT,
    date: startDate,
    daysCount,
    dailyPay,
    totalPay,
    isPaid: CHILD_CARE_RULES.RELATIVE_ESCORT.PAID,
    requiresDocumentation: CHILD_CARE_RULES.RELATIVE_ESCORT.REQUIRES_DOCUMENTATION,
  };
}

/**
 * Registrerer ledsagelse af nærtstående
 */
export async function registerRelativeEscort(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const calc = await calculateRelativeEscort(employee, startDate, endDate);

  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: AbsenceType.RELATIVE_ESCORT,
      startDate,
      endDate,
      daysCount: calc.daysCount,
      isPaid: calc.isPaid,
      paymentAmount: new Decimal(calc.totalPay),
      note: note || `Ledsagelse af nærtstående (${calc.daysCount} dage)`,
    },
  });

  logger.info('Registered relative escort', {
    absenceId: absence.id,
    employeeId,
    startDate,
    endDate,
    daysCount: calc.daysCount,
  });

  return absence.id;
}

/**
 * Beregner børns hospitalsindlæggelse
 */
export async function calculateChildHospitalization(
  employee: Employee,
  startDate: Date,
  endDate: Date,
  year: number
): Promise<ChildCareCalculation> {
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Check hvor meget allerede brugt de sidste 12 måneder
  const twelveMonthsAgo = new Date(startDate);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const history = await getChildCareHistory(employee.id, year);
  const daysUsed = history.hospitalizationDaysUsed;
  const maxDays = CHILD_CARE_RULES.CHILD_HOSPITALIZATION.MAX_DAYS_PER_12_MONTHS;
  const daysRemaining = maxDays - daysUsed;

  if (daysCount > daysRemaining) {
    throw new Error(
      `Børns hospitalsindlæggelse overstiger maksimum. Anmodet: ${daysCount} dage, Tilgængelig: ${daysRemaining} dage (max ${maxDays} dage per 12 måneder).`
    );
  }

  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4;
  const dailyPay = effectiveHourlyWage * dailyHours;
  const totalPay = dailyPay * daysCount;

  return {
    careType: AbsenceType.CHILD_HOSPITALIZATION,
    date: startDate,
    daysCount,
    dailyPay,
    totalPay,
    isPaid: CHILD_CARE_RULES.CHILD_HOSPITALIZATION.PAID,
    requiresDocumentation: CHILD_CARE_RULES.CHILD_HOSPITALIZATION.REQUIRES_DOCUMENTATION,
    daysUsedThisYear: daysUsed,
    daysRemainingThisYear: daysRemaining,
  };
}

/**
 * Registrerer børns hospitalsindlæggelse
 */
export async function registerChildHospitalization(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  const year = startDate.getFullYear();
  const calc = await calculateChildHospitalization(employee, startDate, endDate, year);

  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: AbsenceType.CHILD_HOSPITALIZATION,
      startDate,
      endDate,
      daysCount: calc.daysCount,
      isPaid: calc.isPaid,
      paymentAmount: new Decimal(calc.totalPay),
      note: note || `Børns hospitalsindlæggelse (${calc.daysCount} dage)`,
    },
  });

  logger.info('Registered child hospitalization', {
    absenceId: absence.id,
    employeeId,
    startDate,
    endDate,
    daysCount: calc.daysCount,
    daysRemaining: calc.daysRemainingThisYear,
  });

  return absence.id;
}

/**
 * Henter børneomsorg historik for et år
 */
export async function getChildCareHistory(
  employeeId: string,
  year: number
): Promise<ChildCareHistory> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const absences = await prisma.absenceEntry.findMany({
    where: {
      employeeId,
      type: {
        in: [
          AbsenceType.CHILD_FIRST_SICK_DAY,
          AbsenceType.CHILD_SECOND_SICK_DAY,
          AbsenceType.CHILD_THIRD_SICK_DAY,
          AbsenceType.CHILD_DOCTOR_VISIT,
          AbsenceType.CHILD_CARE_DAY,
          AbsenceType.GRANDCHILD_CARE_DAY,
          AbsenceType.RELATIVE_ESCORT,
          AbsenceType.CHILD_HOSPITALIZATION,
        ],
      },
      startDate: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
  });

  let childSickDaysUsed = 0;
  let doctorVisitsUsed = 0;
  let childCareDaysUsed = 0;
  let grandchildCareDaysUsed = 0;
  let relativeEscortDaysUsed = 0;
  let hospitalizationDaysUsed = 0;

  for (const absence of absences) {
    switch (absence.type) {
      case AbsenceType.CHILD_FIRST_SICK_DAY:
      case AbsenceType.CHILD_SECOND_SICK_DAY:
      case AbsenceType.CHILD_THIRD_SICK_DAY:
        childSickDaysUsed += absence.daysCount;
        break;
      case AbsenceType.CHILD_DOCTOR_VISIT:
        doctorVisitsUsed += absence.daysCount;
        break;
      case AbsenceType.CHILD_CARE_DAY:
        childCareDaysUsed += absence.daysCount;
        break;
      case AbsenceType.GRANDCHILD_CARE_DAY:
        grandchildCareDaysUsed += absence.daysCount;
        break;
      case AbsenceType.RELATIVE_ESCORT:
        relativeEscortDaysUsed += absence.daysCount;
        break;
      case AbsenceType.CHILD_HOSPITALIZATION:
        hospitalizationDaysUsed += absence.daysCount;
        break;
    }
  }

  const totalDaysTaken =
    childSickDaysUsed +
    doctorVisitsUsed +
    childCareDaysUsed +
    grandchildCareDaysUsed +
    relativeEscortDaysUsed +
    hospitalizationDaysUsed;

  return {
    employeeId,
    year,
    childSickDaysUsed,
    doctorVisitsUsed,
    childCareDaysUsed,
    childCareDaysRemaining:
      CHILD_CARE_RULES.CHILD_CARE_DAYS.DAYS_PER_YEAR - childCareDaysUsed,
    grandchildCareDaysUsed,
    grandchildCareDaysRemaining:
      CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.DAYS_PER_YEAR - grandchildCareDaysUsed,
    relativeEscortDaysUsed,
    hospitalizationDaysUsed,
    hospitalizationDaysRemaining:
      CHILD_CARE_RULES.CHILD_HOSPITALIZATION.MAX_DAYS_PER_12_MONTHS - hospitalizationDaysUsed,
    totalDaysTaken,
  };
}

/**
 * Validerer børneomsorg anmodning
 */
export function validateChildCareRequest(
  careType: AbsenceType,
  startDate: Date,
  endDate?: Date
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check at startdato ikke er i fremtiden (for meget)
  const now = new Date();
  const maxFutureDays = 30;
  const futureLimit = new Date(now.getTime() + maxFutureDays * 24 * 60 * 60 * 1000);

  if (startDate > futureLimit) {
    warnings.push('Startdato er mere end 30 dage i fremtiden');
  }

  // Check varighed for typer der har slutdato
  if (endDate) {
    if (startDate > endDate) {
      errors.push('Startdato skal være før slutdato');
    }

    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (careType === AbsenceType.RELATIVE_ESCORT) {
      if (daysCount < CHILD_CARE_RULES.RELATIVE_ESCORT.MIN_DAYS) {
        errors.push(`Ledsagelse skal være minimum ${CHILD_CARE_RULES.RELATIVE_ESCORT.MIN_DAYS} dage`);
      }
      if (daysCount > CHILD_CARE_RULES.RELATIVE_ESCORT.MAX_DAYS) {
        errors.push(`Ledsagelse kan maksimalt være ${CHILD_CARE_RULES.RELATIVE_ESCORT.MAX_DAYS} dage`);
      }
    }

    if (careType === AbsenceType.CHILD_HOSPITALIZATION) {
      if (daysCount > CHILD_CARE_RULES.CHILD_HOSPITALIZATION.MAX_DAYS_PER_12_MONTHS) {
        errors.push(
          `Hospitalsindlæggelse kan maksimalt være ${CHILD_CARE_RULES.CHILD_HOSPITALIZATION.MAX_DAYS_PER_12_MONTHS} dage per 12 måneder`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
