import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import 'package:provider/provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _pauseReminders = true;
  bool _gpsTracking = true;
  bool _autoSync = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _pauseReminders = prefs.getBool('pause_reminders') ?? true;
      _gpsTracking = prefs.getBool('gps_tracking') ?? true;
      _autoSync = prefs.getBool('auto_sync') ?? true;
    });
  }

  Future<void> _saveSetting(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  Future<void> _clearCache() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ryd Cache'),
        content: const Text('Er du sikker på, at du vil rydde cache? Dette vil ikke slette dine tidsregistreringer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Annuller'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Ryd'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final prefs = await SharedPreferences.getInstance();
      // Clear all except token and user info
      final token = prefs.getString('token');
      final userId = prefs.getString('userId');
      final userName = prefs.getString('userName');

      await prefs.clear();

      if (token != null) await prefs.setString('token', token);
      if (userId != null) await prefs.setString('userId', userId);
      if (userName != null) await prefs.setString('userName', userName);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cache ryddet')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Indstillinger'),
      ),
      body: ListView(
        children: [
          // Notifications Section
          _buildSectionHeader('Notifikationer'),
          SwitchListTile(
            title: const Text('Pause påmindelser'),
            subtitle: const Text('Få påmindelse når pause er påkrævet'),
            value: _pauseReminders,
            onChanged: (value) {
              setState(() => _pauseReminders = value);
              _saveSetting('pause_reminders', value);
            },
            secondary: const Icon(Icons.notifications),
          ),
          const Divider(),

          // GPS & Location Section
          _buildSectionHeader('GPS & Lokation'),
          SwitchListTile(
            title: const Text('GPS sporing'),
            subtitle: const Text('Tillad GPS sporing for automatisk kategorisering'),
            value: _gpsTracking,
            onChanged: (value) {
              setState(() => _gpsTracking = value);
              _saveSetting('gps_tracking', value);
            },
            secondary: const Icon(Icons.location_on),
          ),
          const Divider(),

          // Data & Sync Section
          _buildSectionHeader('Data & Synkronisering'),
          SwitchListTile(
            title: const Text('Automatisk synkronisering'),
            subtitle: const Text('Synkroniser data automatisk med serveren'),
            value: _autoSync,
            onChanged: (value) {
              setState(() => _autoSync = value);
              _saveSetting('auto_sync', value);
            },
            secondary: const Icon(Icons.sync),
          ),
          ListTile(
            leading: const Icon(Icons.delete_sweep),
            title: const Text('Ryd cache'),
            subtitle: const Text('Ryd midlertidige data'),
            onTap: _clearCache,
          ),
          const Divider(),

          // Account Section
          _buildSectionHeader('Konto'),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Brugernavn'),
            subtitle: Text(authService.userName ?? 'Ikke angivet'),
          ),
          ListTile(
            leading: const Icon(Icons.badge),
            title: const Text('Medarbejder ID'),
            subtitle: Text(authService.userId ?? 'Ikke angivet'),
          ),
          const Divider(),

          // About Section
          _buildSectionHeader('Om'),
          const ListTile(
            leading: Icon(Icons.info),
            title: Text('Version'),
            subtitle: Text('1.9.0'),
          ),
          ListTile(
            leading: const Icon(Icons.policy),
            title: const Text('Privatlivspolitik'),
            onTap: () {
              // TODO: Open privacy policy
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Privatlivspolitik - Kommer snart')),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Vilkår & betingelser'),
            onTap: () {
              // TODO: Open terms and conditions
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Vilkår & betingelser - Kommer snart')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).primaryColor,
        ),
      ),
    );
  }
}
