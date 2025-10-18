import { PayrollCalculationService } from '../../services/payrollCalculationService';
import { prismaMock } from '../setup';
import { Decimal } from '@prisma/client/runtime/library';
import { ComponentType, PayrollStatus } from '@prisma/client';

describe('PayrollCalculationService', () => {
  let service: PayrollCalculationService;

  beforeEach(() => {
    service = new PayrollCalculationService();
  });

  describe('calculatePayroll', () => {
    const mockEmployee = {
      id: 'emp-1',
      userId: 'user-1',
      cprNumber: '0101901234',
      employeeNumber: 'EMP001',
      jobCategory: 'DRIVER' as const,
      agreementType: 'DRIVER_AGREEMENT' as const,
      employmentDate: new Date('2024-01-01'),
      anciennity: 0,
      workTimeType: 'HOURLY' as const,
      baseSalary: new Decimal(150),
      department: null,
      location: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        email: 'test@test.dk',
        name: 'Test Medarbejder',
        passwordHash: 'hashed',
        role: 'EMPLOYEE' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const mockAgreement = {
      id: 'agreement-1',
      type: 'DRIVER_AGREEMENT' as const,
      name: 'Standard Overenskomst',
      validFrom: new Date('2024-01-01'),
      validTo: null,
      isActive: true,
      weeklyHours: new Decimal(37),
      baseHourlyRate: new Decimal(150),
      overtime1to3Rate: new Decimal(187.5), // 150 * 1.25
      overtimeAbove3Rate: new Decimal(225), // 150 * 1.5
      shiftedTimeRate: new Decimal(20), // Fast tillæg pr. time
      weekendAllowancePercent: new Decimal(50),
      holidayAllowancePercent: new Decimal(100),
      specialAllowancePercent: new Decimal(3.27),
      pensionEmployerPercent: new Decimal(8),
      pensionEmployeePercent: new Decimal(4),
      vacationPercent: new Decimal(12.5),
      vacationDaysPerYear: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('Grundløn beregning (§ 6)', () => {
      it('skal beregne korrekt grundløn for normale arbejdstimer', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // 8 timer - 0.5 time pause = 7.5 timer arbejdstid
        // Men normal dag er 37/5 = 7.4 timer, så 7.4 timer er regular hours
        expect(result.regularHours.toNumber()).toBe(7.4);
        // 7.4 timer * 150 kr/time = 1110 kr
        expect(result.baseSalary.toNumber()).toBe(1110);
        expect(result.totalHours.toNumber()).toBe(7.5);
      });

      it('skal håndtere flere dage korrekt', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'entry-2',
            employeeId: 'emp-1',
            date: new Date('2024-01-16'),
            startTime: new Date('2024-01-16T08:00:00'),
            endTime: new Date('2024-01-16T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // 2 dage * 7.4 timer = 14.8 timer
        expect(result.regularHours.toNumber()).toBe(14.8);
        // 14.8 timer * 150 kr/time = 2220 kr
        expect(result.baseSalary.toNumber()).toBe(2220);
      });
    });

    describe('Overarbejde beregning (§ 7)', () => {
      it('skal beregne 1-3 timer overarbejde korrekt', async () => {
        // Normal dag er 37/5 = 7.4 timer
        // Arbejder 9 timer = 1.6 timer overarbejde (1-3 timer kategori)
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T17:30:00'), // 9.5 timer med pause
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Normal arbejdstid: 7.4 timer
        expect(result.regularHours.toNumber()).toBe(7.4);
        // Overarbejde: 9 - 7.4 = 1.6 timer
        expect(result.overtimeHours.toNumber()).toBeCloseTo(1.6, 1);
        // Overarbejdsbetaling: 1.6 * 187.5 = 300 kr
        expect(result.overtimePay.toNumber()).toBeCloseTo(300, 0);
      });

      it('skal beregne 4+ timer overarbejde med højere sats', async () => {
        // Arbejder 12 timer = 4.6 timer overarbejde
        // 3 timer til 1-3 sats, 1.6 timer til 4+ sats
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T20:30:00'), // 12.5 timer med pause
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Overarbejde: 12 - 7.4 = 4.6 timer
        expect(result.overtimeHours.toNumber()).toBeCloseTo(4.6, 1);
        // 3 timer * 187.5 + 1.6 timer * 225 = 562.5 + 360 = 922.5 kr
        expect(result.overtimePay.toNumber()).toBeCloseTo(922.5, 0);
      });
    });

    describe('Natarbejde (§ 4 stk. 5)', () => {
      it('skal beregne nattillæg korrekt', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T22:00:00'),
            endTime: new Date('2024-01-16T06:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: true,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // 8 timer - 0.5 time pause = 7.5 timer natarbejde
        expect(result.nightHours.toNumber()).toBe(7.5);
        // Nattillæg: 7.5 * 20 = 150 kr
        expect(result.nightAllowance.toNumber()).toBe(150);
      });
    });

    describe('Weekend- og helligdagstillæg (§ 11)', () => {
      it('skal beregne weekendtillæg korrekt', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-20'), // Lørdag
            startTime: new Date('2024-01-20T08:00:00'),
            endTime: new Date('2024-01-20T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: true,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Weekend timer: 7.5 timer
        expect(result.weekendHours.toNumber()).toBe(7.5);
        // Weekendtillæg: 7.5 * 150 * 0.5 = 562.5 kr
        expect(result.weekendAllowance.toNumber()).toBe(562.5);
      });

      it('skal beregne helligdagstillæg korrekt (100% tillæg)', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-01'), // Nytårsdag
            startTime: new Date('2024-01-01T08:00:00'),
            endTime: new Date('2024-01-01T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: true,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Helligdag timer: 7.5 timer
        expect(result.weekendHours.toNumber()).toBe(7.5);
        // Helligdagstillæg: 7.5 * 150 * 1.0 = 1125 kr (100% tillæg)
        expect(result.weekendAllowance.toNumber()).toBe(1125);
      });
    });

    describe('Særligt løntillæg (§ 8)', () => {
      it('skal beregne særligt tillæg af ferieberettiget løn', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Ferieberettiget løn = grundløn + overarbejde = 1110 + 0 = 1110
        // Særligt tillæg: 1110 * 0.0327 = 36.297 kr + overarbejde tillæg
        expect(result.specialAllowance.toNumber()).toBeCloseTo(36.91, 1);
      });
    });

    describe('Pension (§ 9)', () => {
      it('skal beregne pension korrekt', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Pensionsgrundlag = grundløn + overarbejde = 1110 + 0.1 timer overarbejde
        // Arbejdsgiver pension: (1110 + 18.75) * 0.08 = 90.3 kr
        expect(result.pensionEmployer.toNumber()).toBeCloseTo(90.3, 1);
        // Medarbejder pension: (1110 + 18.75) * 0.04 = 45.15 kr
        expect(result.pensionEmployee.toNumber()).toBeCloseTo(45.15, 1);
      });
    });

    describe('Ferie (§ 12-13)', () => {
      it('skal beregne feriepenge korrekt', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Ferieberettiget løn = grundløn + overarbejde = 1110 + 18.75 = 1128.75
        // Feriepenge: 1128.75 * 0.125 = 141.09375 kr
        expect(result.vacation.toNumber()).toBeCloseTo(141.09, 1);
      });
    });

    describe('Samlet beregning', () => {
      it('skal beregne korrekt total bruttoløn med alle komponenter', async () => {
        const timeEntries = [
          // Normal dag
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          // Dag med overarbejde
          {
            id: 'entry-2',
            employeeId: 'emp-1',
            date: new Date('2024-01-16'),
            startTime: new Date('2024-01-16T08:00:00'),
            endTime: new Date('2024-01-16T18:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          // Weekend
          {
            id: 'entry-3',
            employeeId: 'emp-1',
            date: new Date('2024-01-20'),
            startTime: new Date('2024-01-20T08:00:00'),
            endTime: new Date('2024-01-20T14:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: true,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Verificer at totalGrossPay = baseSalary + overtimePay + nightAllowance + weekendAllowance + specialAllowance
        const expectedTotal = result.baseSalary
          .add(result.overtimePay)
          .add(result.nightAllowance)
          .add(result.weekendAllowance)
          .add(result.specialAllowance);

        expect(result.totalGrossPay.toNumber()).toBeCloseTo(expectedTotal.toNumber(), 2);
      });

      it('skal indeholde alle påkrævede komponenter med overenskomstreference', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Verificer at alle komponenter har §-referencer
        expect(result.components).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              componentType: 'BASE_SALARY',
              agreementReference: '§ 6 Løn',
            }),
            expect.objectContaining({
              componentType: 'SPECIAL_ALLOWANCE',
              agreementReference: '§ 8 Særligt løntillæg',
            }),
            expect.objectContaining({
              componentType: 'PENSION_EMPLOYER',
              agreementReference: '§ 9 Pension',
            }),
            expect.objectContaining({
              componentType: 'PENSION_EMPLOYEE',
              agreementReference: '§ 9 Pension',
            }),
            expect.objectContaining({
              componentType: 'VACATION',
              agreementReference: '§ 12-13 Ferie',
            }),
          ])
        );
      });
    });

    describe('Edge cases', () => {
      it('skal håndtere medarbejder ikke fundet', async () => {
        prismaMock.employee.findUnique.mockResolvedValue(null);

        await expect(
          service.calculatePayroll('invalid-id', new Date(), new Date())
        ).rejects.toThrow('Medarbejder ikke fundet');
      });

      it('skal håndtere ingen aktiv overenskomst', async () => {
        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(null);

        await expect(
          service.calculatePayroll('emp-1', new Date(), new Date())
        ).rejects.toThrow('Ingen aktiv overenskomst fundet');
      });

      it('skal håndtere ingen tidsregistreringer', async () => {
        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue([]);

        const result = await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        expect(result.totalHours.toNumber()).toBe(0);
        expect(result.totalGrossPay.toNumber()).toBe(0);
      });

      it('skal kun inkludere APPROVED tidsregistreringer', async () => {
        const timeEntries = [
          {
            id: 'entry-1',
            employeeId: 'emp-1',
            date: new Date('2024-01-15'),
            startTime: new Date('2024-01-15T08:00:00'),
            endTime: new Date('2024-01-15T16:00:00'),
            breakDuration: 30,
            status: 'APPROVED' as const,
            isNightWork: false,
            isWeekend: false,
            isHoliday: false,
            location: null,
            route: null,
            taskType: 'DRIVING' as const,
            isIrregularHours: false,
            comment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaMock.employee.findUnique.mockResolvedValue(mockEmployee);
        prismaMock.agreement.findFirst.mockResolvedValue(mockAgreement);
        prismaMock.timeEntry.findMany.mockResolvedValue(timeEntries);

        await service.calculatePayroll(
          'emp-1',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        // Verificer at kun APPROVED entries bliver hentet
        expect(prismaMock.timeEntry.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'APPROVED',
            }),
          })
        );
      });
    });
  });

  describe('savePayrollCalculation', () => {
    it('skal gemme lønberegning med alle komponenter', async () => {
      const mockCalculationResult = {
        totalHours: new Decimal(160),
        regularHours: new Decimal(148),
        overtimeHours: new Decimal(12),
        nightHours: new Decimal(0),
        weekendHours: new Decimal(0),
        baseSalary: new Decimal(22200),
        overtimePay: new Decimal(2250),
        nightAllowance: new Decimal(0),
        weekendAllowance: new Decimal(0),
        specialAllowance: new Decimal(798.92),
        totalGrossPay: new Decimal(25248.92),
        pensionEmployer: new Decimal(1956),
        pensionEmployee: new Decimal(978),
        vacation: new Decimal(3056.15),
        specialSavings: new Decimal(0),
        components: [
          {
            componentType: 'BASE_SALARY' as ComponentType,
            description: 'Grundløn',
            hours: new Decimal(148),
            rate: new Decimal(150),
            amount: new Decimal(22200),
            agreementReference: '§ 6 Løn',
          },
        ],
      };

      const mockPayrollId = 'payroll-123';
      prismaMock.payrollCalculation.create.mockResolvedValue({
        id: mockPayrollId,
        employeeId: 'emp-1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        ...mockCalculationResult,
        status: PayrollStatus.PENDING_REVIEW,
        exportedAt: null,
        exportedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const payrollId = await service.savePayrollCalculation(
        'emp-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        mockCalculationResult
      );

      expect(payrollId).toBe(mockPayrollId);
      expect(prismaMock.payrollCalculation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId: 'emp-1',
            status: PayrollStatus.PENDING_REVIEW,
            components: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  componentType: 'BASE_SALARY',
                  agreementReference: '§ 6 Løn',
                }),
              ]),
            }),
          }),
        })
      );
    });
  });
});
