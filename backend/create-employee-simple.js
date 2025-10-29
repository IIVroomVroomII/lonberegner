const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Finding user 1001...');
    const user = await prisma.user.findUnique({
      where: { employeeNumber: '1001' },
      include: { employee: true }
    });

    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('User found:', user.name);

    if (user.employee) {
      console.log('Employee record already exists:', user.employee.id);
      await prisma.$disconnect();
      return;
    }

    console.log('Creating employee record...');
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

    console.log('Employee created! ID:', employee.id);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
