/**
 * Tests for Termination Service
 * § 21 Opsigelsesregler
 */

import {
  calculateTerminationNotice,
  checkTerminationProtection,
  validateTermination,
  calculateSeveranceEligibility,
  formatAnciennity,
  TerminationInitiator,
  TerminationProtectionReason,
  TERMINATION_RULES,
} from '../../services/terminationService';
import { Employee, JobCategory, AgreementType, WorkTimeType, AbsenceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock employee factory
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-employee-id',
  userId: 'test-user-id',
  cprNumber: null,
  employeeNumber: 'EMP001',
  jobCategory: JobCategory.DRIVER,
  agreementType: AgreementType.DRIVER_AGREEMENT,
  employmentDate: new Date('2020-01-01'),
  anciennity: 60, // 5 years default
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

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    absenceEntry: {
      findFirst: jest.fn(),
    },
  },
}));

describe('TerminationService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    const prisma = require('../../config/database').default;
    prisma.absenceEntry.findFirst.mockResolvedValue(null);
  });

  describe('Employer Notice Periods', () => {
    it('should calculate 14 days notice for <6 months anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 3 }); // 3 months
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      expect(result.noticePeriodDays).toBe(14);
      expect(result.noticePeriodMonths).toBeUndefined();
    });

    it('should calculate 1 month notice for 6-36 months anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 24 }); // 2 years
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      expect(result.noticePeriodMonths).toBe(1);
      expect(result.noticePeriodDays).toBeUndefined();
    });

    it('should calculate 3 months notice for 3-8 years anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 60 }); // 5 years
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      expect(result.noticePeriodMonths).toBe(3);
    });

    it('should calculate 4 months notice for 8-15 years anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 120 }); // 10 years
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      expect(result.noticePeriodMonths).toBe(4);
    });

    it('should calculate 6 months notice for >15 years anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 240 }); // 20 years
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      expect(result.noticePeriodMonths).toBe(6);
    });
  });

  describe('Employee Notice Periods', () => {
    it('should calculate 14 days notice for <6 months anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 3 });
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYEE
      );

      expect(result.noticePeriodDays).toBe(14);
      expect(result.noticePeriodMonths).toBeUndefined();
    });

    it('should calculate 1 month notice for >6 months anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 12 }); // 1 year
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYEE
      );

      expect(result.noticePeriodMonths).toBe(1);
      expect(result.noticePeriodDays).toBeUndefined();
    });

    it('should maintain 1 month notice regardless of long anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 240 }); // 20 years
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYEE
      );

      // Employee always 1 month after 6 months
      expect(result.noticePeriodMonths).toBe(1);
    });
  });

  describe('Termination Date Calculation', () => {
    it('should calculate termination to end of month', async () => {
      const employee = createMockEmployee({ anciennity: 24 }); // 2 years, 1 month notice
      const noticeDate = new Date('2025-06-15'); // Mid-month

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // 1 month from June 15 = July 15, end of month = July 31
      expect(result.terminationDate.getMonth()).toBe(6); // July (0-indexed)
      expect(result.terminationDate.getDate()).toBe(31); // Last day of July
    });

    it('should handle termination at month end correctly', async () => {
      const employee = createMockEmployee({ anciennity: 60 }); // 5 years, 3 months notice
      const noticeDate = new Date('2025-01-31'); // End of January

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // 3 months from Jan 31 = Apr 30 (end of April)
      expect(result.terminationDate.getMonth()).toBe(3); // April
      expect(result.terminationDate.getDate()).toBe(30); // Last day of April
    });

    it('should calculate last working day correctly for day-based notice', async () => {
      const employee = createMockEmployee({ anciennity: 3 }); // 3 months, 14 days notice
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // 14 days from June 1 = June 15
      expect(result.lastWorkingDay.getDate()).toBe(15);
      expect(result.lastWorkingDay.getMonth()).toBe(5); // June
    });
  });

  describe('Protection During Sickness', () => {
    it('should detect protection during active sickness', async () => {
      const prisma = require('../../config/database').default;
      prisma.absenceEntry.findFirst.mockResolvedValue({
        id: '1',
        employeeId: 'test-employee-id',
        type: AbsenceType.SICKNESS,
        startDate: new Date('2025-05-01'),
        endDate: null, // Still sick
        daysCount: 10,
        isPaid: true,
        paymentAmount: new Decimal(10000),
        note: 'Sick',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkTerminationProtection('test-employee-id', new Date('2025-06-01'));

      expect(result.isProtected).toBe(true);
      expect(result.reason).toBe(TerminationProtectionReason.SICKNESS);
      expect(result.warning).toContain('beskyttet');
    });

    it('should not protect after sickness has ended beyond protection period', async () => {
      const prisma = require('../../config/database').default;
      // Sickness ended 27 weeks ago (beyond 26 week protection)
      const oldSickness = new Date();
      oldSickness.setDate(oldSickness.getDate() - 27 * 7);

      // First call (sickness check) returns old sickness, second call (maternity check) returns null
      prisma.absenceEntry.findFirst
        .mockResolvedValueOnce({
          id: '1',
          employeeId: 'test-employee-id',
          type: AbsenceType.SICKNESS,
          startDate: oldSickness,
          endDate: oldSickness,
          daysCount: 5,
          isPaid: true,
          paymentAmount: new Decimal(5000),
          note: 'Old sickness',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(null); // No maternity

      const result = await checkTerminationProtection('test-employee-id');

      expect(result.isProtected).toBe(false);
    });
  });

  describe('Protection During Maternity', () => {
    it('should detect protection during active maternity leave', async () => {
      const prisma = require('../../config/database').default;
      prisma.absenceEntry.findFirst.mockResolvedValueOnce(null); // No sickness
      prisma.absenceEntry.findFirst.mockResolvedValueOnce({
        id: '2',
        employeeId: 'test-employee-id',
        type: AbsenceType.MATERNITY_LEAVE,
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-09-01'),
        daysCount: 123,
        isPaid: true,
        paymentAmount: new Decimal(100000),
        note: 'Maternity',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkTerminationProtection('test-employee-id', new Date('2025-06-01'));

      expect(result.isProtected).toBe(true);
      expect(result.reason).toBe(TerminationProtectionReason.MATERNITY);
    });
  });

  describe('Validation', () => {
    it('should reject termination during sickness protection', async () => {
      const prisma = require('../../config/database').default;
      prisma.absenceEntry.findFirst.mockResolvedValue({
        id: '1',
        employeeId: 'test-employee-id',
        type: AbsenceType.SICKNESS,
        startDate: new Date('2025-05-01'),
        endDate: null,
        daysCount: 10,
        isPaid: true,
        paymentAmount: new Decimal(10000),
        note: 'Sick',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const employee = createMockEmployee();
      const result = await validateTermination(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYER
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.protectionViolation).toBeDefined();
      expect(result.protectionViolation?.reason).toBe(TerminationProtectionReason.SICKNESS);
    });

    it('should allow employee to terminate during sickness', async () => {
      const prisma = require('../../config/database').default;
      prisma.absenceEntry.findFirst.mockResolvedValue({
        id: '1',
        employeeId: 'test-employee-id',
        type: AbsenceType.SICKNESS,
        startDate: new Date('2025-05-01'),
        endDate: null,
        daysCount: 10,
        isPaid: true,
        paymentAmount: new Decimal(10000),
        note: 'Sick',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const employee = createMockEmployee();
      const result = await validateTermination(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYEE
      );

      // Employee can quit even when sick
      expect(result.isValid).toBe(true);
    });

    it('should warn about missing reason for employer termination', async () => {
      const employee = createMockEmployee();
      const result = await validateTermination(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYER
      );

      expect(result.warnings.some((w) => w.includes('begrundelse'))).toBe(true);
    });

    it('should warn about short anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 0 });
      const result = await validateTermination(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYER,
        'Test reason'
      );

      expect(result.warnings.some((w) => w.includes('under 1 måneds'))).toBe(true);
    });
  });

  describe('Severance Eligibility', () => {
    it('should not be eligible if employee terminates', async () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const notice = await calculateTerminationNotice(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYEE
      );

      const result = calculateSeveranceEligibility(employee, notice);

      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('arbejdsgiver');
    });

    it('should not be eligible with <12 years anciennity', async () => {
      const employee = createMockEmployee({ anciennity: 100 }); // ~8 years
      const notice = await calculateTerminationNotice(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYER
      );

      const result = calculateSeveranceEligibility(employee, notice);

      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('minimum');
    });

    it('should be eligible with 12+ years and employer termination', async () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const notice = await calculateTerminationNotice(
        employee,
        new Date('2025-06-01'),
        TerminationInitiator.EMPLOYER
      );

      const result = calculateSeveranceEligibility(employee, notice);

      expect(result.isEligible).toBe(true);
      expect(result.reason).toContain('Opfylder');
    });
  });

  describe('Anciennity Formatting', () => {
    it('should format months only', () => {
      expect(formatAnciennity(6)).toBe('6 måneder');
    });

    it('should format years only', () => {
      expect(formatAnciennity(24)).toBe('2 år');
    });

    it('should format years and months', () => {
      expect(formatAnciennity(30)).toBe('2 år og 6 måneder');
    });

    it('should format single year', () => {
      expect(formatAnciennity(12)).toBe('1 år');
    });

    it('should format single month', () => {
      expect(formatAnciennity(1)).toBe('1 måneder');
    });
  });

  describe('Constants Validation', () => {
    it('should have correct employer notice periods', () => {
      expect(TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.UNDER_6_MONTHS).toBe(14);
      expect(TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.MONTH_6_TO_36).toBe(1);
      expect(TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.MONTH_36_TO_96).toBe(3);
      expect(TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.MONTH_96_TO_180).toBe(4);
      expect(TERMINATION_RULES.EMPLOYER_NOTICE_PERIODS.OVER_180_MONTHS).toBe(6);
    });

    it('should have correct employee notice periods', () => {
      expect(TERMINATION_RULES.EMPLOYEE_NOTICE_PERIODS.UNDER_6_MONTHS).toBe(14);
      expect(TERMINATION_RULES.EMPLOYEE_NOTICE_PERIODS.OVER_6_MONTHS).toBe(1);
    });

    it('should have protection rules defined', () => {
      expect(TERMINATION_RULES.PROTECTION.DURING_SICKNESS).toBe(true);
      expect(TERMINATION_RULES.PROTECTION.SICKNESS_PROTECTION_WEEKS).toBe(26);
      expect(TERMINATION_RULES.PROTECTION.DURING_MATERNITY).toBe(true);
      expect(TERMINATION_RULES.PROTECTION.MATERNITY_PROTECTION_WEEKS).toBe(52);
    });

    it('should terminate to end of month', () => {
      expect(TERMINATION_RULES.END_OF_MONTH).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 6 months anciennity (boundary)', async () => {
      const employee = createMockEmployee({ anciennity: 6 });
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // Should use 1 month (>= 6 months)
      expect(result.noticePeriodMonths).toBe(1);
    });

    it('should handle exactly 36 months anciennity (boundary)', async () => {
      const employee = createMockEmployee({ anciennity: 36 });
      const noticeDate = new Date('2025-06-01');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // Should use 3 months (>= 36 months)
      expect(result.noticePeriodMonths).toBe(3);
    });

    it('should handle February end of month correctly', async () => {
      const employee = createMockEmployee({ anciennity: 24 });
      const noticeDate = new Date('2025-01-31');

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // 1 month from Jan 31 = Feb 28 (2025 is not leap year)
      expect(result.terminationDate.getMonth()).toBe(1); // February
      expect(result.terminationDate.getDate()).toBe(28);
    });

    it('should handle leap year February correctly', async () => {
      const employee = createMockEmployee({ anciennity: 24 });
      const noticeDate = new Date('2024-01-31'); // 2024 is leap year

      const result = await calculateTerminationNotice(
        employee,
        noticeDate,
        TerminationInitiator.EMPLOYER
      );

      // 1 month from Jan 31, 2024 = Feb 29, 2024
      expect(result.terminationDate.getMonth()).toBe(1); // February
      expect(result.terminationDate.getDate()).toBe(29);
    });
  });
});
