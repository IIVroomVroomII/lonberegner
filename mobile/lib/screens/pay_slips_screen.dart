import 'package:flutter/material.dart';

class PaySlipsScreen extends StatelessWidget {
  const PaySlipsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lønkvitteringer'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.receipt_long,
                size: 120,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 32),
              Text(
                'Lønkvitteringer',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              Text(
                'Denne funktion er under udvikling',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.upcoming, color: Theme.of(context).primaryColor),
                          const SizedBox(width: 12),
                          Text(
                            'Kommende funktioner',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ],
                      ),
                      const Divider(),
                      _buildFeatureItem(context, 'Se tidligere lønkvitteringer'),
                      _buildFeatureItem(context, 'Download PDF af lønkvitteringer'),
                      _buildFeatureItem(context, 'Vis detaljeret lønberegning'),
                      _buildFeatureItem(context, 'Se skattetr�k og fradrag'),
                      _buildFeatureItem(context, 'Eksporter til regnskab'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back),
                label: const Text('Tilbage'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 20,
            color: Colors.green[600],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
