/**
 * § 15 Barsel - Maternity and Paternity Leave Service
 *
 * Håndterer:
 * - Barselsorlov (fødende, ikke-fødende, social forælder)
 * - Løn under barsel
 * - Forhøjet pensionsbidrag (13,5% vs. 11%)
 * - Barselsperioder og rettigheder
 * - Graviditetsbetinget fravær
 * - Koordinering med offentlige ydelser
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 15
 */

import prisma from '../config/database';
import { Employee, AbsenceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateEffectiveHourlyWage } from './allowanceCalculationService';

// § 15 Barsel regler
export const MATERNITY_LEAVE_RULES = {
  // Fødende forælder (birthing parent)
  BIRTHING_PARENT: {
    WEEKS_BEFORE_BIRTH: 4, // 4 uger før termin
    WEEKS_AFTER_BIRTH: 14, // 14 uger efter fødsel
    TOTAL_WEEKS: 18, // Total 18 uger
    PAY_PERCENTAGE: 100, // Fuld løn
  },

  // Ikke-fødende forælder (non-birthing parent)
  NON_BIRTHING_PARENT: {
    WEEKS_AFTER_BIRTH: 2, // 2 ugers barselsorlov
    PAY_PERCENTAGE: 100, // Fuld løn
  },

  // Social forælder (social parent - adoptivforælder, medmor)
  SOCIAL_PARENT: {
    WEEKS_ENTITLEMENT: 2, // 2 uger
    PAY_PERCENTAGE: 100, // Fuld løn
  },

  // Forhøjet pension under barsel
  PENSION: {
    NORMAL_EMPLOYER_CONTRIBUTION: 11, // Normal 11%
    MATERNITY_EMPLOYER_CONTRIBUTION: 13.5, // Forhøjet til 13,5% under barsel
    INCREASE_PERCENTAGE: 2.5, // 2,5% ekstra
  },

  // Feriepenge
  VACATION_PAY: {
    ACCRUAL: true, // Optjener feriepenge under barsel
    PERCENTAGE: 12.5, // 12,5% feriepenge
  },

  // Graviditetsbetinget fravær
  PREGNANCY_RELATED: {
    COVERED: true, // Dækket af arbejdsgiver
    MAX_WEEKS_BEFORE_LEAVE: 12, // Maks 12 uger før barselsstart
  },

  // Koordinering med barselsdagpenge
  COORDINATION: {
    EMPLOYER_PAYS_FULL: true, // Arbejdsgiver betaler fuld løn
    RECEIVES_PUBLIC_BENEFIT: true, // Modtager også offentlig barselsdagpenge
    EMPLOYER_KEEPS_BENEFIT: true, // Arbejdsgiver beholder barselsdagpenge
  },
};

export enum MaternityLeaveType {
  BIRTHING_PARENT = 'BIRTHING_PARENT',
  NON_BIRTHING_PARENT = 'NON_BIRTHING_PARENT',
  SOCIAL_PARENT = 'SOCIAL_PARENT',
  PREGNANCY_RELATED_ABSENCE = 'PREGNANCY_RELATED_ABSENCE',
}

export interface MaternityLeaveCalculation {
  leaveType: MaternityLeaveType;
  startDate: Date;
  endDate: Date;
  dueDate?: Date; // Termin
  actualBirthDate?: Date; // Faktisk fødselsdato
  weeksEntitlement: number;
  daysCount: number;
  dailyPay: number;
  totalPay: number;
  normalPensionContribution: number; // 11%
  enhancedPensionContribution: number; // 13,5%
  pensionIncrease: number; // Difference (2,5%)
  vacationPay: number;
  isFullPay: boolean;
}

export interface MaternityLeaveHistory {
  employeeId: string;
  totalMaternityDays: number;
  totalMaternityWeeks: number;
  currentLeaveActive: boolean;
  currentLeaveType?: MaternityLeaveType;
  leavesThisYear: number;
  totalPaidAmount: number;
}

/**
 * Beregner barselsorlov for en medarbejder
 */
export async function calculateMaternityLeave(
  employee: Employee,
  leaveType: MaternityLeaveType,
  startDate: Date,
  endDate?: Date,
  dueDate?: Date,
  actualBirthDate?: Date
): Promise<MaternityLeaveCalculation> {
  // Bestem antal ugers ret baseret på type
  let weeksEntitlement = 0;
  let payPercentage = 100;

  switch (leaveType) {
    case MaternityLeaveType.BIRTHING_PARENT:
      weeksEntitlement = MATERNITY_LEAVE_RULES.BIRTHING_PARENT.TOTAL_WEEKS;
      payPercentage = MATERNITY_LEAVE_RULES.BIRTHING_PARENT.PAY_PERCENTAGE;
      break;

    case MaternityLeaveType.NON_BIRTHING_PARENT:
      weeksEntitlement = MATERNITY_LEAVE_RULES.NON_BIRTHING_PARENT.WEEKS_AFTER_BIRTH;
      payPercentage = MATERNITY_LEAVE_RULES.NON_BIRTHING_PARENT.PAY_PERCENTAGE;
      break;

    case MaternityLeaveType.SOCIAL_PARENT:
      weeksEntitlement = MATERNITY_LEAVE_RULES.SOCIAL_PARENT.WEEKS_ENTITLEMENT;
      payPercentage = MATERNITY_LEAVE_RULES.SOCIAL_PARENT.PAY_PERCENTAGE;
      break;

    case MaternityLeaveType.PREGNANCY_RELATED_ABSENCE:
      // Graviditetsbetinget fravær - behandles separat
      weeksEntitlement = MATERNITY_LEAVE_RULES.PREGNANCY_RELATED.MAX_WEEKS_BEFORE_LEAVE;
      payPercentage = 100;
      break;
  }

  // Beregn slutdato hvis ikke angivet
  const calculatedEndDate =
    endDate || new Date(startDate.getTime() + weeksEntitlement * 7 * 24 * 60 * 60 * 1000);

  // Beregn antal dage (inkl. weekends for barsel, inclusive of both start and end dates)
  const daysCount = Math.ceil(
    (calculatedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // Beregn daglig løn (fuld løn inkl. tillæg)
  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4; // Standard daglig arbejdstid
  const dailyPay = effectiveHourlyWage * dailyHours * (payPercentage / 100);

  // Total løn
  const totalPay = dailyPay * daysCount;

  // Normal pension (11%)
  const normalPensionContribution =
    (totalPay * MATERNITY_LEAVE_RULES.PENSION.NORMAL_EMPLOYER_CONTRIBUTION) / 100;

  // Forhøjet pension (13,5%)
  const enhancedPensionContribution =
    (totalPay * MATERNITY_LEAVE_RULES.PENSION.MATERNITY_EMPLOYER_CONTRIBUTION) / 100;

  // Forskel (2,5%)
  const pensionIncrease = enhancedPensionContribution - normalPensionContribution;

  // Feriepenge (12,5%)
  const vacationPay = (totalPay * MATERNITY_LEAVE_RULES.VACATION_PAY.PERCENTAGE) / 100;

  logger.info('Calculated maternity leave', {
    employeeId: employee.id,
    leaveType,
    startDate,
    endDate: calculatedEndDate,
    daysCount,
    weeksEntitlement,
    dailyPay,
    totalPay,
    enhancedPensionContribution,
    pensionIncrease,
    vacationPay,
  });

  return {
    leaveType,
    startDate,
    endDate: calculatedEndDate,
    dueDate,
    actualBirthDate,
    weeksEntitlement,
    daysCount,
    dailyPay,
    totalPay,
    normalPensionContribution,
    enhancedPensionContribution,
    pensionIncrease,
    vacationPay,
    isFullPay: payPercentage === 100,
  };
}

/**
 * Registrerer barselsorlov
 */
export async function registerMaternityLeave(
  employeeId: string,
  leaveType: MaternityLeaveType,
  startDate: Date,
  endDate?: Date,
  dueDate?: Date,
  actualBirthDate?: Date,
  note?: string
): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  // Beregn barsel
  const maternityCalc = await calculateMaternityLeave(
    employee,
    leaveType,
    startDate,
    endDate,
    dueDate,
    actualBirthDate
  );

  // Map leave type to absence type
  let absenceType: AbsenceType;
  switch (leaveType) {
    case MaternityLeaveType.BIRTHING_PARENT:
      absenceType = AbsenceType.MATERNITY_LEAVE;
      break;
    case MaternityLeaveType.NON_BIRTHING_PARENT:
      absenceType = AbsenceType.PATERNITY_LEAVE;
      break;
    case MaternityLeaveType.SOCIAL_PARENT:
      absenceType = AbsenceType.SOCIAL_PARENT_LEAVE;
      break;
    case MaternityLeaveType.PREGNANCY_RELATED_ABSENCE:
      absenceType = AbsenceType.MATERNITY_LEAVE; // Pregnancy-related absence uses maternity leave type
      break;
  }

  // Opret fraværsregistrering
  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type: absenceType,
      startDate,
      endDate: maternityCalc.endDate,
      daysCount: maternityCalc.daysCount,
      isPaid: true, // Barsel er altid betalt
      paymentAmount: new Decimal(maternityCalc.totalPay),
      note: note || getDefaultNote(leaveType, maternityCalc),
    },
  });

  logger.info('Registered maternity leave', {
    absenceId: absence.id,
    employeeId,
    leaveType,
    startDate,
    endDate: maternityCalc.endDate,
    daysCount: maternityCalc.daysCount,
    totalPay: maternityCalc.totalPay,
    pensionIncrease: maternityCalc.pensionIncrease,
  });

  return absence.id;
}

/**
 * Henter barselshistorik for medarbejder
 */
export async function getMaternityLeaveHistory(
  employeeId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<MaternityLeaveHistory> {
  const whereClause: any = {
    employeeId,
    type: {
      in: [
        AbsenceType.MATERNITY_LEAVE,
        AbsenceType.PATERNITY_LEAVE,
        AbsenceType.SOCIAL_PARENT_LEAVE,
      ],
    },
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

  let totalMaternityDays = 0;
  let totalPaidAmount = 0;

  // Check for active leave
  const now = new Date();
  const currentLeave = absences.find(
    (a) => a.startDate <= now && (!a.endDate || a.endDate >= now)
  );

  // Beregn totaler
  for (const absence of absences) {
    totalMaternityDays += absence.daysCount;
    totalPaidAmount += Number(absence.paymentAmount || 0);
  }

  const totalMaternityWeeks = Math.floor(totalMaternityDays / 7);

  return {
    employeeId,
    totalMaternityDays,
    totalMaternityWeeks,
    currentLeaveActive: !!currentLeave,
    currentLeaveType: currentLeave
      ? mapAbsenceTypeToLeaveType(currentLeave.type)
      : undefined,
    leavesThisYear: absences.length,
    totalPaidAmount,
  };
}

/**
 * Validerer barselsorlov ansøgning
 */
export function validateMaternityLeave(
  leaveType: MaternityLeaveType,
  startDate: Date,
  endDate: Date,
  dueDate?: Date
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check at startdato er før slutdato
  if (startDate >= endDate) {
    errors.push('Startdato skal være før slutdato');
  }

  // 2. Check termin for fødende forælder
  if (leaveType === MaternityLeaveType.BIRTHING_PARENT) {
    if (!dueDate) {
      warnings.push('Termin er ikke angivet');
    } else {
      // Check om startdato er rimelig ifht. termin (maks 4 uger før)
      const fourWeeksBefore = new Date(dueDate);
      fourWeeksBefore.setDate(fourWeeksBefore.getDate() - 28);

      if (startDate < fourWeeksBefore) {
        warnings.push(
          `Startdato er mere end 4 uger før termin. Normal barselsorlov starter max 4 uger før termin.`
        );
      }
    }
  }

  // 3. Check varighed
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeksCount = Math.floor(daysCount / 7);

  let maxWeeks = 0;
  switch (leaveType) {
    case MaternityLeaveType.BIRTHING_PARENT:
      maxWeeks = MATERNITY_LEAVE_RULES.BIRTHING_PARENT.TOTAL_WEEKS;
      break;
    case MaternityLeaveType.NON_BIRTHING_PARENT:
      maxWeeks = MATERNITY_LEAVE_RULES.NON_BIRTHING_PARENT.WEEKS_AFTER_BIRTH;
      break;
    case MaternityLeaveType.SOCIAL_PARENT:
      maxWeeks = MATERNITY_LEAVE_RULES.SOCIAL_PARENT.WEEKS_ENTITLEMENT;
      break;
    case MaternityLeaveType.PREGNANCY_RELATED_ABSENCE:
      maxWeeks = MATERNITY_LEAVE_RULES.PREGNANCY_RELATED.MAX_WEEKS_BEFORE_LEAVE;
      break;
  }

  if (weeksCount > maxWeeks) {
    warnings.push(
      `Barselsperiode på ${weeksCount} uger overstiger normal ret (${maxWeeks} uger). Kontakt HR for forlængelse.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Beregner pension fordel under barsel
 */
export function calculatePensionBenefit(totalPay: number): {
  normalPension: number;
  enhancedPension: number;
  benefit: number;
  benefitPercentage: number;
} {
  const normalPension =
    (totalPay * MATERNITY_LEAVE_RULES.PENSION.NORMAL_EMPLOYER_CONTRIBUTION) / 100;
  const enhancedPension =
    (totalPay * MATERNITY_LEAVE_RULES.PENSION.MATERNITY_EMPLOYER_CONTRIBUTION) / 100;
  const benefit = enhancedPension - normalPension;
  const benefitPercentage = MATERNITY_LEAVE_RULES.PENSION.INCREASE_PERCENTAGE;

  return {
    normalPension,
    enhancedPension,
    benefit,
    benefitPercentage,
  };
}

/**
 * Beregner graviditetsbetinget fravær
 */
export async function calculatePregnancyRelatedAbsence(
  employee: Employee,
  startDate: Date,
  endDate: Date
): Promise<{
  daysCount: number;
  totalPay: number;
  isCovered: boolean;
  exceedsLimit: boolean;
  warning?: string;
}> {
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weeksCount = Math.floor(daysCount / 7);

  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyPay = effectiveHourlyWage * 7.4;
  const totalPay = dailyPay * daysCount;

  const maxWeeks = MATERNITY_LEAVE_RULES.PREGNANCY_RELATED.MAX_WEEKS_BEFORE_LEAVE;
  const exceedsLimit = weeksCount > maxWeeks;

  let warning;
  if (exceedsLimit) {
    warning = `Graviditetsbetinget fravær på ${weeksCount} uger overstiger maksimum (${maxWeeks} uger). Kontakt HR.`;
  }

  return {
    daysCount,
    totalPay,
    isCovered: MATERNITY_LEAVE_RULES.PREGNANCY_RELATED.COVERED,
    exceedsLimit,
    warning,
  };
}

/**
 * Hjælpefunktion: Generer standard note
 */
function getDefaultNote(
  leaveType: MaternityLeaveType,
  calc: MaternityLeaveCalculation
): string {
  const typeNames = {
    [MaternityLeaveType.BIRTHING_PARENT]: 'Barselsorlov (fødende)',
    [MaternityLeaveType.NON_BIRTHING_PARENT]: 'Fædre-/forældreorlov',
    [MaternityLeaveType.SOCIAL_PARENT]: 'Social forældreorlov',
    [MaternityLeaveType.PREGNANCY_RELATED_ABSENCE]: 'Graviditetsbetinget fravær',
  };

  return `${typeNames[leaveType]} (${calc.daysCount} dage, ${calc.weeksEntitlement} ugers ret). Forhøjet pension: +${calc.pensionIncrease.toFixed(2)} kr`;
}

/**
 * Hjælpefunktion: Map AbsenceType til MaternityLeaveType
 */
function mapAbsenceTypeToLeaveType(absenceType: AbsenceType): MaternityLeaveType | undefined {
  switch (absenceType) {
    case AbsenceType.MATERNITY_LEAVE:
      return MaternityLeaveType.BIRTHING_PARENT;
    case AbsenceType.PATERNITY_LEAVE:
      return MaternityLeaveType.NON_BIRTHING_PARENT;
    case AbsenceType.SOCIAL_PARENT_LEAVE:
      return MaternityLeaveType.SOCIAL_PARENT;
    default:
      return undefined;
  }
}

/**
 * Genererer barselsrapport
 */
export async function generateMaternityLeaveReport(
  employeeId: string,
  year: number
): Promise<{
  employeeId: string;
  year: number;
  totalDays: number;
  totalWeeks: number;
  totalPay: number;
  totalPensionBenefit: number; // Ekstra pension fordel
  leaves: Array<{
    type: MaternityLeaveType;
    startDate: Date;
    endDate: Date | null;
    days: number;
    pay: number;
    pensionBenefit: number;
  }>;
}> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const history = await getMaternityLeaveHistory(employeeId, yearStart, yearEnd);

  const absences = await prisma.absenceEntry.findMany({
    where: {
      employeeId,
      type: {
        in: [
          AbsenceType.MATERNITY_LEAVE,
          AbsenceType.PATERNITY_LEAVE,
          AbsenceType.SOCIAL_PARENT_LEAVE,
        ],
      },
      startDate: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    orderBy: { startDate: 'asc' },
  });

  let totalPay = 0;
  let totalPensionBenefit = 0;

  const leaves = absences.map((a) => {
    const pay = Number(a.paymentAmount || 0);
    const pensionBenefit = calculatePensionBenefit(pay).benefit;

    totalPay += pay;
    totalPensionBenefit += pensionBenefit;

    return {
      type: mapAbsenceTypeToLeaveType(a.type)!,
      startDate: a.startDate,
      endDate: a.endDate,
      days: a.daysCount,
      pay,
      pensionBenefit,
    };
  });

  return {
    employeeId,
    year,
    totalDays: history.totalMaternityDays,
    totalWeeks: history.totalMaternityWeeks,
    totalPay,
    totalPensionBenefit,
    leaves,
  };
}
