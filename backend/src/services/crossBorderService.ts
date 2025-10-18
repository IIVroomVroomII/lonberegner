/**
 * Grænseoverskridende Overenskomst - Cross-Border Agreement Service
 *
 * Håndterer:
 * - Døgnbetaling for internationale ture
 * - Kilometertillæg
 * - Garantibetaling (minimum indtjening)
 * - Fast vs. variabel grænseoverskridende kørsel
 * - Weekendtillæg ved internationale ture
 * - Diæter og rejseudgifter
 *
 * Baseret på Grænseoverskridende Overenskomst 2025-2028
 */

import { Employee } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import { calculateEffectiveHourlyWage } from './allowanceCalculationService';

export const CROSS_BORDER_RULES = {
  // Døgnbetaling (daily payment)
  DAILY_PAYMENT: {
    STANDARD_RATE: 850, // kr per døgn (24 timer)
    WEEKEND_RATE: 1050, // kr per weekend døgn
    MINIMUM_HOURS_FOR_FULL_DAY: 12, // Mindst 12 timer for fuldt døgn
  },

  // Kilometertillæg
  KILOMETER_ALLOWANCE: {
    RATE_PER_KM: 3.5, // kr per kilometer
    MINIMUM_KM_PER_TRIP: 500, // Minimum km for at kvalificere
    MAXIMUM_KM_PER_DAY: 800, // Maksimum km per dag der betales
  },

  // Garantibetaling
  GUARANTEED_PAYMENT: {
    WEEKLY_MINIMUM: 6500, // kr minimum per uge
    APPLIES_TO_FIXED_CROSS_BORDER: true, // Kun for faste grænseoverskridende
    INCLUDES_OVERTIME: false, // Inkluderer ikke overtid
  },

  // Fast grænseoverskridende kørsel
  FIXED_CROSS_BORDER: {
    DEFINED_ROUTES: true, // Faste ruter
    GUARANTEED_WEEKLY_HOURS: 37, // Garanterede timer per uge
    PREDICTABLE_SCHEDULE: true, // Forudsigelig køreplan
  },

  // Variabel grænseoverskridende kørsel
  VARIABLE_CROSS_BORDER: {
    NO_GUARANTEED_HOURS: true, // Ingen garanterede timer
    PAID_PER_TRIP: true, // Betales per tur
    FLEXIBLE_SCHEDULE: true, // Fleksibel køreplan
  },

  // Diæter og udgifter
  ALLOWANCES: {
    FOREIGN_DAILY_ALLOWANCE: 450, // kr per døgn i udlandet
    OVERNIGHT_ALLOWANCE: 150, // kr for overnatning uden hotel
    PARKING_EXPENSES: true, // Parkering dækkes
    TOLL_EXPENSES: true, // Bompenge dækkes
  },

  // Weekend arbejde
  WEEKEND: {
    SATURDAY_RATE_INCREASE: 50, // % tillæg lørdag
    SUNDAY_RATE_INCREASE: 100, // % tillæg søndag
    BANK_HOLIDAY_RATE_INCREASE: 100, // % tillæg helligdage
  },
};

export enum CrossBorderTripType {
  FIXED_ROUTE = 'FIXED_ROUTE', // Fast rute
  VARIABLE = 'VARIABLE', // Variabel kørsel
  LONG_HAUL = 'LONG_HAUL', // Langturskørsel
  SHORT_HAUL = 'SHORT_HAUL', // Kortturskørsel
}

export interface CrossBorderTrip {
  employeeId: string;
  tripType: CrossBorderTripType;
  startDate: Date;
  endDate: Date;
  startCountry: string;
  destinationCountry: string;
  totalKilometers: number;
  daysCount: number;
  weekendDays: number;
  bankHolidayDays: number;
  dailyPayment: Decimal;
  kilometerPayment: Decimal;
  weekendSupplement: Decimal;
  foreignAllowance: Decimal;
  totalPayment: Decimal;
  parkingExpenses?: Decimal;
  tollExpenses?: Decimal;
}

export interface WeeklyGuarantee {
  employeeId: string;
  weekNumber: number;
  year: number;
  actualEarnings: Decimal;
  guaranteedMinimum: Decimal;
  topUpNeeded: Decimal;
  tripsCount: number;
  totalKilometers: number;
}

/**
 * Beregner betaling for grænseoverskridende tur
 */
export function calculateCrossBorderTrip(
  employee: Employee,
  tripType: CrossBorderTripType,
  startDate: Date,
  endDate: Date,
  totalKilometers: number,
  startCountry: string = 'DK',
  destinationCountry: string,
  parkingExpenses: number = 0,
  tollExpenses: number = 0
): CrossBorderTrip {
  // Beregn antal dage (inklusiv)
  const timeDiff = endDate.getTime() - startDate.getTime();
  const daysCount = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  // Beregn weekend- og helligdage
  let weekendDays = 0;
  let bankHolidayDays = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    }
    // Simplified: ikke implementeret helligdagsdetektion her
  }

  // Beregn døgnbetaling
  const regularDays = daysCount - weekendDays - bankHolidayDays;
  const regularDailyPay = new Decimal(CROSS_BORDER_RULES.DAILY_PAYMENT.STANDARD_RATE).mul(
    regularDays
  );
  const weekendDailyPay = new Decimal(CROSS_BORDER_RULES.DAILY_PAYMENT.WEEKEND_RATE).mul(
    weekendDays
  );
  const dailyPayment = regularDailyPay.add(weekendDailyPay);

  // Beregn kilometertillæg
  let kilometerPayment = new Decimal(0);
  if (totalKilometers >= CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MINIMUM_KM_PER_TRIP) {
    const paidKilometers = Math.min(
      totalKilometers,
      CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MAXIMUM_KM_PER_DAY * daysCount
    );
    kilometerPayment = new Decimal(CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.RATE_PER_KM).mul(
      paidKilometers
    );
  }

  // Beregn weekendtillæg (udover højere døgnbetaling)
  const weekendSupplement = new Decimal(0); // Allerede inkluderet i weekend døgnbetaling

  // Beregn udenlands diæt
  const foreignAllowance = new Decimal(CROSS_BORDER_RULES.ALLOWANCES.FOREIGN_DAILY_ALLOWANCE).mul(
    daysCount
  );

  // Total betaling
  let totalPayment = dailyPayment
    .add(kilometerPayment)
    .add(weekendSupplement)
    .add(foreignAllowance);

  if (parkingExpenses > 0) {
    totalPayment = totalPayment.add(new Decimal(parkingExpenses));
  }
  if (tollExpenses > 0) {
    totalPayment = totalPayment.add(new Decimal(tollExpenses));
  }

  logger.info('Calculated cross-border trip', {
    employeeId: employee.id,
    tripType,
    daysCount,
    totalKilometers,
    totalPayment: totalPayment.toNumber(),
  });

  return {
    employeeId: employee.id,
    tripType,
    startDate,
    endDate,
    startCountry,
    destinationCountry,
    totalKilometers,
    daysCount,
    weekendDays,
    bankHolidayDays,
    dailyPayment,
    kilometerPayment,
    weekendSupplement,
    foreignAllowance,
    totalPayment,
    parkingExpenses: parkingExpenses > 0 ? new Decimal(parkingExpenses) : undefined,
    tollExpenses: tollExpenses > 0 ? new Decimal(tollExpenses) : undefined,
  };
}

/**
 * Beregner ugentlig garantibetaling
 */
export function calculateWeeklyGuarantee(
  employee: Employee,
  trips: CrossBorderTrip[],
  weekNumber: number,
  year: number
): WeeklyGuarantee {
  // Kun for faste grænseoverskridende chauffører
  if (!employee.isFixedCrossBorder) {
    const actualEarnings = trips.reduce((sum, trip) => sum.add(trip.totalPayment), new Decimal(0));

    return {
      employeeId: employee.id,
      weekNumber,
      year,
      actualEarnings,
      guaranteedMinimum: new Decimal(0),
      topUpNeeded: new Decimal(0),
      tripsCount: trips.length,
      totalKilometers: trips.reduce((sum, trip) => sum + trip.totalKilometers, 0),
    };
  }

  // Beregn faktisk indtjening
  const actualEarnings = trips.reduce((sum, trip) => sum.add(trip.totalPayment), new Decimal(0));

  const guaranteedMinimum = new Decimal(CROSS_BORDER_RULES.GUARANTEED_PAYMENT.WEEKLY_MINIMUM);

  // Beregn evt. tillæg
  const topUpNeeded = actualEarnings.lt(guaranteedMinimum)
    ? guaranteedMinimum.sub(actualEarnings)
    : new Decimal(0);

  const totalKilometers = trips.reduce((sum, trip) => sum + trip.totalKilometers, 0);

  logger.info('Calculated weekly guarantee', {
    employeeId: employee.id,
    weekNumber,
    actualEarnings: actualEarnings.toNumber(),
    guaranteedMinimum: guaranteedMinimum.toNumber(),
    topUpNeeded: topUpNeeded.toNumber(),
  });

  return {
    employeeId: employee.id,
    weekNumber,
    year,
    actualEarnings,
    guaranteedMinimum,
    topUpNeeded,
    tripsCount: trips.length,
    totalKilometers,
  };
}

/**
 * Validerer grænseoverskridende tur
 */
export function validateCrossBorderTrip(
  trip: CrossBorderTrip
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check dato
  if (trip.startDate >= trip.endDate) {
    errors.push('Startdato skal være før slutdato');
  }

  // Check kilometer
  if (trip.totalKilometers < 0) {
    errors.push('Kilometer kan ikke være negativt');
  }

  if (
    trip.totalKilometers < CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MINIMUM_KM_PER_TRIP &&
    trip.totalKilometers > 0
  ) {
    warnings.push(
      `Tur er under minimum ${CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MINIMUM_KM_PER_TRIP} km - kilometertillæg betales ikke`
    );
  }

  // Check destinationsland
  if (trip.startCountry === trip.destinationCountry) {
    warnings.push('Start og destination er samme land - er dette en grænseoverskridende tur?');
  }

  // Check dage vs kilometer
  const avgKmPerDay = trip.totalKilometers / trip.daysCount;
  if (avgKmPerDay > CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MAXIMUM_KM_PER_DAY) {
    warnings.push(
      `Gennemsnitlig køredistance (${avgKmPerDay.toFixed(0)} km/dag) overstiger maksimum (${CROSS_BORDER_RULES.KILOMETER_ALLOWANCE.MAXIMUM_KM_PER_DAY} km/dag)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Beregner total månedlig indtjening fra grænseoverskridende ture
 */
export function calculateMonthlyEarnings(trips: CrossBorderTrip[]): {
  totalTrips: number;
  totalDays: number;
  totalKilometers: number;
  totalDailyPayment: Decimal;
  totalKilometerPayment: Decimal;
  totalAllowances: Decimal;
  totalExpenses: Decimal;
  totalEarnings: Decimal;
  averagePerTrip: Decimal;
  averagePerDay: Decimal;
} {
  const totalTrips = trips.length;
  const totalDays = trips.reduce((sum, trip) => sum + trip.daysCount, 0);
  const totalKilometers = trips.reduce((sum, trip) => sum + trip.totalKilometers, 0);

  const totalDailyPayment = trips.reduce(
    (sum, trip) => sum.add(trip.dailyPayment),
    new Decimal(0)
  );
  const totalKilometerPayment = trips.reduce(
    (sum, trip) => sum.add(trip.kilometerPayment),
    new Decimal(0)
  );
  const totalAllowances = trips.reduce(
    (sum, trip) => sum.add(trip.foreignAllowance),
    new Decimal(0)
  );
  const totalExpenses = trips.reduce(
    (sum, trip) =>
      sum.add(trip.parkingExpenses || new Decimal(0)).add(trip.tollExpenses || new Decimal(0)),
    new Decimal(0)
  );
  const totalEarnings = trips.reduce((sum, trip) => sum.add(trip.totalPayment), new Decimal(0));

  const averagePerTrip = totalTrips > 0 ? totalEarnings.div(totalTrips) : new Decimal(0);
  const averagePerDay = totalDays > 0 ? totalEarnings.div(totalDays) : new Decimal(0);

  return {
    totalTrips,
    totalDays,
    totalKilometers,
    totalDailyPayment,
    totalKilometerPayment,
    totalAllowances,
    totalExpenses,
    totalEarnings,
    averagePerTrip,
    averagePerDay,
  };
}

/**
 * Beregner kompensation for reduceret weekend
 */
export function calculateWeekendCompensation(
  weekendDaysWorked: number,
  baseDailyRate: number
): Decimal {
  // Weekend arbejde giver ekstra kompensation
  const weekendRate = CROSS_BORDER_RULES.DAILY_PAYMENT.WEEKEND_RATE;
  const standardRate = CROSS_BORDER_RULES.DAILY_PAYMENT.STANDARD_RATE;
  const supplement = weekendRate - standardRate;

  return new Decimal(supplement).mul(weekendDaysWorked);
}

/**
 * Formaterer turtype
 */
export function formatTripType(type: CrossBorderTripType): string {
  switch (type) {
    case CrossBorderTripType.FIXED_ROUTE:
      return 'Fast rute';
    case CrossBorderTripType.VARIABLE:
      return 'Variabel kørsel';
    case CrossBorderTripType.LONG_HAUL:
      return 'Langturskørsel';
    case CrossBorderTripType.SHORT_HAUL:
      return 'Kortturskørsel';
    default:
      return 'Ukendt type';
  }
}

/**
 * Formaterer land kode til navn
 */
export function formatCountryName(countryCode: string): string {
  const countries: { [key: string]: string } = {
    DK: 'Danmark',
    DE: 'Tyskland',
    SE: 'Sverige',
    NO: 'Norge',
    NL: 'Holland',
    BE: 'Belgien',
    PL: 'Polen',
    FR: 'Frankrig',
    IT: 'Italien',
    ES: 'Spanien',
  };
  return countries[countryCode.toUpperCase()] || countryCode;
}
