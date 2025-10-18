/**
 * § 2 Løn - Tillægsberegning Service
 *
 * Håndterer alle tillæg fra Transport- og Logistikoverenskomsten 2025-2028
 *
 * Tillæg omfatter:
 * - Chaufførtillæg (baseret på køretøjsvægt)
 * - Lager/Terminaltillæg (geografisk differentieret)
 * - Faglært tillæg (erhvervsuddannelse)
 * - Anciennitetstillæg (anciennitet i måneder)
 * - Ungarbejder reduktion (procentvis baseret på alder)
 * - Lokalløn (max kr. 2,50/time)
 * - Flyttetillæg
 * - Renovationstillæg
 * - Certifikattillæg (ADR, gaffeltruck, kran)
 */

import { Employee, JobCategory } from '@prisma/client';
import { logger } from '../config/logger';

// § 2 Tillægssatser (2025-2028)
export const ALLOWANCE_RATES = {
  // Chaufførtillæg (varierer baseret på køretøjsvægt)
  DRIVER: {
    LIGHT: 10.50,           // Under 3,5 tons
    MEDIUM: 15.00,          // 3,5-7,5 tons
    HEAVY: 22.50,           // Over 7,5 tons
    ARTICULATED: 28.00,     // Vogntog/lastbil med trailer
  },

  // Lager/Terminal tillæg
  WAREHOUSE: {
    COPENHAGEN: 18.00,      // Storkøbenhavn
    PROVINCE: 14.50,        // Provinsen
  },

  // Flyttearbejde
  MOVER: 20.00,             // Flyttetillæg kr./time

  // Renovation
  RENOVATION: 16.50,        // Renovationstillæg kr./time

  // Faglært tillæg
  VOCATIONAL_DEGREE: 12.00, // Erhvervsuddannelse kr./time

  // Anciennitetstillæg (pr. måned)
  SENIORITY: {
    PER_MONTH: 0.15,        // Kr. 0,15/time pr. måned (max 60 måneder)
    MAX_MONTHS: 60,         // Maksimalt 5 år (60 måneder)
  },

  // Certifikat tillæg
  CERTIFICATES: {
    ADR: 5.00,              // ADR certifikat kr./time
    FORKLIFT: 3.50,         // Gaffeltruck kr./time
    CRANE: 4.00,            // Kran kr./time
  },

  // Lokalløn max
  LOCAL_SALARY_MAX: 2.50,   // Max kr. 2,50/time

  // Ungarbejder procentvise tillæg (af grundløn)
  YOUTH_WORKER: {
    UNDER_18: 0.50,         // 50% af grundløn
    AGE_18: 0.70,           // 70% af grundløn
    AGE_19: 0.85,           // 85% af grundløn
    AGE_20_PLUS: 1.00,      // 100% af grundløn (fuld løn)
  },
};

// Geografiske postnumre for København vs. Provinsen
const COPENHAGEN_POSTAL_CODES = [
  // København og Frederiksberg
  ...Array.from({ length: 1000 }, (_, i) => (1000 + i).toString()), // 1000-1999
  ...Array.from({ length: 100 }, (_, i) => (2000 + i).toString()), // 2000-2099
  // Storkøbenhavn området
  '2100', '2200', '2300', '2400', '2450', '2500', '2600', '2650', '2700', '2720',
  '2730', '2750', '2770', '2800', '2820', '2830', '2840', '2850', '2860', '2870',
  '2880', '2900', '2920', '2930', '2942', '2950', '2960', '2970', '2980', '2990',
];

export interface AllowanceBreakdown {
  driverAllowance: number;
  warehouseAllowance: number;
  moverAllowance: number;
  renovationAllowance: number;
  vocationalDegreeAllowance: number;
  seniorityAllowance: number;
  certificateAllowances: {
    adr: number;
    forklift: number;
    crane: number;
  };
  localSalaryAllowance: number;
  youthWorkerPercentage: number;
  totalHourlyAllowance: number; // Sum af alle tillæg (ekskl. ungarbejder reduktion)
}

/**
 * Beregner alle § 2 tillæg for en medarbejder
 */
export function calculateAllowances(
  employee: Employee,
  vehicleWeightCategory?: 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'ARTICULATED'
): AllowanceBreakdown {
  const breakdown: AllowanceBreakdown = {
    driverAllowance: 0,
    warehouseAllowance: 0,
    moverAllowance: 0,
    renovationAllowance: 0,
    vocationalDegreeAllowance: 0,
    seniorityAllowance: 0,
    certificateAllowances: {
      adr: 0,
      forklift: 0,
      crane: 0,
    },
    localSalaryAllowance: 0,
    youthWorkerPercentage: 1.0,
    totalHourlyAllowance: 0,
  };

  // 1. Chaufførtillæg
  if (employee.jobCategory === JobCategory.DRIVER && employee.hasDriverLicense) {
    breakdown.driverAllowance = calculateDriverAllowance(vehicleWeightCategory);
  }

  // 2. Lager/Terminal tillæg
  if (
    employee.jobCategory === JobCategory.WAREHOUSE ||
    employee.jobCategory === JobCategory.TERMINAL
  ) {
    breakdown.warehouseAllowance = calculateWarehouseAllowance(employee.postalCode);
  }

  // 3. Flyttetillæg
  if (employee.jobCategory === JobCategory.MOVER) {
    breakdown.moverAllowance = ALLOWANCE_RATES.MOVER;
  }

  // 4. Renovationstillæg
  if (employee.jobCategory === JobCategory.RENOVATION) {
    breakdown.renovationAllowance = ALLOWANCE_RATES.RENOVATION;
  }

  // 5. Faglært tillæg
  if (employee.hasVocationalDegree) {
    breakdown.vocationalDegreeAllowance = ALLOWANCE_RATES.VOCATIONAL_DEGREE;
  }

  // 6. Anciennitetstillæg
  breakdown.seniorityAllowance = calculateSeniorityAllowance(employee.anciennity);

  // 7. Certifikat tillæg
  if (employee.hasADRCertificate) {
    breakdown.certificateAllowances.adr = ALLOWANCE_RATES.CERTIFICATES.ADR;
  }
  if (employee.hasForkliftCertificate) {
    breakdown.certificateAllowances.forklift = ALLOWANCE_RATES.CERTIFICATES.FORKLIFT;
  }
  if (employee.hasCraneCertificate) {
    breakdown.certificateAllowances.crane = ALLOWANCE_RATES.CERTIFICATES.CRANE;
  }

  // 8. Lokalløn (max kr. 2,50)
  if (employee.localSalaryAgreement) {
    const localSalary = Number(employee.localSalaryAgreement);
    breakdown.localSalaryAllowance = Math.min(localSalary, ALLOWANCE_RATES.LOCAL_SALARY_MAX);

    if (localSalary > ALLOWANCE_RATES.LOCAL_SALARY_MAX) {
      logger.warn(
        `Employee ${employee.id} har lokalløn på ${localSalary} kr./time, hvilket overstiger max ${ALLOWANCE_RATES.LOCAL_SALARY_MAX} kr./time`
      );
    }
  }

  // 9. Ungarbejder procentvise reduktion
  if (employee.isYouthWorker && employee.birthDate) {
    breakdown.youthWorkerPercentage = calculateYouthWorkerPercentage(employee.birthDate);
  }

  // Beregn total
  breakdown.totalHourlyAllowance =
    breakdown.driverAllowance +
    breakdown.warehouseAllowance +
    breakdown.moverAllowance +
    breakdown.renovationAllowance +
    breakdown.vocationalDegreeAllowance +
    breakdown.seniorityAllowance +
    breakdown.certificateAllowances.adr +
    breakdown.certificateAllowances.forklift +
    breakdown.certificateAllowances.crane +
    breakdown.localSalaryAllowance;

  logger.debug('Calculated allowances', {
    employeeId: employee.id,
    breakdown,
  });

  return breakdown;
}

/**
 * Beregner chaufførtillæg baseret på køretøjets vægt
 */
function calculateDriverAllowance(
  vehicleWeightCategory?: 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'ARTICULATED'
): number {
  if (!vehicleWeightCategory) {
    // Default til medium hvis ikke specificeret
    return ALLOWANCE_RATES.DRIVER.MEDIUM;
  }

  return ALLOWANCE_RATES.DRIVER[vehicleWeightCategory];
}

/**
 * Beregner lager/terminal tillæg baseret på geografisk placering
 */
function calculateWarehouseAllowance(postalCode: string | null): number {
  if (!postalCode) {
    // Default til provinsen hvis ikke specificeret
    return ALLOWANCE_RATES.WAREHOUSE.PROVINCE;
  }

  // Fjern mellemrum og whitespace
  const cleanPostalCode = postalCode.trim().replace(/\s/g, '');

  const isCopenhagenArea = COPENHAGEN_POSTAL_CODES.includes(cleanPostalCode);

  return isCopenhagenArea
    ? ALLOWANCE_RATES.WAREHOUSE.COPENHAGEN
    : ALLOWANCE_RATES.WAREHOUSE.PROVINCE;
}

/**
 * Beregner anciennitetstillæg
 * § 6 stk. 4: Kr. 0,15/time pr. måneds anciennitet (max 60 måneder)
 */
function calculateSeniorityAllowance(anciennityMonths: number): number {
  // Max 60 måneder (5 år)
  const effectiveMonths = Math.min(anciennityMonths, ALLOWANCE_RATES.SENIORITY.MAX_MONTHS);
  return effectiveMonths * ALLOWANCE_RATES.SENIORITY.PER_MONTH;
}

/**
 * Beregner ungarbejder procentvise løn baseret på alder
 * § 6 stk. 8: Ungarbejdere får procentvis løn baseret på alder
 */
function calculateYouthWorkerPercentage(birthDate: Date): number {
  const age = calculateAge(birthDate);

  if (age < 18) {
    return ALLOWANCE_RATES.YOUTH_WORKER.UNDER_18; // 50%
  } else if (age === 18) {
    return ALLOWANCE_RATES.YOUTH_WORKER.AGE_18; // 70%
  } else if (age === 19) {
    return ALLOWANCE_RATES.YOUTH_WORKER.AGE_19; // 85%
  } else {
    return ALLOWANCE_RATES.YOUTH_WORKER.AGE_20_PLUS; // 100%
  }
}

/**
 * Beregner alder baseret på fødselsdato
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Juster hvis fødselsdag ikke er nået endnu i år
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Beregner effektiv timeløn inkl. alle tillæg og ungarbejder reduktion
 */
export function calculateEffectiveHourlyWage(
  employee: Employee,
  vehicleWeightCategory?: 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'ARTICULATED'
): number {
  const baseSalary = Number(employee.baseSalary);
  const allowances = calculateAllowances(employee, vehicleWeightCategory);

  // For ungarbejdere: (Grundløn * procentdel) + tillæg
  // For almindelige medarbejdere: Grundløn + tillæg
  const effectiveBaseSalary = baseSalary * allowances.youthWorkerPercentage;
  const totalHourlyWage = effectiveBaseSalary + allowances.totalHourlyAllowance;

  logger.info('Calculated effective hourly wage', {
    employeeId: employee.id,
    baseSalary,
    youthWorkerPercentage: allowances.youthWorkerPercentage,
    effectiveBaseSalary,
    totalAllowances: allowances.totalHourlyAllowance,
    totalHourlyWage,
  });

  return totalHourlyWage;
}

/**
 * Validerer at medarbejderens tillæg er korrekt konfigureret
 */
export function validateEmployeeAllowanceConfiguration(employee: Employee): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Valider chaufførtillæg
  if (employee.jobCategory === JobCategory.DRIVER) {
    if (!employee.hasDriverLicense) {
      errors.push('Chauffør skal have kørekort');
    }
    if (employee.hasDriverLicense && !employee.driverLicenseNumber) {
      warnings.push('Kørekortnummer mangler');
    }
    if (employee.hasDriverLicense && employee.driverLicenseExpiry) {
      if (new Date(employee.driverLicenseExpiry) < new Date()) {
        errors.push('Kørekort er udløbet');
      }
    }
  }

  // Valider tachograf for chauffører
  if (employee.jobCategory === JobCategory.DRIVER && employee.hasTachographCard) {
    if (employee.tachographCardExpiry && new Date(employee.tachographCardExpiry) < new Date()) {
      errors.push('Tachografkort er udløbet');
    }
  }

  // Valider certifikater
  if (employee.hasADRCertificate && !employee.adrCertificateType) {
    warnings.push('ADR certifikattype mangler (Tank, Stykgods, Klasse 1, Klasse 7)');
  }

  // Valider faglært tillæg
  if (employee.hasVocationalDegree && !employee.vocationalDegreeType) {
    warnings.push('Type af erhvervsuddannelse mangler');
  }

  // Valider lokalløn
  if (employee.localSalaryAgreement) {
    const localSalary = Number(employee.localSalaryAgreement);
    if (localSalary > ALLOWANCE_RATES.LOCAL_SALARY_MAX) {
      warnings.push(
        `Lokalløn (${localSalary} kr./time) overstiger maksimum (${ALLOWANCE_RATES.LOCAL_SALARY_MAX} kr./time)`
      );
    }
    if (localSalary < 0) {
      errors.push('Lokalløn kan ikke være negativ');
    }
  }

  // Valider ungarbejder
  if (employee.isYouthWorker && !employee.birthDate) {
    errors.push('Ungarbejder skal have fødselsdato');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
