import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { reportsAPI } from '../services/api';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  apiCall: (params: any) => Promise<any>;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reports: ReportCard[] = [
    {
      id: 'payroll-summary',
      title: 'Lønsammenfatning',
      description: 'Komplet oversigt over lønberegninger for perioden',
      icon: <AssessmentIcon sx={{ fontSize: '2rem', color: 'var(--accent-cyan)' }} />,
      apiCall: reportsAPI.getPayrollSummaryCSV,
    },
    {
      id: 'time-entries',
      title: 'Tidsregistreringer',
      description: 'Detaljeret rapport over alle tidsregistreringer',
      icon: <AssessmentIcon sx={{ fontSize: '2rem', color: 'var(--accent-blue)' }} />,
      apiCall: reportsAPI.getTimeEntriesCSV,
    },
    {
      id: 'employee-hours',
      title: 'Medarbejder timer',
      description: 'Oversigt over arbejdede timer per medarbejder',
      icon: <AssessmentIcon sx={{ fontSize: '2rem', color: 'var(--accent-green)' }} />,
      apiCall: reportsAPI.getEmployeeHoursCSV,
    },
    {
      id: 'deviations',
      title: 'Afvigelser',
      description: 'Rapport over registrerede afvigelser og deres status',
      icon: <AssessmentIcon sx={{ fontSize: '2rem', color: 'var(--accent-yellow)' }} />,
      apiCall: reportsAPI.getDeviationsCSV,
    },
    {
      id: 'salary-cost',
      title: 'Lønomkostninger',
      description: 'Samlet omkostningsrapport for løn',
      icon: <AssessmentIcon sx={{ fontSize: '2rem', color: 'var(--accent-purple)' }} />,
      apiCall: reportsAPI.getSalaryCostCSV,
    },
  ];

  const handleDownloadReport = async (report: ReportCard) => {
    try {
      setLoading(report.id);
      setError(null);
      setSuccess(null);

      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await report.apiCall(params);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const dateStr = startDate && endDate
        ? `${startDate}_${endDate}`
        : new Date().toISOString().split('T')[0];

      link.setAttribute('download', `${report.id}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`${report.title} blev downloadet succesfuldt`);
    } catch (err: any) {
      setError(err.response?.data?.message || `Fejl ved download af ${report.title}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          mb: 3,
          fontWeight: 600,
          fontSize: '1.5rem',
          color: 'var(--text-primary)',
        }}
      >
        Rapporter
      </Typography>

      {/* Date Range Filter */}
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
            Tidsperiode
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Startdato"
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Slutdato"
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
          <Typography
            sx={{
              mt: 1.5,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            Hvis ingen periode er valgt, bruges standard perioden for hver rapport
          </Typography>
        </CardContent>
      </Card>

      {/* Alerts */}
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

      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(134, 239, 172, 0.1)',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            '& .MuiAlert-icon': { color: 'var(--accent-green)' },
          }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Report Cards */}
      <Grid container spacing={2.5}>
        {reports.map((report) => (
          <Grid item xs={12} md={6} key={report.id}>
            <Card
              elevation={0}
              sx={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'var(--accent-blue)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ mr: 2 }}>{report.icon}</Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        mb: 0.5,
                      }}
                    >
                      {report.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        mb: 2,
                      }}
                    >
                      {report.description}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={
                        loading === report.id ? (
                          <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                        ) : (
                          <DownloadIcon />
                        )
                      }
                      onClick={() => handleDownloadReport(report)}
                      disabled={loading === report.id}
                      sx={{
                        backgroundColor: 'var(--accent-blue)',
                        color: '#ffffff',
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        '&:hover': {
                          backgroundColor: 'var(--accent-blue)',
                          filter: 'brightness(1.1)',
                        },
                        '&:disabled': {
                          backgroundColor: 'var(--bg-active)',
                          color: 'var(--text-muted)',
                        },
                      }}
                    >
                      {loading === report.id ? 'Genererer...' : 'Download CSV'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
