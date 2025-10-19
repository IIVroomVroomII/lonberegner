import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  Tab,
  Tabs,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  BugReport as TestIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

interface AIIntegration {
  id: string;
  name: string;
  description?: string;
  integrationType: string;
  targetSystem?: string;
  status: string;
  isActive: boolean;
  lastSyncAt?: string;
  lastSuccessAt?: string;
  lastErrorMessage?: string;
  mappingRules?: any;
  uploadedFiles: UploadedFile[];
  chatMessages: ChatMessage[];
}

interface ChatMessage {
  id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string;
}

interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const AIIntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<AIIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<AIIntegration | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    description: '',
    integrationType: 'DATA_IMPORT',
    targetSystem: '',
    documentationUrls: '',
  });
  const [chatMessage, setChatMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  useEffect(() => {
    // Auto scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedIntegration?.chatMessages]);

  const fetchIntegrations = async () => {
    try {
      const response = await api.get('/ai-integrations');
      setIntegrations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const handleCreateIntegration = async () => {
    try {
      setLoading(true);
      const response = await api.post('/ai-integrations', {
        ...newIntegration,
        documentationUrls: newIntegration.documentationUrls
          .split('\n')
          .filter(url => url.trim()),
      });

      await fetchIntegrations();
      setSelectedIntegration({
        ...response.data.data,
        uploadedFiles: response.data.data.uploadedFiles || [],
        chatMessages: response.data.data.chatMessages || [],
      });
      setOpenDialog(false);
      setNewIntegration({
        name: '',
        description: '',
        integrationType: 'DATA_IMPORT',
        targetSystem: '',
        documentationUrls: '',
      });
    } catch (error) {
      console.error('Error creating integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedIntegration) return;

    try {
      setLoading(true);
      const fileIds = (selectedIntegration.uploadedFiles || []).map(f => f.id);
      const response = await api.post(`/ai-integrations/${selectedIntegration.id}/chat`, {
        message: chatMessage,
        documentationUrls: [],
        fileIds,
      });

      // Refresh integration to get updated chat messages
      const updatedIntegration = await api.get(`/ai-integrations/${selectedIntegration.id}`);
      setSelectedIntegration(updatedIntegration.data.data);
      setChatMessage('');

      // Update integrations list
      setIntegrations(prev =>
        prev.map(i => (i.id === selectedIntegration.id ? updatedIntegration.data.data : i))
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedIntegration) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/ai-integrations/${selectedIntegration.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Refresh integration
      const updatedIntegration = await api.get(`/ai-integrations/${selectedIntegration.id}`);
      setSelectedIntegration(updatedIntegration.data.data);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedIntegration) return;

    try {
      await api.delete(`/ai-integrations/${selectedIntegration.id}/files/${fileId}`);

      // Refresh integration
      const updatedIntegration = await api.get(`/ai-integrations/${selectedIntegration.id}`);
      setSelectedIntegration(updatedIntegration.data.data);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration) return;

    try {
      setLoading(true);
      const response = await api.post(`/ai-integrations/${selectedIntegration.id}/test`);
      alert(response.data.success ? 'Test successful!' : 'Test failed!');
    } catch (error: any) {
      alert('Test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteIntegration = async (dryRun: boolean = false) => {
    if (!selectedIntegration) return;

    try {
      setLoading(true);
      const response = await api.post(`/ai-integrations/${selectedIntegration.id}/execute`, {
        dryRun,
      });

      if (response.data.success) {
        alert(`Execution ${dryRun ? '(dry run)' : ''} successful!`);
      } else {
        alert(`Execution failed: ${response.data.errors?.join(', ')}`);
      }
    } catch (error: any) {
      alert('Execution failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">AI Integrationer</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Ny Integration
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Integrations List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Mine Integrationer
            </Typography>
            <List>
              {integrations.map(integration => (
                <ListItemButton
                  key={integration.id}
                  selected={selectedIntegration?.id === integration.id}
                  onClick={() => setSelectedIntegration(integration)}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={integration.name}
                    secondary={
                      <>
                        <Chip label={integration.status} size="small" sx={{ mr: 1 }} />
                        {integration.targetSystem && (
                          <Typography variant="caption">{integration.targetSystem}</Typography>
                        )}
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Integration Details */}
        <Grid item xs={12} md={8}>
          {selectedIntegration ? (
            <Paper sx={{ p: 3, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">{selectedIntegration.name}</Typography>
                <Box>
                  <Button
                    startIcon={<TestIcon />}
                    onClick={handleTestConnection}
                    disabled={loading}
                    sx={{ mr: 1 }}
                  >
                    Test
                  </Button>
                  <Button
                    startIcon={<PlayIcon />}
                    variant="contained"
                    onClick={() => handleExecuteIntegration(false)}
                    disabled={loading}
                  >
                    Kør
                  </Button>
                </Box>
              </Box>

              {selectedIntegration.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedIntegration.description}
                </Typography>
              )}

              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
                <Tab label="Chat" />
                <Tab label="Filer" />
                <Tab label="Konfiguration" />
              </Tabs>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {/* Chat Tab */}
                {tabValue === 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                      {(selectedIntegration.chatMessages || []).length === 0 && (
                        <Box
                          sx={{
                            mb: 2,
                            p: 3,
                            backgroundColor: '#f5f5f5',
                            borderRadius: 2,
                            border: '2px dashed #ccc',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Claude
                          </Typography>
                          <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
                            Hej! Jeg er her for at hjælpe dig med at sætte denne integration op. 👋
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            For at komme i gang, kan du:
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                            <li>
                              <Typography variant="body2">
                                <strong>Upload API dokumentation</strong> (gå til "Filer" fanen) - PDF, JSON, Markdown osv.
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                <strong>Fortæl mig om systemet</strong> - Hvilke data skal du hente? Hvilke endpoints bruges?
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                <strong>Del eksempler</strong> - Vis mig hvordan data ser ud, så jeg kan hjælpe med at mappe felterne
                              </Typography>
                            </li>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Skriv din første besked nedenfor for at starte! 💬
                          </Typography>
                        </Box>
                      )}
                      {(selectedIntegration.chatMessages || []).map((msg, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            mb: 2,
                            p: 2,
                            backgroundColor: msg.role === 'USER' ? '#e3f2fd' : '#f5f5f5',
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {msg.role === 'USER' ? 'Dig' : 'Claude'}
                          </Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>
                        </Box>
                      ))}
                      <div ref={chatEndRef} />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        value={chatMessage}
                        onChange={e => setChatMessage(e.target.value)}
                        placeholder="Skriv en besked til Claude..."
                        onKeyPress={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={loading}
                      />
                      <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={loading || !chatMessage.trim()}
                      >
                        {loading ? <CircularProgress size={24} /> : <SendIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                )}

                {/* Files Tab */}
                {tabValue === 1 && (
                  <Box>
                    <Button
                      startIcon={<AttachFileIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      sx={{ mb: 2 }}
                    >
                      Upload Fil
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      onChange={handleFileUpload}
                      accept=".pdf,.json,.txt,.md,.html,.doc,.docx"
                    />

                    <List>
                      {(selectedIntegration.uploadedFiles || []).map(file => (
                        <ListItem
                          key={file.id}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={file.filename}
                            secondary={`${(file.size / 1024).toFixed(2)} KB`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Configuration Tab */}
                {tabValue === 2 && (
                  <Box>
                    {selectedIntegration.mappingRules ? (
                      <pre style={{ overflow: 'auto', backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                        {JSON.stringify(selectedIntegration.mappingRules, null, 2)}
                      </pre>
                    ) : (
                      <Alert severity="info">
                        Ingen konfiguration endnu. Chat med Claude for at generere en konfiguration.
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, height: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Vælg en integration fra listen eller opret en ny
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create Integration Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ny Integration</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Navn"
            value={newIntegration.name}
            onChange={e => setNewIntegration({ ...newIntegration, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={newIntegration.description}
            onChange={e => setNewIntegration({ ...newIntegration, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Målsystem"
            value={newIntegration.targetSystem}
            onChange={e => setNewIntegration({ ...newIntegration, targetSystem: e.target.value })}
            placeholder="f.eks. Harvest, Toggl, eget system"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Dokumentation URLs (en per linje)"
            value={newIntegration.documentationUrls}
            onChange={e => setNewIntegration({ ...newIntegration, documentationUrls: e.target.value })}
            multiline
            rows={4}
            placeholder="https://api.example.com/docs"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuller</Button>
          <Button
            onClick={handleCreateIntegration}
            variant="contained"
            disabled={loading || !newIntegration.name}
          >
            {loading ? <CircularProgress size={24} /> : 'Opret'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIIntegrationsPage;
