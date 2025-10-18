import bcrypt from 'bcryptjs';
import prisma from './config/database';
import { logger } from './config/logger';

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@lonberegning.dk' },
      update: {},
      create: {
        email: 'admin@lonberegning.dk',
        passwordHash: adminPasswordHash,
        name: 'Admin Bruger',
        role: 'ADMIN',
        isActive: true,
      },
    });
    logger.info(`Admin user created: ${adminUser.email}`);

    // Create payroll manager user
    const managerPasswordHash = await bcrypt.hash('manager123', 10);
    const managerUser = await prisma.user.upsert({
      where: { email: 'manager@lonberegning.dk' },
      update: {},
      create: {
        email: 'manager@lonberegning.dk',
        passwordHash: managerPasswordHash,
        name: 'Løn Manager',
        role: 'PAYROLL_MANAGER',
        isActive: true,
      },
    });
    logger.info(`Manager user created: ${managerUser.email}`);

    // Create employee users
    const employee1PasswordHash = await bcrypt.hash('employee123', 10);
    const employee1User = await prisma.user.upsert({
      where: { email: 'medarbejder1@lonberegning.dk' },
      update: {},
      create: {
        email: 'medarbejder1@lonberegning.dk',
        passwordHash: employee1PasswordHash,
        name: 'Peter Jensen',
        role: 'EMPLOYEE',
        isActive: true,
      },
    });
    logger.info(`Employee user 1 created: ${employee1User.email}`);

    const employee2PasswordHash = await bcrypt.hash('employee123', 10);
    const employee2User = await prisma.user.upsert({
      where: { email: 'medarbejder2@lonberegning.dk' },
      update: {},
      create: {
        email: 'medarbejder2@lonberegning.dk',
        passwordHash: employee2PasswordHash,
        name: 'Maria Nielsen',
        role: 'EMPLOYEE',
        isActive: true,
      },
    });
    logger.info(`Employee user 2 created: ${employee2User.email}`);

    const employee3PasswordHash = await bcrypt.hash('employee123', 10);
    const employee3User = await prisma.user.upsert({
      where: { email: 'medarbejder3@lonberegning.dk' },
      update: {},
      create: {
        email: 'medarbejder3@lonberegning.dk',
        passwordHash: employee3PasswordHash,
        name: 'Lars Andersen',
        role: 'EMPLOYEE',
        isActive: true,
      },
    });
    logger.info(`Employee user 3 created: ${employee3User.email}`);

    // Create agreements
    const driverAgreement = await prisma.agreement.upsert({
      where: { id: 'driver-agreement-2024' },
      update: {},
      create: {
        id: 'driver-agreement-2024',
        name: 'Chaufføroverenskomst 2024',
        type: 'DRIVER_AGREEMENT',
        validFrom: new Date('2024-03-01'),
        validTo: null,
        baseHourlyRate: 165.50,
        weeklyHours: 37,
        overtime1to3Rate: 182.05, // 110% af grundløn
        overtimeAbove3Rate: 198.60, // 120% af grundløn
        shiftedTimeRate: 24.83, // 15% tillæg
        specialAllowancePercent: 9.0,
        pensionEmployerPercent: 9.0,
        pensionEmployeePercent: 3.0,
        weekendAllowancePercent: 50.0,
        holidayAllowancePercent: 12.5,
        vacationPercent: 12.5,
        vacationDaysPerYear: 25,
        isActive: true,
      },
    });
    logger.info(`Driver agreement created: ${driverAgreement.name}`);

    const warehouseAgreement = await prisma.agreement.upsert({
      where: { id: 'warehouse-agreement-2024' },
      update: {},
      create: {
        id: 'warehouse-agreement-2024',
        name: 'Lageroverenskomst 2024',
        type: 'WAREHOUSE_AGREEMENT',
        validFrom: new Date('2024-03-01'),
        validTo: null,
        baseHourlyRate: 155.00,
        weeklyHours: 37,
        overtime1to3Rate: 170.50,
        overtimeAbove3Rate: 186.00,
        shiftedTimeRate: 23.25,
        specialAllowancePercent: 8.5,
        pensionEmployerPercent: 8.0,
        pensionEmployeePercent: 3.0,
        weekendAllowancePercent: 50.0,
        holidayAllowancePercent: 12.5,
        vacationPercent: 12.5,
        vacationDaysPerYear: 25,
        isActive: true,
      },
    });
    logger.info(`Warehouse agreement created: ${warehouseAgreement.name}`);

    const moverAgreement = await prisma.agreement.upsert({
      where: { id: 'mover-agreement-2024' },
      update: {},
      create: {
        id: 'mover-agreement-2024',
        name: 'Flytteoverenskomst 2024',
        type: 'MOVER_AGREEMENT',
        validFrom: new Date('2024-03-01'),
        validTo: null,
        baseHourlyRate: 160.00,
        weeklyHours: 37,
        overtime1to3Rate: 176.00,
        overtimeAbove3Rate: 192.00,
        shiftedTimeRate: 24.00,
        specialAllowancePercent: 8.0,
        pensionEmployerPercent: 8.5,
        pensionEmployeePercent: 3.0,
        weekendAllowancePercent: 50.0,
        holidayAllowancePercent: 12.5,
        vacationPercent: 12.5,
        vacationDaysPerYear: 25,
        isActive: true,
      },
    });
    logger.info(`Mover agreement created: ${moverAgreement.name}`);

    // Create employee records
    const employee1 = await prisma.employee.upsert({
      where: { userId: employee1User.id },
      update: {},
      create: {
        userId: employee1User.id,
        cprNumber: '010190-1234',
        employeeNumber: 'EMP001',
        jobCategory: 'DRIVER',
        agreementType: 'DRIVER_AGREEMENT',
        employmentDate: new Date('2020-01-15'),
        anciennity: 4,
        workTimeType: 'HOURLY',
        baseSalary: 165.50,
        department: 'Distribution',
        location: 'København',
      },
    });
    logger.info(`Employee record created: ${employee1.employeeNumber}`);

    const employee2 = await prisma.employee.upsert({
      where: { userId: employee2User.id },
      update: {},
      create: {
        userId: employee2User.id,
        cprNumber: '150285-5678',
        employeeNumber: 'EMP002',
        jobCategory: 'WAREHOUSE',
        agreementType: 'WAREHOUSE_AGREEMENT',
        employmentDate: new Date('2019-06-01'),
        anciennity: 5,
        workTimeType: 'HOURLY',
        baseSalary: 155.00,
        department: 'Lager',
        location: 'Aarhus',
      },
    });
    logger.info(`Employee record created: ${employee2.employeeNumber}`);

    const employee3 = await prisma.employee.upsert({
      where: { userId: employee3User.id },
      update: {},
      create: {
        userId: employee3User.id,
        cprNumber: '230378-9012',
        employeeNumber: 'EMP003',
        jobCategory: 'MOVER',
        agreementType: 'MOVER_AGREEMENT',
        employmentDate: new Date('2021-03-10'),
        anciennity: 3,
        workTimeType: 'HOURLY',
        baseSalary: 160.00,
        department: 'Flytning',
        location: 'Odense',
      },
    });
    logger.info(`Employee record created: ${employee3.employeeNumber}`);

    // Create some time entries for employee1 (last week)
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - today.getDay() - 6);

    for (let i = 0; i < 5; i++) {
      const date = new Date(lastMonday);
      date.setDate(lastMonday.getDate() + i);

      const startTime = new Date(date);
      startTime.setHours(8, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(16, 30, 0, 0);

      await prisma.timeEntry.create({
        data: {
          employeeId: employee1.id,
          date: date,
          startTime: startTime,
          endTime: endTime,
          breakDuration: 30,
          location: 'København',
          route: `Rute ${i + 1}`,
          taskType: 'DISTRIBUTION',
          isIrregularHours: false,
          isNightWork: false,
          isWeekend: false,
          isHoliday: false,
          status: 'PENDING',
        },
      });
    }
    logger.info(`Created 5 time entries for ${employee1.employeeNumber}`);

    // Create some time entries for employee2 (last week, with overtime)
    for (let i = 0; i < 5; i++) {
      const date = new Date(lastMonday);
      date.setDate(lastMonday.getDate() + i);

      const startTime = new Date(date);
      startTime.setHours(7, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(i < 3 ? 17 : 18, 0, 0, 0);

      await prisma.timeEntry.create({
        data: {
          employeeId: employee2.id,
          date: date,
          startTime: startTime,
          endTime: endTime,
          breakDuration: 30,
          location: 'Aarhus Lager',
          route: null,
          taskType: 'LOADING',
          isIrregularHours: false,
          isNightWork: false,
          isWeekend: false,
          isHoliday: false,
          status: 'APPROVED',
        },
      });
    }
    logger.info(`Created 5 time entries for ${employee2.employeeNumber}`);

    // Create some time entries for employee3 (last week, with night work)
    for (let i = 0; i < 4; i++) {
      const date = new Date(lastMonday);
      date.setDate(lastMonday.getDate() + i);

      const startTime = new Date(date);
      startTime.setHours(6, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(15, 0, 0, 0);

      await prisma.timeEntry.create({
        data: {
          employeeId: employee3.id,
          date: date,
          startTime: startTime,
          endTime: endTime,
          breakDuration: 30,
          location: 'Odense',
          route: null,
          taskType: 'MOVING',
          isIrregularHours: true,
          isNightWork: i === 0 || i === 2, // Some days with night work
          isWeekend: false,
          isHoliday: false,
          status: 'APPROVED',
        },
      });
    }
    logger.info(`Created 4 time entries for ${employee3.employeeNumber}`);

    logger.info('Database seed completed successfully!');
    logger.info('');
    logger.info('Test login credentials:');
    logger.info('Admin: admin@lonberegning.dk / admin123');
    logger.info('Manager: manager@lonberegning.dk / manager123');
    logger.info('Employee: medarbejder1@lonberegning.dk / employee123');
    logger.info('');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
