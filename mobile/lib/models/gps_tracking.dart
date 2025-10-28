class GpsTracking {
  final String? id;
  final String timeEntryId;
  final DateTime timestamp;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final bool isStationary;
  final bool isInGeofence;
  final String? geofenceId;

  GpsTracking({
    this.id,
    required this.timeEntryId,
    required this.timestamp,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.speed,
    this.heading,
    this.isStationary = false,
    this.isInGeofence = false,
    this.geofenceId,
  });

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'timeEntryId': timeEntryId,
      'timestamp': timestamp.toIso8601String(),
      'latitude': latitude,
      'longitude': longitude,
      if (accuracy != null) 'accuracy': accuracy,
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
      'isStationary': isStationary,
      'isInGeofence': isInGeofence,
      if (geofenceId != null) 'geofenceId': geofenceId,
    };
  }

  factory GpsTracking.fromJson(Map<String, dynamic> json) {
    return GpsTracking(
      id: json['id'],
      timeEntryId: json['timeEntryId'],
      timestamp: DateTime.parse(json['timestamp']),
      latitude: (json['latitude'] is String)
          ? double.parse(json['latitude'])
          : json['latitude'].toDouble(),
      longitude: (json['longitude'] is String)
          ? double.parse(json['longitude'])
          : json['longitude'].toDouble(),
      accuracy: json['accuracy'] != null
          ? (json['accuracy'] is String
              ? double.parse(json['accuracy'])
              : json['accuracy'].toDouble())
          : null,
      speed: json['speed'] != null
          ? (json['speed'] is String
              ? double.parse(json['speed'])
              : json['speed'].toDouble())
          : null,
      heading: json['heading'] != null
          ? (json['heading'] is String
              ? double.parse(json['heading'])
              : json['heading'].toDouble())
          : null,
      isStationary: json['isStationary'] ?? false,
      isInGeofence: json['isInGeofence'] ?? false,
      geofenceId: json['geofenceId'],
    );
  }

  Map<String, dynamic> toApiJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'speed': speed,
      'heading': heading,
    };
  }
}
