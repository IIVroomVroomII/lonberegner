import 'package:flutter/foundation.dart';
import 'dart:async';
import '../models/time_entry.dart';
import '../services/time_entry_service.dart';
import '../services/gps_tracking_service.dart';

class WorkSessionProvider with ChangeNotifier {
  final TimeEntryService _timeEntryService = TimeEntryService();
  final GpsTrackingService _gpsTrackingService = GpsTrackingService();

  TimeEntry? _currentEntry;
  bool _isLoading = false;
  String? _error;
  Timer? _updateTimer;
  String? _authToken;

  TimeEntry? get currentEntry => _currentEntry;
  bool get isLoading => _isLoading;
  String? get error => _error;

  bool get isWorking => _currentEntry?.isActive ?? false;
  bool get isOnBreak => _currentEntry?.hasActiveBreak ?? false;

  Duration get workedTime => _currentEntry?.totalWorkedTime ?? Duration.zero;
  Duration get breakTime => _currentEntry?.totalBreakTime ?? Duration.zero;
  Duration get requiredBreakTime => _currentEntry?.requiredBreakTime ?? Duration.zero;
  bool get hasRequiredBreak => _currentEntry?.hasRequiredBreak ?? true;

  WorkSessionProvider() {
    // Start periodic updates when working
    _startPeriodicUpdates();
  }

  void _startPeriodicUpdates() {
    _updateTimer?.cancel();
    _updateTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (isWorking) {
        notifyListeners(); // Update UI with new elapsed time
      }
    });
  }

  @override
  void dispose() {
    _updateTimer?.cancel();
    _gpsTrackingService.dispose();
    super.dispose();
  }

  // Set auth token for GPS tracking
  void setAuthToken(String token) {
    _authToken = token;
  }

  // Load today's entry
  Future<void> loadTodaysEntry() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentEntry = await _timeEntryService.getTodaysEntry();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Start work
  Future<bool> startWork({
    required String employeeId,
    String? workType,
    String? location,
    String? route,
    String? comment,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final entry = await _timeEntryService.startWork(
        employeeId: employeeId,
        workType: workType,
        location: location,
        route: route,
        comment: comment,
      );

      if (entry != null) {
        _currentEntry = entry;

        // Start GPS tracking if we have auth token
        if (_authToken != null && entry.id != null) {
          final trackingStarted = await _gpsTrackingService.startTracking(
            entry.id!,
            _authToken!,
          );

          if (kDebugMode) {
            print('GPS tracking ${trackingStarted ? "started" : "failed to start"}');
          }
        }

        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = 'Kunne ikke starte arbejde';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // End work
  Future<bool> endWork() async {
    if (_currentEntry == null || _currentEntry!.id == null) {
      _error = 'Ingen aktiv arbejdsperiode';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Stop GPS tracking first
      await _gpsTrackingService.stopTracking();

      if (kDebugMode) {
        print('GPS tracking stopped');
      }

      final entry = await _timeEntryService.endWork(_currentEntry!.id!);

      if (entry != null) {
        _currentEntry = entry;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = 'Kunne ikke afslutte arbejde';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Start break
  Future<bool> startBreak({String type = 'BREAK'}) async {
    if (_currentEntry == null || _currentEntry!.id == null) {
      _error = 'Ingen aktiv arbejdsperiode';
      notifyListeners();
      return false;
    }

    if (isOnBreak) {
      _error = 'Pause er allerede startet';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final entry = await _timeEntryService.startBreak(
        _currentEntry!.id!,
        type: type,
      );

      if (entry != null) {
        _currentEntry = entry;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = 'Kunne ikke starte pause';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // End break
  Future<bool> endBreak() async {
    if (_currentEntry == null || _currentEntry!.id == null) {
      _error = 'Ingen aktiv arbejdsperiode';
      notifyListeners();
      return false;
    }

    if (!isOnBreak) {
      _error = 'Ingen aktiv pause';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final entry = await _timeEntryService.endBreak(_currentEntry!.id!);

      if (entry != null) {
        _currentEntry = entry;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = 'Kunne ikke afslutte pause';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Add manual break (for wizard)
  Future<bool> addManualBreak({
    required DateTime startTime,
    required DateTime endTime,
    String type = 'BREAK',
  }) async {
    if (_currentEntry == null || _currentEntry!.id == null) {
      _error = 'Ingen aktiv arbejdsperiode';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final breaks = List<BreakPeriod>.from(_currentEntry!.breaks);
      breaks.add(BreakPeriod(
        startTime: startTime,
        endTime: endTime,
        type: type,
      ));

      final entry = await _timeEntryService.updateEntry(
        _currentEntry!.id!,
        {'breaks': breaks.map((b) => b.toJson()).toList()},
      );

      if (entry != null) {
        _currentEntry = entry;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = 'Kunne ikke tilføje pause';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
