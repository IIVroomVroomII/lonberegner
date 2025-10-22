import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { apiKeysAPI } from '../services/api';

interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiKeysAPI.list();
      setApiKeys(response.data.data.apiKeys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showSnackbar('Kunne ikke hente API nøgler', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!formData.name) {
      showSnackbar('Navn er påkrævet', 'error');
      return;
    }

    try {
      const response = await apiKeysAPI.create(formData);
      const { key, name } = response.data.data;

      setNewKeyData({ key, name });
      setNewKeyDialogOpen(true);
      setDialogOpen(false);
      setFormData({ name: '', description: '' });

      fetchApiKeys();
      showSnackbar('API nøgle oprettet', 'success');
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      showSnackbar(error.response?.data?.message || 'Kunne ikke oprette API nøgle', 'error');
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!window.confirm(`Er du sikker på at du vil slette API nøglen "${name}"?`)) {
      return;
    }

    try {
      await apiKeysAPI.delete(id);
      fetchApiKeys();
      showSnackbar('API nøgle slettet', 'success');
    } catch (error: any) {
      console.error('Failed to delete API key:', error);
      showSnackbar(error.response?.data?.message || 'Kunne ikke slette API nøgle', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Kopieret til udklipsholder', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">API Nøgler</Typography>
        <Button
          variant="contained"
          startIcon={<VpnKeyIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Opret API Nøgle
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        API nøgler giver adgang til systemets API endpoints. Behandl dem som adgangskoder og del dem aldrig offentligt.
        Du kan kun se den fulde nøgle når den oprettes.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Navn</TableCell>
              <TableCell>Nøgle</TableCell>
              <TableCell>Beskrivelse</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sidst brugt</TableCell>
              <TableCell>Oprettet</TableCell>
              <TableCell align="right">Handlinger</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Indlæser...
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Ingen API nøgler fundet. Opret din første nøgle for at komme i gang.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>
                    <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {key.keyPrefix}
                    </Box>
                  </TableCell>
                  <TableCell>{key.description || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={key.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={key.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(key.lastUsedAt)}</TableCell>
                  <TableCell>{formatDate(key.createdAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleDeleteKey(key.id, key.name)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create API Key Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Opret ny API nøgle</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Navn"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
            helperText="Et beskrivende navn for nøglen (f.eks. 'Produktionsserver' eller 'Test integration')"
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            helperText="Valgfri beskrivelse af hvor og hvordan nøglen bruges"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuller</Button>
          <Button onClick={handleCreateKey} variant="contained">
            Opret
          </Button>
        </DialogActions>
      </Dialog>

      {/* Show New Key Dialog */}
      <Dialog
        open={newKeyDialogOpen}
        onClose={() => setNewKeyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>API Nøgle oprettet</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Vigtigt:</strong> Dette er den eneste gang du vil se denne nøgle.
            Gem den et sikkert sted. Hvis du mister den, skal du oprette en ny.
          </Alert>

          {newKeyData && (
            <Card sx={{ bgcolor: '#f5f5f5', mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Navn
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {newKeyData.name}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  API Nøgle
                </Typography>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'white',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {newKeyData.key}
                  </Typography>
                  <IconButton
                    onClick={() => copyToClipboard(newKeyData.key)}
                    size="small"
                    color="primary"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Brug denne nøgle i Authorization headeren: <code>Authorization: Bearer {'{'}api_key{'}'}</code>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewKeyDialogOpen(false)} variant="contained">
            Luk
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
