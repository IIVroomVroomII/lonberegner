/**
 * § 21 Opsigelsesregler - Termination Service
 *
 * Håndterer:
 * - Differentierede opsigelsesfrister (anciennitetsbaseret)
 * - Arbejdsgivers opsigelsesvarsler (længere end medarbejders)
 * - Medarbejders opsigelsesvarsler
 * - Beskyttelse under sygdom, barsel, mv.
 * - Beregning af fratrædelsesvarsler
 * - Validation af opsigelser
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 21
 */

import prisma from '../config/database';
import { Employee } from '@prisma/client';
import { logger } from '../config/logger';

// § 21 Opsigelsesregler
export const TERMINATION_RULES = {
  // Arbejdsgivers opsigelsesfrister (fra arbejdsgiver til medarbejder)
  EMPLOYER_NOTICE_PERIODS: {
    // Måneder baseret på anciennitet i måneder
    UNDER_6_MONTHS: 14, // 14 dages varsel (under 6 måneders anciennitet)
    MONTH_6_TO_36: 1, // 1 måned (6 mdr - 3 år)
    MONTH_36_TO_96: 3, // 3 måneder (3 år - 8 år)
    MONTH_96_TO_180: 4, // 4 måneder (8 år - 15 år)
    OVER_180_MONTHS: 6, // 6 måneder (over 15 år)
  },

  // Medarbejders opsigelsesfrister (fra medarbejder til arbejdsgiver)
  EMPLOYEE_NOTICE_PERIODS: {
    UNDER_6_MONTHS: 14, // 14 dages varsel
    OVER_6_MONTHS: 1, // 1 måned (konstant efter 6 måneder)
  },

  // Beskyttelse mod opsigelse
  PROTECTION: {
    DURING_SICKNESS: true, // Beskyttet under sygdom
    SICKNESS_PROTECTION_WEEKS: 26, // 26 ugers beskyttelse (ca. 6 måneder)
    DURING_MATERNITY: true, // Beskyttet under barsel
    MATERNITY_PROTECTION_WEEKS: 52, // 52 ugers beskyttelse (1 år)
    DURING_PREGNANCY: true, // Beskyttet under graviditet
  },

  // Fratræden til månedsskifte
  END_OF_MONTH: true, // Fratræden sker til månedsskifte
};

export enum TerminationInitiator {
  EMPLOYER = 'EMPLOYER', // Arbejdsgiver opsiger
  EMPLOYEE = 'EMPLOYEE', // Medarbejder opsiger
}

export enum TerminationProtectionReason {
  SICKNESS = 'SICKNESS',
  MATERNITY = 'MATERNITY',
  PREGNANCY = 'PREGNANCY',
  NONE = 'NONE',
}

export interface TerminationNotice {
  employeeId: string;
  initiator: TerminationInitiator;
  noticeDate: Date; // Dato hvor opsigelsen gives
  anciennityMonths: number;
  noticePeriodDays?: number; // For under 6 måneders anciennitet
  noticePeriodMonths?: number; // For over 6 måneders anciennitet
  lastWorkingDay: Date; // Sidste arbejdsdag
  terminationDate: Date; // Fratrædelsesvarslet (til månedsskifte)
  isProtected: boolean;
  protectionReason?: TerminationProtectionReason;
  protectionWarning?: string;
}

export interface TerminationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  protectionViolation?: {
    reason: TerminationProtectionReason;
    message: string;
  };
}

/**
 * Beregner opsigelsesvarsel
 */
export async function calculateTerminationNotice(
  employee: Employee,
  noticeDate: Date,
  initiator: TerminationInitiator
): Promise<TerminationNotice> {
  const anciennityMonths = employee.anciennity;

  let noticePeriodDays: number | undefined;
  let noticePeriodMonths: number | undefined;

  // Beregn varslingsperiode baseret på hvem der opsiger
  if (initiator === TerminationInitiator.EMPLOYER) {
    // Arbejdsgivers varsler (længere)
    if (anciennityMonths < 6) {
      noticePeriodDays = TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.UNDER_6_MONTHS;
    } else if (anciennityMonths < 36) {
      noticePeriodMonths = TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.MONTH_6_TO_36;
    } else if (anciennityMonths < 96) {
      noticePeriodMonths = TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.MONTH_36_TO_96;
    } else if (anciennityMonths < 180) {
      noticePeriodMonths = TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.MONTH_96_TO_180;
    } else {
      noticePeriodMonths = TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.OVER_180_MONTHS;
    }
  } else {
    // Medarbejders varsler (kortere)
    if (anciennityMonths < 6) {
      noticePeriodDays = TERMINATION_RULES.EMPLOYEE_NOTICE_PERIODS.UNDER_6_MONTHS;
    } else {
      noticePeriodMonths = TERMINATION_RULES.EMPLOYEE_NOTICE_PERIODS.OVER_6_MONTHS;
    }
  }

  // Beregn sidste arbejdsdag og fratrædelsesvarslet
  let lastWorkingDay: Date;

  if (noticePeriodDays) {
    // Dagesbaseret varsel (under 6 måneder)
    lastWorkingDay = new Date(noticeDate);
    lastWorkingDay.setDate(lastWorkingDay.getDate() + noticePeriodDays);
  } else {
    // Månedsbaseret varsel
    // For at undgå JavaScript's dato-normalisering (31. jan + 1 måned = 3. mar)
    // sætter vi først dagen til 1, tilføjer måneder, og finder så månedsskiftet
    lastWorkingDay = new Date(noticeDate.getFullYear(), noticeDate.getMonth(), 1);
    lastWorkingDay.setMonth(lastWorkingDay.getMonth() + noticePeriodMonths!);
  }

  // Fratræden til månedsskifte
  const terminationDate = getEndOfMonth(lastWorkingDay);

  // Check beskyttelse
  const protection = await checkTerminationProtection(employee.id, noticeDate);

  logger.info('Calculated termination notice', {
    employeeId: employee.id,
    initiator,
    noticeDate,
    anciennityMonths,
    noticePeriodDays,
    noticePeriodMonths,
    lastWorkingDay,
    terminationDate,
    isProtected: protection.isProtected,
  });

  return {
    employeeId: employee.id,
    initiator,
    noticeDate,
    anciennityMonths,
    noticePeriodDays,
    noticePeriodMonths,
    lastWorkingDay,
    terminationDate,
    isProtected: protection.isProtected,
    protectionReason: protection.reason,
    protectionWarning: protection.warning,
  };
}

/**
 * Checker om medarbejder er beskyttet mod opsigelse
 */
export async function checkTerminationProtection(
  employeeId: string,
  checkDate: Date = new Date()
): Promise<{
  isProtected: boolean;
  reason?: TerminationProtectionReason;
  warning?: string;
}> {
  // Check for aktiv sygdom
  const sicknessProtection = await checkSicknessProtection(employeeId, checkDate);
  if (sicknessProtection.isProtected) {
    return sicknessProtection;
  }

  // Check for aktiv barsel
  const maternityProtection = await checkMaternityProtection(employeeId, checkDate);
  if (maternityProtection.isProtected) {
    return maternityProtection;
  }

  // Check for graviditet (hvis vi har den information)
  // Dette kræver typisk manuel registrering
  // For nu returnerer vi ingen beskyttelse

  return {
    isProtected: false,
    reason: TerminationProtectionReason.NONE,
  };
}

/**
 * Checker beskyttelse under sygdom
 */
async function checkSicknessProtection(
  employeeId: string,
  checkDate: Date
): Promise<{
  isProtected: boolean;
  reason?: TerminationProtectionReason;
  warning?: string;
}> {
  if (!TERMINATION_RULES.PROTECTION.DURING_SICKNESS) {
    return { isProtected: false };
  }

  const protectionWeeks = TERMINATION_RULES.PROTECTION.SICKNESS_PROTECTION_WEEKS;
  const protectionDate = new Date(checkDate);
  protectionDate.setDate(protectionDate.getDate() - protectionWeeks * 7);

  // Find aktiv sygemelding
  const sickness = await prisma.absenceEntry.findFirst({
    where: {
      employeeId,
      type: 'SICKNESS',
      startDate: {
        lte: checkDate,
      },
      OR: [
        { endDate: null }, // Ikke afsluttet
        {
          endDate: {
            gte: checkDate,
          },
        },
      ],
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  // Double-check at sickness er aktuel (ikke afsluttet for længe siden)
  if (sickness) {
    const isCurrentlyOrRecentlySick =
      !sickness.endDate || // Stadig syg
      sickness.endDate >= checkDate || // Slutter i fremtiden eller i dag
      sickness.startDate >= protectionDate; // Startede inden for beskyttelsesperioden

    if (isCurrentlyOrRecentlySick && sickness.startDate >= protectionDate) {
      return {
        isProtected: true,
        reason: TerminationProtectionReason.SICKNESS,
        warning: `Medarbejder er beskyttet mod opsigelse under sygdom (beskyttelse i ${protectionWeeks} uger fra ${sickness.startDate.toISOString().split('T')[0]})`,
      };
    }
  }

  return { isProtected: false };
}

/**
 * Checker beskyttelse under barsel
 */
async function checkMaternityProtection(
  employeeId: string,
  checkDate: Date
): Promise<{
  isProtected: boolean;
  reason?: TerminationProtectionReason;
  warning?: string;
}> {
  if (!TERMINATION_RULES.PROTECTION.DURING_MATERNITY) {
    return { isProtected: false };
  }

  const protectionWeeks = TERMINATION_RULES.PROTECTION.MATERNITY_PROTECTION_WEEKS;
  const protectionDate = new Date(checkDate);
  protectionDate.setDate(protectionDate.getDate() - protectionWeeks * 7);

  // Find aktiv barsel
  const maternity = await prisma.absenceEntry.findFirst({
    where: {
      employeeId,
      type: {
        in: ['MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'SOCIAL_PARENT_LEAVE'],
      },
      startDate: {
        lte: checkDate,
      },
      OR: [
        { endDate: null },
        {
          endDate: {
            gte: checkDate,
          },
        },
      ],
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  if (maternity && maternity.startDate >= protectionDate) {
    return {
      isProtected: true,
      reason: TerminationProtectionReason.MATERNITY,
      warning: `Medarbejder er beskyttet mod opsigelse under barsel (beskyttelse i ${protectionWeeks} uger fra ${maternity.startDate.toISOString().split('T')[0]})`,
    };
  }

  return { isProtected: false };
}

/**
 * Validerer opsigelse
 */
export async function validateTermination(
  employee: Employee,
  noticeDate: Date,
  initiator: TerminationInitiator,
  reason?: string
): Promise<TerminationValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check beskyttelse
  const protection = await checkTerminationProtection(employee.id, noticeDate);

  if (protection.isProtected && initiator === TerminationInitiator.EMPLOYER) {
    return {
      isValid: false,
      errors: ['Opsigelse ikke tilladt - medarbejder er beskyttet'],
      warnings: [],
      protectionViolation: {
        reason: protection.reason!,
        message: protection.warning!,
      },
    };
  }

  // 2. Check at noticeDate ikke er i fortiden (mere end 1 dag)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (noticeDate < yesterday) {
    warnings.push('Opsigelsesdato er i fortiden');
  }

  // 3. Check at medarbejderen er aktiv
  // Dette kræver et isActive felt eller lignende
  // For nu springer vi dette over

  // 4. Anbefal begrundelse hvis arbejdsgiver opsiger
  if (initiator === TerminationInitiator.EMPLOYER && !reason) {
    warnings.push('Anbefaler at angive begrundelse for opsigelse');
  }

  // 5. Check anciennitet
  if (employee.anciennity < 1) {
    warnings.push(
      'Medarbejder har under 1 måneds anciennitet - specielle regler kan gælde i prøveperiode'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Beregner fratrædelsesgodtgørelse (hvis relevant - se § 22)
 */
export function calculateSeveranceEligibility(
  employee: Employee,
  terminationNotice: TerminationNotice
): {
  isEligible: boolean;
  reason: string;
} {
  // Fratrædelsesgodtgørelse kræver typisk:
  // - Minimum anciennitet (f.eks. 12-18 år)
  // - Opsigelse fra arbejdsgiver
  // - Ikke selv opsagt

  const minAnciennityMonths = 144; // 12 år

  if (terminationNotice.initiator !== TerminationInitiator.EMPLOYER) {
    return {
      isEligible: false,
      reason: 'Kun berettiget ved opsigelse fra arbejdsgiver',
    };
  }

  if (employee.anciennity < minAnciennityMonths) {
    return {
      isEligible: false,
      reason: `Kræver minimum ${minAnciennityMonths / 12} års anciennitet (har ${Math.floor(employee.anciennity / 12)} år)`,
    };
  }

  return {
    isEligible: true,
    reason: 'Opfylder krav til fratrædelsesgodtgørelse (se § 22)',
  };
}

/**
 * Hjælpefunktion: Find sidste dag i måned
 */
function getEndOfMonth(date: Date): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return lastDay;
}

/**
 * Beregner anciennitet i år (formateret)
 */
export function formatAnciennity(anciennityMonths: number): string {
  const years = Math.floor(anciennityMonths / 12);
  const months = anciennityMonths % 12;

  if (years === 0) {
    return `${months} måneder`;
  } else if (months === 0) {
    return `${years} år`;
  } else {
    return `${years} år og ${months} måneder`;
  }
}

/**
 * Genererer opsigelsesdokument data
 */
export async function generateTerminationDocument(
  employee: Employee,
  noticeDate: Date,
  initiator: TerminationInitiator,
  reason?: string
): Promise<{
  employeeName: string;
  employeeNumber: string;
  noticeDate: Date;
  initiator: TerminationInitiator;
  anciennity: string;
  noticePeriod: string;
  lastWorkingDay: Date;
  terminationDate: Date;
  reason?: string;
  isProtected: boolean;
  protectionWarning?: string;
}> {
  const notice = await calculateTerminationNotice(employee, noticeDate, initiator);

  let noticePeriodStr: string;
  if (notice.noticePeriodDays) {
    noticePeriodStr = `${notice.noticePeriodDays} dage`;
  } else {
    noticePeriodStr = `${notice.noticePeriodMonths} måned${notice.noticePeriodMonths! > 1 ? 'er' : ''}`;
  }

  return {
    employeeName: employee.userId, // Skulle ideelt være et name felt
    employeeNumber: employee.employeeNumber,
    noticeDate,
    initiator,
    anciennity: formatAnciennity(notice.anciennityMonths),
    noticePeriod: noticePeriodStr,
    lastWorkingDay: notice.lastWorkingDay,
    terminationDate: notice.terminationDate,
    reason,
    isProtected: notice.isProtected,
    protectionWarning: notice.protectionWarning,
  };
}
