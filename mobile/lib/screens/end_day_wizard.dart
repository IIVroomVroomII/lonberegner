import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/work_session_provider.dart';
import '../services/auth_service.dart';
import '../services/work_categorization_service.dart';
import '../models/work_categorization.dart';

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

  // GPS categorization
  bool _isLoadingCategorization = false;
  CategorizationResult? _categorizationResult;
  bool _hasSmartMode = false;

  @override
  void initState() {
    super.initState();
    // Always start at step 0
    _currentStep = 0;

    // Check if this is SMART mode and load categorization
    _hasSmartMode = widget.workSession.currentEntry?.workType == 'SMART';
    if (_hasSmartMode) {
      _loadCategorization();
    }
  }

  Future<void> _loadCategorization() async {
    final authService = context.read<AuthService>();
    final entryId = widget.workSession.currentEntry?.id;

    if (entryId == null || authService.token == null) return;

    setState(() => _isLoadingCategorization = true);

    final service = WorkCategorizationService();
    final result = await service.categorizeWorkDay(entryId, authService.token!);

    setState(() {
      _categorizationResult = result;
      _isLoadingCategorization = false;
    });
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
            int totalSteps = widget.workSession.hasRequiredBreak ? 1 : 2;
            if (_hasSmartMode) totalSteps++; // Add GPS categorization step
            final isLastStep = _currentStep >= totalSteps - 1;

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
                      isLastStep ? 'Afslut Dag' : 'Næste',
                    ),
                  ),
                ],
              ),
            );
          },
          steps: [
            // Step 1: Check for break (if needed)
            if (!widget.workSession.hasRequiredBreak)
              Step(
                title: const Text('Pause påkrævet'),
                content: _buildBreakStep(),
                isActive: true,
              ),

            // Step 2: GPS Categorization (if SMART mode)
            if (_hasSmartMode)
              Step(
                title: const Text('GPS Kategorisering'),
                content: _buildCategorizationStep(),
                isActive: true,
              ),

            // Step 3: Summary and confirmation
            Step(
              title: const Text('Bekræft afslutning'),
              content: _buildSummaryStep(),
              isActive: true,
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

  Widget _buildCategorizationStep() {
    if (_isLoadingCategorization) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Analyserer GPS data...'),
            ],
          ),
        ),
      );
    }

    if (_categorizationResult == null || _categorizationResult!.workPeriods.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Column(
          children: [
            Icon(Icons.info_outline, size: 48, color: Colors.grey),
            SizedBox(height: 12),
            Text(
              'Ingen GPS data tilgængelig',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'GPS tracking var ikke aktiv eller ingen data blev indsamlet.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.auto_awesome, color: Colors.blue[700]),
            const SizedBox(width: 8),
            const Text(
              'GPS Kategorisering',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'Baseret på din GPS data, har vi kategoriseret din arbejdsdag:',
          style: TextStyle(fontSize: 12, color: Colors.grey),
        ),
        const SizedBox(height: 16),
        ...List.generate(
          _categorizationResult!.workPeriods.length,
          (index) {
            final period = _categorizationResult!.workPeriods[index];
            return _buildWorkPeriodCard(period, index);
          },
        ),
      ],
    );
  }

  Widget _buildWorkPeriodCard(WorkPeriod period, int index) {
    final startTime = period.startTime.toLocal();
    final endTime = period.endTime.toLocal();
    final duration = endTime.difference(startTime);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue[100],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Periode ${index + 1}',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue[900],
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDuration(duration),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.access_time, size: 16),
                const SizedBox(width: 4),
                Text(
                  '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')} - ${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  _getWorkTypeIcon(period.suggestedTaskType),
                  size: 20,
                  color: Colors.green[700],
                ),
                const SizedBox(width: 8),
                Text(
                  _getWorkTypeName(period.suggestedTaskType),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.green),
                  ),
                  child: Text(
                    '${period.confidence}%',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.green[900],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (period.reason != null) ...[
              const SizedBox(height: 6),
              Text(
                period.reason!,
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getWorkTypeIcon(String workType) {
    switch (workType) {
      case 'DRIVING':
        return Icons.local_shipping;
      case 'TERMINAL_WORK':
        return Icons.business;
      case 'DISTRIBUTION':
        return Icons.delivery_dining;
      case 'LOADING':
        return Icons.archive;
      case 'UNLOADING':
        return Icons.unarchive;
      case 'MOVING':
        return Icons.moving;
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
    // Calculate total steps dynamically
    final totalSteps = widget.workSession.hasRequiredBreak ? 1 : 2;
    final isLastStep = _currentStep >= totalSteps - 1;

    // If on break step (and break is missing), handle break input
    if (!widget.workSession.hasRequiredBreak && _currentStep == 0) {
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
        _currentStep++;
      });
      return;
    }

    // Final step: Confirm and close
    if (isLastStep) {
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
