import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { Decimal } from '@prisma/client/runtime/library';

export const listAgreements = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const agreements = await prisma.agreement.findMany({
      where: isActive !== undefined ? { isActive: isActive === 'true' } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: agreements,
    });
  } catch (error) {
    logger.error('Error fetching agreements:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved hentning af overenskomster',
    });
  }
};

export const getAgreement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Overenskomst ikke fundet',
      });
    }

    return res.json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    logger.error('Error fetching agreement:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved hentning af overenskomst',
    });
  }
};

export const createAgreement = async (req: Request, res: Response) => {
  try {
    const agreementData = req.body;

    // Convert numeric fields to Decimal
    const agreement = await prisma.agreement.create({
      data: {
        ...agreementData,
        baseHourlyRate: new Decimal(agreementData.baseHourlyRate),
        weeklyHours: new Decimal(agreementData.weeklyHours),
        overtime1to3Rate: new Decimal(agreementData.overtime1to3Rate),
        overtimeAbove3Rate: new Decimal(agreementData.overtimeAbove3Rate),
        shiftedTimeRate: new Decimal(agreementData.shiftedTimeRate),
        specialAllowancePercent: new Decimal(agreementData.specialAllowancePercent),
        pensionEmployerPercent: new Decimal(agreementData.pensionEmployerPercent),
        pensionEmployeePercent: new Decimal(agreementData.pensionEmployeePercent),
        weekendAllowancePercent: new Decimal(agreementData.weekendAllowancePercent),
        holidayAllowancePercent: new Decimal(agreementData.holidayAllowancePercent),
        vacationPercent: new Decimal(agreementData.vacationPercent),
        validFrom: new Date(agreementData.validFrom),
        validTo: agreementData.validTo ? new Date(agreementData.validTo) : null,
      },
    });

    return res.status(201).json({
      success: true,
      data: agreement,
      message: 'Overenskomst oprettet succesfuldt',
    });
  } catch (error) {
    logger.error('Error creating agreement:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved oprettelse af overenskomst',
    });
  }
};

export const updateAgreement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agreementData = req.body;

    const existingAgreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!existingAgreement) {
      return res.status(404).json({
        success: false,
        message: 'Overenskomst ikke fundet',
      });
    }

    const agreement = await prisma.agreement.update({
      where: { id },
      data: {
        ...agreementData,
        baseHourlyRate: agreementData.baseHourlyRate
          ? new Decimal(agreementData.baseHourlyRate)
          : undefined,
        weeklyHours: agreementData.weeklyHours
          ? new Decimal(agreementData.weeklyHours)
          : undefined,
        overtime1to3Rate: agreementData.overtime1to3Rate
          ? new Decimal(agreementData.overtime1to3Rate)
          : undefined,
        overtimeAbove3Rate: agreementData.overtimeAbove3Rate
          ? new Decimal(agreementData.overtimeAbove3Rate)
          : undefined,
        shiftedTimeRate: agreementData.shiftedTimeRate
          ? new Decimal(agreementData.shiftedTimeRate)
          : undefined,
        specialAllowancePercent: agreementData.specialAllowancePercent
          ? new Decimal(agreementData.specialAllowancePercent)
          : undefined,
        pensionEmployerPercent: agreementData.pensionEmployerPercent
          ? new Decimal(agreementData.pensionEmployerPercent)
          : undefined,
        pensionEmployeePercent: agreementData.pensionEmployeePercent
          ? new Decimal(agreementData.pensionEmployeePercent)
          : undefined,
        weekendAllowancePercent: agreementData.weekendAllowancePercent
          ? new Decimal(agreementData.weekendAllowancePercent)
          : undefined,
        holidayAllowancePercent: agreementData.holidayAllowancePercent
          ? new Decimal(agreementData.holidayAllowancePercent)
          : undefined,
        vacationPercent: agreementData.vacationPercent
          ? new Decimal(agreementData.vacationPercent)
          : undefined,
        validFrom: agreementData.validFrom ? new Date(agreementData.validFrom) : undefined,
        validTo: agreementData.validTo ? new Date(agreementData.validTo) : undefined,
      },
    });

    return res.json({
      success: true,
      data: agreement,
      message: 'Overenskomst opdateret succesfuldt',
    });
  } catch (error) {
    logger.error('Error updating agreement:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved opdatering af overenskomst',
    });
  }
};

export const deleteAgreement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingAgreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!existingAgreement) {
      return res.status(404).json({
        success: false,
        message: 'Overenskomst ikke fundet',
      });
    }

    await prisma.agreement.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Overenskomst slettet succesfuldt',
    });
  } catch (error) {
    logger.error('Error deleting agreement:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved sletning af overenskomst',
    });
  }
};

export const toggleAgreementStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingAgreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!existingAgreement) {
      return res.status(404).json({
        success: false,
        message: 'Overenskomst ikke fundet',
      });
    }

    const agreement = await prisma.agreement.update({
      where: { id },
      data: {
        isActive: !existingAgreement.isActive,
      },
    });

    return res.json({
      success: true,
      data: agreement,
      message: `Overenskomst ${agreement.isActive ? 'aktiveret' : 'deaktiveret'} succesfuldt`,
    });
  } catch (error) {
    logger.error('Error toggling agreement status:', error);
    return res.status(500).json({
      success: false,
      message: 'Der opstod en fejl ved ændring af overenskomststatus',
    });
  }
};
