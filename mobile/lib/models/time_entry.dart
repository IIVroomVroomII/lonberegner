class TimeEntry {
  final String? id;
  final String employeeId;
  final DateTime date;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? workType;
  final String? location;
  final String? route;
  final String? comment;
  final String? description;
  final double? hoursWorked;
  final String status;
  final List<BreakPeriod> breaks;
  final bool hasRestPeriod;
  final double? restHours;

  TimeEntry({
    this.id,
    required this.employeeId,
    required this.date,
    this.startTime,
    this.endTime,
    this.workType,
    this.location,
    this.route,
    this.comment,
    this.description,
    this.hoursWorked,
    this.status = 'DRAFT',
    this.breaks = const [],
    this.hasRestPeriod = false,
    this.restHours,
  });

  bool get isActive => startTime != null && endTime == null;
  bool get hasActiveBreak => breaks.any((b) => b.isActive);

  Duration get totalWorkedTime {
    if (startTime == null) return Duration.zero;
    final end = endTime ?? DateTime.now();
    final total = end.difference(startTime!);
    final breakTime = breaks.fold<Duration>(
      Duration.zero,
      (sum, b) => sum + b.duration,
    );
    return total - breakTime;
  }

  Duration get totalBreakTime {
    return breaks.fold<Duration>(
      Duration.zero,
      (sum, b) => sum + b.duration,
    );
  }

  Duration get requiredBreakTime {
    final hours = totalWorkedTime.inHours;
    if (hours >= 9) return const Duration(minutes: 45);
    if (hours >= 6) return const Duration(minutes: 30);
    return Duration.zero;
  }

  bool get hasRequiredBreak {
    return totalBreakTime >= requiredBreakTime;
  }

  factory TimeEntry.fromJson(Map<String, dynamic> json) {
    return TimeEntry(
      id: json['id'],
      employeeId: json['employeeId'],
      date: DateTime.parse(json['date']),
      startTime: json['startTime'] != null ? DateTime.parse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      workType: json['taskType'] ?? json['workType'],  // Backend uses taskType
      location: json['location'],
      route: json['route'],
      comment: json['comment'],
      description: json['description'],
      hoursWorked: json['hoursWorked']?.toDouble(),
      status: json['status'] ?? 'DRAFT',
      breaks: (json['breaks'] as List<dynamic>?)
          ?.map((b) => BreakPeriod.fromJson(b))
          .toList() ?? [],
      hasRestPeriod: json['hasRestPeriod'] ?? false,
      restHours: json['restHours']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'employeeId': employeeId,
      'date': date.toIso8601String(),
      if (startTime != null) 'startTime': startTime!.toIso8601String(),
      if (endTime != null) 'endTime': endTime!.toIso8601String(),
      if (workType != null) 'taskType': workType,  // Backend expects taskType
      if (location != null) 'location': location,
      if (route != null) 'route': route,
      if (comment != null) 'comment': comment,
      if (description != null) 'description': description,
      if (hoursWorked != null) 'hoursWorked': hoursWorked,
      'status': status,
      'breaks': breaks.map((b) => b.toJson()).toList(),
      'hasRestPeriod': hasRestPeriod,
      if (restHours != null) 'restHours': restHours,
    };
  }

  TimeEntry copyWith({
    String? id,
    String? employeeId,
    DateTime? date,
    DateTime? startTime,
    DateTime? endTime,
    String? workType,
    String? location,
    String? route,
    String? comment,
    String? description,
    double? hoursWorked,
    String? status,
    List<BreakPeriod>? breaks,
    bool? hasRestPeriod,
    double? restHours,
  }) {
    return TimeEntry(
      id: id ?? this.id,
      employeeId: employeeId ?? this.employeeId,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      workType: workType ?? this.workType,
      location: location ?? this.location,
      route: route ?? this.route,
      comment: comment ?? this.comment,
      description: description ?? this.description,
      hoursWorked: hoursWorked ?? this.hoursWorked,
      status: status ?? this.status,
      breaks: breaks ?? this.breaks,
      hasRestPeriod: hasRestPeriod ?? this.hasRestPeriod,
      restHours: restHours ?? this.restHours,
    );
  }
}

class BreakPeriod {
  final String? id;
  final DateTime startTime;
  final DateTime? endTime;
  final String type;

  BreakPeriod({
    this.id,
    required this.startTime,
    this.endTime,
    this.type = 'BREAK',
  });

  bool get isActive => endTime == null;

  Duration get duration {
    if (endTime == null) return Duration.zero;
    return endTime!.difference(startTime);
  }

  factory BreakPeriod.fromJson(Map<String, dynamic> json) {
    return BreakPeriod(
      id: json['id'],
      startTime: DateTime.parse(json['startTime']),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      type: json['type'] ?? 'BREAK',
    );
  }

  Map<String, dynamic> toJson() {
    // Import TimeEntryService for formatDateTime
    final formatDateTime = (DateTime dt) {
      final utc = dt.toUtc();
      final iso = utc.toIso8601String();
      final milliseconds = (utc.millisecond).toString().padLeft(3, '0');
      return '${iso.substring(0, 19)}.${milliseconds}Z';
    };

    return {
      if (id != null) 'id': id,
      'startTime': formatDateTime(startTime),
      if (endTime != null) 'endTime': formatDateTime(endTime!),
      'type': type,
    };
  }
}
