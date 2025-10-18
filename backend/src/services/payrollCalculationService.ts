import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ComponentType, PayrollStatus, TimeEntry, Employee, Agreement } from '@prisma/client';
import { logger } from '../config/logger';
import { calculateAllowances, calculateEffectiveHourlyWage } from './allowanceCalculationService';

interface CalculationResult {
  totalHours: Decimal;
  regularHours: Decimal;
  overtimeHours: Decimal;
  nightHours: Decimal;
  weekendHours: Decimal;
  baseSalary: Decimal;
  overtimePay: Decimal;
  nightAllowance: Decimal;
  weekendAllowance: Decimal;
  specialAllowance: Decimal;
  totalGrossPay: Decimal;
  pensionEmployer: Decimal;
  pensionEmployee: Decimal;
  vacation: Decimal;
  specialSavings: Decimal;
  components: Array<{
    componentType: ComponentType;
    description: string;
    hours?: Decimal;
    rate: Decimal;
    amount: Decimal;
    agreementReference?: string;
  }>;
}

export class PayrollCalculationService {
  /**
   * Beregner løn for en medarbejder i en given periode
   * Baseret på overenskomst regler (§ 4, § 6, § 7, § 8, § 9, § 11, § 12-13)
   */
  async calculatePayroll(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CalculationResult> {
    // Hent medarbejder data
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) {
      throw new Error('Medarbejder ikke fundet');
    }

    // Hent gældende overenskomst
    const agreement = await this.getActiveAgreement(employee.agreementType);

    if (!agreement) {
      throw new Error('Ingen aktiv overenskomst fundet');
    }

    // Hent alle godkendte tidsregistreringer for perioden
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'APPROVED',
      },
      orderBy: { date: 'asc' },
    });

    logger.info(`Beregner løn for ${employee.user.name} - ${timeEntries.length} tidsregistreringer`);

    // § 2 Løn - Beregn tillæg og effektiv timeløn
    const allowanceBreakdown = calculateAllowances(employee);
    const effectiveHourlyWage = calculateEffectiveHourlyWage(employee);

    logger.info('Allowances calculated', {
      employeeId: employee.id,
      baseSalary: Number(employee.baseSalary),
      effectiveHourlyWage,
      allowances: allowanceBreakdown,
    });

    // Initialiser beregning
    const result: CalculationResult = {
      totalHours: new Decimal(0),
      regularHours: new Decimal(0),
      overtimeHours: new Decimal(0),
      nightHours: new Decimal(0),
      weekendHours: new Decimal(0),
      baseSalary: new Decimal(0),
      overtimePay: new Decimal(0),
      nightAllowance: new Decimal(0),
      weekendAllowance: new Decimal(0),
      specialAllowance: new Decimal(0),
      totalGrossPay: new Decimal(0),
      pensionEmployer: new Decimal(0),
      pensionEmployee: new Decimal(0),
      vacation: new Decimal(0),
      specialSavings: new Decimal(0),
      components: [],
    };

    // Beregn for hver dag
    const dailyHours = this.groupByDate(timeEntries);

    for (const [date, entries] of Object.entries(dailyHours)) {
      const dayResult = this.calculateDay(entries, agreement, employee, effectiveHourlyWage);
      this.mergeResults(result, dayResult);
    }

    // § 6 Grundløn - beregn baseret på regularHours (med ungarbejder procentdel hvis relevant)
    const baseHourlyRate = employee.baseSalary;
    const effectiveBaseRate = new Decimal(
      Number(baseHourlyRate) * allowanceBreakdown.youthWorkerPercentage
    );

    result.baseSalary = result.regularHours.mul(effectiveBaseRate);
    result.components.push({
      componentType: 'BASE_SALARY',
      description: allowanceBreakdown.youthWorkerPercentage < 1.0
        ? `Grundløn (ungarbejder ${(allowanceBreakdown.youthWorkerPercentage * 100).toFixed(0)}%)`
        : 'Grundløn',
      hours: result.regularHours,
      rate: effectiveBaseRate,
      amount: result.baseSalary,
      agreementReference: '§ 6 Løn',
    });

    // § 2 Tillæg - Tilføj alle individuelle tillæg som komponenter
    if (allowanceBreakdown.driverAllowance > 0) {
      const driverAllowanceAmount = result.regularHours.mul(allowanceBreakdown.driverAllowance);
      result.baseSalary = result.baseSalary.add(driverAllowanceAmount);
      result.components.push({
        componentType: 'DRIVER_ALLOWANCE',
        description: 'Chaufførtillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.driverAllowance),
        amount: driverAllowanceAmount,
        agreementReference: '§ 2 Løn - Chaufførtillæg',
      });
    }

    if (allowanceBreakdown.warehouseAllowance > 0) {
      const warehouseAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.warehouseAllowance
      );
      result.baseSalary = result.baseSalary.add(warehouseAllowanceAmount);
      result.components.push({
        componentType: 'WAREHOUSE_ALLOWANCE',
        description: 'Lager/Terminaltillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.warehouseAllowance),
        amount: warehouseAllowanceAmount,
        agreementReference: '§ 2 Løn - Lager/Terminaltillæg',
      });
    }

    if (allowanceBreakdown.moverAllowance > 0) {
      const moverAllowanceAmount = result.regularHours.mul(allowanceBreakdown.moverAllowance);
      result.baseSalary = result.baseSalary.add(moverAllowanceAmount);
      result.components.push({
        componentType: 'MOVER_ALLOWANCE',
        description: 'Flyttetillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.moverAllowance),
        amount: moverAllowanceAmount,
        agreementReference: '§ 2 Løn - Flyttetillæg',
      });
    }

    if (allowanceBreakdown.renovationAllowance > 0) {
      const renovationAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.renovationAllowance
      );
      result.baseSalary = result.baseSalary.add(renovationAllowanceAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: 'Renovationstillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.renovationAllowance),
        amount: renovationAllowanceAmount,
        agreementReference: '§ 2 Løn - Renovationstillæg',
      });
    }

    if (allowanceBreakdown.vocationalDegreeAllowance > 0) {
      const vocationalAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.vocationalDegreeAllowance
      );
      result.baseSalary = result.baseSalary.add(vocationalAllowanceAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: 'Faglært tillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.vocationalDegreeAllowance),
        amount: vocationalAllowanceAmount,
        agreementReference: '§ 6 stk. 4 Faglært tillæg',
      });
    }

    if (allowanceBreakdown.seniorityAllowance > 0) {
      const seniorityAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.seniorityAllowance
      );
      result.baseSalary = result.baseSalary.add(seniorityAllowanceAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: `Anciennitetstillæg (${employee.anciennity} mdr)`,
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.seniorityAllowance),
        amount: seniorityAllowanceAmount,
        agreementReference: '§ 6 stk. 4 Anciennitetstillæg',
      });
    }

    if (allowanceBreakdown.certificateAllowances.adr > 0) {
      const adrAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.certificateAllowances.adr
      );
      result.baseSalary = result.baseSalary.add(adrAllowanceAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: 'ADR certifikat tillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.certificateAllowances.adr),
        amount: adrAllowanceAmount,
        agreementReference: '§ 2 Løn - ADR tillæg',
      });
    }

    if (allowanceBreakdown.certificateAllowances.forklift > 0) {
      const forkliftAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.certificateAllowances.forklift
      );
      result.baseSalary = result.baseSalary.add(forkliftAllowanceAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: 'Gaffeltruckcertifikat tillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.certificateAllowances.forklift),
        amount: forkliftAllowanceAmount,
        agreementReference: '§ 2 Løn - Gaffeltruck tillæg',
      });
    }

    if (allowanceBreakdown.certificateAllowances.crane > 0) {
      const craneAllowanceAmount = result.regularHours.mul(
        allowanceBreakdown.certificateAllowances.crane
      );
      result.baseSalary = result.baseSalary.add(craneAllowanceAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: 'Krancertifikat tillæg',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.certificateAllowances.crane),
        amount: craneAllowanceAmount,
        agreementReference: '§ 2 Løn - Kran tillæg',
      });
    }

    if (allowanceBreakdown.localSalaryAllowance > 0) {
      const localSalaryAmount = result.regularHours.mul(allowanceBreakdown.localSalaryAllowance);
      result.baseSalary = result.baseSalary.add(localSalaryAmount);
      result.components.push({
        componentType: 'SPECIAL_ALLOWANCE',
        description: 'Lokalløn',
        hours: result.regularHours,
        rate: new Decimal(allowanceBreakdown.localSalaryAllowance),
        amount: localSalaryAmount,
        agreementReference: '§ 6 stk. 3 Lokalløn',
      });
    }

    // § 8 Særligt løntillæg (beregnes af ferieberettiget løn)
    const vacationEligiblePay = result.baseSalary.add(result.overtimePay);
    result.specialAllowance = vacationEligiblePay
      .mul(agreement.specialAllowancePercent)
      .div(100);
    result.components.push({
      componentType: 'SPECIAL_ALLOWANCE',
      description: 'Særligt tillæg',
      rate: agreement.specialAllowancePercent,
      amount: result.specialAllowance,
      agreementReference: '§ 8 Særligt løntillæg',
    });

    // § 9 Pension
    const pensionBase = result.baseSalary.add(result.overtimePay);
    result.pensionEmployer = pensionBase
      .mul(agreement.pensionEmployerPercent)
      .div(100);
    result.pensionEmployee = pensionBase
      .mul(agreement.pensionEmployeePercent)
      .div(100);

    result.components.push({
      componentType: 'PENSION_EMPLOYER',
      description: 'Pension arbejdsgiver',
      rate: agreement.pensionEmployerPercent,
      amount: result.pensionEmployer,
      agreementReference: '§ 9 Pension',
    });

    result.components.push({
      componentType: 'PENSION_EMPLOYEE',
      description: 'Pension medarbejder',
      rate: agreement.pensionEmployeePercent,
      amount: result.pensionEmployee,
      agreementReference: '§ 9 Pension',
    });

    // § 12-13 Ferie
    result.vacation = vacationEligiblePay
      .mul(agreement.vacationPercent)
      .div(100);
    result.components.push({
      componentType: 'VACATION',
      description: 'Feriepenge',
      rate: agreement.vacationPercent,
      amount: result.vacation,
      agreementReference: '§ 12-13 Ferie',
    });

    // Total bruttoløn
    result.totalGrossPay = result.baseSalary
      .add(result.overtimePay)
      .add(result.nightAllowance)
      .add(result.weekendAllowance)
      .add(result.specialAllowance);

    return result;
  }

  /**
   * Beregner løn for en enkelt dag
   */
  private calculateDay(
    entries: TimeEntry[],
    agreement: Agreement,
    employee: Employee,
    effectiveHourlyWage?: number
  ): Partial<CalculationResult> {
    const result: Partial<CalculationResult> = {
      totalHours: new Decimal(0),
      regularHours: new Decimal(0),
      overtimeHours: new Decimal(0),
      nightHours: new Decimal(0),
      weekendHours: new Decimal(0),
      overtimePay: new Decimal(0),
      nightAllowance: new Decimal(0),
      weekendAllowance: new Decimal(0),
      components: [],
    };

    for (const entry of entries) {
      const hours = this.calculateHours(entry);
      result.totalHours = (result.totalHours || new Decimal(0)).add(hours);

      // Check for special conditions
      const isNight = entry.isNightWork;
      const isWeekend = entry.isWeekend;
      const isHoliday = entry.isHoliday;

      // § 4 stk. 5 Forskudt tid / natarbejde
      if (isNight) {
        result.nightHours = (result.nightHours || new Decimal(0)).add(hours);
        const nightPay = hours.mul(agreement.shiftedTimeRate);
        result.nightAllowance = (result.nightAllowance || new Decimal(0)).add(nightPay);

        result.components!.push({
          componentType: 'NIGHT_ALLOWANCE',
          description: 'Nattillæg',
          hours,
          rate: agreement.shiftedTimeRate,
          amount: nightPay,
          agreementReference: '§ 4 stk. 5 Forskudt tid',
        });
      }

      // § 11 Weekend- og helligdagstillæg
      if (isWeekend || isHoliday) {
        result.weekendHours = (result.weekendHours || new Decimal(0)).add(hours);
        // Brug effektiv timeløn (med tillæg) for weekend beregning
        const hourlyRate = effectiveHourlyWage
          ? new Decimal(effectiveHourlyWage)
          : employee.baseSalary;
        const allowancePercent = isHoliday
          ? agreement.holidayAllowancePercent
          : agreement.weekendAllowancePercent;

        const weekendPay = hours.mul(hourlyRate).mul(allowancePercent).div(100);
        result.weekendAllowance = (result.weekendAllowance || new Decimal(0)).add(weekendPay);

        result.components!.push({
          componentType: isHoliday ? 'HOLIDAY_ALLOWANCE' : 'WEEKEND_ALLOWANCE',
          description: isHoliday ? 'Helligdagstillæg' : 'Weekendtillæg',
          hours,
          rate: allowancePercent,
          amount: weekendPay,
          agreementReference: '§ 11 Weekend- og helligdagstillæg',
        });
      }
    }

    // § 7 Overarbejde - beregn daglig
    const normalDailyHours = agreement.weeklyHours.div(5); // Typisk 7.4 timer
    const totalDailyHours = result.totalHours || new Decimal(0);

    if (totalDailyHours.gt(normalDailyHours)) {
      const overtimeHours = totalDailyHours.sub(normalDailyHours);
      result.overtimeHours = (result.overtimeHours || new Decimal(0)).add(overtimeHours);

      // 1-3 timer overarbejde
      const overtime1to3 = overtimeHours.gt(3) ? new Decimal(3) : overtimeHours;
      const overtime1to3Pay = overtime1to3.mul(agreement.overtime1to3Rate);

      result.overtimePay = (result.overtimePay || new Decimal(0)).add(overtime1to3Pay);
      result.components!.push({
        componentType: 'OVERTIME',
        description: 'Overarbejde (1-3 timer)',
        hours: overtime1to3,
        rate: agreement.overtime1to3Rate,
        amount: overtime1to3Pay,
        agreementReference: '§ 7 Overarbejde',
      });

      // 4+ timer overarbejde (højere sats)
      if (overtimeHours.gt(3)) {
        const overtimeAbove3 = overtimeHours.sub(3);
        const overtimeAbove3Pay = overtimeAbove3.mul(agreement.overtimeAbove3Rate);

        result.overtimePay = result.overtimePay.add(overtimeAbove3Pay);
        result.components!.push({
          componentType: 'OVERTIME',
          description: 'Overarbejde (4+ timer)',
          hours: overtimeAbove3,
          rate: agreement.overtimeAbove3Rate,
          amount: overtimeAbove3Pay,
          agreementReference: '§ 7 Overarbejde',
        });
      }

      result.regularHours = normalDailyHours;
    } else {
      result.regularHours = totalDailyHours;
    }

    return result;
  }

  /**
   * Beregner timer fra tidsregistrering
   */
  private calculateHours(entry: TimeEntry): Decimal {
    if (!entry.endTime) {
      return new Decimal(0);
    }

    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const workMinutes = totalMinutes - entry.breakDuration;
    return new Decimal(workMinutes / 60);
  }

  /**
   * Grupperer tidsregistreringer efter dato
   */
  private groupByDate(entries: TimeEntry[]): Record<string, TimeEntry[]> {
    return entries.reduce((acc, entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);
  }

  /**
   * Merger resultater fra flere dage
   */
  private mergeResults(target: CalculationResult, source: Partial<CalculationResult>) {
    target.totalHours = target.totalHours.add(source.totalHours || 0);
    target.regularHours = target.regularHours.add(source.regularHours || 0);
    target.overtimeHours = target.overtimeHours.add(source.overtimeHours || 0);
    target.nightHours = target.nightHours.add(source.nightHours || 0);
    target.weekendHours = target.weekendHours.add(source.weekendHours || 0);
    target.overtimePay = target.overtimePay.add(source.overtimePay || 0);
    target.nightAllowance = target.nightAllowance.add(source.nightAllowance || 0);
    target.weekendAllowance = target.weekendAllowance.add(source.weekendAllowance || 0);

    if (source.components) {
      target.components.push(...source.components);
    }
  }

  /**
   * Henter aktiv overenskomst for given type
   */
  private async getActiveAgreement(agreementType: string): Promise<Agreement | null> {
    return await prisma.agreement.findFirst({
      where: {
        type: agreementType as any,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
    });
  }

  /**
   * Gemmer lønberegning i databasen
   */
  async savePayrollCalculation(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    result: CalculationResult
  ): Promise<string> {
    const payroll = await prisma.payrollCalculation.create({
      data: {
        employeeId,
        periodStart,
        periodEnd,
        totalHours: result.totalHours,
        regularHours: result.regularHours,
        overtimeHours: result.overtimeHours,
        nightHours: result.nightHours,
        weekendHours: result.weekendHours,
        baseSalary: result.baseSalary,
        overtimePay: result.overtimePay,
        nightAllowance: result.nightAllowance,
        weekendAllowance: result.weekendAllowance,
        specialAllowance: result.specialAllowance,
        totalGrossPay: result.totalGrossPay,
        pensionEmployer: result.pensionEmployer,
        pensionEmployee: result.pensionEmployee,
        vacation: result.vacation,
        specialSavings: result.specialSavings,
        status: PayrollStatus.PENDING_REVIEW,
        components: {
          create: result.components.map(comp => ({
            componentType: comp.componentType,
            description: comp.description,
            hours: comp.hours,
            rate: comp.rate,
            amount: comp.amount,
            agreementReference: comp.agreementReference,
          })),
        },
      },
    });

    logger.info(`Lønberegning gemt: ${payroll.id}`);
    return payroll.id;
  }
}

export default new PayrollCalculationService();
