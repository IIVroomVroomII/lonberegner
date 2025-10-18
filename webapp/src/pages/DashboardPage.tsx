import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { dashboardAPI } from '../services/api';

interface DashboardStats {
  pendingTimeEntries: number;
  draftPayrolls: number;
  activeEmployees: number;
  totalHoursThisMonth: number;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
    status: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats();
        setStats(response.data.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Der opstod en fejl ved indlæsning af dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#fbbf24';
      case 'APPROVED':
        return '#86efac';
      case 'REJECTED':
        return '#f87171';
      case 'DRAFT':
        return '#7dd3fc';
      case 'FINAL':
        return '#86efac';
      default:
        return '#9ca3af';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Afventer';
      case 'APPROVED':
        return 'Godkendt';
      case 'REJECTED':
        return 'Afvist';
      case 'DRAFT':
        return 'Kladde';
      case 'FINAL':
        return 'Endelig';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#7dd3fc' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          mb: 2.5,
          fontWeight: 600,
          fontSize: '1.5rem',
          color: '#d4d4d4',
        }}
      >
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <AccessTimeIcon
                  sx={{ mr: 1, fontSize: '1.25rem', color: '#7dd3fc' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#d4d4d4' }}
                >
                  Tidsregistreringer
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#7dd3fc',
                  mb: 0.5,
                }}
              >
                {stats?.pendingTimeEntries || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Afventer godkendelse
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PaymentIcon
                  sx={{ mr: 1, fontSize: '1.25rem', color: '#c084fc' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#d4d4d4' }}
                >
                  Lønberegninger
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#c084fc',
                  mb: 0.5,
                }}
              >
                {stats?.draftPayrolls || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Klar til gennemsyn
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PeopleIcon
                  sx={{ mr: 1, fontSize: '1.25rem', color: '#86efac' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#d4d4d4' }}
                >
                  Medarbejdere
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#86efac',
                  mb: 0.5,
                }}
              >
                {stats?.activeEmployees || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Aktive medarbejdere
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <TrendingUpIcon
                  sx={{ mr: 1, fontSize: '1.25rem', color: '#fbbf24' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#d4d4d4' }}
                >
                  Timer denne måned
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#fbbf24',
                  mb: 0.5,
                }}
              >
                {stats?.totalHoursThisMonth || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Godkendte timer
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: 1.5,
                fontSize: '0.95rem',
                fontWeight: 500,
                color: '#d4d4d4',
              }}
            >
              Seneste aktivitet
            </Typography>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <List sx={{ py: 0 }}>
                {stats.recentActivity.map((activity, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      px: 0,
                      py: 1,
                      borderBottom:
                        index < stats.recentActivity.length - 1
                          ? '1px solid #3e3e42'
                          : 'none',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              color: '#d4d4d4',
                              fontWeight: 500,
                            }}
                          >
                            {activity.description}
                          </Typography>
                          <Chip
                            label={getStatusLabel(activity.status)}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: '20px',
                              backgroundColor: getStatusColor(activity.status) + '20',
                              color: getStatusColor(activity.status),
                              border: `1px solid ${getStatusColor(activity.status)}`,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mt: 0.5 }}>
                          {new Date(activity.date).toLocaleString('da-DK', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography
                variant="body2"
                sx={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.6 }}
              >
                Velkommen til lønberegningssystemet. Her kan du administrere tidsregistreringer,
                beregne løn baseret på overenskomstregler, og eksportere til lønsystemer.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
