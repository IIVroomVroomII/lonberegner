/**
 * Tests for Allowance Calculation Service
 * § 2 Løn - Tillægsberegning
 */

import {
  calculateAllowances,
  calculateEffectiveHourlyWage,
  validateEmployeeAllowanceConfiguration,
  ALLOWANCE_RATES,
} from '../../services/allowanceCalculationService';
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

describe('AllowanceCalculationService', () => {
  describe('Driver Allowances (Chaufførtillæg)', () => {
    it('should calculate driver allowance for HEAVY vehicle', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
      });

      const allowances = calculateAllowances(employee, 'HEAVY');

      expect(allowances.driverAllowance).toBe(ALLOWANCE_RATES.DRIVER.HEAVY);
      expect(allowances.driverAllowance).toBe(22.50);
    });

    it('should calculate driver allowance for ARTICULATED vehicle', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
      });

      const allowances = calculateAllowances(employee, 'ARTICULATED');

      expect(allowances.driverAllowance).toBe(ALLOWANCE_RATES.DRIVER.ARTICULATED);
      expect(allowances.driverAllowance).toBe(28.00);
    });

    it('should default to MEDIUM when vehicle type not specified', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.driverAllowance).toBe(ALLOWANCE_RATES.DRIVER.MEDIUM);
    });

    it('should not calculate driver allowance if no driver license', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: false,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.driverAllowance).toBe(0);
    });
  });

  describe('Warehouse Allowances (Lager/Terminaltillæg)', () => {
    it('should calculate Copenhagen warehouse allowance', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.WAREHOUSE,
        postalCode: '2000', // København
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.warehouseAllowance).toBe(ALLOWANCE_RATES.WAREHOUSE.COPENHAGEN);
      expect(allowances.warehouseAllowance).toBe(18.00);
    });

    it('should calculate Copenhagen warehouse allowance for Frederiksberg', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.WAREHOUSE,
        postalCode: '1950', // Frederiksberg
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.warehouseAllowance).toBe(ALLOWANCE_RATES.WAREHOUSE.COPENHAGEN);
    });

    it('should calculate province warehouse allowance', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.WAREHOUSE,
        postalCode: '8000', // Aarhus (provinsen)
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.warehouseAllowance).toBe(ALLOWANCE_RATES.WAREHOUSE.PROVINCE);
      expect(allowances.warehouseAllowance).toBe(14.50);
    });

    it('should default to province when postal code not specified', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.WAREHOUSE,
        postalCode: null,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.warehouseAllowance).toBe(ALLOWANCE_RATES.WAREHOUSE.PROVINCE);
    });

    it('should calculate allowance for TERMINAL job category', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.TERMINAL,
        postalCode: '2100', // Østerbro (København)
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.warehouseAllowance).toBe(ALLOWANCE_RATES.WAREHOUSE.COPENHAGEN);
    });
  });

  describe('Mover Allowances (Flyttetillæg)', () => {
    it('should calculate mover allowance', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.MOVER,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.moverAllowance).toBe(ALLOWANCE_RATES.MOVER);
      expect(allowances.moverAllowance).toBe(20.00);
    });
  });

  describe('Renovation Allowances (Renovationstillæg)', () => {
    it('should calculate renovation allowance', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.RENOVATION,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.renovationAllowance).toBe(ALLOWANCE_RATES.RENOVATION);
      expect(allowances.renovationAllowance).toBe(16.50);
    });
  });

  describe('Vocational Degree Allowance (Faglært tillæg)', () => {
    it('should calculate vocational degree allowance', () => {
      const employee = createMockEmployee({
        hasVocationalDegree: true,
        vocationalDegreeType: 'Transport',
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.vocationalDegreeAllowance).toBe(ALLOWANCE_RATES.VOCATIONAL_DEGREE);
      expect(allowances.vocationalDegreeAllowance).toBe(12.00);
    });

    it('should not calculate without vocational degree', () => {
      const employee = createMockEmployee({
        hasVocationalDegree: false,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.vocationalDegreeAllowance).toBe(0);
    });
  });

  describe('Seniority Allowance (Anciennitetstillæg)', () => {
    it('should calculate seniority allowance for 12 months', () => {
      const employee = createMockEmployee({
        anciennity: 12, // 1 år
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.seniorityAllowance).toBe(12 * 0.15); // 1.80 kr/time
    });

    it('should calculate seniority allowance for 60 months (max)', () => {
      const employee = createMockEmployee({
        anciennity: 60, // 5 år (max)
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.seniorityAllowance).toBe(60 * 0.15); // 9.00 kr/time
    });

    it('should cap seniority at 60 months', () => {
      const employee = createMockEmployee({
        anciennity: 100, // 8.3 år (over max)
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.seniorityAllowance).toBe(60 * 0.15); // Still 9.00 kr/time
    });

    it('should return 0 for 0 months anciennity', () => {
      const employee = createMockEmployee({
        anciennity: 0,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.seniorityAllowance).toBe(0);
    });
  });

  describe('Certificate Allowances (Certifikattillæg)', () => {
    it('should calculate ADR certificate allowance', () => {
      const employee = createMockEmployee({
        hasADRCertificate: true,
        adrCertificateType: 'Tank',
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.certificateAllowances.adr).toBe(ALLOWANCE_RATES.CERTIFICATES.ADR);
      expect(allowances.certificateAllowances.adr).toBe(5.00);
    });

    it('should calculate forklift certificate allowance', () => {
      const employee = createMockEmployee({
        hasForkliftCertificate: true,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.certificateAllowances.forklift).toBe(
        ALLOWANCE_RATES.CERTIFICATES.FORKLIFT
      );
      expect(allowances.certificateAllowances.forklift).toBe(3.50);
    });

    it('should calculate crane certificate allowance', () => {
      const employee = createMockEmployee({
        hasCraneCertificate: true,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.certificateAllowances.crane).toBe(ALLOWANCE_RATES.CERTIFICATES.CRANE);
      expect(allowances.certificateAllowances.crane).toBe(4.00);
    });

    it('should calculate multiple certificate allowances', () => {
      const employee = createMockEmployee({
        hasADRCertificate: true,
        hasForkliftCertificate: true,
        hasCraneCertificate: true,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.certificateAllowances.adr).toBe(5.00);
      expect(allowances.certificateAllowances.forklift).toBe(3.50);
      expect(allowances.certificateAllowances.crane).toBe(4.00);
    });
  });

  describe('Local Salary (Lokalløn)', () => {
    it('should calculate local salary allowance within limit', () => {
      const employee = createMockEmployee({
        localSalaryAgreement: new Decimal(2.00),
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.localSalaryAllowance).toBe(2.00);
    });

    it('should cap local salary at maximum (2.50 kr/time)', () => {
      const employee = createMockEmployee({
        localSalaryAgreement: new Decimal(5.00), // Over max
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.localSalaryAllowance).toBe(ALLOWANCE_RATES.LOCAL_SALARY_MAX);
      expect(allowances.localSalaryAllowance).toBe(2.50);
    });

    it('should return 0 when no local salary', () => {
      const employee = createMockEmployee({
        localSalaryAgreement: null,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.localSalaryAllowance).toBe(0);
    });
  });

  describe('Youth Worker Percentage (Ungarbejder)', () => {
    it('should calculate 50% for under 18', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 17); // 17 years old

      const employee = createMockEmployee({
        isYouthWorker: true,
        birthDate,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.youthWorkerPercentage).toBe(0.50);
    });

    it('should calculate 70% for age 18', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18); // 18 years old

      const employee = createMockEmployee({
        isYouthWorker: true,
        birthDate,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.youthWorkerPercentage).toBe(0.70);
    });

    it('should calculate 85% for age 19', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 19); // 19 years old

      const employee = createMockEmployee({
        isYouthWorker: true,
        birthDate,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.youthWorkerPercentage).toBe(0.85);
    });

    it('should calculate 100% for age 20+', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 20); // 20 years old

      const employee = createMockEmployee({
        isYouthWorker: true,
        birthDate,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.youthWorkerPercentage).toBe(1.00);
    });

    it('should return 100% for non-youth workers', () => {
      const employee = createMockEmployee({
        isYouthWorker: false,
      });

      const allowances = calculateAllowances(employee);

      expect(allowances.youthWorkerPercentage).toBe(1.00);
    });
  });

  describe('Total Hourly Allowance Calculation', () => {
    it('should sum all allowances correctly', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
        hasVocationalDegree: true,
        anciennity: 24, // 2 years
        hasADRCertificate: true,
        localSalaryAgreement: new Decimal(2.00),
      });

      const allowances = calculateAllowances(employee, 'HEAVY');

      const expectedTotal =
        ALLOWANCE_RATES.DRIVER.HEAVY + // 22.50
        ALLOWANCE_RATES.VOCATIONAL_DEGREE + // 12.00
        24 * ALLOWANCE_RATES.SENIORITY.PER_MONTH + // 3.60
        ALLOWANCE_RATES.CERTIFICATES.ADR + // 5.00
        2.00; // Local salary

      expect(allowances.totalHourlyAllowance).toBe(expectedTotal);
      expect(allowances.totalHourlyAllowance).toBe(45.10);
    });
  });

  describe('Effective Hourly Wage Calculation', () => {
    it('should calculate effective wage with allowances', () => {
      const employee = createMockEmployee({
        baseSalary: new Decimal(150),
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
        hasVocationalDegree: true,
      });

      const effectiveWage = calculateEffectiveHourlyWage(employee, 'HEAVY');

      const expectedWage =
        150 + // Base salary
        ALLOWANCE_RATES.DRIVER.HEAVY + // 22.50
        ALLOWANCE_RATES.VOCATIONAL_DEGREE; // 12.00

      expect(effectiveWage).toBe(expectedWage);
      expect(effectiveWage).toBe(184.50);
    });

    it('should apply youth worker percentage to base salary only', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 18); // 18 years old

      const employee = createMockEmployee({
        baseSalary: new Decimal(150),
        isYouthWorker: true,
        birthDate,
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
      });

      const effectiveWage = calculateEffectiveHourlyWage(employee, 'HEAVY');

      const expectedWage =
        150 * 0.70 + // Base salary * 70%
        ALLOWANCE_RATES.DRIVER.HEAVY; // Allowances NOT reduced

      expect(effectiveWage).toBe(expectedWage);
      expect(effectiveWage).toBe(127.50);
    });
  });

  describe('Validation', () => {
    it('should validate driver with no license as invalid', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: false,
      });

      const validation = validateEmployeeAllowanceConfiguration(employee);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Chauffør skal have kørekort');
    });

    it('should warn when driver license number is missing', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
        driverLicenseNumber: null,
      });

      const validation = validateEmployeeAllowanceConfiguration(employee);

      expect(validation.warnings).toContain('Kørekortnummer mangler');
    });

    it('should error when driver license is expired', () => {
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() - 1); // 1 year ago

      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
        driverLicenseExpiry: expiredDate,
      });

      const validation = validateEmployeeAllowanceConfiguration(employee);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Kørekort er udløbet');
    });

    it('should error when youth worker has no birth date', () => {
      const employee = createMockEmployee({
        isYouthWorker: true,
        birthDate: null,
      });

      const validation = validateEmployeeAllowanceConfiguration(employee);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Ungarbejder skal have fødselsdato');
    });

    it('should warn when local salary exceeds maximum', () => {
      const employee = createMockEmployee({
        localSalaryAgreement: new Decimal(5.00), // Over max 2.50
      });

      const validation = validateEmployeeAllowanceConfiguration(employee);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('overstiger maksimum');
    });

    it('should pass validation for properly configured employee', () => {
      const employee = createMockEmployee({
        jobCategory: JobCategory.DRIVER,
        hasDriverLicense: true,
        driverLicenseNumber: 'DK12345678',
        driverLicenseExpiry: new Date('2030-01-01'),
        hasVocationalDegree: true,
        vocationalDegreeType: 'Transport',
      });

      const validation = validateEmployeeAllowanceConfiguration(employee);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });
});
