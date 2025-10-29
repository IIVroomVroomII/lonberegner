# GPS Tracking Features - Implementation Guide

## Overview
This document outlines the implementation plan for advanced GPS tracking features in the Lønberegning System. These features enhance the mobile app's ability to track employee work hours, locations, and activities with minimal battery impact and maximum reliability.

## Project Status

### Completed Features
- ✅ **Geofence Management UI** - Backend API for CRUD operations on geofences
- ✅ **Geofence Management Frontend** - Map-based interface for defining work zones
- ✅ **Manual Categorization Backend** - API endpoints for split/merge/bulk operations
- ✅ **Manual Categorization Frontend** - Bulk edit interface with multi-select capabilities

### Features In Progress
- 🟡 **Documentation** - This document (in progress)

### Planned Features
- ❌ **Offline Support** - Queue system and sync logic
- ❌ **Battery Optimization** - Adaptive tracking and smart location updates
- ❌ **GPS Visualization** - Map integration in webapp dashboard
- ❌ **Push Notifications** - Firebase Cloud Messaging setup
- ❌ **Improved GPS Categorization** - ML/historical learning
- ❌ **Reporting & Analytics** - Driving log and export functionality
- ❌ **Smart Alerts & Monitoring** - GPS tracking alerts and quality monitoring

---

## Feature 1: Offline Support

### Objective
Ensure GPS tracking continues when network connectivity is lost, with automatic synchronization when connection is restored.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **Queue Service** (`services/gpsQueueService.ts`)
   - Handle batch uploads of GPS data
   - Validate incoming data integrity
   - Detect and resolve conflicts
   - Implement idempotency keys to prevent duplicates

   ```typescript
   interface QueuedGPSData {
     id: string; // Client-generated UUID
     employeeId: string;
     latitude: number;
     longitude: number;
     accuracy: number;
     timestamp: Date;
     batteryLevel?: number;
     speed?: number;
     heading?: number;
   }

   export class GPSQueueService {
     async processBatch(data: QueuedGPSData[]): Promise<ProcessResult>
     async resolveConflict(clientData: QueuedGPSData, serverData: GPSData): Promise<GPSData>
     async validateBatch(data: QueuedGPSData[]): Promise<ValidationResult>
   }
   ```

2. **Conflict Resolution** (`services/conflictResolutionService.ts`)
   - Server timestamp always wins for conflicts
   - Merge strategies for overlapping time entries
   - Log all conflicts for audit purposes

3. **API Endpoints** (`controllers/gpsQueueController.ts`)
   - `POST /api/v1/gps-tracking/batch-upload` - Upload queued GPS data
   - `GET /api/v1/gps-tracking/sync-status/:employeeId` - Check sync status
   - `POST /api/v1/gps-tracking/resolve-conflict/:id` - Manual conflict resolution

#### Mobile Components
**Location**: `/mobile/lib/`

1. **Local Storage** (`services/offline_storage_service.dart`)
   - Use SQLite via sqflite package
   - Store GPS points with metadata
   - Track sync status per record

   ```dart
   class OfflineStorageService {
     Future<void> storeGPSPoint(GPSPoint point);
     Future<List<GPSPoint>> getUnsyncedPoints();
     Future<void> markAsSynced(String pointId);
     Future<void> clearSyncedPoints();
     Future<int> getQueueSize();
   }
   ```

2. **Sync Service** (`services/sync_service.dart`)
   - Monitor network connectivity
   - Automatic sync on connection restore
   - Retry logic with exponential backoff
   - Batch size limits (max 100 points per request)

   ```dart
   class SyncService {
     Future<void> startSyncMonitoring();
     Future<SyncResult> syncNow();
     Future<void> retryFailed();
     Stream<SyncStatus> get syncStatusStream;
   }
   ```

3. **Connectivity Monitor** (`utils/connectivity_monitor.dart`)
   - Use connectivity_plus package
   - Listen for network changes
   - Trigger sync on connection restore

#### Database Schema Updates
**Location**: `/backend/prisma/schema.prisma`

```prisma
model GPSPoint {
  id            String   @id @default(uuid())
  employeeId    String
  latitude      Float
  longitude     Float
  accuracy      Float
  timestamp     DateTime
  batteryLevel  Float?
  speed         Float?
  heading       Float?
  syncedAt      DateTime?
  conflictId    String?
  createdAt     DateTime @default(now())

  employee      Employee @relation(fields: [employeeId], references: [id])
  conflict      GPSConflict? @relation(fields: [conflictId], references: [id])

  @@index([employeeId, timestamp])
  @@index([syncedAt])
}

model GPSConflict {
  id              String   @id @default(uuid())
  employeeId      String
  clientData      Json
  serverData      Json
  resolvedData    Json?
  status          ConflictStatus @default(PENDING)
  resolvedAt      DateTime?
  resolvedBy      String?
  createdAt       DateTime @default(now())

  gpsPoints       GPSPoint[]

  @@index([employeeId, status])
}

enum ConflictStatus {
  PENDING
  RESOLVED
  REJECTED
}
```

### Implementation Steps

1. **Week 1: Backend Infrastructure**
   - Create database schema migrations
   - Implement GPSQueueService
   - Build batch upload endpoint
   - Add conflict detection logic

2. **Week 2: Mobile Storage**
   - Setup SQLite database
   - Implement OfflineStorageService
   - Add local queue management
   - Create UI indicator for queue size

3. **Week 3: Sync Logic**
   - Build SyncService with retry logic
   - Implement connectivity monitoring
   - Add exponential backoff
   - Create sync status UI

4. **Week 4: Testing & Polish**
   - Test with airplane mode scenarios
   - Verify conflict resolution
   - Performance testing with large queues
   - Update documentation

### Testing Scenarios
- [ ] GPS tracking works in airplane mode
- [ ] Data syncs automatically when online
- [ ] Conflicts are detected and logged
- [ ] Battery usage remains acceptable
- [ ] UI shows sync status clearly
- [ ] Large queues (1000+ points) sync successfully

---

## Feature 2: Battery Optimization

### Objective
Minimize battery drain from GPS tracking through adaptive tracking strategies and intelligent location updates.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **Battery Profile Service** (`services/batteryProfileService.ts`)
   - Define tracking profiles (aggressive, balanced, conservative)
   - Store employee-specific battery preferences
   - Track battery usage statistics

   ```typescript
   enum TrackingProfile {
     AGGRESSIVE = 'AGGRESSIVE',    // High accuracy, frequent updates
     BALANCED = 'BALANCED',         // Medium accuracy, smart intervals
     CONSERVATIVE = 'CONSERVATIVE'  // Low power, infrequent updates
   }

   interface BatteryProfile {
     profileType: TrackingProfile;
     minInterval: number;  // milliseconds
     maxInterval: number;  // milliseconds
     desiredAccuracy: number; // meters
     distanceFilter: number; // meters
     stopTimeout: number; // milliseconds
   }
   ```

2. **API Endpoints** (`controllers/batteryOptimizationController.ts`)
   - `GET /api/v1/gps-tracking/battery-profile/:employeeId` - Get current profile
   - `PUT /api/v1/gps-tracking/battery-profile/:employeeId` - Update profile
   - `GET /api/v1/gps-tracking/battery-stats/:employeeId` - Battery usage stats

#### Mobile Components
**Location**: `/mobile/lib/`

1. **Adaptive Tracking Service** (`services/adaptive_tracking_service.dart`)
   - Dynamic interval adjustment based on movement
   - Geofence-based tracking (active only near work zones)
   - Activity recognition (stationary vs. moving)
   - Battery level monitoring

   ```dart
   class AdaptiveTrackingService {
     // Adjust update interval based on speed and battery
     void adjustTrackingInterval({
       required double speed,
       required double batteryLevel,
       required bool isNearGeofence,
     });

     // Stationary detection to pause tracking
     Future<bool> isStationary();

     // Get current tracking profile
     TrackingProfile getCurrentProfile();

     // Update profile dynamically
     Future<void> updateProfile(TrackingProfile profile);
   }
   ```

2. **Battery Monitor** (`services/battery_monitor_service.dart`)
   - Use battery_plus package
   - Monitor battery level changes
   - Automatically switch profiles at low battery
   - Alert user when battery critical

   ```dart
   class BatteryMonitorService {
     Stream<int> get batteryLevelStream;
     Future<bool> isLowBattery(); // < 20%
     Future<bool> isCriticalBattery(); // < 10%
     Future<void> switchToConservativeMode();
   }
   ```

3. **Location Strategy Manager** (`utils/location_strategy_manager.dart`)
   - Smart interval calculation
   - Geofence proximity detection
   - Motion detection integration

   ```dart
   class LocationStrategyManager {
     // Calculate optimal update interval
     Duration calculateUpdateInterval({
       required double speed,
       required double batteryLevel,
       required bool isMoving,
       required bool isNearGeofence,
     });

     // Determine if tracking should be active
     bool shouldTrack({
       required TimeOfDay currentTime,
       required bool isWorkHours,
       required bool isNearGeofence,
     });
   }
   ```

### Battery Profile Configurations

#### Aggressive Profile
```dart
const aggressiveProfile = BatteryProfile(
  profileType: TrackingProfile.AGGRESSIVE,
  minInterval: 5000,      // 5 seconds
  maxInterval: 30000,     // 30 seconds
  desiredAccuracy: 10,    // 10 meters
  distanceFilter: 20,     // 20 meters
  stopTimeout: 60000,     // 1 minute
);
```

#### Balanced Profile (Default)
```dart
const balancedProfile = BatteryProfile(
  profileType: TrackingProfile.BALANCED,
  minInterval: 30000,     // 30 seconds
  maxInterval: 300000,    // 5 minutes
  desiredAccuracy: 30,    // 30 meters
  distanceFilter: 50,     // 50 meters
  stopTimeout: 300000,    // 5 minutes
);
```

#### Conservative Profile
```dart
const conservativeProfile = BatteryProfile(
  profileType: TrackingProfile.CONSERVATIVE,
  minInterval: 300000,    // 5 minutes
  maxInterval: 900000,    // 15 minutes
  desiredAccuracy: 100,   // 100 meters
  distanceFilter: 200,    // 200 meters
  stopTimeout: 600000,    // 10 minutes
);
```

### Implementation Steps

1. **Week 1: Backend Profiles**
   - Create battery profile schema
   - Implement profile CRUD endpoints
   - Add stats tracking

2. **Week 2: Mobile Monitoring**
   - Implement BatteryMonitorService
   - Add automatic profile switching
   - Create battery usage UI

3. **Week 3: Adaptive Tracking**
   - Build LocationStrategyManager
   - Implement motion detection
   - Add geofence proximity logic

4. **Week 4: Testing & Optimization**
   - Real-world battery testing
   - Profile tuning based on data
   - Performance optimization

### Testing Scenarios
- [ ] Battery usage under 5% per 8-hour shift (balanced mode)
- [ ] Automatic switch to conservative mode at 20% battery
- [ ] Tracking pauses when stationary for 5+ minutes
- [ ] Increased accuracy near geofences
- [ ] Profile changes sync across devices

---

## Feature 3: GPS Visualization

### Objective
Provide administrators with real-time and historical visualization of employee locations and routes on interactive maps.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **Route Service** (`services/routeService.ts`)
   - Aggregate GPS points into routes
   - Calculate route statistics (distance, duration)
   - Detect stops and waypoints

   ```typescript
   interface Route {
     id: string;
     employeeId: string;
     startTime: Date;
     endTime: Date;
     points: GPSPoint[];
     distance: number; // meters
     duration: number; // seconds
     stops: Stop[];
     geofenceVisits: GeofenceVisit[];
   }

   interface Stop {
     location: { lat: number; lng: number };
     arrivalTime: Date;
     departureTime: Date;
     duration: number;
     matchedGeofence?: string;
   }
   ```

2. **API Endpoints** (`controllers/gpsVisualizationController.ts`)
   - `GET /api/v1/gps-tracking/routes/:employeeId` - Get employee routes
   - `GET /api/v1/gps-tracking/route/:routeId` - Get specific route details
   - `GET /api/v1/gps-tracking/live/:employeeId` - Real-time location stream
   - `GET /api/v1/gps-tracking/heatmap` - Generate heatmap data
   - `GET /api/v1/gps-tracking/timeline/:employeeId` - Activity timeline

#### Webapp Components
**Location**: `/webapp/src/`

1. **Map Component** (`components/GPS/MapView.tsx`)
   - Use Leaflet or Mapbox GL JS
   - Display multiple employee locations
   - Show geofence boundaries
   - Render routes with time markers

   ```typescript
   interface MapViewProps {
     employees: Employee[];
     geofences: Geofence[];
     selectedRoute?: Route;
     showHeatmap?: boolean;
     onPointClick?: (point: GPSPoint) => void;
   }
   ```

2. **Route Timeline** (`components/GPS/RouteTimeline.tsx`)
   - Chronological view of activities
   - Visual timeline with geofence entries/exits
   - Click to jump to map location
   - Export route details

3. **Live Tracking** (`components/GPS/LiveTracking.tsx`)
   - WebSocket connection for real-time updates
   - Auto-refresh every 30 seconds
   - Show last update timestamp
   - Battery level indicator

4. **Heatmap View** (`components/GPS/HeatmapView.tsx`)
   - Density visualization
   - Time-based filtering
   - Export as image

5. **GPS Dashboard Page** (`pages/GPSDashboardPage.tsx`)
   - Integrate all GPS components
   - Employee filter
   - Date range selector
   - Export functionality

### Map Technologies

#### Option 1: Leaflet (Recommended)
```typescript
// Lightweight, open-source
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = L.map('map').setView([56.26392, 9.501785], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
```

**Pros**:
- Free and open-source
- Lightweight (~40KB)
- Extensive plugin ecosystem
- No API keys required

**Cons**:
- Less modern styling
- Manual route optimization needed

#### Option 2: Mapbox GL JS
```typescript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [9.501785, 56.26392],
  zoom: 13
});
```

**Pros**:
- Modern vector tiles
- Beautiful styling
- Built-in route optimization
- Real-time traffic data

**Cons**:
- Requires API key
- Cost at scale (free tier: 50k loads/month)

### Implementation Steps

1. **Week 1: Backend Routes**
   - Implement RouteService
   - Build route aggregation logic
   - Create visualization endpoints

2. **Week 2: Map Integration**
   - Choose map provider
   - Setup MapView component
   - Display static routes

3. **Week 3: Live Tracking**
   - Implement WebSocket endpoint
   - Build real-time updates
   - Add auto-refresh

4. **Week 4: Advanced Features**
   - Heatmap visualization
   - Route timeline
   - Export functionality

### Testing Scenarios
- [ ] Map loads in < 2 seconds
- [ ] Routes render correctly for 100+ points
- [ ] Live tracking updates every 30s
- [ ] Geofences display with correct boundaries
- [ ] Heatmap generates in < 5 seconds
- [ ] Export works for large datasets

---

## Feature 4: Push Notifications

### Objective
Enable real-time notifications for GPS-related events such as geofence entries/exits, tracking anomalies, and system alerts.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **FCM Service** (`services/fcmService.ts`)
   - Firebase Cloud Messaging integration
   - Device token management
   - Topic-based subscriptions
   - Notification templates

   ```typescript
   interface NotificationPayload {
     title: string;
     body: string;
     data?: Record<string, any>;
     priority?: 'high' | 'normal';
     sound?: string;
   }

   export class FCMService {
     async sendToDevice(deviceToken: string, payload: NotificationPayload): Promise<void>
     async sendToTopic(topic: string, payload: NotificationPayload): Promise<void>
     async subscribeToTopic(deviceToken: string, topic: string): Promise<void>
     async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<void>
   }
   ```

2. **Notification Service** (`services/notificationService.ts`)
   - Event-driven notification triggers
   - User preference management
   - Notification history
   - Rate limiting

   ```typescript
   enum NotificationType {
     GEOFENCE_ENTRY = 'GEOFENCE_ENTRY',
     GEOFENCE_EXIT = 'GEOFENCE_EXIT',
     SHIFT_START_REMINDER = 'SHIFT_START_REMINDER',
     SHIFT_END_REMINDER = 'SHIFT_END_REMINDER',
     GPS_TRACKING_DISABLED = 'GPS_TRACKING_DISABLED',
     LOW_BATTERY_WARNING = 'LOW_BATTERY_WARNING',
     OFFLINE_MODE_ENABLED = 'OFFLINE_MODE_ENABLED',
     SYNC_COMPLETED = 'SYNC_COMPLETED',
     TIME_ENTRY_APPROVED = 'TIME_ENTRY_APPROVED',
     TIME_ENTRY_REJECTED = 'TIME_ENTRY_REJECTED',
   }

   interface NotificationPreferences {
     employeeId: string;
     enabledTypes: NotificationType[];
     quietHoursStart?: string;
     quietHoursEnd?: string;
     soundEnabled: boolean;
     vibrationEnabled: boolean;
   }
   ```

3. **API Endpoints** (`controllers/notificationController.ts`)
   - `POST /api/v1/notifications/register-device` - Register FCM token
   - `GET /api/v1/notifications/preferences/:employeeId` - Get preferences
   - `PUT /api/v1/notifications/preferences/:employeeId` - Update preferences
   - `GET /api/v1/notifications/history/:employeeId` - Notification history
   - `POST /api/v1/notifications/test/:employeeId` - Send test notification

#### Mobile Components
**Location**: `/mobile/lib/`

1. **FCM Setup** (`services/fcm_service.dart`)
   - Use firebase_messaging package
   - Handle foreground/background notifications
   - Custom notification sounds
   - Action buttons

   ```dart
   class FCMService {
     Future<void> initialize();
     Future<String?> getDeviceToken();
     Future<void> subscribeToTopic(String topic);
     Stream<RemoteMessage> get onMessageStream;
     Future<void> handleBackgroundMessage(RemoteMessage message);
   }
   ```

2. **Notification Handler** (`services/notification_handler_service.dart`)
   - Parse notification data
   - Navigate to relevant screen
   - Update local state
   - Track notification interactions

   ```dart
   class NotificationHandlerService {
     Future<void> handleNotification(RemoteMessage message);
     Future<void> handleBackgroundNotification(RemoteMessage message);
     Future<void> navigateToScreen(String route, Map<String, dynamic> params);
   }
   ```

3. **Notification Preferences UI** (`screens/NotificationPreferencesScreen.dart`)
   - Toggle notification types
   - Set quiet hours
   - Sound/vibration settings
   - Test notification button

#### Firebase Setup
**Location**: `/mobile/android/` and `/mobile/ios/`

1. **Firebase Project Configuration**
   - Create Firebase project
   - Add Android app with package name
   - Download google-services.json
   - Add iOS app with bundle ID
   - Download GoogleService-Info.plist

2. **Android Configuration**
   ```gradle
   // android/app/build.gradle
   dependencies {
     implementation platform('com.google.firebase:firebase-bom:32.0.0')
     implementation 'com.google.firebase:firebase-messaging'
   }
   ```

3. **iOS Configuration**
   ```swift
   // ios/Runner/AppDelegate.swift
   import Firebase

   FirebaseApp.configure()
   UNUserNotificationCenter.current().delegate = self
   ```

### Notification Templates

#### Geofence Entry
```json
{
  "title": "Arbejde startet",
  "body": "Du er ankommet til {{geofenceName}}",
  "data": {
    "type": "GEOFENCE_ENTRY",
    "geofenceId": "{{geofenceId}}",
    "timestamp": "{{timestamp}}"
  }
}
```

#### Shift Reminder
```json
{
  "title": "Påmindelse: Vagt starter snart",
  "body": "Din vagt starter om 15 minutter",
  "data": {
    "type": "SHIFT_START_REMINDER",
    "shiftId": "{{shiftId}}"
  }
}
```

#### Low Battery Warning
```json
{
  "title": "Lavt batteriniveau",
  "body": "GPS tracking skifter til batterisparetilstand ({{batteryLevel}}%)",
  "data": {
    "type": "LOW_BATTERY_WARNING",
    "batteryLevel": "{{batteryLevel}}"
  }
}
```

### Implementation Steps

1. **Week 1: Firebase Setup**
   - Create Firebase project
   - Configure Android/iOS apps
   - Implement FCMService backend
   - Register device tokens

2. **Week 2: Notification Logic**
   - Build NotificationService
   - Implement event triggers
   - Create notification templates
   - Add preference management

3. **Week 3: Mobile Integration**
   - Setup firebase_messaging
   - Implement FCMService mobile
   - Handle foreground/background
   - Add preferences UI

4. **Week 4: Testing & Polish**
   - Test all notification types
   - Verify background delivery
   - Test quiet hours
   - Performance testing

### Testing Scenarios
- [ ] Notifications received in foreground
- [ ] Notifications received in background
- [ ] Notifications received when app is killed
- [ ] Quiet hours respected
- [ ] Preferences sync across devices
- [ ] Action buttons work correctly

---

## Feature 5: Improved GPS Categorization

### Objective
Automatically categorize work activities (driving, terminal work, distribution, etc.) using machine learning and historical patterns.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **ML Categorization Service** (`services/mlCategorizationService.ts`)
   - Training data collection
   - Feature extraction
   - Model inference
   - Confidence scoring

   ```typescript
   interface CategorizationFeatures {
     speed: number;
     acceleration: number;
     geofenceType?: string;
     timeOfDay: number;
     dayOfWeek: number;
     distanceFromPreviousPoint: number;
     stayDuration?: number;
   }

   interface CategorizationResult {
     taskType: TaskType;
     confidence: number;
     features: CategorizationFeatures;
     alternativePredictions: Array<{
       taskType: TaskType;
       confidence: number;
     }>;
   }

   export class MLCategorizationService {
     async categorize(gpsPoints: GPSPoint[]): Promise<CategorizationResult>
     async trainModel(trainingData: TrainingDataPoint[]): Promise<void>
     async evaluateModel(): Promise<ModelMetrics>
   }
   ```

2. **Historical Pattern Service** (`services/historicalPatternService.ts`)
   - Learn from manual corrections
   - Identify recurring routes
   - Build employee-specific patterns
   - Time-based activity profiles

   ```typescript
   interface EmployeePattern {
     employeeId: string;
     route: { lat: number; lng: number }[];
     taskType: TaskType;
     frequency: number;
     avgDuration: number;
     typicalStartTime: string;
   }

   export class HistoricalPatternService {
     async getEmployeePatterns(employeeId: string): Promise<EmployeePattern[]>
     async matchPattern(route: GPSPoint[]): Promise<EmployeePattern | null>
     async updatePatternsFromCorrections(corrections: ManualCorrection[]): Promise<void>
   }
   ```

3. **Rule-Based Classifier** (`services/ruleBasedClassifier.ts`)
   - Fallback for low-confidence ML predictions
   - Simple heuristics based on speed, location, time
   - Geofence-based classification

   ```typescript
   export class RuleBasedClassifier {
     classify(features: CategorizationFeatures): TaskType {
       // Speed-based rules
       if (features.speed > 30) return TaskType.DRIVING;
       if (features.speed < 5 && features.stayDuration > 300) {
         // Check geofence type
         if (features.geofenceType === 'TERMINAL') return TaskType.TERMINAL_WORK;
         if (features.geofenceType === 'DISTRIBUTION') return TaskType.DISTRIBUTION;
       }
       return TaskType.UNKNOWN;
     }
   }
   ```

4. **API Endpoints** (`controllers/categorizationController.ts`)
   - `POST /api/v1/categorization/predict` - Get categorization prediction
   - `POST /api/v1/categorization/train` - Trigger model training
   - `GET /api/v1/categorization/patterns/:employeeId` - Get employee patterns
   - `POST /api/v1/categorization/feedback` - Submit correction feedback
   - `GET /api/v1/categorization/metrics` - Model performance metrics

#### Machine Learning Approach

##### Option 1: Simple Rule-Based + Statistical (Recommended for MVP)
```typescript
// Weighted scoring based on features
function calculateTaskScore(features: CategorizationFeatures, taskType: TaskType): number {
  let score = 0;

  // Speed-based scoring
  if (taskType === TaskType.DRIVING) {
    score += features.speed > 30 ? 0.4 : -0.2;
  } else if (taskType === TaskType.TERMINAL_WORK) {
    score += features.speed < 5 ? 0.3 : -0.1;
  }

  // Geofence-based scoring
  if (features.geofenceType === taskType) {
    score += 0.5;
  }

  // Time-of-day patterns (learned from history)
  const historicalProbability = getHistoricalProbability(
    features.timeOfDay,
    features.dayOfWeek,
    taskType
  );
  score += historicalProbability * 0.3;

  return score;
}
```

##### Option 2: TensorFlow.js (Advanced)
```typescript
import * as tf from '@tensorflow/tfjs-node';

export class TensorFlowCategorizer {
  private model: tf.LayersModel | null = null;

  async loadModel(): Promise<void> {
    this.model = await tf.loadLayersModel('file://./models/categorization/model.json');
  }

  async predict(features: CategorizationFeatures): Promise<CategorizationResult> {
    const input = tf.tensor2d([[
      features.speed,
      features.acceleration,
      features.timeOfDay,
      features.dayOfWeek,
      features.distanceFromPreviousPoint,
      features.stayDuration || 0
    ]]);

    const prediction = this.model!.predict(input) as tf.Tensor;
    const probabilities = await prediction.data();

    // Map to task types and return top prediction
    return this.mapPredictionToResult(probabilities);
  }
}
```

#### Mobile Components
**Location**: `/mobile/lib/`

1. **Feature Extraction** (`utils/feature_extractor.dart`)
   - Calculate speed and acceleration
   - Determine geofence proximity
   - Extract time-based features

   ```dart
   class FeatureExtractor {
     CategorizationFeatures extractFeatures({
       required List<GPSPoint> points,
       Geofence? nearbyGeofence,
     }) {
       final speed = calculateSpeed(points);
       final acceleration = calculateAcceleration(points);

       return CategorizationFeatures(
         speed: speed,
         acceleration: acceleration,
         geofenceType: nearbyGeofence?.type,
         timeOfDay: DateTime.now().hour,
         dayOfWeek: DateTime.now().weekday,
         distanceFromPreviousPoint: calculateDistance(points),
       );
     }
   }
   ```

2. **Auto-Categorization UI** (`components/auto_categorization_indicator.dart`)
   - Show predicted task type
   - Display confidence level
   - Quick correction button
   - Manual override option

### Training Data Collection

#### Schema for Training Data
```prisma
model TrainingDataPoint {
  id            String   @id @default(uuid())
  employeeId    String
  gpsPoints     Json     // Array of GPS points
  features      Json     // Extracted features
  taskType      TaskType // Ground truth label
  confidence    Float?   // Model confidence when predicted
  source        DataSource // MANUAL_CORRECTION, GEOFENCE, HISTORICAL
  createdAt     DateTime @default(now())

  @@index([employeeId, createdAt])
  @@index([taskType])
}

enum DataSource {
  MANUAL_CORRECTION
  GEOFENCE
  HISTORICAL_PATTERN
  USER_CONFIRMED
}
```

#### Data Collection Strategy
1. **Bootstrap with Geofence Data**: Use geofence-based categorization as initial training data
2. **Manual Corrections**: Every manual correction becomes a training sample
3. **User Confirmations**: Ask users to confirm auto-categorizations periodically
4. **Active Learning**: Request labels for low-confidence predictions

### Implementation Steps

1. **Week 1-2: Rule-Based System**
   - Implement RuleBasedClassifier
   - Add feature extraction
   - Create prediction endpoint
   - Build UI for predictions

2. **Week 3-4: Historical Patterns**
   - Implement HistoricalPatternService
   - Collect training data
   - Build pattern matching
   - Add feedback loop

3. **Week 5-6: ML Integration (Optional)**
   - Setup TensorFlow.js
   - Train initial model
   - Deploy model inference
   - A/B test against rules

4. **Week 7-8: Optimization**
   - Tune confidence thresholds
   - Improve feature engineering
   - Add employee-specific models
   - Performance optimization

### Testing Scenarios
- [ ] 80%+ accuracy on categorization
- [ ] < 1s prediction latency
- [ ] Manual corrections improve accuracy
- [ ] Patterns learned within 2 weeks
- [ ] Confidence scores are calibrated
- [ ] Low-confidence predictions flagged

---

## Feature 6: Reporting & Analytics

### Objective
Provide comprehensive reporting on GPS tracking data, driving logs, work patterns, and productivity metrics.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **Report Service** (`services/reportService.ts`)
   - Generate various report types
   - Aggregate GPS data
   - Calculate statistics
   - Export in multiple formats

   ```typescript
   enum ReportType {
     DRIVING_LOG = 'DRIVING_LOG',
     WORK_SUMMARY = 'WORK_SUMMARY',
     GEOFENCE_VISITS = 'GEOFENCE_VISITS',
     TIME_DISTRIBUTION = 'TIME_DISTRIBUTION',
     ROUTE_EFFICIENCY = 'ROUTE_EFFICIENCY',
     EMPLOYEE_COMPARISON = 'EMPLOYEE_COMPARISON'
   }

   interface ReportParams {
     type: ReportType;
     employeeIds?: string[];
     startDate: Date;
     endDate: Date;
     groupBy?: 'day' | 'week' | 'month';
     format?: 'json' | 'csv' | 'pdf';
   }

   interface DrivingLogEntry {
     date: Date;
     startTime: Date;
     endTime: Date;
     startLocation: string;
     endLocation: string;
     distance: number;
     duration: number;
     purpose: TaskType;
   }
   ```

2. **Analytics Service** (`services/analyticsService.ts`)
   - Calculate KPIs
   - Trend analysis
   - Anomaly detection
   - Productivity metrics

   ```typescript
   interface ProductivityMetrics {
     employeeId: string;
     period: { start: Date; end: Date };
     totalWorkHours: number;
     totalDrivingHours: number;
     totalDistance: number;
     avgSpeedWhileDriving: number;
     geofenceVisits: number;
     efficiencyScore: number; // 0-100
     trendsComparedToLastPeriod: {
       workHours: number; // % change
       drivingHours: number;
       distance: number;
     };
   }
   ```

3. **Export Service** (`services/exportService.ts`)
   - CSV export
   - PDF generation
   - Excel export
   - Email delivery

   ```typescript
   export class ExportService {
     async exportToPDF(report: Report): Promise<Buffer>
     async exportToCSV(report: Report): Promise<string>
     async exportToExcel(report: Report): Promise<Buffer>
     async emailReport(report: Report, recipients: string[]): Promise<void>
   }
   ```

4. **API Endpoints** (`controllers/reportController.ts`)
   - `POST /api/v1/reports/generate` - Generate report
   - `GET /api/v1/reports/:id` - Get saved report
   - `GET /api/v1/reports/list/:employeeId` - List reports
   - `POST /api/v1/reports/:id/export` - Export report
   - `GET /api/v1/analytics/productivity/:employeeId` - Get productivity metrics
   - `GET /api/v1/analytics/trends` - Get trend analysis

#### Webapp Components
**Location**: `/webapp/src/`

1. **Reports Page** (`pages/ReportsPage.tsx`)
   - Report type selector
   - Date range picker
   - Employee filter
   - Generate button
   - Report preview

   ```typescript
   interface ReportsPageState {
     reportType: ReportType;
     dateRange: { start: Date; end: Date };
     selectedEmployees: string[];
     loading: boolean;
     generatedReport?: Report;
   }
   ```

2. **Report Components**
   - `DrivingLogReport.tsx` - Driving log table
   - `WorkSummaryReport.tsx` - Work hours summary
   - `GeofenceVisitsReport.tsx` - Geofence visit history
   - `TimeDistributionChart.tsx` - Task type distribution pie chart
   - `RouteEfficiencyReport.tsx` - Route optimization analysis
   - `EmployeeComparisonChart.tsx` - Multi-employee comparison

3. **Analytics Dashboard** (`pages/AnalyticsDashboard.tsx`)
   - KPI cards
   - Trend charts
   - Productivity heatmap
   - Export buttons

### Report Templates

#### 1. Driving Log (Kørselsdagbog)
```typescript
interface DrivingLog {
  employee: {
    name: string;
    employeeNumber: string;
  };
  period: { start: Date; end: Date };
  entries: DrivingLogEntry[];
  summary: {
    totalDistance: number;
    totalDuration: number;
    totalTrips: number;
    avgTripDistance: number;
  };
}
```

**Export Format (CSV)**:
```csv
Dato,Starttidspunkt,Sluttidspunkt,Start lokation,Slut lokation,Distance (km),Varighed (timer),Formål
2025-10-29,08:00,09:30,Terminal Aarhus,Kunde A,45.3,1.5,Distribution
2025-10-29,09:30,10:00,Kunde A,Kunde B,12.7,0.5,Distribution
```

#### 2. Work Summary
```typescript
interface WorkSummary {
  employee: {
    name: string;
    employeeNumber: string;
  };
  period: { start: Date; end: Date };
  breakdown: {
    taskType: TaskType;
    hours: number;
    percentage: number;
  }[];
  totalHours: number;
}
```

#### 3. Geofence Visits
```typescript
interface GeofenceVisitsReport {
  geofence: {
    name: string;
    type: string;
  };
  visits: {
    employeeName: string;
    entryTime: Date;
    exitTime: Date;
    duration: number;
    taskType: TaskType;
  }[];
  summary: {
    totalVisits: number;
    totalDuration: number;
    avgDuration: number;
    uniqueEmployees: number;
  };
}
```

### Implementation Steps

1. **Week 1-2: Backend Reports**
   - Implement ReportService
   - Build report generation logic
   - Create export functions
   - Add API endpoints

2. **Week 3-4: Analytics**
   - Implement AnalyticsService
   - Calculate productivity metrics
   - Add trend analysis
   - Build aggregation queries

3. **Week 5-6: Frontend UI**
   - Create ReportsPage
   - Build report components
   - Add data visualization
   - Implement export buttons

4. **Week 7-8: Advanced Features**
   - Scheduled reports
   - Email delivery
   - Custom report builder
   - Dashboard widgets

### Testing Scenarios
- [ ] Reports generate in < 5 seconds for 1 month data
- [ ] CSV export works for 10k+ entries
- [ ] PDF generation includes all sections
- [ ] Charts render correctly
- [ ] Scheduled reports send on time
- [ ] Email delivery successful

---

## Feature 7: Smart Alerts & Monitoring

### Objective
Proactively monitor GPS tracking quality, detect anomalies, and alert administrators to potential issues.

### Technical Requirements

#### Backend Components
**Location**: `/backend/src/`

1. **Alert Service** (`services/alertService.ts`)
   - Define alert rules
   - Monitor tracking quality
   - Send notifications
   - Alert history

   ```typescript
   enum AlertType {
     GPS_TRACKING_DISABLED = 'GPS_TRACKING_DISABLED',
     POOR_GPS_ACCURACY = 'POOR_GPS_ACCURACY',
     MISSING_GPS_DATA = 'MISSING_GPS_DATA',
     GEOFENCE_EXIT_WITHOUT_ENTRY = 'GEOFENCE_EXIT_WITHOUT_ENTRY',
     UNUSUAL_ROUTE = 'UNUSUAL_ROUTE',
     LONG_STATIONARY_PERIOD = 'LONG_STATIONARY_PERIOD',
     HIGH_SPEED_ALERT = 'HIGH_SPEED_ALERT',
     DEVICE_OFFLINE = 'DEVICE_OFFLINE',
     SYNC_FAILURE = 'SYNC_FAILURE'
   }

   interface Alert {
     id: string;
     type: AlertType;
     severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
     employeeId: string;
     message: string;
     data: Record<string, any>;
     status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
     createdAt: Date;
     acknowledgedAt?: Date;
     resolvedAt?: Date;
   }
   ```

2. **Monitoring Service** (`services/monitoringService.ts`)
   - Real-time data quality checks
   - Anomaly detection
   - Threshold monitoring
   - Health checks

   ```typescript
   interface MonitoringMetrics {
     employeeId: string;
     gpsDataQuality: number; // 0-100
     lastUpdateTimestamp: Date;
     avgAccuracy: number;
     trackingUptime: number; // percentage
     syncHealth: {
       pendingPoints: number;
       lastSyncTime: Date;
       failedSyncs: number;
     };
   }

   export class MonitoringService {
     async checkGPSQuality(employeeId: string): Promise<MonitoringMetrics>
     async detectAnomalies(gpsPoints: GPSPoint[]): Promise<Alert[]>
     async monitorDeviceHealth(): Promise<void>
   }
   ```

3. **Anomaly Detection** (`services/anomalyDetectionService.ts`)
   - Statistical outlier detection
   - Pattern-based anomalies
   - Threshold violations

   ```typescript
   export class AnomalyDetectionService {
     // Detect unusually high speed
     detectSpeedAnomaly(gpsPoints: GPSPoint[]): Alert | null {
       const speeds = gpsPoints.map(p => p.speed || 0);
       const avgSpeed = mean(speeds);
       const stdDev = standardDeviation(speeds);

       const highSpeedPoints = gpsPoints.filter(
         p => (p.speed || 0) > avgSpeed + 2 * stdDev
       );

       if (highSpeedPoints.length > 0) {
         return createAlert(AlertType.HIGH_SPEED_ALERT, ...);
       }
       return null;
     }

     // Detect missing data gaps
     detectMissingData(employeeId: string): Alert | null

     // Detect unusual routes
     detectUnusualRoute(route: GPSPoint[]): Alert | null
   }
   ```

4. **API Endpoints** (`controllers/alertController.ts`)
   - `GET /api/v1/alerts/active` - Get active alerts
   - `GET /api/v1/alerts/history/:employeeId` - Alert history
   - `POST /api/v1/alerts/:id/acknowledge` - Acknowledge alert
   - `POST /api/v1/alerts/:id/resolve` - Resolve alert
   - `GET /api/v1/monitoring/health` - System health check
   - `GET /api/v1/monitoring/metrics/:employeeId` - Employee metrics

#### Webapp Components
**Location**: `/webapp/src/`

1. **Alerts Dashboard** (`pages/AlertsDashboard.tsx`)
   - Alert list with filters
   - Severity indicators
   - Quick actions (acknowledge/resolve)
   - Alert details modal

   ```typescript
   interface AlertsDashboardState {
     alerts: Alert[];
     filter: {
       severity?: AlertSeverity;
       type?: AlertType;
       status?: AlertStatus;
       employeeId?: string;
     };
     selectedAlert?: Alert;
   }
   ```

2. **Monitoring Dashboard** (`pages/MonitoringDashboard.tsx`)
   - System health overview
   - GPS quality metrics
   - Device status grid
   - Real-time updates

   ```typescript
   interface MonitoringDashboardState {
     employees: EmployeeMonitoringStatus[];
     systemHealth: {
       activeDevices: number;
       offlineDevices: number;
       avgGPSQuality: number;
       syncHealth: number;
     };
   }
   ```

3. **Alert Components**
   - `AlertCard.tsx` - Individual alert display
   - `AlertList.tsx` - List of alerts
   - `AlertDetailModal.tsx` - Detailed alert view
   - `AlertNotificationBadge.tsx` - Badge with count

### Alert Rules Configuration

```typescript
interface AlertRule {
  type: AlertType;
  enabled: boolean;
  threshold?: number;
  checkInterval: number; // seconds
  notifyChannels: ('EMAIL' | 'PUSH' | 'SMS')[];
  recipients: string[];
}

const defaultAlertRules: AlertRule[] = [
  {
    type: AlertType.GPS_TRACKING_DISABLED,
    enabled: true,
    checkInterval: 300, // 5 minutes
    notifyChannels: ['EMAIL', 'PUSH'],
    recipients: ['admin@company.com']
  },
  {
    type: AlertType.POOR_GPS_ACCURACY,
    enabled: true,
    threshold: 100, // meters
    checkInterval: 600,
    notifyChannels: ['EMAIL'],
    recipients: ['admin@company.com']
  },
  {
    type: AlertType.HIGH_SPEED_ALERT,
    enabled: true,
    threshold: 130, // km/h
    checkInterval: 60,
    notifyChannels: ['EMAIL', 'PUSH'],
    recipients: ['safety@company.com']
  }
];
```

### Implementation Steps

1. **Week 1-2: Alert Infrastructure**
   - Implement AlertService
   - Create alert database schema
   - Build alert creation/management
   - Add API endpoints

2. **Week 3-4: Monitoring Logic**
   - Implement MonitoringService
   - Add quality checks
   - Build anomaly detection
   - Create health checks

3. **Week 5-6: Frontend Dashboards**
   - Create AlertsDashboard
   - Build MonitoringDashboard
   - Add real-time updates
   - Implement alert actions

4. **Week 7-8: Advanced Features**
   - Alert rule configuration UI
   - Custom alert thresholds
   - Alert aggregation
   - Performance optimization

### Testing Scenarios
- [ ] Alerts trigger within 1 minute of condition
- [ ] Email notifications sent successfully
- [ ] Push notifications delivered
- [ ] Alert acknowledgment works
- [ ] Dashboard updates in real-time
- [ ] False positive rate < 5%

---

## Implementation Timeline

### Overall Schedule (20 weeks)

#### Phase 1: Offline & Battery (Weeks 1-8)
- **Weeks 1-4**: Offline Support
- **Weeks 5-8**: Battery Optimization

#### Phase 2: Visualization & Notifications (Weeks 9-16)
- **Weeks 9-12**: GPS Visualization
- **Weeks 13-16**: Push Notifications

#### Phase 3: Intelligence & Analytics (Weeks 17-24)
- **Weeks 17-24**: Improved GPS Categorization
- **Weeks 25-32**: Reporting & Analytics

#### Phase 4: Monitoring & Polish (Weeks 33-40)
- **Weeks 33-40**: Smart Alerts & Monitoring
- **Weeks 41-44**: Testing, optimization, and documentation

### Resource Requirements

#### Development Team
- 1x Backend Developer (Node.js/TypeScript)
- 1x Mobile Developer (Flutter/Dart)
- 1x Frontend Developer (React/TypeScript)
- 0.5x DevOps Engineer (Firebase, Heroku)
- 0.5x ML Engineer (for advanced categorization)

#### Infrastructure
- Firebase project for FCM
- Heroku production dyno
- PostgreSQL database
- Map API credits (Mapbox or Google Maps)
- Email service (SendGrid or similar)

#### Third-Party Services
- Firebase Cloud Messaging (free tier: unlimited)
- Mapbox (free tier: 50k loads/month) or Leaflet (free)
- SendGrid (free tier: 100 emails/day)
- Sentry for error tracking (optional)

---

## Success Metrics

### Key Performance Indicators

#### Offline Support
- ✅ 99% GPS data retention during offline periods
- ✅ < 5 minute sync time for 24 hours of data
- ✅ < 0.1% conflict rate

#### Battery Optimization
- ✅ < 5% battery drain per 8-hour shift (balanced mode)
- ✅ < 10% battery drain per 8-hour shift (aggressive mode)
- ✅ 50% reduction vs. always-on tracking

#### GPS Visualization
- ✅ < 2 second map load time
- ✅ Smooth rendering for 1000+ GPS points
- ✅ Real-time updates within 30 seconds

#### Push Notifications
- ✅ 99%+ delivery rate
- ✅ < 5 second delivery latency
- ✅ < 1% false notification rate

#### GPS Categorization
- ✅ 80%+ accuracy within 1 month
- ✅ 90%+ accuracy after 3 months
- ✅ < 1 second prediction time

#### Reporting & Analytics
- ✅ < 5 second report generation
- ✅ Export works for 10k+ entries
- ✅ 100% data accuracy

#### Smart Alerts
- ✅ < 1 minute alert latency
- ✅ < 5% false positive rate
- ✅ 95%+ actionable alerts

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Battery drain too high | High | Medium | Extensive testing, adaptive profiles, conservative defaults |
| GPS accuracy issues | High | Medium | Geofence buffers, manual correction UI, confidence scoring |
| Offline sync conflicts | Medium | Medium | Server-timestamp-wins strategy, conflict UI |
| ML categorization poor accuracy | Medium | High | Start with rule-based, gradual ML integration, manual override |
| Map API costs | Medium | Low | Use Leaflet (free), optimize tile loading, cache aggressively |
| Notification delivery issues | Medium | Low | Retry logic, multiple channels, delivery tracking |
| Performance at scale | High | Medium | Database indexing, query optimization, pagination |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User adoption low | High | Medium | User training, clear value proposition, gradual rollout |
| Privacy concerns | High | Low | Clear privacy policy, opt-in tracking, data retention limits |
| Integration complexity | Medium | Medium | Modular architecture, comprehensive testing |
| Maintenance burden | Medium | High | Good documentation, automated monitoring, error tracking |

---

## Appendix

### Technology Stack Summary

#### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Hosting**: Heroku
- **Authentication**: JWT
- **ML**: TensorFlow.js (optional)

#### Mobile
- **Framework**: Flutter 3.24+
- **Language**: Dart
- **State Management**: Provider/Riverpod
- **Local Storage**: SQLite (sqflite)
- **Background Tasks**: flutter_background_service
- **Notifications**: firebase_messaging
- **Location**: geolocator, flutter_background_geolocation

#### Webapp
- **Framework**: React 18+
- **Language**: TypeScript
- **UI Library**: Material-UI
- **Maps**: Leaflet or Mapbox GL JS
- **Charts**: Recharts or Chart.js
- **State Management**: React Context/Redux

### Useful Resources

- **Flutter Background Location**: https://pub.dev/packages/flutter_background_geolocation
- **Firebase Cloud Messaging**: https://firebase.google.com/docs/cloud-messaging
- **Leaflet Maps**: https://leafletjs.com/
- **TensorFlow.js**: https://www.tensorflow.org/js
- **Prisma ORM**: https://www.prisma.io/

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Author**: Development Team
**Status**: In Progress
