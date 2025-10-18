import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateShiftPayment,
  determineShiftType,
  determineDayType,
  getShiftSupplementPercent,
  getWeekendSupplementPercent,
  calculateHoursWorked,
  validateShiftRotation,
  createRotationPattern,
  calculateCompensationDays,
  calculateMonthlyShiftEarnings,
  analyzeShiftDistribution,
  formatShiftType,
  formatDayType,
  ShiftType,
  DayType,
  SHIFT_WORK_RULES,
} from '../../services/shiftWorkService';

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
  workTimeType: WorkTimeType.SHIFT_WORK,
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

describe('ShiftWorkService', () => {
  let employee: Employee;

  beforeEach(() => {
    employee = createMockEmployee();
  });

  describe('determineShiftType', () => {
    it('should identify morning shift (06:00-14:00)', () => {
      const startTime = new Date('2025-10-18T06:00:00');
      const endTime = new Date('2025-10-18T14:00:00');

      expect(determineShiftType(startTime, endTime)).toBe(ShiftType.MORNING);
    });

    it('should identify afternoon shift (14:00-22:00)', () => {
      const startTime = new Date('2025-10-18T14:00:00');
      const endTime = new Date('2025-10-18T22:00:00');

      expect(determineShiftType(startTime, endTime)).toBe(ShiftType.AFTERNOON);
    });

    it('should identify night shift (22:00-06:00)', () => {
      const startTime = new Date('2025-10-18T22:00:00');
      const endTime = new Date('2025-10-19T06:00:00');

      expect(determineShiftType(startTime, endTime)).toBe(ShiftType.NIGHT);
    });

    it('should identify early morning as night shift', () => {
      const startTime = new Date('2025-10-18T00:00:00');
      const endTime = new Date('2025-10-18T06:00:00');

      expect(determineShiftType(startTime, endTime)).toBe(ShiftType.NIGHT);
    });

    it('should default to day shift for other times', () => {
      const startTime = new Date('2025-10-18T08:00:00');
      const endTime = new Date('2025-10-18T16:00:00');

      const result = determineShiftType(startTime, endTime);
      expect([ShiftType.MORNING, ShiftType.DAY]).toContain(result);
    });
  });

  describe('determineDayType', () => {
    it('should identify Monday as weekday', () => {
      const monday = new Date('2025-10-20'); // Monday
      expect(determineDayType(monday)).toBe(DayType.WEEKDAY);
    });

    it('should identify Saturday', () => {
      const saturday = new Date('2025-10-18'); // Saturday
      expect(determineDayType(saturday)).toBe(DayType.SATURDAY);
    });

    it('should identify Sunday', () => {
      const sunday = new Date('2025-10-19'); // Sunday
      expect(determineDayType(sunday)).toBe(DayType.SUNDAY);
    });

    it('should identify Friday as weekday', () => {
      const friday = new Date('2025-10-17'); // Friday
      expect(determineDayType(friday)).toBe(DayType.WEEKDAY);
    });
  });

  describe('getShiftSupplementPercent', () => {
    it('should return 15% for morning shift', () => {
      expect(getShiftSupplementPercent(ShiftType.MORNING)).toBe(15);
    });

    it('should return 20% for afternoon shift', () => {
      expect(getShiftSupplementPercent(ShiftType.AFTERNOON)).toBe(20);
    });

    it('should return 40% for night shift', () => {
      expect(getShiftSupplementPercent(ShiftType.NIGHT)).toBe(40);
    });

    it('should return 0% for day shift', () => {
      expect(getShiftSupplementPercent(ShiftType.DAY)).toBe(0);
    });

    it('should add 12% for rotating morning shift', () => {
      expect(getShiftSupplementPercent(ShiftType.MORNING, true)).toBe(27); // 15 + 12
    });

    it('should add 12% for rotating night shift', () => {
      expect(getShiftSupplementPercent(ShiftType.NIGHT, true)).toBe(52); // 40 + 12
    });

    it('should not add rotating supplement to day shift', () => {
      expect(getShiftSupplementPercent(ShiftType.DAY, true)).toBe(0);
    });
  });

  describe('getWeekendSupplementPercent', () => {
    it('should return 0% for weekdays', () => {
      expect(getWeekendSupplementPercent(DayType.WEEKDAY)).toBe(0);
    });

    it('should return 50% for Saturday', () => {
      expect(getWeekendSupplementPercent(DayType.SATURDAY)).toBe(50);
    });

    it('should return 100% for Sunday', () => {
      expect(getWeekendSupplementPercent(DayType.SUNDAY)).toBe(100);
    });

    it('should return 100% for bank holidays', () => {
      expect(getWeekendSupplementPercent(DayType.BANK_HOLIDAY)).toBe(100);
    });
  });

  describe('calculateHoursWorked', () => {
    it('should calculate 8 hours for standard shift', () => {
      const startTime = new Date('2025-10-18T06:00:00');
      const endTime = new Date('2025-10-18T14:00:00');

      expect(calculateHoursWorked(startTime, endTime)).toBe(8);
    });

    it('should calculate 7.5 hours for short shift', () => {
      const startTime = new Date('2025-10-18T06:00:00');
      const endTime = new Date('2025-10-18T13:30:00');

      expect(calculateHoursWorked(startTime, endTime)).toBe(7.5);
    });

    it('should calculate 12 hours for long shift', () => {
      const startTime = new Date('2025-10-18T06:00:00');
      const endTime = new Date('2025-10-18T18:00:00');

      expect(calculateHoursWorked(startTime, endTime)).toBe(12);
    });

    it('should calculate hours across midnight', () => {
      const startTime = new Date('2025-10-18T22:00:00');
      const endTime = new Date('2025-10-19T06:00:00');

      expect(calculateHoursWorked(startTime, endTime)).toBe(8);
    });
  });

  describe('calculateShiftPayment', () => {
    it('should calculate payment for weekday morning shift', () => {
      const date = new Date('2025-10-20'); // Monday
      const startTime = new Date('2025-10-20T06:00:00');
      const endTime = new Date('2025-10-20T14:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      // Base: 150 * 8 = 1200
      // Morning shift supplement: 1200 * 15% = 180
      // Weekend supplement: 0
      // Total: 1380
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.shiftSupplement.toNumber()).toBe(180);
      expect(result.weekendSupplement.toNumber()).toBe(0);
      expect(result.totalPayment.toNumber()).toBe(1380);
    });

    it('should calculate payment for weekday afternoon shift', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T14:00:00');
      const endTime = new Date('2025-10-20T22:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      // Base: 1200
      // Afternoon supplement: 1200 * 20% = 240
      // Total: 1440
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.shiftSupplement.toNumber()).toBe(240);
      expect(result.totalPayment.toNumber()).toBe(1440);
    });

    it('should calculate payment for weekday night shift', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T22:00:00');
      const endTime = new Date('2025-10-21T06:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      // Base: 1200
      // Night supplement: 1200 * 40% = 480
      // Total: 1680
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.shiftSupplement.toNumber()).toBe(480);
      expect(result.totalPayment.toNumber()).toBe(1680);
    });

    it('should calculate payment for Saturday morning shift', () => {
      const date = new Date('2025-10-18'); // Saturday
      const startTime = new Date('2025-10-18T06:00:00');
      const endTime = new Date('2025-10-18T14:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      // Base: 1200
      // Morning supplement: 180
      // Saturday supplement: 1200 * 50% = 600
      // Total: 1980
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.shiftSupplement.toNumber()).toBe(180);
      expect(result.weekendSupplement.toNumber()).toBe(600);
      expect(result.totalPayment.toNumber()).toBe(1980);
    });

    it('should calculate payment for Sunday night shift', () => {
      const date = new Date('2025-10-19'); // Sunday
      const startTime = new Date('2025-10-19T22:00:00');
      const endTime = new Date('2025-10-20T06:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      // Base: 1200
      // Night supplement: 480
      // Sunday supplement: 1200 * 100% = 1200
      // Total: 2880
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.shiftSupplement.toNumber()).toBe(480);
      expect(result.weekendSupplement.toNumber()).toBe(1200);
      expect(result.totalPayment.toNumber()).toBe(2880);
    });

    it('should add rotating shift supplement', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T06:00:00');
      const endTime = new Date('2025-10-20T14:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150, true);

      // Base: 1200
      // Morning supplement (15%) + Rotating (12%): 1200 * 27% = 324
      // Total: 1524
      expect(result.shiftSupplement.toNumber()).toBe(324);
      expect(result.totalPayment.toNumber()).toBe(1524);
    });

    it('should handle short shifts (4 hours)', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T06:00:00');
      const endTime = new Date('2025-10-20T10:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      // Base: 150 * 4 = 600
      // Morning supplement: 600 * 15% = 90
      // Total: 690
      expect(result.basePayment.toNumber()).toBe(600);
      expect(result.hoursWorked).toBe(4);
      expect(result.totalPayment.toNumber()).toBe(690);
    });

    it('should handle 12-hour shifts', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T06:00:00');
      const endTime = new Date('2025-10-20T18:00:00');

      const result = calculateShiftPayment(employee, date, startTime, endTime, 150);

      expect(result.hoursWorked).toBe(12);
      expect(result.basePayment.toNumber()).toBe(1800);
    });
  });

  describe('validateShiftRotation', () => {
    it('should validate normal rotation without errors', () => {
      const shifts = [
        calculateShiftPayment(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T06:00:00'),
          new Date('2025-10-20T14:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-21'),
          new Date('2025-10-21T06:00:00'),
          new Date('2025-10-21T14:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-22'),
          new Date('2025-10-22T14:00:00'),
          new Date('2025-10-22T22:00:00'),
          150
        ),
      ];

      const validation = validateShiftRotation(shifts);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty shifts array', () => {
      const validation = validateShiftRotation([]);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Ingen skift angivet for validering');
    });

    it('should detect too many consecutive night shifts', () => {
      const shifts = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date('2025-10-20');
        date.setDate(date.getDate() + i);
        shifts.push(
          calculateShiftPayment(
            employee,
            date,
            new Date(date.getTime() + 22 * 60 * 60 * 1000),
            new Date(date.getTime() + 30 * 60 * 60 * 1000),
            150
          )
        );
      }

      const validation = validateShiftRotation(shifts);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('nattevagter i træk'))).toBe(true);
    });

    it('should warn about too many consecutive shifts', () => {
      const shifts = [];
      for (let i = 0; i < 8; i++) {
        const date = new Date('2025-10-20');
        date.setDate(date.getDate() + i);
        shifts.push(
          calculateShiftPayment(
            employee,
            date,
            new Date(date.getTime() + 6 * 60 * 60 * 1000),
            new Date(date.getTime() + 14 * 60 * 60 * 1000),
            150
          )
        );
      }

      const validation = validateShiftRotation(shifts);

      expect(validation.warnings.some((w) => w.includes('skift i træk'))).toBe(true);
    });

    it('should detect insufficient rest between shifts', () => {
      const shifts = [
        calculateShiftPayment(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T06:00:00'),
          new Date('2025-10-20T14:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T20:00:00'), // Only 6 hours rest
          new Date('2025-10-21T04:00:00'),
          150
        ),
      ];

      const validation = validateShiftRotation(shifts);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('hviletid'))).toBe(true);
    });
  });

  describe('createRotationPattern', () => {
    it('should create 4-week rotation pattern', () => {
      const pattern = [
        ShiftType.MORNING,
        ShiftType.MORNING,
        ShiftType.AFTERNOON,
        ShiftType.AFTERNOON,
        ShiftType.NIGHT,
        ShiftType.NIGHT,
      ];

      const rotation = createRotationPattern(
        employee.id,
        new Date('2025-10-20'),
        pattern,
        4
      );

      expect(rotation.cycleWeeks).toBe(4);
      expect(rotation.pattern).toHaveLength(6);
      expect(rotation.nightShiftsCount).toBe(2);
    });

    it('should detect balanced rotation', () => {
      const pattern = [
        ShiftType.MORNING,
        ShiftType.AFTERNOON,
        ShiftType.NIGHT,
        ShiftType.MORNING,
      ];

      const rotation = createRotationPattern(employee.id, new Date('2025-10-20'), pattern);

      expect(rotation.isBalanced).toBe(true);
      expect(rotation.nightShiftsCount).toBe(1);
    });

    it('should detect unbalanced rotation with too many night shifts', () => {
      const pattern = [
        ShiftType.NIGHT,
        ShiftType.NIGHT,
        ShiftType.NIGHT,
        ShiftType.NIGHT,
        ShiftType.NIGHT,
        ShiftType.NIGHT,
      ];

      const rotation = createRotationPattern(employee.id, new Date('2025-10-20'), pattern);

      expect(rotation.isBalanced).toBe(false);
      expect(rotation.nightShiftsCount).toBe(6);
    });

    it('should calculate end date correctly', () => {
      const startDate = new Date('2025-10-20');
      const rotation = createRotationPattern(
        employee.id,
        startDate,
        [ShiftType.MORNING],
        2
      );

      const expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(expectedEndDate.getDate() + 14);

      expect(rotation.endDate.getDate()).toBe(expectedEndDate.getDate());
    });
  });

  describe('calculateCompensationDays', () => {
    it('should calculate base compensation for 12 months', () => {
      const result = calculateCompensationDays(employee.id, 2025, 12, 0);

      // 12 * 0.417 ≈ 5 days
      expect(result.accruedDays.toNumber()).toBeCloseTo(5, 1);
      expect(result.remainingDays.toNumber()).toBeCloseTo(5, 1);
      expect(result.weekendShiftsWorked).toBe(0);
    });

    it('should calculate compensation for 6 months', () => {
      const result = calculateCompensationDays(employee.id, 2025, 6, 0);

      // 6 * 0.417 = 2.5 days
      expect(result.accruedDays.toNumber()).toBeCloseTo(2.5, 1);
    });

    it('should add extra compensation for weekend work', () => {
      const result = calculateCompensationDays(employee.id, 2025, 12, 10);

      // Base: 5 days (12 * 0.417 = 5.004)
      // Weekend: 10 * 1.5 = 15 days
      // Total: ~20 days
      expect(result.extraCompensation.toNumber()).toBe(15);
      expect(result.accruedDays.toNumber()).toBeCloseTo(20, 1);
    });

    it('should track weekend shifts worked', () => {
      const result = calculateCompensationDays(employee.id, 2025, 12, 8);

      expect(result.weekendShiftsWorked).toBe(8);
      expect(result.extraCompensation.toNumber()).toBe(12); // 8 * 1.5
    });
  });

  describe('calculateMonthlyShiftEarnings', () => {
    it('should summarize monthly earnings', () => {
      const shifts = [
        calculateShiftPayment(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T06:00:00'),
          new Date('2025-10-20T14:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-21'),
          new Date('2025-10-21T14:00:00'),
          new Date('2025-10-21T22:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-22'),
          new Date('2025-10-22T22:00:00'),
          new Date('2025-10-23T06:00:00'),
          150
        ),
      ];

      const result = calculateMonthlyShiftEarnings(shifts);

      expect(result.totalShifts).toBe(3);
      expect(result.totalHours.toNumber()).toBe(24);
      expect(result.nightShifts).toBe(1);
      expect(result.totalBasePayment.toNumber()).toBe(3600); // 3 * 1200
    });

    it('should count weekend shifts correctly', () => {
      const shifts = [
        calculateShiftPayment(
          employee,
          new Date('2025-10-18'), // Saturday
          new Date('2025-10-18T06:00:00'),
          new Date('2025-10-18T14:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-19'), // Sunday
          new Date('2025-10-19T06:00:00'),
          new Date('2025-10-19T14:00:00'),
          150
        ),
      ];

      const result = calculateMonthlyShiftEarnings(shifts);

      expect(result.weekendShifts).toBe(2);
    });

    it('should calculate averages correctly', () => {
      const shifts = [
        calculateShiftPayment(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T06:00:00'),
          new Date('2025-10-20T14:00:00'),
          150
        ),
        calculateShiftPayment(
          employee,
          new Date('2025-10-21'),
          new Date('2025-10-21T06:00:00'),
          new Date('2025-10-21T14:00:00'),
          150
        ),
      ];

      const result = calculateMonthlyShiftEarnings(shifts);

      // Total: 2760 (1380 * 2)
      // Average per shift: 1380
      // Average per hour: 1380 / 8 = 172.5
      expect(result.averagePerShift.toNumber()).toBeCloseTo(1380, 0);
      expect(result.averagePerHour.toNumber()).toBeCloseTo(172.5, 1);
    });

    it('should handle empty shifts array', () => {
      const result = calculateMonthlyShiftEarnings([]);

      expect(result.totalShifts).toBe(0);
      expect(result.totalEarnings.toNumber()).toBe(0);
      expect(result.averagePerShift.toNumber()).toBe(0);
    });
  });

  describe('analyzeShiftDistribution', () => {
    it('should analyze balanced distribution', () => {
      const shifts = [];

      // Create 20 mixed shifts: 4 night, 4 weekend, rest normal
      for (let i = 0; i < 20; i++) {
        const date = new Date('2025-10-20');
        date.setDate(date.getDate() + i);

        let startHour = 6;
        if (i < 4) startHour = 22; // Night shifts

        shifts.push(
          calculateShiftPayment(
            employee,
            date,
            new Date(date.getTime() + startHour * 60 * 60 * 1000),
            new Date(date.getTime() + (startHour + 8) * 60 * 60 * 1000),
            150
          )
        );
      }

      const analysis = analyzeShiftDistribution(shifts);

      expect(analysis.totalShifts).toBe(20);
      expect(analysis.nightShiftPercentage).toBe(20); // 4/20 = 20%
    });

    it('should detect too many night shifts', () => {
      const shifts = [];

      for (let i = 0; i < 10; i++) {
        const date = new Date('2025-10-20');
        date.setDate(date.getDate() + i);

        shifts.push(
          calculateShiftPayment(
            employee,
            date,
            new Date(date.getTime() + 22 * 60 * 60 * 1000),
            new Date(date.getTime() + 30 * 60 * 60 * 1000),
            150
          )
        );
      }

      const analysis = analyzeShiftDistribution(shifts);

      expect(analysis.nightShiftPercentage).toBe(100);
      expect(analysis.isBalanced).toBe(false);
      expect(analysis.recommendations.some((r) => r.includes('nattevagter'))).toBe(true);
    });

    it('should detect too many weekend shifts', () => {
      const shifts = [];

      for (let i = 0; i < 10; i++) {
        const saturday = new Date('2025-10-18'); // Saturday
        saturday.setDate(saturday.getDate() + i * 7);

        shifts.push(
          calculateShiftPayment(
            employee,
            saturday,
            new Date(saturday.getTime() + 6 * 60 * 60 * 1000),
            new Date(saturday.getTime() + 14 * 60 * 60 * 1000),
            150
          )
        );
      }

      const analysis = analyzeShiftDistribution(shifts);

      expect(analysis.weekendShiftPercentage).toBeGreaterThan(30);
      expect(analysis.recommendations.some((r) => r.includes('weekendvagter'))).toBe(true);
    });
  });

  describe('Formatting functions', () => {
    it('should format shift types correctly', () => {
      expect(formatShiftType(ShiftType.MORNING)).toBe('Dagvagt (06:00-14:00)');
      expect(formatShiftType(ShiftType.AFTERNOON)).toBe('Eftermiddagsvagt (14:00-22:00)');
      expect(formatShiftType(ShiftType.NIGHT)).toBe('Nattevagt (22:00-06:00)');
      expect(formatShiftType(ShiftType.ROTATING)).toBe('Roterende skift');
      expect(formatShiftType(ShiftType.DAY)).toBe('Normal dagvagt');
    });

    it('should format day types correctly', () => {
      expect(formatDayType(DayType.WEEKDAY)).toBe('Hverdag');
      expect(formatDayType(DayType.SATURDAY)).toBe('Lørdag');
      expect(formatDayType(DayType.SUNDAY)).toBe('Søndag');
      expect(formatDayType(DayType.BANK_HOLIDAY)).toBe('Helligdag');
    });
  });
});
