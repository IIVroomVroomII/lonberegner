import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  Grid,
} from '@mui/material';
import { payrollsAPI, employeesAPI } from '../services/api';

interface CalculatePayrollDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Employee {
  id: string;
  employeeNumber: string;
  user: {
    name: string;
  };
}

export default function CalculatePayrollDialog({
  open,
  onClose,
  onSuccess,
}: CalculatePayrollDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      // Set default period to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFormData({
        employeeId: '',
        periodStart: firstDay.toISOString().split('T')[0],
        periodEnd: lastDay.toISOString().split('T')[0],
      });
      setError('');
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.list();
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        employeeId: formData.employeeId,
        periodStart: new Date(formData.periodStart).toISOString(),
        periodEnd: new Date(formData.periodEnd).toISOString(),
      };

      await payrollsAPI.calculate(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lønberegning fejlede');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#252526',
          border: '1px solid #3e3e42',
          borderRadius: '4px',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #3e3e42',
          color: '#c084fc',
          fontSize: '1.1rem',
          fontWeight: 600,
          py: 1.5,
        }}
      >
        Beregn løn for periode
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5, pb: 2 }}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                backgroundColor: 'rgba(252, 165, 165, 0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(252, 165, 165, 0.3)',
                borderRadius: '4px',
                '& .MuiAlert-icon': {
                  color: '#fca5a5',
                },
              }}
            >
              {error}
            </Alert>
          )}

          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Vælg medarbejder og periode for at beregne løn baseret på godkendte tidsregistreringer.
            Systemet anvender automatisk de relevante overenskomstregler.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Medarbejder</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  label="Medarbejder"
                  required
                  sx={{ fontSize: '0.875rem' }}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id} sx={{ fontSize: '0.875rem' }}>
                      {emp.user.name} ({emp.employeeNumber})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Periode start"
                type="date"
                value={formData.periodStart}
                onChange={(e) => handleChange('periodStart', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Periode slut"
                type="date"
                value={formData.periodEnd}
                onChange={(e) => handleChange('periodEnd', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              backgroundColor: '#1e1e1e',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: '#7dd3fc', fontWeight: 600, mb: 0.5 }}>
              Automatisk beregning inkluderer:
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#d4d4d4', lineHeight: 1.6 }}>
              • Grundløn (§6) baseret på normale timer
              <br />
              • Overarbejdsbetaling (§7) - 110% for 1-3 timer, 120% derefter
              <br />
              • Natarbejde og weekendtillæg
              <br />
              • Særligt tillæg (§8) - 9% af ferieberettiget løn
              <br />
              • Pension (§9) - Arbejdsgiver 9%, medarbejder 3%
              <br />
              • Feriepenge (§11) - 12,5%
              <br />• Forskudt tid (§12-13) - 15% tillæg
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: '1px solid #3e3e42',
            backgroundColor: '#1e1e1e',
            px: 2.5,
            py: 1.5,
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(156, 163, 175, 0.1)',
              },
            }}
          >
            Annuller
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: '#c084fc',
              color: '#1e1e1e',
              '&:hover': {
                backgroundColor: '#a855f7',
              },
              '&:disabled': {
                backgroundColor: 'rgba(192, 132, 252, 0.3)',
                color: 'rgba(30, 30, 30, 0.5)',
              },
            }}
          >
            {loading ? 'Beregner...' : 'Beregn løn'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
