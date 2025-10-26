import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class LocationService {
  // Predefined work locations (can be configured per company)
  static const Map<String, Map<String, dynamic>> workLocations = {
    'terminal': {
      'name': 'Terminal',
      'lat': 55.6761, // Example Copenhagen Terminal
      'lng': 12.5683,
      'radius': 200, // meters
      'workType': 'TERMINAL',
    },
    'warehouse': {
      'name': 'Lager',
      'lat': 55.7074,
      'lng': 12.5310,
      'radius': 150,
      'workType': 'WAREHOUSE',
    },
  };

  Future<bool> checkPermissions() async {
    var status = await Permission.location.status;

    if (status.isDenied) {
      status = await Permission.location.request();
    }

    return status.isGranted;
  }

  Future<Position?> getCurrentLocation() async {
    try {
      final hasPermission = await checkPermissions();
      if (!hasPermission) return null;

      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }

  Future<String?> detectWorkType() async {
    try {
      final position = await getCurrentLocation();
      if (position == null) return null;

      // Check if current location is near any predefined work location
      for (final location in workLocations.values) {
        final distance = Geolocator.distanceBetween(
          position.latitude,
          position.longitude,
          location['lat'],
          location['lng'],
        );

        if (distance <= location['radius']) {
          return location['workType'];
        }
      }

      // Default to DRIVING if not at any known location
      return 'DRIVING';
    } catch (e) {
      print('Error detecting work type: $e');
      return 'DRIVING'; // Default fallback
    }
  }

  Future<Map<String, dynamic>?> getLocationDetails() async {
    try {
      final position = await getCurrentLocation();
      if (position == null) return null;

      // Check if at known location
      for (final entry in workLocations.entries) {
        final location = entry.value;
        final distance = Geolocator.distanceBetween(
          position.latitude,
          position.longitude,
          location['lat'],
          location['lng'],
        );

        if (distance <= location['radius']) {
          return {
            'workType': location['workType'],
            'locationName': location['name'],
            'latitude': position.latitude,
            'longitude': position.longitude,
            'accuracy': position.accuracy,
          };
        }
      }

      // Not at known location - assume driving
      return {
        'workType': 'DRIVING',
        'locationName': 'På vej',
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
      };
    } catch (e) {
      print('Error getting location details: $e');
      return null;
    }
  }

  Stream<Position> getLocationStream() {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 100, // Update every 100 meters
    );

    return Geolocator.getPositionStream(locationSettings: locationSettings);
  }

  double calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }
}
