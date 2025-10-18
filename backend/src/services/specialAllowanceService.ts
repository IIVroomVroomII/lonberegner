/**
 * § 8 Særligt Løntillæg/Opsparing - Special Allowance/Savings Service
 *
 * Håndterer:
 * - Særligt løntillæg eller opsparing (valg)
 * - Progression i satser over overenskomstperioden
 * - Frihedskonto administration for timelønnede (6,75% af ferieberettiget løn)
 * - Frihedsdage beregning
 * - Årlig udbetaling ved ikke-anvendte midler
 *
 * Baseret på Transport- og Logistikoverenskomsten 2025-2028 § 8
 */

import prisma from '../config/database';
import { Employee, FreedomTransactionType, WorkTimeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';

// § 8 Særligt tillæg/opsparing progression (2025-2028)
export const SPECIAL_ALLOWANCE_RATES = {
  // Timelønnede - Frihedskonto (% af ferieberettiget løn)
  HOURLY_FREEDOM_ACCOUNT: {
    '2025': 6.75, // Fra 1.5.2025
    '2026': 6.75,
    '2027': 6.75,
    '2028': 6.75,
  },

  // Fuldlønnede - Særligt tillæg (% af pensionsgivende løn)
  SALARIED_ALLOWANCE: {
    '2025': 7.60, // Fra 1.5.2025
    '2026': 7.80, // Fra 1.5.2026
    '2027': 8.00, // Fra 1.5.2027
    '2028': 8.20, // Fra 1.5.2028
  },

  // Hvis medarbejder vælger opsparing i stedet for tillæg
  SAVINGS_OPTION: {
    '2025': 7.60,
    '2026': 7.80,
    '2027': 8.00,
    '2028': 8.20,
  },
};

// Frihedskonto regler
export const FREEDOM_ACCOUNT_RULES = {
  DEPOSIT_PERCENTAGE: 6.75, // 6,75% af ferieberettiget løn
  HOURS_PER_DAY: 7.4, // Antal timer pr. fridag
  YEAR_END_PAYOUT_MONTH: 12, // December (måned for årlig udbetaling)
  TERMINATION_PAYOUT: true, // Udbetal ved fratræden
};

// Frihedsdage (§ 11 - men administreres via frihedskonti)
export const FREEDOM_DAYS = {
  MAY_1: 'Arbejdernes internationale kampdag (1. maj)',
  JUNE_5: 'Grundlovsdag (5. juni)',
  CHRISTMAS_EVE: 'Juleaftensdag (24. december)',
  NEW_YEARS_EVE: 'Nytårsaftensdag (31. december)',
  EASTER_SATURDAY: 'Påskesløørdag',
};

export interface SpecialAllowanceCalculation {
  baseAmount: number; // Ferieberettiget løn
  percentage: number; // Aktuel procentsats
  allowanceAmount: number; // Beløb
  year: number; // Hvilket år satsen gælder for
  isSavings: boolean; // Om det er opsparing eller tillæg
}

export interface FreedomAccountBalance {
  employeeId: string;
  balance: number; // Saldo i kroner
  yearlyDeposit: number; // Indbetalt i indeværende år
  estimatedDays: number; // Estimeret antal fridage
  transactions: Array<{
    id: string;
    amount: number;
    type: FreedomTransactionType;
    description: string;
    date: Date;
  }>;
}

/**
 * Beregner særligt tillæg/opsparing baseret på år og medarbejdertype
 */
export function calculateSpecialAllowance(
  vacationEligiblePay: number,
  employee: Employee,
  calculationDate: Date = new Date()
): SpecialAllowanceCalculation {
  const year = calculationDate.getFullYear();
  const yearKey = year.toString() as keyof typeof SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE;

  let percentage: number;
  let isSavings: boolean;

  // Timelønnede får automatisk frihedskonto
  if (employee.workTimeType === WorkTimeType.HOURLY ||
      employee.workTimeType === WorkTimeType.SUBSTITUTE) {
    percentage = SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT[yearKey] || 6.75;
    isSavings = true; // Frihedskonto er en form for opsparing
  }
  // Fuldlønnede kan vælge tillæg eller opsparing
  else {
    if (employee.useSpecialSavings) {
      percentage = SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION[yearKey] || 7.60;
      isSavings = true;
    } else {
      percentage = SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE[yearKey] || 7.60;
      isSavings = false;
    }
  }

  const allowanceAmount = (vacationEligiblePay * percentage) / 100;

  logger.debug('Calculated special allowance', {
    employeeId: employee.id,
    workTimeType: employee.workTimeType,
    vacationEligiblePay,
    percentage,
    allowanceAmount,
    year,
    isSavings,
  });

  return {
    baseAmount: vacationEligiblePay,
    percentage,
    allowanceAmount,
    year,
    isSavings,
  };
}

/**
 * Indbetaler til frihedskonto (for timelønnede)
 */
export async function depositToFreedomAccount(
  employeeId: string,
  amount: number,
  description: string,
  transactionType: FreedomTransactionType = FreedomTransactionType.DEPOSIT
): Promise<string> {
  // Find eller opret frihedskonto
  let account = await prisma.freedomAccount.findUnique({
    where: { employeeId },
  });

  if (!account) {
    account = await prisma.freedomAccount.create({
      data: {
        employeeId,
        balance: new Decimal(0),
        yearlyDeposit: new Decimal(0),
      },
    });
  }

  // Opret transaktion
  const transaction = await prisma.freedomAccountTransaction.create({
    data: {
      freedomAccountId: account.id,
      amount: new Decimal(amount),
      type: transactionType,
      description,
      date: new Date(),
    },
  });

  // Opdater balance og årligt indskud
  const newBalance = Number(account.balance) + amount;
  const newYearlyDeposit = transactionType === FreedomTransactionType.DEPOSIT
    ? Number(account.yearlyDeposit) + amount
    : Number(account.yearlyDeposit);

  await prisma.freedomAccount.update({
    where: { id: account.id },
    data: {
      balance: new Decimal(newBalance),
      yearlyDeposit: new Decimal(newYearlyDeposit),
    },
  });

  logger.info('Freedom account deposit', {
    employeeId,
    transactionId: transaction.id,
    amount,
    newBalance,
    type: transactionType,
  });

  return transaction.id;
}

/**
 * Trækker fra frihedskonto (fridag eller udbetaling)
 */
export async function withdrawFromFreedomAccount(
  employeeId: string,
  amount: number,
  transactionType: FreedomTransactionType,
  description: string
): Promise<string> {
  const account = await prisma.freedomAccount.findUnique({
    where: { employeeId },
  });

  if (!account) {
    throw new Error('Frihedskonto ikke fundet');
  }

  const currentBalance = Number(account.balance);
  if (currentBalance < amount) {
    throw new Error(
      `Utilstrækkelig saldo på frihedskonto. Balance: ${currentBalance} kr, forsøgt hævning: ${amount} kr`
    );
  }

  // Opret transaktion (negativ amount)
  const transaction = await prisma.freedomAccountTransaction.create({
    data: {
      freedomAccountId: account.id,
      amount: new Decimal(-amount),
      type: transactionType,
      description,
      date: new Date(),
    },
  });

  // Opdater balance
  const newBalance = currentBalance - amount;
  await prisma.freedomAccount.update({
    where: { id: account.id },
    data: {
      balance: new Decimal(newBalance),
    },
  });

  logger.info('Freedom account withdrawal', {
    employeeId,
    transactionId: transaction.id,
    amount,
    newBalance,
    type: transactionType,
  });

  return transaction.id;
}

/**
 * Henter frihedskontobalance
 */
export async function getFreedomAccountBalance(
  employeeId: string
): Promise<FreedomAccountBalance> {
  const account = await prisma.freedomAccount.findUnique({
    where: { employeeId },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
        take: 50, // Seneste 50 transaktioner
      },
    },
  });

  if (!account) {
    return {
      employeeId,
      balance: 0,
      yearlyDeposit: 0,
      estimatedDays: 0,
      transactions: [],
    };
  }

  const balance = Number(account.balance);
  const yearlyDeposit = Number(account.yearlyDeposit);

  // Beregn estimeret antal fridage
  // Antag en gennemsnitlig dagløn baseret på frihedskontoindskud
  const averageDailyPay = yearlyDeposit > 0 ? yearlyDeposit / 260 : 0; // ~260 arbejdsdage/år
  const estimatedDays = averageDailyPay > 0
    ? Math.floor(balance / averageDailyPay)
    : 0;

  return {
    employeeId,
    balance,
    yearlyDeposit,
    estimatedDays,
    transactions: account.transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      description: t.description,
      date: t.date,
    })),
  };
}

/**
 * Registrerer fridag (trækker fra frihedskonto)
 */
export async function takeFreedomDay(
  employeeId: string,
  date: Date,
  dayType: keyof typeof FREEDOM_DAYS,
  hourlyRate: number
): Promise<string> {
  const hoursPerDay = FREEDOM_ACCOUNT_RULES.HOURS_PER_DAY;
  const amount = hourlyRate * hoursPerDay;

  const description = `Fridag: ${FREEDOM_DAYS[dayType]} (${date.toISOString().split('T')[0]})`;

  return await withdrawFromFreedomAccount(
    employeeId,
    amount,
    FreedomTransactionType.FREEDOM_DAY,
    description
  );
}

/**
 * Årlig udbetaling af resterende frihedskontobeløb
 * (Typisk i december hvis ikke anvendt)
 */
export async function yearEndFreedomAccountPayout(
  employeeId: string
): Promise<{
  amount: number;
  transactionId: string;
} | null> {
  const account = await prisma.freedomAccount.findUnique({
    where: { employeeId },
  });

  if (!account) {
    return null;
  }

  const balance = Number(account.balance);

  if (balance <= 0) {
    return null;
  }

  // Udbetal hele saldoen
  const transactionId = await withdrawFromFreedomAccount(
    employeeId,
    balance,
    FreedomTransactionType.YEAR_END_PAYOUT,
    'Årlig udbetaling af resterende frihedskontobeløb'
  );

  // Nulstil årligt indskud (nyt år)
  await prisma.freedomAccount.update({
    where: { employeeId },
    data: {
      yearlyDeposit: new Decimal(0),
    },
  });

  logger.info('Year-end freedom account payout', {
    employeeId,
    amount: balance,
    transactionId,
  });

  return {
    amount: balance,
    transactionId,
  };
}

/**
 * Udbetaling ved fratræden
 */
export async function terminationFreedomAccountPayout(
  employeeId: string
): Promise<{
  amount: number;
  transactionId: string;
} | null> {
  const account = await prisma.freedomAccount.findUnique({
    where: { employeeId },
  });

  if (!account) {
    return null;
  }

  const balance = Number(account.balance);

  if (balance <= 0) {
    return null;
  }

  const transactionId = await withdrawFromFreedomAccount(
    employeeId,
    balance,
    FreedomTransactionType.TERMINATION_PAYOUT,
    'Udbetaling ved fratræden'
  );

  logger.info('Termination freedom account payout', {
    employeeId,
    amount: balance,
    transactionId,
  });

  return {
    amount: balance,
    transactionId,
  };
}

/**
 * Beregner progression i særligt tillæg over årene
 */
export function getProgressionRates(
  workTimeType: WorkTimeType,
  useSpecialSavings: boolean
): Array<{ year: number; rate: number }> {
  const years = [2025, 2026, 2027, 2028];

  if (workTimeType === WorkTimeType.HOURLY || workTimeType === WorkTimeType.SUBSTITUTE) {
    // Frihedskonto (konstant 6,75%)
    return years.map((year) => ({
      year,
      rate: SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT[
        year.toString() as keyof typeof SPECIAL_ALLOWANCE_RATES.HOURLY_FREEDOM_ACCOUNT
      ],
    }));
  } else if (useSpecialSavings) {
    // Opsparing (progression)
    return years.map((year) => ({
      year,
      rate: SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION[
        year.toString() as keyof typeof SPECIAL_ALLOWANCE_RATES.SAVINGS_OPTION
      ],
    }));
  } else {
    // Tillæg (progression)
    return years.map((year) => ({
      year,
      rate: SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE[
        year.toString() as keyof typeof SPECIAL_ALLOWANCE_RATES.SALARIED_ALLOWANCE
      ],
    }));
  }
}
