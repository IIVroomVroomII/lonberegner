/**
 * Lærlingeoverenskomst - Apprentice Agreement Service
 *
 * Håndterer:
 * - Progressive lønskalaer (1.-4. år)
 * - Voksenlærlinge (25+ år)
 * - Disponentlærlinge
 * - Skoleperioder
 * - Eksamensbonus
 *
 * Baseret på Lærlingeoverenskomst 2025-2028
 */

import { Employee, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

export const APPRENTICE_RULES = {
  // Lærlinge lønskalaer (% af faglært)
  WAGE_SCALES: {
    YEAR_1: 50, // 50% af faglært
    YEAR_2: 60, // 60% af faglært
    YEAR_3: 75, // 75% af faglært
    YEAR_4: 90, // 90% af faglært
  },

  // Voksenlærlinge (25+)
  ADULT_APPRENTICE: {
    MINIMUM_AGE: 25,
    WAGE_PERCENTAGE: 80, // 80% af faglært
    APPLIES_FROM_START: true, // Gælder fra dag 1
  },

  // Disponentlærlinge (dispatcher apprentices)
  DISPATCHER_APPRENTICE: {
    YEAR_1: 55, // % af faglært
    YEAR_2: 65,
    YEAR_3: 80,
    YEAR_4: 95,
  },

  // Skoleperioder
  SCHOOL_PERIODS: {
    SALARY_PERCENTAGE: 100, // Fuld løn under skoleophold
    TRAVEL_ALLOWANCE_PER_DAY: 150, // Kr per dag ved længere rejse
    ACCOMMODATION_COVERAGE: true, // Overnatning dækkes
    MEAL_ALLOWANCE_PER_DAY: 100, // Kr per dag for kost
  },

  // Eksamensbonus
  EXAM_BONUSES: {
    FINAL_EXAM_PASS: 5000, // Kr ved bestået svendeprøve
    EXCELLENT_GRADE: 8000, // Kr ved særlig udmærkelse
    EARLY_COMPLETION: 3000, // Kr ved hurtigere afslutning
  },

  // Arbejdstid
  WORKING_TIME: {
    UNDER_18_MAX_HOURS_PER_WEEK: 37, // Max timer per uge under 18 år
    OVER_18_STANDARD_HOURS: 37, // Standard arbejdstid
    NIGHT_WORK_MINIMUM_AGE: 18, // Minimum alder for natarbejde
  },

  // Faglært reference løn (bruges til beregninger)
  SKILLED_WORKER_REFERENCE: {
    BASE_HOURLY_WAGE: 165, // Kr/time reference for faglært
  },

  // Anciennitetstillæg
  ANCIENNITY_BONUS: {
    AFTER_1_YEAR: 2, // % ekstra efter 1 år
    AFTER_2_YEARS: 4, // % ekstra efter 2 år
    APPLIES_TO_ADULT_APPRENTICES: true, // Gælder også voksenlærlinge
  },
};

export enum ApprenticeType {
  STANDARD = 'STANDARD', // Normal lærling
  ADULT = 'ADULT', // Voksenlærling (25+)
  DISPATCHER = 'DISPATCHER', // Disponentlærling
  EGU = 'EGU', // Erhvervsgrunduddannelse
}

export interface ApprenticeWage {
  employeeId: string;
  apprenticeType: ApprenticeType;
  apprenticeYear: number;
  age: number;
  isAdult: boolean;
  skilledWorkerWage: Decimal;
  wagePercentage: number;
  baseHourlyWage: Decimal;
  anciennityBonus: Decimal;
  totalHourlyWage: Decimal;
}

export interface SchoolPeriod {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  isFarFromHome: boolean; // Over 50km rejse
  salaryDuringSchool: Decimal;
  travelAllowance: Decimal;
  mealAllowance: Decimal;
  totalCompensation: Decimal;
}

export interface ExamResult {
  employeeId: string;
  examDate: Date;
  passed: boolean;
  hasExcellentGrade: boolean; // Udmærkelse
  completedEarly: boolean; // Afsluttet før tid
  examBonus: Decimal;
  excellenceBonus: Decimal;
  earlyCompletionBonus: Decimal;
  totalBonus: Decimal;
}

export interface ApprenticeProgression {
  employeeId: string;
  currentYear: number;
  monthsInCurrentYear: number;
  totalMonthsAsApprentice: number;
  expectedCompletionDate: Date;
  canProgressToNextYear: boolean;
  nextYearDate: Date;
}

/**
 * Beregner lærlingens alder
 */
export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
  const age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  const dayDiff = referenceDate.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1;
  }

  return age;
}

/**
 * Beregner lønprocent baseret på lærlingetype og år
 */
export function getApprenticeWagePercentage(
  apprenticeType: ApprenticeType,
  apprenticeYear: number,
  isAdult: boolean
): number {
  // Voksenlærlinge får fast sats
  if (isAdult && apprenticeType !== ApprenticeType.DISPATCHER) {
    return APPRENTICE_RULES.ADULT_APPRENTICE.WAGE_PERCENTAGE;
  }

  // Disponentlærlinge
  if (apprenticeType === ApprenticeType.DISPATCHER) {
    switch (apprenticeYear) {
      case 1:
        return APPRENTICE_RULES.DISPATCHER_APPRENTICE.YEAR_1;
      case 2:
        return APPRENTICE_RULES.DISPATCHER_APPRENTICE.YEAR_2;
      case 3:
        return APPRENTICE_RULES.DISPATCHER_APPRENTICE.YEAR_3;
      case 4:
        return APPRENTICE_RULES.DISPATCHER_APPRENTICE.YEAR_4;
      default:
        return APPRENTICE_RULES.DISPATCHER_APPRENTICE.YEAR_4;
    }
  }

  // Standard lærlinge
  switch (apprenticeYear) {
    case 1:
      return APPRENTICE_RULES.WAGE_SCALES.YEAR_1;
    case 2:
      return APPRENTICE_RULES.WAGE_SCALES.YEAR_2;
    case 3:
      return APPRENTICE_RULES.WAGE_SCALES.YEAR_3;
    case 4:
      return APPRENTICE_RULES.WAGE_SCALES.YEAR_4;
    default:
      return APPRENTICE_RULES.WAGE_SCALES.YEAR_4;
  }
}

/**
 * Beregner anciennitetstillæg for lærling
 */
export function calculateApprenticeAnciennityBonus(
  baseWage: Decimal,
  monthsAsApprentice: number,
  isAdultApprentice: boolean
): Decimal {
  if (!isAdultApprentice || !APPRENTICE_RULES.ANCIENNITY_BONUS.APPLIES_TO_ADULT_APPRENTICES) {
    return new Decimal(0);
  }

  const years = Math.floor(monthsAsApprentice / 12);

  if (years >= 2) {
    return baseWage.mul(APPRENTICE_RULES.ANCIENNITY_BONUS.AFTER_2_YEARS).div(100);
  } else if (years >= 1) {
    return baseWage.mul(APPRENTICE_RULES.ANCIENNITY_BONUS.AFTER_1_YEAR).div(100);
  }

  return new Decimal(0);
}

/**
 * Beregner lærlingens timeløn
 */
export function calculateApprenticeWage(
  employee: Employee,
  apprenticeYear: number,
  apprenticeType: ApprenticeType = ApprenticeType.STANDARD,
  skilledWorkerWage: number = APPRENTICE_RULES.SKILLED_WORKER_REFERENCE.BASE_HOURLY_WAGE,
  monthsAsApprentice: number = 0
): ApprenticeWage {
  if (!employee.birthDate) {
    throw new Error('Fødselsdato er påkrævet for lærlingeberegninger');
  }

  const age = calculateAge(employee.birthDate);
  const isAdult = age >= APPRENTICE_RULES.ADULT_APPRENTICE.MINIMUM_AGE;

  const wagePercentage = getApprenticeWagePercentage(apprenticeType, apprenticeYear, isAdult);

  const skilledWage = new Decimal(skilledWorkerWage);
  const baseHourlyWage = skilledWage.mul(wagePercentage).div(100);

  const anciennityBonus = calculateApprenticeAnciennityBonus(
    baseHourlyWage,
    monthsAsApprentice,
    isAdult
  );

  const totalHourlyWage = baseHourlyWage.add(anciennityBonus);

  logger.info('Calculated apprentice wage', {
    employeeId: employee.id,
    apprenticeYear,
    age,
    isAdult,
    wagePercentage,
    totalHourlyWage: totalHourlyWage.toNumber(),
  });

  return {
    employeeId: employee.id,
    apprenticeType,
    apprenticeYear,
    age,
    isAdult,
    skilledWorkerWage: skilledWage,
    wagePercentage,
    baseHourlyWage,
    anciennityBonus,
    totalHourlyWage,
  };
}

/**
 * Beregner kompensation for skoleperiode
 */
export function calculateSchoolPeriodCompensation(
  employee: Employee,
  startDate: Date,
  endDate: Date,
  isFarFromHome: boolean,
  dailyWorkHours: number = 7.4
): SchoolPeriod {
  // Beregn antal dage (inklusiv)
  const timeDiff = endDate.getTime() - startDate.getTime();
  const daysCount = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  // Beregn løn under skoleperiode (fuld løn)
  const wage = calculateApprenticeWage(employee, employee.apprenticeYear || 1);
  const dailySalary = wage.totalHourlyWage.mul(dailyWorkHours);
  const salaryDuringSchool = dailySalary.mul(daysCount);

  // Rejsetillæg hvis langt fra hjem
  const travelAllowance = isFarFromHome
    ? new Decimal(APPRENTICE_RULES.SCHOOL_PERIODS.TRAVEL_ALLOWANCE_PER_DAY).mul(daysCount)
    : new Decimal(0);

  // Kosttilskud hvis langt fra hjem
  const mealAllowance = isFarFromHome
    ? new Decimal(APPRENTICE_RULES.SCHOOL_PERIODS.MEAL_ALLOWANCE_PER_DAY).mul(daysCount)
    : new Decimal(0);

  const totalCompensation = salaryDuringSchool.add(travelAllowance).add(mealAllowance);

  return {
    employeeId: employee.id,
    startDate,
    endDate,
    daysCount,
    isFarFromHome,
    salaryDuringSchool,
    travelAllowance,
    mealAllowance,
    totalCompensation,
  };
}

/**
 * Beregner eksamensbonus
 */
export function calculateExamBonus(
  employeeId: string,
  examDate: Date,
  passed: boolean,
  hasExcellentGrade: boolean = false,
  completedEarly: boolean = false
): ExamResult {
  let examBonus = new Decimal(0);
  let excellenceBonus = new Decimal(0);
  let earlyCompletionBonus = new Decimal(0);

  if (passed) {
    examBonus = new Decimal(APPRENTICE_RULES.EXAM_BONUSES.FINAL_EXAM_PASS);

    if (hasExcellentGrade) {
      excellenceBonus = new Decimal(APPRENTICE_RULES.EXAM_BONUSES.EXCELLENT_GRADE);
    }

    if (completedEarly) {
      earlyCompletionBonus = new Decimal(APPRENTICE_RULES.EXAM_BONUSES.EARLY_COMPLETION);
    }
  }

  const totalBonus = examBonus.add(excellenceBonus).add(earlyCompletionBonus);

  return {
    employeeId,
    examDate,
    passed,
    hasExcellentGrade,
    completedEarly,
    examBonus,
    excellenceBonus,
    earlyCompletionBonus,
    totalBonus,
  };
}

/**
 * Beregner lærlingens progression
 */
export function calculateApprenticeProgression(
  employeeId: string,
  startDate: Date,
  currentYear: number,
  referenceDate: Date = new Date()
): ApprenticeProgression {
  // Beregn antal måneder som lærling
  const monthsDiff =
    (referenceDate.getFullYear() - startDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - startDate.getMonth());

  const totalMonthsAsApprentice = Math.max(0, monthsDiff);

  // Beregn måneder i nuværende år
  const monthsIntoYear = totalMonthsAsApprentice - (currentYear - 1) * 12;
  const monthsInCurrentYear = Math.max(0, Math.min(12, monthsIntoYear));

  // Beregn forventet afslutningsdato (typisk 4 år)
  const expectedCompletionDate = new Date(startDate);
  expectedCompletionDate.setFullYear(expectedCompletionDate.getFullYear() + 4);

  // Kan rykke op til næste år?
  const canProgressToNextYear = monthsInCurrentYear >= 12 && currentYear < 4;

  // Dato for næste års oprykning
  const nextYearDate = new Date(startDate);
  nextYearDate.setFullYear(nextYearDate.getFullYear() + currentYear);

  return {
    employeeId,
    currentYear,
    monthsInCurrentYear,
    totalMonthsAsApprentice,
    expectedCompletionDate,
    canProgressToNextYear,
    nextYearDate,
  };
}

/**
 * Validerer lærlingedata
 */
export function validateApprentice(employee: Employee): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!employee.birthDate) {
    errors.push('Fødselsdato er påkrævet for lærlinge');
  }

  if (employee.birthDate) {
    const age = calculateAge(employee.birthDate);

    if (age < 16) {
      errors.push('Lærling skal være mindst 16 år');
    }

    if (age >= 25 && !employee.isAdultApprentice) {
      warnings.push('Medarbejder er 25+ år men ikke markeret som voksenlærling');
    }

    if (age < 18 && employee.workTimeType !== WorkTimeType.HOURLY) {
      warnings.push('Lærlinge under 18 år skal være timelønnet');
    }
  }

  if (!employee.apprenticeYear || employee.apprenticeYear < 1 || employee.apprenticeYear > 4) {
    errors.push('Lærlingeår skal være mellem 1 og 4');
  }

  if (!employee.isApprentice) {
    warnings.push('Medarbejder er ikke markeret som lærling');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formaterer lærlingetype
 */
export function formatApprenticeType(type: ApprenticeType): string {
  switch (type) {
    case ApprenticeType.STANDARD:
      return 'Standard lærling';
    case ApprenticeType.ADULT:
      return 'Voksenlærling (25+)';
    case ApprenticeType.DISPATCHER:
      return 'Disponentlærling';
    case ApprenticeType.EGU:
      return 'EGU-elev';
    default:
      return 'Ukendt lærlingetype';
  }
}

/**
 * Formaterer lærlingeår
 */
export function formatApprenticeYear(year: number): string {
  switch (year) {
    case 1:
      return '1. lærlingeår';
    case 2:
      return '2. lærlingeår';
    case 3:
      return '3. lærlingeår';
    case 4:
      return '4. lærlingeår';
    default:
      return `${year}. lærlingeår`;
  }
}

/**
 * Beregner månedlig indtjening for lærling
 */
export function calculateMonthlyApprenticeEarnings(
  employee: Employee,
  hoursWorked: number,
  schoolDays: number = 0
): {
  employeeId: string;
  hoursWorked: number;
  hourlyWage: Decimal;
  regularEarnings: Decimal;
  schoolDaysCompensation: Decimal;
  totalEarnings: Decimal;
} {
  const wage = calculateApprenticeWage(employee, employee.apprenticeYear || 1);
  const regularEarnings = wage.totalHourlyWage.mul(hoursWorked);

  // Beregn skoledagskompensation
  let schoolDaysCompensation = new Decimal(0);
  if (schoolDays > 0) {
    const dailyWage = wage.totalHourlyWage.mul(7.4); // 7.4 timer per dag
    schoolDaysCompensation = dailyWage.mul(schoolDays);
  }

  const totalEarnings = regularEarnings.add(schoolDaysCompensation);

  return {
    employeeId: employee.id,
    hoursWorked,
    hourlyWage: wage.totalHourlyWage,
    regularEarnings,
    schoolDaysCompensation,
    totalEarnings,
  };
}
