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
import WarningIcon from '@mui/icons-material/Warning';
import { dashboardAPI } from '../services/api';

interface DashboardStats {
  overview: {
    activeEmployees: number;
    timeEntriesThisMonth: number;
    totalHoursThisMonth: number;
    pendingDeviations: number;
    payrollsThisMonth: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    userName: string;
    createdAt: string;
  }>;
  upcomingPayrolls: Array<{
    id: string;
    employeeName: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    totalGrossPay: number;
    status: string;
  }>;
  topEmployees: Array<{
    employeeName: string;
    hours: number;
    entries: number;
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
        <Grid item xs={12} sm={6} md={2.4}>
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
                {stats?.overview.timeEntriesThisMonth || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Denne måned
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
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
                {stats?.overview.payrollsThisMonth || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Denne måned
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
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
                {stats?.overview.activeEmployees || 0}
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

        <Grid item xs={12} sm={6} md={2.4}>
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
                {stats?.overview.totalHoursThisMonth || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Arbejdede timer
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
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
                <WarningIcon
                  sx={{ mr: 1, fontSize: '1.25rem', color: '#f87171' }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#d4d4d4' }}
                >
                  Afvigelser
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#f87171',
                  mb: 0.5,
                }}
              >
                {stats?.overview.pendingDeviations || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8rem', color: '#9ca3af' }}
              >
                Afventer handling
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
                    key={activity.id}
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
                            {activity.userName} - {activity.action} ({activity.entityType})
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mt: 0.5 }}>
                          {new Date(activity.createdAt).toLocaleString('da-DK', {
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
