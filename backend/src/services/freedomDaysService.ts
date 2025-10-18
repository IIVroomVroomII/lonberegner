/**
 * § 11 Fridage - Freedom Days Service
 *
 * Håndterer:
 * - Lovpligtige fridage (1. maj, Grundlovsdag, mv.)
 * - Feriefridage (5 dage/år)
 * - Seniorordning (ekstra fridage for 60+ årige)
 * - Fridage ved holddrift (erstatningsfridage)
 * - Weekend- og helligdagstillæg
 * - Frihedskonto administration
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 11
 */

import prisma from '../config/database';
import { Employee, AbsenceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

// § 11 Fridage - Typer og satser
export const FREEDOM_DAYS_RULES = {
  // Lovpligtige fridage (betalt frihed)
  STATUTORY_DAYS: {
    MAY_1: { name: '1. maj', description: 'Arbejdernes internationale kampdag' },
    JUNE_5: { name: 'Grundlovsdag', description: 'Grundlovsdag (efter kl. 12:00)' },
    CHRISTMAS_EVE: { name: 'Juleaftensdag', description: 'Juleaftensdag (efter kl. 12:00)' },
    NEW_YEARS_EVE: { name: 'Nytårsaftensdag', description: 'Nytårsaftensdag (efter kl. 12:00)' },
    EASTER_SATURDAY: { name: 'Påskesøndag', description: 'Påskesøndag' },
  },

  // Feriefridage
  VACATION_FREEDOM_DAYS: {
    YEARLY_ENTITLEMENT: 5, // 5 feriefridage pr. år
    ACCRUAL_START_DATE: new Date('2025-05-01'), // Fra 1.5.2025
  },

  // Seniorordning (§ 11 stk. 7)
  SENIOR_SCHEME: {
    MIN_AGE: 60, // Minimum alder
    MAX_DAYS_PER_YEAR: 46, // Maksimum antal dage pr. år
    PENSION_CONVERSION_OPTIONS: [0, 25, 50, 75, 100], // Procentdel af pension der konverteres
  },

  // Weekend- og helligdagstillæg (§ 11 stk. 1)
  ALLOWANCES: {
    WEEKEND_PERCENTAGE: 50, // 50% tillæg for weekend
    HOLIDAY_PERCENTAGE: 100, // 100% tillæg for helligdage
  },
};

// Danske helligdage (dynamisk beregning)
export interface Holiday {
  date: Date;
  name: string;
  isFullDay: boolean; // Hel dag eller halv dag
}

export interface FreedomDayEntitlement {
  employeeId: string;
  statutoryDays: number; // Lovpligtige fridage
  vacationFreedomDays: number; // Feriefridage
  seniorDays: number; // Seniorfridage
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
}

export interface SeniorSchemeCalculation {
  age: number;
  isEligible: boolean;
  maxDaysPerYear: number;
  pensionConversionPercentage: number;
  pensionReduction: number; // Reduktion i pension (kr/år)
  extraDaysGranted: number;
}

/**
 * Beregner danske helligdage for et givet år
 */
export function calculateHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  // Påske (beregnes dynamisk)
  const easter = calculateEasterDate(year);

  // Faste helligdage
  holidays.push(
    { date: new Date(year, 0, 1), name: 'Nytårsdag', isFullDay: true },
    { date: new Date(year, 4, 1), name: '1. maj', isFullDay: true },
    { date: new Date(year, 5, 5), name: 'Grundlovsdag', isFullDay: false }, // Efter kl. 12
    { date: new Date(year, 11, 24), name: 'Juleaftensdag', isFullDay: false }, // Efter kl. 12
    { date: new Date(year, 11, 25), name: '1. juledag', isFullDay: true },
    { date: new Date(year, 11, 26), name: '2. juledag', isFullDay: true },
    { date: new Date(year, 11, 31), name: 'Nytårsaftensdag', isFullDay: false } // Efter kl. 12
  );

  // Påske-relaterede helligdage
  holidays.push(
    { date: addDays(easter, -3), name: 'Skærtorsdag', isFullDay: true },
    { date: addDays(easter, -2), name: 'Langfredag', isFullDay: true },
    { date: addDays(easter, 0), name: 'Påskedag', isFullDay: true },
    { date: addDays(easter, 1), name: '2. påskedag', isFullDay: true },
    { date: addDays(easter, 26), name: 'Store bededag', isFullDay: true },
    { date: addDays(easter, 39), name: 'Kristi himmelfartsdag', isFullDay: true },
    { date: addDays(easter, 49), name: 'Pinsedag', isFullDay: true },
    { date: addDays(easter, 50), name: '2. pinsedag', isFullDay: true }
  );

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Beregner påskedato for et givet år (Computus algoritme)
 */
function calculateEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Hjælpefunktion: Tilføj dage til en dato
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Checker om en dato er en helligdag
 */
export function isHoliday(date: Date): { isHoliday: boolean; holiday?: Holiday } {
  const year = date.getFullYear();
  const holidays = calculateHolidays(year);

  // Sammenlign kun år, måned og dag (ignorer tid og tidszone)
  const checkYear = date.getFullYear();
  const checkMonth = date.getMonth();
  const checkDay = date.getDate();

  for (const holiday of holidays) {
    if (
      holiday.date.getFullYear() === checkYear &&
      holiday.date.getMonth() === checkMonth &&
      holiday.date.getDate() === checkDay
    ) {
      return { isHoliday: true, holiday };
    }
  }

  return { isHoliday: false };
}

/**
 * Checker om en dato er weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Søndag = 0, Lørdag = 6
}

/**
 * Beregner fridagstilgodehavende for en medarbejder
 */
export async function calculateFreedomDayEntitlement(
  employeeId: string,
  year: number
): Promise<FreedomDayEntitlement> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  // Lovpligtige fridage (alle får disse)
  const statutoryDays = Object.keys(FREEDOM_DAYS_RULES.STATUTORY_DAYS).length;

  // Feriefridage (5 dage/år fra 1.5.2025)
  const vacationFreedomDays = FREEDOM_DAYS_RULES.VACATION_FREEDOM_DAYS.YEARLY_ENTITLEMENT;

  // Seniorfridage
  let seniorDays = 0;
  if (employee.seniorSchemeActive && employee.seniorDaysPerYear > 0) {
    seniorDays = employee.seniorDaysPerYear;
  }

  const totalEntitlement = statutoryDays + vacationFreedomDays + seniorDays;

  // Hent brugte fridage fra AbsenceEntry
  const absenceEntries = await prisma.absenceEntry.findMany({
    where: {
      employeeId,
      startDate: {
        gte: new Date(year, 0, 1),
      },
      endDate: {
        lte: new Date(year, 11, 31),
      },
      type: {
        in: [
          AbsenceType.VACATION_FREEDOM_DAY,
          AbsenceType.SENIOR_DAY,
        ],
      },
    },
  });

  const usedDays = absenceEntries.reduce((sum, entry) => sum + entry.daysCount, 0);
  const remainingDays = totalEntitlement - usedDays;

  logger.info('Calculated freedom day entitlement', {
    employeeId,
    year,
    statutoryDays,
    vacationFreedomDays,
    seniorDays,
    totalEntitlement,
    usedDays,
    remainingDays,
  });

  return {
    employeeId,
    statutoryDays,
    vacationFreedomDays,
    seniorDays,
    totalEntitlement,
    usedDays,
    remainingDays,
  };
}

/**
 * Beregner seniorordning for en medarbejder
 */
export function calculateSeniorScheme(
  birthDate: Date,
  pensionConversionPercentage: number,
  annualPension: number
): SeniorSchemeCalculation {
  const age = calculateAge(birthDate);
  const isEligible = age >= FREEDOM_DAYS_RULES.SENIOR_SCHEME.MIN_AGE;

  if (!isEligible) {
    return {
      age,
      isEligible: false,
      maxDaysPerYear: 0,
      pensionConversionPercentage: 0,
      pensionReduction: 0,
      extraDaysGranted: 0,
    };
  }

  // Valider konverteringsprocent
  if (!FREEDOM_DAYS_RULES.SENIOR_SCHEME.PENSION_CONVERSION_OPTIONS.includes(
    pensionConversionPercentage
  )) {
    throw new Error(
      `Ugyldig pensionskonverteringsprocent. Gyldige værdier: ${FREEDOM_DAYS_RULES.SENIOR_SCHEME.PENSION_CONVERSION_OPTIONS.join(', ')}`
    );
  }

  // Beregn pensionsreduktion
  const pensionReduction = (annualPension * pensionConversionPercentage) / 100;

  // Beregn ekstra fridage baseret på konverteringsprocent
  // Antag: 1% pension ≈ 0,46 fridage (max 46 dage ved 100% konvertering)
  const extraDaysGranted = Math.floor(
    (FREEDOM_DAYS_RULES.SENIOR_SCHEME.MAX_DAYS_PER_YEAR * pensionConversionPercentage) / 100
  );

  logger.info('Calculated senior scheme', {
    age,
    isEligible,
    pensionConversionPercentage,
    annualPension,
    pensionReduction,
    extraDaysGranted,
  });

  return {
    age,
    isEligible: true,
    maxDaysPerYear: FREEDOM_DAYS_RULES.SENIOR_SCHEME.MAX_DAYS_PER_YEAR,
    pensionConversionPercentage,
    pensionReduction,
    extraDaysGranted,
  };
}

/**
 * Registrerer fridag
 */
export async function registerFreedomDay(
  employeeId: string,
  date: Date,
  type: AbsenceType,
  description: string
): Promise<string> {
  // Valider at det er en gyldig fridagstype
  const validTypes: AbsenceType[] = [
    AbsenceType.VACATION_FREEDOM_DAY,
    AbsenceType.SENIOR_DAY,
  ];

  if (!validTypes.includes(type)) {
    throw new Error(`Ugyldig fridagstype: ${type}`);
  }

  // Check at medarbejderen har fridage tilbage
  const year = date.getFullYear();
  const entitlement = await calculateFreedomDayEntitlement(employeeId, year);

  if (entitlement.remainingDays <= 0) {
    throw new Error('Ingen fridage tilbage for dette år');
  }

  // Registrer fraværet
  const absence = await prisma.absenceEntry.create({
    data: {
      employeeId,
      type,
      startDate: date,
      endDate: date,
      daysCount: 1,
      isPaid: true, // Fridage er altid betalt
      note: description,
    },
  });

  logger.info('Registered freedom day', {
    absenceId: absence.id,
    employeeId,
    date,
    type,
    remainingDays: entitlement.remainingDays - 1,
  });

  return absence.id;
}

/**
 * Beregner weekend/helligdagstillæg
 */
export function calculateWeekendHolidayAllowance(
  hours: number,
  hourlyRate: number,
  date: Date
): {
  allowancePercentage: number;
  allowanceAmount: number;
  reason: string;
} {
  const holidayCheck = isHoliday(date);
  const weekendCheck = isWeekend(date);

  let allowancePercentage = 0;
  let reason = '';

  if (holidayCheck.isHoliday) {
    allowancePercentage = FREEDOM_DAYS_RULES.ALLOWANCES.HOLIDAY_PERCENTAGE;
    reason = `Helligdagstillæg (${holidayCheck.holiday?.name})`;
  } else if (weekendCheck) {
    allowancePercentage = FREEDOM_DAYS_RULES.ALLOWANCES.WEEKEND_PERCENTAGE;
    const dayName = date.getDay() === 0 ? 'Søndag' : 'Lørdag';
    reason = `Weekendtillæg (${dayName})`;
  }

  const allowanceAmount = (hours * hourlyRate * allowancePercentage) / 100;

  return {
    allowancePercentage,
    allowanceAmount,
    reason,
  };
}

/**
 * Beregner alder baseret på fødselsdato
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Henter alle kommende helligdage for resten af året
 */
export function getUpcomingHolidays(fromDate: Date = new Date()): Holiday[] {
  const year = fromDate.getFullYear();
  const holidays = calculateHolidays(year);

  return holidays.filter((h) => h.date >= fromDate);
}

/**
 * Aktiverer seniorordning for en medarbejder
 */
export async function activateSeniorScheme(
  employeeId: string,
  pensionConversionPercentage: number
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Medarbejder ikke fundet');
  }

  if (!employee.birthDate) {
    throw new Error('Fødselsdato mangler for medarbejderen');
  }

  // Beregn seniorordning (dette vil kaste fejl hvis ikke berettiget)
  const scheme = calculateSeniorScheme(
    employee.birthDate,
    pensionConversionPercentage,
    0 // Pension amount ikke relevant for aktivering
  );

  if (!scheme.isEligible) {
    throw new Error(`Medarbejder er ikke berettiget til seniorordning (alder: ${scheme.age}, krævet: ${FREEDOM_DAYS_RULES.SENIOR_SCHEME.MIN_AGE})`);
  }

  // Aktiver ordningen
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      seniorSchemeActive: true,
      seniorDaysPerYear: scheme.extraDaysGranted,
      seniorPensionConversion: new Decimal(pensionConversionPercentage),
    },
  });

  logger.info('Activated senior scheme', {
    employeeId,
    pensionConversionPercentage,
    extraDaysGranted: scheme.extraDaysGranted,
  });
}
