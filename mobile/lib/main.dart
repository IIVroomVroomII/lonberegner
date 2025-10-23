import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/work_screen.dart';
import 'services/auth_service.dart';
import 'providers/work_session_provider.dart';

void main() {
  runApp(const LonberegningApp());
}

class LonberegningApp extends StatelessWidget {
  const LonberegningApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => WorkSessionProvider()),
      ],
      child: MaterialApp(
        title: 'Lønberegning',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          useMaterial3: true,
        ),
        home: Consumer<AuthService>(
          builder: (context, authService, _) {
            return authService.isAuthenticated
                ? const WorkScreen()
                : const LoginScreen();
          },
        ),
      ),
    );
  }
}
