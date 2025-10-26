import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iOS = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: iOS);

    await _notifications.initialize(settings);

    // Request permissions
    await Permission.notification.request();
  }

  static Future<void> showReminder(String title, String body) async {
    const androidDetails = AndroidNotificationDetails(
      'work_reminders',
      'Arbejdspåmindelser',
      channelDescription: 'Påmindelser om tidsregistrering',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(0, title, body, details);
  }

  static Future<void> scheduleEndOfDayReminder() async {
    // Schedule for 16:00 if user hasn't ended work
    // Implementation with workmanager for background tasks
  }
}
