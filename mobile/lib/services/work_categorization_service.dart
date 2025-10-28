import 'package:flutter/foundation.dart';
import '../models/work_categorization.dart';
import '../services/api_service.dart';

class WorkCategorizationService {
  Future<CategorizationResult?> categorizeWorkDay(
      String timeEntryId, String authToken) async {
    try {
      if (kDebugMode) {
        print('Requesting work day categorization for: $timeEntryId');
      }

      final response = await ApiService.get(
        '/work-categorization/analyze/$timeEntryId',
        token: authToken,
      );

      if (response['status'] == 'success') {
        final result = CategorizationResult.fromJson(response['data']);

        if (kDebugMode) {
          print('Work day categorization complete: ${result.workPeriods.length} periods found');
        }

        return result;
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error categorizing work day: $e');
      }
    }
    return null;
  }
}
