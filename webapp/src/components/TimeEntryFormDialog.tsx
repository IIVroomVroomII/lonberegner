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
  Checkbox,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { timeEntriesAPI, employeesAPI } from '../services/api';

interface TimeEntryFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entryId?: string | null;
}

interface Employee {
  id: string;
  employeeNumber: string;
  user: {
    name: string;
  };
}

// Beregn påskedag (Computus algoritme)
const calculateEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Tjek om dato er en dansk helligdag
const checkDanishHoliday = (date: Date, year: number): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Faste helligdage
  const fixedHolidays = [
    { month: 1, day: 1 },   // Nytårsdag
    { month: 6, day: 5 },   // Grundlovsdag (eftermiddag)
    { month: 12, day: 24 }, // Juleaftensdag (eftermiddag)
    { month: 12, day: 25 }, // 1. juledag
    { month: 12, day: 26 }, // 2. juledag
    { month: 12, day: 31 }, // Nytårsaftensdag (eftermiddag)
  ];

  if (fixedHolidays.some(h => h.month === month && h.day === day)) {
    return true;
  }

  // Bevægelige helligdage (baseret på påske)
  const easterDate = calculateEaster(year);
  const easterMonth = easterDate.getMonth() + 1;
  const easterDay = easterDate.getDate();

  // Skærtorsdag (3 dage før påske)
  if (month === easterMonth && day === easterDay - 3) return true;
  // Langfredag (2 dage før påske)
  if (month === easterMonth && day === easterDay - 2) return true;
  // Påskedag
  if (month === easterMonth && day === easterDay) return true;
  // 2. påskedag (1 dag efter påske)
  if (month === easterMonth && day === easterDay + 1) return true;
  // Store bededag (4. fredag efter påske)
  const storeBededag = new Date(easterDate);
  storeBededag.setDate(storeBededag.getDate() + 26);
  if (month === storeBededag.getMonth() + 1 && day === storeBededag.getDate()) return true;
  // Kristi himmelfartsdag (39 dage efter påske)
  const kristiHimmelfartsdag = new Date(easterDate);
  kristiHimmelfartsdag.setDate(kristiHimmelfartsdag.getDate() + 39);
  if (month === kristiHimmelfartsdag.getMonth() + 1 && day === kristiHimmelfartsdag.getDate()) return true;
  // Pinsedag (49 dage efter påske)
  const pinsedag = new Date(easterDate);
  pinsedag.setDate(pinsedag.getDate() + 49);
  if (month === pinsedag.getMonth() + 1 && day === pinsedag.getDate()) return true;
  // 2. pinsedag (50 dage efter påske)
  const andenpinsedag = new Date(easterDate);
  andenpinsedag.setDate(andenpinsedag.getDate() + 50);
  if (month === andenpinsedag.getMonth() + 1 && day === andenpinsedag.getDate()) return true;

  return false;
};

export default function TimeEntryFormDialog({
  open,
  onClose,
  onSuccess,
  entryId,
}: TimeEntryFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '16:00',
    breakDuration: 30,
    location: '',
    route: '',
    taskType: 'DISTRIBUTION',
    isIrregularHours: false,
    isNightWork: false,
    isWeekend: false,
    isHoliday: false,
    comment: '',
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (entryId) {
        fetchEntry();
      } else {
        resetForm();
      }
    }
  }, [open, entryId]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.list();
      setEmployees(response.data.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const fetchEntry = async () => {
    if (!entryId) return;
    try {
      const response = await timeEntriesAPI.get(entryId);
      const entry = response.data.data;

      const startDate = new Date(entry.startTime);
      const endDate = entry.endTime ? new Date(entry.endTime) : new Date();

      setFormData({
        employeeId: entry.employeeId,
        date: entry.date.split('T')[0],
        startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
        breakDuration: entry.breakDuration,
        location: entry.location || '',
        route: entry.route || '',
        taskType: entry.taskType,
        isIrregularHours: entry.isIrregularHours,
        isNightWork: entry.isNightWork,
        isWeekend: entry.isWeekend,
        isHoliday: entry.isHoliday,
        comment: entry.comment || '',
      });
    } catch (error) {
      console.error('Failed to fetch entry:', error);
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);
    const isWeekend = todayDate.getDay() === 0 || todayDate.getDay() === 6;
    const isHoliday = checkDanishHoliday(todayDate, todayDate.getFullYear());

    setFormData({
      employeeId: '',
      date: today,
      startTime: '08:00',
      endTime: '16:00',
      breakDuration: 30,
      location: '',
      route: '',
      taskType: 'DISTRIBUTION',
      isIrregularHours: false,
      isNightWork: false,
      isWeekend,
      isHoliday,
      comment: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      const payload = {
        employeeId: formData.employeeId,
        date: new Date(formData.date).toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        breakDuration: Number(formData.breakDuration),
        location: formData.location,
        route: formData.route || null,
        taskType: formData.taskType,
        isIrregularHours: formData.isIrregularHours,
        isNightWork: formData.isNightWork,
        isWeekend: formData.isWeekend,
        isHoliday: formData.isHoliday,
        comment: formData.comment || null,
      };

      if (entryId) {
        await timeEntriesAPI.update(entryId, payload);
      } else {
        await timeEntriesAPI.create(payload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setLoading(false);
    }
  };

  // Smart auto-detection når dato eller tid ændres
  useEffect(() => {
    if (!formData.date || !formData.startTime || !formData.endTime || entryId) return;

    const selectedDate = new Date(formData.date);
    const startHour = parseInt(formData.startTime.split(':')[0]);
    const endHour = parseInt(formData.endTime.split(':')[0]);
    const startMinutes = parseInt(formData.startTime.split(':')[1]);
    const endMinutes = parseInt(formData.endTime.split(':')[1]);

    // Auto-detect weekend (lørdag = 6, søndag = 0)
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;

    // Auto-detect natarbejde (22:00-06:00)
    const isNightWork = startHour >= 22 || startHour < 6 || endHour >= 22 || endHour < 6;

    // Auto-detect irregulære timer (før 06:00 eller efter 18:00, eller nat til dag skift)
    const isIrregularHours =
      startHour < 6 ||
      startHour >= 18 ||
      endHour < 6 ||
      endHour >= 18 ||
      (startHour >= 22 && endHour <= 6);

    // Auto-detect danske helligdage
    const year = selectedDate.getFullYear();
    const isHoliday = checkDanishHoliday(selectedDate, year);

    setFormData((prev) => ({
      ...prev,
      isWeekend,
      isNightWork,
      isIrregularHours,
      isHoliday,
    }));
  }, [formData.date, formData.startTime, formData.endTime]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
          borderRadius: '4px',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #3e3e42',
          color: '#7dd3fc',
          fontSize: '1.1rem',
          fontWeight: 600,
          py: 1.5,
        }}
      >
        {entryId ? 'Rediger tidsregistrering' : 'Ny tidsregistrering'}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5, pb: 2 }}>
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
                label="Dato"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.875rem' }}>Type</InputLabel>
                <Select
                  value={formData.taskType}
                  onChange={(e) => handleChange('taskType', e.target.value)}
                  label="Type"
                  required
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="DISTRIBUTION" sx={{ fontSize: '0.875rem' }}>Distribution</MenuItem>
                  <MenuItem value="TERMINAL_WORK" sx={{ fontSize: '0.875rem' }}>Terminal</MenuItem>
                  <MenuItem value="DRIVING" sx={{ fontSize: '0.875rem' }}>Kørsel</MenuItem>
                  <MenuItem value="MOVING" sx={{ fontSize: '0.875rem' }}>Flytning</MenuItem>
                  <MenuItem value="LOADING" sx={{ fontSize: '0.875rem' }}>Lastning</MenuItem>
                  <MenuItem value="UNLOADING" sx={{ fontSize: '0.875rem' }}>Losning</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Start tid"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Slut tid"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Pause (minutter)"
                type="number"
                value={formData.breakDuration}
                onChange={(e) => handleChange('breakDuration', e.target.value)}
                required
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
                label="Lokation"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                required
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
                label="Rute (valgfri)"
                value={formData.route}
                onChange={(e) => handleChange('route', e.target.value)}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  mb: 0.5,
                  fontStyle: 'italic'
                }}
              >
                💡 Opdateres automatisk baseret på dato og tid
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  p: 1.5,
                  backgroundColor: '#1e1e1e',
                  borderRadius: '4px',
                  border: '1px solid #3e3e42',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isIrregularHours}
                      onChange={(e) => handleChange('isIrregularHours', e.target.checked)}
                      sx={{
                        color: '#7dd3fc',
                        '&.Mui-checked': { color: '#7dd3fc' },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
                      Irregulære timer
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isNightWork}
                      onChange={(e) => handleChange('isNightWork', e.target.checked)}
                      sx={{
                        color: '#c084fc',
                        '&.Mui-checked': { color: '#c084fc' },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
                      Natarbejde
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isWeekend}
                      onChange={(e) => handleChange('isWeekend', e.target.checked)}
                      sx={{
                        color: '#fcd34d',
                        '&.Mui-checked': { color: '#fcd34d' },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
                      Weekend
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isHoliday}
                      onChange={(e) => handleChange('isHoliday', e.target.checked)}
                      sx={{
                        color: '#86efac',
                        '&.Mui-checked': { color: '#86efac' },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
                      Helligdag
                    </Typography>
                  }
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Kommentar (valgfri)"
                multiline
                rows={2}
                value={formData.comment}
                onChange={(e) => handleChange('comment', e.target.value)}
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                }}
              />
            </Grid>
          </Grid>
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
              backgroundColor: '#7dd3fc',
              color: '#1e1e1e',
              '&:hover': {
                backgroundColor: '#5eadd1',
              },
              '&:disabled': {
                backgroundColor: 'rgba(125, 211, 252, 0.3)',
                color: 'rgba(30, 30, 30, 0.5)',
              },
            }}
          >
            {loading ? 'Gemmer...' : 'Gem'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
