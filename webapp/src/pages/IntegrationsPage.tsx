import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

interface IntegrationConfig {
  id: string;
  teamId: string;
  name: string;
  type: 'DANLON' | 'PROLON' | 'DATALON';
  apiEndpoint?: string;
  apiKey?: string;
  partnerId?: string;
  partnerSecret?: string;
  appId?: string;
  username?: string;
  password?: string;
  isActive: boolean;
  status: 'NOT_CONFIGURED' | 'CONFIGURED' | 'TESTED_OK' | 'TESTED_ERROR' | 'ACTIVE';
  lastTestedAt?: string;
  lastTestSuccess?: boolean;
  lastErrorMessage?: string;
  lastSyncAt?: string;
  syncEmployees: boolean;
  syncTimeEntries: boolean;
  syncPayroll: boolean;
}

interface StandardIntegration {
  id: string;
  type: 'DANLON' | 'PROLON' | 'DATALON';
  name: string;
  description: string;
  provider: string;
  category: 'PAYROLL' | 'TIME_TRACKING' | 'HR';
  features: string[];
  config?: IntegrationConfig;
}

const standardIntegrations: Omit<StandardIntegration, 'config'>[] = [
  {
    id: 'danlon',
    type: 'DANLON',
    name: 'Danløn',
    description: 'Integration til Danløn lønsystem. Importer medarbejdere, eksporter løndata og synkroniser automatisk.',
    provider: 'Danløn A/S',
    category: 'PAYROLL',
    features: [
      'Automatisk import af medarbejdere',
      'Eksport af løndata',
      'Synkronisering af tidsregistreringer',
      'Håndtering af fravær og tillæg',
    ],
  },
  {
    id: 'prolon',
    type: 'PROLON',
    name: 'Proløn',
    description: 'Integration til Proløn lønsystem. Eksporter beregnet løn direkte til Proløn.',
    provider: 'Visma',
    category: 'PAYROLL',
    features: [
      'Direkte eksport til Proløn',
      'Import af medarbejderstamdata',
      'Håndtering af løntransaktioner',
      'Support for alle lønarter',
    ],
  },
  {
    id: 'datalon',
    type: 'DATALON',
    name: 'Dataløn',
    description: 'Integration til Dataløn lønsystem. Synkroniser medarbejdere og eksporter lønkørsler.',
    provider: 'Dataløn',
    category: 'PAYROLL',
    features: [
      'Medarbejdersynkronisering',
      'Eksport af lønberegninger',
      'Support for tillæg og fradrag',
      'Automatisk opdatering af stamdata',
    ],
  },
];

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<StandardIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<StandardIntegration | null>(null);
  const [formData, setFormData] = useState<Partial<IntegrationConfig>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations');
      const configs: IntegrationConfig[] = response.data.data || [];

      // Merge with standard integrations
      const merged = standardIntegrations.map(std => ({
        ...std,
        config: configs.find(c => c.type === std.type),
      }));

      setIntegrations(merged);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfig = (integration: StandardIntegration) => {
    setSelectedIntegration(integration);
    setFormData(integration.config || { type: integration.type, name: integration.name });
    setTestResult(null);
    setConfigDialogOpen(true);
  };

  const handleCloseConfig = () => {
    setConfigDialogOpen(false);
    setSelectedIntegration(null);
    setFormData({});
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!selectedIntegration) return;

    try {
      setSaving(true);
      await api.post('/integrations', {
        ...formData,
        type: selectedIntegration.type,
        name: selectedIntegration.name,
      });

      await fetchIntegrations();
      setTestResult({ success: true, message: 'Konfiguration gemt' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.response?.data?.message || 'Fejl ved gem' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedIntegration?.config?.id) {
      setTestResult({ success: false, message: 'Gem konfiguration først' });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const response = await api.post(`/integrations/${selectedIntegration.config.id}/test`);
      setTestResult(response.data.data);
      await fetchIntegrations();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Fejl ved test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleActivate = async (integration: StandardIntegration) => {
    if (!integration.config?.id) return;

    try {
      await api.post(`/integrations/${integration.config.id}/activate`);
      await fetchIntegrations();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Fejl ved aktivering');
    }
  };

  const handleDeactivate = async (integration: StandardIntegration) => {
    if (!integration.config?.id) return;

    try {
      await api.post(`/integrations/${integration.config.id}/deactivate`);
      await fetchIntegrations();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Fejl ved deaktivering');
    }
  };

  const handleSync = async (integration: StandardIntegration) => {
    if (!integration.config?.id) return;

    try {
      setSyncing(true);
      const response = await api.post(`/integrations/${integration.config.id}/sync`);
      alert(`Synkronisering gennemført:\n${JSON.stringify(response.data.data, null, 2)}`);
      await fetchIntegrations();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Fejl ved synkronisering');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'TESTED_OK':
        return 'info';
      case 'TESTED_ERROR':
        return 'error';
      case 'CONFIGURED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktiv';
      case 'TESTED_OK':
        return 'Testet OK';
      case 'TESTED_ERROR':
        return 'Test fejlede';
      case 'CONFIGURED':
        return 'Konfigureret';
      case 'NOT_CONFIGURED':
        return 'Ikke konfigureret';
      default:
        return 'Tilgængelig';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
        {integrations.map((integration) => (
          <Grid item xs={12} md={6} lg={4} key={integration.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h5" component="h2">
                    {integration.name}
                  </Typography>
                  <Chip
                    label={getStatusLabel(integration.config?.status)}
                    color={getStatusColor(integration.config?.status) as any}
                    size="small"
                    icon={integration.config?.isActive ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {integration.description}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Udbyder: {integration.provider}
                </Typography>

                {integration.config?.lastSyncAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Sidst synkroniseret: {new Date(integration.config.lastSyncAt).toLocaleString('da-DK')}
                  </Typography>
                )}

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

              <CardActions sx={{ p: 2, pt: 0, gap: 1, flexDirection: 'column' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SettingsIcon />}
                  onClick={() => handleOpenConfig(integration)}
                >
                  {integration.config ? 'Konfigurer' : 'Opsæt integration'}
                </Button>

                {integration.config?.status === 'TESTED_OK' && !integration.config.isActive && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleActivate(integration)}
                  >
                    Aktiver
                  </Button>
                )}

                {integration.config?.isActive && (
                  <>
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      onClick={() => handleDeactivate(integration)}
                    >
                      Deaktiver
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                      onClick={() => handleSync(integration)}
                      disabled={syncing}
                    >
                      Synkroniser nu
                    </Button>
                  </>
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

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={handleCloseConfig} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Konfigurer {selectedIntegration?.name}</Typography>
            <IconButton onClick={handleCloseConfig}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 3 }}>
              {testResult.message}
            </Alert>
          )}

          {selectedIntegration?.config?.lastErrorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {selectedIntegration.config.lastErrorMessage}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedIntegration?.description}
          </Typography>

          {selectedIntegration?.type === 'DATALON' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="API Endpoint"
                fullWidth
                value={formData.apiEndpoint || 'https://api.dataloen.dk'}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                helperText="Brug 'https://api.preprod.dataloen.dk' for test miljø"
              />
              <TextField
                label="Partner ID"
                fullWidth
                required
                value={formData.partnerId || ''}
                onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                helperText="Partner ID fra Dataløn"
              />
              <TextField
                label="Partner Secret"
                fullWidth
                required
                type="password"
                value={formData.partnerSecret || ''}
                onChange={(e) => setFormData({ ...formData, partnerSecret: e.target.value })}
                helperText="Partner Secret fra Dataløn"
              />
              <TextField
                label="App ID"
                fullWidth
                required
                value={formData.appId || ''}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                helperText="App ID fra Dataløn"
              />
              <TextField
                label="API Key"
                fullWidth
                required
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                helperText="API nøgle fra Dataløn consent flow"
              />
            </Box>
          )}

          {selectedIntegration?.type === 'DANLON' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="API Endpoint"
                fullWidth
                value={formData.apiEndpoint || 'https://api.danlon.dk/graphql'}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                helperText="Brug 'https://api-demo.danlon.dk/graphql' for demo miljø"
              />
              <TextField
                label="Client ID"
                fullWidth
                required
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                helperText="Client ID fra Danløn OAuth integration"
              />
              <TextField
                label="Client Secret"
                fullWidth
                required
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Client Secret fra Danløn OAuth integration"
              />
              <TextField
                label="Refresh Token"
                fullWidth
                required
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                helperText="Refresh token fra Danløn OAuth flow"
              />
            </Box>
          )}

          {selectedIntegration?.type === 'PROLON' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Proløn integration er under udvikling. Kontakt support for mere information.
              </Alert>
              <TextField
                label="API Key"
                fullWidth
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Synkroniserings indstillinger
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.syncEmployees || false}
                  onChange={(e) => setFormData({ ...formData, syncEmployees: e.target.checked })}
                />
              }
              label="Synkroniser medarbejdere"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.syncTimeEntries || false}
                  onChange={(e) => setFormData({ ...formData, syncTimeEntries: e.target.checked })}
                />
              }
              label="Synkroniser tidregistreringer"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.syncPayroll || false}
                  onChange={(e) => setFormData({ ...formData, syncPayroll: e.target.checked })}
                />
              }
              label="Synkroniser løndata"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfig}>Annuller</Button>
          <Button onClick={handleTest} disabled={testing || saving} variant="outlined">
            {testing ? <CircularProgress size={20} /> : 'Test forbindelse'}
          </Button>
          <Button onClick={handleSave} disabled={saving || testing} variant="contained">
            {saving ? <CircularProgress size={20} /> : 'Gem'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationsPage;
