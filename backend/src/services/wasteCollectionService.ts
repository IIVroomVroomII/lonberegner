/**
 * Dagrenovationsoverenskomst - Waste Collection Agreement Service
 *
 * Håndterer:
 * - Akkordnormer (piece rates) for containerindsamling
 * - Størrelsesbaserede takster (mini, standard, stor)
 * - Daglig minimumsgaranti
 * - Vejrkompensation
 * - Rutevanskelighedsfaktorer
 * - Tillæg for specielle beholdere
 *
 * Baseret på Dagrenovationsoverenskomst 2025-2028
 */

import { Employee } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

export const WASTE_COLLECTION_RULES = {
  // Akkordnormer (piece rates) - kr per beholder
  PIECE_RATES: {
    MINI_CONTAINER: 2.5, // 120-140L
    STANDARD_CONTAINER: 4.0, // 240L
    LARGE_CONTAINER: 6.5, // 360-400L
    EXTRA_LARGE_CONTAINER: 9.0, // 600L+
    PAPER_RECYCLING: 3.0, // Papircontainer
    GLASS_RECYCLING: 3.5, // Glascontainer
  },

  // Minimumsgaranti
  DAILY_GUARANTEE: {
    MINIMUM_PAYMENT: 850, // kr per dag minimum
    MINIMUM_HOURS: 7.4, // Minimum arbejdstimer
    GUARANTEE_APPLIES: true, // Garantien gælder altid
  },

  // Vejrkompensation
  WEATHER_COMPENSATION: {
    RAIN_SUPPLEMENT_PERCENT: 10, // 10% tillæg ved regn
    SNOW_SUPPLEMENT_PERCENT: 15, // 15% tillæg ved sne
    ICE_SUPPLEMENT_PERCENT: 20, // 20% tillæg ved glat føre
    HEAT_SUPPLEMENT_PERCENT: 12, // 12% tillæg ved >28°C
  },

  // Rutevanskelighedsfaktorer
  ROUTE_DIFFICULTY: {
    EASY: 1.0, // Fladt terræn, god adgang
    NORMAL: 1.15, // Standard byområde
    DIFFICULT: 1.3, // Bakker, snævre veje
    VERY_DIFFICULT: 1.5, // Trapper, dårlig adgang
  },

  // Særlige tillæg
  SPECIAL_ALLOWANCES: {
    UNDERGROUND_CONTAINER: 5.0, // kr ekstra for nedgravede
    LOCKED_CONTAINER: 2.0, // kr ekstra for aflåste
    HEAVY_CONTAINER: 3.5, // kr ekstra for overvægtige (>50kg)
    DIFFICULT_ACCESS: 4.0, // kr ekstra for vanskelig adgang
  },

  // Maksimum tilladt vægt per container
  WEIGHT_LIMITS: {
    MINI_CONTAINER: 30, // kg
    STANDARD_CONTAINER: 50, // kg
    LARGE_CONTAINER: 80, // kg
    EXTRA_LARGE_CONTAINER: 120, // kg
  },

  // Tidsnormer (minutter per container)
  TIME_STANDARDS: {
    MINI_CONTAINER: 1.5,
    STANDARD_CONTAINER: 2.0,
    LARGE_CONTAINER: 2.5,
    EXTRA_LARGE_CONTAINER: 3.5,
  },
};

export enum ContainerType {
  MINI = 'MINI', // 120-140L
  STANDARD = 'STANDARD', // 240L
  LARGE = 'LARGE', // 360-400L
  EXTRA_LARGE = 'EXTRA_LARGE', // 600L+
  PAPER_RECYCLING = 'PAPER_RECYCLING',
  GLASS_RECYCLING = 'GLASS_RECYCLING',
}

export enum RouteDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  DIFFICULT = 'DIFFICULT',
  VERY_DIFFICULT = 'VERY_DIFFICULT',
}

export enum WeatherCondition {
  NORMAL = 'NORMAL',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  ICE = 'ICE',
  EXTREME_HEAT = 'EXTREME_HEAT', // >28°C
}

export interface ContainerCollection {
  containerType: ContainerType;
  count: number;
  isUnderground?: boolean;
  isLocked?: boolean;
  isHeavy?: boolean;
  hasDifficultAccess?: boolean;
}

export interface WasteCollectionShift {
  employeeId: string;
  date: Date;
  collections: ContainerCollection[];
  routeDifficulty: RouteDifficulty;
  weatherCondition: WeatherCondition;
  basePayment: Decimal;
  difficultyAdjustment: Decimal;
  weatherCompensation: Decimal;
  specialAllowances: Decimal;
  totalContainers: number;
  totalPayment: Decimal;
  guaranteedMinimum: Decimal;
  actualPayment: Decimal; // Max of totalPayment and guaranteedMinimum
  hoursWorked: number;
}

export interface DailyCollectionSummary {
  employeeId: string;
  date: Date;
  totalContainers: number;
  containerBreakdown: { [key in ContainerType]?: number };
  totalEarnings: Decimal;
  averagePerContainer: Decimal;
  guaranteeApplied: boolean;
  hoursWorked: number;
}

/**
 * Beregner betaling for container baseret på type
 */
export function getContainerRate(containerType: ContainerType): number {
  switch (containerType) {
    case ContainerType.MINI:
      return WASTE_COLLECTION_RULES.PIECE_RATES.MINI_CONTAINER;
    case ContainerType.STANDARD:
      return WASTE_COLLECTION_RULES.PIECE_RATES.STANDARD_CONTAINER;
    case ContainerType.LARGE:
      return WASTE_COLLECTION_RULES.PIECE_RATES.LARGE_CONTAINER;
    case ContainerType.EXTRA_LARGE:
      return WASTE_COLLECTION_RULES.PIECE_RATES.EXTRA_LARGE_CONTAINER;
    case ContainerType.PAPER_RECYCLING:
      return WASTE_COLLECTION_RULES.PIECE_RATES.PAPER_RECYCLING;
    case ContainerType.GLASS_RECYCLING:
      return WASTE_COLLECTION_RULES.PIECE_RATES.GLASS_RECYCLING;
    default:
      return 0;
  }
}

/**
 * Beregner rutevanskelighedsfaktor
 */
export function getDifficultyMultiplier(difficulty: RouteDifficulty): number {
  switch (difficulty) {
    case RouteDifficulty.EASY:
      return WASTE_COLLECTION_RULES.ROUTE_DIFFICULTY.EASY;
    case RouteDifficulty.NORMAL:
      return WASTE_COLLECTION_RULES.ROUTE_DIFFICULTY.NORMAL;
    case RouteDifficulty.DIFFICULT:
      return WASTE_COLLECTION_RULES.ROUTE_DIFFICULTY.DIFFICULT;
    case RouteDifficulty.VERY_DIFFICULT:
      return WASTE_COLLECTION_RULES.ROUTE_DIFFICULTY.VERY_DIFFICULT;
    default:
      return 1.0;
  }
}

/**
 * Beregner vejrkompensation i procent
 */
export function getWeatherCompensationPercent(weather: WeatherCondition): number {
  switch (weather) {
    case WeatherCondition.RAIN:
      return WASTE_COLLECTION_RULES.WEATHER_COMPENSATION.RAIN_SUPPLEMENT_PERCENT;
    case WeatherCondition.SNOW:
      return WASTE_COLLECTION_RULES.WEATHER_COMPENSATION.SNOW_SUPPLEMENT_PERCENT;
    case WeatherCondition.ICE:
      return WASTE_COLLECTION_RULES.WEATHER_COMPENSATION.ICE_SUPPLEMENT_PERCENT;
    case WeatherCondition.EXTREME_HEAT:
      return WASTE_COLLECTION_RULES.WEATHER_COMPENSATION.HEAT_SUPPLEMENT_PERCENT;
    case WeatherCondition.NORMAL:
    default:
      return 0;
  }
}

/**
 * Beregner særlige tillæg for en container
 */
export function calculateSpecialAllowances(collection: ContainerCollection): Decimal {
  let allowances = new Decimal(0);

  if (collection.isUnderground) {
    allowances = allowances.add(
      new Decimal(WASTE_COLLECTION_RULES.SPECIAL_ALLOWANCES.UNDERGROUND_CONTAINER).mul(
        collection.count
      )
    );
  }

  if (collection.isLocked) {
    allowances = allowances.add(
      new Decimal(WASTE_COLLECTION_RULES.SPECIAL_ALLOWANCES.LOCKED_CONTAINER).mul(collection.count)
    );
  }

  if (collection.isHeavy) {
    allowances = allowances.add(
      new Decimal(WASTE_COLLECTION_RULES.SPECIAL_ALLOWANCES.HEAVY_CONTAINER).mul(collection.count)
    );
  }

  if (collection.hasDifficultAccess) {
    allowances = allowances.add(
      new Decimal(WASTE_COLLECTION_RULES.SPECIAL_ALLOWANCES.DIFFICULT_ACCESS).mul(collection.count)
    );
  }

  return allowances;
}

/**
 * Beregner estimeret arbejdstid baseret på containere
 */
export function calculateEstimatedHours(collections: ContainerCollection[]): number {
  let totalMinutes = 0;

  for (const collection of collections) {
    let minutesPerContainer = 0;

    switch (collection.containerType) {
      case ContainerType.MINI:
        minutesPerContainer = WASTE_COLLECTION_RULES.TIME_STANDARDS.MINI_CONTAINER;
        break;
      case ContainerType.STANDARD:
        minutesPerContainer = WASTE_COLLECTION_RULES.TIME_STANDARDS.STANDARD_CONTAINER;
        break;
      case ContainerType.LARGE:
        minutesPerContainer = WASTE_COLLECTION_RULES.TIME_STANDARDS.LARGE_CONTAINER;
        break;
      case ContainerType.EXTRA_LARGE:
        minutesPerContainer = WASTE_COLLECTION_RULES.TIME_STANDARDS.EXTRA_LARGE_CONTAINER;
        break;
      default:
        minutesPerContainer = WASTE_COLLECTION_RULES.TIME_STANDARDS.STANDARD_CONTAINER;
    }

    // Tillæg ekstra tid for specielle forhold
    if (collection.isUnderground) minutesPerContainer += 0.5;
    if (collection.isLocked) minutesPerContainer += 0.3;
    if (collection.hasDifficultAccess) minutesPerContainer += 0.7;

    totalMinutes += minutesPerContainer * collection.count;
  }

  // Konverter til timer, afrund op til nærmeste 0.1 time
  return Math.ceil((totalMinutes / 60) * 10) / 10;
}

/**
 * Beregner betaling for en arbejdsvagt (shift)
 */
export function calculateWasteCollectionShift(
  employee: Employee,
  date: Date,
  collections: ContainerCollection[],
  routeDifficulty: RouteDifficulty = RouteDifficulty.NORMAL,
  weatherCondition: WeatherCondition = WeatherCondition.NORMAL
): WasteCollectionShift {
  // Beregn basis betaling fra akkord
  let basePayment = new Decimal(0);
  let totalContainers = 0;

  for (const collection of collections) {
    const rate = getContainerRate(collection.containerType);
    basePayment = basePayment.add(new Decimal(rate).mul(collection.count));
    totalContainers += collection.count;
  }

  // Anvend rutevanskelighedsfaktor
  const difficultyMultiplier = getDifficultyMultiplier(routeDifficulty);
  const difficultyAdjustment = basePayment.mul(difficultyMultiplier).sub(basePayment);
  let totalPayment = basePayment.mul(difficultyMultiplier);

  // Beregn vejrkompensation
  const weatherPercent = getWeatherCompensationPercent(weatherCondition);
  const weatherCompensation = totalPayment.mul(weatherPercent).div(100);
  totalPayment = totalPayment.add(weatherCompensation);

  // Beregn særlige tillæg
  let specialAllowances = new Decimal(0);
  for (const collection of collections) {
    specialAllowances = specialAllowances.add(calculateSpecialAllowances(collection));
  }
  totalPayment = totalPayment.add(specialAllowances);

  // Beregn estimeret arbejdstid
  const hoursWorked = calculateEstimatedHours(collections);

  // Anvend minimumsgaranti
  const guaranteedMinimum = new Decimal(WASTE_COLLECTION_RULES.DAILY_GUARANTEE.MINIMUM_PAYMENT);
  const actualPayment = Decimal.max(totalPayment, guaranteedMinimum);

  logger.info('Calculated waste collection shift', {
    employeeId: employee.id,
    date,
    totalContainers,
    basePayment: basePayment.toNumber(),
    totalPayment: totalPayment.toNumber(),
    actualPayment: actualPayment.toNumber(),
    guaranteeApplied: actualPayment.gt(totalPayment),
  });

  return {
    employeeId: employee.id,
    date,
    collections,
    routeDifficulty,
    weatherCondition,
    basePayment,
    difficultyAdjustment,
    weatherCompensation,
    specialAllowances,
    totalContainers,
    totalPayment,
    guaranteedMinimum,
    actualPayment,
    hoursWorked,
  };
}

/**
 * Beregner dagligt sammendrag
 */
export function calculateDailyCollectionSummary(
  shifts: WasteCollectionShift[]
): DailyCollectionSummary | null {
  if (shifts.length === 0) return null;

  const firstShift = shifts[0];
  const employeeId = firstShift.employeeId;
  const date = firstShift.date;

  let totalContainers = 0;
  let totalEarnings = new Decimal(0);
  let totalHours = 0;
  let guaranteeApplied = false;

  const containerBreakdown: { [key in ContainerType]?: number } = {};

  for (const shift of shifts) {
    totalContainers += shift.totalContainers;
    totalEarnings = totalEarnings.add(shift.actualPayment);
    totalHours += shift.hoursWorked;

    if (shift.actualPayment.gt(shift.totalPayment)) {
      guaranteeApplied = true;
    }

    // Opdater container breakdown
    for (const collection of shift.collections) {
      const existing = containerBreakdown[collection.containerType] || 0;
      containerBreakdown[collection.containerType] = existing + collection.count;
    }
  }

  const averagePerContainer =
    totalContainers > 0 ? totalEarnings.div(totalContainers) : new Decimal(0);

  return {
    employeeId,
    date,
    totalContainers,
    containerBreakdown,
    totalEarnings,
    averagePerContainer,
    guaranteeApplied,
    hoursWorked: totalHours,
  };
}

/**
 * Validerer containerindsamling
 */
export function validateContainerCollection(
  collection: ContainerCollection
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (collection.count <= 0) {
    errors.push('Antal containere skal være mindst 1');
  }

  if (collection.count > 1000) {
    warnings.push(
      `Usædvanligt høj antal containere (${collection.count}) - verificer venligst`
    );
  }

  // Check for logiske kombinationer
  if (collection.containerType === ContainerType.MINI && collection.isHeavy) {
    warnings.push('Mini-container markeret som tung - verificer vægten');
  }

  if (collection.isUnderground && collection.hasDifficultAccess) {
    warnings.push('Container er både nedgravet og har vanskelig adgang - verificer');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validerer arbejdsvagt
 */
export function validateWasteCollectionShift(
  shift: WasteCollectionShift
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (shift.collections.length === 0) {
    errors.push('Mindst én containerindsamling skal være registreret');
  }

  if (shift.totalContainers === 0) {
    errors.push('Ingen containere registreret for vagten');
  }

  // Validér hver indsamling
  for (const collection of shift.collections) {
    const validation = validateContainerCollection(collection);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  // Check om garantien blev anvendt med mange containere
  if (shift.actualPayment.eq(shift.guaranteedMinimum) && shift.totalContainers > 100) {
    warnings.push(
      `Minimumsgaranti anvendt på trods af ${shift.totalContainers} containere - verificer akkordtakster`
    );
  }

  // Check ekstrem vejrkompensation
  if (shift.weatherCompensation.gt(shift.basePayment.mul(0.3))) {
    warnings.push('Vejrkompensation over 30% - verificer vejrforhold');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formaterer containertype
 */
export function formatContainerType(type: ContainerType): string {
  switch (type) {
    case ContainerType.MINI:
      return 'Mini (120-140L)';
    case ContainerType.STANDARD:
      return 'Standard (240L)';
    case ContainerType.LARGE:
      return 'Stor (360-400L)';
    case ContainerType.EXTRA_LARGE:
      return 'Ekstra stor (600L+)';
    case ContainerType.PAPER_RECYCLING:
      return 'Papir genbrug';
    case ContainerType.GLASS_RECYCLING:
      return 'Glas genbrug';
    default:
      return 'Ukendt type';
  }
}

/**
 * Formaterer rutevanskelighed
 */
export function formatRouteDifficulty(difficulty: RouteDifficulty): string {
  switch (difficulty) {
    case RouteDifficulty.EASY:
      return 'Let';
    case RouteDifficulty.NORMAL:
      return 'Normal';
    case RouteDifficulty.DIFFICULT:
      return 'Vanskelig';
    case RouteDifficulty.VERY_DIFFICULT:
      return 'Meget vanskelig';
    default:
      return 'Ukendt';
  }
}

/**
 * Formaterer vejrforhold
 */
export function formatWeatherCondition(weather: WeatherCondition): string {
  switch (weather) {
    case WeatherCondition.NORMAL:
      return 'Normalt';
    case WeatherCondition.RAIN:
      return 'Regn';
    case WeatherCondition.SNOW:
      return 'Sne';
    case WeatherCondition.ICE:
      return 'Glat føre';
    case WeatherCondition.EXTREME_HEAT:
      return 'Ekstrem varme (>28°C)';
    default:
      return 'Ukendt';
  }
}
