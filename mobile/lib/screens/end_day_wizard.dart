import 'package:flutter/material.dart';
import '../providers/work_session_provider.dart';

class EndDayWizard extends StatefulWidget {
  final WorkSessionProvider workSession;

  const EndDayWizard({super.key, required this.workSession});

  @override
  State<EndDayWizard> createState() => _EndDayWizardState();
}

class _EndDayWizardState extends State<EndDayWizard> {
  int _currentStep = 0;
  bool _addBreak = false;
  TimeOfDay? _breakStart;
  TimeOfDay? _breakEnd;

  @override
  void initState() {
    super.initState();
    // Skip to step 1 if break is missing
    if (!widget.workSession.hasRequiredBreak) {
      _currentStep = 0;
    } else {
      _currentStep = 1;
    }
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}t ${minutes}m';
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
        child: Stepper(
          currentStep: _currentStep,
          onStepContinue: _handleContinue,
          onStepCancel: _handleCancel,
          controlsBuilder: (context, details) {
            return Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Row(
                children: [
                  if (_currentStep > 0)
                    TextButton(
                      onPressed: details.onStepCancel,
                      child: const Text('Tilbage'),
                    ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: details.onStepContinue,
                    child: Text(
                      _currentStep == 1 ? 'Afslut Dag' : 'Næste',
                    ),
                  ),
                ],
              ),
            );
          },
          steps: [
            // Step 1: Check for break
            if (!widget.workSession.hasRequiredBreak)
              Step(
                title: const Text('Pause påkrævet'),
                content: _buildBreakStep(),
                isActive: _currentStep == 0,
              ),

            // Step 2: Summary and confirmation
            Step(
              title: const Text('Bekræft afslutning'),
              content: _buildSummaryStep(),
              isActive: _currentStep == 1,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakStep() {
    final workedHours = widget.workSession.workedTime.inHours;
    final requiredBreak = widget.workSession.requiredBreakTime;
    final actualBreak = widget.workSession.breakTime;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange[50],
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange),
          ),
          child: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange[700]),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Du har arbejdet $workedHours timer',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Påkrævet pause: ${_formatDuration(requiredBreak)}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    Text(
                      'Registreret pause: ${_formatDuration(actualBreak)}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Ifølge overenskomsten skal du holde pause. Har du holdt pause?',
          style: TextStyle(fontSize: 14),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          title: const Text('Tilføj pause'),
          subtitle: const Text('Angiv hvornår du holdt pause'),
          value: _addBreak,
          onChanged: (value) {
            setState(() {
              _addBreak = value;
            });
          },
        ),
        if (_addBreak) ...[
          const SizedBox(height: 12),
          ListTile(
            leading: const Icon(Icons.access_time),
            title: const Text('Pause start'),
            subtitle: Text(
              _breakStart?.format(context) ?? 'Vælg tidspunkt',
            ),
            onTap: () async {
              final time = await showTimePicker(
                context: context,
                initialTime: _breakStart ?? TimeOfDay.now(),
              );
              if (time != null) {
                setState(() => _breakStart = time);
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.access_time),
            title: const Text('Pause slut'),
            subtitle: Text(
              _breakEnd?.format(context) ?? 'Vælg tidspunkt',
            ),
            onTap: () async {
              final time = await showTimePicker(
                context: context,
                initialTime: _breakEnd ?? TimeOfDay.now(),
              );
              if (time != null) {
                setState(() => _breakEnd = time);
              }
            },
          ),
          if (_breakStart != null && _breakEnd != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green[700], size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Pause: ${_calculateBreakDuration()}',
                    style: TextStyle(color: Colors.green[700]),
                  ),
                ],
              ),
            ),
          ],
        ],
      ],
    );
  }

  Widget _buildSummaryStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Dagens arbejde',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildSummaryRow(
          'Arbejdstid',
          _formatDuration(widget.workSession.workedTime),
          Icons.work,
        ),
        _buildSummaryRow(
          'Pause',
          _formatDuration(widget.workSession.breakTime),
          Icons.pause_circle,
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue),
          ),
          child: Row(
            children: [
              Icon(Icons.info, color: Colors.blue[700]),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Din arbejdsdag bliver afsluttet og sendt til godkendelse.',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  String _calculateBreakDuration() {
    if (_breakStart == null || _breakEnd == null) return '';

    final start = Duration(hours: _breakStart!.hour, minutes: _breakStart!.minute);
    final end = Duration(hours: _breakEnd!.hour, minutes: _breakEnd!.minute);
    final duration = end - start;

    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);

    if (hours > 0) {
      return '$hours t $minutes min';
    }
    return '$minutes min';
  }

  void _handleContinue() async {
    // Step 0: Handle break input
    if (_currentStep == 0 && !widget.workSession.hasRequiredBreak) {
      if (_addBreak) {
        if (_breakStart == null || _breakEnd == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Vælg venligst start og slut tidspunkt for pausen'),
            ),
          );
          return;
        }

        // Add manual break
        final now = DateTime.now();
        final startTime = DateTime(
          now.year,
          now.month,
          now.day,
          _breakStart!.hour,
          _breakStart!.minute,
        );
        final endTime = DateTime(
          now.year,
          now.month,
          now.day,
          _breakEnd!.hour,
          _breakEnd!.minute,
        );

        final success = await widget.workSession.addManualBreak(
          startTime: startTime,
          endTime: endTime,
        );

        if (!success) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Kunne ikke tilføje pause'),
              ),
            );
          }
          return;
        }
      }

      // Move to next step
      setState(() {
        _currentStep = 1;
      });
      return;
    }

    // Final step: Confirm and close
    if (_currentStep == 1) {
      Navigator.of(context).pop(true);
    }
  }

  void _handleCancel() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    } else {
      Navigator.of(context).pop(false);
    }
  }
}
