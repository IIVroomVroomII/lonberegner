import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip } from '@mui/material';
import { CheckCircle as CheckCircleIcon, RadioButtonUnchecked as RadioButtonUncheckedIcon } from '@mui/icons-material';

interface StandardIntegration {
  id: string;
  name: string;
  description: string;
  provider: string;
  category: 'PAYROLL' | 'TIME_TRACKING' | 'HR';
  status: 'AVAILABLE' | 'ACTIVE' | 'COMING_SOON';
  features: string[];
}

const standardIntegrations: StandardIntegration[] = [
  {
    id: 'danlon',
    name: 'Danløn',
    description: 'Integration til Danløn lønsystem. Importer medarbejdere, eksporter løndata og synkroniser automatisk.',
    provider: 'Danløn A/S',
    category: 'PAYROLL',
    status: 'AVAILABLE',
    features: [
      'Automatisk import af medarbejdere',
      'Eksport af løndata',
      'Synkronisering af tidsregistreringer',
      'Håndtering af fravær og tillæg',
    ],
  },
  {
    id: 'prolon',
    name: 'Proløn',
    description: 'Integration til Proløn lønsystem. Eksporter beregnet løn direkte til Proløn.',
    provider: 'Visma',
    category: 'PAYROLL',
    status: 'AVAILABLE',
    features: [
      'Direkte eksport til Proløn',
      'Import af medarbejderstamdata',
      'Håndtering af løntransaktioner',
      'Support for alle lønarter',
    ],
  },
  {
    id: 'datalon',
    name: 'Dataløn',
    description: 'Integration til Dataløn lønsystem. Synkroniser medarbejdere og eksporter lønkørsler.',
    provider: 'Dataløn',
    category: 'PAYROLL',
    status: 'AVAILABLE',
    features: [
      'Medarbejdersynkronisering',
      'Eksport af lønberegninger',
      'Support for tillæg og fradrag',
      'Automatisk opdatering af stamdata',
    ],
  },
];

const IntegrationsPage = () => {
  const handleActivate = (integrationId: string) => {
    console.log('Activate integration:', integrationId);
    // TODO: Implement activation logic
    alert(`Integration "${integrationId}" aktivering kommer snart!`);
  };

  const handleConfigure = (integrationId: string) => {
    console.log('Configure integration:', integrationId);
    // TODO: Navigate to configuration page
    alert(`Konfiguration af "${integrationId}" kommer snart!`);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Standard Integrationer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Forudbyggede integrationer til populære lønsystemer. Aktiver og konfigurer de integrationer du har brug for.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {standardIntegrations.map((integration) => (
          <Grid item xs={12} md={6} lg={4} key={integration.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h5" component="h2">
                    {integration.name}
                  </Typography>
                  {integration.status === 'ACTIVE' && (
                    <Chip
                      label="Aktiv"
                      color="success"
                      size="small"
                      icon={<CheckCircleIcon />}
                    />
                  )}
                  {integration.status === 'AVAILABLE' && (
                    <Chip
                      label="Tilgængelig"
                      color="default"
                      size="small"
                      icon={<RadioButtonUncheckedIcon />}
                    />
                  )}
                  {integration.status === 'COMING_SOON' && (
                    <Chip label="Kommer snart" color="info" size="small" />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {integration.description}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Udbyder: {integration.provider}
                </Typography>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Funktioner:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 0 }}>
                  {integration.features.map((feature, idx) => (
                    <Typography key={idx} component="li" variant="body2" sx={{ mb: 0.5 }}>
                      {feature}
                    </Typography>
                  ))}
                </Box>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                {integration.status === 'AVAILABLE' && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleActivate(integration.id)}
                  >
                    Aktiver integration
                  </Button>
                )}
                {integration.status === 'ACTIVE' && (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleConfigure(integration.id)}
                  >
                    Konfigurer
                  </Button>
                )}
                {integration.status === 'COMING_SOON' && (
                  <Button variant="outlined" fullWidth disabled>
                    Kommer snart
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Mangler du en integration?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hvis dit lønsystem ikke er på listen, kan du bruge "AI Integrationer" menuen til at oprette en skræddersyet integration med hjælp fra Claude AI.
        </Typography>
      </Box>
    </Box>
  );
};

export default IntegrationsPage;
