-- Lønberegning System Database Schema
-- Kør dette script i pgAdmin for at oprette alle tabeller

-- Create ENUM types
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PAYROLL_MANAGER', 'EMPLOYEE');
CREATE TYPE "JobCategory" AS ENUM ('DRIVER', 'WAREHOUSE', 'MOVER', 'TERMINAL', 'RENOVATION');
CREATE TYPE "AgreementType" AS ENUM ('DRIVER_AGREEMENT', 'WAREHOUSE_AGREEMENT', 'MOVER_AGREEMENT');
CREATE TYPE "WorkTimeType" AS ENUM ('HOURLY', 'SALARIED', 'SUBSTITUTE', 'SHIFT_WORK');
CREATE TYPE "TaskType" AS ENUM ('DISTRIBUTION', 'TERMINAL_WORK', 'DRIVING', 'MOVING', 'LOADING', 'UNLOADING');
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CALCULATED');
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'EXPORTED', 'PAID');
CREATE TYPE "ComponentType" AS ENUM ('BASE_SALARY', 'OVERTIME', 'NIGHT_ALLOWANCE', 'WEEKEND_ALLOWANCE', 'HOLIDAY_ALLOWANCE', 'SHIFTED_TIME', 'SPECIAL_ALLOWANCE', 'DRIVER_ALLOWANCE', 'WAREHOUSE_ALLOWANCE', 'MOVER_ALLOWANCE', 'SHIFT_ALLOWANCE', 'PENSION_EMPLOYER', 'PENSION_EMPLOYEE', 'VACATION', 'SPECIAL_SAVINGS');
CREATE TYPE "IntegrationType" AS ENUM ('ECONOMIC', 'DANLON', 'PROLON', 'LESSOR', 'DATALON', 'CUSTOM');

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Employees table
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cprNumber" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "jobCategory" "JobCategory" NOT NULL,
    "agreementType" "AgreementType" NOT NULL,
    "employmentDate" TIMESTAMP(3) NOT NULL,
    "anciennity" INTEGER NOT NULL DEFAULT 0,
    "workTimeType" "WorkTimeType" NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");
CREATE UNIQUE INDEX "employees_cprNumber_key" ON "employees"("cprNumber");
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "employees"("employeeNumber");

-- Time Entries table
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "route" TEXT,
    "taskType" "TaskType" NOT NULL,
    "isIrregularHours" BOOLEAN NOT NULL DEFAULT false,
    "isNightWork" BOOLEAN NOT NULL DEFAULT false,
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_entries_employeeId_date_idx" ON "time_entries"("employeeId", "date");

-- Payroll Calculations table
CREATE TABLE "payroll_calculations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "regularHours" DECIMAL(10,2) NOT NULL,
    "overtimeHours" DECIMAL(10,2) NOT NULL,
    "nightHours" DECIMAL(10,2) NOT NULL,
    "weekendHours" DECIMAL(10,2) NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "overtimePay" DECIMAL(10,2) NOT NULL,
    "nightAllowance" DECIMAL(10,2) NOT NULL,
    "weekendAllowance" DECIMAL(10,2) NOT NULL,
    "specialAllowance" DECIMAL(10,2) NOT NULL,
    "totalGrossPay" DECIMAL(10,2) NOT NULL,
    "pensionEmployer" DECIMAL(10,2) NOT NULL,
    "pensionEmployee" DECIMAL(10,2) NOT NULL,
    "vacation" DECIMAL(10,2) NOT NULL,
    "specialSavings" DECIMAL(10,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "exportedAt" TIMESTAMP(3),
    "exportedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_calculations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payroll_calculations_employeeId_periodStart_periodEnd_idx" ON "payroll_calculations"("employeeId", "periodStart", "periodEnd");

-- Payroll Components table
CREATE TABLE "payroll_components" (
    "id" TEXT NOT NULL,
    "payrollCalculationId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "componentType" "ComponentType" NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(10,2),
    "rate" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "agreementReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_components_timeEntryId_key" ON "payroll_components"("timeEntryId");

-- Agreements table
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "baseHourlyRate" DECIMAL(10,2) NOT NULL,
    "weeklyHours" DECIMAL(10,2) NOT NULL DEFAULT 37,
    "overtime1to3Rate" DECIMAL(10,2) NOT NULL,
    "overtimeAbove3Rate" DECIMAL(10,2) NOT NULL,
    "shiftedTimeRate" DECIMAL(10,2) NOT NULL,
    "specialAllowancePercent" DECIMAL(5,2) NOT NULL,
    "pensionEmployerPercent" DECIMAL(5,2) NOT NULL,
    "pensionEmployeePercent" DECIMAL(5,2) NOT NULL,
    "weekendAllowancePercent" DECIMAL(5,2) NOT NULL,
    "holidayAllowancePercent" DECIMAL(5,2) NOT NULL,
    "vacationPercent" DECIMAL(10,2) NOT NULL,
    "vacationDaysPerYear" INTEGER NOT NULL DEFAULT 25,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- Audit Logs table
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payrollCalculationId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "comment" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- Integration Configs table
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "username" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_configs_name_key" ON "integration_configs"("name");

-- Foreign Keys
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_components" ADD CONSTRAINT "payroll_components_payrollCalculationId_fkey" FOREIGN KEY ("payrollCalculationId") REFERENCES "payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_components" ADD CONSTRAINT "payroll_components_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_payrollCalculationId_fkey" FOREIGN KEY ("payrollCalculationId") REFERENCES "payroll_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully! All tables and relationships are now in place.';
END $$;
