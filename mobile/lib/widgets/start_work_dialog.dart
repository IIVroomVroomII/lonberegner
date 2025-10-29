import 'package:flutter/material.dart';

class StartWorkDialog extends StatefulWidget {
  const StartWorkDialog({super.key});

  @override
  State<StartWorkDialog> createState() => _StartWorkDialogState();
}

class _StartWorkDialogState extends State<StartWorkDialog> {
  String _selectedTaskType = 'DRIVING';
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _routeController = TextEditingController();
  final TextEditingController _commentController = TextEditingController();

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
  void dispose() {
    _locationController.dispose();
    _routeController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Start Arbejde'),
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
              maxLines: 2,
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
              'location': _locationController.text.isNotEmpty ? _locationController.text : null,
              'route': _routeController.text.isNotEmpty ? _routeController.text : null,
              'comment': _commentController.text.isNotEmpty ? _commentController.text : null,
            });
          },
          child: const Text('Start'),
        ),
      ],
    );
  }
}
