import { PayrollCalculation } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { parse } from 'json2csv';

interface DanlonExportLine {
  employeeNumber: string;
  cprNumber: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  payCode: string;
  payDescription: string;
  hours: string;
  rate: string;
  amount: string;
}

export class DanlonExportService {
  /**
   * Export payroll to Danløn CSV format
   * Danløn typically uses a CSV file with specific columns for import
   */
  async exportPayroll(payrollId: string): Promise<string> {
    try {
      // Fetch payroll with all related data
      const payroll = await prisma.payrollCalculation.findUnique({
        where: { id: payrollId },
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          components: true,
        },
      });

      if (!payroll) {
        throw new Error('Lønberegning ikke fundet');
      }

      if (payroll.status !== 'APPROVED') {
        throw new Error('Kun godkendte lønberegninger kan eksporteres');
      }

      // Create CSV lines from payroll components
      const csvLines: DanlonExportLine[] = this.createCsvLines(payroll);

      // Convert to CSV
      const csv = this.convertToCSV(csvLines);

      // Update payroll status
      await prisma.payrollCalculation.update({
        where: { id: payrollId },
        data: {
          status: 'EXPORTED',
          exportedAt: new Date(),
          exportedTo: 'Danløn',
        },
      });

      logger.info(`Payroll ${payrollId} exported to Danløn CSV successfully`);

      return csv;
    } catch (error) {
      logger.error('Error exporting payroll to Danløn:', error);
      throw error;
    }
  }

  private createCsvLines(payroll: any): DanlonExportLine[] {
    const lines: DanlonExportLine[] = [];
    const periodStart = this.formatDate(payroll.periodStart);
    const periodEnd = this.formatDate(payroll.periodEnd);
    const employeeNumber = payroll.employee.employeeNumber;
    const cprNumber = payroll.employee.cprNumber || '';
    const name = payroll.employee.user.name;

    // Add each payroll component as a line
    if (payroll.components && payroll.components.length > 0) {
      payroll.components.forEach((component: any) => {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: this.getPayCode(component.componentType),
          payDescription: component.description,
          hours: component.hours ? Number(component.hours).toFixed(2) : '0.00',
          rate: Number(component.rate).toFixed(2),
          amount: Number(component.amount).toFixed(2),
        });
      });
    } else {
      // If no components, create summary lines
      if (Number(payroll.baseSalary) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '100',
          payDescription: 'Grundløn',
          hours: Number(payroll.regularHours).toFixed(2),
          rate: (Number(payroll.baseSalary) / Number(payroll.regularHours)).toFixed(2),
          amount: Number(payroll.baseSalary).toFixed(2),
        });
      }

      if (Number(payroll.overtimePay) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '110',
          payDescription: 'Overarbejde',
          hours: Number(payroll.overtimeHours).toFixed(2),
          rate: '0.00',
          amount: Number(payroll.overtimePay).toFixed(2),
        });
      }

      if (Number(payroll.nightAllowance) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '120',
          payDescription: 'Natarbejdstillæg',
          hours: Number(payroll.nightHours).toFixed(2),
          rate: '0.00',
          amount: Number(payroll.nightAllowance).toFixed(2),
        });
      }

      if (Number(payroll.weekendAllowance) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '130',
          payDescription: 'Weekend/helligdagstillæg',
          hours: Number(payroll.weekendHours).toFixed(2),
          rate: '0.00',
          amount: Number(payroll.weekendAllowance).toFixed(2),
        });
      }

      if (Number(payroll.specialAllowance) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '140',
          payDescription: 'Særligt tillæg',
          hours: '0.00',
          rate: '0.00',
          amount: Number(payroll.specialAllowance).toFixed(2),
        });
      }

      if (Number(payroll.pensionEmployer) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '200',
          payDescription: 'Pension arbejdsgiver',
          hours: '0.00',
          rate: '0.00',
          amount: Number(payroll.pensionEmployer).toFixed(2),
        });
      }

      if (Number(payroll.pensionEmployee) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '201',
          payDescription: 'Pension medarbejder (fradrag)',
          hours: '0.00',
          rate: '0.00',
          amount: (-Number(payroll.pensionEmployee)).toFixed(2),
        });
      }

      if (Number(payroll.vacation) > 0) {
        lines.push({
          employeeNumber,
          cprNumber,
          name,
          periodStart,
          periodEnd,
          payCode: '300',
          payDescription: 'Feriepenge',
          hours: '0.00',
          rate: '0.00',
          amount: Number(payroll.vacation).toFixed(2),
        });
      }
    }

    return lines;
  }

  private getPayCode(componentType: string): string {
    const payCodeMap: Record<string, string> = {
      BASE_SALARY: '100',
      OVERTIME: '110',
      NIGHT_ALLOWANCE: '120',
      WEEKEND_ALLOWANCE: '130',
      HOLIDAY_ALLOWANCE: '131',
      SHIFTED_TIME: '132',
      SPECIAL_ALLOWANCE: '140',
      DRIVER_ALLOWANCE: '141',
      WAREHOUSE_ALLOWANCE: '142',
      MOVER_ALLOWANCE: '143',
      SHIFT_ALLOWANCE: '144',
      PENSION_EMPLOYER: '200',
      PENSION_EMPLOYEE: '201',
      VACATION: '300',
      SPECIAL_SAVINGS: '310',
    };

    return payCodeMap[componentType] || '999';
  }

  private convertToCSV(lines: DanlonExportLine[]): string {
    try {
      const fields = [
        { label: 'Medarbejder Nr.', value: 'employeeNumber' },
        { label: 'CPR Nr.', value: 'cprNumber' },
        { label: 'Navn', value: 'name' },
        { label: 'Periode Start', value: 'periodStart' },
        { label: 'Periode Slut', value: 'periodEnd' },
        { label: 'Lønart', value: 'payCode' },
        { label: 'Beskrivelse', value: 'payDescription' },
        { label: 'Timer', value: 'hours' },
        { label: 'Sats', value: 'rate' },
        { label: 'Beløb', value: 'amount' },
      ];

      const csv = parse(lines, { fields, delimiter: ';', withBOM: true });
      return csv;
    } catch (error) {
      logger.error('Error converting to CSV:', error);
      throw new Error('Fejl ved konvertering til CSV');
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  /**
   * Export multiple payrolls to a single CSV file
   */
  async exportMultiplePayrolls(payrollIds: string[]): Promise<string> {
    try {
      const allLines: DanlonExportLine[] = [];

      for (const payrollId of payrollIds) {
        const payroll = await prisma.payrollCalculation.findUnique({
          where: { id: payrollId },
          include: {
            employee: {
              include: {
                user: true,
              },
            },
            components: true,
          },
        });

        if (payroll && payroll.status === 'APPROVED') {
          const lines = this.createCsvLines(payroll);
          allLines.push(...lines);

          // Update status
          await prisma.payrollCalculation.update({
            where: { id: payrollId },
            data: {
              status: 'EXPORTED',
              exportedAt: new Date(),
              exportedTo: 'Danløn',
            },
          });
        }
      }

      const csv = this.convertToCSV(allLines);
      logger.info(`Exported ${payrollIds.length} payrolls to Danløn CSV successfully`);

      return csv;
    } catch (error) {
      logger.error('Error exporting multiple payrolls to Danløn:', error);
      throw error;
    }
  }
}

export default new DanlonExportService();
