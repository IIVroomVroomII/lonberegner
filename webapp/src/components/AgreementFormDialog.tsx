import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  Box,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { agreementsAPI } from '../services/api';

interface Agreement {
  id: string;
  name: string;
  type: string;
  validFrom: string;
  validTo: string | null;
  baseHourlyRate: number;
  weeklyHours: number;
  overtime1to3Rate: number;
  overtimeAbove3Rate: number;
  shiftedTimeRate: number;
  specialAllowancePercent: number;
  pensionEmployerPercent: number;
  pensionEmployeePercent: number;
  weekendAllowancePercent: number;
  holidayAllowancePercent: number;
  vacationPercent: number;
  vacationDaysPerYear: number;
  isActive: boolean;
}

interface AgreementFormDialogProps {
  open: boolean;
  onClose: () => void;
  agreement: Agreement | null;
}

export default function AgreementFormDialog({ open, onClose, agreement }: AgreementFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'DRIVER_AGREEMENT',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    baseHourlyRate: 150,
    weeklyHours: 37,
    overtime1to3Rate: 175,
    overtimeAbove3Rate: 200,
    shiftedTimeRate: 165,
    specialAllowancePercent: 7.6,
    pensionEmployerPercent: 11,
    pensionEmployeePercent: 2,
    weekendAllowancePercent: 50,
    holidayAllowancePercent: 100,
    vacationPercent: 12.5,
    vacationDaysPerYear: 25,
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (agreement) {
      setFormData({
        name: agreement.name,
        type: agreement.type,
        validFrom: new Date(agreement.validFrom).toISOString().split('T')[0],
        validTo: agreement.validTo ? new Date(agreement.validTo).toISOString().split('T')[0] : '',
        baseHourlyRate: Number(agreement.baseHourlyRate),
        weeklyHours: Number(agreement.weeklyHours),
        overtime1to3Rate: Number(agreement.overtime1to3Rate),
        overtimeAbove3Rate: Number(agreement.overtimeAbove3Rate),
        shiftedTimeRate: Number(agreement.shiftedTimeRate),
        specialAllowancePercent: Number(agreement.specialAllowancePercent),
        pensionEmployerPercent: Number(agreement.pensionEmployerPercent),
        pensionEmployeePercent: Number(agreement.pensionEmployeePercent),
        weekendAllowancePercent: Number(agreement.weekendAllowancePercent),
        holidayAllowancePercent: Number(agreement.holidayAllowancePercent),
        vacationPercent: Number(agreement.vacationPercent),
        vacationDaysPerYear: agreement.vacationDaysPerYear,
        isActive: agreement.isActive,
      });
    } else {
      // Reset form for new agreement
      setFormData({
        name: '',
        type: 'DRIVER_AGREEMENT',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: '',
        baseHourlyRate: 150,
        weeklyHours: 37,
        overtime1to3Rate: 175,
        overtimeAbove3Rate: 200,
        shiftedTimeRate: 165,
        specialAllowancePercent: 7.6,
        pensionEmployerPercent: 11,
        pensionEmployeePercent: 2,
        weekendAllowancePercent: 50,
        holidayAllowancePercent: 100,
        vacationPercent: 12.5,
        vacationDaysPerYear: 25,
        isActive: true,
      });
    }
    setError(null);
  }, [agreement, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const submitData = {
        ...formData,
        validTo: formData.validTo || null,
      };

      if (agreement) {
        await agreementsAPI.update(agreement.id, submitData);
      } else {
        await agreementsAPI.create(submitData);
      }

      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.map((e: any) => e.message).join(', ') ||
          'Der opstod en fejl'
      );
    } finally {
      setLoading(false);
    }
  };

  const agreementTypes = [
    { value: 'DRIVER_AGREEMENT', label: 'Chaufføroverenskomst' },
    { value: 'WAREHOUSE_AGREEMENT', label: 'Lageroverenskomst' },
    { value: 'MOVER_AGREEMENT', label: 'Flytteoverenskomst' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#252526',
          border: '1px solid #3e3e42',
        },
      }}
    >
      <DialogTitle sx={{ color: '#d4d4d4', borderBottom: '1px solid #3e3e42' }}>
        {agreement ? 'Rediger overenskomst' : 'Opret ny overenskomst'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              Grundoplysninger
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Navn"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              size="small"
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              size="small"
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            >
              {agreementTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Gyldig fra"
              name="validFrom"
              value={formData.validFrom}
              onChange={handleChange}
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Gyldig til (valgfri)"
              name="validTo"
              value={formData.validTo}
              onChange={handleChange}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* § 6 Løn */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              § 6 Løn
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Grundløn (kr/time)"
              name="baseHourlyRate"
              value={formData.baseHourlyRate}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.01' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Ugentlige timer"
              name="weeklyHours"
              value={formData.weeklyHours}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* § 7 Overarbejde */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              § 7 Overarbejde
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Overarbejde 1-3 timer (kr/time)"
              name="overtime1to3Rate"
              value={formData.overtime1to3Rate}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.01' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Overarbejde 4+ timer (kr/time)"
              name="overtimeAbove3Rate"
              value={formData.overtimeAbove3Rate}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.01' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* § 4 stk. 5 og § 8 */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              § 4 stk. 5 Forskudt tid & § 8 Særligt tillæg
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Forskudt tid (kr/time)"
              name="shiftedTimeRate"
              value={formData.shiftedTimeRate}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.01' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Særligt tillæg (%)"
              name="specialAllowancePercent"
              value={formData.specialAllowancePercent}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* § 9 Pension */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              § 9 Pension
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Arbejdsgiver pension (%)"
              name="pensionEmployerPercent"
              value={formData.pensionEmployerPercent}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Medarbejder pension (%)"
              name="pensionEmployeePercent"
              value={formData.pensionEmployeePercent}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* § 11 Weekend og helligdag */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              § 11 Weekend og helligdagstillæg
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Weekend tillæg (%)"
              name="weekendAllowancePercent"
              value={formData.weekendAllowancePercent}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Helligdag tillæg (%)"
              name="holidayAllowancePercent"
              value={formData.holidayAllowancePercent}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* § 12-13 Ferie */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#7dd3fc', mb: 1, fontWeight: 500 }}>
              § 12-13 Ferie
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Ferieprocent (%)"
              name="vacationPercent"
              value={formData.vacationPercent}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '0.1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Feriedage pr. år"
              name="vacationDaysPerYear"
              value={formData.vacationDaysPerYear}
              onChange={handleChange}
              required
              size="small"
              inputProps={{ step: '1' }}
              sx={{
                '& .MuiInputLabel-root': { color: '#9ca3af' },
                '& .MuiOutlinedInput-root': {
                  color: '#d4d4d4',
                  '& fieldset': { borderColor: '#3e3e42' },
                  '&:hover fieldset': { borderColor: '#7dd3fc' },
                },
              }}
            />
          </Grid>

          {/* Status */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange}
                  name="isActive"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#86efac',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#86efac',
                    },
                  }}
                />
              }
              label={<Typography sx={{ color: '#d4d4d4' }}>Aktiv overenskomst</Typography>}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #3e3e42', p: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#9ca3af',
            textTransform: 'none',
            '&:hover': { backgroundColor: '#3e3e42' },
          }}
        >
          Annuller
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            backgroundColor: '#7dd3fc',
            color: '#1e1e1e',
            textTransform: 'none',
            '&:hover': { backgroundColor: '#38bdf8' },
            '&:disabled': { backgroundColor: '#3e3e42', color: '#9ca3af' },
          }}
        >
          {loading ? 'Gemmer...' : agreement ? 'Gem ændringer' : 'Opret overenskomst'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
