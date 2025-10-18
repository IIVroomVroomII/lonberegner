import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
  Checkbox,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import PendingIcon from '@mui/icons-material/Pending';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import FilterListIcon from '@mui/icons-material/FilterList';
import { conflictsAPI } from '../services/api';
import ConflictDetailDialog from '../components/ConflictDetailDialog';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface Conflict {
  id: string;
  timeEntryId: string;
  employeeId: string;
  conflictType: string;
  conflictDescription: string;
  status: string;
  deviationMinutes: number;
  deviationPercent: number;
  originalStartTime: string;
  suggestedStartTime: string;
  createdAt: string;
}

interface ConflictStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: Array<{ type: string; count: number }>;
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [stats, setStats] = useState<ConflictStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadConflicts();
    loadStats();
  }, [filterStatus, filterType, filterFromDate, filterToDate]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.conflictType = filterType;
      if (filterFromDate) params.fromDate = filterFromDate;
      if (filterToDate) params.toDate = filterToDate;

      const response = await conflictsAPI.list(params);
      setConflicts(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved indlæsning af konflikter');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await conflictsAPI.getStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Fejl ved indlæsning af statistik:', err);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingConflicts = conflicts.filter((c) => c.status === 'PENDING').map((c) => c.id);
      setSelectedConflicts(pendingConflicts);
    } else {
      setSelectedConflicts([]);
    }
  };

  const handleSelectConflict = (conflictId: string) => {
    setSelectedConflicts((prev) => {
      if (prev.includes(conflictId)) {
        return prev.filter((id) => id !== conflictId);
      } else {
        return [...prev, conflictId];
      }
    });
  };

  const handleBatchApprove = async () => {
    if (selectedConflicts.length === 0) return;

    try {
      await conflictsAPI.batchApprove(selectedConflicts);
      setSelectedConflicts([]);
      loadConflicts();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved batch godkendelse');
    }
  };

  const handleViewDetails = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setDetailDialogOpen(true);
  };

  const handleDetailDialogClose = () => {
    setDetailDialogOpen(false);
    setSelectedConflict(null);
    loadConflicts();
    loadStats();
  };

  const getStatusChip = (status: string) => {
    const statusConfig: any = {
      PENDING: { label: 'Afventer', color: 'var(--accent-warning)', icon: <PendingIcon /> },
      REVIEWED: { label: 'Gennemset', color: 'var(--accent-info)', icon: <VisibilityIcon /> },
      APPROVED: { label: 'Godkendt', color: 'var(--accent-success)', icon: <CheckCircleIcon /> },
      REJECTED: { label: 'Afvist', color: 'var(--accent-danger)', icon: <CancelIcon /> },
      AUTO_RESOLVED: { label: 'Auto-løst', color: 'var(--accent-secondary)', icon: <DoneAllIcon /> },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}`,
          fontSize: '0.75rem',
          height: '24px',
        }}
      />
    );
  };

  const getConflictTypeLabel = (type: string) => {
    const types: any = {
      TIME_ROUNDING: 'Tidsafrunding',
      PRE_MEETING_TIME: 'Tid før mødetid',
      LATE_ARRIVAL: 'For sen ankomst',
      EARLY_DEPARTURE: 'For tidlig afgang',
      EXCESSIVE_BREAK: 'For lang pause',
      MISSING_BREAK: 'Manglende pause',
      OVERTIME_THRESHOLD: 'Overarbejde grænse',
      OTHER: 'Andet',
    };
    return types[type] || type;
  };

  const pendingCount = conflicts.filter((c) => c.status === 'PENDING').length;
  const selectedCount = selectedConflicts.length;

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-primary)', mb: 0.5 }}>
            Konfliktliste
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Administrer og løs tidsregistreringskonflikter
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              textTransform: 'none',
              borderRadius: '6px',
              '&:hover': {
                borderColor: 'var(--accent-primary)',
                backgroundColor: 'rgba(97, 175, 239, 0.05)',
              },
            }}
          >
            {showFilters ? 'Skjul Filtre' : 'Vis Filtre'}
          </Button>
          {selectedCount > 0 && (
            <Button
              variant="contained"
              startIcon={<DoneAllIcon />}
              onClick={handleBatchApprove}
              sx={{
                backgroundColor: 'var(--accent-success)',
                color: '#fff',
                textTransform: 'none',
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: 'var(--accent-success)',
                  filter: 'brightness(1.1)',
                },
              }}
            >
              Godkend Valgte ({selectedCount})
            </Button>
          )}
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon sx={{ color: 'var(--accent-warning)', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    Afventer
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'var(--accent-warning)', fontWeight: 600 }}>
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon sx={{ color: 'var(--accent-success)', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    Godkendt
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'var(--accent-success)', fontWeight: 600 }}>
                  {stats.approved}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CancelIcon sx={{ color: 'var(--accent-danger)', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    Afvist
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'var(--accent-danger)', fontWeight: 600 }}>
                  {stats.rejected}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon sx={{ color: 'var(--text-secondary)', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    Total
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      {showFilters && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--text-secondary)' }}>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                  sx={{
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                  }}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="PENDING">Afventer</MenuItem>
                  <MenuItem value="APPROVED">Godkendt</MenuItem>
                  <MenuItem value="REJECTED">Afvist</MenuItem>
                  <MenuItem value="AUTO_RESOLVED">Auto-løst</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--text-secondary)' }}>Konflikttype</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Konflikttype"
                  sx={{
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
                  }}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="TIME_ROUNDING">Tidsafrunding</MenuItem>
                  <MenuItem value="PRE_MEETING_TIME">Tid før mødetid</MenuItem>
                  <MenuItem value="LATE_ARRIVAL">For sen ankomst</MenuItem>
                  <MenuItem value="EARLY_DEPARTURE">For tidlig afgang</MenuItem>
                  <MenuItem value="EXCESSIVE_BREAK">For lang pause</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Fra dato"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    '& input': { color: 'var(--text-primary)' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Til dato"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    '& input': { color: 'var(--text-primary)' },
                  },
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

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

      {/* Conflicts Table */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedCount > 0 && selectedCount === pendingCount}
                  indeterminate={selectedCount > 0 && selectedCount < pendingCount}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={pendingCount === 0}
                  sx={{
                    color: 'var(--text-secondary)',
                    '&.Mui-checked': { color: 'var(--accent-primary)' },
                    '&.MuiCheckbox-indeterminate': { color: 'var(--accent-primary)' },
                  }}
                />
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                TYPE
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                BESKRIVELSE
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                AFVIGELSE
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                STATUS
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                OPRETTET
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                HANDLINGER
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conflicts.map((conflict) => (
              <TableRow
                key={conflict.id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'var(--bg-hover)',
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedConflicts.includes(conflict.id)}
                    onChange={() => handleSelectConflict(conflict.id)}
                    disabled={conflict.status !== 'PENDING'}
                    sx={{
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': { color: 'var(--accent-primary)' },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getConflictTypeLabel(conflict.conflictType)}
                    size="small"
                    sx={{
                      backgroundColor: 'var(--bg-active)',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography sx={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {conflict.conflictDescription}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography sx={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                      {conflict.deviationMinutes} min
                    </Typography>
                    <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {conflict.deviationPercent.toFixed(1)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{getStatusChip(conflict.status)}</TableCell>
                <TableCell>
                  <Typography sx={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {format(new Date(conflict.createdAt), 'dd MMM yyyy', { locale: da })}
                  </Typography>
                  <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {format(new Date(conflict.createdAt), 'HH:mm')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Vis detaljer">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(conflict)}
                      sx={{
                        color: 'var(--accent-info)',
                        '&:hover': {
                          backgroundColor: 'rgba(97, 175, 239, 0.1)',
                        },
                      }}
                    >
                      <VisibilityIcon sx={{ fontSize: '1.125rem' }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {conflicts.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ color: 'var(--text-muted)' }}>
                    {filterStatus || filterType || filterFromDate || filterToDate
                      ? 'Ingen konflikter matcher de valgte filtre.'
                      : 'Ingen konflikter fundet. Det er godt nyt!'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Conflict Detail Dialog */}
      {selectedConflict && (
        <ConflictDetailDialog
          open={detailDialogOpen}
          onClose={handleDetailDialogClose}
          conflict={selectedConflict}
        />
      )}
    </Box>
  );
}
