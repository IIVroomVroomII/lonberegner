import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { auditLogsAPI } from '../services/api';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  oldValue: any;
  newValue: any;
  comment: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogStats {
  totalLogs: number;
  actionCounts: Record<string, number>;
  entityTypeCounts: Record<string, number>;
  dailyActivity: Array<{ date: string; count: number }>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await auditLogsAPI.list(params);
      const data = response.data.data;

      setLogs(data.auditLogs);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved hentning af audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await auditLogsAPI.getStats();
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, actionFilter, entityTypeFilter, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'var(--accent-green)';
      case 'UPDATE':
        return 'var(--accent-blue)';
      case 'DELETE':
        return 'var(--accent-red)';
      case 'APPROVE':
        return 'var(--accent-cyan)';
      case 'REJECT':
        return 'var(--accent-yellow)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE: 'Oprettet',
      UPDATE: 'Opdateret',
      DELETE: 'Slettet',
      APPROVE: 'Godkendt',
      REJECT: 'Afvist',
      LOGIN: 'Login',
      LOGOUT: 'Logout',
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      USER: 'Bruger',
      EMPLOYEE: 'Medarbejder',
      TIME_ENTRY: 'Tidsregistrering',
      PAYROLL: 'Lønberegning',
      AGREEMENT: 'Overenskomst',
      CALCULATION_PROFILE: 'Beregningsprofil',
      CONFLICT: 'Konflikt',
    };
    return labels[entityType] || entityType;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('da-DK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HistoryIcon sx={{ fontSize: '2rem', mr: 1.5, color: 'var(--accent-cyan)' }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            fontSize: '1.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Audit Log
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    mb: 0.5,
                  }}
                >
                  Total logs (30 dage)
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.75rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {stats.totalLogs}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    mb: 0.5,
                  }}
                >
                  Mest almindelige handling
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {Object.entries(stats.actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {Object.entries(stats.actionCounts).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} forekomster
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    mb: 0.5,
                  }}
                >
                  Mest ændret entitet
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {getEntityTypeLabel(
                    Object.entries(stats.entityTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
                  )}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {Object.entries(stats.entityTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} ændringer
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    mb: 0.5,
                  }}
                >
                  I dag
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.75rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {stats.dailyActivity[stats.dailyActivity.length - 1]?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Filtre
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--text-secondary)' }}>Handling</InputLabel>
                <Select
                  value={actionFilter}
                  label="Handling"
                  onChange={(e) => setActionFilter(e.target.value)}
                  sx={{
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border-color)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border-hover)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--accent-blue)',
                    },
                    color: 'var(--text-primary)',
                  }}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="CREATE">Oprettet</MenuItem>
                  <MenuItem value="UPDATE">Opdateret</MenuItem>
                  <MenuItem value="DELETE">Slettet</MenuItem>
                  <MenuItem value="APPROVE">Godkendt</MenuItem>
                  <MenuItem value="REJECT">Afvist</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--text-secondary)' }}>Entitetstype</InputLabel>
                <Select
                  value={entityTypeFilter}
                  label="Entitetstype"
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  sx={{
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border-color)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border-hover)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--accent-blue)',
                    },
                    color: 'var(--text-primary)',
                  }}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="USER">Bruger</MenuItem>
                  <MenuItem value="EMPLOYEE">Medarbejder</MenuItem>
                  <MenuItem value="TIME_ENTRY">Tidsregistrering</MenuItem>
                  <MenuItem value="PAYROLL">Lønberegning</MenuItem>
                  <MenuItem value="AGREEMENT">Overenskomst</MenuItem>
                  <MenuItem value="CALCULATION_PROFILE">Beregningsprofil</MenuItem>
                  <MenuItem value="CONFLICT">Konflikt</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Fra dato"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    '& fieldset': {
                      borderColor: 'var(--border-color)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--border-hover)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--accent-blue)',
                    },
                    '& input': {
                      color: 'var(--text-primary)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'var(--text-secondary)',
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Til dato"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '6px',
                    '& fieldset': {
                      borderColor: 'var(--border-color)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--border-hover)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--accent-blue)',
                    },
                    '& input': {
                      color: 'var(--text-primary)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'var(--text-secondary)',
                  },
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(224, 108, 117, 0.1)',
            border: '1px solid var(--accent-red)',
            color: 'var(--accent-red)',
            '& .MuiAlert-icon': { color: 'var(--accent-red)' },
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Audit Logs Table */}
      <Card
        elevation={0}
        sx={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--bg-active)' }}>
                <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Tidspunkt
                </TableCell>
                <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Handling
                </TableCell>
                <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Entitet
                </TableCell>
                <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Bruger
                </TableCell>
                <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  IP Adresse
                </TableCell>
                <TableCell sx={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Kommentar
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} sx={{ color: 'var(--accent-blue)' }} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'var(--text-secondary)' }}>
                    Ingen audit logs fundet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    sx={{
                      '&:hover': { backgroundColor: 'var(--bg-hover)' },
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getActionLabel(log.action)}
                        size="small"
                        sx={{
                          backgroundColor: `${getActionColor(log.action)}20`,
                          color: getActionColor(log.action),
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {getEntityTypeLabel(log.entityType)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {log.userName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {log.userEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {log.comment || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Rækker per side:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} af ${count}`}
          sx={{
            borderTop: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: 'var(--text-secondary)',
            },
            '& .MuiTablePagination-select': {
              color: 'var(--text-primary)',
            },
            '& .MuiTablePagination-actions button': {
              color: 'var(--text-primary)',
            },
          }}
        />
      </Card>
    </Box>
  );
}
