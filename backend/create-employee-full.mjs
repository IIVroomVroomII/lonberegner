import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestEmployeeWithEmployee() {
  try {
    console.log('🔍 Søger efter test user...');

    // Find test user
    const user = await prisma.user.findUnique({
      where: { employeeNumber: '1001' },
      include: { employee: true }
    });

    if (!user) {
      console.log('❌ Test user ikke fundet. Kør først create-test-employee.mjs');
      process.exit(1);
    }

    console.log('✅ Test user fundet:', user.name);

    // Check if employee record already exists
    if (user.employee) {
      console.log('ℹ️  Employee record findes allerede:', user.employee.id);
      console.log('   Employee ID:', user.employee.id);
      console.log('   Job Category:', user.employee.jobCategory);
      await prisma.$disconnect();
      return;
    }

    // Create employee record
    console.log('📝 Opretter Employee record...');

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeNumber: '1001',
        jobCategory: 'DRIVER',
        agreementType: '3F',
        employmentDate: new Date('2024-01-01'),
        workTimeType: 'FULL_TIME',
        baseSalary: 25000,
        department: 'Transport',
        location: 'København',
      }
    });

    console.log('✅ Employee record oprettet!');
    console.log('   Employee ID:', employee.id);
    console.log('   User ID:', employee.userId);
    console.log('   Medarbejdernr:', employee.employeeNumber);
    console.log('   Job Category:', employee.jobCategory);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Fejl:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestEmployeeWithEmployee();
