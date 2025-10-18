import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { calculationProfilesAPI } from '../services/api';
import ProfileFormDialog from '../components/ProfileFormDialog';

interface CalculationProfile {
  id: string;
  name: string;
  description?: string;
  timeRoundingMinutes: number;
  timeRoundingDirection: string;
  countPreMeetingTime: boolean;
  maxPreMeetingMinutes: number;
  timeStartsAt: string;
  conflictHandling: string;
  conflictThresholdPercent: number;
  isDefault: boolean;
  _count?: { employees: number };
}

interface ProfileStats {
  profileId: string;
  profileName: string;
  isDefault: boolean;
  employeeCount: number;
}

export default function CalculationProfilesPage() {
  const [profiles, setProfiles] = useState<CalculationProfile[]>([]);
  const [stats, setStats] = useState<ProfileStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CalculationProfile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<CalculationProfile | null>(null);

  useEffect(() => {
    loadProfiles();
    loadStats();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await calculationProfilesAPI.list();
      setProfiles(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved indlæsning af profiler');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await calculationProfilesAPI.getStats();
      setStats(response.data.data || []);
    } catch (err) {
      console.error('Fejl ved indlæsning af statistik:', err);
    }
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (profile: CalculationProfile) => {
    setEditingProfile(profile);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (profile: CalculationProfile) => {
    setProfileToDelete(profile);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;

    try {
      await calculationProfilesAPI.delete(profileToDelete.id);
      setDeleteConfirmOpen(false);
      setProfileToDelete(null);
      loadProfiles();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved sletning af profil');
      setDeleteConfirmOpen(false);
    }
  };

  const handleFormSuccess = () => {
    setFormDialogOpen(false);
    setEditingProfile(null);
    loadProfiles();
    loadStats();
  };

  const getRoundingLabel = (minutes: number, direction: string) => {
    if (minutes === 0) return 'Ingen afrunding';
    const directionLabel = direction === 'UP' ? 'op' : direction === 'DOWN' ? 'ned' : 'nærmeste';
    return `${minutes} min (${directionLabel})`;
  };

  const getConflictHandlingLabel = (handling: string) => {
    switch (handling) {
      case 'AUTO_ADJUST':
        return 'Automatisk justering';
      case 'MANUAL_REVIEW':
        return 'Manuel gennemsyn';
      case 'AUTO_WITH_NOTIFICATION':
        return 'Auto + notifikation';
      default:
        return handling;
    }
  };

  const totalEmployees = stats.reduce((sum, stat) => sum + stat.employeeCount, 0);
  const totalProfiles = profiles.length;

  if (loading) {
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
            Beregningsprofiler
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Administrer profiler for tidsberegning og konflikt håndtering
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            textTransform: 'none',
            borderRadius: '6px',
            '&:hover': {
              backgroundColor: 'var(--accent-primary)',
              filter: 'brightness(1.1)',
            },
          }}
        >
          Opret Ny Profil
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SettingsIcon sx={{ color: 'var(--accent-primary)', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Total Profiler
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {totalProfiles}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ color: 'var(--accent-success)', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Tilknyttede Medarbejdere
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {totalEmployees}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ color: 'var(--accent-info)', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Standard Profil
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '1.25rem' }}>
                {profiles.find((p) => p.isDefault)?.name || 'Ingen'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

      {/* Profiles Table */}
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
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                PROFIL
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                AFRUNDING
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                TID FØR MØDETID
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                KONFLIKT HÅNDTERING
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                MEDARBEJDERE
              </TableCell>
              <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                HANDLINGER
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow
                key={profile.id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'var(--bg-hover)',
                  },
                }}
              >
                <TableCell>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        sx={{
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                      >
                        {profile.name}
                      </Typography>
                      {profile.isDefault && (
                        <Chip
                          label="Standard"
                          size="small"
                          sx={{
                            height: '20px',
                            fontSize: '0.6875rem',
                            backgroundColor: 'rgba(97, 175, 239, 0.15)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--accent-primary)',
                          }}
                        />
                      )}
                    </Box>
                    {profile.description && (
                      <Typography
                        sx={{
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          mt: 0.5,
                        }}
                      >
                        {profile.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {getRoundingLabel(profile.timeRoundingMinutes, profile.timeRoundingDirection)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography sx={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {profile.countPreMeetingTime
                      ? `Ja (maks ${profile.maxPreMeetingMinutes} min)`
                      : 'Nej'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography sx={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {getConflictHandlingLabel(profile.conflictHandling)}
                  </Typography>
                  <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Grænse: {profile.conflictThresholdPercent}%
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<PeopleIcon sx={{ fontSize: '1rem !important' }} />}
                    label={profile._count?.employees || 0}
                    size="small"
                    sx={{
                      backgroundColor: 'var(--bg-active)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(profile)}
                      sx={{
                        color: 'var(--accent-info)',
                        '&:hover': {
                          backgroundColor: 'rgba(97, 175, 239, 0.1)',
                        },
                      }}
                    >
                      <EditIcon sx={{ fontSize: '1.125rem' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(profile)}
                      disabled={profile._count?.employees! > 0}
                      sx={{
                        color: profile._count?.employees! > 0 ? 'var(--text-muted)' : 'var(--accent-danger)',
                        '&:hover': {
                          backgroundColor: 'rgba(224, 108, 117, 0.1)',
                        },
                        '&:disabled': {
                          color: 'var(--text-muted)',
                        },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: '1.125rem' }} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ color: 'var(--text-muted)' }}>
                    Ingen beregningsprofiler fundet. Opret en profil for at komme i gang.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Profile Form Dialog */}
      <ProfileFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSuccess={handleFormSuccess}
        profile={editingProfile}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-primary)' }}>Slet Beregningsprofil</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'var(--text-primary)' }}>
            Er du sikker på at du vil slette profilen "{profileToDelete?.name}"?
          </Typography>
          <Typography sx={{ color: 'var(--text-muted)', mt: 1, fontSize: '0.875rem' }}>
            Denne handling kan ikke fortrydes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
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
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-danger)',
              color: '#fff',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'var(--accent-danger)',
                filter: 'brightness(1.1)',
              },
            }}
          >
            Slet Profil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
