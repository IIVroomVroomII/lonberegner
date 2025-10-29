import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/time_entry.dart';
import '../services/time_entry_service.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  final TimeEntryService _service = TimeEntryService();
  bool _loading = false;
  String _selectedPeriod = 'week'; // 'week' or 'month'
  DateTime _selectedDate = DateTime.now();
  List<TimeEntry> _entries = [];

  @override
  void initState() {
    super.initState();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    setState(() => _loading = true);

    DateTime startDate;
    DateTime endDate;

    if (_selectedPeriod == 'week') {
      // Get Monday of the selected week
      startDate = _selectedDate.subtract(Duration(days: _selectedDate.weekday - 1));
      // Get Sunday of the selected week
      endDate = startDate.add(const Duration(days: 6));
    } else {
      // Get first day of the month
      startDate = DateTime(_selectedDate.year, _selectedDate.month, 1);
      // Get last day of the month
      endDate = DateTime(_selectedDate.year, _selectedDate.month + 1, 0);
    }

    final entries = await _service.getEntries(startDate: startDate, endDate: endDate);

    setState(() {
      _entries = entries;
      _loading = false;
    });
  }

  void _previousPeriod() {
    setState(() {
      if (_selectedPeriod == 'week') {
        _selectedDate = _selectedDate.subtract(const Duration(days: 7));
      } else {
        _selectedDate = DateTime(_selectedDate.year, _selectedDate.month - 1, 1);
      }
    });
    _loadStatistics();
  }

  void _nextPeriod() {
    setState(() {
      if (_selectedPeriod == 'week') {
        _selectedDate = _selectedDate.add(const Duration(days: 7));
      } else {
        _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + 1, 1);
      }
    });
    _loadStatistics();
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}t ${minutes}m';
  }

  Duration _getTotalWorkedTime() {
    return _entries.fold(Duration.zero, (total, entry) {
      return total + entry.totalWorkedTime;
    });
  }

  Duration _getTotalBreakTime() {
    return _entries.fold(Duration.zero, (total, entry) {
      return total + entry.totalBreakTime;
    });
  }

  Map<String, Duration> _getTimeByWorkType() {
    final Map<String, Duration> timeByType = {};

    for (var entry in _entries) {
      final type = entry.workType ?? 'UNKNOWN';
      timeByType[type] = (timeByType[type] ?? Duration.zero) + entry.totalWorkedTime;
    }

    return timeByType;
  }

  Map<DateTime, Duration> _getTimeByDay() {
    final Map<DateTime, Duration> timeByDay = {};

    for (var entry in _entries) {
      final date = DateTime(entry.date.year, entry.date.month, entry.date.day);
      timeByDay[date] = (timeByDay[date] ?? Duration.zero) + entry.totalWorkedTime;
    }

    return timeByDay;
  }

  String _getPeriodLabel() {
    if (_selectedPeriod == 'week') {
      final monday = _selectedDate.subtract(Duration(days: _selectedDate.weekday - 1));
      final sunday = monday.add(const Duration(days: 6));
      return 'Uge ${_getWeekNumber(_selectedDate)}, ${DateFormat('d/M').format(monday)} - ${DateFormat('d/M').format(sunday)}';
    } else {
      return DateFormat('MMMM yyyy').format(_selectedDate);
    }
  }

  int _getWeekNumber(DateTime date) {
    final firstDayOfYear = DateTime(date.year, 1, 1);
    final daysSinceFirstDay = date.difference(firstDayOfYear).inDays;
    return ((daysSinceFirstDay + firstDayOfYear.weekday) / 7).ceil();
  }

  @override
  Widget build(BuildContext context) {
    final totalWorked = _getTotalWorkedTime();
    final totalBreak = _getTotalBreakTime();
    final timeByType = _getTimeByWorkType();
    final timeByDay = _getTimeByDay();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistik'),
      ),
      body: Column(
        children: [
          // Period selector
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                        value: 'week',
                        label: Text('Uge'),
                        icon: Icon(Icons.view_week),
                      ),
                      ButtonSegment(
                        value: 'month',
                        label: Text('Måned'),
                        icon: Icon(Icons.calendar_month),
                      ),
                    ],
                    selected: {_selectedPeriod},
                    onSelectionChanged: (Set<String> newSelection) {
                      setState(() {
                        _selectedPeriod = newSelection.first;
                      });
                      _loadStatistics();
                    },
                  ),
                ],
              ),
            ),
          ),

          // Navigation
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _previousPeriod,
                  ),
                  Text(
                    _getPeriodLabel(),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _nextPeriod,
                  ),
                ],
              ),
            ),
          ),

          // Statistics content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Total summary
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatCard(
                                'Total Arbejdstid',
                                _formatDuration(totalWorked),
                                Icons.work,
                                Colors.blue,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildStatCard(
                                'Total Pause',
                                _formatDuration(totalBreak),
                                Icons.pause_circle,
                                Colors.orange,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Expanded(
                              child: _buildStatCard(
                                'Antal Dage',
                                '${timeByDay.length}',
                                Icons.calendar_today,
                                Colors.green,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildStatCard(
                                'Gennemsnit/Dag',
                                timeByDay.isNotEmpty
                                    ? _formatDuration(Duration(
                                        minutes: totalWorked.inMinutes ~/
                                            timeByDay.length,
                                      ))
                                    : '0t 0m',
                                Icons.trending_up,
                                Colors.purple,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Time by work type
                        if (timeByType.isNotEmpty) ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Tid per Arbejdstype',
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                  const Divider(),
                                  ...timeByType.entries.map((entry) {
                                    final percentage = totalWorked.inMinutes > 0
                                        ? (entry.value.inMinutes / totalWorked.inMinutes * 100)
                                        : 0.0;
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Row(
                                                children: [
                                                  Icon(_getWorkTypeIcon(entry.key), size: 20),
                                                  const SizedBox(width: 8),
                                                  Text(_getWorkTypeName(entry.key)),
                                                ],
                                              ),
                                              Text(
                                                _formatDuration(entry.value),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          LinearProgressIndicator(
                                            value: percentage / 100,
                                            backgroundColor: Colors.grey[200],
                                            valueColor: AlwaysStoppedAnimation<Color>(
                                              _getWorkTypeColor(entry.key),
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${percentage.toStringAsFixed(1)}%',
                                            style: Theme.of(context).textTheme.bodySmall,
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Time by day
                        if (timeByDay.isNotEmpty) ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Tid per Dag',
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                  const Divider(),
                                  ...(timeByDay.entries.toList()
                                      ..sort((a, b) => a.key.compareTo(b.key)))
                                      .map((entry) {
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            DateFormat('EEEE d/M').format(entry.key),
                                          ),
                                          Text(
                                            _formatDuration(entry.value),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ],
                              ),
                            ),
                          ),
                        ],

                        // No data message
                        if (_entries.isEmpty && !_loading)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                children: [
                                  const Icon(Icons.bar_chart, size: 64, color: Colors.grey),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Ingen data for denne periode',
                                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                          color: Colors.grey,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getWorkTypeIcon(String workType) {
    switch (workType) {
      case 'DRIVING':
        return Icons.local_shipping;
      case 'DISTRIBUTION':
        return Icons.delivery_dining;
      case 'TERMINAL_WORK':
        return Icons.business;
      case 'MOVING':
        return Icons.moving;
      case 'LOADING':
        return Icons.file_upload;
      case 'UNLOADING':
        return Icons.file_download;
      default:
        return Icons.work;
    }
  }

  String _getWorkTypeName(String workType) {
    switch (workType) {
      case 'DRIVING':
        return 'Kørsel';
      case 'DISTRIBUTION':
        return 'Distribution';
      case 'TERMINAL_WORK':
        return 'Terminalarbejde';
      case 'MOVING':
        return 'Flytning';
      case 'LOADING':
        return 'Lastning';
      case 'UNLOADING':
        return 'Losning';
      default:
        return workType;
    }
  }

  Color _getWorkTypeColor(String workType) {
    switch (workType) {
      case 'DRIVING':
        return Colors.blue;
      case 'DISTRIBUTION':
        return Colors.green;
      case 'TERMINAL_WORK':
        return Colors.orange;
      case 'MOVING':
        return Colors.purple;
      case 'LOADING':
        return Colors.teal;
      case 'UNLOADING':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }
}
