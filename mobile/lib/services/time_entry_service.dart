import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/time_entry.dart';

class TimeEntryService {
  static const String baseUrl = 'https://lonberegner-62a2db4ebd03.herokuapp.com/api/v1';

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Get today's time entry (active or draft)
  Future<TimeEntry?> getTodaysEntry() async {
    try {
      final headers = await _getHeaders();
      final today = DateTime.now();
      final dateStr = '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      final response = await http.get(
        Uri.parse('$baseUrl/time-entries?date=$dateStr&status=DRAFT,PENDING'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final entries = (data['data']['timeEntries'] as List)
            .map((e) => TimeEntry.fromJson(e))
            .toList();

        return entries.isNotEmpty ? entries.first : null;
      }
      return null;
    } catch (e) {
      print('Error getting today\'s entry: $e');
      return null;
    }
  }

  // Start work
  Future<TimeEntry?> startWork({
    required String employeeId,
    String? workType,
    String? location,
  }) async {
    try {
      final headers = await _getHeaders();
      final now = DateTime.now();

      final body = json.encode({
        'employeeId': employeeId,
        'date': now.toIso8601String().split('T')[0],
        'startTime': now.toIso8601String(),
        'workType': workType ?? 'DRIVING',
        'location': location,
        'status': 'DRAFT',
      });

      final response = await http.post(
        Uri.parse('$baseUrl/time-entries'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return TimeEntry.fromJson(data['data']);
      }
      return null;
    } catch (e) {
      print('Error starting work: $e');
      return null;
    }
  }

  // End work
  Future<TimeEntry?> endWork(String entryId) async {
    try {
      final headers = await _getHeaders();
      final now = DateTime.now();

      final body = json.encode({
        'endTime': now.toIso8601String(),
        'status': 'PENDING',
      });

      final response = await http.put(
        Uri.parse('$baseUrl/time-entries/$entryId'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return TimeEntry.fromJson(data['data']);
      }
      return null;
    } catch (e) {
      print('Error ending work: $e');
      return null;
    }
  }

  // Start break
  Future<TimeEntry?> startBreak(String entryId, {String type = 'BREAK'}) async {
    try {
      final headers = await _getHeaders();
      final now = DateTime.now();

      // Get current entry first
      final currentEntry = await getEntry(entryId);
      if (currentEntry == null) return null;

      final breaks = List<BreakPeriod>.from(currentEntry.breaks);
      breaks.add(BreakPeriod(
        startTime: now,
        type: type,
      ));

      final body = json.encode({
        'breaks': breaks.map((b) => b.toJson()).toList(),
      });

      final response = await http.put(
        Uri.parse('$baseUrl/time-entries/$entryId'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return TimeEntry.fromJson(data['data']);
      }
      return null;
    } catch (e) {
      print('Error starting break: $e');
      return null;
    }
  }

  // End break
  Future<TimeEntry?> endBreak(String entryId) async {
    try {
      final headers = await _getHeaders();
      final now = DateTime.now();

      // Get current entry first
      final currentEntry = await getEntry(entryId);
      if (currentEntry == null) return null;

      final breaks = List<BreakPeriod>.from(currentEntry.breaks);
      final activeBreakIndex = breaks.indexWhere((b) => b.isActive);

      if (activeBreakIndex == -1) return currentEntry;

      breaks[activeBreakIndex] = BreakPeriod(
        id: breaks[activeBreakIndex].id,
        startTime: breaks[activeBreakIndex].startTime,
        endTime: now,
        type: breaks[activeBreakIndex].type,
      );

      final body = json.encode({
        'breaks': breaks.map((b) => b.toJson()).toList(),
      });

      final response = await http.put(
        Uri.parse('$baseUrl/time-entries/$entryId'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return TimeEntry.fromJson(data['data']);
      }
      return null;
    } catch (e) {
      print('Error ending break: $e');
      return null;
    }
  }

  // Get single entry
  Future<TimeEntry?> getEntry(String entryId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/time-entries/$entryId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return TimeEntry.fromJson(data['data']);
      }
      return null;
    } catch (e) {
      print('Error getting entry: $e');
      return null;
    }
  }

  // Get entries for date range
  Future<List<TimeEntry>> getEntries({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final headers = await _getHeaders();
      var url = '$baseUrl/time-entries';
      final queryParams = <String>[];

      if (startDate != null) {
        queryParams.add('startDate=${startDate.toIso8601String().split('T')[0]}');
      }
      if (endDate != null) {
        queryParams.add('endDate=${endDate.toIso8601String().split('T')[0]}');
      }

      if (queryParams.isNotEmpty) {
        url += '?${queryParams.join('&')}';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return (data['data']['timeEntries'] as List)
            .map((e) => TimeEntry.fromJson(e))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error getting entries: $e');
      return [];
    }
  }

  // Update entry
  Future<TimeEntry?> updateEntry(String entryId, Map<String, dynamic> updates) async {
    try {
      final headers = await _getHeaders();
      final body = json.encode(updates);

      final response = await http.put(
        Uri.parse('$baseUrl/time-entries/$entryId'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return TimeEntry.fromJson(data['data']);
      }
      return null;
    } catch (e) {
      print('Error updating entry: $e');
      return null;
    }
  }
}
