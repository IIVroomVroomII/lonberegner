import { PrismaClient, RoundingDirection, TimeStartMode, ConflictHandling } from '@prisma/client';
import { logger } from './config/logger';

const prisma = new PrismaClient();

async function setupTeamAndProfiles() {
  try {
    logger.info('🔧 Setting up default Team and Calculation Profiles...');

    // Create or get default team
    let team = await prisma.team.findFirst({
      where: { isActive: true },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'Standard Virksomhed',
          contactEmail: 'admin@lonberegning.dk',
          contactPhone: '+45 12 34 56 78',
          organizationNumber: null,
          isActive: true,
        },
      });
      logger.info(`✅ Created default team: ${team.name} (${team.id})`);
    } else {
      logger.info(`✓ Found existing team: ${team.name} (${team.id})`);
    }

    // Check if profiles already exist
    const existingProfiles = await prisma.calculationProfile.findMany({
      where: { teamId: team.id },
    });

    if (existingProfiles.length > 0) {
      logger.info(`✓ Found ${existingProfiles.length} existing calculation profiles`);
      existingProfiles.forEach(profile => {
        logger.info(`  - ${profile.name} (${profile.isDefault ? 'DEFAULT' : 'custom'})`);
      });

      logger.info('\n✅ Team and profiles already configured!');
      return;
    }

    // Create calculation profiles for each agreement type
    const profiles = [
      {
        name: 'Chaufførprofil',
        description: 'Standard beregningsprofil for chauffører med normal tidsafrunding og konfliktgennemsyn',
        timeRoundingMinutes: 15,
        timeRoundingDirection: RoundingDirection.NEAREST,
        countPreMeetingTime: false,
        maxPreMeetingMinutes: 30,
        timeStartsAt: TimeStartMode.SCHEDULED,
        conflictHandling: ConflictHandling.MANUAL_REVIEW,
        conflictThresholdPercent: 10.0,
        isDefault: true, // Default profile
      },
      {
        name: 'Lagerprofil',
        description: 'Standard beregningsprofil for lagermedarbejdere med 5 minutters afrunding',
        timeRoundingMinutes: 5,
        timeRoundingDirection: RoundingDirection.NEAREST,
        countPreMeetingTime: false,
        maxPreMeetingMinutes: 15,
        timeStartsAt: TimeStartMode.ACTUAL,
        conflictHandling: ConflictHandling.AUTO_WITH_NOTIFICATION,
        conflictThresholdPercent: 5.0,
        isDefault: false,
      },
      {
        name: 'Flytteprofil',
        description: 'Standard beregningsprofil for flyttearbejdere med fleksibel tidshåndtering',
        timeRoundingMinutes: 15,
        timeRoundingDirection: RoundingDirection.UP,
        countPreMeetingTime: true,
        maxPreMeetingMinutes: 45,
        timeStartsAt: TimeStartMode.ACTUAL,
        conflictHandling: ConflictHandling.MANUAL_REVIEW,
        conflictThresholdPercent: 15.0,
        isDefault: false,
      },
    ];

    for (const profileData of profiles) {
      const profile = await prisma.calculationProfile.create({
        data: {
          ...profileData,
          teamId: team.id,
        },
      });

      logger.info(`✅ Created calculation profile: ${profile.name} ${profile.isDefault ? '(DEFAULT)' : ''}`);
      logger.info(`   - Rounding: ${profile.timeRoundingMinutes} min (${profile.timeRoundingDirection})`);
      logger.info(`   - Time starts: ${profile.timeStartsAt}`);
      logger.info(`   - Conflict handling: ${profile.conflictHandling}`);
    }

    // Update all existing users to use the team
    const usersUpdated = await prisma.user.updateMany({
      where: { teamId: null },
      data: { teamId: team.id },
    });

    if (usersUpdated.count > 0) {
      logger.info(`\n✅ Updated ${usersUpdated.count} users to use team: ${team.name}`);
    }

    // Update all existing employees to use the default calculation profile
    const defaultProfile = await prisma.calculationProfile.findFirst({
      where: { teamId: team.id, isDefault: true },
    });

    if (defaultProfile) {
      const employeesUpdated = await prisma.employee.updateMany({
        where: { calculationProfileId: null },
        data: { calculationProfileId: defaultProfile.id },
      });

      if (employeesUpdated.count > 0) {
        logger.info(`✅ Updated ${employeesUpdated.count} employees to use default profile: ${defaultProfile.name}`);
      }
    }

    logger.info('\n🎉 Team and calculation profiles setup completed successfully!');
    logger.info(`\nTeam details:`);
    logger.info(`  Name: ${team.name}`);
    logger.info(`  Email: ${team.contactEmail}`);
    logger.info(`  Phone: ${team.contactPhone || 'N/A'}`);
    logger.info(`\nCalculation Profiles: ${profiles.length}`);

  } catch (error) {
    logger.error('Error setting up team and profiles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTeamAndProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Setup failed:', error);
    process.exit(1);
  });
