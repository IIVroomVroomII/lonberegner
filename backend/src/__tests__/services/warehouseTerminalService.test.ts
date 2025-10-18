import { Employee, JobCategory, AgreementType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateWarehouseShift,
  calculateLoadingActivity,
  calculateMonthlyWarehouseSummary,
  getTemperatureSupplementRate,
  getGeographicAllowanceRate,
  getTerminalSupplementRate,
  getLoadingRate,
  calculateHoursWorked,
  isNightShift,
  validateWarehouseShift,
  formatTemperatureZone,
  formatGeographicZone,
  formatTerminalType,
  formatLoadingUnit,
  TemperatureZone,
  GeographicZone,
  TerminalType,
  LoadingUnit,
  WAREHOUSE_TERMINAL_RULES,
} from '../../services/warehouseTerminalService';

// Mock employee factory
const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'test-employee-id',
  userId: 'test-user-id',
  cprNumber: null,
  employeeNumber: 'EMP001',
  jobCategory: JobCategory.WAREHOUSE,
  agreementType: AgreementType.WAREHOUSE_AGREEMENT,
  employmentDate: new Date('2020-01-01'),
  anciennity: 60,
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
  hasForkliftCertificate: true,
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

describe('WarehouseTerminalService', () => {
  let employee: Employee;

  beforeEach(() => {
    employee = createMockEmployee();
  });

  describe('getTemperatureSupplementRate', () => {
    it('should return 0 for normal temperature', () => {
      expect(getTemperatureSupplementRate(TemperatureZone.NORMAL)).toBe(0);
    });

    it('should return 8.5 kr/hour for refrigerated', () => {
      expect(getTemperatureSupplementRate(TemperatureZone.REFRIGERATED)).toBe(8.5);
    });

    it('should return 15 kr/hour for freezer', () => {
      expect(getTemperatureSupplementRate(TemperatureZone.FREEZER)).toBe(15.0);
    });

    it('should return 20 kr/hour for deep freeze', () => {
      expect(getTemperatureSupplementRate(TemperatureZone.DEEP_FREEZE)).toBe(20.0);
    });
  });

  describe('getGeographicAllowanceRate', () => {
    it('should return 12 kr/hour for Copenhagen', () => {
      expect(getGeographicAllowanceRate(GeographicZone.COPENHAGEN)).toBe(12.0);
    });

    it('should return 8 kr/hour for Aarhus', () => {
      expect(getGeographicAllowanceRate(GeographicZone.AARHUS)).toBe(8.0);
    });

    it('should return 6.5 kr/hour for Odense', () => {
      expect(getGeographicAllowanceRate(GeographicZone.ODENSE)).toBe(6.5);
    });

    it('should return 6 kr/hour for Aalborg', () => {
      expect(getGeographicAllowanceRate(GeographicZone.AALBORG)).toBe(6.0);
    });

    it('should return 4 kr/hour for other cities', () => {
      expect(getGeographicAllowanceRate(GeographicZone.OTHER_CITIES)).toBe(4.0);
    });

    it('should return 0 for rural areas', () => {
      expect(getGeographicAllowanceRate(GeographicZone.RURAL)).toBe(0);
    });
  });

  describe('getTerminalSupplementRate', () => {
    it('should return base rate (5 kr/hour) for standard terminal day shift', () => {
      expect(getTerminalSupplementRate(TerminalType.STANDARD, false)).toBe(5.0);
    });

    it('should add 8 kr/hour for night shift', () => {
      expect(getTerminalSupplementRate(TerminalType.STANDARD, true)).toBe(13.0); // 5 + 8
    });

    it('should add 3.5 kr/hour for cross-dock', () => {
      expect(getTerminalSupplementRate(TerminalType.CROSS_DOCK, false)).toBe(8.5); // 5 + 3.5
    });

    it('should add 4 kr/hour for sorting', () => {
      expect(getTerminalSupplementRate(TerminalType.SORTING, false)).toBe(9.0); // 5 + 4
    });

    it('should combine cross-dock and night shift supplements', () => {
      expect(getTerminalSupplementRate(TerminalType.CROSS_DOCK, true)).toBe(16.5); // 5 + 3.5 + 8
    });

    it('should combine sorting and night shift supplements', () => {
      expect(getTerminalSupplementRate(TerminalType.SORTING, true)).toBe(17.0); // 5 + 4 + 8
    });
  });

  describe('getLoadingRate', () => {
    it('should return 8.5 kr for standard pallet', () => {
      expect(getLoadingRate(LoadingUnit.STANDARD_PALLET)).toBe(8.5);
    });

    it('should return 12 kr for heavy pallet', () => {
      expect(getLoadingRate(LoadingUnit.HEAVY_PALLET)).toBe(12.0);
    });

    it('should return 12 kr for standard pallet over 500kg', () => {
      expect(getLoadingRate(LoadingUnit.STANDARD_PALLET, 600)).toBe(12.0);
    });

    it('should return 8.5 kr for standard pallet under 500kg', () => {
      expect(getLoadingRate(LoadingUnit.STANDARD_PALLET, 400)).toBe(8.5);
    });

    it('should return 150 kr for 20ft container', () => {
      expect(getLoadingRate(LoadingUnit.CONTAINER_20FT)).toBe(150.0);
    });

    it('should return 250 kr for 40ft container', () => {
      expect(getLoadingRate(LoadingUnit.CONTAINER_40FT)).toBe(250.0);
    });
  });

  describe('calculateHoursWorked', () => {
    it('should calculate 8 hours for standard shift', () => {
      const startTime = new Date('2025-10-20T08:00:00');
      const endTime = new Date('2025-10-20T16:00:00');

      expect(calculateHoursWorked(startTime, endTime)).toBe(8);
    });

    it('should calculate 7.5 hours for short shift', () => {
      const startTime = new Date('2025-10-20T08:00:00');
      const endTime = new Date('2025-10-20T15:30:00');

      expect(calculateHoursWorked(startTime, endTime)).toBe(7.5);
    });
  });

  describe('isNightShift', () => {
    it('should identify 22:00 as night shift', () => {
      const time = new Date('2025-10-20T22:00:00');
      expect(isNightShift(time)).toBe(true);
    });

    it('should identify 02:00 as night shift', () => {
      const time = new Date('2025-10-20T02:00:00');
      expect(isNightShift(time)).toBe(true);
    });

    it('should identify 08:00 as day shift', () => {
      const time = new Date('2025-10-20T08:00:00');
      expect(isNightShift(time)).toBe(false);
    });

    it('should identify 14:00 as day shift', () => {
      const time = new Date('2025-10-20T14:00:00');
      expect(isNightShift(time)).toBe(false);
    });
  });

  describe('calculateWarehouseShift', () => {
    it('should calculate normal temperature warehouse shift', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T08:00:00');
      const endTime = new Date('2025-10-20T16:00:00');

      const result = calculateWarehouseShift(
        employee,
        date,
        startTime,
        endTime,
        150,
        TemperatureZone.NORMAL,
        GeographicZone.RURAL,
        TerminalType.STANDARD
      );

      // Base: 150 * 8 = 1200
      // Temperature: 0
      // Geographic: 0
      // Terminal: 5 * 8 = 40
      // Total: 1240
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.temperatureSupplement.toNumber()).toBe(0);
      expect(result.geographicAllowance.toNumber()).toBe(0);
      expect(result.terminalSupplement.toNumber()).toBe(40);
      expect(result.totalPayment.toNumber()).toBe(1240);
    });

    it('should calculate refrigerated warehouse shift in Copenhagen', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T08:00:00');
      const endTime = new Date('2025-10-20T16:00:00');

      const result = calculateWarehouseShift(
        employee,
        date,
        startTime,
        endTime,
        150,
        TemperatureZone.REFRIGERATED,
        GeographicZone.COPENHAGEN
      );

      // Base: 1200
      // Temperature: 8.5 * 8 = 68
      // Geographic: 12 * 8 = 96
      // Terminal: 5 * 8 = 40
      // Total: 1404
      expect(result.basePayment.toNumber()).toBe(1200);
      expect(result.temperatureSupplement.toNumber()).toBe(68);
      expect(result.geographicAllowance.toNumber()).toBe(96);
      expect(result.totalPayment.toNumber()).toBe(1404);
    });

    it('should calculate freezer warehouse shift', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T08:00:00');
      const endTime = new Date('2025-10-20T16:00:00');

      const result = calculateWarehouseShift(
        employee,
        date,
        startTime,
        endTime,
        150,
        TemperatureZone.FREEZER,
        GeographicZone.AARHUS
      );

      // Base: 1200
      // Temperature: 15 * 8 = 120
      // Geographic: 8 * 8 = 64
      // Terminal: 5 * 8 = 40
      // Total: 1424
      expect(result.temperatureSupplement.toNumber()).toBe(120);
      expect(result.geographicAllowance.toNumber()).toBe(64);
      expect(result.totalPayment.toNumber()).toBe(1424);
    });

    it('should calculate deep freeze shift with night bonus', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T22:00:00');
      const endTime = new Date('2025-10-21T06:00:00');

      const result = calculateWarehouseShift(
        employee,
        date,
        startTime,
        endTime,
        150,
        TemperatureZone.DEEP_FREEZE,
        GeographicZone.COPENHAGEN
      );

      // Base: 1200
      // Temperature: 20 * 8 = 160
      // Geographic: 12 * 8 = 96
      // Terminal: (5 + 8) * 8 = 104 (night bonus)
      // Total: 1560
      expect(result.temperatureSupplement.toNumber()).toBe(160);
      expect(result.geographicAllowance.toNumber()).toBe(96);
      expect(result.terminalSupplement.toNumber()).toBe(104);
      expect(result.totalPayment.toNumber()).toBe(1560);
      expect(result.isNightShift).toBe(true);
    });

    it('should calculate cross-dock terminal shift', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T08:00:00');
      const endTime = new Date('2025-10-20T16:00:00');

      const result = calculateWarehouseShift(
        employee,
        date,
        startTime,
        endTime,
        150,
        TemperatureZone.NORMAL,
        GeographicZone.OTHER_CITIES,
        TerminalType.CROSS_DOCK
      );

      // Base: 1200
      // Temperature: 0
      // Geographic: 4 * 8 = 32
      // Terminal: (5 + 3.5) * 8 = 68
      // Total: 1300
      expect(result.terminalSupplement.toNumber()).toBe(68);
      expect(result.geographicAllowance.toNumber()).toBe(32);
      expect(result.totalPayment.toNumber()).toBe(1300);
    });

    it('should calculate sorting terminal night shift', () => {
      const date = new Date('2025-10-20');
      const startTime = new Date('2025-10-20T22:00:00');
      const endTime = new Date('2025-10-21T06:00:00');

      const result = calculateWarehouseShift(
        employee,
        date,
        startTime,
        endTime,
        150,
        TemperatureZone.NORMAL,
        GeographicZone.RURAL,
        TerminalType.SORTING
      );

      // Base: 1200
      // Temperature: 0
      // Geographic: 0
      // Terminal: (5 + 4 + 8) * 8 = 136 (sorting + night)
      // Total: 1336
      expect(result.terminalSupplement.toNumber()).toBe(136);
      expect(result.totalPayment.toNumber()).toBe(1336);
    });
  });

  describe('calculateLoadingActivity', () => {
    it('should calculate payment for standard pallets', () => {
      const result = calculateLoadingActivity(
        employee.id,
        new Date('2025-10-20'),
        LoadingUnit.STANDARD_PALLET,
        100
      );

      // 100 * 8.5 = 850
      expect(result.quantity).toBe(100);
      expect(result.ratePerUnit.toNumber()).toBe(8.5);
      expect(result.totalPayment.toNumber()).toBe(850);
    });

    it('should calculate payment for heavy pallets', () => {
      const result = calculateLoadingActivity(
        employee.id,
        new Date('2025-10-20'),
        LoadingUnit.HEAVY_PALLET,
        50
      );

      // 50 * 12 = 600
      expect(result.totalPayment.toNumber()).toBe(600);
    });

    it('should calculate payment for 20ft container', () => {
      const result = calculateLoadingActivity(
        employee.id,
        new Date('2025-10-20'),
        LoadingUnit.CONTAINER_20FT,
        3
      );

      // 3 * 150 = 450
      expect(result.totalPayment.toNumber()).toBe(450);
    });

    it('should calculate payment for 40ft container', () => {
      const result = calculateLoadingActivity(
        employee.id,
        new Date('2025-10-20'),
        LoadingUnit.CONTAINER_40FT,
        2
      );

      // 2 * 250 = 500
      expect(result.totalPayment.toNumber()).toBe(500);
    });

    it('should add manual handling payment', () => {
      const result = calculateLoadingActivity(
        employee.id,
        new Date('2025-10-20'),
        LoadingUnit.STANDARD_PALLET,
        50,
        undefined,
        2 // 2 hours manual handling
      );

      // (50 * 8.5) + (2 * 15) = 425 + 30 = 455
      expect(result.totalPayment.toNumber()).toBe(455);
      expect(result.manualHandlingHours).toBe(2);
    });

    it('should use heavy pallet rate for overweight standard pallets', () => {
      const result = calculateLoadingActivity(
        employee.id,
        new Date('2025-10-20'),
        LoadingUnit.STANDARD_PALLET,
        10,
        600 // Over 500kg
      );

      // Should use heavy rate: 10 * 12 = 120
      expect(result.ratePerUnit.toNumber()).toBe(12);
      expect(result.totalPayment.toNumber()).toBe(120);
    });
  });

  describe('calculateMonthlyWarehouseSummary', () => {
    it('should summarize monthly warehouse work', () => {
      const shifts = [
        calculateWarehouseShift(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T08:00:00'),
          new Date('2025-10-20T16:00:00'),
          150,
          TemperatureZone.NORMAL,
          GeographicZone.RURAL
        ),
        calculateWarehouseShift(
          employee,
          new Date('2025-10-21'),
          new Date('2025-10-21T08:00:00'),
          new Date('2025-10-21T16:00:00'),
          150,
          TemperatureZone.REFRIGERATED,
          GeographicZone.COPENHAGEN
        ),
      ];

      const loadingActivities = [
        calculateLoadingActivity(
          employee.id,
          new Date('2025-10-20'),
          LoadingUnit.STANDARD_PALLET,
          100
        ),
      ];

      const summary = calculateMonthlyWarehouseSummary(
        employee.id,
        10,
        2025,
        shifts,
        loadingActivities
      );

      expect(summary.totalHours.toNumber()).toBe(16);
      expect(summary.refrigeratedHours.toNumber()).toBe(8);
      expect(summary.totalLoadingPayment.toNumber()).toBe(850);
    });

    it('should track freezer hours separately', () => {
      const shifts = [
        calculateWarehouseShift(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T08:00:00'),
          new Date('2025-10-20T16:00:00'),
          150,
          TemperatureZone.FREEZER,
          GeographicZone.RURAL
        ),
        calculateWarehouseShift(
          employee,
          new Date('2025-10-21'),
          new Date('2025-10-21T08:00:00'),
          new Date('2025-10-21T16:00:00'),
          150,
          TemperatureZone.DEEP_FREEZE,
          GeographicZone.RURAL
        ),
      ];

      const summary = calculateMonthlyWarehouseSummary(
        employee.id,
        10,
        2025,
        shifts,
        []
      );

      expect(summary.freezerHours.toNumber()).toBe(16);
    });

    it('should track night shift hours', () => {
      const shifts = [
        calculateWarehouseShift(
          employee,
          new Date('2025-10-20'),
          new Date('2025-10-20T22:00:00'),
          new Date('2025-10-21T06:00:00'),
          150,
          TemperatureZone.NORMAL,
          GeographicZone.RURAL
        ),
      ];

      const summary = calculateMonthlyWarehouseSummary(
        employee.id,
        10,
        2025,
        shifts,
        []
      );

      expect(summary.nightShiftHours.toNumber()).toBe(8);
    });

    it('should handle empty shifts and loading activities', () => {
      const summary = calculateMonthlyWarehouseSummary(
        employee.id,
        10,
        2025,
        [],
        []
      );

      expect(summary.totalHours.toNumber()).toBe(0);
      expect(summary.totalEarnings.toNumber()).toBe(0);
    });
  });

  describe('validateWarehouseShift', () => {
    it('should validate normal shift', () => {
      const shift = calculateWarehouseShift(
        employee,
        new Date('2025-10-20'),
        new Date('2025-10-20T08:00:00'),
        new Date('2025-10-20T16:00:00'),
        150,
        TemperatureZone.NORMAL,
        GeographicZone.RURAL
      );

      const validation = validateWarehouseShift(shift);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should warn about very long shift', () => {
      const shift = calculateWarehouseShift(
        employee,
        new Date('2025-10-20'),
        new Date('2025-10-20T06:00:00'),
        new Date('2025-10-20T19:00:00'),
        150,
        TemperatureZone.NORMAL,
        GeographicZone.RURAL
      );

      const validation = validateWarehouseShift(shift);

      expect(validation.warnings.some((w) => w.includes('langt skift'))).toBe(true);
    });
  });

  describe('Formatting functions', () => {
    it('should format temperature zones correctly', () => {
      expect(formatTemperatureZone(TemperatureZone.NORMAL)).toBe('Normal temperatur');
      expect(formatTemperatureZone(TemperatureZone.REFRIGERATED)).toBe('Køle (0-8°C)');
      expect(formatTemperatureZone(TemperatureZone.FREEZER)).toBe('Fryse (-18°C)');
      expect(formatTemperatureZone(TemperatureZone.DEEP_FREEZE)).toBe('Dybfrost (-25°C)');
    });

    it('should format geographic zones correctly', () => {
      expect(formatGeographicZone(GeographicZone.COPENHAGEN)).toBe('København og omegn');
      expect(formatGeographicZone(GeographicZone.AARHUS)).toBe('Aarhus');
      expect(formatGeographicZone(GeographicZone.ODENSE)).toBe('Odense');
      expect(formatGeographicZone(GeographicZone.AALBORG)).toBe('Aalborg');
      expect(formatGeographicZone(GeographicZone.OTHER_CITIES)).toBe('Andre større byer');
      expect(formatGeographicZone(GeographicZone.RURAL)).toBe('Landdistrikter');
    });

    it('should format terminal types correctly', () => {
      expect(formatTerminalType(TerminalType.STANDARD)).toBe('Standard terminal');
      expect(formatTerminalType(TerminalType.CROSS_DOCK)).toBe('Cross-docking terminal');
      expect(formatTerminalType(TerminalType.SORTING)).toBe('Sorteringsterminal');
      expect(formatTerminalType(TerminalType.DISTRIBUTION)).toBe('Distributionscenter');
    });

    it('should format loading units correctly', () => {
      expect(formatLoadingUnit(LoadingUnit.STANDARD_PALLET)).toBe('Standard palle (<500kg)');
      expect(formatLoadingUnit(LoadingUnit.HEAVY_PALLET)).toBe('Tung palle (≥500kg)');
      expect(formatLoadingUnit(LoadingUnit.CONTAINER_20FT)).toBe('20-fods container');
      expect(formatLoadingUnit(LoadingUnit.CONTAINER_40FT)).toBe('40-fods container');
    });
  });
});
