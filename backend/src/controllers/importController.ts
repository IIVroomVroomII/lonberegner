import { Request, Response } from 'express';
import Papa from 'papaparse';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

interface EmployeeImportRow {
  name: string;
  email: string;
  cprNumber: string;
  employeeNumber?: string;
  jobCategory?: string;
  agreementType?: string;
  baseSalary?: string;
  workTimeType?: string;
  department?: string;
  location?: string;
  employmentDate?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

export const importEmployees = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Bruger er ikke tilknyttet et team'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Ingen fil uploadet'
      });
    }

    // Parse CSV file
    const fileContent = req.file.buffer.toString('utf-8');
    const parseResult = Papa.parse<EmployeeImportRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/ /g, '')
    });

    if (parseResult.errors.length > 0) {
      logger.error('CSV parsing errors:', parseResult.errors);
      return res.status(400).json({
        success: false,
        message: 'Fejl ved parsing af CSV fil',
        errors: parseResult.errors
      });
    }

    const data = parseResult.data;
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Validate required fields
    const requiredFields: Array<keyof EmployeeImportRow> = ['name', 'email', 'cprNumber'];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      const rowNumber = i + 2; // +2 because of header row and 0-based index

      try {
        // Normalize field names (CSV might have different casing)
        const normalizedRow: EmployeeImportRow = {
          name: row.name || row.navn,
          email: row.email,
          cprNumber: row.cprnumber || row.cpr,
          employeeNumber: row.employeenumber || row.medarbejdernummer,
          jobCategory: row.jobcategory || row.jobkategori,
          agreementType: row.agreementtype || row.overenskomst,
          baseSalary: row.basesalary || row.grundløn || row.løn,
          workTimeType: row.worktimetype || row.ansættelsestype,
          department: row.department || row.afdeling,
          location: row.location || row.lokation,
          employmentDate: row.employmentDate || row.ansatdato,
        };

        // Check required fields
        const missingFields = requiredFields.filter(field => !normalizedRow[field]);
        if (missingFields.length > 0) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email || 'N/A',
            error: `Manglende påkrævede felter: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedRow.email)) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email,
            error: 'Ugyldig email format'
          });
          continue;
        }

        // Validate cprNumber (should be 10 digits)
        const cleanedCpr = normalizedRow.cprNumber.replace(/[-\s]/g, '');
        if (!/^\d{10}$/.test(cleanedCpr)) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email,
            error: 'CPR nummer skal være 10 cifre (DDMMYYXXXX)'
          });
          continue;
        }

        // Check if user already exists with this email
        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedRow.email }
        });

        if (existingUser) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email,
            error: 'Email eksisterer allerede i systemet'
          });
          continue;
        }

        // Check if cprNumber already exists
        const existingEmployee = await prisma.employee.findUnique({
          where: { cprNumber: cleanedCpr }
        });

        if (existingEmployee) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email,
            error: 'CPR nummer eksisterer allerede i systemet'
          });
          continue;
        }

        // Parse optional fields with defaults
        const baseSalary = normalizedRow.baseSalary ? parseFloat(normalizedRow.baseSalary) : 175.0;
        const employmentDate = normalizedRow.employmentDate ? new Date(normalizedRow.employmentDate) : new Date();

        // Validate numeric fields
        if (isNaN(baseSalary) || baseSalary <= 0) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email,
            error: 'Ugyldig grundløn (skal være et positivt tal)'
          });
          continue;
        }

        // Get default calculation profile for the team
        const defaultProfile = await prisma.calculationProfile.findFirst({
          where: {
            teamId: teamId,
            isDefault: true
          }
        });

        if (!defaultProfile) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: normalizedRow.email,
            error: 'Ingen standard beregningsprofil fundet for teamet'
          });
          continue;
        }

        // Generate employee number if not provided
        const employeeNumber = normalizedRow.employeeNumber || `EMP-${Date.now()}-${i}`;

        // Generate a random password for the employee
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // Create user and employee in a transaction
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: normalizedRow.name,
              email: normalizedRow.email,
              passwordHash: hashedPassword,
              role: 'EMPLOYEE',
              teamRole: 'EMPLOYEE',
              teamId: teamId
            }
          });

          await tx.employee.create({
            data: {
              userId: user.id,
              cprNumber: cleanedCpr,
              employeeNumber: employeeNumber,
              jobCategory: (normalizedRow.jobCategory as any) || 'DRIVER',
              agreementType: (normalizedRow.agreementType as any) || 'DRIVER_AGREEMENT',
              employmentDate: employmentDate,
              workTimeType: (normalizedRow.workTimeType as any) || 'HOURLY',
              baseSalary: baseSalary,
              department: normalizedRow.department || null,
              location: normalizedRow.location || null,
              calculationProfileId: defaultProfile.id
            }
          });
        });

        result.success++;
        logger.info(`Employee imported successfully: ${normalizedRow.email}`);

      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: row.email || 'N/A',
          error: error.message || 'Ukendt fejl'
        });
        logger.error(`Error importing employee at row ${rowNumber}:`, error);
      }
    }

    return res.json({
      success: true,
      message: `Import gennemført: ${result.success} succesfulde, ${result.failed} fejlede`,
      data: result
    });

  } catch (error: any) {
    logger.error('Error importing employees:', error);
    return res.status(500).json({
      success: false,
      message: 'Fejl ved import af medarbejdere',
      error: error.message
    });
  }
};

export const downloadTemplate = async (req: Request, res: Response) => {
  try {
    // Create CSV template with headers and example rows
    const template = `name,email,cprNumber,employeeNumber,jobCategory,agreementType,baseSalary,workTimeType,department,location,employmentDate
John Doe,john.doe@example.com,0101901234,EMP001,DRIVER,DRIVER_AGREEMENT,185.50,HOURLY,Transport,København,2024-01-01
Jane Smith,jane.smith@example.com,1502851234,EMP002,WAREHOUSE,WAREHOUSE_AGREEMENT,175.00,HOURLY,Lager,Odense,2024-02-15`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-import-template.csv');
    res.send(template);

  } catch (error: any) {
    logger.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Fejl ved generering af skabelon'
    });
  }
};
