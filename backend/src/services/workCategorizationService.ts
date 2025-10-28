import prisma from '../config/database';
import { TaskType } from '@prisma/client';

interface WorkPeriod {
  startTime: Date;
  endTime: Date;
  suggestedTaskType: TaskType;
  confidence: number; // 0-100
  reason: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  geofenceName?: string;
  averageSpeed?: number;
  distance?: number;
}

interface CategorizationResult {
  timeEntryId: string;
  workPeriods: WorkPeriod[];
  totalDuration: number;
  analysisDate: Date;
}

export class WorkCategorizationService {
  // Tærskelværdier for kategorisering
  private static readonly STATIONARY_SPEED_THRESHOLD = 1.5; // m/s ≈ 5.4 km/h
  private static readonly DRIVING_SPEED_THRESHOLD = 8; // m/s ≈ 29 km/h
  private static readonly MIN_PERIOD_DURATION = 5 * 60 * 1000; // 5 minutter i millisekunder

  /**
   * Analyserer GPS data for en arbejdsdag og foreslår arbejdstyper
   */
  static async categorizeWorkDay(timeEntryId: string): Promise<CategorizationResult> {
    // Hent time entry
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        gpsTracking: {
          orderBy: { timestamp: 'asc' },
        },
        employee: {
          include: {
            geofences: {
              where: { isActive: true },
            },
            calculationProfile: {
              include: {
                geofences: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
    });

    if (!timeEntry) {
      throw new Error('Time entry ikke fundet');
    }

    if (timeEntry.gpsTracking.length === 0) {
      throw new Error('Ingen GPS data tilgængelig for denne arbejdsdag');
    }

    // Kombiner geofences fra medarbejder og profil
    const allGeofences = [
      ...timeEntry.employee.geofences,
      ...(timeEntry.employee.calculationProfile?.geofences || []),
    ];

    // Opdater isInGeofence status for alle GPS punkter
    await this.updateGeofenceStatus(timeEntry.gpsTracking, allGeofences);

    // Segment GPS data i perioder
    const periods = await this.segmentIntoPeriods(timeEntry.gpsTracking, allGeofences);

    // Kategoriser hver periode
    const workPeriods = periods.map((period) =>
      this.categorizePeriod(period, allGeofences)
    );

    // Beregn total varighed
    const totalDuration =
      timeEntry.endTime && timeEntry.startTime
        ? timeEntry.endTime.getTime() - timeEntry.startTime.getTime()
        : 0;

    return {
      timeEntryId,
      workPeriods,
      totalDuration,
      analysisDate: new Date(),
    };
  }

  /**
   * Opdaterer isInGeofence status for GPS punkter
   */
  private static async updateGeofenceStatus(
    gpsPoints: any[],
    geofences: any[]
  ): Promise<void> {
    for (const point of gpsPoints) {
      const isInGeofence = geofences.some((geofence) => {
        const distance = this.calculateDistance(
          parseFloat(point.latitude.toString()),
          parseFloat(point.longitude.toString()),
          parseFloat(geofence.latitude.toString()),
          parseFloat(geofence.longitude.toString())
        );
        return distance <= geofence.radius;
      });

      if (point.isInGeofence !== isInGeofence) {
        await prisma.gpsTracking.update({
          where: { id: point.id },
          data: { isInGeofence },
        });
      }
    }
  }

  /**
   * Segmenterer GPS data i perioder baseret på aktivitet og placering
   */
  private static async segmentIntoPeriods(
    gpsPoints: any[],
    geofences: any[]
  ): Promise<any[]> {
    const periods: any[] = [];
    let currentPeriod: any = null;

    for (let i = 0; i < gpsPoints.length; i++) {
      const point = gpsPoints[i];
      const speed = point.speed ? parseFloat(point.speed.toString()) : 0;
      const isStationary = speed < this.STATIONARY_SPEED_THRESHOLD;

      // Find geofence for dette punkt
      const geofence = geofences.find((g) => {
        const distance = this.calculateDistance(
          parseFloat(point.latitude.toString()),
          parseFloat(point.longitude.toString()),
          parseFloat(g.latitude.toString()),
          parseFloat(g.longitude.toString())
        );
        return distance <= g.radius;
      });

      // Start ny periode hvis:
      // 1. Første punkt
      // 2. Ændring mellem kørsel og stillestående
      // 3. Ind/ud af geofence
      // 4. Skift mellem forskellige geofences
      if (
        !currentPeriod ||
        currentPeriod.isStationary !== isStationary ||
        currentPeriod.geofenceId !== geofence?.id
      ) {
        if (currentPeriod) {
          periods.push(currentPeriod);
        }

        currentPeriod = {
          startTime: point.timestamp,
          endTime: point.timestamp,
          points: [point],
          isStationary,
          geofenceId: geofence?.id,
          geofenceName: geofence?.name,
          geofenceTaskType: geofence?.taskType,
        };
      } else {
        // Fortsæt nuværende periode
        currentPeriod.endTime = point.timestamp;
        currentPeriod.points.push(point);
      }
    }

    // Tilføj sidste periode
    if (currentPeriod) {
      periods.push(currentPeriod);
    }

    // Filtrer korte perioder væk (under 5 minutter)
    return periods.filter((period) => {
      const duration = period.endTime.getTime() - period.startTime.getTime();
      return duration >= this.MIN_PERIOD_DURATION;
    });
  }

  /**
   * Kategoriser en periode og foreslå arbejdstype
   */
  private static categorizePeriod(period: any, geofences: any[]): WorkPeriod {
    const duration = period.endTime.getTime() - period.startTime.getTime();
    const points = period.points;

    // Beregn gennemsnitshastighed og total distance
    const speeds = points
      .map((p: any) => (p.speed ? parseFloat(p.speed.toString()) : 0))
      .filter((s: number) => s > 0);
    const averageSpeed = speeds.length > 0 ? speeds.reduce((a: number, b: number) => a + b) / speeds.length : 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(
        parseFloat(points[i - 1].latitude.toString()),
        parseFloat(points[i - 1].longitude.toString()),
        parseFloat(points[i].latitude.toString()),
        parseFloat(points[i].longitude.toString())
      );
    }

    // Midtpunkt for perioden
    const midPoint = points[Math.floor(points.length / 2)];
    const location = {
      latitude: parseFloat(midPoint.latitude.toString()),
      longitude: parseFloat(midPoint.longitude.toString()),
    };

    // Kategorisering logik
    let suggestedTaskType: TaskType = 'DRIVING';
    let confidence = 50;
    let reason = '';

    // 1. Prioriter: Hvis i en geofence, brug den arbejdstype
    if (period.geofenceId && period.geofenceTaskType) {
      suggestedTaskType = period.geofenceTaskType;
      confidence = 90;
      reason = `I ${period.geofenceName} geofence zone`;
    }
    // 2. Hvis høj hastighed over længere tid = Kørsel
    else if (averageSpeed >= this.DRIVING_SPEED_THRESHOLD) {
      suggestedTaskType = 'DRIVING';
      confidence = 85;
      reason = `Gennemsnitshastighed ${Math.round(averageSpeed * 3.6)} km/t indikerer kørsel`;
    }
    // 3. Hvis stillestående og ikke i geofence
    else if (period.isStationary && averageSpeed < this.STATIONARY_SPEED_THRESHOLD) {
      // Gæt baseret på varighed
      if (duration > 30 * 60 * 1000) {
        // Over 30 minutter stillestående
        suggestedTaskType = 'TERMINAL_WORK';
        confidence = 60;
        reason = 'Lang periode stillestående - sandsynligvis terminalarbejde';
      } else {
        suggestedTaskType = 'LOADING';
        confidence = 55;
        reason = 'Kort stillestående periode - muligvis lastning/losning';
      }
    }
    // 4. Mellem hastighed
    else {
      suggestedTaskType = 'DISTRIBUTION';
      confidence = 70;
      reason = `Moderat hastighed ${Math.round(averageSpeed * 3.6)} km/t - sandsynligvis distribution`;
    }

    return {
      startTime: period.startTime,
      endTime: period.endTime,
      suggestedTaskType,
      confidence,
      reason,
      location,
      geofenceName: period.geofenceName,
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      distance: Math.round(totalDistance),
    };
  }

  /**
   * Beregn distance mellem to GPS punkter (Haversine formula)
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
