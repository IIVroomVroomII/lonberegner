/**
 * Tests for Working Hours Service
 * § 4 Arbejdstid
 */

import {
  calculateStandardWeeklyHours,
  isNightWork,
  calculateNightHours,
  validateBreakRequirements,
  WORKING_HOURS_RULES,
} from '../../services/workingHoursService';
import { Employee, WorkTimeType, JobCategory, AgreementType } from '@prisma/client';
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
  anciennity: 0,
  workTimeType: WorkTimeType.HOURLY,
  baseSalary: new Decimal(150),
  department: null,
  location: null,
  postalCode: null,
  hasDriverLicense: false,
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
  birthDate: null,
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

describe('WorkingHoursService', () => {
  describe('Standard Weekly Hours Calculation', () => {
    it('should return 37 hours for hourly workers', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.HOURLY,
      });

      const standardHours = calculateStandardWeeklyHours(employee);

      expect(standardHours).toBe(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.HOURLY);
      expect(standardHours).toBe(37);
    });

    it('should return 37 hours for salaried workers', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SALARIED,
      });

      const standardHours = calculateStandardWeeklyHours(employee);

      expect(standardHours).toBe(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.SALARIED);
      expect(standardHours).toBe(37);
    });

    it('should return 34 hours for shift workers (default)', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SHIFT_WORK,
      });

      const standardHours = calculateStandardWeeklyHours(employee);

      expect(standardHours).toBe(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.SECOND_SHIFT);
      expect(standardHours).toBe(34);
    });

    it('should return 37 hours for substitute workers', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SUBSTITUTE,
      });

      const standardHours = calculateStandardWeeklyHours(employee);

      expect(standardHours).toBe(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.HOURLY);
      expect(standardHours).toBe(37);
    });
  });

  describe('Night Work Detection (§ 4 stk. 5)', () => {
    it('should detect night work starting at 18:00', () => {
      const startTime = new Date('2025-01-01T18:00:00');
      const endTime = new Date('2025-01-01T22:00:00');

      expect(isNightWork(startTime, endTime)).toBe(true);
    });

    it('should detect night work starting at 22:00', () => {
      const startTime = new Date('2025-01-01T22:00:00');
      const endTime = new Date('2025-01-02T06:00:00');

      expect(isNightWork(startTime, endTime)).toBe(true);
    });

    it('should detect night work ending at 06:00', () => {
      const startTime = new Date('2025-01-01T00:00:00');
      const endTime = new Date('2025-01-01T06:00:00');

      expect(isNightWork(startTime, endTime)).toBe(true);
    });

    it('should detect night work starting before midnight', () => {
      const startTime = new Date('2025-01-01T20:00:00');
      const endTime = new Date('2025-01-02T04:00:00');

      expect(isNightWork(startTime, endTime)).toBe(true);
    });

    it('should NOT detect day work (08:00-16:00) as night work', () => {
      const startTime = new Date('2025-01-01T08:00:00');
      const endTime = new Date('2025-01-01T16:00:00');

      expect(isNightWork(startTime, endTime)).toBe(false);
    });

    it('should NOT detect morning work (06:00-14:00) as night work', () => {
      const startTime = new Date('2025-01-01T06:00:00');
      const endTime = new Date('2025-01-01T14:00:00');

      expect(isNightWork(startTime, endTime)).toBe(false);
    });

    it('should detect partial night work (14:00-22:00)', () => {
      const startTime = new Date('2025-01-01T14:00:00');
      const endTime = new Date('2025-01-01T22:00:00');

      expect(isNightWork(startTime, endTime)).toBe(true);
    });
  });

  describe('Night Hours Calculation', () => {
    it('should calculate full night shift (22:00-06:00)', () => {
      const startTime = new Date('2025-01-01T22:00:00');
      const endTime = new Date('2025-01-02T06:00:00');

      const nightHours = calculateNightHours(startTime, endTime);

      expect(nightHours).toBe(8); // 8 hours
    });

    it('should calculate evening shift (18:00-22:00)', () => {
      const startTime = new Date('2025-01-01T18:00:00');
      const endTime = new Date('2025-01-01T22:00:00');

      const nightHours = calculateNightHours(startTime, endTime);

      expect(nightHours).toBe(4); // 4 hours
    });

    it('should calculate early morning shift (02:00-06:00)', () => {
      const startTime = new Date('2025-01-01T02:00:00');
      const endTime = new Date('2025-01-01T06:00:00');

      const nightHours = calculateNightHours(startTime, endTime);

      expect(nightHours).toBe(4); // 4 hours
    });

    it('should return 0 for day shift (08:00-16:00)', () => {
      const startTime = new Date('2025-01-01T08:00:00');
      const endTime = new Date('2025-01-01T16:00:00');

      const nightHours = calculateNightHours(startTime, endTime);

      expect(nightHours).toBe(0);
    });

    it('should calculate partial night hours for mixed shift (16:00-24:00)', () => {
      const startTime = new Date('2025-01-01T16:00:00');
      const endTime = new Date('2025-01-02T00:00:00');

      const nightHours = calculateNightHours(startTime, endTime);

      expect(nightHours).toBe(6); // 18:00-24:00 = 6 hours
    });

    it('should calculate partial night hours for mixed shift (04:00-12:00)', () => {
      const startTime = new Date('2025-01-01T04:00:00');
      const endTime = new Date('2025-01-01T12:00:00');

      const nightHours = calculateNightHours(startTime, endTime);

      expect(nightHours).toBe(2); // 04:00-06:00 = 2 hours
    });
  });

  describe('Break Requirements Validation', () => {
    it('should require no break for less than 6 hours work', () => {
      const validation = validateBreakRequirements(5.5, 0);

      expect(validation.isValid).toBe(true);
      expect(validation.requiredBreakMinutes).toBe(0);
    });

    it('should require 30 min break for 6+ hours work', () => {
      const validation = validateBreakRequirements(6, 30);

      expect(validation.isValid).toBe(true);
      expect(validation.requiredBreakMinutes).toBe(30);
    });

    it('should require 30 min break for 8 hours work', () => {
      const validation = validateBreakRequirements(8, 30);

      expect(validation.isValid).toBe(true);
      expect(validation.requiredBreakMinutes).toBe(30);
    });

    it('should fail validation when break is insufficient', () => {
      const validation = validateBreakRequirements(8, 15); // Only 15 min break

      expect(validation.isValid).toBe(false);
      expect(validation.requiredBreakMinutes).toBe(30);
      expect(validation.error).toContain('Minimum 30 minutters pause påkrævet');
    });

    it('should pass with more than minimum break', () => {
      const validation = validateBreakRequirements(8, 45); // 45 min break

      expect(validation.isValid).toBe(true);
      expect(validation.requiredBreakMinutes).toBe(30);
    });

    it('should pass exactly at 6 hours threshold', () => {
      const validation = validateBreakRequirements(6.0, 30);

      expect(validation.isValid).toBe(true);
      expect(validation.requiredBreakMinutes).toBe(30);
    });

    it('should not require break just under 6 hours', () => {
      const validation = validateBreakRequirements(5.99, 0);

      expect(validation.isValid).toBe(true);
      expect(validation.requiredBreakMinutes).toBe(0);
    });

    it('should include work hours and break in error message', () => {
      const validation = validateBreakRequirements(7, 10);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('7 timers arbejde');
      expect(validation.error).toContain('Registreret: 10 minutter');
    });
  });

  describe('Working Hours Rules Constants', () => {
    it('should have correct standard weekly hours', () => {
      expect(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.HOURLY).toBe(37);
      expect(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.SALARIED).toBe(37);
      expect(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.FIRST_SHIFT).toBe(37);
      expect(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.SECOND_SHIFT).toBe(34);
      expect(WORKING_HOURS_RULES.STANDARD_WEEKLY_HOURS.THIRD_SHIFT).toBe(34);
    });

    it('should have correct daily hours', () => {
      expect(WORKING_HOURS_RULES.STANDARD_DAILY_HOURS).toBe(7.4);
    });

    it('should have correct time bank rules', () => {
      expect(WORKING_HOURS_RULES.TIME_BANK.MAX_STORAGE_MONTHS).toBe(6);
      expect(WORKING_HOURS_RULES.TIME_BANK.EXPIRY_WARNING_DAYS).toBe(30);
    });

    it('should have correct night work hours', () => {
      expect(WORKING_HOURS_RULES.NIGHT_WORK.START_HOUR).toBe(18);
      expect(WORKING_HOURS_RULES.NIGHT_WORK.END_HOUR).toBe(6);
    });

    it('should have correct break requirements', () => {
      expect(WORKING_HOURS_RULES.BREAKS.MINIMUM_DAILY).toBe(30);
      expect(WORKING_HOURS_RULES.BREAKS.REQUIRED_AFTER_HOURS).toBe(6);
    });
  });
});
