import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  Grid,
  Divider,
  FormHelperText,
} from '@mui/material';
import { calculationProfilesAPI } from '../services/api';

interface ProfileFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile?: any;
}

export default function ProfileFormDialog({ open, onClose, onSuccess, profile }: ProfileFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    timeRoundingMinutes: 0,
    timeRoundingDirection: 'NEAREST',
    countPreMeetingTime: false,
    maxPreMeetingMinutes: 30,
    timeStartsAt: 'SCHEDULED',
    conflictHandling: 'MANUAL_REVIEW',
    conflictThresholdPercent: 10,
    isDefault: false,
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        description: profile.description || '',
        timeRoundingMinutes: profile.timeRoundingMinutes || 0,
        timeRoundingDirection: profile.timeRoundingDirection || 'NEAREST',
        countPreMeetingTime: profile.countPreMeetingTime || false,
        maxPreMeetingMinutes: profile.maxPreMeetingMinutes || 30,
        timeStartsAt: profile.timeStartsAt || 'SCHEDULED',
        conflictHandling: profile.conflictHandling || 'MANUAL_REVIEW',
        conflictThresholdPercent: profile.conflictThresholdPercent || 10,
        isDefault: profile.isDefault || false,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        timeRoundingMinutes: 0,
        timeRoundingDirection: 'NEAREST',
        countPreMeetingTime: false,
        maxPreMeetingMinutes: 30,
        timeStartsAt: 'SCHEDULED',
        conflictHandling: 'MANUAL_REVIEW',
        conflictThresholdPercent: 10,
        isDefault: false,
      });
    }
    setErrors({});
    setError('');
  }, [profile, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Navn er påkrævet';
    }

    if (formData.timeRoundingMinutes < 0) {
      newErrors.timeRoundingMinutes = 'Kan ikke være negativ';
    }

    if (formData.maxPreMeetingMinutes < 0 || formData.maxPreMeetingMinutes > 120) {
      newErrors.maxPreMeetingMinutes = 'Skal være mellem 0 og 120 minutter';
    }

    if (formData.conflictThresholdPercent < 0 || formData.conflictThresholdPercent > 100) {
      newErrors.conflictThresholdPercent = 'Skal være mellem 0 og 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      if (profile) {
        await calculationProfilesAPI.update(profile.id, formData);
      } else {
        await calculationProfilesAPI.create(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved gemning af profil');
    } finally {
      setLoading(false);
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
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
        {profile ? 'Rediger Beregningsprofil' : 'Opret Ny Beregningsprofil'}
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

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography
              variant="subtitle2"
              sx={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                mb: 2,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Grundlæggende Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Profil Navn"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  '& input': { color: 'var(--text-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiFormHelperText-root': { color: 'var(--accent-danger)' },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => handleChange('isDefault', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'var(--accent-primary)',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'var(--accent-primary)',
                    },
                  }}
                />
              }
              label="Standard Profil"
              sx={{
                '& .MuiFormControlLabel-label': {
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Beskrivelse"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  '& textarea': { color: 'var(--text-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              }}
            />
          </Grid>

          {/* Time Rounding */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1, borderColor: 'var(--border-color)' }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                mt: 2,
                mb: 2,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Tidsafrunding
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>Afrund til (minutter)</InputLabel>
              <Select
                value={formData.timeRoundingMinutes}
                onChange={(e) => handleChange('timeRoundingMinutes', e.target.value)}
                label="Afrund til (minutter)"
                sx={{
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent-primary)' },
                }}
              >
                <MenuItem value={0}>Ingen afrunding</MenuItem>
                <MenuItem value={5}>5 minutter</MenuItem>
                <MenuItem value={10}>10 minutter</MenuItem>
                <MenuItem value={15}>15 minutter</MenuItem>
                <MenuItem value={30}>30 minutter</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={formData.timeRoundingMinutes === 0}>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>Afrundingsretning</InputLabel>
              <Select
                value={formData.timeRoundingDirection}
                onChange={(e) => handleChange('timeRoundingDirection', e.target.value)}
                label="Afrundingsretning"
                sx={{
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent-primary)' },
                }}
              >
                <MenuItem value="UP">Rund altid op</MenuItem>
                <MenuItem value="DOWN">Rund altid ned</MenuItem>
                <MenuItem value="NEAREST">Rund til nærmeste</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Pre-Meeting Time */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1, borderColor: 'var(--border-color)' }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                mt: 2,
                mb: 2,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Tid Før Fastsat Mødetid
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.countPreMeetingTime}
                  onChange={(e) => handleChange('countPreMeetingTime', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'var(--accent-primary)',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'var(--accent-primary)',
                    },
                  }}
                />
              }
              label="Tæl tid før fastsat mødetid med"
              sx={{
                '& .MuiFormControlLabel-label': {
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Maksimum minutter før mødetid"
              value={formData.maxPreMeetingMinutes}
              onChange={(e) => handleChange('maxPreMeetingMinutes', parseInt(e.target.value) || 0)}
              error={!!errors.maxPreMeetingMinutes}
              helperText={errors.maxPreMeetingMinutes}
              disabled={!formData.countPreMeetingTime}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  '& input': { color: 'var(--text-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiFormHelperText-root': { color: 'var(--accent-danger)' },
              }}
            />
          </Grid>

          {/* Work Start Time */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1, borderColor: 'var(--border-color)' }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                mt: 2,
                mb: 2,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Arbejdstid Starter
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>Arbejdstid starter ved</InputLabel>
              <Select
                value={formData.timeStartsAt}
                onChange={(e) => handleChange('timeStartsAt', e.target.value)}
                label="Arbejdstid starter ved"
                sx={{
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent-primary)' },
                }}
              >
                <MenuItem value="SCHEDULED">Fastsat mødetid</MenuItem>
                <MenuItem value="ACTUAL">Faktisk ankomst</MenuItem>
              </Select>
              <FormHelperText sx={{ color: 'var(--text-muted)' }}>
                {formData.timeStartsAt === 'SCHEDULED'
                  ? 'Tiden starter ved den fastsatte mødetid, uanset hvornår medarbejderen ankommer'
                  : 'Tiden starter ved faktisk ankomst (check-in tidspunkt)'}
              </FormHelperText>
            </FormControl>
          </Grid>

          {/* Conflict Handling */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1, borderColor: 'var(--border-color)' }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                mt: 2,
                mb: 2,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Konflikt Håndtering
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>Håndteringsmetode</InputLabel>
              <Select
                value={formData.conflictHandling}
                onChange={(e) => handleChange('conflictHandling', e.target.value)}
                label="Håndteringsmetode"
                sx={{
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent-primary)' },
                }}
              >
                <MenuItem value="AUTO_ADJUST">Ret automatisk i forhold til profil</MenuItem>
                <MenuItem value="MANUAL_REVIEW">Send til konfliktliste til manuel gennemsyn</MenuItem>
                <MenuItem value="AUTO_WITH_NOTIFICATION">Ret automatisk, men notificer</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Konfliktgrænse (%)"
              value={formData.conflictThresholdPercent}
              onChange={(e) => handleChange('conflictThresholdPercent', parseFloat(e.target.value) || 0)}
              error={!!errors.conflictThresholdPercent}
              helperText={errors.conflictThresholdPercent || 'Procent afvigelse før konflikt oprettes'}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--border-hover)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                  '& input': { color: 'var(--text-primary)' },
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiFormHelperText-root': {
                  color: errors.conflictThresholdPercent ? 'var(--accent-danger)' : 'var(--text-muted)',
                },
              }}
            />
          </Grid>
        </Grid>
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
          Annuller
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'var(--accent-primary)',
              filter: 'brightness(1.1)',
            },
            '&:disabled': {
              backgroundColor: 'var(--bg-active)',
              color: 'var(--text-muted)',
            },
          }}
        >
          {loading ? 'Gemmer...' : profile ? 'Gem Ændringer' : 'Opret Profil'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
