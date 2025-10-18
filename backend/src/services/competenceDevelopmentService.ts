/**
 * § 23 Kompetenceudvikling - Competence Development Service
 *
 * Håndterer:
 * - Selvvalgt uddannelse (self-selected education)
 * - Aftalt uddannelse (agreed education with employer)
 * - Uddannelsesfrihed og betaling
 * - Kompetenceudviklingsplaner
 * - Dokumentation og godkendelse
 * - Opfølgning og evaluering
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 23
 */

import prisma from '../config/database';
import { Employee } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateEffectiveHourlyWage } from './allowanceCalculationService';

// § 23 Kompetenceudvikling regler
export const COMPETENCE_DEVELOPMENT_RULES = {
  // Selvvalgt uddannelse
  SELF_SELECTED: {
    MAX_DAYS_PER_YEAR: 5, // 5 dage per år
    PAID: false, // Ulønnet frihed
    REQUIRES_APPROVAL: true, // Kræver forhåndsgodkendelse
    ADVANCE_NOTICE_DAYS: 14, // 14 dages varsel
    CAN_BE_POSTPONED: true, // Arbejdsgiver kan udskyde ved driftsmæssige forhold
  },

  // Aftalt uddannelse
  AGREED_EDUCATION: {
    PAID: true, // Løn under uddannelse
    PAY_PERCENTAGE: 100, // Fuld løn
    REQUIRES_MUTUAL_AGREEMENT: true, // Kræver aftale mellem medarbejder og arbejdsgiver
    DOCUMENTATION_REQUIRED: true, // Kræver dokumentation
    INCLUDES_TRAVEL_EXPENSES: true, // Dækker rejseudgifter
    INCLUDES_COURSE_FEES: true, // Dækker kursusgebyrer
  },

  // Kompetenceudviklingssamtaler
  DEVELOPMENT_MEETINGS: {
    ANNUAL_MEETING: true, // Årlig kompetenceudviklingssamtale
    OPTIONAL: true, // Frivillig for medarbejder
    DOCUMENTED: true, // Skal dokumenteres
  },

  // Kvalifikationer og certifikater
  QUALIFICATIONS: {
    EMPLOYER_PAYS_MANDATORY: true, // Arbejdsgiver betaler for påkrævede certifikater
    INCLUDES_DRIVER_LICENSE: true, // Kørekort
    INCLUDES_ADR: true, // ADR-certifikat
    INCLUDES_FORKLIFT: true, // Gaffeltruckbevis
    INCLUDES_CRANE: true, // Kranførerbevis
  },
};

export enum EducationType {
  SELF_SELECTED = 'SELF_SELECTED', // Selvvalgt uddannelse
  AGREED = 'AGREED', // Aftalt uddannelse
  MANDATORY = 'MANDATORY', // Obligatorisk/påkrævet
  CERTIFICATION_RENEWAL = 'CERTIFICATION_RENEWAL', // Certificering/fornyelse
}

export enum EducationStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  POSTPONED = 'POSTPONED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface EducationRequest {
  employeeId: string;
  type: EducationType;
  courseName: string;
  courseProvider: string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  isPaid: boolean;
  estimatedCost?: Decimal;
  reason?: string;
  status: EducationStatus;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
  completionDate?: Date;
  completionCertificate?: string;
}

export interface EducationCalculation {
  employeeId: string;
  type: EducationType;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  isPaid: boolean;
  dailyPay?: number;
  totalPay?: Decimal;
  courseFees?: Decimal;
  travelExpenses?: Decimal;
  totalCost?: Decimal;
  daysUsedThisYear: number;
  daysRemainingThisYear: number;
  requiresApproval: boolean;
  approvalDeadline?: Date;
}

export interface EducationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Beregner uddannelsesfrihed og omkostninger
 */
export async function calculateEducationLeave(
  employee: Employee,
  type: EducationType,
  startDate: Date,
  endDate: Date,
  courseFees?: number,
  travelExpenses?: number
): Promise<EducationCalculation> {
  // Beregn antal dage (inklusiv)
  const daysCount =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Tjek hvor mange dage der er brugt i år (kun for selvvalgt)
  const year = startDate.getFullYear();
  let daysUsedThisYear = 0;
  let daysRemainingThisYear = 0;

  if (type === EducationType.SELF_SELECTED) {
    daysUsedThisYear = await getEducationDaysUsedThisYear(employee.id, year, type);
    const maxDays = COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.MAX_DAYS_PER_YEAR;
    daysRemainingThisYear = Math.max(0, maxDays - daysUsedThisYear);
  }

  // Bestem om det er lønnet
  let isPaid = false;
  let dailyPay: number | undefined;
  let totalPay: Decimal | undefined;

  switch (type) {
    case EducationType.AGREED:
    case EducationType.MANDATORY:
      isPaid = COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.PAID;
      if (isPaid) {
        const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
        const dailyHours = 7.4;
        dailyPay = effectiveHourlyWage * dailyHours;
        totalPay = new Decimal(dailyPay).mul(daysCount);
      }
      break;

    case EducationType.SELF_SELECTED:
      isPaid = COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.PAID; // false
      break;

    case EducationType.CERTIFICATION_RENEWAL:
      // Certificering er typisk lønnet hvis det er arbejdsrelateret
      isPaid = true;
      const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);
      const dailyHours = 7.4;
      dailyPay = effectiveHourlyWage * dailyHours;
      totalPay = new Decimal(dailyPay).mul(daysCount);
      break;
  }

  // Beregn omkostninger
  let courseFeesDecimal: Decimal | undefined;
  let travelExpensesDecimal: Decimal | undefined;
  let totalCost: Decimal | undefined;

  if (type === EducationType.AGREED || type === EducationType.MANDATORY) {
    if (courseFees !== undefined) {
      courseFeesDecimal = new Decimal(courseFees);
    }
    if (travelExpenses !== undefined) {
      travelExpensesDecimal = new Decimal(travelExpenses);
    }

    // Total omkostning = løn + kursusgebyr + rejseudgifter
    totalCost = new Decimal(0);
    if (totalPay) totalCost = totalCost.add(totalPay);
    if (courseFeesDecimal) totalCost = totalCost.add(courseFeesDecimal);
    if (travelExpensesDecimal) totalCost = totalCost.add(travelExpensesDecimal);
  }

  // Kræver godkendelse?
  const requiresApproval =
    type === EducationType.SELF_SELECTED
      ? COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.REQUIRES_APPROVAL
      : COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.REQUIRES_MUTUAL_AGREEMENT;

  // Godkendelsesfrist (for selvvalgt)
  let approvalDeadline: Date | undefined;
  if (type === EducationType.SELF_SELECTED) {
    approvalDeadline = new Date(startDate);
    approvalDeadline.setDate(
      approvalDeadline.getDate() -
        COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.ADVANCE_NOTICE_DAYS
    );
  }

  logger.info('Calculated education leave', {
    employeeId: employee.id,
    type,
    daysCount,
    isPaid,
    totalPay: totalPay?.toNumber(),
    totalCost: totalCost?.toNumber(),
  });

  return {
    employeeId: employee.id,
    type,
    startDate,
    endDate,
    daysCount,
    isPaid,
    dailyPay,
    totalPay,
    courseFees: courseFeesDecimal,
    travelExpenses: travelExpensesDecimal,
    totalCost,
    daysUsedThisYear,
    daysRemainingThisYear,
    requiresApproval,
    approvalDeadline,
  };
}

/**
 * Henter antal uddannelsesdage brugt i år
 */
async function getEducationDaysUsedThisYear(
  employeeId: string,
  year: number,
  type: EducationType
): Promise<number> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  // I en rigtig implementation ville vi query absenceEntry eller education table
  // For nu returnerer vi 0
  return 0;
}

/**
 * Validerer uddannelsesanmodning
 */
export function validateEducationRequest(
  employee: Employee,
  calculation: EducationCalculation,
  requestDate: Date = new Date()
): EducationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check dato rækkefølge
  if (calculation.startDate >= calculation.endDate) {
    errors.push('Startdato skal være før slutdato');
  }

  // 2. Check fremtidig dato
  if (calculation.startDate < requestDate) {
    warnings.push('Uddannelse starter i fortiden eller i dag - bekræft timing');
  }

  // 3. For selvvalgt: Check max dage
  if (calculation.type === EducationType.SELF_SELECTED) {
    const maxDays = COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.MAX_DAYS_PER_YEAR;
    const totalDays = calculation.daysUsedThisYear + calculation.daysCount;

    if (totalDays > maxDays) {
      errors.push(
        `Selvvalgt uddannelse overstiger maksimum ${maxDays} dage per år (anmodet: ${calculation.daysCount}, allerede brugt: ${calculation.daysUsedThisYear})`
      );
    }

    // Check varsel
    if (calculation.approvalDeadline && calculation.approvalDeadline < requestDate) {
      errors.push(
        `Anmodning kommer for sent - skal indgives senest ${calculation.approvalDeadline.toISOString().split('T')[0]} (${COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.ADVANCE_NOTICE_DAYS} dage før start)`
      );
    }
  }

  // 4. Check varighed
  if (calculation.daysCount > 30) {
    warnings.push('Uddannelse varer mere end 30 dage - bekræft at dette er korrekt');
  }

  if (calculation.daysCount < 1) {
    errors.push('Uddannelse skal vare mindst 1 dag');
  }

  // 5. For aftalt uddannelse: Check dokumentation
  if (
    calculation.type === EducationType.AGREED &&
    COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.DOCUMENTATION_REQUIRED
  ) {
    warnings.push('Husk at vedlægge dokumentation for aftalt uddannelse');
  }

  // 6. Advarsel om omkostninger
  if (calculation.totalCost && calculation.totalCost.toNumber() > 10000) {
    warnings.push(
      `Uddannelse koster over 10.000 kr. (${calculation.totalCost.toFixed(2)} kr.) - godkendelse fra ledelse anbefales`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Opretter uddannelsesanmodning
 */
export async function createEducationRequest(
  employee: Employee,
  type: EducationType,
  courseName: string,
  courseProvider: string,
  startDate: Date,
  endDate: Date,
  reason?: string,
  estimatedCost?: number
): Promise<EducationRequest> {
  const calculation = await calculateEducationLeave(
    employee,
    type,
    startDate,
    endDate,
    estimatedCost
  );

  const validation = validateEducationRequest(employee, calculation);

  if (!validation.isValid) {
    throw new Error(`Ugyldig uddannelsesanmodning: ${validation.errors.join(', ')}`);
  }

  const request: EducationRequest = {
    employeeId: employee.id,
    type,
    courseName,
    courseProvider,
    startDate,
    endDate,
    daysCount: calculation.daysCount,
    isPaid: calculation.isPaid,
    estimatedCost: estimatedCost ? new Decimal(estimatedCost) : undefined,
    reason,
    status: EducationStatus.REQUESTED,
  };

  logger.info('Created education request', {
    employeeId: employee.id,
    type,
    courseName,
    startDate,
    endDate,
  });

  return request;
}

/**
 * Godkender uddannelsesanmodning
 */
export function approveEducationRequest(
  request: EducationRequest,
  approvedBy: string,
  approvedDate: Date = new Date()
): EducationRequest {
  if (request.status !== EducationStatus.REQUESTED) {
    throw new Error(
      `Kan ikke godkende anmodning med status ${request.status} - skal være REQUESTED`
    );
  }

  return {
    ...request,
    status: EducationStatus.APPROVED,
    approvedBy,
    approvedDate,
  };
}

/**
 * Afviser uddannelsesanmodning
 */
export function rejectEducationRequest(
  request: EducationRequest,
  rejectionReason: string,
  rejectedBy: string
): EducationRequest {
  if (request.status !== EducationStatus.REQUESTED) {
    throw new Error(
      `Kan ikke afvise anmodning med status ${request.status} - skal være REQUESTED`
    );
  }

  return {
    ...request,
    status: EducationStatus.REJECTED,
    rejectionReason,
    approvedBy: rejectedBy,
    approvedDate: new Date(),
  };
}

/**
 * Udsætter uddannelsesanmodning
 */
export function postponeEducationRequest(
  request: EducationRequest,
  postponeReason: string,
  postponedBy: string
): EducationRequest {
  if (request.status !== EducationStatus.REQUESTED) {
    throw new Error(
      `Kan ikke udskyde anmodning med status ${request.status} - skal være REQUESTED`
    );
  }

  // Kun selvvalgt uddannelse kan udskydes
  if (request.type !== EducationType.SELF_SELECTED) {
    throw new Error('Kun selvvalgt uddannelse kan udskydes af driftsmæssige årsager');
  }

  return {
    ...request,
    status: EducationStatus.POSTPONED,
    rejectionReason: postponeReason,
    approvedBy: postponedBy,
    approvedDate: new Date(),
  };
}

/**
 * Markerer uddannelse som gennemført
 */
export function completeEducationRequest(
  request: EducationRequest,
  completionDate: Date,
  completionCertificate?: string
): EducationRequest {
  if (request.status !== EducationStatus.APPROVED) {
    throw new Error(
      `Kan ikke gennemføre anmodning med status ${request.status} - skal være APPROVED`
    );
  }

  return {
    ...request,
    status: EducationStatus.COMPLETED,
    completionDate,
    completionCertificate,
  };
}

/**
 * Beregner total uddannelsesudgift for arbejdsgiver
 */
export function calculateTotalEducationCost(
  calculations: EducationCalculation[]
): {
  totalRequests: number;
  paidEducation: number;
  unpaidEducation: number;
  totalSalaryCost: Decimal;
  totalCourseFees: Decimal;
  totalTravelExpenses: Decimal;
  totalCost: Decimal;
  averageCostPerEducation: Decimal;
} {
  const paid = calculations.filter((c) => c.isPaid);
  const unpaid = calculations.filter((c) => !c.isPaid);

  const totalSalaryCost = calculations.reduce(
    (sum, calc) => sum.add(calc.totalPay || new Decimal(0)),
    new Decimal(0)
  );

  const totalCourseFees = calculations.reduce(
    (sum, calc) => sum.add(calc.courseFees || new Decimal(0)),
    new Decimal(0)
  );

  const totalTravelExpenses = calculations.reduce(
    (sum, calc) => sum.add(calc.travelExpenses || new Decimal(0)),
    new Decimal(0)
  );

  const totalCost = calculations.reduce(
    (sum, calc) => sum.add(calc.totalCost || new Decimal(0)),
    new Decimal(0)
  );

  const averageCostPerEducation =
    calculations.length > 0 ? totalCost.div(calculations.length) : new Decimal(0);

  return {
    totalRequests: calculations.length,
    paidEducation: paid.length,
    unpaidEducation: unpaid.length,
    totalSalaryCost,
    totalCourseFees,
    totalTravelExpenses,
    totalCost,
    averageCostPerEducation,
  };
}

/**
 * Genererer kompetenceudviklingsplan
 */
export interface DevelopmentPlan {
  employeeId: string;
  year: number;
  plannedEducations: EducationRequest[];
  totalPlannedDays: number;
  totalEstimatedCost: Decimal;
  createdDate: Date;
  lastUpdated: Date;
  notes?: string;
}

export function createDevelopmentPlan(
  employee: Employee,
  year: number,
  plannedEducations: EducationRequest[]
): DevelopmentPlan {
  const totalPlannedDays = plannedEducations.reduce(
    (sum, edu) => sum + edu.daysCount,
    0
  );

  const totalEstimatedCost = plannedEducations.reduce(
    (sum, edu) => sum.add(edu.estimatedCost || new Decimal(0)),
    new Decimal(0)
  );

  return {
    employeeId: employee.id,
    year,
    plannedEducations,
    totalPlannedDays,
    totalEstimatedCost,
    createdDate: new Date(),
    lastUpdated: new Date(),
  };
}

/**
 * Formaterer uddannelsestype
 */
export function formatEducationType(type: EducationType): string {
  switch (type) {
    case EducationType.SELF_SELECTED:
      return 'Selvvalgt uddannelse';
    case EducationType.AGREED:
      return 'Aftalt uddannelse';
    case EducationType.MANDATORY:
      return 'Obligatorisk uddannelse';
    case EducationType.CERTIFICATION_RENEWAL:
      return 'Certificering/fornyelse';
    default:
      return 'Ukendt type';
  }
}

/**
 * Formaterer status
 */
export function formatEducationStatus(status: EducationStatus): string {
  switch (status) {
    case EducationStatus.REQUESTED:
      return 'Anmodet';
    case EducationStatus.APPROVED:
      return 'Godkendt';
    case EducationStatus.REJECTED:
      return 'Afvist';
    case EducationStatus.POSTPONED:
      return 'Udskudt';
    case EducationStatus.COMPLETED:
      return 'Gennemført';
    case EducationStatus.CANCELLED:
      return 'Annulleret';
    default:
      return 'Ukendt status';
  }
}
