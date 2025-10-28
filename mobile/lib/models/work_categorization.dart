class WorkPeriod {
  final DateTime startTime;
  final DateTime endTime;
  final String suggestedTaskType;
  final int confidence;
  final String reason;
  final LocationPoint? location;
  final String? geofenceName;
  final double? averageSpeed;
  final int? distance;

  WorkPeriod({
    required this.startTime,
    required this.endTime,
    required this.suggestedTaskType,
    required this.confidence,
    required this.reason,
    this.location,
    this.geofenceName,
    this.averageSpeed,
    this.distance,
  });

  factory WorkPeriod.fromJson(Map<String, dynamic> json) {
    return WorkPeriod(
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      suggestedTaskType: json['suggestedTaskType'],
      confidence: json['confidence'],
      reason: json['reason'],
      location: json['location'] != null
          ? LocationPoint.fromJson(json['location'])
          : null,
      geofenceName: json['geofenceName'],
      averageSpeed: json['averageSpeed']?.toDouble(),
      distance: json['distance'],
    );
  }

  Duration get duration => endTime.difference(startTime);

  String get durationFormatted {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}t ${minutes}m';
  }

  String get taskTypeDisplayName {
    switch (suggestedTaskType) {
      case 'DRIVING':
        return 'Kørsel';
      case 'DISTRIBUTION':
        return 'Distribution';
      case 'TERMINAL_WORK':
        return 'Terminalarbejde';
      case 'MOVING':
        return 'Flytning';
      case 'LOADING':
        return 'Lastning';
      case 'UNLOADING':
        return 'Losning';
      default:
        return suggestedTaskType;
    }
  }
}

class LocationPoint {
  final double latitude;
  final double longitude;

  LocationPoint({
    required this.latitude,
    required this.longitude,
  });

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    return LocationPoint(
      latitude: (json['latitude'] is String)
          ? double.parse(json['latitude'])
          : json['latitude'].toDouble(),
      longitude: (json['longitude'] is String)
          ? double.parse(json['longitude'])
          : json['longitude'].toDouble(),
    );
  }
}

class CategorizationResult {
  final String timeEntryId;
  final List<WorkPeriod> workPeriods;
  final int totalDuration;
  final DateTime analysisDate;

  CategorizationResult({
    required this.timeEntryId,
    required this.workPeriods,
    required this.totalDuration,
    required this.analysisDate,
  });

  factory CategorizationResult.fromJson(Map<String, dynamic> json) {
    return CategorizationResult(
      timeEntryId: json['timeEntryId'],
      workPeriods: (json['workPeriods'] as List)
          .map((period) => WorkPeriod.fromJson(period))
          .toList(),
      totalDuration: json['totalDuration'],
      analysisDate: DateTime.parse(json['analysisDate']),
    );
  }

  Duration get totalDurationFormatted {
    return Duration(milliseconds: totalDuration);
  }
}
