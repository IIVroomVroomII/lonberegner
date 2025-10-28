import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/time_entry.dart';
import '../services/time_entry_service.dart';
import '../widgets/edit_time_entry_dialog.dart';

class TimeEntryDetailScreen extends StatefulWidget {
  final TimeEntry entry;

  const TimeEntryDetailScreen({
    super.key,
    required this.entry,
  });

  @override
  State<TimeEntryDetailScreen> createState() => _TimeEntryDetailScreenState();
}

class _TimeEntryDetailScreenState extends State<TimeEntryDetailScreen> {
  final TimeEntryService _service = TimeEntryService();
  late TimeEntry _entry;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _entry = widget.entry;
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}t ${minutes}m';
  }

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('dd/MM/yyyy HH:mm').format(dateTime);
  }

  Future<void> _deleteEntry() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Slet registrering'),
        content: const Text('Er du sikker på, at du vil slette denne tidsregistrering? Dette kan ikke fortrydes.'),
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
            child: const Text('Slet'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      if (_entry.id == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kunne ikke slette registrering - mangler ID'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      setState(() => _loading = true);

      final success = await _service.deleteEntry(_entry.id!);

      if (success && mounted) {
        Navigator.of(context).pop(true); // Return true to indicate entry was deleted
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tidsregistrering slettet')),
        );
      } else if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kunne ikke slette registrering'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _editEntry() async {
    if (_entry.id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Kunne ikke redigere registrering - mangler ID'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => EditTimeEntryDialog(entry: _entry),
    );

    if (result != null && mounted) {
      setState(() => _loading = true);

      final updatedEntry = await _service.updateEntry(_entry.id!, result);

      if (updatedEntry != null && mounted) {
        setState(() {
          _entry = updatedEntry;
          _loading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tidsregistrering opdateret')),
        );
      } else if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kunne ikke opdatere registrering'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Allow editing of any entry that's not approved or rejected
    final canEdit = _entry.status != 'APPROVED' && _entry.status != 'REJECTED';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tidsregistrering'),
        actions: [
          if (canEdit) ...[
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: _loading ? null : _editEntry,
              tooltip: 'Rediger',
            ),
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: _loading ? null : _deleteEntry,
              tooltip: 'Slet',
            ),
          ],
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Card
                  Card(
                    color: _getStatusColor(_entry.status).withOpacity(0.1),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(
                            _getStatusIcon(_entry.status),
                            size: 32,
                            color: _getStatusColor(_entry.status),
                          ),
                          const SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Status',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                              Text(
                                _getStatusText(_entry.status),
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      color: _getStatusColor(_entry.status),
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Work Info Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Arbejdsinfo',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const Divider(),
                          _buildInfoRow('Dato', DateFormat('dd/MM/yyyy').format(_entry.date)),
                          _buildInfoRow('Arbejdstype', _getWorkTypeName(_entry.workType)),
                          if (_entry.startTime != null)
                            _buildInfoRow('Start', DateFormat('HH:mm').format(_entry.startTime!)),
                          if (_entry.endTime != null)
                            _buildInfoRow('Slut', DateFormat('HH:mm').format(_entry.endTime!)),
                          _buildInfoRow('Arbejdstid', _formatDuration(_entry.totalWorkedTime)),
                          if (_entry.location != null && _entry.location!.isNotEmpty)
                            _buildInfoRow('Lokation', _entry.location!),
                          if (_entry.route != null && _entry.route!.isNotEmpty)
                            _buildInfoRow('Rute', _entry.route!),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Breaks Card
                  if (_entry.breaks.isNotEmpty) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Pauser',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const Spacer(),
                                Text(
                                  _formatDuration(_entry.totalBreakTime),
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                              ],
                            ),
                            const Divider(),
                            ..._entry.breaks.asMap().entries.map((e) {
                              final index = e.key;
                              final breakPeriod = e.value;
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  children: [
                                    Icon(
                                      breakPeriod.type == 'REST' ? Icons.hotel : Icons.pause_circle,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text('Pause ${index + 1}'),
                                    const Spacer(),
                                    Text(
                                      '${DateFormat('HH:mm').format(breakPeriod.startTime)} - ${breakPeriod.endTime != null ? DateFormat('HH:mm').format(breakPeriod.endTime!) : "Igangværende"}',
                                      style: const TextStyle(fontWeight: FontWeight.w500),
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

                  // Comment Card
                  if (_entry.comment != null && _entry.comment!.isNotEmpty) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Kommentar',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const Divider(),
                            Text(_entry.comment!),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Warning if can't edit
                  if (!canEdit)
                    Card(
                      color: Colors.blue[50],
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(Icons.info, color: Colors.blue[700]),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Denne registrering kan ikke redigeres eller slettes',
                                style: TextStyle(color: Colors.blue[700]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
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
      case 'DRAFT':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'APPROVED':
        return Icons.check_circle;
      case 'PENDING':
        return Icons.hourglass_empty;
      case 'REJECTED':
        return Icons.cancel;
      case 'DRAFT':
        return Icons.edit;
      default:
        return Icons.help;
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

  String _getWorkTypeName(String? workType) {
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
      case 'SMART':
        return 'Smart Start (GPS)';
      default:
        return workType ?? 'Ukendt';
    }
  }
}
