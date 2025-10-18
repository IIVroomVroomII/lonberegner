import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Chip,
  Alert,
} from '@mui/material';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { conflictsAPI } from '../services/api';

interface ConflictDetailDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: any;
  onResolved?: () => void;
}

export default function ConflictDetailDialog({
  open,
  onClose,
  conflict,
  onResolved,
}: ConflictDetailDialogProps) {
  const [resolutionType, setResolutionType] = useState<'ACCEPT_ORIGINAL' | 'ACCEPT_SUGGESTED' | 'MANUAL'>('ACCEPT_SUGGESTED');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!conflict) return null;

  const handleResolve = async () => {
    try {
      setLoading(true);
      setError('');

      const resolutionData: any = {
        resolution: resolutionType,
        note,
      };

      if (resolutionType === 'MANUAL') {
        if (!manualStartTime || !manualEndTime) {
          setError('Indtast både start- og sluttidspunkt for manuel justering');
          setLoading(false);
          return;
        }
        resolutionData.resolvedStartTime = new Date(manualStartTime);
        resolutionData.resolvedEndTime = new Date(manualEndTime);
      }

      await conflictsAPI.resolve(conflict.id, resolutionData);
      if (onResolved) onResolved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved løsning af konflikt');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError('');
      await conflictsAPI.reject(conflict.id, note);
      if (onResolved) onResolved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved afvisning af konflikt');
    } finally {
      setLoading(false);
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'TIME_ROUNDING':
        return 'Tidsafrunding';
      case 'PRE_MEETING_TIME':
        return 'Tid før mødetid';
      case 'TIME_START_MODE':
        return 'Start tidspunkt';
      case 'BREAK_DURATION':
        return 'Pause varighed';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'var(--accent-warning)';
      case 'APPROVED':
        return 'var(--accent-success)';
      case 'REJECTED':
        return 'var(--accent-danger)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: da });
    } catch {
      return 'Ugyldig dato';
    }
  };

  const formatTimeOnly = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: da });
    } catch {
      return '--:--';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
        },
      }}
    >
      <DialogTitle sx={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Konflikt Detaljer
          </Typography>
          <Chip
            label={conflict.status}
            size="small"
            sx={{
              backgroundColor: `${getStatusColor(conflict.status)}15`,
              color: getStatusColor(conflict.status),
              border: `1px solid ${getStatusColor(conflict.status)}`,
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              backgroundColor: 'rgba(224, 108, 117, 0.1)',
              border: '1px solid var(--accent-danger)',
              color: 'var(--accent-danger)',
            }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Conflict Information */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 0.5 }}>
                  Konflikt Type
                </Typography>
                <Typography variant="body1" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {getConflictTypeLabel(conflict.conflictType)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 0.5 }}>
                  Afvigelse
                </Typography>
                <Typography variant="body1" sx={{ color: 'var(--accent-warning)', fontWeight: 600 }}>
                  {conflict.deviationMinutes} min ({Number(conflict.deviationPercent).toFixed(1)}%)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Side-by-Side Comparison */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: 'var(--text-primary)', mb: 2, fontWeight: 600 }}>
            Tidssammenligning
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5}>
              <Card
                sx={{
                  backgroundColor: 'rgba(224, 108, 117, 0.08)',
                  border: '1px solid rgba(224, 108, 117, 0.3)',
                  borderRadius: '6px',
                }}
              >
                <CardContent>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'var(--accent-danger)',
                      mb: 2,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CancelIcon sx={{ fontSize: '1rem' }} />
                    Original Tid
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      Start
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {formatTime(conflict.originalStartTime)}
                    </Typography>
                  </Box>
                  {conflict.originalEndTime && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                        Slut
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {formatTime(conflict.originalEndTime)}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowForwardIcon sx={{ color: 'var(--accent-primary)', fontSize: '2rem' }} />
            </Grid>

            <Grid item xs={12} sm={5}>
              <Card
                sx={{
                  backgroundColor: 'rgba(152, 195, 121, 0.08)',
                  border: '1px solid rgba(152, 195, 121, 0.3)',
                  borderRadius: '6px',
                }}
              >
                <CardContent>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'var(--accent-success)',
                      mb: 2,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: '1rem' }} />
                    Foreslået Tid
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      Start
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {formatTime(conflict.suggestedStartTime)}
                    </Typography>
                  </Box>
                  {conflict.suggestedEndTime && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                        Slut
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {formatTime(conflict.suggestedEndTime)}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Profile Context */}
        {conflict.calculationProfile && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: 'var(--text-primary)', mb: 1.5, fontWeight: 600 }}>
              Beregningsprofil Regler
            </Typography>
            <Card
              sx={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: 'var(--text-primary)', mb: 1, fontWeight: 500 }}>
                  {conflict.calculationProfile.name}
                </Typography>
                {conflict.calculationProfile.description && (
                  <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {conflict.calculationProfile.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        <Divider sx={{ my: 3, borderColor: 'var(--border-color)' }} />

        {/* Resolution Options */}
        {conflict.status === 'PENDING' && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'var(--text-primary)', mb: 2, fontWeight: 600 }}>
              Vælg Løsning
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup value={resolutionType} onChange={(e) => setResolutionType(e.target.value as any)}>
                <Box
                  sx={{
                    mb: 1.5,
                    p: 2,
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    backgroundColor: resolutionType === 'ACCEPT_SUGGESTED' ? 'rgba(152, 195, 121, 0.05)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setResolutionType('ACCEPT_SUGGESTED')}
                >
                  <FormControlLabel
                    value="ACCEPT_SUGGESTED"
                    control={<Radio sx={{ color: 'var(--accent-success)' }} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          Accepter Foreslået Tid
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                          Anvend beregningsprofilens regler ({formatTimeOnly(conflict.suggestedStartTime)})
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                <Box
                  sx={{
                    mb: 1.5,
                    p: 2,
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    backgroundColor: resolutionType === 'ACCEPT_ORIGINAL' ? 'rgba(224, 108, 117, 0.05)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setResolutionType('ACCEPT_ORIGINAL')}
                >
                  <FormControlLabel
                    value="ACCEPT_ORIGINAL"
                    control={<Radio sx={{ color: 'var(--accent-danger)' }} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          Behold Original Tid
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                          Ignorer beregningsprofilens regler for denne registrering ({formatTimeOnly(conflict.originalStartTime)})
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    backgroundColor: resolutionType === 'MANUAL' ? 'rgba(97, 175, 239, 0.05)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setResolutionType('MANUAL')}
                >
                  <FormControlLabel
                    value="MANUAL"
                    control={<Radio sx={{ color: 'var(--accent-info)' }} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          Manuel Justering
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                          Angiv tilpassede tidspunkter
                        </Typography>
                      </Box>
                    }
                  />
                  {resolutionType === 'MANUAL' && (
                    <Box sx={{ mt: 2, ml: 4 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Start Tidspunkt"
                            type="datetime-local"
                            value={manualStartTime}
                            onChange={(e) => setManualStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: 'var(--text-primary)',
                                '& fieldset': { borderColor: 'var(--border-color)' },
                                '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                              },
                              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Slut Tidspunkt"
                            type="datetime-local"
                            value={manualEndTime}
                            onChange={(e) => setManualEndTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: 'var(--text-primary)',
                                '& fieldset': { borderColor: 'var(--border-color)' },
                                '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                              },
                              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Note (valgfri)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tilføj en note om hvorfor denne beslutning blev truffet..."
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              }}
            />
          </Box>
        )}

        {/* Already Resolved Info */}
        {conflict.status !== 'PENDING' && (
          <Box>
            <Alert
              severity={conflict.status === 'APPROVED' ? 'success' : 'error'}
              sx={{
                backgroundColor:
                  conflict.status === 'APPROVED' ? 'rgba(152, 195, 121, 0.1)' : 'rgba(224, 108, 117, 0.1)',
                border: `1px solid ${conflict.status === 'APPROVED' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                color: conflict.status === 'APPROVED' ? 'var(--accent-success)' : 'var(--accent-danger)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {conflict.status === 'APPROVED' ? 'Konflikt Godkendt' : 'Konflikt Afvist'}
              </Typography>
              {conflict.resolution && (
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  Løsning: {conflict.resolution}
                </Typography>
              )}
              {conflict.resolvedAt && (
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  Løst: {formatTime(conflict.resolvedAt)}
                </Typography>
              )}
              {conflict.resolvedBy && (
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  Af: {conflict.resolvedBy.name}
                </Typography>
              )}
              {conflict.resolutionNote && (
                <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                  Note: {conflict.resolutionNote}
                </Typography>
              )}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid var(--border-color)', px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'var(--text-secondary)',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
            },
          }}
        >
          {conflict.status === 'PENDING' ? 'Annuller' : 'Luk'}
        </Button>
        {conflict.status === 'PENDING' && (
          <>
            <Button
              onClick={handleReject}
              disabled={loading}
              sx={{
                color: 'var(--accent-danger)',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(224, 108, 117, 0.1)',
                },
              }}
            >
              Afvis
            </Button>
            <Button
              onClick={handleResolve}
              variant="contained"
              disabled={loading}
              sx={{
                backgroundColor: 'var(--accent-success)',
                color: '#fff',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'var(--accent-success)',
                  filter: 'brightness(1.1)',
                },
              }}
            >
              {loading ? 'Behandler...' : 'Godkend Løsning'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
