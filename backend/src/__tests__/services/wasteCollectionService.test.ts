import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateWasteCollectionShift,
  calculateDailyCollectionSummary,
  getContainerRate,
  getDifficultyMultiplier,
  getWeatherCompensationPercent,
  calculateSpecialAllowances,
  calculateEstimatedHours,
  validateContainerCollection,
  validateWasteCollectionShift,
  formatContainerType,
  formatRouteDifficulty,
  formatWeatherCondition,
  ContainerType,
  RouteDifficulty,
  WeatherCondition,
  ContainerCollection,
  WASTE_COLLECTION_RULES,
} from '../../services/wasteCollectionService';

// Mock employee factory
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-employee-id',
  userId: 'test-user-id',
  cprNumber: null,
  employeeNumber: 'EMP001',
  jobCategory: JobCategory.RENOVATION,
  agreementType: AgreementType.DRIVER_AGREEMENT,
  employmentDate: new Date('2020-01-01'),
  anciennity: 60, // 5 years
  workTimeType: WorkTimeType.HOURLY,
  baseSalary: new Decimal(150),
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
  birthDate: new Date('1985-06-15'),
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
  createdAt: new Date('2020-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('WasteCollectionService', () => {
  let employee: Employee;

  beforeEach(() => {
    employee = createMockEmployee();
  });

  describe('getContainerRate', () => {
    it('should return correct rate for mini container', () => {
      expect(getContainerRate(ContainerType.MINI)).toBe(2.5);
    });

    it('should return correct rate for standard container', () => {
      expect(getContainerRate(ContainerType.STANDARD)).toBe(4.0);
    });

    it('should return correct rate for large container', () => {
      expect(getContainerRate(ContainerType.LARGE)).toBe(6.5);
    });

    it('should return correct rate for extra large container', () => {
      expect(getContainerRate(ContainerType.EXTRA_LARGE)).toBe(9.0);
    });

    it('should return correct rate for paper recycling', () => {
      expect(getContainerRate(ContainerType.PAPER_RECYCLING)).toBe(3.0);
    });

    it('should return correct rate for glass recycling', () => {
      expect(getContainerRate(ContainerType.GLASS_RECYCLING)).toBe(3.5);
    });
  });

  describe('getDifficultyMultiplier', () => {
    it('should return 1.0 for easy routes', () => {
      expect(getDifficultyMultiplier(RouteDifficulty.EASY)).toBe(1.0);
    });

    it('should return 1.15 for normal routes', () => {
      expect(getDifficultyMultiplier(RouteDifficulty.NORMAL)).toBe(1.15);
    });

    it('should return 1.3 for difficult routes', () => {
      expect(getDifficultyMultiplier(RouteDifficulty.DIFFICULT)).toBe(1.3);
    });

    it('should return 1.5 for very difficult routes', () => {
      expect(getDifficultyMultiplier(RouteDifficulty.VERY_DIFFICULT)).toBe(1.5);
    });
  });

  describe('getWeatherCompensationPercent', () => {
    it('should return 0% for normal weather', () => {
      expect(getWeatherCompensationPercent(WeatherCondition.NORMAL)).toBe(0);
    });

    it('should return 10% for rain', () => {
      expect(getWeatherCompensationPercent(WeatherCondition.RAIN)).toBe(10);
    });

    it('should return 15% for snow', () => {
      expect(getWeatherCompensationPercent(WeatherCondition.SNOW)).toBe(15);
    });

    it('should return 20% for ice', () => {
      expect(getWeatherCompensationPercent(WeatherCondition.ICE)).toBe(20);
    });

    it('should return 12% for extreme heat', () => {
      expect(getWeatherCompensationPercent(WeatherCondition.EXTREME_HEAT)).toBe(12);
    });
  });

  describe('calculateSpecialAllowances', () => {
    it('should return 0 for standard container with no special conditions', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 10,
      };

      const allowances = calculateSpecialAllowances(collection);
      expect(allowances.toNumber()).toBe(0);
    });

    it('should add underground container allowance', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 10,
        isUnderground: true,
      };

      const allowances = calculateSpecialAllowances(collection);
      expect(allowances.toNumber()).toBe(50); // 10 * 5.0
    });

    it('should add locked container allowance', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 10,
        isLocked: true,
      };

      const allowances = calculateSpecialAllowances(collection);
      expect(allowances.toNumber()).toBe(20); // 10 * 2.0
    });

    it('should add heavy container allowance', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.LARGE,
        count: 5,
        isHeavy: true,
      };

      const allowances = calculateSpecialAllowances(collection);
      expect(allowances.toNumber()).toBe(17.5); // 5 * 3.5
    });

    it('should add difficult access allowance', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 10,
        hasDifficultAccess: true,
      };

      const allowances = calculateSpecialAllowances(collection);
      expect(allowances.toNumber()).toBe(40); // 10 * 4.0
    });

    it('should combine multiple special allowances', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 10,
        isUnderground: true,
        isLocked: true,
        hasDifficultAccess: true,
      };

      const allowances = calculateSpecialAllowances(collection);
      // (5.0 + 2.0 + 4.0) * 10 = 110
      expect(allowances.toNumber()).toBe(110);
    });
  });

  describe('calculateEstimatedHours', () => {
    it('should estimate hours for mini containers', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.MINI, count: 40 }, // 40 * 1.5 min = 60 min = 1 hour
      ];

      const hours = calculateEstimatedHours(collections);
      expect(hours).toBe(1.0);
    });

    it('should estimate hours for standard containers', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 60 }, // 60 * 2.0 min = 120 min = 2 hours
      ];

      const hours = calculateEstimatedHours(collections);
      expect(hours).toBe(2.0);
    });

    it('should estimate hours for mixed container types', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.MINI, count: 20 }, // 30 min
        { containerType: ContainerType.STANDARD, count: 30 }, // 60 min
        { containerType: ContainerType.LARGE, count: 20 }, // 50 min
      ];

      const hours = calculateEstimatedHours(collections);
      // Total: 140 minutes = 2.33 hours, rounded up to 2.4
      expect(hours).toBeGreaterThanOrEqual(2.3);
      expect(hours).toBeLessThanOrEqual(2.4);
    });

    it('should add extra time for underground containers', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 10 }, // 10 * 2.0 = 20 min
        { containerType: ContainerType.STANDARD, count: 10, isUnderground: true }, // 10 * 2.5 = 25 min
      ];

      const hours = calculateEstimatedHours(collections);
      // Total: 45 minutes = 0.75 hours, rounded to 0.8
      expect(hours).toBeGreaterThanOrEqual(0.7);
      expect(hours).toBeLessThanOrEqual(0.8);
    });

    it('should add extra time for difficult access', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 10, hasDifficultAccess: true },
        // 10 * (2.0 + 0.7) = 27 min
      ];

      const hours = calculateEstimatedHours(collections);
      expect(hours).toBeGreaterThanOrEqual(0.4);
      expect(hours).toBeLessThanOrEqual(0.5);
    });
  });

  describe('calculateWasteCollectionShift', () => {
    it('should calculate basic shift with standard containers', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 100 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections
      );

      // Base: 100 * 4.0 = 400
      // Difficulty (NORMAL): 400 * 1.15 = 460
      expect(shift.basePayment.toNumber()).toBe(400);
      expect(shift.totalContainers).toBe(100);
      expect(shift.routeDifficulty).toBe(RouteDifficulty.NORMAL);
      expect(shift.totalPayment.toNumber()).toBe(460);
    });

    it('should apply difficulty multiplier', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 100 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.VERY_DIFFICULT
      );

      // Base: 400
      // Difficulty: 400 * 1.5 = 600
      expect(shift.basePayment.toNumber()).toBe(400);
      expect(shift.difficultyAdjustment.toNumber()).toBe(200); // 600 - 400
      expect(shift.totalPayment.toNumber()).toBe(600);
    });

    it('should apply weather compensation', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 100 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.NORMAL,
        WeatherCondition.RAIN
      );

      // Base: 400
      // Difficulty: 400 * 1.15 = 460
      // Weather: 460 * 10% = 46
      // Total: 506
      expect(shift.basePayment.toNumber()).toBe(400);
      expect(shift.weatherCompensation.toNumber()).toBe(46);
      expect(shift.totalPayment.toNumber()).toBe(506);
    });

    it('should apply minimum guarantee when earned less', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.MINI, count: 50 }, // 50 * 2.5 = 125
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.EASY, // No difficulty multiplier
        WeatherCondition.NORMAL
      );

      // Base: 125
      // Difficulty: 125 * 1.0 = 125
      // Minimum guarantee: 850
      expect(shift.basePayment.toNumber()).toBe(125);
      expect(shift.totalPayment.toNumber()).toBe(125);
      expect(shift.guaranteedMinimum.toNumber()).toBe(850);
      expect(shift.actualPayment.toNumber()).toBe(850);
    });

    it('should not apply minimum guarantee when earned more', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 300 }, // 300 * 4.0 = 1200
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.NORMAL
      );

      // Base: 1200
      // Difficulty: 1200 * 1.15 = 1380
      expect(shift.totalPayment.toNumber()).toBe(1380);
      expect(shift.actualPayment.toNumber()).toBe(1380);
    });

    it('should include special allowances in total', () => {
      const collections: ContainerCollection[] = [
        {
          containerType: ContainerType.STANDARD,
          count: 100,
          isUnderground: true,
        },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections
      );

      // Base: 100 * 4.0 = 400
      // Difficulty: 400 * 1.15 = 460
      // Special: 100 * 5.0 = 500
      // Total: 960
      expect(shift.basePayment.toNumber()).toBe(400);
      expect(shift.specialAllowances.toNumber()).toBe(500);
      expect(shift.totalPayment.toNumber()).toBe(960);
    });

    it('should calculate hours worked estimate', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 150 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections
      );

      // 150 * 2.0 min = 300 min = 5 hours
      expect(shift.hoursWorked).toBe(5.0);
    });

    it('should handle multiple collection types in one shift', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.MINI, count: 50 },
        { containerType: ContainerType.STANDARD, count: 100 },
        { containerType: ContainerType.LARGE, count: 30 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections
      );

      // Base: (50 * 2.5) + (100 * 4.0) + (30 * 6.5) = 125 + 400 + 195 = 720
      // Difficulty: 720 * 1.15 = 828
      expect(shift.basePayment.toNumber()).toBe(720);
      expect(shift.totalContainers).toBe(180);
      expect(shift.totalPayment.toNumber()).toBe(828);
    });

    it('should apply extreme weather and difficult route together', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 100 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.VERY_DIFFICULT,
        WeatherCondition.ICE
      );

      // Base: 400
      // Difficulty: 400 * 1.5 = 600
      // Weather: 600 * 20% = 120
      // Total: 720
      expect(shift.basePayment.toNumber()).toBe(400);
      expect(shift.difficultyAdjustment.toNumber()).toBe(200);
      expect(shift.weatherCompensation.toNumber()).toBe(120);
      expect(shift.totalPayment.toNumber()).toBe(720);
    });

    it('should handle recycling containers', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.PAPER_RECYCLING, count: 50 },
        { containerType: ContainerType.GLASS_RECYCLING, count: 40 },
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.EASY
      );

      // Base: (50 * 3.0) + (40 * 3.5) = 150 + 140 = 290
      // Difficulty: 290 * 1.0 = 290
      // Minimum: 850
      expect(shift.basePayment.toNumber()).toBe(290);
      expect(shift.totalPayment.toNumber()).toBe(290);
      expect(shift.actualPayment.toNumber()).toBe(850); // Guarantee applies
    });
  });

  describe('calculateDailyCollectionSummary', () => {
    it('should return null for empty shifts array', () => {
      const summary = calculateDailyCollectionSummary([]);
      expect(summary).toBeNull();
    });

    it('should summarize single shift', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.STANDARD, count: 250 }, // 250 * 4.0 * 1.15 = 1150 (above guarantee)
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections
      );

      const summary = calculateDailyCollectionSummary([shift]);

      expect(summary).not.toBeNull();
      expect(summary!.totalContainers).toBe(250);
      expect(summary!.totalEarnings.toNumber()).toBe(1150);
      expect(summary!.containerBreakdown[ContainerType.STANDARD]).toBe(250);
      expect(summary!.guaranteeApplied).toBe(false);
    });

    it('should summarize multiple shifts', () => {
      const shift1 = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.STANDARD, count: 100 }]
      );

      const shift2 = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.MINI, count: 50 }]
      );

      const summary = calculateDailyCollectionSummary([shift1, shift2]);

      expect(summary!.totalContainers).toBe(150);
      expect(summary!.containerBreakdown[ContainerType.STANDARD]).toBe(100);
      expect(summary!.containerBreakdown[ContainerType.MINI]).toBe(50);
    });

    it('should detect if guarantee was applied', () => {
      const collections: ContainerCollection[] = [
        { containerType: ContainerType.MINI, count: 10 }, // Very low earnings
      ];

      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        collections,
        RouteDifficulty.EASY
      );

      const summary = calculateDailyCollectionSummary([shift]);

      expect(summary!.guaranteeApplied).toBe(true);
      expect(summary!.totalEarnings.toNumber()).toBe(850); // Minimum
    });

    it('should calculate average per container', () => {
      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.STANDARD, count: 250 }] // 250 * 4.0 * 1.15 = 1150
      );

      const summary = calculateDailyCollectionSummary([shift]);

      // 1150 / 250 = 4.6 kr per container
      expect(summary!.averagePerContainer.toNumber()).toBeCloseTo(4.6, 1);
    });

    it('should accumulate hours worked', () => {
      const shift1 = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.STANDARD, count: 90 }] // 3 hours
      );

      const shift2 = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.STANDARD, count: 90 }] // 3 hours
      );

      const summary = calculateDailyCollectionSummary([shift1, shift2]);

      expect(summary!.hoursWorked).toBe(6.0);
    });
  });

  describe('validateContainerCollection', () => {
    it('should validate normal collection', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 100,
      };

      const validation = validateContainerCollection(collection);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject zero count', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 0,
      };

      const validation = validateContainerCollection(collection);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Antal containere skal være mindst 1');
    });

    it('should reject negative count', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: -5,
      };

      const validation = validateContainerCollection(collection);

      expect(validation.isValid).toBe(false);
    });

    it('should warn about unusually high count', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 1500,
      };

      const validation = validateContainerCollection(collection);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about heavy mini container', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.MINI,
        count: 10,
        isHeavy: true,
      };

      const validation = validateContainerCollection(collection);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some((w) => w.includes('tung'))).toBe(true);
    });

    it('should warn about underground with difficult access', () => {
      const collection: ContainerCollection = {
        containerType: ContainerType.STANDARD,
        count: 10,
        isUnderground: true,
        hasDifficultAccess: true,
      };

      const validation = validateContainerCollection(collection);

      expect(validation.warnings.some((w) => w.includes('nedgravet'))).toBe(true);
    });
  });

  describe('validateWasteCollectionShift', () => {
    it('should validate normal shift', () => {
      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.STANDARD, count: 100 }]
      );

      const validation = validateWasteCollectionShift(shift);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject shift with no collections', () => {
      const shift = calculateWasteCollectionShift(employee, new Date('2025-10-18'), []);

      const validation = validateWasteCollectionShift(shift);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Mindst én containerindsamling skal være registreret');
    });

    it('should warn about guarantee with many containers', () => {
      // Create shift where guarantee shouldn't realistically apply
      const shift = calculateWasteCollectionShift(
        employee,
        new Date('2025-10-18'),
        [{ containerType: ContainerType.MINI, count: 500 }],
        RouteDifficulty.EASY
      );

      // Force guarantee to apply for test
      shift.actualPayment = shift.guaranteedMinimum;

      const validation = validateWasteCollectionShift(shift);

      expect(validation.warnings.some((w) => w.includes('Minimumsgaranti'))).toBe(true);
    });
  });

  describe('Formatting functions', () => {
    it('should format container types correctly', () => {
      expect(formatContainerType(ContainerType.MINI)).toBe('Mini (120-140L)');
      expect(formatContainerType(ContainerType.STANDARD)).toBe('Standard (240L)');
      expect(formatContainerType(ContainerType.LARGE)).toBe('Stor (360-400L)');
      expect(formatContainerType(ContainerType.EXTRA_LARGE)).toBe('Ekstra stor (600L+)');
    });

    it('should format route difficulty correctly', () => {
      expect(formatRouteDifficulty(RouteDifficulty.EASY)).toBe('Let');
      expect(formatRouteDifficulty(RouteDifficulty.NORMAL)).toBe('Normal');
      expect(formatRouteDifficulty(RouteDifficulty.DIFFICULT)).toBe('Vanskelig');
      expect(formatRouteDifficulty(RouteDifficulty.VERY_DIFFICULT)).toBe('Meget vanskelig');
    });

    it('should format weather conditions correctly', () => {
      expect(formatWeatherCondition(WeatherCondition.NORMAL)).toBe('Normalt');
      expect(formatWeatherCondition(WeatherCondition.RAIN)).toBe('Regn');
      expect(formatWeatherCondition(WeatherCondition.SNOW)).toBe('Sne');
      expect(formatWeatherCondition(WeatherCondition.ICE)).toBe('Glat føre');
      expect(formatWeatherCondition(WeatherCondition.EXTREME_HEAT)).toBe('Ekstrem varme (>28°C)');
    });
  });
});
