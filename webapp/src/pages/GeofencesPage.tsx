import { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaceIcon from '@mui/icons-material/Place';
import { geofencesAPI, employeesAPI, calculationProfilesAPI } from '../services/api';
import GeofenceFormDialog from '../components/GeofenceFormDialog';

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  taskType: string;
  employeeId: string | null;
  calculationProfileId: string | null;
  isActive: boolean;
  employee?: {
    id: string;
    employeeNumber: string;
    user: { name: string };
  };
  calculationProfile?: {
    id: string;
    name: string;
  };
}

const taskTypeLabels: Record<string, string> = {
  DISTRIBUTION: 'Distribution',
  TERMINAL_WORK: 'Terminalarbejde',
  DRIVING: 'Kørsel',
  MOVING: 'Flytning',
  LOADING: 'Lastning',
  UNLOADING: 'Losning',
  SMART: 'Smart',
};

const taskTypeColors: Record<string, string> = {
  DISTRIBUTION: '#2196F3',
  TERMINAL_WORK: '#FF9800',
  DRIVING: '#4CAF50',
  MOVING: '#9C27B0',
  LOADING: '#F44336',
  UNLOADING: '#FF5722',
  SMART: '#00BCD4',
};

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGeofences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await geofencesAPI.list();
      setGeofences(response.data.data);
    } catch (err: any) {
      console.error('Error loading geofences:', err);
      setError(err.response?.data?.message || 'Fejl ved indlæsning af geofences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeofences();
  }, []);

  const handleAdd = () => {
    setSelectedGeofence(null);
    setDialogOpen(true);
  };

  const handleEdit = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne geofence?')) {
      return;
    }

    try {
      await geofencesAPI.delete(id);
      loadGeofences();
    } catch (err: any) {
      console.error('Error deleting geofence:', err);
      alert(err.response?.data?.message || 'Fejl ved sletning af geofence');
    }
  };

  const handleDialogClose = (reload?: boolean) => {
    setDialogOpen(false);
    setSelectedGeofence(null);
    if (reload) {
      loadGeofences();
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Navn',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlaceIcon sx={{ color: taskTypeColors[params.row.taskType] }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'description',
      headerName: 'Beskrivelse',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'taskType',
      headerName: 'Arbejdstype',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={taskTypeLabels[params.value] || params.value}
          size="small"
          sx={{
            backgroundColor: taskTypeColors[params.value],
            color: 'white',
          }}
        />
      ),
    },
    {
      field: 'radius',
      headerName: 'Radius',
      width: 100,
      renderCell: (params: GridRenderCellParams) => `${params.value}m`,
    },
    {
      field: 'employee',
      headerName: 'Medarbejder',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? `${params.value.user.name} (${params.value.employeeNumber})` : '-',
    },
    {
      field: 'calculationProfile',
      headerName: 'Profil',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => params.value?.name || '-',
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Aktiv' : 'Inaktiv'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Handlinger',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="Rediger">
            <IconButton size="small" onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Slet">
            <IconButton size="small" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Geofences
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          Tilføj Geofence
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={geofences}
        columns={columns}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
        }}
      />

      <GeofenceFormDialog
        open={dialogOpen}
        geofence={selectedGeofence}
        onClose={handleDialogClose}
      />
    </Box>
  );
}
