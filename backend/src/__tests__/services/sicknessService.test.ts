/**
 * Tests for Sickness Service
 * § 14 Sygeløn
 */

import {
  calculateSicknessPay,
  checkMaxSicknessDuration,
  validateDocumentation,
  SICKNESS_PAY_RULES,
} from '../../services/sicknessService';
import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
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
  anciennity: 60, // 5 years
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
    employee: {
      findUnique: jest.fn(),
    },
    absenceEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('SicknessService', () => {
  describe('Sickness Pay Calculation - Before May 1, 2025', () => {
    it('should calculate sickness pay for 5 days (1 week)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-03-10'); // Monday, before May 1
      const endDate = new Date('2025-03-14'); // Friday

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.daysCount).toBe(5);
      expect(result.weeksCount).toBe(1);
      expect(result.maxWeeks).toBe(9); // Before May 1
      expect(result.hasExceededMaxDuration).toBe(false);
      expect(result.dailyPay).toBeGreaterThan(0);
      expect(result.totalPay).toBeGreaterThan(0);
      expect(result.pensionContribution).toBeGreaterThan(0);
      expect(result.vacationPay).toBeGreaterThan(0);
    });

    it('should apply 9 week limit before May 1, 2025', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-02-01'); // Before May 1

      const result = await calculateSicknessPay(employee, startDate);

      expect(result.maxWeeks).toBe(9);
    });

    it('should detect exceeded duration after 9 weeks (before May 1)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-01-06'); // Monday
      const endDate = new Date('2025-03-21'); // 11 weeks later (55 work days)

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.weeksCount).toBe(11);
      expect(result.maxWeeks).toBe(9);
      expect(result.hasExceededMaxDuration).toBe(true);
    });
  });

  describe('Sickness Pay Calculation - From May 1, 2025', () => {
    it('should apply 11 week limit from May 1, 2025', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-01'); // May 1

      const result = await calculateSicknessPay(employee, startDate);

      expect(result.maxWeeks).toBe(11);
    });

    it('should apply 11 week limit after May 1, 2025', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01'); // June 1

      const result = await calculateSicknessPay(employee, startDate);

      expect(result.maxWeeks).toBe(11);
    });

    it('should detect exceeded duration after 11 weeks (from May 1)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05'); // Monday after May 1
      const endDate = new Date('2025-07-25'); // 12 weeks later (60 work days)

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.weeksCount).toBe(12);
      expect(result.maxWeeks).toBe(11);
      expect(result.hasExceededMaxDuration).toBe(true);
    });

    it('should NOT exceed with exactly 11 weeks', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05'); // Monday
      const endDate = new Date('2025-07-18'); // Exactly 11 weeks (55 work days)

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.weeksCount).toBe(11);
      expect(result.maxWeeks).toBe(11);
      expect(result.hasExceededMaxDuration).toBe(false);
    });
  });

  describe('Pay Calculation - Full Pay', () => {
    it('should pay 100% of salary during sickness', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(150) });
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-09'); // 5 days

      const result = await calculateSicknessPay(employee, startDate, endDate);

      // Should use effective hourly wage (base + allowances) * 7.4 hours/day
      expect(result.dailyPay).toBeGreaterThan(150 * 7.4); // At least base salary
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should calculate pension contribution at 11%', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-09'); // 5 days

      const result = await calculateSicknessPay(employee, startDate, endDate);

      const expectedPension = result.totalPay * 0.11;
      expect(result.pensionContribution).toBeCloseTo(expectedPension, 2);
    });

    it('should calculate vacation pay at 12.5%', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-09'); // 5 days

      const result = await calculateSicknessPay(employee, startDate, endDate);

      const expectedVacationPay = result.totalPay * 0.125;
      expect(result.vacationPay).toBeCloseTo(expectedVacationPay, 2);
    });
  });

  describe('Work Days Calculation', () => {
    it('should exclude weekends from work days count', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05'); // Monday
      const endDate = new Date('2025-05-11'); // Sunday (full week)

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.daysCount).toBe(5); // Only weekdays
      expect(result.weeksCount).toBe(1);
    });

    it('should handle multi-week periods correctly', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05'); // Monday
      const endDate = new Date('2025-05-23'); // Friday, 3 weeks later

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.daysCount).toBe(15); // 3 weeks * 5 days
      expect(result.weeksCount).toBe(3);
    });

    it('should handle partial weeks', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05'); // Monday
      const endDate = new Date('2025-05-07'); // Wednesday

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.daysCount).toBe(3);
      expect(result.weeksCount).toBe(0); // Less than a full week
    });

    it('should handle single day sickness', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05'); // Monday
      const endDate = new Date('2025-05-05'); // Same day

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.daysCount).toBe(1);
      expect(result.weeksCount).toBe(0);
    });
  });

  describe('Documentation Requirements', () => {
    it('should NOT require doctor note for 1-3 days', () => {
      expect(validateDocumentation(1).requiresDoctorNote).toBe(false);
      expect(validateDocumentation(2).requiresDoctorNote).toBe(false);
      expect(validateDocumentation(3).requiresDoctorNote).toBe(false);
      expect(validateDocumentation(1).requiresSelfCertification).toBe(true);
    });

    it('should require doctor note after 3 days', () => {
      expect(validateDocumentation(4).requiresDoctorNote).toBe(true);
      expect(validateDocumentation(5).requiresDoctorNote).toBe(true);
      expect(validateDocumentation(10).requiresDoctorNote).toBe(true);
      expect(validateDocumentation(4).requiresSelfCertification).toBe(false);
    });

    it('should provide correct messages', () => {
      const result1 = validateDocumentation(2);
      expect(result1.message).toContain('Egen tro og love');
      expect(result1.message).toContain('≤ 3 dage');

      const result2 = validateDocumentation(5);
      expect(result2.message).toContain('Lægeerklæring påkrævet');
      expect(result2.message).toContain('> 3 dage');
    });

    it('should mark doctor note required in calculation', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-12'); // 6 days

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.requiresDoctorNote).toBe(true);
    });

    it('should NOT require doctor note for short periods', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-07'); // 3 days

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.requiresDoctorNote).toBe(false);
    });
  });

  describe('Remaining Weeks Calculation', () => {
    it('should calculate remaining weeks correctly (before May 1)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-03-10');
      const endDate = new Date('2025-03-21'); // 2 weeks

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.weeksCount).toBe(2);
      expect(result.remainingWeeks).toBe(7); // 9 - 2
    });

    it('should calculate remaining weeks correctly (from May 1)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-23'); // 3 weeks

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.weeksCount).toBe(3);
      expect(result.remainingWeeks).toBe(8); // 11 - 3
    });

    it('should show 0 remaining weeks when exceeded', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-07-25'); // 12 weeks

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.remainingWeeks).toBe(0); // Can't be negative
    });
  });

  describe('Ongoing Sickness (No End Date)', () => {
    it('should handle ongoing sickness without end date', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');

      const result = await calculateSicknessPay(employee, startDate, null);

      expect(result.endDate).toBeNull();
      expect(result.daysCount).toBeGreaterThan(0); // Uses current date
    });
  });

  describe('Maximum Duration Checking', () => {
    it('should warn when approaching limit (2 weeks remaining)', async () => {
      // Mock prisma to return history showing 9 weeks used
      const prisma = require('../../config/database').default;
      prisma.employee.findUnique.mockResolvedValue(createMockEmployee());
      prisma.absenceEntry.findMany.mockResolvedValue([
        {
          id: '1',
          employeeId: 'test-employee-id',
          type: 'SICKNESS',
          startDate: new Date('2025-05-05'),
          endDate: new Date('2025-07-04'),
          daysCount: 45, // 9 weeks
          isPaid: true,
          paymentAmount: new Decimal(50000),
          note: 'Sickness',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await checkMaxSicknessDuration('test-employee-id', new Date('2025-07-05'));

      expect(result.weeksUsed).toBe(9);
      expect(result.weeksRemaining).toBe(2);
      expect(result.hasExceeded).toBe(false);
      expect(result.warning).toContain('Kun 2 uger sygeløn tilbage');
      expect(result.warning).toContain('sygedagpenge');
    });

    it('should error when exceeded limit', async () => {
      const prisma = require('../../config/database').default;
      prisma.employee.findUnique.mockResolvedValue(createMockEmployee());
      prisma.absenceEntry.findMany.mockResolvedValue([
        {
          id: '1',
          employeeId: 'test-employee-id',
          type: 'SICKNESS',
          startDate: new Date('2025-05-05'),
          endDate: new Date('2025-07-25'),
          daysCount: 60, // 12 weeks
          isPaid: true,
          paymentAmount: new Decimal(70000),
          note: 'Sickness',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await checkMaxSicknessDuration('test-employee-id', new Date('2025-07-26'));

      expect(result.hasExceeded).toBe(true);
      expect(result.weeksUsed).toBe(12);
      expect(result.weeksRemaining).toBe(0);
      expect(result.warning).toContain('overskredet');
      expect(result.warning).toContain('kommunen');
    });
  });

  describe('Constants Validation', () => {
    it('should have correct sickness pay rules', () => {
      expect(SICKNESS_PAY_RULES.DURATION.WEEKS_BEFORE_2025_05_01).toBe(9);
      expect(SICKNESS_PAY_RULES.DURATION.WEEKS_FROM_2025_05_01).toBe(11);
      expect(SICKNESS_PAY_RULES.WAITING_DAY.HAS_WAITING_DAY).toBe(false);
      expect(SICKNESS_PAY_RULES.PAY_PERCENTAGE.FULL_PAY).toBe(100);
      expect(SICKNESS_PAY_RULES.PENSION.PERCENTAGE).toBe(11);
      expect(SICKNESS_PAY_RULES.VACATION_PAY.PERCENTAGE).toBe(12.5);
      expect(SICKNESS_PAY_RULES.DOCUMENTATION.SELF_CERTIFICATION_DAYS).toBe(3);
    });

    it('should have correct change date', () => {
      const changeDate = SICKNESS_PAY_RULES.DURATION.CHANGE_DATE;
      expect(changeDate.getFullYear()).toBe(2025);
      expect(changeDate.getMonth()).toBe(4); // May = 4
      expect(changeDate.getDate()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pregnancy-related sickness', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-09');

      const result = await calculateSicknessPay(employee, startDate, endDate, true);

      expect(result.totalPay).toBeGreaterThan(0);
      // Pregnancy-related sickness is covered under same rules
    });

    it('should handle very long sickness periods', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-11-05'); // ~26 weeks

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.weeksCount).toBeGreaterThanOrEqual(26);
      expect(result.hasExceededMaxDuration).toBe(true);
      // Should calculate correct work days (excluding weekends)
      expect(result.daysCount).toBeGreaterThan(120); // At least 24 weeks
    });

    it('should handle employee with high salary', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(500) });
      const startDate = new Date('2025-05-05');
      const endDate = new Date('2025-05-09');

      const result = await calculateSicknessPay(employee, startDate, endDate);

      expect(result.dailyPay).toBeGreaterThan(500 * 7.4);
      expect(result.pensionContribution).toBeGreaterThan(0);
      expect(result.vacationPay).toBeGreaterThan(0);
    });
  });
});
