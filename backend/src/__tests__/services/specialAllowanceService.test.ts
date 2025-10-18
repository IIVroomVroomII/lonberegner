/**
 * Tests for Special Allowance Service
 * § 8 Særligt Løntillæg/Opsparing
 */

import {
  calculateSpecialAllowance,
  getProgressionRates,
  SPECIAL_ALLOWANCE_RATES,
  FREEDOM_ACCOUNT_RULES,
} from '../../services/specialAllowanceService';
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

describe('SpecialAllowanceService', () => {
  describe('Special Allowance Calculation for Hourly Employees', () => {
    it('should calculate freedom account contribution for hourly employees (2025)', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.HOURLY,
      });

      const result = calculateSpecialAllowance(
        10000, // Vacation eligible pay
        employee,
        new Date('2025-06-01')
      );

      expect(result.percentage).toBe(SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT['2025']);
      expect(result.percentage).toBe(6.75);
      expect(result.allowanceAmount).toBe(10000 * 0.0675);
      expect(result.allowanceAmount).toBe(675);
      expect(result.isSavings).toBe(true);
      expect(result.year).toBe(2025);
    });

    it('should calculate freedom account contribution for substitute workers', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SUBSTITUTE,
      });

      const result = calculateSpecialAllowance(
        10000,
        employee,
        new Date('2025-06-01')
      );

      expect(result.percentage).toBe(6.75);
      expect(result.isSavings).toBe(true);
    });

    it('should use consistent rate across years for hourly workers', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.HOURLY,
      });

      const result2025 = calculateSpecialAllowance(10000, employee, new Date('2025-01-01'));
      const result2026 = calculateSpecialAllowance(10000, employee, new Date('2026-01-01'));
      const result2027 = calculateSpecialAllowance(10000, employee, new Date('2027-01-01'));
      const result2028 = calculateSpecialAllowance(10000, employee, new Date('2028-01-01'));

      expect(result2025.percentage).toBe(6.75);
      expect(result2026.percentage).toBe(6.75);
      expect(result2027.percentage).toBe(6.75);
      expect(result2028.percentage).toBe(6.75);
    });
  });

  describe('Special Allowance Calculation for Salaried Employees', () => {
    it('should calculate allowance for salaried employees (2025)', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SALARIED,
        useSpecialSavings: false, // Tillæg, ikke opsparing
      });

      const result = calculateSpecialAllowance(
        10000,
        employee,
        new Date('2025-06-01')
      );

      expect(result.percentage).toBe(SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE['2025']);
      expect(result.percentage).toBe(7.60);
      expect(result.allowanceAmount).toBe(10000 * 0.076);
      expect(result.allowanceAmount).toBe(760);
      expect(result.isSavings).toBe(false);
    });

    it('should show progression in allowance rates (2025-2028)', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SALARIED,
        useSpecialSavings: false,
      });

      const result2025 = calculateSpecialAllowance(10000, employee, new Date('2025-01-01'));
      const result2026 = calculateSpecialAllowance(10000, employee, new Date('2026-01-01'));
      const result2027 = calculateSpecialAllowance(10000, employee, new Date('2027-01-01'));
      const result2028 = calculateSpecialAllowance(10000, employee, new Date('2028-01-01'));

      expect(result2025.percentage).toBe(7.60);
      expect(result2026.percentage).toBe(7.80);
      expect(result2027.percentage).toBe(8.00);
      expect(result2028.percentage).toBe(8.20);

      expect(result2025.allowanceAmount).toBe(760);
      expect(result2026.allowanceAmount).toBe(780);
      expect(result2027.allowanceAmount).toBe(800);
      expect(result2028.allowanceAmount).toBe(820);
    });

    it('should calculate savings when employee chooses savings option', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SALARIED,
        useSpecialSavings: true, // Opsparing
      });

      const result = calculateSpecialAllowance(
        10000,
        employee,
        new Date('2025-06-01')
      );

      expect(result.percentage).toBe(SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION['2025']);
      expect(result.percentage).toBe(7.60);
      expect(result.isSavings).toBe(true);
    });

    it('should show progression in savings rates (2025-2028)', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SALARIED,
        useSpecialSavings: true,
      });

      const result2025 = calculateSpecialAllowance(10000, employee, new Date('2025-01-01'));
      const result2026 = calculateSpecialAllowance(10000, employee, new Date('2026-01-01'));
      const result2027 = calculateSpecialAllowance(10000, employee, new Date('2027-01-01'));
      const result2028 = calculateSpecialAllowance(10000, employee, new Date('2028-01-01'));

      expect(result2025.percentage).toBe(7.60);
      expect(result2026.percentage).toBe(7.80);
      expect(result2027.percentage).toBe(8.00);
      expect(result2028.percentage).toBe(8.20);
    });
  });

  describe('Progression Rates', () => {
    it('should return constant rates for hourly workers', () => {
      const rates = getProgressionRates(WorkTimeType.HOURLY, false);

      expect(rates).toHaveLength(4);
      expect(rates[0]).toEqual({ year: 2025, rate: 6.75 });
      expect(rates[1]).toEqual({ year: 2026, rate: 6.75 });
      expect(rates[2]).toEqual({ year: 2027, rate: 6.75 });
      expect(rates[3]).toEqual({ year: 2028, rate: 6.75 });
    });

    it('should return progressive rates for salaried allowance', () => {
      const rates = getProgressionRates(WorkTimeType.SALARIED, false);

      expect(rates).toHaveLength(4);
      expect(rates[0]).toEqual({ year: 2025, rate: 7.60 });
      expect(rates[1]).toEqual({ year: 2026, rate: 7.80 });
      expect(rates[2]).toEqual({ year: 2027, rate: 8.00 });
      expect(rates[3]).toEqual({ year: 2028, rate: 8.20 });
    });

    it('should return progressive rates for salaried savings', () => {
      const rates = getProgressionRates(WorkTimeType.SALARIED, true);

      expect(rates).toHaveLength(4);
      expect(rates[0]).toEqual({ year: 2025, rate: 7.60 });
      expect(rates[1]).toEqual({ year: 2026, rate: 7.80 });
      expect(rates[2]).toEqual({ year: 2027, rate: 8.00 });
      expect(rates[3]).toEqual({ year: 2028, rate: 8.20 });
    });

    it('should return constant rates for substitute workers', () => {
      const rates = getProgressionRates(WorkTimeType.SUBSTITUTE, false);

      expect(rates).toHaveLength(4);
      expect(rates[0].rate).toBe(6.75);
      expect(rates[1].rate).toBe(6.75);
      expect(rates[2].rate).toBe(6.75);
      expect(rates[3].rate).toBe(6.75);
    });
  });

  describe('Freedom Account Rules', () => {
    it('should have correct deposit percentage', () => {
      expect(FREEDOM_ACCOUNT_RULES.DEPOSIT_PERCENTAGE).toBe(6.75);
    });

    it('should have correct hours per day', () => {
      expect(FREEDOM_ACCOUNT_RULES.HOURS_PER_DAY).toBe(7.4);
    });

    it('should have correct year-end payout month', () => {
      expect(FREEDOM_ACCOUNT_RULES.YEAR_END_PAYOUT_MONTH).toBe(12); // December
    });

    it('should allow termination payout', () => {
      expect(FREEDOM_ACCOUNT_RULES.TERMINATION_PAYOUT).toBe(true);
    });
  });

  describe('Base Amount Calculation', () => {
    it('should correctly set base amount', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.HOURLY,
      });

      const result = calculateSpecialAllowance(
        15000,
        employee,
        new Date('2025-01-01')
      );

      expect(result.baseAmount).toBe(15000);
    });

    it('should calculate correct amount from base', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SALARIED,
        useSpecialSavings: false,
      });

      const result = calculateSpecialAllowance(
        20000, // Base amount
        employee,
        new Date('2025-01-01')
      );

      expect(result.baseAmount).toBe(20000);
      expect(result.percentage).toBe(7.60);
      expect(result.allowanceAmount).toBe(20000 * 0.076);
      expect(result.allowanceAmount).toBe(1520);
    });
  });

  describe('Shift Workers', () => {
    it('should calculate allowance for shift workers', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SHIFT_WORK,
        useSpecialSavings: false, // Default to allowance
      });

      const result = calculateSpecialAllowance(
        10000,
        employee,
        new Date('2025-01-01')
      );

      // Shift workers are salaried, should use salaried rates
      expect(result.percentage).toBe(7.60);
      expect(result.isSavings).toBe(false);
    });

    it('should allow shift workers to choose savings', () => {
      const employee = createMockEmployee({
        workTimeType: WorkTimeType.SHIFT_WORK,
        useSpecialSavings: true,
      });

      const result = calculateSpecialAllowance(
        10000,
        employee,
        new Date('2025-01-01')
      );

      expect(result.percentage).toBe(7.60);
      expect(result.isSavings).toBe(true);
    });
  });

  describe('Constants Validation', () => {
    it('should have all years defined for hourly freedom account', () => {
      expect(SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT).toHaveProperty('2025');
      expect(SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT).toHaveProperty('2026');
      expect(SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT).toHaveProperty('2027');
      expect(SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT).toHaveProperty('2028');
    });

    it('should have all years defined for salaried allowance', () => {
      expect(SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE).toHaveProperty('2025');
      expect(SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE).toHaveProperty('2026');
      expect(SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE).toHaveProperty('2027');
      expect(SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE).toHaveProperty('2028');
    });

    it('should have all years defined for savings option', () => {
      expect(SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION).toHaveProperty('2025');
      expect(SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION).toHaveProperty('2026');
      expect(SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION).toHaveProperty('2027');
      expect(SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION).toHaveProperty('2028');
    });
  });
});
