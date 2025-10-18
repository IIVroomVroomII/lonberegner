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
} from '@mui/material';
import { employeesAPI, calculationProfilesAPI } from '../services/api';

interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string | null;
}

const jobCategories = [
  { value: 'DRIVER', label: 'Chauffør' },
  { value: 'WAREHOUSE', label: 'Lager' },
  { value: 'MOVER', label: 'Flyttearbejder' },
  { value: 'TERMINAL', label: 'Terminal' },
  { value: 'RENOVATION', label: 'Renovation' },
];

const agreementTypes = [
  { value: 'DRIVER_AGREEMENT', label: 'Chaufføroverenskomst' },
  { value: 'WAREHOUSE_AGREEMENT', label: 'Lageroverenskomst' },
  { value: 'MOVER_AGREEMENT', label: 'Flytteoverenskomst' },
];

const workTimeTypes = [
  { value: 'HOURLY', label: 'Timelønnet' },
  { value: 'SALARIED', label: 'Fuldlønnet' },
  { value: 'SUBSTITUTE', label: 'Afløser' },
  { value: 'SHIFT_WORK', label: 'Holddrift' },
];

export default function EmployeeFormDialog({
  open,
  onClose,
  onSuccess,
  employeeId,
}: EmployeeFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeNumber: '',
    cprNumber: '',
    jobCategory: 'DRIVER',
    agreementType: 'DRIVER_AGREEMENT',
    workTimeType: 'HOURLY',
    baseSalary: '',
    department: '',
    location: '',
    employmentDate: new Date().toISOString().split('T')[0],
    calculationProfileId: '',
  });

  useEffect(() => {
    if (open) {
      loadProfiles();
      if (employeeId) {
        fetchEmployee();
      }
    } else {
      resetForm();
    }
  }, [employeeId, open]);

  const loadProfiles = async () => {
    try {
      const response = await calculationProfilesAPI.list();
      setProfiles(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch calculation profiles:', error);
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.get(employeeId!);
      const employee = response.data.data;
      setFormData({
        name: employee.user.name,
        email: employee.user.email,
        password: '',
        employeeNumber: employee.employeeNumber,
        cprNumber: employee.cprNumber || '',
        jobCategory: employee.jobCategory,
        agreementType: employee.agreementType,
        workTimeType: employee.workTimeType,
        baseSalary: employee.baseSalary.toString(),
        department: employee.department || '',
        location: employee.location || '',
        employmentDate: new Date(employee.employmentDate).toISOString().split('T')[0],
        calculationProfileId: employee.calculationProfileId || '',
      });
    } catch (error) {
      console.error('Failed to fetch employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      employeeNumber: '',
      cprNumber: '',
      jobCategory: 'DRIVER',
      agreementType: 'DRIVER_AGREEMENT',
      workTimeType: 'HOURLY',
      baseSalary: '',
      department: '',
      location: '',
      employmentDate: new Date().toISOString().split('T')[0],
      calculationProfileId: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const data = {
        ...formData,
        baseSalary: parseFloat(formData.baseSalary),
        employmentDate: new Date(formData.employmentDate),
      };

      if (employeeId) {
        await employeesAPI.update(employeeId, data);
      } else {
        await employeesAPI.create(data);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      alert(error.response?.data?.message || 'Kunne ikke gemme medarbejder');
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
        },
      }}
    >
      <DialogTitle sx={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
        {employeeId ? 'Rediger medarbejder' : 'Ny medarbejder'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
            Bruger information
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Navn"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          {!employeeId && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required={!employeeId}
                sx={{
                  '& .MuiInputLabel-root': { color: '#9ca3af' },
                  '& .MuiOutlinedInput-root': {
                    color: '#d4d4d4',
                    '& fieldset': { borderColor: '#3e3e42' },
                    '&:hover fieldset': { borderColor: '#7dd3fc' },
                    '&.Mui-focused fieldset': { borderColor: '#7dd3fc' },
                  },
                }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                Medarbejder detaljer
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Medarbejder nummer"
              name="employeeNumber"
              value={formData.employeeNumber}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="CPR nummer"
              name="cprNumber"
              value={formData.cprNumber}
              onChange={handleChange}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Job kategori"
              name="jobCategory"
              value={formData.jobCategory}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            >
              {jobCategories.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Overenskomst"
              name="agreementType"
              value={formData.agreementType}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
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
              select
              label="Ansættelsestype"
              name="workTimeType"
              value={formData.workTimeType}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            >
              {workTimeTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Grundløn (kr/time)"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
              required
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Beregningsprofil"
              name="calculationProfileId"
              value={formData.calculationProfileId}
              onChange={handleChange}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            >
              <MenuItem value="">
                <em>Brug standard profil</em>
              </MenuItem>
              {profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.isDefault && ' (Standard)'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ansættelsesdato"
              name="employmentDate"
              type="date"
              value={formData.employmentDate}
              onChange={handleChange}
              required
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Afdeling"
              name="department"
              value={formData.department}
              onChange={handleChange}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Lokation"
              name="location"
              value={formData.location}
              onChange={handleChange}
              sx={{
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--border-color)' }}>
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
          }}
        >
          {loading ? 'Gemmer...' : 'Gem'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
