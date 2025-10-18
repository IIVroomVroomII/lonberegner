import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import { agreementsAPI } from '../services/api';
import AgreementFormDialog from '../components/AgreementFormDialog';

interface Agreement {
  id: string;
  name: string;
  type: string;
  validFrom: string;
  validTo: string | null;
  baseHourlyRate: number;
  weeklyHours: number;
  overtime1to3Rate: number;
  overtimeAbove3Rate: number;
  shiftedTimeRate: number;
  specialAllowancePercent: number;
  pensionEmployerPercent: number;
  pensionEmployeePercent: number;
  weekendAllowancePercent: number;
  holidayAllowancePercent: number;
  vacationPercent: number;
  vacationDaysPerYear: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const response = await agreementsAPI.list();
      setAgreements(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Der opstod en fejl ved indlæsning af overenskomster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleCreate = () => {
    setSelectedAgreement(null);
    setOpenDialog(true);
  };

  const handleEdit = (agreement: Agreement) => {
    setSelectedAgreement(agreement);
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Er du sikker på, at du vil slette denne overenskomst?')) {
      return;
    }

    try {
      await agreementsAPI.delete(id);
      fetchAgreements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Der opstod en fejl ved sletning af overenskomst');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await agreementsAPI.toggleStatus(id);
      fetchAgreements();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Der opstod en fejl ved ændring af status');
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedAgreement(null);
    fetchAgreements();
  };

  const getAgreementTypeLabel = (type: string) => {
    switch (type) {
      case 'DRIVER_AGREEMENT':
        return 'Chauffør';
      case 'WAREHOUSE_AGREEMENT':
        return 'Lager';
      case 'MOVER_AGREEMENT':
        return 'Flyttearbejder';
      default:
        return type;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Navn',
      width: 250,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#7dd3fc', fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getAgreementTypeLabel(params.value)}
          size="small"
          sx={{
            fontSize: '0.75rem',
            backgroundColor: '#c084fc20',
            color: '#c084fc',
            border: '1px solid #c084fc',
          }}
        />
      ),
    },
    {
      field: 'baseHourlyRate',
      headerName: 'Grundløn (kr/t)',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {Number(params.value).toFixed(2)} kr
        </Typography>
      ),
    },
    {
      field: 'weeklyHours',
      headerName: 'Ugentlige timer',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {Number(params.value).toFixed(1)} t
        </Typography>
      ),
    },
    {
      field: 'validFrom',
      headerName: 'Gyldig fra',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {new Date(params.value).toLocaleDateString('da-DK')}
        </Typography>
      ),
    },
    {
      field: 'validTo',
      headerName: 'Gyldig til',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {params.value ? new Date(params.value).toLocaleDateString('da-DK') : '-'}
        </Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Aktiv' : 'Inaktiv'}
          size="small"
          sx={{
            fontSize: '0.75rem',
            backgroundColor: params.value ? '#86efac20' : '#9ca3af20',
            color: params.value ? '#86efac' : '#9ca3af',
            border: `1px solid ${params.value ? '#86efac' : '#9ca3af'}`,
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Handlinger',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => handleEdit(params.row)}
            sx={{
              minWidth: 0,
              p: 0.5,
              color: '#7dd3fc',
              '&:hover': { backgroundColor: '#7dd3fc20' },
            }}
          >
            <EditIcon fontSize="small" />
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleStatus(params.row.id)}
            sx={{
              minWidth: 0,
              p: 0.5,
              color: params.row.isActive ? '#fbbf24' : '#86efac',
              '&:hover': { backgroundColor: params.row.isActive ? '#fbbf2420' : '#86efac20' },
            }}
          >
            {params.row.isActive ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
          </Button>
          <Button
            size="small"
            onClick={() => handleDelete(params.row.id)}
            sx={{
              minWidth: 0,
              p: 0.5,
              color: '#f87171',
              '&:hover': { backgroundColor: '#f8717120' },
            }}
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#7dd3fc' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            fontSize: '1.5rem',
            color: '#d4d4d4',
          }}
        >
          Overenskomster
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{
            backgroundColor: '#7dd3fc',
            color: '#1e1e1e',
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: '#38bdf8',
            },
          }}
        >
          Ny overenskomst
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          height: 600,
          width: '100%',
          '& .MuiDataGrid-root': {
            border: '1px solid #3e3e42',
            backgroundColor: '#252526',
            color: '#d4d4d4',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #3e3e42',
            fontSize: '0.875rem',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#2d2d2d',
            borderBottom: '1px solid #3e3e42',
            fontSize: '0.875rem',
            color: '#d4d4d4',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #3e3e42',
            backgroundColor: '#2d2d2d',
          },
          '& .MuiTablePagination-root': {
            color: '#d4d4d4',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#2d2d2d',
          },
        }}
      >
        <DataGrid
          rows={agreements}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Box>

      <AgreementFormDialog
        open={openDialog}
        onClose={handleDialogClose}
        agreement={selectedAgreement}
      />
    </Box>
  );
}
