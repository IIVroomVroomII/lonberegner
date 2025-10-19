import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndAssignTeam() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        teamId: true,
      },
    });

    console.log('Current users:');
    console.log(JSON.stringify(users, null, 2));

    // Find or create default team
    let team = await prisma.team.findFirst({
      where: { name: 'Standard Team' },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'Standard Team',
          contactEmail: 'admin@lonberegning.dk',
        },
      });
      console.log('\n✅ Created team:', team.name);
    } else {
      console.log('\n✅ Team exists:', team.name, 'ID:', team.id);
    }

    // Update users without teamId
    const usersWithoutTeam = users.filter(u => !u.teamId);

    if (usersWithoutTeam.length > 0) {
      console.log(`\nUpdating ${usersWithoutTeam.length} users without teamId...`);

      for (const user of usersWithoutTeam) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            teamId: team.id,
            teamRole: 'ADMIN', // Set as admin
          },
        });
        console.log(`✅ Updated ${user.email} with teamId: ${team.id}`);
      }
    } else {
      console.log('\n✅ All users already have teamId assigned');
    }

    // Show final state
    const updatedUsers = await prisma.user.findMany({
      select: {
        email: true,
        teamId: true,
        teamRole: true,
      },
    });

    console.log('\nFinal user state:');
    console.log(JSON.stringify(updatedUsers, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndAssignTeam();
