/**
 * Tests for Smart Automation Service
 * Intelligent detektion og automatisering
 */

import {
  suggestOptimalSchedule,
  detectTimeEntryAnomalies,
} from '../../services/smartAutomationService';
import { TimeEntry, TaskType, TimeEntryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock time entry factory
const createMockTimeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
  id: 'test-time-entry-id',
  employeeId: 'test-employee-id',
  date: new Date('2025-01-06'), // Monday
  startTime: new Date('2025-01-06T08:00:00'),
  endTime: new Date('2025-01-06T16:00:00'),
  breakDuration: 30,
  location: null,
  route: null,
  taskType: TaskType.DRIVING,
  isIrregularHours: false,
  isNightWork: false,
  isWeekend: false,
  isHoliday: false,
  comment: null,
  status: TimeEntryStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('SmartAutomationService', () => {
  describe('Optimal Schedule Suggestions', () => {
    it('should suggest 7.4 hours per day for 37 hour week', () => {
      const result = suggestOptimalSchedule(37, 5);

      expect(result.dailyHours).toBe(7.4);
      expect(result.remainingHours).toBe(0);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest 6.8 hours per day for 34 hour week (shift work)', () => {
      const result = suggestOptimalSchedule(34, 5);

      expect(result.dailyHours).toBe(6.8);
      expect(result.remainingHours).toBe(0);
    });

    it('should handle 40 hour week', () => {
      const result = suggestOptimalSchedule(40, 5);

      expect(result.dailyHours).toBe(8.0);
      expect(result.remainingHours).toBe(0);
    });

    it('should warn about long daily hours', () => {
      const result = suggestOptimalSchedule(45, 5);

      expect(result.dailyHours).toBe(9.0);
      expect(result.suggestions.some((s) => s.includes('overstiger 8 timer'))).toBe(true);
    });

    it('should warn about short daily hours', () => {
      const result = suggestOptimalSchedule(25, 5);

      expect(result.dailyHours).toBe(5.0);
      expect(result.suggestions.some((s) => s.includes('lav'))).toBe(true);
    });

    it('should handle uneven hour distribution', () => {
      const result = suggestOptimalSchedule(38, 5); // Not evenly divisible

      expect(result.dailyHours).toBe(7.6);
      expect(result.remainingHours).toBe(0);
    });

    it('should work with 4-day work week', () => {
      const result = suggestOptimalSchedule(37, 4);

      expect(result.dailyHours).toBeGreaterThan(9);
      expect(result.suggestions.some((s) => s.includes('overstiger 8 timer'))).toBe(true);
    });

    it('should work with 6-day work week', () => {
      const result = suggestOptimalSchedule(37, 6);

      expect(result.dailyHours).toBeCloseTo(6.1, 1);
    });
  });

  describe('Time Entry Anomaly Detection', () => {
    it('should detect no anomalies in normal entry', () => {
      const entry = createMockTimeEntry({
        startTime: new Date('2025-01-06T08:00:00'),
        endTime: new Date('2025-01-06T16:00:00'),
        breakDuration: 30,
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(false);
      expect(result.anomalies.length).toBe(0);
    });

    it('should detect negative break duration', () => {
      const entry = createMockTimeEntry({
        breakDuration: -10,
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'NEGATIVE_BREAK')).toBe(true);
      expect(result.anomalies.some((a) => a.severity === 'ERROR')).toBe(true);
    });

    it('should detect excessive hours (>16 hours)', () => {
      const entry = createMockTimeEntry({
        startTime: new Date('2025-01-06T06:00:00'),
        endTime: new Date('2025-01-07T02:00:00'), // 20 hours
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'EXCESSIVE_HOURS')).toBe(true);
      expect(result.anomalies.some((a) => a.severity === 'ERROR')).toBe(true);
      expect(result.anomalies.some((a) => a.message.includes('16 timer'))).toBe(true);
    });

    it('should warn about long hours (12-16 hours)', () => {
      const entry = createMockTimeEntry({
        startTime: new Date('2025-01-06T06:00:00'),
        endTime: new Date('2025-01-06T19:00:00'), // 13 hours
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'EXCESSIVE_HOURS')).toBe(true);
      expect(result.anomalies.some((a) => a.severity === 'WARNING')).toBe(true);
    });

    it('should detect missing weekend flag', () => {
      const entry = createMockTimeEntry({
        date: new Date('2025-01-04'), // Saturday
        startTime: new Date('2025-01-04T08:00:00'),
        endTime: new Date('2025-01-04T16:00:00'),
        isWeekend: false, // Missing flag
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'WEEKEND_MISSING_FLAG')).toBe(true);
    });

    it('should detect missing night work flag', () => {
      const entry = createMockTimeEntry({
        startTime: new Date('2025-01-06T22:00:00'), // Night
        endTime: new Date('2025-01-07T06:00:00'),
        isNightWork: false, // Missing flag
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'NIGHT_MISSING_FLAG')).toBe(true);
    });

    it('should detect multiple anomalies', () => {
      const entry = createMockTimeEntry({
        startTime: new Date('2025-01-04T22:00:00'), // Saturday night
        endTime: new Date('2025-01-05T14:00:00'), // 16 hours
        breakDuration: -5, // Negative
        isWeekend: false,
        isNightWork: false,
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.length).toBeGreaterThanOrEqual(3);
      expect(result.anomalies.some((a) => a.type === 'NEGATIVE_BREAK')).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'WEEKEND_MISSING_FLAG')).toBe(true);
      expect(result.anomalies.some((a) => a.type === 'NIGHT_MISSING_FLAG')).toBe(true);
    });

    it('should not flag correctly marked weekend work', () => {
      const entry = createMockTimeEntry({
        date: new Date('2025-01-04'), // Saturday
        startTime: new Date('2025-01-04T08:00:00'),
        endTime: new Date('2025-01-04T16:00:00'),
        isWeekend: true, // Correctly marked
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.anomalies.some((a) => a.type === 'WEEKEND_MISSING_FLAG')).toBe(false);
    });

    it('should not flag correctly marked night work', () => {
      const entry = createMockTimeEntry({
        startTime: new Date('2025-01-06T22:00:00'),
        endTime: new Date('2025-01-07T06:00:00'),
        isNightWork: true, // Correctly marked
      });

      const result = detectTimeEntryAnomalies(entry);

      expect(result.anomalies.some((a) => a.type === 'NIGHT_MISSING_FLAG')).toBe(false);
    });

    it('should handle entry without end time', () => {
      const entry = createMockTimeEntry({
        endTime: null,
      });

      const result = detectTimeEntryAnomalies(entry);

      // Should not crash and should not detect excessive hours
      expect(result.anomalies.some((a) => a.type === 'EXCESSIVE_HOURS')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero hour week in schedule suggestion', () => {
      const result = suggestOptimalSchedule(0, 5);

      expect(result.dailyHours).toBe(0);
      expect(result.remainingHours).toBe(0);
    });

    it('should handle single day work week', () => {
      const result = suggestOptimalSchedule(8, 1);

      expect(result.dailyHours).toBe(8);
      expect(result.remainingHours).toBe(0);
    });

    it('should handle fractional hours', () => {
      const result = suggestOptimalSchedule(37.5, 5);

      expect(result.dailyHours).toBe(7.5);
      expect(result.remainingHours).toBe(0);
    });
  });
});
