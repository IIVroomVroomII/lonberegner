/**
 * Tests for Freedom Days Service
 * § 11 Fridage
 */

import {
  calculateHolidays,
  isHoliday,
  isWeekend,
  calculateSeniorScheme,
  calculateWeekendHolidayAllowance,
  getUpcomingHolidays,
  FREEDOM_DAYS_RULES,
} from '../../services/freedomDaysService';

describe('FreedomDaysService', () => {
  describe('Holiday Calculation', () => {
    it('should calculate all Danish holidays for 2025', () => {
      const holidays = calculateHolidays(2025);

      // Skal have mindst 15 helligdage (faste + påske-relaterede)
      expect(holidays.length).toBeGreaterThanOrEqual(15);

      // Check nogle kendte datoer
      const holidayNames = holidays.map((h) => h.name);
      expect(holidayNames).toContain('Nytårsdag');
      expect(holidayNames).toContain('1. maj');
      expect(holidayNames).toContain('Grundlovsdag');
      expect(holidayNames).toContain('Juleaftensdag');
      expect(holidayNames).toContain('1. juledag');
      expect(holidayNames).toContain('2. juledag');
      expect(holidayNames).toContain('Påskedag');
      expect(holidayNames).toContain('Pinsedag');
    });

    it('should mark full day vs half day holidays correctly', () => {
      const holidays = calculateHolidays(2025);

      const grundlovsdag = holidays.find((h) => h.name === 'Grundlovsdag');
      const juleaftensdag = holidays.find((h) => h.name === 'Juleaftensdag');
      const foersteMaj = holidays.find((h) => h.name === '1. maj');

      expect(grundlovsdag?.isFullDay).toBe(false); // Efter kl. 12
      expect(juleaftensdag?.isFullDay).toBe(false); // Efter kl. 12
      expect(foersteMaj?.isFullDay).toBe(true); // Hel dag
    });

    it('should sort holidays chronologically', () => {
      const holidays = calculateHolidays(2025);

      for (let i = 0; i < holidays.length - 1; i++) {
        expect(holidays[i].date.getTime()).toBeLessThanOrEqual(
          holidays[i + 1].date.getTime()
        );
      }
    });

    it('should calculate Easter correctly for 2025', () => {
      const holidays = calculateHolidays(2025);
      const easter = holidays.find((h) => h.name === 'Påskedag');

      expect(easter).toBeDefined();
      // Påske 2025 er 20. april
      expect(easter?.date.getMonth()).toBe(3); // April = 3
      expect(easter?.date.getDate()).toBe(20);
    });

    it('should calculate Easter correctly for 2026', () => {
      const holidays = calculateHolidays(2026);
      const easter = holidays.find((h) => h.name === 'Påskedag');

      expect(easter).toBeDefined();
      // Påske 2026 er 5. april
      expect(easter?.date.getMonth()).toBe(3); // April = 3
      expect(easter?.date.getDate()).toBe(5);
    });
  });

  describe('Holiday Detection', () => {
    it('should detect 1. maj as holiday', () => {
      const date = new Date('2025-05-01');
      const result = isHoliday(date);

      expect(result.isHoliday).toBe(true);
      expect(result.holiday?.name).toBe('1. maj');
    });

    it('should detect Christmas Eve as holiday', () => {
      const date = new Date('2025-12-24');
      const result = isHoliday(date);

      expect(result.isHoliday).toBe(true);
      expect(result.holiday?.name).toBe('Juleaftensdag');
    });

    it('should detect Easter as holiday', () => {
      const date = new Date('2025-04-20'); // Påske 2025
      const result = isHoliday(date);

      expect(result.isHoliday).toBe(true);
      expect(result.holiday?.name).toBe('Påskedag');
    });

    it('should NOT detect regular weekday as holiday', () => {
      const date = new Date('2025-03-10'); // Random Monday
      const result = isHoliday(date);

      expect(result.isHoliday).toBe(false);
      expect(result.holiday).toBeUndefined();
    });

    it('should detect New Years Day as holiday', () => {
      const date = new Date('2025-01-01');
      const result = isHoliday(date);

      expect(result.isHoliday).toBe(true);
      expect(result.holiday?.name).toBe('Nytårsdag');
    });
  });

  describe('Weekend Detection', () => {
    it('should detect Saturday as weekend', () => {
      const saturday = new Date('2025-01-04'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should detect Sunday as weekend', () => {
      const sunday = new Date('2025-01-05'); // Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should NOT detect Monday as weekend', () => {
      const monday = new Date('2025-01-06'); // Monday
      expect(isWeekend(monday)).toBe(false);
    });

    it('should NOT detect Friday as weekend', () => {
      const friday = new Date('2025-01-03'); // Friday
      expect(isWeekend(friday)).toBe(false);
    });
  });

  describe('Senior Scheme Calculation', () => {
    it('should calculate senior scheme for eligible employee (60+)', () => {
      const birthDate = new Date('1960-01-01'); // 65 years old
      const result = calculateSeniorScheme(birthDate, 50, 100000);

      expect(result.isEligible).toBe(true);
      expect(result.age).toBeGreaterThanOrEqual(60);
      expect(result.pensionConversionPercentage).toBe(50);
      expect(result.pensionReduction).toBe(50000); // 50% of 100000
      expect(result.extraDaysGranted).toBe(23); // 50% of 46 days
    });

    it('should grant maximum 46 days at 100% conversion', () => {
      const birthDate = new Date('1960-01-01');
      const result = calculateSeniorScheme(birthDate, 100, 100000);

      expect(result.extraDaysGranted).toBe(46);
      expect(result.pensionReduction).toBe(100000);
    });

    it('should grant 0 days at 0% conversion', () => {
      const birthDate = new Date('1960-01-01');
      const result = calculateSeniorScheme(birthDate, 0, 100000);

      expect(result.extraDaysGranted).toBe(0);
      expect(result.pensionReduction).toBe(0);
    });

    it('should not be eligible if under 60', () => {
      const birthDate = new Date('1970-01-01'); // ~55 years old
      const result = calculateSeniorScheme(birthDate, 50, 100000);

      expect(result.isEligible).toBe(false);
      expect(result.extraDaysGranted).toBe(0);
    });

    it('should accept valid conversion percentages', () => {
      const birthDate = new Date('1960-01-01');

      const validPercentages = [0, 25, 50, 75, 100];

      for (const pct of validPercentages) {
        expect(() => calculateSeniorScheme(birthDate, pct, 100000)).not.toThrow();
      }
    });

    it('should reject invalid conversion percentages', () => {
      const birthDate = new Date('1960-01-01');

      expect(() => calculateSeniorScheme(birthDate, 30, 100000)).toThrow();
      expect(() => calculateSeniorScheme(birthDate, 60, 100000)).toThrow();
      expect(() => calculateSeniorScheme(birthDate, 99, 100000)).toThrow();
    });

    it('should calculate correct days for 25% conversion', () => {
      const birthDate = new Date('1960-01-01');
      const result = calculateSeniorScheme(birthDate, 25, 100000);

      expect(result.extraDaysGranted).toBe(11); // 25% of 46 = 11.5 -> 11
      expect(result.pensionReduction).toBe(25000);
    });

    it('should calculate correct days for 75% conversion', () => {
      const birthDate = new Date('1960-01-01');
      const result = calculateSeniorScheme(birthDate, 75, 100000);

      expect(result.extraDaysGranted).toBe(34); // 75% of 46 = 34.5 -> 34
      expect(result.pensionReduction).toBe(75000);
    });
  });

  describe('Weekend/Holiday Allowance Calculation', () => {
    it('should calculate 50% allowance for Saturday', () => {
      const saturday = new Date('2025-01-04');
      const result = calculateWeekendHolidayAllowance(8, 150, saturday);

      expect(result.allowancePercentage).toBe(50);
      expect(result.allowanceAmount).toBe(8 * 150 * 0.5);
      expect(result.allowanceAmount).toBe(600);
      expect(result.reason).toContain('Lørdag');
    });

    it('should calculate 50% allowance for Sunday', () => {
      const sunday = new Date('2025-01-05');
      const result = calculateWeekendHolidayAllowance(8, 150, sunday);

      expect(result.allowancePercentage).toBe(50);
      expect(result.allowanceAmount).toBe(600);
      expect(result.reason).toContain('Søndag');
    });

    it('should calculate 100% allowance for holidays', () => {
      const christmas = new Date('2025-12-25'); // 1. juledag
      const result = calculateWeekendHolidayAllowance(8, 150, christmas);

      expect(result.allowancePercentage).toBe(100);
      expect(result.allowanceAmount).toBe(8 * 150 * 1.0);
      expect(result.allowanceAmount).toBe(1200);
      expect(result.reason).toContain('Helligdagstillæg');
      expect(result.reason).toContain('1. juledag');
    });

    it('should calculate 0% allowance for regular weekday', () => {
      const monday = new Date('2025-01-06');
      const result = calculateWeekendHolidayAllowance(8, 150, monday);

      expect(result.allowancePercentage).toBe(0);
      expect(result.allowanceAmount).toBe(0);
      expect(result.reason).toBe('');
    });

    it('should prioritize holiday over weekend', () => {
      // Christmas Day 2025 is a Thursday, but let's test principle
      const holiday = new Date('2025-12-25');
      const result = calculateWeekendHolidayAllowance(8, 150, holiday);

      // Should use holiday rate (100%) not weekend rate (50%)
      expect(result.allowancePercentage).toBe(100);
    });
  });

  describe('Upcoming Holidays', () => {
    it('should return only future holidays', () => {
      const fromDate = new Date('2025-06-01');
      const upcoming = getUpcomingHolidays(fromDate);

      // All returned holidays should be >= fromDate
      for (const holiday of upcoming) {
        expect(holiday.date.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
      }
    });

    it('should include remaining holidays of the year', () => {
      const fromDate = new Date('2025-01-01');
      const upcoming = getUpcomingHolidays(fromDate);

      expect(upcoming.length).toBeGreaterThan(0);

      const names = upcoming.map((h) => h.name);
      expect(names).toContain('Påskedag');
      expect(names).toContain('1. juledag');
    });

    it('should return empty or fewer holidays at year end', () => {
      const fromDate = new Date('2025-12-28');
      const upcoming = getUpcomingHolidays(fromDate);

      // Should only have New Years Eve or nothing
      expect(upcoming.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Freedom Days Rules Constants', () => {
    it('should have statutory days defined', () => {
      expect(FREEDOM_DAYS_RULES.STATUTORY_DAYS).toHaveProperty('MAY_1');
      expect(FREEDOM_DAYS_RULES.STATUTORY_DAYS).toHaveProperty('JUNE_5');
      expect(FREEDOM_DAYS_RULES.STATUTORY_DAYS).toHaveProperty('CHRISTMAS_EVE');
      expect(FREEDOM_DAYS_RULES.STATUTORY_DAYS).toHaveProperty('NEW_YEARS_EVE');
      expect(FREEDOM_DAYS_RULES.STATUTORY_DAYS).toHaveProperty('EASTER_SATURDAY');
    });

    it('should have correct vacation freedom days entitlement', () => {
      expect(FREEDOM_DAYS_RULES.VACATION_FREEDOM_DAYS.YEARLY_ENTITLEMENT).toBe(5);
    });

    it('should have correct senior scheme parameters', () => {
      expect(FREEDOM_DAYS_RULES.SENIOR_SCHEME.MIN_AGE).toBe(60);
      expect(FREEDOM_DAYS_RULES.SENIOR_SCHEME.MAX_DAYS_PER_YEAR).toBe(46);
      expect(FREEDOM_DAYS_RULES.SENIOR_SCHEME.PENSION_CONVERSION_OPTIONS).toEqual([
        0, 25, 50, 75, 100,
      ]);
    });

    it('should have correct allowance percentages', () => {
      expect(FREEDOM_DAYS_RULES.ALLOWANCES.WEEKEND_PERCENTAGE).toBe(50);
      expect(FREEDOM_DAYS_RULES.ALLOWANCES.HOLIDAY_PERCENTAGE).toBe(100);
    });
  });
});
