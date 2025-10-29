import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/time_entry.dart';
import '../services/time_entry_service.dart';

class EditTimeEntryDialog extends StatefulWidget {
  final TimeEntry entry;

  const EditTimeEntryDialog({
    super.key,
    required this.entry,
  });

  @override
  State<EditTimeEntryDialog> createState() => _EditTimeEntryDialogState();
}

class _EditTimeEntryDialogState extends State<EditTimeEntryDialog> {
  late String _selectedTaskType;
  late TextEditingController _locationController;
  late TextEditingController _routeController;
  late TextEditingController _commentController;
  late DateTime _startTime;
  late DateTime? _endTime;

  final Map<String, String> _taskTypes = {
    'DRIVING': 'Kørsel',
    'DISTRIBUTION': 'Distribution',
    'TERMINAL_WORK': 'Terminalarbejde',
    'MOVING': 'Flytning',
    'LOADING': 'Lastning',
    'UNLOADING': 'Losning',
  };

  final Map<String, IconData> _taskTypeIcons = {
    'DRIVING': Icons.local_shipping,
    'DISTRIBUTION': Icons.delivery_dining,
    'TERMINAL_WORK': Icons.business,
    'MOVING': Icons.moving,
    'LOADING': Icons.file_upload,
    'UNLOADING': Icons.file_download,
  };

  @override
  void initState() {
    super.initState();
    _selectedTaskType = widget.entry.workType ?? 'DRIVING';
    _locationController = TextEditingController(text: widget.entry.location ?? '');
    _routeController = TextEditingController(text: widget.entry.route ?? '');
    _commentController = TextEditingController(text: widget.entry.comment ?? '');
    _startTime = widget.entry.startTime ?? DateTime.now();
    _endTime = widget.entry.endTime;
  }

  @override
  void dispose() {
    _locationController.dispose();
    _routeController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _selectTime(BuildContext context, bool isStartTime) async {
    final currentTime = isStartTime ? _startTime : (_endTime ?? DateTime.now());

    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(currentTime),
    );

    if (picked != null) {
      setState(() {
        final date = widget.entry.date;
        final newDateTime = DateTime(
          date.year,
          date.month,
          date.day,
          picked.hour,
          picked.minute,
        );

        if (isStartTime) {
          _startTime = newDateTime;
        } else {
          _endTime = newDateTime;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Rediger Tidsregistrering'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Arbejdstype',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedTaskType,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: _taskTypes.entries.map((entry) {
                return DropdownMenuItem(
                  value: entry.key,
                  child: Row(
                    children: [
                      Icon(_taskTypeIcons[entry.key], size: 20),
                      const SizedBox(width: 8),
                      Text(entry.value),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedTaskType = value);
                }
              },
            ),
            const SizedBox(height: 16),

            // Start Time
            Text(
              'Starttidspunkt',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () => _selectTime(context, true),
              child: InputDecorator(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  suffixIcon: Icon(Icons.access_time),
                ),
                child: Text(DateFormat('HH:mm').format(_startTime)),
              ),
            ),
            const SizedBox(height: 16),

            // End Time
            Text(
              'Sluttidspunkt',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () => _selectTime(context, false),
              child: InputDecorator(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  suffixIcon: Icon(Icons.access_time),
                ),
                child: Text(
                  _endTime != null
                    ? DateFormat('HH:mm').format(_endTime!)
                    : 'Ikke angivet',
                ),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              'Lokation (valgfri)',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'F.eks. København',
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Rute (valgfri)',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _routeController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'F.eks. Rute 12',
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Kommentar (valgfri)',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _commentController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'Evt. noter',
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuller'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop({
              'taskType': _selectedTaskType,
              'startTime': TimeEntryService.formatDateTime(_startTime),
              if (_endTime != null) 'endTime': TimeEntryService.formatDateTime(_endTime!),
              'location': _locationController.text.isNotEmpty ? _locationController.text : null,
              'route': _routeController.text.isNotEmpty ? _routeController.text : null,
              'comment': _commentController.text.isNotEmpty ? _commentController.text : null,
            });
          },
          child: const Text('Gem'),
        ),
      ],
    );
  }
}
