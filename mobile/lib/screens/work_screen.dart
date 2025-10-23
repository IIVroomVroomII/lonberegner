import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../providers/work_session_provider.dart';
import '../services/auth_service.dart';
import 'end_day_wizard.dart';

class WorkScreen extends StatefulWidget {
  const WorkScreen({super.key});

  @override
  State<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends State<WorkScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Load today's entry when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WorkSessionProvider>().loadTodaysEntry();
    });

    // Update UI every second for live timer
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}t ${minutes}m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tidsregistrering'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {
              // Navigate to history
            },
          ),
          IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () {
              Scaffold.of(context).openDrawer();
            },
          ),
        ],
      ),
      drawer: _buildDrawer(context),
      body: Consumer<WorkSessionProvider>(
        builder: (context, workSession, child) {
          if (workSession.isLoading && workSession.currentEntry == null) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Status Card
                _buildStatusCard(context, workSession),
                const SizedBox(height: 24),

                // Main Action Button
                _buildMainActionButton(context, workSession),
                const SizedBox(height: 16),

                // Quick Actions
                if (workSession.isWorking) ...[
                  _buildQuickActions(context, workSession),
                  const SizedBox(height: 24),
                ],

                // Today's Summary
                if (workSession.currentEntry != null) ...[
                  _buildTodaysSummary(context, workSession),
                ],

                // Error message
                if (workSession.error != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    color: Colors.red[50],
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Icon(Icons.error, color: Colors.red[700]),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              workSession.error!,
                              style: TextStyle(color: Colors.red[700]),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => workSession.clearError(),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusCard(BuildContext context, WorkSessionProvider workSession) {
    final isWorking = workSession.isWorking;
    final isOnBreak = workSession.isOnBreak;

    Color statusColor;
    String statusText;
    IconData statusIcon;

    if (isOnBreak) {
      statusColor = Colors.orange;
      statusText = 'På pause';
      statusIcon = Icons.pause_circle;
    } else if (isWorking) {
      statusColor = Colors.green;
      statusText = 'I gang';
      statusIcon = Icons.play_circle;
    } else {
      statusColor = Colors.grey;
      statusText = 'Ikke startet';
      statusIcon = Icons.schedule;
    }

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(statusIcon, size: 32, color: statusColor),
                const SizedBox(width: 12),
                Text(
                  statusText,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            if (isWorking) ...[
              const SizedBox(height: 20),
              Text(
                _formatDuration(workSession.workedTime),
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontFeatures: [const FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Arbejdstid i dag',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMainActionButton(BuildContext context, WorkSessionProvider workSession) {
    final authService = context.read<AuthService>();
    final employeeId = 'TODO'; // Get from auth service

    if (!workSession.isWorking) {
      return ElevatedButton(
        onPressed: workSession.isLoading
            ? null
            : () async {
                final success = await workSession.startWork(
                  employeeId: employeeId,
                  workType: 'DRIVING',
                );

                if (success && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Arbejde startet')),
                  );
                }
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.play_arrow, size: 32),
            const SizedBox(width: 12),
            Text(
              'Start Arbejde',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      );
    }

    if (workSession.isOnBreak) {
      return ElevatedButton(
        onPressed: workSession.isLoading
            ? null
            : () async {
                final success = await workSession.endBreak();

                if (success && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Pause afsluttet')),
                  );
                }
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.play_arrow, size: 32),
            const SizedBox(width: 12),
            Text(
              'Genoptag Arbejde',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      );
    }

    return ElevatedButton(
      onPressed: workSession.isLoading
          ? null
          : () async {
              // Show wizard if needed
              final shouldEndDay = await _showEndDayWizard(context, workSession);

              if (shouldEndDay == true && mounted) {
                final success = await workSession.endWork();

                if (success && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Arbejde afsluttet')),
                  );
                }
              }
            },
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.stop, size: 32),
          const SizedBox(width: 12),
          Text(
            'Slut Arbejde',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, WorkSessionProvider workSession) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: workSession.isLoading || workSession.isOnBreak
                ? null
                : () async {
                    final success = await workSession.startBreak();

                    if (success && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Pause startet')),
                      );
                    }
                  },
            icon: const Icon(Icons.pause),
            label: const Text('Pause'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: workSession.isLoading || workSession.isOnBreak
                ? null
                : () async {
                    final success = await workSession.startBreak(type: 'REST');

                    if (success && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Hvil startet')),
                      );
                    }
                  },
            icon: const Icon(Icons.hotel),
            label: const Text('Hvil'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTodaysSummary(BuildContext context, WorkSessionProvider workSession) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dagens oversigt',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Divider(),
            _buildSummaryRow(
              context,
              'Arbejdstid',
              _formatDuration(workSession.workedTime),
              Icons.work,
            ),
            _buildSummaryRow(
              context,
              'Pause',
              _formatDuration(workSession.breakTime),
              Icons.pause_circle,
              warning: !workSession.hasRequiredBreak,
            ),
            if (!workSession.hasRequiredBreak) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.orange[700], size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Påkrævet pause: ${_formatDuration(workSession.requiredBreakTime)}',
                        style: TextStyle(color: Colors.orange[700], fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(
    BuildContext context,
    String label,
    String value,
    IconData icon, {
    bool warning = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: warning ? Colors.orange : Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: warning ? Colors.orange : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final authService = context.read<AuthService>();

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  radius: 32,
                  child: Icon(Icons.person, size: 32),
                ),
                SizedBox(height: 12),
                Text(
                  'Navn Navnesen',
                  style: TextStyle(color: Colors.white, fontSize: 18),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('Historik'),
            onTap: () {
              // Navigate to history
            },
          ),
          ListTile(
            leading: const Icon(Icons.receipt),
            title: const Text('Lønkvitteringer'),
            onTap: () {
              // Navigate to pay slips
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Indstillinger'),
            onTap: () {
              // Navigate to settings
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Log ud', style: TextStyle(color: Colors.red)),
            onTap: () => authService.logout(),
          ),
        ],
      ),
    );
  }

  Future<bool?> _showEndDayWizard(
    BuildContext context,
    WorkSessionProvider workSession,
  ) async {
    return showDialog<bool>(
      context: context,
      builder: (context) => EndDayWizard(workSession: workSession),
    );
  }
}
