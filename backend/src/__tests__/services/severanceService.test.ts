/**
 * Tests for Severance Pay Service
 * § 22 Fratrædelsesgodtgørelse
 */

import {
  calculateSeverancePay,
  checkSeveranceEligibility,
  validateSeverancePayment,
  generateSeveranceDocument,
  calculateSeverancePayBulk,
  calculateTotalSeveranceCost,
  formatSeveranceAmount,
  SEVERANCE_RULES,
  SeveranceReason,
  SeveranceIneligibilityReason,
} from '../../services/severanceService';
import { TerminationInitiator } from '../../services/terminationService';
import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock allowanceCalculationService
jest.mock('../../services/allowanceCalculationService', () => ({
  calculateEffectiveHourlyWage: jest.fn().mockReturnValue(150), // Mock hourly wage
}));

// Mock employee factory
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-employee-id',
  userId: 'test-user-id',
  cprNumber: null,
  employeeNumber: 'EMP001',
  jobCategory: JobCategory.DRIVER,
  agreementType: AgreementType.DRIVER_AGREEMENT,
  employmentDate: new Date('2010-01-01'),
  anciennity: 180, // 15 years default
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
  birthDate: new Date('1980-01-01'), // 45 years old
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

describe('SeveranceService', () => {
  describe('Eligibility - Anciennity Requirements', () => {
    it('should not be eligible with less than 12 years anciennity', () => {
      const employee = createMockEmployee({ anciennity: 100 }); // ~8 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReason).toBe(
        SeveranceIneligibilityReason.INSUFFICIENT_ANCIENNITY
      );
      expect(result.notes).toContain('12 års anciennitet');
    });

    it('should be eligible with exactly 12 years anciennity', () => {
      const employee = createMockEmployee({ anciennity: 144 }); // 12 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(true);
      expect(result.severanceMonths).toBe(1); // 12-14 years = 1 month
    });

    it('should be eligible with 15 years anciennity', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(true);
      expect(result.severanceMonths).toBe(2); // 15-17 years = 2 months
    });

    it('should be eligible with 20 years anciennity', () => {
      const employee = createMockEmployee({ anciennity: 240 }); // 20 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(true);
      expect(result.severanceMonths).toBe(3); // 18+ years = 3 months
    });
  });

  describe('Eligibility - Termination Initiator', () => {
    it('should not be eligible if employee terminates', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYEE,
        terminationDate
      );

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReason).toBe(SeveranceIneligibilityReason.EMPLOYEE_INITIATED);
      expect(result.notes).toContain('arbejdsgiver');
    });

    it('should be eligible if employer terminates', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(true);
    });
  });

  describe('Eligibility - Gross Misconduct', () => {
    it('should not be eligible if terminated for gross misconduct', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate,
        SeveranceReason.OTHER,
        true // wasGrossMisconduct
      );

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReason).toBe(SeveranceIneligibilityReason.GROSS_MISCONDUCT);
      expect(result.notes).toContain('misligholdelse');
    });

    it('should be eligible if not gross misconduct', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate,
        SeveranceReason.RESTRUCTURING,
        false // not gross misconduct
      );

      expect(result.isEligible).toBe(true);
    });
  });

  describe('Eligibility - Pension Age', () => {
    it('should not be eligible if at pension age (67+)', () => {
      const oldBirthDate = new Date('1950-01-01'); // 75 years old
      const employee = createMockEmployee({
        anciennity: 180,
        birthDate: oldBirthDate,
      });
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReason).toBe(SeveranceIneligibilityReason.PENSION_AGE);
      expect(result.notes).toContain('folkepensionsalder');
    });

    it('should be eligible if under pension age', () => {
      const youngBirthDate = new Date('1990-01-01'); // 35 years old
      const employee = createMockEmployee({
        anciennity: 180,
        birthDate: youngBirthDate,
      });
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(true);
    });
  });

  describe('Severance Amount Calculation', () => {
    it('should calculate 1 month salary for 12-14 years', () => {
      const employee = createMockEmployee({ anciennity: 156 }); // 13 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.severanceMonths).toBe(1);
    });

    it('should calculate 2 months salary for 15-17 years', () => {
      const employee = createMockEmployee({ anciennity: 192 }); // 16 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.severanceMonths).toBe(2);
    });

    it('should calculate 3 months salary for 18+ years', () => {
      const employee = createMockEmployee({ anciennity: 300 }); // 25 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.severanceMonths).toBe(3);
    });

    it('should calculate correct total pay amount', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years, 2 months severance
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      // Hourly wage = 150 (mocked)
      // Daily hours = 7.4
      // Daily pay = 150 * 7.4 = 1110
      // Monthly working days = 21.67
      // Monthly salary = 1110 * 21.67 = 24053.7
      // Severance months = 2
      // Total = 24053.7 * 2 = 48107.4
      expect(result.monthlySalary).toBeDefined();
      expect(result.monthlySalary!.toNumber()).toBeCloseTo(24053.7, 1);
      expect(result.totalSeverancePay).toBeDefined();
      expect(result.totalSeverancePay!.toNumber()).toBeCloseTo(48107.4, 1);
    });
  });

  describe('Boundary Cases', () => {
    it('should handle exactly 14 years (boundary for 1 month)', () => {
      const employee = createMockEmployee({ anciennity: 168 }); // 14 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.severanceMonths).toBe(1);
    });

    it('should handle exactly 15 years (boundary for 2 months)', () => {
      const employee = createMockEmployee({ anciennity: 180 }); // 15 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.severanceMonths).toBe(2);
    });

    it('should handle exactly 18 years (boundary for 3 months)', () => {
      const employee = createMockEmployee({ anciennity: 216 }); // 18 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.severanceMonths).toBe(3);
    });
  });

  describe('Quick Eligibility Check', () => {
    it('should quickly check eligibility - eligible', () => {
      const employee = createMockEmployee({ anciennity: 180 });

      const result = checkSeveranceEligibility(
        employee,
        TerminationInitiator.EMPLOYER
      );

      expect(result.isEligible).toBe(true);
      expect(result.reason).toContain('Opfylder');
    });

    it('should quickly check eligibility - insufficient anciennity', () => {
      const employee = createMockEmployee({ anciennity: 100 });

      const result = checkSeveranceEligibility(
        employee,
        TerminationInitiator.EMPLOYER
      );

      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('anciennitet');
    });

    it('should quickly check eligibility - employee initiated', () => {
      const employee = createMockEmployee({ anciennity: 180 });

      const result = checkSeveranceEligibility(
        employee,
        TerminationInitiator.EMPLOYEE
      );

      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('arbejdsgiver');
    });

    it('should quickly check eligibility - gross misconduct', () => {
      const employee = createMockEmployee({ anciennity: 180 });

      const result = checkSeveranceEligibility(
        employee,
        TerminationInitiator.EMPLOYER,
        true // gross misconduct
      );

      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('misligholdelse');
    });
  });

  describe('Validation', () => {
    it('should validate eligible severance payment', () => {
      const employee = createMockEmployee({ anciennity: 180 });
      const terminationDate = new Date('2025-12-31');

      const severanceCalc = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      const validation = validateSeverancePayment(
        employee,
        severanceCalc,
        terminationDate
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.warnings.some((w) => w.includes('skattepligtig'))).toBe(true);
    });

    it('should reject ineligible severance payment', () => {
      const employee = createMockEmployee({ anciennity: 100 }); // Not eligible
      const terminationDate = new Date('2025-12-31');

      const severanceCalc = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      const validation = validateSeverancePayment(
        employee,
        severanceCalc,
        terminationDate
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('ikke berettiget'))).toBe(true);
    });

    it('should warn about old termination dates', () => {
      const employee = createMockEmployee({ anciennity: 180 });
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 8); // 8 months ago

      const severanceCalc = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        oldDate
      );

      const validation = validateSeverancePayment(employee, severanceCalc, oldDate);

      expect(validation.warnings.some((w) => w.includes('6 måneder'))).toBe(true);
    });
  });

  describe('Document Generation', () => {
    it('should generate severance document for eligible employee', () => {
      const employee = createMockEmployee({ anciennity: 180 });
      const terminationDate = new Date('2025-12-31');

      const severanceCalc = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate,
        SeveranceReason.RESTRUCTURING
      );

      const doc = generateSeveranceDocument(employee, severanceCalc);

      expect(doc.employeeNumber).toBe('EMP001');
      expect(doc.anciennity).toBe('15 år');
      expect(doc.severanceMonths).toBe(2);
      expect(doc.totalSeverancePay).toBeDefined();
      expect(doc.taxNote).toContain('skattepligtig');
    });

    it('should format anciennity with years and months', () => {
      const employee = createMockEmployee({ anciennity: 186 }); // 15 years 6 months
      const terminationDate = new Date('2025-12-31');

      const severanceCalc = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      const doc = generateSeveranceDocument(employee, severanceCalc);

      expect(doc.anciennity).toBe('15 år og 6 måneder');
    });

    it('should throw error for ineligible employee', () => {
      const employee = createMockEmployee({ anciennity: 100 });
      const terminationDate = new Date('2025-12-31');

      const severanceCalc = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(() => generateSeveranceDocument(employee, severanceCalc)).toThrow(
        'ikke berettiget'
      );
    });
  });

  describe('Bulk Calculations', () => {
    it('should calculate severance for multiple employees', () => {
      const employees = [
        createMockEmployee({ id: '1', anciennity: 180 }), // Eligible
        createMockEmployee({ id: '2', anciennity: 100 }), // Not eligible
        createMockEmployee({ id: '3', anciennity: 240 }), // Eligible
      ];
      const terminationDate = new Date('2025-12-31');

      const results = calculateSeverancePayBulk(
        employees,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(results.length).toBe(3);
      expect(results[0].isEligible).toBe(true);
      expect(results[1].isEligible).toBe(false);
      expect(results[2].isEligible).toBe(true);
    });
  });

  describe('Total Cost Calculation', () => {
    it('should calculate total severance cost', () => {
      const employees = [
        createMockEmployee({ id: '1', anciennity: 180 }), // 2 months
        createMockEmployee({ id: '2', anciennity: 100 }), // Not eligible
        createMockEmployee({ id: '3', anciennity: 240 }), // 3 months
      ];
      const terminationDate = new Date('2025-12-31');

      const calculations = calculateSeverancePayBulk(
        employees,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      const totals = calculateTotalSeveranceCost(calculations);

      expect(totals.totalEmployees).toBe(3);
      expect(totals.eligibleEmployees).toBe(2);
      expect(totals.ineligibleEmployees).toBe(1);
      expect(totals.totalCost.toNumber()).toBeGreaterThan(0);
      expect(totals.averageCostPerEligible.toNumber()).toBeGreaterThan(0);
    });

    it('should handle all ineligible employees', () => {
      const employees = [
        createMockEmployee({ id: '1', anciennity: 50 }),
        createMockEmployee({ id: '2', anciennity: 100 }),
      ];
      const terminationDate = new Date('2025-12-31');

      const calculations = calculateSeverancePayBulk(
        employees,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      const totals = calculateTotalSeveranceCost(calculations);

      expect(totals.eligibleEmployees).toBe(0);
      expect(totals.totalCost.toNumber()).toBe(0);
      expect(totals.averageCostPerEligible.toNumber()).toBe(0);
    });
  });

  describe('Formatting', () => {
    it('should format severance amount correctly', () => {
      const amount = new Decimal(65010.5);
      const formatted = formatSeveranceAmount(amount);

      expect(formatted).toBe('65010.50 kr.');
    });

    it('should format zero amount', () => {
      const amount = new Decimal(0);
      const formatted = formatSeveranceAmount(amount);

      expect(formatted).toBe('0.00 kr.');
    });
  });

  describe('Constants Validation', () => {
    it('should have correct minimum anciennity', () => {
      expect(SEVERANCE_RULES.MINIMUM_ANCIENNITY_MONTHS).toBe(144); // 12 years
    });

    it('should have correct severance amounts', () => {
      expect(SEVERANCE_RULES.SEVERANCE_AMOUNTS.MONTHS_144_TO_179).toBe(1);
      expect(SEVERANCE_RULES.SEVERANCE_AMOUNTS.MONTHS_180_TO_215).toBe(2);
      expect(SEVERANCE_RULES.SEVERANCE_AMOUNTS.MONTHS_216_PLUS).toBe(3);
    });

    it('should have correct conditions', () => {
      expect(SEVERANCE_RULES.CONDITIONS.EMPLOYER_INITIATED_ONLY).toBe(true);
      expect(SEVERANCE_RULES.CONDITIONS.EXCLUDE_MISCONDUCT).toBe(true);
      expect(SEVERANCE_RULES.CONDITIONS.EXCLUDE_PENSION_AGE).toBe(true);
    });

    it('should have correct payment rules', () => {
      expect(SEVERANCE_RULES.PAYMENT.TAXABLE).toBe(true);
      expect(SEVERANCE_RULES.PAYMENT.PENSION_QUALIFYING).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high anciennity (40 years)', () => {
      const employee = createMockEmployee({ anciennity: 480 }); // 40 years
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate
      );

      expect(result.isEligible).toBe(true);
      expect(result.severanceMonths).toBe(3); // Still max 3 months
    });

    it('should include severance reason in calculation', () => {
      const employee = createMockEmployee({ anciennity: 180 });
      const terminationDate = new Date('2025-12-31');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        terminationDate,
        SeveranceReason.REDUNDANCY
      );

      expect(result.reason).toBe(SeveranceReason.REDUNDANCY);
    });

    it('should handle termination date in the past', () => {
      const employee = createMockEmployee({ anciennity: 180 });
      const pastDate = new Date('2024-01-01');

      const result = calculateSeverancePay(
        employee,
        TerminationInitiator.EMPLOYER,
        pastDate
      );

      expect(result.isEligible).toBe(true);
      expect(result.terminationDate).toEqual(pastDate);
    });
  });
});
