/**
 * Lager- og Terminaloverenskomst - Warehouse/Terminal Agreement Service
 *
 * Håndterer:
 * - Temperaturtillæg (køle/fryse)
 * - Geografiske tillæg
 * - Terminaltillæg
 * - Læsse/losse takster
 * - Nat-terminal bonusser
 *
 * Baseret på Lager- og Terminaloverenskomst 2025-2028
 */

import { Employee } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

export const WAREHOUSE_TERMINAL_RULES = {
  // Temperaturtillæg
  TEMPERATURE_SUPPLEMENTS: {
    NORMAL: 0, // Normal temperatur
    REFRIGERATED: 8.5, // Kr/time - køle (0-8°C)
    FREEZER: 15.0, // Kr/time - fryse (-18°C eller koldere)
    DEEP_FREEZE: 20.0, // Kr/time - dybfrost (-25°C eller koldere)
  },

  // Geografiske tillæg (kr/time)
  GEOGRAPHIC_ALLOWANCES: {
    COPENHAGEN: 12.0, // København og omegn
    AARHUS: 8.0, // Aarhus
    ODENSE: 6.5, // Odense
    AALBORG: 6.0, // Aalborg
    OTHER_CITIES: 4.0, // Andre større byer
    RURAL: 0, // Landdistrikter
  },

  // Terminaltillæg
  TERMINAL_SUPPLEMENTS: {
    BASE_TERMINAL_ALLOWANCE: 5.0, // Kr/time basis terminaltillæg
    NIGHT_TERMINAL_BONUS: 8.0, // Kr/time ekstra for natterminal (22:00-06:00)
    CROSS_DOCK_SUPPLEMENT: 3.5, // Kr/time for cross-docking
    SORTING_SUPPLEMENT: 4.0, // Kr/time for sortering
  },

  // Læsse/losse takster
  LOADING_RATES: {
    STANDARD_PALLET: 8.5, // Kr per palle
    HEAVY_PALLET: 12.0, // Kr per tung palle (>500kg)
    CONTAINER_20FT: 150.0, // Kr per 20' container
    CONTAINER_40FT: 250.0, // Kr per 40' container
    MANUAL_HANDLING: 15.0, // Kr/time for manuel håndtering
  },

  // Arbejdstider
  SHIFT_TIMES: {
    DAY_SHIFT_START: 6, // 06:00
    DAY_SHIFT_END: 18, // 18:00
    NIGHT_SHIFT_START: 22, // 22:00
    NIGHT_SHIFT_END: 6, // 06:00
  },

  // Vægtgrænser
  WEIGHT_LIMITS: {
    STANDARD_PALLET_MAX: 500, // kg
    HEAVY_PALLET_MIN: 500, // kg
  },
};

export enum TemperatureZone {
  NORMAL = 'NORMAL', // Normal temperatur
  REFRIGERATED = 'REFRIGERATED', // Køle 0-8°C
  FREEZER = 'FREEZER', // Fryse -18°C
  DEEP_FREEZE = 'DEEP_FREEZE', // Dybfrost -25°C
}

export enum GeographicZone {
  COPENHAGEN = 'COPENHAGEN', // København
  AARHUS = 'AARHUS', // Aarhus
  ODENSE = 'ODENSE', // Odense
  AALBORG = 'AALBORG', // Aalborg
  OTHER_CITIES = 'OTHER_CITIES', // Andre byer
  RURAL = 'RURAL', // Landdistrikter
}

export enum TerminalType {
  STANDARD = 'STANDARD', // Standard terminal
  CROSS_DOCK = 'CROSS_DOCK', // Cross-docking
  SORTING = 'SORTING', // Sorteringsterminal
  DISTRIBUTION = 'DISTRIBUTION', // Distributionscenter
}

export enum LoadingUnit {
  STANDARD_PALLET = 'STANDARD_PALLET',
  HEAVY_PALLET = 'HEAVY_PALLET',
  CONTAINER_20FT = 'CONTAINER_20FT',
  CONTAINER_40FT = 'CONTAINER_40FT',
}

export interface WarehouseShift {
  employeeId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  hoursWorked: number;
  temperatureZone: TemperatureZone;
  geographicZone: GeographicZone;
  terminalType: TerminalType;
  isNightShift: boolean;
  basePayment: Decimal;
  temperatureSupplement: Decimal;
  geographicAllowance: Decimal;
  terminalSupplement: Decimal;
  totalPayment: Decimal;
}

export interface LoadingActivity {
  employeeId: string;
  date: Date;
  loadingUnit: LoadingUnit;
  quantity: number;
  weight?: number; // kg per unit
  ratePerUnit: Decimal;
  manualHandlingHours?: number;
  totalPayment: Decimal;
}

export interface MonthlyWarehouseSummary {
  employeeId: string;
  month: number;
  year: number;
  totalHours: Decimal;
  refrigeratedHours: Decimal;
  freezerHours: Decimal;
  nightShiftHours: Decimal;
  totalBasePayment: Decimal;
  totalTemperatureSupplements: Decimal;
  totalGeographicAllowances: Decimal;
  totalTerminalSupplements: Decimal;
  totalLoadingPayment: Decimal;
  totalEarnings: Decimal;
}

/**
 * Beregner temperaturtillæg per time
 */
export function getTemperatureSupplementRate(zone: TemperatureZone): number {
  switch (zone) {
    case TemperatureZone.REFRIGERATED:
      return WAREHOUSE_TERMINAL_RULES.TEMPERATURE_SUPPLEMENTS.REFRIGERATED;
    case TemperatureZone.FREEZER:
      return WAREHOUSE_TERMINAL_RULES.TEMPERATURE_SUPPLEMENTS.FREEZER;
    case TemperatureZone.DEEP_FREEZE:
      return WAREHOUSE_TERMINAL_RULES.TEMPERATURE_SUPPLEMENTS.DEEP_FREEZE;
    case TemperatureZone.NORMAL:
    default:
      return WAREHOUSE_TERMINAL_RULES.TEMPERATURE_SUPPLEMENTS.NORMAL;
  }
}

/**
 * Beregner geografisk tillæg per time
 */
export function getGeographicAllowanceRate(zone: GeographicZone): number {
  switch (zone) {
    case GeographicZone.COPENHAGEN:
      return WAREHOUSE_TERMINAL_RULES.GEOGRAPHIC_ALLOWANCES.COPENHAGEN;
    case GeographicZone.AARHUS:
      return WAREHOUSE_TERMINAL_RULES.GEOGRAPHIC_ALLOWANCES.AARHUS;
    case GeographicZone.ODENSE:
      return WAREHOUSE_TERMINAL_RULES.GEOGRAPHIC_ALLOWANCES.ODENSE;
    case GeographicZone.AALBORG:
      return WAREHOUSE_TERMINAL_RULES.GEOGRAPHIC_ALLOWANCES.AALBORG;
    case GeographicZone.OTHER_CITIES:
      return WAREHOUSE_TERMINAL_RULES.GEOGRAPHIC_ALLOWANCES.OTHER_CITIES;
    case GeographicZone.RURAL:
    default:
      return WAREHOUSE_TERMINAL_RULES.GEOGRAPHIC_ALLOWANCES.RURAL;
  }
}

/**
 * Beregner terminaltillæg per time
 */
export function getTerminalSupplementRate(
  terminalType: TerminalType,
  isNightShift: boolean
): number {
  let rate = WAREHOUSE_TERMINAL_RULES.TERMINAL_SUPPLEMENTS.BASE_TERMINAL_ALLOWANCE;

  switch (terminalType) {
    case TerminalType.CROSS_DOCK:
      rate += WAREHOUSE_TERMINAL_RULES.TERMINAL_SUPPLEMENTS.CROSS_DOCK_SUPPLEMENT;
      break;
    case TerminalType.SORTING:
      rate += WAREHOUSE_TERMINAL_RULES.TERMINAL_SUPPLEMENTS.SORTING_SUPPLEMENT;
      break;
    case TerminalType.STANDARD:
    case TerminalType.DISTRIBUTION:
    default:
      // Base rate only
      break;
  }

  if (isNightShift) {
    rate += WAREHOUSE_TERMINAL_RULES.TERMINAL_SUPPLEMENTS.NIGHT_TERMINAL_BONUS;
  }

  return rate;
}

/**
 * Beregner takst for læsseenhed
 */
export function getLoadingRate(unit: LoadingUnit, weight?: number): number {
  switch (unit) {
    case LoadingUnit.STANDARD_PALLET:
      // Check if weight exceeds standard limit
      if (weight && weight >= WAREHOUSE_TERMINAL_RULES.WEIGHT_LIMITS.HEAVY_PALLET_MIN) {
        return WAREHOUSE_TERMINAL_RULES.LOADING_RATES.HEAVY_PALLET;
      }
      return WAREHOUSE_TERMINAL_RULES.LOADING_RATES.STANDARD_PALLET;

    case LoadingUnit.HEAVY_PALLET:
      return WAREHOUSE_TERMINAL_RULES.LOADING_RATES.HEAVY_PALLET;

    case LoadingUnit.CONTAINER_20FT:
      return WAREHOUSE_TERMINAL_RULES.LOADING_RATES.CONTAINER_20FT;

    case LoadingUnit.CONTAINER_40FT:
      return WAREHOUSE_TERMINAL_RULES.LOADING_RATES.CONTAINER_40FT;

    default:
      return 0;
  }
}

/**
 * Beregner arbejdstimer
 */
export function calculateHoursWorked(startTime: Date, endTime: Date): number {
  const milliseconds = endTime.getTime() - startTime.getTime();
  return milliseconds / (1000 * 60 * 60);
}

/**
 * Tjekker om det er nattevagt
 */
export function isNightShift(startTime: Date): boolean {
  const hour = startTime.getHours();
  return hour >= WAREHOUSE_TERMINAL_RULES.SHIFT_TIMES.NIGHT_SHIFT_START ||
         hour < WAREHOUSE_TERMINAL_RULES.SHIFT_TIMES.NIGHT_SHIFT_END;
}

/**
 * Beregner betaling for lagervagt
 */
export function calculateWarehouseShift(
  employee: Employee,
  date: Date,
  startTime: Date,
  endTime: Date,
  hourlyRate: number,
  temperatureZone: TemperatureZone,
  geographicZone: GeographicZone,
  terminalType: TerminalType = TerminalType.STANDARD
): WarehouseShift {
  const hoursWorked = calculateHoursWorked(startTime, endTime);
  const nightShift = isNightShift(startTime);

  // Basis betaling
  const basePayment = new Decimal(hourlyRate).mul(hoursWorked);

  // Temperaturtillæg
  const tempRate = getTemperatureSupplementRate(temperatureZone);
  const temperatureSupplement = new Decimal(tempRate).mul(hoursWorked);

  // Geografisk tillæg
  const geoRate = getGeographicAllowanceRate(geographicZone);
  const geographicAllowance = new Decimal(geoRate).mul(hoursWorked);

  // Terminaltillæg
  const terminalRate = getTerminalSupplementRate(terminalType, nightShift);
  const terminalSupplement = new Decimal(terminalRate).mul(hoursWorked);

  // Total betaling
  const totalPayment = basePayment
    .add(temperatureSupplement)
    .add(geographicAllowance)
    .add(terminalSupplement);

  logger.info('Calculated warehouse shift', {
    employeeId: employee.id,
    date,
    hoursWorked,
    temperatureZone,
    totalPayment: totalPayment.toNumber(),
  });

  return {
    employeeId: employee.id,
    date,
    startTime,
    endTime,
    hoursWorked,
    temperatureZone,
    geographicZone,
    terminalType,
    isNightShift: nightShift,
    basePayment,
    temperatureSupplement,
    geographicAllowance,
    terminalSupplement,
    totalPayment,
  };
}

/**
 * Beregner betaling for læssearbejde
 */
export function calculateLoadingActivity(
  employeeId: string,
  date: Date,
  loadingUnit: LoadingUnit,
  quantity: number,
  weight?: number,
  manualHandlingHours?: number
): LoadingActivity {
  const ratePerUnit = new Decimal(getLoadingRate(loadingUnit, weight));
  let totalPayment = ratePerUnit.mul(quantity);

  // Tilføj manuel håndtering hvis relevant
  if (manualHandlingHours && manualHandlingHours > 0) {
    const manualRate = WAREHOUSE_TERMINAL_RULES.LOADING_RATES.MANUAL_HANDLING;
    totalPayment = totalPayment.add(new Decimal(manualRate).mul(manualHandlingHours));
  }

  return {
    employeeId,
    date,
    loadingUnit,
    quantity,
    weight,
    ratePerUnit,
    manualHandlingHours,
    totalPayment,
  };
}

/**
 * Beregner månedligt sammendrag for lagermedarbejder
 */
export function calculateMonthlyWarehouseSummary(
  employeeId: string,
  month: number,
  year: number,
  shifts: WarehouseShift[],
  loadingActivities: LoadingActivity[]
): MonthlyWarehouseSummary {
  let totalHours = new Decimal(0);
  let refrigeratedHours = new Decimal(0);
  let freezerHours = new Decimal(0);
  let nightShiftHours = new Decimal(0);
  let totalBasePayment = new Decimal(0);
  let totalTemperatureSupplements = new Decimal(0);
  let totalGeographicAllowances = new Decimal(0);
  let totalTerminalSupplements = new Decimal(0);

  for (const shift of shifts) {
    totalHours = totalHours.add(shift.hoursWorked);
    totalBasePayment = totalBasePayment.add(shift.basePayment);
    totalTemperatureSupplements = totalTemperatureSupplements.add(shift.temperatureSupplement);
    totalGeographicAllowances = totalGeographicAllowances.add(shift.geographicAllowance);
    totalTerminalSupplements = totalTerminalSupplements.add(shift.terminalSupplement);

    if (shift.temperatureZone === TemperatureZone.REFRIGERATED) {
      refrigeratedHours = refrigeratedHours.add(shift.hoursWorked);
    } else if (
      shift.temperatureZone === TemperatureZone.FREEZER ||
      shift.temperatureZone === TemperatureZone.DEEP_FREEZE
    ) {
      freezerHours = freezerHours.add(shift.hoursWorked);
    }

    if (shift.isNightShift) {
      nightShiftHours = nightShiftHours.add(shift.hoursWorked);
    }
  }

  const totalLoadingPayment = loadingActivities.reduce(
    (sum, activity) => sum.add(activity.totalPayment),
    new Decimal(0)
  );

  const totalEarnings = totalBasePayment
    .add(totalTemperatureSupplements)
    .add(totalGeographicAllowances)
    .add(totalTerminalSupplements)
    .add(totalLoadingPayment);

  return {
    employeeId,
    month,
    year,
    totalHours,
    refrigeratedHours,
    freezerHours,
    nightShiftHours,
    totalBasePayment,
    totalTemperatureSupplements,
    totalGeographicAllowances,
    totalTerminalSupplements,
    totalLoadingPayment,
    totalEarnings,
  };
}

/**
 * Validerer lagervagt
 */
export function validateWarehouseShift(shift: WarehouseShift): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (shift.hoursWorked <= 0) {
    errors.push('Arbejdstimer skal være positiv');
  }

  if (shift.hoursWorked > 12) {
    warnings.push(`Usædvanligt langt skift (${shift.hoursWorked.toFixed(1)} timer)`);
  }

  if (shift.startTime >= shift.endTime) {
    errors.push('Starttid skal være før sluttid');
  }

  // Warn if night shift but not marked as such
  const shouldBeNight = isNightShift(shift.startTime);
  if (shouldBeNight !== shift.isNightShift) {
    warnings.push('Nattevagt markering matcher ikke arbejdstiden');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formaterer temperaturzone
 */
export function formatTemperatureZone(zone: TemperatureZone): string {
  switch (zone) {
    case TemperatureZone.NORMAL:
      return 'Normal temperatur';
    case TemperatureZone.REFRIGERATED:
      return 'Køle (0-8°C)';
    case TemperatureZone.FREEZER:
      return 'Fryse (-18°C)';
    case TemperatureZone.DEEP_FREEZE:
      return 'Dybfrost (-25°C)';
    default:
      return 'Ukendt temperaturzone';
  }
}

/**
 * Formaterer geografisk zone
 */
export function formatGeographicZone(zone: GeographicZone): string {
  switch (zone) {
    case GeographicZone.COPENHAGEN:
      return 'København og omegn';
    case GeographicZone.AARHUS:
      return 'Aarhus';
    case GeographicZone.ODENSE:
      return 'Odense';
    case GeographicZone.AALBORG:
      return 'Aalborg';
    case GeographicZone.OTHER_CITIES:
      return 'Andre større byer';
    case GeographicZone.RURAL:
      return 'Landdistrikter';
    default:
      return 'Ukendt geografisk zone';
  }
}

/**
 * Formaterer terminaltype
 */
export function formatTerminalType(type: TerminalType): string {
  switch (type) {
    case TerminalType.STANDARD:
      return 'Standard terminal';
    case TerminalType.CROSS_DOCK:
      return 'Cross-docking terminal';
    case TerminalType.SORTING:
      return 'Sorteringsterminal';
    case TerminalType.DISTRIBUTION:
      return 'Distributionscenter';
    default:
      return 'Ukendt terminaltype';
  }
}

/**
 * Formaterer læsseenhed
 */
export function formatLoadingUnit(unit: LoadingUnit): string {
  switch (unit) {
    case LoadingUnit.STANDARD_PALLET:
      return 'Standard palle (<500kg)';
    case LoadingUnit.HEAVY_PALLET:
      return 'Tung palle (≥500kg)';
    case LoadingUnit.CONTAINER_20FT:
      return '20-fods container';
    case LoadingUnit.CONTAINER_40FT:
      return '40-fods container';
    default:
      return 'Ukendt læsseenhed';
  }
}
