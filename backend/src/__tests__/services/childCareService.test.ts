/**
 * Tests for Child Care Service
 * § 16-17 Børns sygdom og hospitalsindlæggelse
 */

import {
  calculateChildSickDay,
  calculateDoctorVisit,
  calculateRelativeEscort,
  calculateChildHospitalization,
  validateChildCareRequest,
  CHILD_CARE_RULES,
} from '../../services/childCareService';
import { Employee, AbsenceType, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
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

describe('ChildCareService', () => {
  describe('Child Sick Days (§ 16 stk. 1)', () => {
    it('should calculate first sick day', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-06-01');

      const result = await calculateChildSickDay(employee, date, 1);

      expect(result.careType).toBe(AbsenceType.CHILD_FIRST_SICK_DAY);
      expect(result.daysCount).toBe(1);
      expect(result.isPaid).toBe(true);
      expect(result.requiresDocumentation).toBe(false);
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should calculate second sick day', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-06-02');

      const result = await calculateChildSickDay(employee, date, 2);

      expect(result.careType).toBe(AbsenceType.CHILD_SECOND_SICK_DAY);
      expect(result.daysCount).toBe(1);
      expect(result.isPaid).toBe(true);
    });

    it('should calculate third sick day', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-06-03');

      const result = await calculateChildSickDay(employee, date, 3);

      expect(result.careType).toBe(AbsenceType.CHILD_THIRD_SICK_DAY);
      expect(result.daysCount).toBe(1);
      expect(result.isPaid).toBe(true);
    });

    it('should reject invalid day number (0)', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-06-01');

      await expect(calculateChildSickDay(employee, date, 0 as 1)).rejects.toThrow(
        'Ugyldigt dagnummer'
      );
    });

    it('should reject invalid day number (4)', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-06-01');

      await expect(calculateChildSickDay(employee, date, 4 as 1)).rejects.toThrow(
        'Ugyldigt dagnummer'
      );
    });

    it('should pay 100% salary for all sick days', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(200) });
      const date = new Date('2025-06-01');

      const result = await calculateChildSickDay(employee, date, 1);

      expect(result.dailyPay).toBeGreaterThan(200 * 7.4); // Base + allowances
      expect(result.totalPay).toBe(result.dailyPay);
    });
  });

  describe('Doctor Visit (§ 16 stk. 2)', () => {
    it('should calculate doctor visit', async () => {
      const employee = createMockEmployee();
      const date = new Date('2025-06-01');

      const result = await calculateDoctorVisit(employee, date);

      expect(result.careType).toBe(AbsenceType.CHILD_DOCTOR_VISIT);
      expect(result.daysCount).toBe(1);
      expect(result.isPaid).toBe(true);
      expect(result.requiresDocumentation).toBe(true);
    });

    it('should pay 100% salary for doctor visit', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(150) });
      const date = new Date('2025-06-01');

      const result = await calculateDoctorVisit(employee, date);

      expect(result.totalPay).toBeGreaterThan(0);
      expect(result.dailyPay).toBeGreaterThan(0);
    });
  });

  describe('Relative Escort (§ 16 stk. 5)', () => {
    it('should calculate 2 days escort (minimum)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-02');

      const result = await calculateRelativeEscort(employee, startDate, endDate);

      expect(result.careType).toBe(AbsenceType.RELATIVE_ESCORT);
      expect(result.daysCount).toBe(2);
      expect(result.isPaid).toBe(true);
      expect(result.requiresDocumentation).toBe(true);
    });

    it('should calculate 7 days escort (maximum)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-07');

      const result = await calculateRelativeEscort(employee, startDate, endDate);

      expect(result.daysCount).toBe(7);
      expect(result.isPaid).toBe(true);
    });

    it('should reject less than 2 days', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-01'); // Same day = 1 day

      await expect(calculateRelativeEscort(employee, startDate, endDate)).rejects.toThrow(
        'minimum 2 dage'
      );
    });

    it('should reject more than 7 days', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-09'); // 9 days

      await expect(calculateRelativeEscort(employee, startDate, endDate)).rejects.toThrow(
        'kan maksimalt være 7 dage'
      );
    });

    it('should calculate correct pay for multi-day escort', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(200) });
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-05'); // 5 days

      const result = await calculateRelativeEscort(employee, startDate, endDate);

      expect(result.daysCount).toBe(5);
      expect(result.totalPay).toBe(result.dailyPay * 5);
    });
  });

  describe('Child Hospitalization (§ 17)', () => {
    // Mock prisma for these tests
    beforeEach(() => {
      const prisma = require('../../config/database').default;
      prisma.employee.findUnique.mockResolvedValue(createMockEmployee());
      prisma.absenceEntry.findMany.mockResolvedValue([]); // No previous hospitalizations
    });

    it('should calculate 1 week hospitalization', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-07'); // 7 days
      const year = 2025;

      const result = await calculateChildHospitalization(employee, startDate, endDate, year);

      expect(result.careType).toBe(AbsenceType.CHILD_HOSPITALIZATION);
      expect(result.daysCount).toBe(7);
      expect(result.isPaid).toBe(true);
      expect(result.requiresDocumentation).toBe(true);
    });

    it('should calculate partial week hospitalization', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-04'); // 4 days
      const year = 2025;

      const result = await calculateChildHospitalization(employee, startDate, endDate, year);

      expect(result.daysCount).toBe(4);
      expect(result.isPaid).toBe(true);
    });

    it('should pay 100% salary during hospitalization', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(150) });
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-03');
      const year = 2025;

      const result = await calculateChildHospitalization(employee, startDate, endDate, year);

      expect(result.totalPay).toBeGreaterThan(0);
      expect(result.totalPay).toBe(result.dailyPay * result.daysCount);
    });

    it('should track days remaining', async () => {
      const prisma = require('../../config/database').default;
      // Mock 3 days already used
      prisma.absenceEntry.findMany.mockResolvedValue([
        {
          id: '1',
          employeeId: 'test-employee-id',
          type: AbsenceType.CHILD_HOSPITALIZATION,
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-05-03'),
          daysCount: 3,
          isPaid: true,
          paymentAmount: new Decimal(5000),
          note: 'Previous hospitalization',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-02'); // 2 days
      const year = 2025;

      const result = await calculateChildHospitalization(employee, startDate, endDate, year);

      expect(result.daysUsedThisYear).toBe(3);
      expect(result.daysRemainingThisYear).toBe(4); // 7 - 3 = 4
    });

    it('should reject if exceeds 7 days per 12 months', async () => {
      const prisma = require('../../config/database').default;
      // Mock 6 days already used
      prisma.absenceEntry.findMany.mockResolvedValue([
        {
          id: '1',
          employeeId: 'test-employee-id',
          type: AbsenceType.CHILD_HOSPITALIZATION,
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-05-06'),
          daysCount: 6,
          isPaid: true,
          paymentAmount: new Decimal(10000),
          note: 'Previous hospitalization',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-03'); // 3 days (would exceed 7 total)
      const year = 2025;

      await expect(
        calculateChildHospitalization(employee, startDate, endDate, year)
      ).rejects.toThrow('overstiger maksimum');
    });
  });

  describe('Validation', () => {
    it('should validate child sick day request', () => {
      const startDate = new Date('2025-06-01');

      const result = validateChildCareRequest(
        AbsenceType.CHILD_FIRST_SICK_DAY,
        startDate
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject start date after end date', () => {
      const startDate = new Date('2025-06-05');
      const endDate = new Date('2025-06-01');

      const result = validateChildCareRequest(
        AbsenceType.RELATIVE_ESCORT,
        startDate,
        endDate
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('før slutdato'))).toBe(true);
    });

    it('should reject relative escort less than 2 days', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-01'); // 1 day

      const result = validateChildCareRequest(
        AbsenceType.RELATIVE_ESCORT,
        startDate,
        endDate
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('minimum 2 dage'))).toBe(true);
    });

    it('should reject relative escort more than 7 days', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-09'); // 9 days (inclusive = 10 days, > 7)

      const result = validateChildCareRequest(
        AbsenceType.RELATIVE_ESCORT,
        startDate,
        endDate
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('kan maksimalt være 7 dage'))).toBe(true);
    });

    it('should reject hospitalization more than 7 days', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-08'); // 8 days (inclusive = 9 days, > 7)

      const result = validateChildCareRequest(
        AbsenceType.CHILD_HOSPITALIZATION,
        startDate,
        endDate
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('kan maksimalt være 7 dage'))).toBe(true);
    });

    it('should warn about far future dates', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 60); // 60 days in future

      const result = validateChildCareRequest(
        AbsenceType.CHILD_FIRST_SICK_DAY,
        startDate
      );

      expect(result.warnings.some((w) => w.includes('fremtiden'))).toBe(true);
    });
  });

  describe('Constants Validation', () => {
    it('should have correct child sick day rules', () => {
      expect(CHILD_CARE_RULES.CHILD_SICK_DAY.FIRST_DAY_PAID).toBe(true);
      expect(CHILD_CARE_RULES.CHILD_SICK_DAY.SECOND_DAY_PAID).toBe(true);
      expect(CHILD_CARE_RULES.CHILD_SICK_DAY.THIRD_DAY_PAID).toBe(true);
      expect(CHILD_CARE_RULES.CHILD_SICK_DAY.MAX_DAYS_PER_ILLNESS).toBe(3);
      expect(CHILD_CARE_RULES.CHILD_SICK_DAY.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct doctor visit rules', () => {
      expect(CHILD_CARE_RULES.DOCTOR_VISIT.PAID).toBe(true);
      expect(CHILD_CARE_RULES.DOCTOR_VISIT.REQUIRES_DOCUMENTATION).toBe(true);
      expect(CHILD_CARE_RULES.DOCTOR_VISIT.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct child care days rules', () => {
      expect(CHILD_CARE_RULES.CHILD_CARE_DAYS.DAYS_PER_YEAR).toBe(2);
      expect(CHILD_CARE_RULES.CHILD_CARE_DAYS.PAID).toBe(true);
      expect(CHILD_CARE_RULES.CHILD_CARE_DAYS.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct grandchild care days rules', () => {
      expect(CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.DAYS_PER_YEAR).toBe(2);
      expect(CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.PAID).toBe(true);
      expect(CHILD_CARE_RULES.GRANDCHILD_CARE_DAYS.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct relative escort rules', () => {
      expect(CHILD_CARE_RULES.RELATIVE_ESCORT.MIN_DAYS).toBe(2);
      expect(CHILD_CARE_RULES.RELATIVE_ESCORT.MAX_DAYS).toBe(7);
      expect(CHILD_CARE_RULES.RELATIVE_ESCORT.PAID).toBe(true);
      expect(CHILD_CARE_RULES.RELATIVE_ESCORT.PAY_PERCENTAGE).toBe(100);
      expect(CHILD_CARE_RULES.RELATIVE_ESCORT.REQUIRES_DOCUMENTATION).toBe(true);
    });

    it('should have correct child hospitalization rules', () => {
      expect(CHILD_CARE_RULES.CHILD_HOSPITALIZATION.MAX_DAYS_PER_12_MONTHS).toBe(7);
      expect(CHILD_CARE_RULES.CHILD_HOSPITALIZATION.PAID).toBe(true);
      expect(CHILD_CARE_RULES.CHILD_HOSPITALIZATION.PAY_PERCENTAGE).toBe(100);
      expect(CHILD_CARE_RULES.CHILD_HOSPITALIZATION.REQUIRES_DOCUMENTATION).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle high salary employee', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(500) });
      const date = new Date('2025-06-01');

      const result = await calculateChildSickDay(employee, date, 1);

      expect(result.dailyPay).toBeGreaterThan(500 * 7.4);
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should handle minimum relative escort period', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-02'); // Exactly 2 days

      const result = await calculateRelativeEscort(employee, startDate, endDate);

      expect(result.daysCount).toBe(2);
    });

    it('should handle maximum relative escort period', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-07'); // Exactly 7 days

      const result = await calculateRelativeEscort(employee, startDate, endDate);

      expect(result.daysCount).toBe(7);
    });

    it('should handle doctor visit on any day', async () => {
      const employee = createMockEmployee();
      const sunday = new Date('2025-06-01'); // A Sunday

      const result = await calculateDoctorVisit(employee, sunday);

      expect(result.totalPay).toBeGreaterThan(0);
    });
  });

  describe('Days Count Calculation', () => {
    it('should count days inclusively for relative escort', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-03'); // Jun 1-3 = 3 days

      const result = await calculateRelativeEscort(employee, startDate, endDate);

      expect(result.daysCount).toBe(3);
    });

    it('should count days inclusively for hospitalization', async () => {
      // Mock prisma to return no previous absences
      const prisma = require('../../config/database').default;
      prisma.employee.findUnique.mockResolvedValue(createMockEmployee());
      prisma.absenceEntry.findMany.mockResolvedValue([]);

      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-05'); // Jun 1-5 = 5 days
      const year = 2025;

      const result = await calculateChildHospitalization(employee, startDate, endDate, year);

      expect(result.daysCount).toBe(5);
    });
  });
});
