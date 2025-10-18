/**
 * Tests for Competence Development Service
 * § 23 Kompetenceudvikling
 */

import {
  calculateEducationLeave,
  validateEducationRequest,
  createEducationRequest,
  approveEducationRequest,
  rejectEducationRequest,
  postponeEducationRequest,
  completeEducationRequest,
  calculateTotalEducationCost,
  createDevelopmentPlan,
  formatEducationType,
  formatEducationStatus,
  COMPETENCE_DEVELOPMENT_RULES,
  EducationType,
  EducationStatus,
} from '../../services/competenceDevelopmentService';
import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock allowanceCalculationService
jest.mock('../../services/allowanceCalculationService', () => ({
  calculateEffectiveHourlyWage: jest.fn().mockReturnValue(150),
}));

// Mock employee factory
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-employee-id',
  userId: 'test-user-id',
  cprNumber: null,
  employeeNumber: 'EMP001',
  jobCategory: JobCategory.DRIVER,
  agreementType: AgreementType.DRIVER_AGREEMENT,
  employmentDate: new Date('2020-01-01'),
  anciennity: 60,
  workTimeType: WorkTimeType.HOURLY,
  baseSalary: new Decimal(150),
  department: null,
  location: null,
  postalCode: '2000',
  hasDriverLicense: true,
  driverLicenseNumber: null,
  driverLicenseExpiry: null,
  hasTachographCard: false,
  tachographCardNumber: null,
  tachographCardExpiry: null,
  hasForkliftCertificate: false,
  hasCraneCertificate: false,
  hasADRCertificate: false,
  adrCertificateType: null,
  hasVocationalDegree: false,
  vocationalDegreeType: null,
  localSalaryAgreement: null,
  isYouthWorker: false,
  birthDate: new Date('1985-01-01'),
  useSpecialSavings: false,
  seniorSchemeActive: false,
  seniorDaysPerYear: 0,
  seniorPensionConversion: new Decimal(0),
  isCrossBorderDriver: false,
  isFixedCrossBorder: false,
  isApprentice: false,
  apprenticeYear: null,
  isAdultApprentice: false,
  isEGUStudent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CompetenceDevelopmentService', () => {
  describe('Self-Selected Education', () => {
    it('should calculate unpaid leave for self-selected education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03'); // 3 days

      const result = await calculateEducationLeave(
        employee,
        EducationType.SELF_SELECTED,
        startDate,
        endDate
      );

      expect(result.type).toBe(EducationType.SELF_SELECTED);
      expect(result.daysCount).toBe(3);
      expect(result.isPaid).toBe(false);
      expect(result.totalPay).toBeUndefined();
      expect(result.requiresApproval).toBe(true);
    });

    it('should calculate remaining days for self-selected education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-02'); // 2 days

      const result = await calculateEducationLeave(
        employee,
        EducationType.SELF_SELECTED,
        startDate,
        endDate
      );

      expect(result.daysUsedThisYear).toBe(0);
      expect(result.daysRemainingThisYear).toBe(5); // Max 5 days
    });

    it('should set approval deadline for self-selected education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-02');

      const result = await calculateEducationLeave(
        employee,
        EducationType.SELF_SELECTED,
        startDate,
        endDate
      );

      expect(result.approvalDeadline).toBeDefined();
      // Should be 14 days before start
      const expectedDeadline = new Date(startDate);
      expectedDeadline.setDate(expectedDeadline.getDate() - 14);
      expect(result.approvalDeadline?.getTime()).toBe(expectedDeadline.getTime());
    });
  });

  describe('Agreed Education', () => {
    it('should calculate paid leave for agreed education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-05'); // 5 days

      const result = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate
      );

      expect(result.type).toBe(EducationType.AGREED);
      expect(result.daysCount).toBe(5);
      expect(result.isPaid).toBe(true);
      expect(result.dailyPay).toBeDefined();
      expect(result.totalPay).toBeDefined();
      // Hourly wage 150 * 7.4 hours = 1110/day
      // 5 days = 5550
      expect(result.totalPay!.toNumber()).toBeCloseTo(5550, 0);
    });

    it('should include course fees in total cost', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03');
      const courseFees = 5000;

      const result = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate,
        courseFees
      );

      expect(result.courseFees).toBeDefined();
      expect(result.courseFees!.toNumber()).toBe(5000);
      expect(result.totalCost).toBeDefined();
      // Total = salary (3 * 1110 = 3330) + course fees (5000) = 8330
      expect(result.totalCost!.toNumber()).toBeCloseTo(8330, 0);
    });

    it('should include travel expenses in total cost', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03');
      const courseFees = 5000;
      const travelExpenses = 2000;

      const result = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate,
        courseFees,
        travelExpenses
      );

      expect(result.travelExpenses).toBeDefined();
      expect(result.travelExpenses!.toNumber()).toBe(2000);
      // Total = salary (3330) + course fees (5000) + travel (2000) = 10330
      expect(result.totalCost!.toNumber()).toBeCloseTo(10330, 0);
    });
  });

  describe('Mandatory Education', () => {
    it('should calculate paid leave for mandatory education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-02'); // 2 days

      const result = await calculateEducationLeave(
        employee,
        EducationType.MANDATORY,
        startDate,
        endDate
      );

      expect(result.type).toBe(EducationType.MANDATORY);
      expect(result.isPaid).toBe(true);
      expect(result.totalPay).toBeDefined();
    });
  });

  describe('Certification Renewal', () => {
    it('should calculate paid leave for certification renewal', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-01'); // 1 day

      const result = await calculateEducationLeave(
        employee,
        EducationType.CERTIFICATION_RENEWAL,
        startDate,
        endDate
      );

      expect(result.type).toBe(EducationType.CERTIFICATION_RENEWAL);
      expect(result.isPaid).toBe(true);
      expect(result.daysCount).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate valid education request', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03');

      const calculation = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate
      );

      const validation = validateEducationRequest(employee, calculation);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject if start date is after end date', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-05');
      const endDate = new Date('2025-09-01'); // Before start

      const calculation = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate
      );

      const validation = validateEducationRequest(employee, calculation);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('før slutdato'))).toBe(true);
    });

    it('should warn about high cost education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03');
      const courseFees = 15000; // High cost

      const calculation = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate,
        courseFees
      );

      const validation = validateEducationRequest(employee, calculation);

      expect(validation.warnings.some((w) => w.includes('10.000 kr'))).toBe(true);
    });

    it('should warn about long duration', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-10-05'); // 35 days

      const calculation = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate
      );

      const validation = validateEducationRequest(employee, calculation);

      expect(validation.warnings.some((w) => w.includes('30 dage'))).toBe(true);
    });

    it('should reject if less than 1 day', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-08-31'); // Creates negative days

      const calculation = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate
      );

      const validation = validateEducationRequest(employee, calculation);

      expect(validation.isValid).toBe(false);
    });
  });

  describe('Education Request Creation', () => {
    it('should create valid education request', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03');

      const request = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Advanced Driving Course',
        'Training Academy',
        startDate,
        endDate,
        'Improve driving skills'
      );

      expect(request.employeeId).toBe(employee.id);
      expect(request.courseName).toBe('Advanced Driving Course');
      expect(request.courseProvider).toBe('Training Academy');
      expect(request.status).toBe(EducationStatus.REQUESTED);
      expect(request.daysCount).toBe(3);
    });

    it('should reject invalid education request', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-05');
      const endDate = new Date('2025-09-01'); // Invalid

      await expect(
        createEducationRequest(
          employee,
          EducationType.AGREED,
          'Course',
          'Provider',
          startDate,
          endDate
        )
      ).rejects.toThrow('Ugyldig uddannelsesanmodning');
    });
  });

  describe('Request Approval', () => {
    it('should approve education request', async () => {
      const employee = createMockEmployee();
      // Use a future date to ensure validation passes
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 2);

      const request = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Course',
        'Provider',
        futureDate,
        endDate
      );

      const approved = approveEducationRequest(request, 'manager-id');

      expect(approved.status).toBe(EducationStatus.APPROVED);
      expect(approved.approvedBy).toBe('manager-id');
      expect(approved.approvedDate).toBeDefined();
    });

    it('should reject already approved request', async () => {
      const employee = createMockEmployee();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 2);

      const request = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Course',
        'Provider',
        futureDate,
        endDate
      );

      const approved = approveEducationRequest(request, 'manager-id');

      expect(() => approveEducationRequest(approved, 'manager-id')).toThrow(
        'skal være REQUESTED'
      );
    });
  });

  describe('Request Rejection', () => {
    it('should reject education request', async () => {
      const employee = createMockEmployee();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 2);

      const request = await createEducationRequest(
        employee,
        EducationType.SELF_SELECTED,
        'Course',
        'Provider',
        futureDate,
        endDate
      );

      const rejected = rejectEducationRequest(
        request,
        'Not relevant to job',
        'manager-id'
      );

      expect(rejected.status).toBe(EducationStatus.REJECTED);
      expect(rejected.rejectionReason).toBe('Not relevant to job');
    });
  });

  describe('Request Postponement', () => {
    it('should postpone self-selected education request', async () => {
      const employee = createMockEmployee();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 2);

      const request = await createEducationRequest(
        employee,
        EducationType.SELF_SELECTED,
        'Course',
        'Provider',
        futureDate,
        endDate
      );

      const postponed = postponeEducationRequest(
        request,
        'Operational needs',
        'manager-id'
      );

      expect(postponed.status).toBe(EducationStatus.POSTPONED);
      expect(postponed.rejectionReason).toBe('Operational needs');
    });

    it('should not allow postponing agreed education', async () => {
      const employee = createMockEmployee();
      const request = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Course',
        'Provider',
        new Date('2025-09-01'),
        new Date('2025-09-03')
      );

      expect(() =>
        postponeEducationRequest(request, 'Operational needs', 'manager-id')
      ).toThrow('Kun selvvalgt uddannelse');
    });
  });

  describe('Request Completion', () => {
    it('should complete education request', async () => {
      const employee = createMockEmployee();
      const request = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Course',
        'Provider',
        new Date('2025-09-01'),
        new Date('2025-09-03')
      );

      const approved = approveEducationRequest(request, 'manager-id');
      const completed = completeEducationRequest(
        approved,
        new Date('2025-09-03'),
        'certificate-123'
      );

      expect(completed.status).toBe(EducationStatus.COMPLETED);
      expect(completed.completionDate).toBeDefined();
      expect(completed.completionCertificate).toBe('certificate-123');
    });

    it('should not complete unapproved request', async () => {
      const employee = createMockEmployee();
      const request = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Course',
        'Provider',
        new Date('2025-09-01'),
        new Date('2025-09-03')
      );

      expect(() =>
        completeEducationRequest(request, new Date('2025-09-03'))
      ).toThrow('skal være APPROVED');
    });
  });

  describe('Total Cost Calculation', () => {
    it('should calculate total education costs', async () => {
      const employee = createMockEmployee();

      const calc1 = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        new Date('2025-09-01'),
        new Date('2025-09-03'),
        5000
      );

      const calc2 = await calculateEducationLeave(
        employee,
        EducationType.SELF_SELECTED,
        new Date('2025-10-01'),
        new Date('2025-10-02')
      );

      const totals = calculateTotalEducationCost([calc1, calc2]);

      expect(totals.totalRequests).toBe(2);
      expect(totals.paidEducation).toBe(1);
      expect(totals.unpaidEducation).toBe(1);
      expect(totals.totalSalaryCost.toNumber()).toBeGreaterThan(0);
      expect(totals.totalCourseFees.toNumber()).toBe(5000);
    });

    it('should handle empty calculations', () => {
      const totals = calculateTotalEducationCost([]);

      expect(totals.totalRequests).toBe(0);
      expect(totals.totalCost.toNumber()).toBe(0);
      expect(totals.averageCostPerEducation.toNumber()).toBe(0);
    });
  });

  describe('Development Plan', () => {
    it('should create development plan', async () => {
      const employee = createMockEmployee();

      const futureDate1 = new Date();
      futureDate1.setMonth(futureDate1.getMonth() + 2);
      const endDate1 = new Date(futureDate1);
      endDate1.setDate(endDate1.getDate() + 2);

      const futureDate2 = new Date();
      futureDate2.setMonth(futureDate2.getMonth() + 3);
      const endDate2 = new Date(futureDate2);
      endDate2.setDate(endDate2.getDate() + 1);

      const request1 = await createEducationRequest(
        employee,
        EducationType.AGREED,
        'Course 1',
        'Provider',
        futureDate1,
        endDate1,
        'Reason',
        5000
      );

      const request2 = await createEducationRequest(
        employee,
        EducationType.SELF_SELECTED,
        'Course 2',
        'Provider',
        futureDate2,
        endDate2,
        'Reason',
        2000
      );

      const plan = createDevelopmentPlan(employee, 2025, [request1, request2]);

      expect(plan.employeeId).toBe(employee.id);
      expect(plan.year).toBe(2025);
      expect(plan.plannedEducations.length).toBe(2);
      expect(plan.totalPlannedDays).toBe(5); // 3 + 2
      expect(plan.totalEstimatedCost.toNumber()).toBe(7000);
    });
  });

  describe('Formatting', () => {
    it('should format education types', () => {
      expect(formatEducationType(EducationType.SELF_SELECTED)).toBe(
        'Selvvalgt uddannelse'
      );
      expect(formatEducationType(EducationType.AGREED)).toBe('Aftalt uddannelse');
      expect(formatEducationType(EducationType.MANDATORY)).toBe(
        'Obligatorisk uddannelse'
      );
      expect(formatEducationType(EducationType.CERTIFICATION_RENEWAL)).toBe(
        'Certificering/fornyelse'
      );
    });

    it('should format education statuses', () => {
      expect(formatEducationStatus(EducationStatus.REQUESTED)).toBe('Anmodet');
      expect(formatEducationStatus(EducationStatus.APPROVED)).toBe('Godkendt');
      expect(formatEducationStatus(EducationStatus.REJECTED)).toBe('Afvist');
      expect(formatEducationStatus(EducationStatus.POSTPONED)).toBe('Udskudt');
      expect(formatEducationStatus(EducationStatus.COMPLETED)).toBe('Gennemført');
      expect(formatEducationStatus(EducationStatus.CANCELLED)).toBe('Annulleret');
    });
  });

  describe('Constants Validation', () => {
    it('should have correct self-selected rules', () => {
      expect(COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.MAX_DAYS_PER_YEAR).toBe(5);
      expect(COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.PAID).toBe(false);
      expect(COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.REQUIRES_APPROVAL).toBe(
        true
      );
      expect(COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.ADVANCE_NOTICE_DAYS).toBe(
        14
      );
      expect(COMPETENCE_DEVELOPMENT_RULES.SELF_SELECTED.CAN_BE_POSTPONED).toBe(true);
    });

    it('should have correct agreed education rules', () => {
      expect(COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.PAID).toBe(true);
      expect(COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.PAY_PERCENTAGE).toBe(100);
      expect(
        COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.REQUIRES_MUTUAL_AGREEMENT
      ).toBe(true);
      expect(
        COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.INCLUDES_TRAVEL_EXPENSES
      ).toBe(true);
      expect(COMPETENCE_DEVELOPMENT_RULES.AGREED_EDUCATION.INCLUDES_COURSE_FEES).toBe(
        true
      );
    });

    it('should have correct qualification rules', () => {
      expect(
        COMPETENCE_DEVELOPMENT_RULES.QUALIFICATIONS.EMPLOYER_PAYS_MANDATORY
      ).toBe(true);
      expect(COMPETENCE_DEVELOPMENT_RULES.QUALIFICATIONS.INCLUDES_DRIVER_LICENSE).toBe(
        true
      );
      expect(COMPETENCE_DEVELOPMENT_RULES.QUALIFICATIONS.INCLUDES_ADR).toBe(true);
      expect(COMPETENCE_DEVELOPMENT_RULES.QUALIFICATIONS.INCLUDES_FORKLIFT).toBe(
        true
      );
      expect(COMPETENCE_DEVELOPMENT_RULES.QUALIFICATIONS.INCLUDES_CRANE).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single day education', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-09-01');

      const result = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        date,
        date
      );

      expect(result.daysCount).toBe(1);
    });

    it('should handle education spanning month boundary', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-08-30');
      const endDate = new Date('2025-09-02');

      const result = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate
      );

      expect(result.daysCount).toBe(4);
    });

    it('should handle zero cost education', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-03');

      const result = await calculateEducationLeave(
        employee,
        EducationType.AGREED,
        startDate,
        endDate,
        0,
        0
      );

      expect(result.courseFees!.toNumber()).toBe(0);
      expect(result.travelExpenses!.toNumber()).toBe(0);
    });
  });
});
