import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../models/gps_tracking.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

class GpsTrackingService {
  final LocationService _locationService = LocationService();
  StreamSubscription<Position>? _positionStreamSubscription;
  final List<GpsTracking> _localCache = [];
  String? _currentTimeEntryId;
  String? _authToken;

  static const int trackingIntervalSeconds = 30; // Track every 30 seconds
  static const int batchUploadSize = 10; // Upload every 10 points
  static const double stationarySpeedThreshold = 1.0; // m/s ≈ 3.6 km/h

  bool get isTracking => _positionStreamSubscription != null;

  Future<bool> startTracking(String timeEntryId, String authToken) async {
    if (isTracking) {
      if (kDebugMode) {
        print('GPS tracking already running');
      }
      return false;
    }

    // Check permissions
    final hasPermission = await _locationService.checkPermissions();
    if (!hasPermission) {
      if (kDebugMode) {
        print('Location permission denied');
      }
      return false;
    }

    _currentTimeEntryId = timeEntryId;
    _authToken = authToken;
    _localCache.clear();

    // Configure location settings
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Update if moved at least 10 meters
      timeLimit: Duration(seconds: trackingIntervalSeconds),
    );

    if (kDebugMode) {
      print('Starting GPS tracking for time entry: $timeEntryId');
    }

    // Start listening to position stream
    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        _handleNewPosition(position);
      },
      onError: (error) {
        if (kDebugMode) {
          print('GPS tracking error: $error');
        }
      },
    );

    return true;
  }

  void _handleNewPosition(Position position) {
    if (_currentTimeEntryId == null) return;

    // Determine if stationary based on speed
    final isStationary = position.speed < stationarySpeedThreshold;

    final gpsPoint = GpsTracking(
      timeEntryId: _currentTimeEntryId!,
      timestamp: DateTime.now(),
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      speed: position.speed,
      heading: position.heading,
      isStationary: isStationary,
    );

    _localCache.add(gpsPoint);

    if (kDebugMode) {
      print(
          'GPS point captured: (${position.latitude}, ${position.longitude}) - Speed: ${position.speed} m/s');
    }

    // Upload batch if cache is large enough
    if (_localCache.length >= batchUploadSize) {
      _uploadBatch();
    }
  }

  Future<void> _uploadBatch() async {
    if (_localCache.isEmpty || _authToken == null || _currentTimeEntryId == null) {
      return;
    }

    try {
      // Create a copy of points to upload
      final pointsToUpload = List<GpsTracking>.from(_localCache);
      _localCache.clear();

      if (kDebugMode) {
        print('Uploading ${pointsToUpload.length} GPS points...');
      }

      // Send to backend
      await ApiService.post(
        '/gps-tracking/batch',
        {
          'timeEntryId': _currentTimeEntryId!,
          'trackingPoints': pointsToUpload.map((p) => p.toApiJson()).toList(),
        },
        token: _authToken,
      );

      if (kDebugMode) {
        print('GPS points uploaded successfully');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error uploading GPS points: $e');
      }
      // Points will be lost - could implement local database storage
      // for more robust offline support
    }
  }

  Future<void> stopTracking() async {
    if (kDebugMode) {
      print('Stopping GPS tracking');
    }

    await _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;

    // Upload any remaining points
    await _uploadBatch();

    _currentTimeEntryId = null;
    _authToken = null;
  }

  Future<Map<String, dynamic>?> getTrackingSummary(
      String timeEntryId, String authToken) async {
    try {
      final response = await ApiService.get(
        '/gps-tracking/summary/$timeEntryId',
        token: authToken,
      );

      if (response['status'] == 'success') {
        return response['data'];
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error fetching GPS tracking summary: $e');
      }
    }
    return null;
  }

  void dispose() {
    _positionStreamSubscription?.cancel();
    _localCache.clear();
  }
}
