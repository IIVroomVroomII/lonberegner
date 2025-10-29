import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestEmployee() {
  try {
    // Find første team
    let team = await prisma.team.findFirst();

    if (!team) {
      console.log('❌ Ingen team fundet. Opretter test team...');
      team = await prisma.team.create({
        data: {
          name: 'Test Firma',
          contactEmail: 'test@firma.dk',
          isActive: true
        }
      });
      console.log('✅ Test team oprettet');
    }

    // Hash PIN
    const pinHash = await bcrypt.hash('1234', 10);

    // Tjek om medarbejder allerede eksisterer
    const existing = await prisma.user.findUnique({
      where: { employeeNumber: '1001' }
    });

    let employee;
    if (existing) {
      // Opdater PIN
      employee = await prisma.user.update({
        where: { employeeNumber: '1001' },
        data: {
          pinHash: pinHash,
          updatedAt: new Date()
        }
      });
      console.log('✅ Test medarbejder opdateret (PIN nulstillet til 1234)');
    } else {
      // Opret ny medarbejder
      employee = await prisma.user.create({
        data: {
          employeeNumber: '1001',
          pinHash: pinHash,
          name: 'Test Chauffør',
          role: 'EMPLOYEE',
          teamId: team.id,
          isActive: true
        }
      });
      console.log('✅ Test medarbejder oprettet!');
    }

    console.log('\n📱 Login credentials for mobile app:');
    console.log('   Medarbejdernr: 1001');
    console.log('   PIN: 1234');
    console.log('   Navn:', employee.name);
    console.log('   Aktiv:', employee.isActive);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Fejl:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestEmployee();
