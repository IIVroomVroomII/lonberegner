import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:provider/provider.dart';
import '../models/time_entry.dart';
import '../services/time_entry_service.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final TimeEntryService _service = TimeEntryService();
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  List<TimeEntry> _entries = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    _loadEntries();
  }

  Future<void> _loadEntries() async {
    setState(() => _loading = true);

    final start = DateTime(_focusedDay.year, _focusedDay.month, 1);
    final end = DateTime(_focusedDay.year, _focusedDay.month + 1, 0);

    final entries = await _service.getEntries(startDate: start, endDate: end);

    setState(() {
      _entries = entries;
      _loading = false;
    });
  }

  List<TimeEntry> _getEntriesForDay(DateTime day) {
    return _entries.where((entry) {
      return entry.date.year == day.year &&
          entry.date.month == day.month &&
          entry.date.day == day.day;
    }).toList();
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
        title: const Text('Historik'),
      ),
      body: Column(
        children: [
          TableCalendar(
            firstDay: DateTime.utc(2020, 1, 1),
            lastDay: DateTime.now(),
            focusedDay: _focusedDay,
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            calendarFormat: CalendarFormat.month,
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay;
              });
            },
            onPageChanged: (focusedDay) {
              _focusedDay = focusedDay;
              _loadEntries();
            },
            eventLoader: _getEntriesForDay,
            calendarStyle: CalendarStyle(
              markerDecoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const Divider(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _buildEntriesList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEntriesList() {
    if (_selectedDay == null) return const SizedBox();

    final dayEntries = _getEntriesForDay(_selectedDay!);

    if (dayEntries.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.calendar_today, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'Ingen registreringer denne dag',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: dayEntries.length,
      itemBuilder: (context, index) {
        final entry = dayEntries[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: _getStatusColor(entry.status),
              child: Icon(_getWorkTypeIcon(entry.workType), color: Colors.white),
            ),
            title: Text(
              '${DateFormat.Hm().format(entry.startTime!)} - ${entry.endTime != null ? DateFormat.Hm().format(entry.endTime!) : "Igangværende"}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text('${_formatDuration(entry.totalWorkedTime)} • ${entry.workType}'),
                if (entry.breaks.isNotEmpty)
                  Text('Pause: ${_formatDuration(entry.totalBreakTime)}',
                      style: const TextStyle(fontSize: 12)),
              ],
            ),
            trailing: Chip(
              label: Text(_getStatusText(entry.status)),
              backgroundColor: _getStatusColor(entry.status).withOpacity(0.2),
            ),
          ),
        );
      },
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'APPROVED':
        return 'Godkendt';
      case 'PENDING':
        return 'Afventer';
      case 'REJECTED':
        return 'Afvist';
      case 'DRAFT':
        return 'Kladde';
      default:
        return status;
    }
  }

  IconData _getWorkTypeIcon(String? workType) {
    switch (workType) {
      case 'DRIVING':
        return Icons.local_shipping;
      case 'TERMINAL':
        return Icons.business;
      case 'WAREHOUSE':
        return Icons.warehouse;
      default:
        return Icons.work;
    }
  }
}
