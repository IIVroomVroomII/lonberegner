import { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { employeesAPI } from '../services/api';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import EmployeeFormDialog from '../components/EmployeeFormDialog';
import ImportEmployeesDialog from '../components/ImportEmployeesDialog';

interface Employee {
  id: string;
  employeeNumber: string;
  cprNumber: string | null;
  jobCategory: string;
  agreementType: string;
  workTimeType: string;
  baseSalary: number;
  department: string | null;
  location: string | null;
  employmentDate: string;
  user: {
    name: string;
    email: string;
  };
}

const jobCategoryLabels: Record<string, string> = {
  DRIVER: 'Chauffør',
  WAREHOUSE: 'Lager',
  MOVER: 'Flyttearbejder',
  TERMINAL: 'Terminal',
  RENOVATION: 'Renovation',
};

const agreementLabels: Record<string, string> = {
  DRIVER_AGREEMENT: 'Chaufføroverenskomst',
  WAREHOUSE_AGREEMENT: 'Lageroverenskomst',
  MOVER_AGREEMENT: 'Flytteoverenskomst',
};

const workTimeTypeLabels: Record<string, string> = {
  HOURLY: 'Timelønnet',
  SALARIED: 'Fuldlønnet',
  SUBSTITUTE: 'Afløser',
  SHIFT_WORK: 'Holddrift',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.list();
      setEmployees(response.data.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Er du sikker på at du vil slette denne medarbejder?')) {
      try {
        await employeesAPI.delete(id);
        fetchEmployees();
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  const handleOpenDialog = (employeeId?: string) => {
    setEditingEmployeeId(employeeId || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEmployeeId(null);
  };

  const handleDialogSuccess = () => {
    fetchEmployees();
  };

  const columns: GridColDef[] = [
    {
      field: 'employeeNumber',
      headerName: 'Medarbejder Nr.',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#7dd3fc', fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'user',
      headerName: 'Navn',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
            {params.value.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {params.value.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'jobCategory',
      headerName: 'Job Kategori',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {jobCategoryLabels[params.value] || params.value}
        </Typography>
      ),
    },
    {
      field: 'agreementType',
      headerName: 'Overenskomst',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {agreementLabels[params.value] || params.value}
        </Typography>
      ),
    },
    {
      field: 'workTimeType',
      headerName: 'Ansættelse',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={workTimeTypeLabels[params.value] || params.value}
          size="small"
          sx={{
            fontSize: '0.75rem',
            height: '24px',
            backgroundColor: 'rgba(125, 211, 252, 0.2)',
            color: '#7dd3fc',
            border: '1px solid rgba(125, 211, 252, 0.4)',
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      field: 'baseSalary',
      headerName: 'Grundløn (kr/t)',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#86efac', fontWeight: 500 }}>
          {Number(params.value).toFixed(2)} kr
        </Typography>
      ),
    },
    {
      field: 'employmentDate',
      headerName: 'Ansat dato',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {format(new Date(params.value), 'dd/MM/yyyy', { locale: da })}
        </Typography>
      ),
    },
    {
      field: 'department',
      headerName: 'Afdeling',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Handlinger',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Rediger">
            <IconButton
              size="small"
              onClick={() => handleOpenDialog(params.row.id)}
              sx={{
                color: '#7dd3fc',
                '&:hover': { backgroundColor: 'rgba(125, 211, 252, 0.1)' },
              }}
            >
              <EditIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Slet">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row.id)}
              sx={{
                color: '#fca5a5',
                '&:hover': { backgroundColor: 'rgba(252, 165, 165, 0.1)' },
              }}
            >
              <DeleteIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

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
          Medarbejdere
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => setImportDialogOpen(true)}
            sx={{
              py: 0.75,
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 500,
              borderColor: '#7dd3fc',
              color: '#7dd3fc',
              '&:hover': {
                borderColor: '#5eadd1',
                backgroundColor: 'rgba(125, 211, 252, 0.1)',
              },
            }}
          >
            Importer medarbejdere
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => handleOpenDialog()}
            sx={{
              py: 0.75,
              px: 2,
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: '#7dd3fc',
              color: '#1e1e1e',
              '&:hover': {
                backgroundColor: '#5eadd1',
              },
            }}
          >
            Ny medarbejder
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          height: 600,
          backgroundColor: '#252526',
          border: '1px solid #3e3e42',
          borderRadius: '4px',
          '& .MuiDataGrid-root': {
            border: 'none',
            color: '#d4d4d4',
          },
          '& .MuiDataGrid-cell': {
            borderColor: '#3e3e42',
            fontSize: '0.875rem',
            '&:focus, &:focus-within': {
              outline: 'none',
            },
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#1e1e1e',
            borderColor: '#3e3e42',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#9ca3af',
          },
          '& .MuiDataGrid-columnHeader': {
            '&:focus, &:focus-within': {
              outline: 'none',
            },
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              backgroundColor: 'rgba(125, 211, 252, 0.05)',
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderColor: '#3e3e42',
            backgroundColor: '#1e1e1e',
          },
          '& .MuiTablePagination-root': {
            color: '#9ca3af',
          },
          '& .MuiDataGrid-virtualScroller': {
            backgroundColor: '#252526',
          },
        }}
      >
        <DataGrid
          rows={employees}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Box>

      <EmployeeFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleDialogSuccess}
        employeeId={editingEmployeeId}
      />

      <ImportEmployeesDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={fetchEmployees}
      />
    </Box>
  );
}
