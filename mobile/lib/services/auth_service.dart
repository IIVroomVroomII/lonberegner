import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthService with ChangeNotifier {
  String? _token;
  String? _userId;
  String? _userName;
  bool _isAuthenticated = false;

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  String? get userId => _userId;
  String? get userName => _userName;

  AuthService() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    _userId = prefs.getString('userId');
    _userName = prefs.getString('userName');
    _isAuthenticated = _token != null;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await ApiService.post('/auth/login', {
        'email': email,
        'password': password,
      });

      _token = response['data']['token'];
      _userId = response['data']['user']['id'];
      _userName = response['data']['user']['name'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('userId', _userId!);
      await prefs.setString('userName', _userName!);

      _isAuthenticated = true;
      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> mobileLogin(String employeeNumber, String pin) async {
    try {
      if (kDebugMode) {
        print('Attempting mobile login with: $employeeNumber');
      }

      final response = await ApiService.post('/auth/mobile-login', {
        'employeeNumber': employeeNumber,
        'pin': pin,
      });

      if (kDebugMode) {
        print('Login response: $response');
      }

      _token = response['data']['token'];
      // Use employee.id if it exists, otherwise fall back to user.id
      final employee = response['data']['user']['employee'];
      _userId = employee != null ? employee['id'] : response['data']['user']['id'];
      _userName = response['data']['user']['name'];

      if (kDebugMode) {
        print('Stored userId: $_userId (employee ID), userName: $_userName');
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('userId', _userId!);
      await prefs.setString('userName', _userName!);

      _isAuthenticated = true;
      notifyListeners();
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Mobile login error: $e');
      }
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _userId = null;
    _userName = null;
    _isAuthenticated = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('userId');
    await prefs.remove('userName');
    notifyListeners();
  }
}
