import { PayrollCalculation } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../config/logger';
import axios from 'axios';

interface EconomicJournalLine {
  account: {
    accountNumber: number;
  };
  amount: number;
  contraAccount?: {
    accountNumber: number;
  };
  currency: {
    code: string;
  };
  date: string;
  text: string;
  departmentalDistribution?: {
    departmentNumber: number;
    amount: number;
  };
}

interface EconomicJournalEntry {
  journal: {
    journalNumber: number;
  };
  entries: {
    financeVouchers: Array<{
      lines: EconomicJournalLine[];
      voucherNumber: number;
      date: string;
      text: string;
    }>;
  };
}

export class EconomicExportService {
  private apiEndpoint: string | null = null;
  private apiKey: string | null = null;
  private appSecretToken: string | null = null;
  private agreementGrantToken: string | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const config = await prisma.integrationConfig.findFirst({
        where: {
          type: 'ECONOMIC',
          isActive: true,
        },
      });

      if (config) {
        this.apiEndpoint = config.apiEndpoint || 'https://restapi.e-conomic.com';
        const configData = config.config as any;
        this.appSecretToken = configData.appSecretToken || null;
        this.agreementGrantToken = configData.agreementGrantToken || null;
      }
    } catch (error) {
      logger.error('Failed to load e-conomic config:', error);
    }
  }

  async exportPayroll(payrollId: string): Promise<void> {
    try {
      // Reload config in case it changed
      await this.loadConfig();

      if (!this.apiEndpoint || !this.appSecretToken || !this.agreementGrantToken) {
        throw new Error('e-conomic integration ikke konfigureret korrekt');
      }

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

      // Create journal entry for e-conomic
      const journalEntry = this.createJournalEntry(payroll);

      // Send to e-conomic API
      await this.sendToEconomic(journalEntry);

      // Update payroll status
      await prisma.payrollCalculation.update({
        where: { id: payrollId },
        data: {
          status: 'EXPORTED',
          exportedAt: new Date(),
          exportedTo: 'e-conomic',
        },
      });

      logger.info(`Payroll ${payrollId} exported to e-conomic successfully`);
    } catch (error) {
      logger.error('Error exporting payroll to e-conomic:', error);
      throw error;
    }
  }

  private createJournalEntry(payroll: any): EconomicJournalEntry {
    const lines: EconomicJournalLine[] = [];
    const date = new Date(payroll.periodEnd).toISOString().split('T')[0];
    const employeeName = payroll.employee.user.name;

    // Løn konto (debit)
    lines.push({
      account: { accountNumber: 6010 }, // Lønninger - should be configurable
      amount: Number(payroll.totalGrossPay),
      currency: { code: 'DKK' },
      date,
      text: `Løn - ${employeeName}`,
    });

    // Pension arbejdsgiver (debit)
    if (Number(payroll.pensionEmployer) > 0) {
      lines.push({
        account: { accountNumber: 6020 }, // Pension arbejdsgiver - should be configurable
        amount: Number(payroll.pensionEmployer),
        currency: { code: 'DKK' },
        date,
        text: `Pension (arbejdsgiver) - ${employeeName}`,
      });
    }

    // Feriepenge (debit)
    if (Number(payroll.vacation) > 0) {
      lines.push({
        account: { accountNumber: 6030 }, // Feriepenge - should be configurable
        amount: Number(payroll.vacation),
        currency: { code: 'DKK' },
        date,
        text: `Feriepenge - ${employeeName}`,
      });
    }

    // Pension medarbejder (credit - liability)
    if (Number(payroll.pensionEmployee) > 0) {
      lines.push({
        account: { accountNumber: 2720 }, // Skyldig pension - should be configurable
        amount: -Number(payroll.pensionEmployee),
        currency: { code: 'DKK' },
        date,
        text: `Pension (medarbejder) - ${employeeName}`,
      });
    }

    // Løn til udbetaling (credit - liability)
    const netPay = Number(payroll.totalGrossPay) - Number(payroll.pensionEmployee);
    lines.push({
      account: { accountNumber: 2710 }, // Skyldig løn - should be configurable
      amount: -netPay,
      currency: { code: 'DKK' },
      date,
      text: `Skyldig løn - ${employeeName}`,
    });

    return {
      journal: {
        journalNumber: 1, // Should be configurable
      },
      entries: {
        financeVouchers: [
          {
            lines,
            voucherNumber: 0, // e-conomic will auto-generate
            date,
            text: `Lønberegning ${payroll.periodStart.toISOString().split('T')[0]} - ${payroll.periodEnd.toISOString().split('T')[0]}`,
          },
        ],
      },
    };
  }

  private async sendToEconomic(journalEntry: EconomicJournalEntry): Promise<void> {
    try {
      const response = await axios.post(
        `${this.apiEndpoint}/journals/${journalEntry.journal.journalNumber}/vouchers`,
        journalEntry.entries,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-AppSecretToken': this.appSecretToken,
            'X-AgreementGrantToken': this.agreementGrantToken,
          },
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`e-conomic API returnerede status ${response.status}`);
      }

      logger.info('Successfully sent journal entry to e-conomic');
    } catch (error: any) {
      logger.error('Error sending data to e-conomic:', error.response?.data || error.message);
      throw new Error(
        `Fejl ved afsendelse til e-conomic: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.apiEndpoint || !this.appSecretToken || !this.agreementGrantToken) {
        return false;
      }

      const response = await axios.get(`${this.apiEndpoint}/self`, {
        headers: {
          'X-AppSecretToken': this.appSecretToken,
          'X-AgreementGrantToken': this.agreementGrantToken,
        },
      });

      return response.status === 200;
    } catch (error) {
      logger.error('e-conomic connection test failed:', error);
      return false;
    }
  }
}

export default new EconomicExportService();
