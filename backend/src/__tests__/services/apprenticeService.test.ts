import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateApprenticeWage,
  calculateSchoolPeriodCompensation,
  calculateExamBonus,
  calculateApprenticeProgression,
  calculateMonthlyApprenticeEarnings,
  calculateAge,
  getApprenticeWagePercentage,
  calculateApprenticeAnciennityBonus,
  validateApprentice,
  formatApprenticeType,
  formatApprenticeYear,
  ApprenticeType,
  APPRENTICE_RULES,
} from '../../services/apprenticeService';

// Mock employee factory
const createMockApprentice = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-employee-id',
  userId: 'test-user-id',
  cprNumber: null,
  employeeNumber: 'APPRENTICE001',
  jobCategory: JobCategory.DRIVER,
  agreementType: AgreementType.DRIVER_AGREEMENT,
  employmentDate: new Date('2023-01-01'),
  anciennity: 24,
  workTimeType: WorkTimeType.HOURLY,
  baseSalary: new Decimal(100),
  department: null,
  location: null,
  postalCode: '2000',
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
  birthDate: new Date('2005-06-15'), // 20 years old in 2025
  useSpecialSavings: false,
  seniorSchemeActive: false,
  seniorDaysPerYear: 0,
  seniorPensionConversion: new Decimal(0),
  isCrossBorderDriver: false,
  isFixedCrossBorder: false,
  isApprentice: true,
  apprenticeYear: 2,
  isAdultApprentice: false,
  isEGUStudent: false,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('ApprenticeService', () => {
  let apprentice: Employee;

  beforeEach(() => {
    apprentice = createMockApprentice();
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('2005-06-15');
      const referenceDate = new Date('2025-10-18');

      expect(calculateAge(birthDate, referenceDate)).toBe(20);
    });

    it('should calculate age before birthday', () => {
      const birthDate = new Date('2005-12-15');
      const referenceDate = new Date('2025-10-18');

      expect(calculateAge(birthDate, referenceDate)).toBe(19);
    });

    it('should calculate age on birthday', () => {
      const birthDate = new Date('2005-10-18');
      const referenceDate = new Date('2025-10-18');

      expect(calculateAge(birthDate, referenceDate)).toBe(20);
    });

    it('should calculate adult age (25+)', () => {
      const birthDate = new Date('1995-06-15');
      const referenceDate = new Date('2025-10-18');

      expect(calculateAge(birthDate, referenceDate)).toBe(30);
    });
  });

  describe('getApprenticeWagePercentage', () => {
    it('should return 50% for year 1 standard apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 1, false)).toBe(50);
    });

    it('should return 60% for year 2 standard apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 2, false)).toBe(60);
    });

    it('should return 75% for year 3 standard apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 3, false)).toBe(75);
    });

    it('should return 90% for year 4 standard apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 4, false)).toBe(90);
    });

    it('should return 80% for adult apprentice regardless of year', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 1, true)).toBe(80);
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 2, true)).toBe(80);
      expect(getApprenticeWagePercentage(ApprenticeType.STANDARD, 3, true)).toBe(80);
    });

    it('should return 55% for year 1 dispatcher apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.DISPATCHER, 1, false)).toBe(55);
    });

    it('should return 65% for year 2 dispatcher apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.DISPATCHER, 2, false)).toBe(65);
    });

    it('should return 80% for year 3 dispatcher apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.DISPATCHER, 3, false)).toBe(80);
    });

    it('should return 95% for year 4 dispatcher apprentice', () => {
      expect(getApprenticeWagePercentage(ApprenticeType.DISPATCHER, 4, false)).toBe(95);
    });
  });

  describe('calculateApprenticeAnciennityBonus', () => {
    it('should return 0 for non-adult apprentice', () => {
      const baseWage = new Decimal(100);
      const bonus = calculateApprenticeAnciennityBonus(baseWage, 12, false);

      expect(bonus.toNumber()).toBe(0);
    });

    it('should return 0 for adult apprentice with less than 1 year', () => {
      const baseWage = new Decimal(100);
      const bonus = calculateApprenticeAnciennityBonus(baseWage, 6, true);

      expect(bonus.toNumber()).toBe(0);
    });

    it('should return 2% bonus for adult apprentice after 1 year', () => {
      const baseWage = new Decimal(100);
      const bonus = calculateApprenticeAnciennityBonus(baseWage, 14, true);

      expect(bonus.toNumber()).toBe(2); // 2% of 100
    });

    it('should return 4% bonus for adult apprentice after 2 years', () => {
      const baseWage = new Decimal(100);
      const bonus = calculateApprenticeAnciennityBonus(baseWage, 26, true);

      expect(bonus.toNumber()).toBe(4); // 4% of 100
    });
  });

  describe('calculateApprenticeWage', () => {
    it('should calculate wage for year 1 standard apprentice', () => {
      apprentice.apprenticeYear = 1;

      const wage = calculateApprenticeWage(apprentice, 1);

      // 165 * 50% = 82.5
      expect(wage.wagePercentage).toBe(50);
      expect(wage.baseHourlyWage.toNumber()).toBe(82.5);
      expect(wage.totalHourlyWage.toNumber()).toBe(82.5);
      expect(wage.isAdult).toBe(false);
    });

    it('should calculate wage for year 2 standard apprentice', () => {
      apprentice.apprenticeYear = 2;

      const wage = calculateApprenticeWage(apprentice, 2);

      // 165 * 60% = 99
      expect(wage.wagePercentage).toBe(60);
      expect(wage.baseHourlyWage.toNumber()).toBe(99);
    });

    it('should calculate wage for year 3 standard apprentice', () => {
      apprentice.apprenticeYear = 3;

      const wage = calculateApprenticeWage(apprentice, 3);

      // 165 * 75% = 123.75
      expect(wage.wagePercentage).toBe(75);
      expect(wage.baseHourlyWage.toNumber()).toBe(123.75);
    });

    it('should calculate wage for year 4 standard apprentice', () => {
      apprentice.apprenticeYear = 4;

      const wage = calculateApprenticeWage(apprentice, 4);

      // 165 * 90% = 148.5
      expect(wage.wagePercentage).toBe(90);
      expect(wage.baseHourlyWage.toNumber()).toBe(148.5);
    });

    it('should calculate wage for adult apprentice', () => {
      apprentice.birthDate = new Date('1990-01-01'); // 35 years old
      apprentice.isAdultApprentice = true;
      apprentice.apprenticeYear = 1;

      const wage = calculateApprenticeWage(apprentice, 1);

      // 165 * 80% = 132
      expect(wage.wagePercentage).toBe(80);
      expect(wage.baseHourlyWage.toNumber()).toBe(132);
      expect(wage.isAdult).toBe(true);
    });

    it('should add anciennity bonus for adult apprentice after 1 year', () => {
      apprentice.birthDate = new Date('1990-01-01');
      apprentice.isAdultApprentice = true;

      const wage = calculateApprenticeWage(apprentice, 1, ApprenticeType.STANDARD, 165, 14);

      // Base: 165 * 80% = 132
      // Anciennity: 132 * 2% = 2.64
      // Total: 134.64
      expect(wage.baseHourlyWage.toNumber()).toBe(132);
      expect(wage.anciennityBonus.toNumber()).toBeCloseTo(2.64, 2);
      expect(wage.totalHourlyWage.toNumber()).toBeCloseTo(134.64, 2);
    });

    it('should calculate wage for dispatcher apprentice year 1', () => {
      const wage = calculateApprenticeWage(
        apprentice,
        1,
        ApprenticeType.DISPATCHER
      );

      // 165 * 55% = 90.75
      expect(wage.wagePercentage).toBe(55);
      expect(wage.baseHourlyWage.toNumber()).toBe(90.75);
    });

    it('should calculate wage for dispatcher apprentice year 4', () => {
      const wage = calculateApprenticeWage(
        apprentice,
        4,
        ApprenticeType.DISPATCHER
      );

      // 165 * 95% = 156.75
      expect(wage.wagePercentage).toBe(95);
      expect(wage.baseHourlyWage.toNumber()).toBe(156.75);
    });

    it('should throw error if no birth date', () => {
      apprentice.birthDate = null;

      expect(() => calculateApprenticeWage(apprentice, 1)).toThrow('Fødselsdato er påkrævet');
    });
  });

  describe('calculateSchoolPeriodCompensation', () => {
    it('should calculate school period compensation without travel', () => {
      apprentice.apprenticeYear = 2;
      const startDate = new Date('2025-10-20');
      const endDate = new Date('2025-10-24'); // 5 days

      const result = calculateSchoolPeriodCompensation(
        apprentice,
        startDate,
        endDate,
        false // Not far from home
      );

      // Wage for year 2: 165 * 60% = 99 kr/hour
      // Daily: 99 * 7.4 = 732.6
      // 5 days: 3663
      expect(result.daysCount).toBe(5);
      expect(result.isFarFromHome).toBe(false);
      expect(result.travelAllowance.toNumber()).toBe(0);
      expect(result.mealAllowance.toNumber()).toBe(0);
      expect(result.salaryDuringSchool.toNumber()).toBeCloseTo(3663, 0);
    });

    it('should add travel and meal allowances when far from home', () => {
      apprentice.apprenticeYear = 2;
      const startDate = new Date('2025-10-20');
      const endDate = new Date('2025-10-24'); // 5 days

      const result = calculateSchoolPeriodCompensation(
        apprentice,
        startDate,
        endDate,
        true // Far from home
      );

      // Travel: 150 * 5 = 750
      // Meals: 100 * 5 = 500
      expect(result.isFarFromHome).toBe(true);
      expect(result.travelAllowance.toNumber()).toBe(750);
      expect(result.mealAllowance.toNumber()).toBe(500);
      expect(result.totalCompensation.toNumber()).toBeGreaterThan(result.salaryDuringSchool.toNumber());
    });

    it('should calculate compensation for 1-week school period', () => {
      apprentice.apprenticeYear = 1;
      const startDate = new Date('2025-10-20');
      const endDate = new Date('2025-10-26'); // 7 days

      const result = calculateSchoolPeriodCompensation(
        apprentice,
        startDate,
        endDate,
        false
      );

      expect(result.daysCount).toBe(7);
    });
  });

  describe('calculateExamBonus', () => {
    it('should return 5000 kr for passed final exam', () => {
      const result = calculateExamBonus(
        apprentice.id,
        new Date('2025-06-01'),
        true // Passed
      );

      expect(result.passed).toBe(true);
      expect(result.examBonus.toNumber()).toBe(5000);
      expect(result.totalBonus.toNumber()).toBe(5000);
    });

    it('should return 0 kr for failed exam', () => {
      const result = calculateExamBonus(
        apprentice.id,
        new Date('2025-06-01'),
        false // Failed
      );

      expect(result.passed).toBe(false);
      expect(result.totalBonus.toNumber()).toBe(0);
    });

    it('should add 8000 kr for excellent grade', () => {
      const result = calculateExamBonus(
        apprentice.id,
        new Date('2025-06-01'),
        true,
        true // Excellent grade
      );

      // 5000 + 8000 = 13000
      expect(result.excellenceBonus.toNumber()).toBe(8000);
      expect(result.totalBonus.toNumber()).toBe(13000);
    });

    it('should add 3000 kr for early completion', () => {
      const result = calculateExamBonus(
        apprentice.id,
        new Date('2025-06-01'),
        true,
        false,
        true // Early completion
      );

      // 5000 + 3000 = 8000
      expect(result.earlyCompletionBonus.toNumber()).toBe(3000);
      expect(result.totalBonus.toNumber()).toBe(8000);
    });

    it('should combine all bonuses', () => {
      const result = calculateExamBonus(
        apprentice.id,
        new Date('2025-06-01'),
        true,
        true, // Excellent
        true  // Early
      );

      // 5000 + 8000 + 3000 = 16000
      expect(result.totalBonus.toNumber()).toBe(16000);
    });

    it('should not give excellent/early bonus if exam failed', () => {
      const result = calculateExamBonus(
        apprentice.id,
        new Date('2025-06-01'),
        false,
        true, // Excellent (but failed)
        true  // Early (but failed)
      );

      expect(result.totalBonus.toNumber()).toBe(0);
    });
  });

  describe('calculateApprenticeProgression', () => {
    it('should calculate progression for year 1', () => {
      const startDate = new Date('2024-08-01');
      const referenceDate = new Date('2025-10-18');

      const progression = calculateApprenticeProgression(
        apprentice.id,
        startDate,
        1,
        referenceDate
      );

      expect(progression.currentYear).toBe(1);
      expect(progression.totalMonthsAsApprentice).toBe(14); // Aug 2024 to Oct 2025
      expect(progression.canProgressToNextYear).toBe(true); // Completed 12+ months, can progress
    });

    it('should detect readiness to progress to next year', () => {
      const startDate = new Date('2023-08-01');
      const referenceDate = new Date('2025-10-18');

      const progression = calculateApprenticeProgression(
        apprentice.id,
        startDate,
        2,
        referenceDate
      );

      expect(progression.totalMonthsAsApprentice).toBe(26);
      expect(progression.monthsInCurrentYear).toBe(12);
      expect(progression.canProgressToNextYear).toBe(true);
    });

    it('should calculate expected completion date', () => {
      const startDate = new Date('2023-08-01');
      const referenceDate = new Date('2025-10-18');

      const progression = calculateApprenticeProgression(
        apprentice.id,
        startDate,
        2,
        referenceDate
      );

      const expectedYear = 2027; // 4 years from 2023
      expect(progression.expectedCompletionDate.getFullYear()).toBe(expectedYear);
    });

    it('should not allow progression beyond year 4', () => {
      const startDate = new Date('2020-08-01');
      const referenceDate = new Date('2025-10-18');

      const progression = calculateApprenticeProgression(
        apprentice.id,
        startDate,
        4,
        referenceDate
      );

      expect(progression.canProgressToNextYear).toBe(false);
    });
  });

  describe('calculateMonthlyApprenticeEarnings', () => {
    it('should calculate monthly earnings for 160 hours', () => {
      apprentice.apprenticeYear = 2;

      const result = calculateMonthlyApprenticeEarnings(apprentice, 160);

      // Year 2: 165 * 60% = 99 kr/hour
      // 160 * 99 = 15840
      expect(result.hoursWorked).toBe(160);
      expect(result.hourlyWage.toNumber()).toBe(99);
      expect(result.regularEarnings.toNumber()).toBe(15840);
      expect(result.schoolDaysCompensation.toNumber()).toBe(0);
      expect(result.totalEarnings.toNumber()).toBe(15840);
    });

    it('should add school days compensation', () => {
      apprentice.apprenticeYear = 2;

      const result = calculateMonthlyApprenticeEarnings(
        apprentice,
        140, // Regular hours
        5    // School days
      );

      // Regular: 140 * 99 = 13860
      // School: 5 * (99 * 7.4) = 5 * 732.6 = 3663
      // Total: 17523
      expect(result.hoursWorked).toBe(140);
      expect(result.schoolDaysCompensation.toNumber()).toBeCloseTo(3663, 0);
      expect(result.totalEarnings.toNumber()).toBeCloseTo(17523, 0);
    });
  });

  describe('validateApprentice', () => {
    it('should validate correct apprentice', () => {
      const validation = validateApprentice(apprentice);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should require birth date', () => {
      apprentice.birthDate = null;

      const validation = validateApprentice(apprentice);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Fødselsdato er påkrævet for lærlinge');
    });

    it('should reject apprentice under 16', () => {
      apprentice.birthDate = new Date('2015-01-01'); // 10 years old

      const validation = validateApprentice(apprentice);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('mindst 16 år'))).toBe(true);
    });

    it('should warn if 25+ but not marked as adult apprentice', () => {
      apprentice.birthDate = new Date('1990-01-01'); // 35 years old
      apprentice.isAdultApprentice = false;

      const validation = validateApprentice(apprentice);

      expect(validation.warnings.some((w) => w.includes('voksenlærling'))).toBe(true);
    });

    it('should reject invalid apprentice year', () => {
      apprentice.apprenticeYear = 5;

      const validation = validateApprentice(apprentice);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('mellem 1 og 4'))).toBe(true);
    });

    it('should warn if under 18 and not hourly', () => {
      apprentice.birthDate = new Date('2010-01-01'); // 15 years old
      apprentice.workTimeType = WorkTimeType.SALARIED;

      const validation = validateApprentice(apprentice);

      expect(validation.warnings.some((w) => w.includes('timelønnet'))).toBe(true);
    });

    it('should warn if not marked as apprentice', () => {
      apprentice.isApprentice = false;

      const validation = validateApprentice(apprentice);

      expect(validation.warnings.some((w) => w.includes('ikke markeret som lærling'))).toBe(true);
    });
  });

  describe('Formatting functions', () => {
    it('should format apprentice types correctly', () => {
      expect(formatApprenticeType(ApprenticeType.STANDARD)).toBe('Standard lærling');
      expect(formatApprenticeType(ApprenticeType.ADULT)).toBe('Voksenlærling (25+)');
      expect(formatApprenticeType(ApprenticeType.DISPATCHER)).toBe('Disponentlærling');
      expect(formatApprenticeType(ApprenticeType.EGU)).toBe('EGU-elev');
    });

    it('should format apprentice years correctly', () => {
      expect(formatApprenticeYear(1)).toBe('1. lærlingeår');
      expect(formatApprenticeYear(2)).toBe('2. lærlingeår');
      expect(formatApprenticeYear(3)).toBe('3. lærlingeår');
      expect(formatApprenticeYear(4)).toBe('4. lærlingeår');
    });
  });
});
