import { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip, Alert, Snackbar, Menu, MenuItem } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import CalculateIcon from '@mui/icons-material/Calculate';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckIcon from '@mui/icons-material/Check';
import { payrollsAPI, exportAPI } from '../services/api';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import PayrollDetailsDialog from '../components/PayrollDetailsDialog';
import CalculatePayrollDialog from '../components/CalculatePayrollDialog';

interface PayrollCalculation {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  weekendHours: number;
  totalGrossPay: number;
  status: string;
  employee: {
    employeeNumber: string;
    user: {
      name: string;
    };
  };
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Kladde',
  PENDING_REVIEW: 'Afventer gennemsyn',
  APPROVED: 'Godkendt',
  EXPORTED: 'Eksporteret',
  PAID: 'Udbetalt',
};

const statusColors: Record<string, string> = {
  DRAFT: '#9ca3af',
  PENDING_REVIEW: '#fcd34d',
  APPROVED: '#86efac',
  EXPORTED: '#7dd3fc',
  PAID: '#c084fc',
};

export default function PayrollsPage() {
  const [payrolls, setPayrolls] = useState<PayrollCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedExportPayrollId, setSelectedExportPayrollId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await payrollsAPI.list();
      setPayrolls(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleOpenDetails = (payrollId: string) => {
    setSelectedPayrollId(payrollId);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedPayrollId(null);
  };

  const handleCalculateSuccess = () => {
    fetchPayrolls();
  };

  const handleOpenExportMenu = (event: React.MouseEvent<HTMLElement>, payrollId: string) => {
    setExportMenuAnchor(event.currentTarget);
    setSelectedExportPayrollId(payrollId);
  };

  const handleCloseExportMenu = () => {
    setExportMenuAnchor(null);
    setSelectedExportPayrollId(null);
  };

  const handleExportToEconomic = async () => {
    if (!selectedExportPayrollId) return;

    try {
      await exportAPI.toEconomic(selectedExportPayrollId);
      setSnackbar({
        open: true,
        message: 'Lønberegning eksporteret til e-conomic succesfuldt',
        severity: 'success',
      });
      fetchPayrolls();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fejl ved eksport til e-conomic',
        severity: 'error',
      });
    } finally {
      handleCloseExportMenu();
    }
  };

  const handleExportToDanlon = async () => {
    if (!selectedExportPayrollId) return;

    try {
      const response = await exportAPI.toDanlon(selectedExportPayrollId);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danlon_export_${selectedExportPayrollId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: 'Lønberegning eksporteret til Danløn CSV succesfuldt',
        severity: 'success',
      });
      fetchPayrolls();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fejl ved eksport til Danløn',
        severity: 'error',
      });
    } finally {
      handleCloseExportMenu();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const columns: GridColDef[] = [
    {
      field: 'periodStart',
      headerName: 'Periode',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
            {format(new Date(params.value), 'dd/MM/yyyy', { locale: da })} -{' '}
            {format(new Date(params.row.periodEnd), 'dd/MM/yyyy', { locale: da })}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'employee',
      headerName: 'Medarbejder',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
            {params.value.user.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {params.value.employeeNumber}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'totalHours',
      headerName: 'Timer',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#7dd3fc', fontWeight: 500 }}>
            {Number(params.value).toFixed(2)}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af' }}>
            OT: {Number(params.row.overtimeHours).toFixed(1)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'nightHours',
      headerName: 'Nat',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#c084fc' }}>
          {Number(params.value).toFixed(1)}
        </Typography>
      ),
    },
    {
      field: 'weekendHours',
      headerName: 'Weekend',
      width: 90,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#fcd34d' }}>
          {Number(params.value).toFixed(1)}
        </Typography>
      ),
    },
    {
      field: 'totalGrossPay',
      headerName: 'Bruttoløn',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          sx={{ fontSize: '0.875rem', color: '#86efac', fontWeight: 600 }}
        >
          {formatCurrency(Number(params.value))}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={statusLabels[params.value] || params.value}
          size="small"
          sx={{
            fontSize: '0.75rem',
            height: '24px',
            backgroundColor: `${statusColors[params.value]}20`,
            color: statusColors[params.value],
            border: `1px solid ${statusColors[params.value]}40`,
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Handlinger',
      width: 140,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Se detaljer">
            <IconButton
              size="small"
              onClick={() => handleOpenDetails(params.row.id)}
              sx={{
                color: '#7dd3fc',
                '&:hover': { backgroundColor: 'rgba(125, 211, 252, 0.1)' },
              }}
            >
              <VisibilityIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          {params.row.status === 'PENDING_REVIEW' && (
            <Tooltip title="Godkend">
              <IconButton
                size="small"
                sx={{
                  color: '#86efac',
                  '&:hover': { backgroundColor: 'rgba(134, 239, 172, 0.1)' },
                }}
              >
                <CheckIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          )}
          {(params.row.status === 'APPROVED' || params.row.status === 'EXPORTED') && (
            <Tooltip title="Eksporter">
              <IconButton
                size="small"
                onClick={(e) => handleOpenExportMenu(e, params.row.id)}
                sx={{
                  color: '#c084fc',
                  '&:hover': { backgroundColor: 'rgba(192, 132, 252, 0.1)' },
                }}
              >
                <FileDownloadIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          )}
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
          Lønberegninger
        </Typography>
        <Button
          variant="contained"
          startIcon={<CalculateIcon sx={{ fontSize: '1rem' }} />}
          onClick={() => setCalculateDialogOpen(true)}
          sx={{
            py: 0.75,
            px: 2,
            fontSize: '0.875rem',
            fontWeight: 500,
            backgroundColor: '#c084fc',
            color: '#1e1e1e',
            '&:hover': {
              backgroundColor: '#a855f7',
            },
          }}
        >
          Beregn løn
        </Button>
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
              backgroundColor: 'rgba(192, 132, 252, 0.05)',
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
          rows={payrolls}
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

      <PayrollDetailsDialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        payrollId={selectedPayrollId}
      />

      <CalculatePayrollDialog
        open={calculateDialogOpen}
        onClose={() => setCalculateDialogOpen(false)}
        onSuccess={handleCalculateSuccess}
      />

      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleCloseExportMenu}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #3e3e42',
          },
        }}
      >
        <MenuItem
          onClick={handleExportToEconomic}
          sx={{
            fontSize: '0.875rem',
            color: '#d4d4d4',
            '&:hover': { backgroundColor: 'rgba(125, 211, 252, 0.1)' },
          }}
        >
          Eksporter til e-conomic
        </MenuItem>
        <MenuItem
          onClick={handleExportToDanlon}
          sx={{
            fontSize: '0.875rem',
            color: '#d4d4d4',
            '&:hover': { backgroundColor: 'rgba(125, 211, 252, 0.1)' },
          }}
        >
          Eksporter til Danløn (CSV)
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
