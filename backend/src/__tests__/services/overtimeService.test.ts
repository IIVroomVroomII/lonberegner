/**
 * Tests for Overtime Service
 * § 7 Overarbejde
 */

import {
  calculateHourlyOvertime,
  calculateSalariedOvertime,
  detectHourBefore,
  validateRestPeriod,
  validateDailyWorkHours,
  OVERTIME_RULES,
} from '../../services/overtimeService';

describe('OvertimeService', () => {
  describe('Hourly Employee Overtime Calculation', () => {
    it('should calculate no overtime for standard hours', () => {
      const result = calculateHourlyOvertime(
        7.4, // Daily hours
        7.4, // Standard daily hours
        false, // No hour before
        false, // Not weekend
        false, // Not holiday
        150 // Base hourly rate
      );

      expect(result.totalOvertimeHours).toBe(0);
      expect(result.overtimePay).toBe(0);
      expect(result.regularOvertimeHours).toBe(0);
      expect(result.excessiveOvertimeHours).toBe(0);
    });

    it('should calculate 1-3 hours overtime at standard rate', () => {
      const result = calculateHourlyOvertime(
        9.4, // 2 hours overtime
        7.4,
        false,
        false,
        false,
        150
      );

      expect(result.totalOvertimeHours).toBe(2);
      expect(result.regularOvertimeHours).toBe(2);
      expect(result.excessiveOvertimeHours).toBe(0);
      expect(result.overtimePay).toBe(2 * OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS);
      expect(result.overtimePay).toBe(100); // 2 * 50 kr
    });

    it('should calculate 4+ hours overtime at higher rate', () => {
      const result = calculateHourlyOvertime(
        12.4, // 5 hours overtime
        7.4,
        false,
        false,
        false,
        150
      );

      expect(result.totalOvertimeHours).toBe(5);
      expect(result.regularOvertimeHours).toBe(3); // First 3 hours
      expect(result.excessiveOvertimeHours).toBe(2); // 2 hours above 3

      const expectedPay =
        3 * OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS + // 3 * 50
        2 * OVERTIME_RULES.HOURLY_EMPLOYEES.ABOVE_3_HOURS; // 2 * 75

      expect(result.overtimePay).toBe(expectedPay);
      expect(result.overtimePay).toBe(300); // 150 + 150
    });

    it('should add "timen før" payment', () => {
      const result = calculateHourlyOvertime(
        7.4,
        7.4,
        true, // Has hour before
        false,
        false,
        150
      );

      expect(result.hourBeforeHours).toBe(1);
      expect(result.hourBeforePay).toBe(OVERTIME_RULES.HOURLY_EMPLOYEES.HOUR_BEFORE);
      expect(result.hourBeforePay).toBe(60);
      expect(result.totalOvertimeHours).toBe(1); // Only the hour before
    });

    it('should calculate weekend overtime at 150% rate', () => {
      const result = calculateHourlyOvertime(
        9.4, // 2 hours overtime
        7.4,
        false,
        true, // Weekend
        false,
        150
      );

      expect(result.weekendOvertimeHours).toBe(2);
      const expectedRate = OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS *
        OVERTIME_RULES.WEEKEND_HOLIDAY_MULTIPLIER;
      expect(result.overtimePay).toBe(2 * expectedRate);
      expect(result.overtimePay).toBe(150); // 2 * 50 * 1.5
    });

    it('should calculate holiday overtime at 150% rate', () => {
      const result = calculateHourlyOvertime(
        9.4, // 2 hours overtime
        7.4,
        false,
        false,
        true, // Holiday
        150
      );

      expect(result.holidayOvertimeHours).toBe(2);
      const expectedRate = OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS *
        OVERTIME_RULES.WEEKEND_HOLIDAY_MULTIPLIER;
      expect(result.overtimePay).toBe(2 * expectedRate);
      expect(result.overtimePay).toBe(150); // 2 * 50 * 1.5
    });

    it('should combine overtime and hour before', () => {
      const result = calculateHourlyOvertime(
        9.4, // 2 hours overtime
        7.4,
        true, // Hour before
        false,
        false,
        150
      );

      expect(result.totalOvertimeHours).toBe(3); // 1 hour before + 2 overtime
      expect(result.hourBeforeHours).toBe(1);
      expect(result.regularOvertimeHours).toBe(2);

      const expectedPay =
        OVERTIME_RULES.HOURLY_EMPLOYEES.HOUR_BEFORE + // 60
        2 * OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS; // 100

      expect(result.overtimePay).toBe(expectedPay);
      expect(result.overtimePay).toBe(160);
    });

    it('should allow time-off in lieu for hourly employees', () => {
      const result = calculateHourlyOvertime(
        9.4,
        7.4,
        false,
        false,
        false,
        150
      );

      expect(result.canTakeAsTimeOff).toBe(true);
    });

    it('should include breakdown details', () => {
      const result = calculateHourlyOvertime(
        12.4, // 5 hours overtime
        7.4,
        true, // Hour before
        false,
        false,
        150
      );

      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.breakdown.some((b) => b.type === 'HOUR_BEFORE')).toBe(true);
      expect(result.breakdown.some((b) => b.type === 'REGULAR')).toBe(true);
      expect(result.breakdown.some((b) => b.type === 'EXCESSIVE')).toBe(true);
    });
  });

  describe('Salaried Employee Overtime Calculation', () => {
    it('should not pay for hours within monthly threshold', () => {
      const result = calculateSalariedOvertime(
        8, // 8 extra hours (below 10 hour threshold)
        200 // Hourly rate
      );

      expect(result.hoursWithinThreshold).toBe(8);
      expect(result.hoursAboveThreshold).toBe(0);
      expect(result.overtimePay).toBe(0);
    });

    it('should pay for hours above monthly threshold', () => {
      const result = calculateSalariedOvertime(
        15, // 15 extra hours (5 above 10 hour threshold)
        200 // Hourly rate
      );

      expect(result.hoursWithinThreshold).toBe(10);
      expect(result.hoursAboveThreshold).toBe(5);
      expect(result.overtimePay).toBe(5 * 200);
      expect(result.overtimePay).toBe(1000);
    });

    it('should use default rate if not provided', () => {
      const result = calculateSalariedOvertime(
        15, // 15 extra hours
        0 // No rate provided, should use default
      );

      expect(result.hoursAboveThreshold).toBe(5);
      expect(result.overtimePay).toBe(
        5 * OVERTIME_RULES.SALARIED_NON_FIXED.HOURLY_RATE_AFTER_THRESHOLD
      );
    });

    it('should handle exactly threshold hours', () => {
      const result = calculateSalariedOvertime(
        10, // Exactly at threshold
        200
      );

      expect(result.hoursWithinThreshold).toBe(10);
      expect(result.hoursAboveThreshold).toBe(0);
      expect(result.overtimePay).toBe(0);
    });

    it('should allow custom threshold', () => {
      const result = calculateSalariedOvertime(
        15, // 15 extra hours
        200,
        5 // Custom threshold of 5 hours
      );

      expect(result.monthlyThreshold).toBe(5);
      expect(result.hoursWithinThreshold).toBe(5);
      expect(result.hoursAboveThreshold).toBe(10);
      expect(result.overtimePay).toBe(10 * 200);
    });
  });

  describe('Hour Before Detection', () => {
    it('should detect hour before when starting 30+ minutes early', () => {
      const normalStart = new Date('2025-01-01T08:00:00');
      const actualStart = new Date('2025-01-01T07:15:00'); // 45 minutes early

      const result = detectHourBefore(actualStart, normalStart);

      expect(result.hasHourBefore).toBe(true);
      expect(result.minutesBefore).toBe(45);
    });

    it('should detect hour before when starting exactly 30 minutes early', () => {
      const normalStart = new Date('2025-01-01T08:00:00');
      const actualStart = new Date('2025-01-01T07:30:00');

      const result = detectHourBefore(actualStart, normalStart);

      expect(result.hasHourBefore).toBe(true);
      expect(result.minutesBefore).toBe(30);
    });

    it('should NOT detect hour before when starting less than 30 minutes early', () => {
      const normalStart = new Date('2025-01-01T08:00:00');
      const actualStart = new Date('2025-01-01T07:45:00'); // Only 15 minutes early

      const result = detectHourBefore(actualStart, normalStart);

      expect(result.hasHourBefore).toBe(false);
      expect(result.minutesBefore).toBe(15);
    });

    it('should return 0 when starting on time or late', () => {
      const normalStart = new Date('2025-01-01T08:00:00');
      const actualStart = new Date('2025-01-01T08:15:00'); // 15 minutes late

      const result = detectHourBefore(actualStart, normalStart);

      expect(result.hasHourBefore).toBe(false);
      expect(result.minutesBefore).toBe(0);
    });
  });

  describe('Rest Period Validation', () => {
    it('should validate sufficient rest period (11+ hours)', () => {
      const previousEnd = new Date('2025-01-01T17:00:00');
      const nextStart = new Date('2025-01-02T06:00:00'); // 13 hours rest

      const result = validateRestPeriod(previousEnd, nextStart);

      expect(result.isValid).toBe(true);
      expect(result.actualRestHours).toBe(13);
      expect(result.requiredRestHours).toBe(OVERTIME_RULES.MINIMUM_REST_HOURS);
      expect(result.violation).toBeUndefined();
    });

    it('should validate exactly 11 hours rest', () => {
      const previousEnd = new Date('2025-01-01T18:00:00');
      const nextStart = new Date('2025-01-02T05:00:00'); // Exactly 11 hours

      const result = validateRestPeriod(previousEnd, nextStart);

      expect(result.isValid).toBe(true);
      expect(result.actualRestHours).toBe(11);
    });

    it('should fail validation for insufficient rest period', () => {
      const previousEnd = new Date('2025-01-01T22:00:00');
      const nextStart = new Date('2025-01-02T06:00:00'); // Only 8 hours rest

      const result = validateRestPeriod(previousEnd, nextStart);

      expect(result.isValid).toBe(false);
      expect(result.actualRestHours).toBe(8);
      expect(result.violation).toContain('Utilstrækkelig hviletid');
      expect(result.violation).toContain('8.0 timer');
    });
  });

  describe('Daily Work Hours Validation', () => {
    it('should validate normal daily hours', () => {
      const result = validateDailyWorkHours(8);

      expect(result.isValid).toBe(true);
      expect(result.maxDailyHours).toBe(OVERTIME_RULES.MAX_DAILY_HOURS_NORMAL);
      expect(result.warning).toBeUndefined();
    });

    it('should validate maximum allowed hours', () => {
      const result = validateDailyWorkHours(12);

      expect(result.isValid).toBe(true);
      expect(result.maxDailyHours).toBe(12);
    });

    it('should warn about excessive daily hours', () => {
      const result = validateDailyWorkHours(14);

      expect(result.isValid).toBe(false);
      expect(result.warning).toContain('overstiger anbefalet maksimum');
      expect(result.warning).toContain('14 timer');
    });
  });

  describe('Overtime Rules Constants', () => {
    it('should have correct hourly employee rates', () => {
      expect(OVERTIME_RULES.HOURLY_EMPLOYEES.FIRST_3_HOURS).toBe(50.00);
      expect(OVERTIME_RULES.HOURLY_EMPLOYEES.ABOVE_3_HOURS).toBe(75.00);
      expect(OVERTIME_RULES.HOURLY_EMPLOYEES.HOUR_BEFORE).toBe(60.00);
    });

    it('should have correct salaried employee rules', () => {
      expect(OVERTIME_RULES.SALARIED_NON_FIXED.THRESHOLD_HOURS_PER_MONTH).toBe(10);
      expect(OVERTIME_RULES.SALARIED_NON_FIXED.HOURLY_RATE_AFTER_THRESHOLD).toBe(200.00);
    });

    it('should have correct weekend/holiday multiplier', () => {
      expect(OVERTIME_RULES.WEEKEND_HOLIDAY_MULTIPLIER).toBe(1.5);
    });

    it('should have correct daily limits', () => {
      expect(OVERTIME_RULES.MAX_DAILY_HOURS_NORMAL).toBe(12);
      expect(OVERTIME_RULES.MINIMUM_REST_HOURS).toBe(11);
    });
  });
});
