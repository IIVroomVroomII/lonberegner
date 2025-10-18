/**
 * § 22 Fratrædelsesgodtgørelse - Severance Pay Service
 *
 * Håndterer:
 * - Beregning af fratrædelsesgodtgørelse baseret på anciennitet
 * - Berettigelse til godtgørelse
 * - Progressiv godtgørelse efter anciennitet
 * - Integration med opsigelsesregler
 * - Dokumentation og rapportering
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 22
 */

import { Employee } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateEffectiveHourlyWage } from './allowanceCalculationService';
import { TerminationInitiator } from './terminationService';

// § 22 Fratrædelsesgodtgørelse regler
export const SEVERANCE_RULES = {
  // Minimum anciennitet i måneder
  MINIMUM_ANCIENNITY_MONTHS: 144, // 12 år

  // Fratrædelsesgodtgørelse baseret på anciennitet
  SEVERANCE_AMOUNTS: {
    MONTHS_144_TO_179: 1, // 12-14 år: 1 månedsløn
    MONTHS_180_TO_215: 2, // 15-17 år: 2 månedslønninger
    MONTHS_216_PLUS: 3, // 18+ år: 3 månedslønninger
  },

  // Betingelser
  CONDITIONS: {
    EMPLOYER_INITIATED_ONLY: true, // Kun ved arbejdsgivers opsigelse
    EXCLUDE_MISCONDUCT: true, // Ikke ved grov misligholdelse
    EXCLUDE_PENSION_AGE: true, // Ikke ved folkepensionsalder
    EXCLUDE_VOLUNTARY_QUIT: true, // Ikke ved egen opsigelse
  },

  // Beregning
  CALCULATION: {
    BASED_ON_FULL_SALARY: true, // Baseret på fuld månedsløn inkl. tillæg
    INCLUDE_ALLOWANCES: true, // Inkluderer faste tillæg
    EXCLUDE_VARIABLE_PAY: true, // Ekskluderer variabel løn (overtid osv.)
  },

  // Udbetaling
  PAYMENT: {
    DUE_ON_TERMINATION_DATE: true, // Betales ved fratræden
    TAXABLE: true, // Skattepligtig
    PENSION_QUALIFYING: false, // Pensionsgivende (typisk nej)
  },
};

export enum SeveranceReason {
  EMPLOYER_TERMINATION = 'EMPLOYER_TERMINATION',
  MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT',
  REDUNDANCY = 'REDUNDANCY',
  RESTRUCTURING = 'RESTRUCTURING',
  OTHER = 'OTHER',
}

export enum SeveranceIneligibilityReason {
  INSUFFICIENT_ANCIENNITY = 'INSUFFICIENT_ANCIENNITY',
  EMPLOYEE_INITIATED = 'EMPLOYEE_INITIATED',
  GROSS_MISCONDUCT = 'GROSS_MISCONDUCT',
  PENSION_AGE = 'PENSION_AGE',
  OTHER = 'OTHER',
}

export interface SeverancePayCalculation {
  employeeId: string;
  anciennityMonths: number;
  anciennityYears: number;
  isEligible: boolean;
  ineligibilityReason?: SeveranceIneligibilityReason;
  severanceMonths?: number; // Antal månedslønninger
  monthlySalary?: Decimal; // Månedsløn basis
  totalSeverancePay?: Decimal; // Total godtgørelse
  calculatedDate: Date;
  terminationDate?: Date;
  reason?: SeveranceReason;
  notes?: string;
}

export interface SeveranceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Beregner fratrædelsesgodtgørelse
 */
export function calculateSeverancePay(
  employee: Employee,
  terminationInitiator: TerminationInitiator,
  terminationDate: Date,
  reason?: SeveranceReason,
  wasGrossMisconduct: boolean = false
): SeverancePayCalculation {
  const anciennityMonths = employee.anciennity;
  const anciennityYears = Math.floor(anciennityMonths / 12);
  const calculatedDate = new Date();

  // Check berettigelse

  // 1. Minimum anciennitet
  if (anciennityMonths < SEVERANCE_RULES.MINIMUM_ANCIENNITY_MONTHS) {
    return {
      employeeId: employee.id,
      anciennityMonths,
      anciennityYears,
      isEligible: false,
      ineligibilityReason: SeveranceIneligibilityReason.INSUFFICIENT_ANCIENNITY,
      calculatedDate,
      terminationDate,
      notes: `Kræver minimum ${SEVERANCE_RULES.MINIMUM_ANCIENNITY_MONTHS / 12} års anciennitet. Har ${anciennityYears} år.`,
    };
  }

  // 2. Kun ved arbejdsgivers opsigelse
  if (
    terminationInitiator !== TerminationInitiator.EMPLOYER &&
    SEVERANCE_RULES.CONDITIONS.EMPLOYER_INITIATED_ONLY
  ) {
    return {
      employeeId: employee.id,
      anciennityMonths,
      anciennityYears,
      isEligible: false,
      ineligibilityReason: SeveranceIneligibilityReason.EMPLOYEE_INITIATED,
      calculatedDate,
      terminationDate,
      notes: 'Fratrædelsesgodtgørelse gives kun ved opsigelse fra arbejdsgiver',
    };
  }

  // 3. Ikke ved grov misligholdelse
  if (wasGrossMisconduct && SEVERANCE_RULES.CONDITIONS.EXCLUDE_MISCONDUCT) {
    return {
      employeeId: employee.id,
      anciennityMonths,
      anciennityYears,
      isEligible: false,
      ineligibilityReason: SeveranceIneligibilityReason.GROSS_MISCONDUCT,
      calculatedDate,
      terminationDate,
      notes: 'Fratrædelsesgodtgørelse gives ikke ved grov misligholdelse/bortvisning',
    };
  }

  // 4. Check folkepensionsalder (typisk 67-68 år i Danmark)
  if (employee.birthDate) {
    const age = calculateAge(employee.birthDate);
    const pensionAge = 67; // Kunne være dynamisk baseret på fødselsår
    if (age >= pensionAge && SEVERANCE_RULES.CONDITIONS.EXCLUDE_PENSION_AGE) {
      return {
        employeeId: employee.id,
        anciennityMonths,
        anciennityYears,
        isEligible: false,
        ineligibilityReason: SeveranceIneligibilityReason.PENSION_AGE,
        calculatedDate,
        terminationDate,
        notes: `Fratrædelsesgodtgørelse gives ikke efter folkepensionsalder (${pensionAge} år)`,
      };
    }
  }

  // Beregn antal månedslønninger
  let severanceMonths: number;

  if (anciennityMonths < 180) {
    // 12-14 år
    severanceMonths = SEVERANCE_RULES.SEVERANCE_AMOUNTS.MONTHS_144_TO_179;
  } else if (anciennityMonths < 216) {
    // 15-17 år
    severanceMonths = SEVERANCE_RULES.SEVERANCE_AMOUNTS.MONTHS_180_TO_215;
  } else {
    // 18+ år
    severanceMonths = SEVERANCE_RULES.SEVERANCE_AMOUNTS.MONTHS_216_PLUS;
  }

  // Beregn månedsløn (basis for godtgørelse)
  const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
  const dailyHours = 7.4; // Standard daglig arbejdstid
  const dailyPay = effectiveHourlyWage * dailyHours;

  // Antag 21.67 arbejdsdage per måned i gennemsnit (260 dage / 12 måneder)
  const monthlyWorkingDays = 21.67;
  const monthlySalary = new Decimal(dailyPay).mul(monthlyWorkingDays);

  // Total godtgørelse
  const totalSeverancePay = monthlySalary.mul(severanceMonths);

  logger.info('Calculated severance pay', {
    employeeId: employee.id,
    anciennityYears,
    severanceMonths,
    monthlySalary: monthlySalary.toNumber(),
    totalSeverancePay: totalSeverancePay.toNumber(),
  });

  return {
    employeeId: employee.id,
    anciennityMonths,
    anciennityYears,
    isEligible: true,
    severanceMonths,
    monthlySalary,
    totalSeverancePay,
    calculatedDate,
    terminationDate,
    reason,
    notes: `Berettiget til ${severanceMonths} månedsløn${severanceMonths > 1 ? 'ninger' : ''} ved fratræden`,
  };
}

/**
 * Checker berettigelse til fratrædelsesgodtgørelse (hurtig check)
 */
export function checkSeveranceEligibility(
  employee: Employee,
  terminationInitiator: TerminationInitiator,
  wasGrossMisconduct: boolean = false
): {
  isEligible: boolean;
  reason: string;
} {
  const anciennityMonths = employee.anciennity;
  const minMonths = SEVERANCE_RULES.MINIMUM_ANCIENNITY_MONTHS;

  // Check anciennitet
  if (anciennityMonths < minMonths) {
    return {
      isEligible: false,
      reason: `Kræver minimum ${minMonths / 12} års anciennitet (har ${Math.floor(anciennityMonths / 12)} år)`,
    };
  }

  // Check initiator
  if (terminationInitiator !== TerminationInitiator.EMPLOYER) {
    return {
      isEligible: false,
      reason: 'Kun berettiget ved opsigelse fra arbejdsgiver',
    };
  }

  // Check misligholdelse
  if (wasGrossMisconduct) {
    return {
      isEligible: false,
      reason: 'Ikke berettiget ved grov misligholdelse',
    };
  }

  // Check alder
  if (employee.birthDate) {
    const age = calculateAge(employee.birthDate);
    if (age >= 67) {
      return {
        isEligible: false,
        reason: 'Ikke berettiget efter folkepensionsalder',
      };
    }
  }

  return {
    isEligible: true,
    reason: 'Opfylder krav til fratrædelsesgodtgørelse',
  };
}

/**
 * Validerer fratrædelsesgodtgørelse beregning
 */
export function validateSeverancePayment(
  employee: Employee,
  severanceCalculation: SeverancePayCalculation,
  terminationDate: Date
): SeveranceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check at medarbejderen er berettiget
  if (!severanceCalculation.isEligible) {
    errors.push(
      `Medarbejder er ikke berettiget til fratrædelsesgodtgørelse: ${severanceCalculation.notes}`
    );
  }

  // 2. Check at beløbet er positivt
  if (severanceCalculation.totalSeverancePay && severanceCalculation.totalSeverancePay.lte(0)) {
    errors.push('Fratrædelsesgodtgørelse skal være positiv');
  }

  // 3. Check at terminationDate er i fremtiden eller max 6 måneder tilbage
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (terminationDate < sixMonthsAgo) {
    warnings.push('Fratrædelsesvarslet er mere end 6 måneder gammel');
  }

  // 4. Advarsel om skat
  if (severanceCalculation.isEligible && SEVERANCE_RULES.PAYMENT.TAXABLE) {
    warnings.push(
      'Fratrædelsesgodtgørelse er skattepligtig - husk korrekt skattetræk'
    );
  }

  // 5. Check at anciennitet matcher
  if (employee.anciennity !== severanceCalculation.anciennityMonths) {
    errors.push(
      'Anciennitet i beregning matcher ikke medarbejderens aktuelle anciennitet'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Genererer fratrædelsesgodtgørelse dokument
 */
export function generateSeveranceDocument(
  employee: Employee,
  severanceCalculation: SeverancePayCalculation
): {
  employeeName: string;
  employeeNumber: string;
  anciennity: string;
  severanceMonths: number;
  monthlySalary: Decimal;
  totalSeverancePay: Decimal;
  terminationDate?: Date;
  reason?: string;
  calculatedDate: Date;
  taxNote: string;
} {
  if (!severanceCalculation.isEligible) {
    throw new Error(
      `Kan ikke generere dokument - medarbejder ikke berettiget: ${severanceCalculation.notes}`
    );
  }

  const anciennityYears = Math.floor(severanceCalculation.anciennityMonths / 12);
  const anciennityMonthsRemainder = severanceCalculation.anciennityMonths % 12;

  let anciennityStr = `${anciennityYears} år`;
  if (anciennityMonthsRemainder > 0) {
    anciennityStr += ` og ${anciennityMonthsRemainder} måned${anciennityMonthsRemainder > 1 ? 'er' : ''}`;
  }

  return {
    employeeName: employee.userId, // Skulle ideelt være et name felt
    employeeNumber: employee.employeeNumber,
    anciennity: anciennityStr,
    severanceMonths: severanceCalculation.severanceMonths!,
    monthlySalary: severanceCalculation.monthlySalary!,
    totalSeverancePay: severanceCalculation.totalSeverancePay!,
    terminationDate: severanceCalculation.terminationDate,
    reason: severanceCalculation.reason,
    calculatedDate: severanceCalculation.calculatedDate,
    taxNote:
      'Fratrædelsesgodtgørelse er skattepligtig indkomst og skal indberettes til SKAT',
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
 * Formaterer fratrædelsesgodtgørelse beløb
 */
export function formatSeveranceAmount(amount: Decimal): string {
  return `${amount.toFixed(2)} kr.`;
}

/**
 * Beregner fratrædelsesgodtgørelse for flere medarbejdere (bulk)
 */
export function calculateSeverancePayBulk(
  employees: Employee[],
  terminationInitiator: TerminationInitiator,
  terminationDate: Date,
  reason?: SeveranceReason
): SeverancePayCalculation[] {
  const calculations: SeverancePayCalculation[] = [];

  for (const employee of employees) {
    const calculation = calculateSeverancePay(
      employee,
      terminationInitiator,
      terminationDate,
      reason
    );
    calculations.push(calculation);
  }

  return calculations;
}

/**
 * Beregner total fratrædelsesgodtgørelse udgift
 */
export function calculateTotalSeveranceCost(
  calculations: SeverancePayCalculation[]
): {
  totalEmployees: number;
  eligibleEmployees: number;
  ineligibleEmployees: number;
  totalCost: Decimal;
  averageCostPerEligible: Decimal;
} {
  const eligible = calculations.filter((c) => c.isEligible);
  const ineligible = calculations.filter((c) => !c.isEligible);

  const totalCost = eligible.reduce(
    (sum, calc) => sum.add(calc.totalSeverancePay || new Decimal(0)),
    new Decimal(0)
  );

  const averageCostPerEligible =
    eligible.length > 0 ? totalCost.div(eligible.length) : new Decimal(0);

  return {
    totalEmployees: calculations.length,
    eligibleEmployees: eligible.length,
    ineligibleEmployees: ineligible.length,
    totalCost,
    averageCostPerEligible,
  };
}
