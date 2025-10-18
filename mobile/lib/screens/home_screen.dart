import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context, listen: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lønberegning'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => authService.logout(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.access_time, size: 48, color: Colors.blue),
                    const SizedBox(height: 8),
                    const Text(
                      'Tidsregistrering',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () {
                        // Navigate to time entry form
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Ny registrering'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Seneste registreringer',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      leading: const Icon(Icons.work),
                      title: const Text('Kørsel - København'),
                      subtitle: const Text('08:00 - 16:00 (8 timer)'),
                      trailing: Chip(
                        label: const Text('Godkendt'),
                        backgroundColor: Colors.green[100],
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.work),
                      title: const Text('Lager - Terminal'),
                      subtitle: const Text('06:00 - 14:00 (8 timer)'),
                      trailing: Chip(
                        label: const Text('Afventer'),
                        backgroundColor: Colors.orange[100],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Navigate to new time entry
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
