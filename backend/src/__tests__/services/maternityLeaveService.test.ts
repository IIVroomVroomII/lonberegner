/**
 * Tests for Maternity Leave Service
 * § 15 Barsel
 */

import {
  calculateMaternityLeave,
  validateMaternityLeave,
  calculatePensionBenefit,
  calculatePregnancyRelatedAbsence,
  MaternityLeaveType,
  MATERNITY_LEAVE_RULES,
} from '../../services/maternityLeaveService';
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

describe('MaternityLeaveService', () => {
  describe('Birthing Parent Leave', () => {
    it('should calculate 18 weeks entitlement for birthing parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const dueDate = new Date('2025-06-15');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        undefined,
        dueDate
      );

      expect(result.weeksEntitlement).toBe(18);
      expect(result.leaveType).toBe(MaternityLeaveType.BIRTHING_PARENT);
      expect(result.isFullPay).toBe(true);
    });

    it('should pay 100% salary for birthing parent', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(200) });
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-08'); // 7 days

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.dailyPay).toBeGreaterThan(0);
      expect(result.totalPay).toBeGreaterThan(0);
      expect(result.isFullPay).toBe(true);
    });

    it('should calculate enhanced pension (13.5%) for birthing parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-08');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      const expectedEnhanced = result.totalPay * 0.135;
      const expectedNormal = result.totalPay * 0.11;

      expect(result.enhancedPensionContribution).toBeCloseTo(expectedEnhanced, 2);
      expect(result.normalPensionContribution).toBeCloseTo(expectedNormal, 2);
      expect(result.pensionIncrease).toBeCloseTo(expectedEnhanced - expectedNormal, 2);
    });

    it('should calculate vacation pay at 12.5%', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-08');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      const expectedVacationPay = result.totalPay * 0.125;
      expect(result.vacationPay).toBeCloseTo(expectedVacationPay, 2);
    });

    it('should include due date in calculation', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const dueDate = new Date('2025-06-20');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        undefined,
        dueDate
      );

      expect(result.dueDate).toEqual(dueDate);
    });

    it('should include actual birth date if provided', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');
      const dueDate = new Date('2025-06-20');
      const actualBirthDate = new Date('2025-06-18');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        undefined,
        dueDate,
        actualBirthDate
      );

      expect(result.actualBirthDate).toEqual(actualBirthDate);
    });
  });

  describe('Non-Birthing Parent Leave (Paternity)', () => {
    it('should calculate 2 weeks entitlement for non-birthing parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15'); // After birth

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.NON_BIRTHING_PARENT,
        startDate
      );

      expect(result.weeksEntitlement).toBe(2);
      expect(result.leaveType).toBe(MaternityLeaveType.NON_BIRTHING_PARENT);
    });

    it('should pay 100% salary for non-birthing parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-06-22'); // 7 days

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.NON_BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.isFullPay).toBe(true);
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should calculate enhanced pension for non-birthing parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-06-22');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.NON_BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.pensionIncrease).toBeGreaterThan(0);
      expect(result.enhancedPensionContribution).toBeGreaterThan(
        result.normalPensionContribution
      );
    });
  });

  describe('Social Parent Leave', () => {
    it('should calculate 2 weeks entitlement for social parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.SOCIAL_PARENT,
        startDate
      );

      expect(result.weeksEntitlement).toBe(2);
      expect(result.leaveType).toBe(MaternityLeaveType.SOCIAL_PARENT);
    });

    it('should pay 100% salary for social parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-06-29'); // 14 days

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.SOCIAL_PARENT,
        startDate,
        endDate
      );

      expect(result.isFullPay).toBe(true);
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should calculate enhanced pension for social parent', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-06-29');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.SOCIAL_PARENT,
        startDate,
        endDate
      );

      expect(result.pensionIncrease).toBeGreaterThan(0);
    });
  });

  describe('Pregnancy-Related Absence', () => {
    it('should calculate pregnancy-related absence', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-15'); // 14 days

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.PREGNANCY_RELATED_ABSENCE,
        startDate,
        endDate
      );

      expect(result.leaveType).toBe(MaternityLeaveType.PREGNANCY_RELATED_ABSENCE);
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should have max 12 weeks entitlement for pregnancy-related', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-01');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.PREGNANCY_RELATED_ABSENCE,
        startDate
      );

      expect(result.weeksEntitlement).toBe(12);
    });

    it('should detect excessive pregnancy-related absence', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-04-01'); // ~13 weeks

      const result = await calculatePregnancyRelatedAbsence(employee, startDate, endDate);

      expect(result.exceedsLimit).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('12 uger');
    });

    it('should NOT exceed limit with 12 weeks or less', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-25'); // ~12 weeks

      const result = await calculatePregnancyRelatedAbsence(employee, startDate, endDate);

      expect(result.exceedsLimit).toBe(false);
    });

    it('should cover pregnancy-related absence', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-08');

      const result = await calculatePregnancyRelatedAbsence(employee, startDate, endDate);

      expect(result.isCovered).toBe(true);
    });
  });

  describe('Pension Benefit Calculation', () => {
    it('should calculate 2.5% pension increase', () => {
      const totalPay = 10000;
      const result = calculatePensionBenefit(totalPay);

      expect(result.normalPension).toBe(1100); // 11%
      expect(result.enhancedPension).toBe(1350); // 13.5%
      expect(result.benefit).toBe(250); // 2.5%
      expect(result.benefitPercentage).toBe(2.5);
    });

    it('should calculate correct pension for high salary', () => {
      const totalPay = 50000;
      const result = calculatePensionBenefit(totalPay);

      expect(result.normalPension).toBe(5500);
      expect(result.enhancedPension).toBe(6750);
      expect(result.benefit).toBe(1250);
    });

    it('should calculate correct pension for low salary', () => {
      const totalPay = 5000;
      const result = calculatePensionBenefit(totalPay);

      expect(result.normalPension).toBe(550);
      expect(result.enhancedPension).toBe(675);
      expect(result.benefit).toBe(125);
    });
  });

  describe('Validation', () => {
    it('should validate correct birthing parent leave', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-10-01'); // ~18 weeks
      const dueDate = new Date('2025-06-15');

      const result = validateMaternityLeave(
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate,
        dueDate
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject start date after end date', () => {
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-06-01');

      const result = validateMaternityLeave(
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('før slutdato');
    });

    it('should warn if missing due date for birthing parent', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-10-01');

      const result = validateMaternityLeave(
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.warnings.some((w) => w.includes('Termin'))).toBe(true);
    });

    it('should warn if start date too early before due date', () => {
      const dueDate = new Date('2025-07-01');
      const startDate = new Date('2025-05-01'); // 2 months before
      const endDate = new Date('2025-10-01');

      const result = validateMaternityLeave(
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate,
        dueDate
      );

      expect(result.warnings.some((w) => w.includes('4 uger før termin'))).toBe(true);
    });

    it('should warn if leave exceeds entitlement', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-12-01'); // ~26 weeks (exceeds 18)

      const result = validateMaternityLeave(
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.warnings.some((w) => w.includes('overstiger normal ret'))).toBe(true);
    });

    it('should validate non-birthing parent leave duration', () => {
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-07-15'); // ~4 weeks (exceeds 2)

      const result = validateMaternityLeave(
        MaternityLeaveType.NON_BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.warnings.some((w) => w.includes('overstiger'))).toBe(true);
    });

    it('should validate social parent leave duration', () => {
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-07-15'); // ~4 weeks (exceeds 2)

      const result = validateMaternityLeave(
        MaternityLeaveType.SOCIAL_PARENT,
        startDate,
        endDate
      );

      expect(result.warnings.some((w) => w.includes('overstiger'))).toBe(true);
    });
  });

  describe('Days Count Calculation', () => {
    it('should count calendar days (including weekends)', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01'); // Sunday
      const endDate = new Date('2025-06-08'); // Next Sunday

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      // 8 calendar days (Jun 1-8 inclusive)
      expect(result.daysCount).toBe(8);
    });

    it('should handle full week correctly', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-02'); // Monday
      const endDate = new Date('2025-06-08'); // Sunday

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.daysCount).toBe(7);
    });
  });

  describe('Constants Validation', () => {
    it('should have correct birthing parent rules', () => {
      expect(MATERNITY_LEAVE_RULES.BIRTHING_PARENT.TOTAL_WEEKS).toBe(18);
      expect(MATERNITY_LEAVE_RULES.BIRTHING_PARENT.WEEKS_BEFORE_BIRTH).toBe(4);
      expect(MATERNITY_LEAVE_RULES.BIRTHING_PARENT.WEEKS_AFTER_BIRTH).toBe(14);
      expect(MATERNITY_LEAVE_RULES.BIRTHING_PARENT.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct non-birthing parent rules', () => {
      expect(MATERNITY_LEAVE_RULES.NON_BIRTHING_PARENT.WEEKS_AFTER_BIRTH).toBe(2);
      expect(MATERNITY_LEAVE_RULES.NON_BIRTHING_PARENT.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct social parent rules', () => {
      expect(MATERNITY_LEAVE_RULES.SOCIAL_PARENT.WEEKS_ENTITLEMENT).toBe(2);
      expect(MATERNITY_LEAVE_RULES.SOCIAL_PARENT.PAY_PERCENTAGE).toBe(100);
    });

    it('should have correct pension rules', () => {
      expect(MATERNITY_LEAVE_RULES.PENSION.NORMAL_EMPLOYER_CONTRIBUTION).toBe(11);
      expect(MATERNITY_LEAVE_RULES.PENSION.MATERNITY_EMPLOYER_CONTRIBUTION).toBe(13.5);
      expect(MATERNITY_LEAVE_RULES.PENSION.INCREASE_PERCENTAGE).toBe(2.5);
    });

    it('should have correct vacation pay percentage', () => {
      expect(MATERNITY_LEAVE_RULES.VACATION_PAY.PERCENTAGE).toBe(12.5);
      expect(MATERNITY_LEAVE_RULES.VACATION_PAY.ACCRUAL).toBe(true);
    });

    it('should have correct pregnancy-related rules', () => {
      expect(MATERNITY_LEAVE_RULES.PREGNANCY_RELATED.COVERED).toBe(true);
      expect(MATERNITY_LEAVE_RULES.PREGNANCY_RELATED.MAX_WEEKS_BEFORE_LEAVE).toBe(12);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single day leave', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-15');
      const endDate = new Date('2025-06-16'); // 1 day

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.NON_BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.daysCount).toBe(2); // Includes both dates
      expect(result.totalPay).toBeGreaterThan(0);
    });

    it('should handle high salary employee', async () => {
      const employee = createMockEmployee({ baseSalary: new Decimal(500) });
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-08');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate,
        endDate
      );

      expect(result.dailyPay).toBeGreaterThan(500 * 7.4); // At least base * hours
      expect(result.pensionIncrease).toBeGreaterThan(0);
    });

    it('should auto-calculate end date if not provided', async () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-06-01');

      const result = await calculateMaternityLeave(
        employee,
        MaternityLeaveType.BIRTHING_PARENT,
        startDate
      );

      expect(result.endDate).toBeDefined();
      expect(result.endDate.getTime()).toBeGreaterThan(startDate.getTime());
      // Should be approximately 18 weeks later
      const expectedDays = 18 * 7; // 126 days
      const actualDays = Math.ceil(
        (result.endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(actualDays).toBeCloseTo(expectedDays, -1); // Within 10 days
    });
  });
});
