/**
 * Tests for Cross-Border Service
 * Grænseoverskridende Overenskomst
 */

import {
  calculateCrossBorderTrip,
  calculateWeeklyGuarantee,
  validateCrossBorderTrip,
  calculateMonthlyEarnings,
  calculateWeekendCompensation,
  formatTripType,
  formatCountryName,
  CROSS_BORDER_RULES,
  CrossBorderTripType,
} from '../../services/crossBorderService';
import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
  isCrossBorderDriver: true,
  isFixedCrossBorder: false,
  isApprentice: false,
  apprenticeYear: null,
  isAdultApprentice: false,
  isEGUStudent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CrossBorderService', () => {
  describe('Trip Calculation', () => {
    it('should calculate payment for standard trip', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01'); // Monday
      const endDate = new Date('2025-09-03'); // Wednesday
      const totalKm = 1500;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'DE'
      );

      expect(trip.daysCount).toBe(3);
      expect(trip.totalKilometers).toBe(1500);
      expect(trip.dailyPayment.toNumber()).toBeGreaterThan(0);
      expect(trip.kilometerPayment.toNumber()).toBeGreaterThan(0);
      expect(trip.foreignAllowance.toNumber()).toBeGreaterThan(0);
      expect(trip.totalPayment.toNumber()).toBeGreaterThan(0);
    });

    it('should calculate daily payment correctly', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-02'); // 2 days
      const totalKm = 1000;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.FIXED_ROUTE,
        startDate,
        endDate,
        totalKm,
        'DK',
        'DE'
      );

      // 2 weekdays * 850 kr = 1700 kr
      expect(trip.dailyPayment.toNumber()).toBe(1700);
    });

    it('should calculate kilometer payment correctly', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-01'); // 1 day
      const totalKm = 600;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.SHORT_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'SE'
      );

      // 600 km * 3.5 kr = 2100 kr
      expect(trip.kilometerPayment.toNumber()).toBe(2100);
    });

    it('should not pay kilometer allowance for trips under minimum', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-01');
      const totalKm = 300; // Under 500 km minimum

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.SHORT_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'SE'
      );

      expect(trip.kilometerPayment.toNumber()).toBe(0);
    });

    it('should cap kilometer payment at maximum per day', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-01'); // 1 day
      const totalKm = 1000; // Above 800 km/day max

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'PL'
      );

      // Capped at 800 km * 3.5 = 2800 kr
      expect(trip.kilometerPayment.toNumber()).toBe(2800);
    });

    it('should calculate foreign allowance correctly', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-04'); // 4 days
      const totalKm = 2000;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'DE'
      );

      // 4 days * 450 kr = 1800 kr
      expect(trip.foreignAllowance.toNumber()).toBe(1800);
    });

    it('should include parking and toll expenses', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-02');
      const totalKm = 800;
      const parking = 200;
      const toll = 150;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.VARIABLE,
        startDate,
        endDate,
        totalKm,
        'DK',
        'DE',
        parking,
        toll
      );

      expect(trip.parkingExpenses?.toNumber()).toBe(200);
      expect(trip.tollExpenses?.toNumber()).toBe(150);
      // Total should include these expenses
      const expectedBase =
        trip.dailyPayment
          .add(trip.kilometerPayment)
          .add(trip.foreignAllowance)
          .toNumber();
      expect(trip.totalPayment.toNumber()).toBe(expectedBase + 200 + 150);
    });
  });

  describe('Weekend Calculation', () => {
    it('should pay higher rate for weekend days', () => {
      const employee = createMockEmployee();
      // Saturday to Sunday
      const startDate = new Date('2025-09-06'); // Saturday
      const endDate = new Date('2025-09-07'); // Sunday
      const totalKm = 800;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'DE'
      );

      expect(trip.weekendDays).toBe(2);
      // 2 weekend days * 1050 kr = 2100 kr
      expect(trip.dailyPayment.toNumber()).toBe(2100);
    });

    it('should calculate mixed weekday and weekend correctly', () => {
      const employee = createMockEmployee();
      // Friday to Monday
      const startDate = new Date('2025-09-05'); // Friday
      const endDate = new Date('2025-09-08'); // Monday
      const totalKm = 1600;

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        startDate,
        endDate,
        totalKm,
        'DK',
        'NO'
      );

      expect(trip.daysCount).toBe(4);
      expect(trip.weekendDays).toBe(2); // Saturday + Sunday
      // 2 weekdays * 850 + 2 weekend * 1050 = 1700 + 2100 = 3800
      expect(trip.dailyPayment.toNumber()).toBe(3800);
    });
  });

  describe('Weekly Guarantee', () => {
    it('should calculate guarantee for fixed cross-border driver', () => {
      const employee = createMockEmployee({ isFixedCrossBorder: true });

      const trip1 = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.FIXED_ROUTE,
        new Date('2025-09-01'),
        new Date('2025-09-02'),
        800,
        'DK',
        'DE'
      );

      const trip2 = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.FIXED_ROUTE,
        new Date('2025-09-03'),
        new Date('2025-09-04'),
        900,
        'DK',
        'DE'
      );

      const guarantee = calculateWeeklyGuarantee(employee, [trip1, trip2], 36, 2025);

      expect(guarantee.guaranteedMinimum.toNumber()).toBe(6500);
      expect(guarantee.actualEarnings.toNumber()).toBeGreaterThan(0);
      expect(guarantee.tripsCount).toBe(2);
    });

    it('should add top-up if earnings below minimum', () => {
      const employee = createMockEmployee({ isFixedCrossBorder: true });

      // Single short trip with low earnings
      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.SHORT_HAUL,
        new Date('2025-09-01'),
        new Date('2025-09-01'),
        600,
        'DK',
        'SE'
      );

      const guarantee = calculateWeeklyGuarantee(employee, [trip], 36, 2025);

      expect(guarantee.actualEarnings.toNumber()).toBeLessThan(6500);
      expect(guarantee.topUpNeeded.toNumber()).toBeGreaterThan(0);
      expect(guarantee.topUpNeeded.toNumber()).toBe(
        6500 - guarantee.actualEarnings.toNumber()
      );
    });

    it('should not add top-up if earnings exceed minimum', () => {
      const employee = createMockEmployee({ isFixedCrossBorder: true });

      // Multiple trips with good earnings
      const trips = [
        calculateCrossBorderTrip(
          employee,
          CrossBorderTripType.FIXED_ROUTE,
          new Date('2025-09-01'),
          new Date('2025-09-02'),
          1000,
          'DK',
          'DE'
        ),
        calculateCrossBorderTrip(
          employee,
          CrossBorderTripType.FIXED_ROUTE,
          new Date('2025-09-03'),
          new Date('2025-09-04'),
          1200,
          'DK',
          'DE'
        ),
        calculateCrossBorderTrip(
          employee,
          CrossBorderTripType.FIXED_ROUTE,
          new Date('2025-09-05'),
          new Date('2025-09-06'),
          1100,
          'DK',
          'DE'
        ),
      ];

      const guarantee = calculateWeeklyGuarantee(employee, trips, 36, 2025);

      expect(guarantee.actualEarnings.toNumber()).toBeGreaterThan(6500);
      expect(guarantee.topUpNeeded.toNumber()).toBe(0);
    });

    it('should not apply guarantee to variable cross-border drivers', () => {
      const employee = createMockEmployee({ isFixedCrossBorder: false });

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.VARIABLE,
        new Date('2025-09-01'),
        new Date('2025-09-02'),
        700,
        'DK',
        'NO'
      );

      const guarantee = calculateWeeklyGuarantee(employee, [trip], 36, 2025);

      expect(guarantee.guaranteedMinimum.toNumber()).toBe(0);
      expect(guarantee.topUpNeeded.toNumber()).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate correct trip', () => {
      const employee = createMockEmployee();
      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        new Date('2025-09-01'),
        new Date('2025-09-03'),
        1500,
        'DK',
        'DE'
      );

      const validation = validateCrossBorderTrip(trip);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should reject trip with end before start', () => {
      const employee = createMockEmployee();
      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        new Date('2025-09-05'),
        new Date('2025-09-01'), // Before start
        1500,
        'DK',
        'DE'
      );

      const validation = validateCrossBorderTrip(trip);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('før slutdato'))).toBe(true);
    });

    it('should reject negative kilometers', () => {
      const employee = createMockEmployee();
      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        new Date('2025-09-01'),
        new Date('2025-09-03'),
        -500,
        'DK',
        'DE'
      );

      const validation = validateCrossBorderTrip(trip);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('negativt'))).toBe(true);
    });

    it('should warn about low kilometers', () => {
      const employee = createMockEmployee();
      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.SHORT_HAUL,
        new Date('2025-09-01'),
        new Date('2025-09-02'),
        400, // Below 500 minimum
        'DK',
        'SE'
      );

      const validation = validateCrossBorderTrip(trip);

      expect(validation.warnings.some((w) => w.includes('minimum'))).toBe(true);
    });

    it('should warn about same country trip', () => {
      const employee = createMockEmployee();
      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.VARIABLE,
        new Date('2025-09-01'),
        new Date('2025-09-02'),
        600,
        'DK',
        'DK' // Same country
      );

      const validation = validateCrossBorderTrip(trip);

      expect(validation.warnings.some((w) => w.includes('samme land'))).toBe(true);
    });
  });

  describe('Monthly Earnings', () => {
    it('should calculate monthly totals correctly', () => {
      const employee = createMockEmployee();

      const trips = [
        calculateCrossBorderTrip(
          employee,
          CrossBorderTripType.LONG_HAUL,
          new Date('2025-09-01'),
          new Date('2025-09-03'),
          1500,
          'DK',
          'DE',
          100,
          50
        ),
        calculateCrossBorderTrip(
          employee,
          CrossBorderTripType.LONG_HAUL,
          new Date('2025-09-10'),
          new Date('2025-09-12'),
          1600,
          'DK',
          'PL',
          120,
          80
        ),
      ];

      const monthly = calculateMonthlyEarnings(trips);

      expect(monthly.totalTrips).toBe(2);
      expect(monthly.totalDays).toBe(6);
      expect(monthly.totalKilometers).toBe(3100);
      expect(monthly.totalDailyPayment.toNumber()).toBeGreaterThan(0);
      expect(monthly.totalKilometerPayment.toNumber()).toBeGreaterThan(0);
      expect(monthly.totalAllowances.toNumber()).toBeGreaterThan(0);
      expect(monthly.totalExpenses.toNumber()).toBe(350); // 100+50+120+80
      expect(monthly.averagePerTrip.toNumber()).toBeGreaterThan(0);
      expect(monthly.averagePerDay.toNumber()).toBeGreaterThan(0);
    });

    it('should handle empty trip list', () => {
      const monthly = calculateMonthlyEarnings([]);

      expect(monthly.totalTrips).toBe(0);
      expect(monthly.totalEarnings.toNumber()).toBe(0);
      expect(monthly.averagePerTrip.toNumber()).toBe(0);
    });
  });

  describe('Weekend Compensation', () => {
    it('should calculate weekend compensation', () => {
      const weekendDays = 2;
      const baseDailyRate = 850;

      const compensation = calculateWeekendCompensation(weekendDays, baseDailyRate);

      // (1050 - 850) * 2 = 400
      expect(compensation.toNumber()).toBe(400);
    });
  });

  describe('Formatting', () => {
    it('should format trip types', () => {
      expect(formatTripType(CrossBorderTripType.FIXED_ROUTE)).toBe('Fast rute');
      expect(formatTripType(CrossBorderTripType.VARIABLE)).toBe('Variabel kørsel');
      expect(formatTripType(CrossBorderTripType.LONG_HAUL)).toBe('Langturskørsel');
      expect(formatTripType(CrossBorderTripType.SHORT_HAUL)).toBe('Kortturskørsel');
    });

    it('should format country names', () => {
      expect(formatCountryName('DK')).toBe('Danmark');
      expect(formatCountryName('DE')).toBe('Tyskland');
      expect(formatCountryName('SE')).toBe('Sverige');
      expect(formatCountryName('NO')).toBe('Norge');
      expect(formatCountryName('PL')).toBe('Polen');
    });

    it('should handle unknown country codes', () => {
      expect(formatCountryName('XX')).toBe('XX');
    });
  });

  describe('Constants Validation', () => {
    it('should have correct daily payment rates', () => {
      expect(CROSS_BORDER_RULES.DAILY_PAYMENT.STANDARD_RATE).toBe(850);
      expect(CROSS_BORDER_RULES.DAILY_PAYMENT.WEEKEND_RATE).toBe(1050);
      expect(CROSS_BORDER_RULES.DAILY_PAYMENT.MINIMUM_HOURS_FOR_FULL_DAY).toBe(12);
    });

    it('should have correct kilometer allowance', () => {
      expect(CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.RATE_PER_KM).toBe(3.5);
      expect(CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MINIMUM_KM_PER_TRIP).toBe(500);
      expect(CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MAXIMUM_KM_PER_DAY).toBe(800);
    });

    it('should have correct guaranteed payment', () => {
      expect(CROSS_BORDER_RULES.GUARANTEED_PAYMENT.WEEKLY_MINIMUM).toBe(6500);
      expect(CROSS_BORDER_RULES.GUARANTEED_PAYMENT.APPLIES_TO_FIXED_CROSS_BORDER).toBe(
        true
      );
    });

    it('should have correct allowances', () => {
      expect(CROSS_BORDER_RULES.ALLOWANCES.FOREIGN_DAILY_ALLOWANCE).toBe(450);
      expect(CROSS_BORDER_RULES.ALLOWANCES.OVERNIGHT_ALLOWANCE).toBe(150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single day trip', () => {
      const employee = createMockEmployee();
      const date = new Date('2025-09-01');

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.SHORT_HAUL,
        date,
        date,
        600,
        'DK',
        'SE'
      );

      expect(trip.daysCount).toBe(1);
    });

    it('should handle zero kilometers', () => {
      const employee = createMockEmployee();

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.VARIABLE,
        new Date('2025-09-01'),
        new Date('2025-09-02'),
        0,
        'DK',
        'DE'
      );

      expect(trip.kilometerPayment.toNumber()).toBe(0);
      expect(trip.totalPayment.toNumber()).toBeGreaterThan(0); // Still pays daily + allowance
    });

    it('should handle very long trip', () => {
      const employee = createMockEmployee();
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-14'); // 14 days

      const trip = calculateCrossBorderTrip(
        employee,
        CrossBorderTripType.LONG_HAUL,
        startDate,
        endDate,
        10000,
        'DK',
        'IT'
      );

      expect(trip.daysCount).toBe(14);
      // 10000 km is less than cap (800 * 14 = 11200), so all paid
      expect(trip.kilometerPayment.toNumber()).toBe(10000 * 3.5);
    });
  });
});
