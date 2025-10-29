import { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import MergeIcon from '@mui/icons-material/MergeType';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import { timeEntriesAPI } from '../services/api';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import TimeEntryFormDialog from '../components/TimeEntryFormDialog';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  breakDuration: number;
  location: string;
  route: string | null;
  taskType: string;
  status: string;
  employee: {
    employeeNumber: string;
    user: {
      name: string;
    };
  };
}

const taskTypeLabels: Record<string, string> = {
  DISTRIBUTION: 'Distribution',
  TERMINAL_WORK: 'Terminal',
  DRIVING: 'Kørsel',
  MOVING: 'Flytning',
  LOADING: 'Lastning',
  UNLOADING: 'Losning',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Afventer',
  APPROVED: 'Godkendt',
  REJECTED: 'Afvist',
  CALCULATED: 'Beregnet',
};

const statusColors: Record<string, string> = {
  PENDING: '#fcd34d',
  APPROVED: '#86efac',
  REJECTED: '#fca5a5',
  CALCULATED: '#7dd3fc',
};

export default function TimeEntriesPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    taskType: '',
    location: '',
    route: '',
    comment: '',
    status: '',
  });

  useEffect(() => {
    fetchTimeEntries();
  }, []);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const response = await timeEntriesAPI.list();
      setTimeEntries(response.data.data.timeEntries || []);
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await timeEntriesAPI.approve(id);
      fetchTimeEntries();
    } catch (error) {
      console.error('Failed to approve time entry:', error);
    }
  };

  const handleOpenDialog = (entryId?: string) => {
    setEditingEntryId(entryId || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEntryId(null);
  };

  const handleDialogSuccess = () => {
    fetchTimeEntries();
  };

  const handleBulkEdit = async () => {
    if (selectedRows.length === 0) return;

    try {
      const updates: any = {};
      if (bulkEditData.taskType) updates.taskType = bulkEditData.taskType;
      if (bulkEditData.location) updates.location = bulkEditData.location;
      if (bulkEditData.route) updates.route = bulkEditData.route;
      if (bulkEditData.comment) updates.comment = bulkEditData.comment;
      if (bulkEditData.status) updates.status = bulkEditData.status;

      await timeEntriesAPI.bulkEdit({
        timeEntryIds: selectedRows as string[],
        updates,
      });

      setBulkEditOpen(false);
      setBulkEditData({ taskType: '', location: '', route: '', comment: '', status: '' });
      setSelectedRows([]);
      fetchTimeEntries();
    } catch (error) {
      console.error('Failed to bulk edit:', error);
    }
  };

  const calculateHours = (startTime: string, endTime: string | null, breakDuration: number) => {
    if (!endTime) return '-';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const workHours = hours - breakDuration / 60;
    return workHours.toFixed(2);
  };

  const columns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Dato',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {format(new Date(params.value), 'dd/MM/yyyy', { locale: da })}
        </Typography>
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
      field: 'startTime',
      headerName: 'Start',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {format(new Date(params.value), 'HH:mm')}
        </Typography>
      ),
    },
    {
      field: 'endTime',
      headerName: 'Slut',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {params.value ? format(new Date(params.value), 'HH:mm') : '-'}
        </Typography>
      ),
    },
    {
      field: 'hours',
      headerName: 'Timer',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#7dd3fc', fontWeight: 500 }}>
          {calculateHours(params.row.startTime, params.row.endTime, params.row.breakDuration)}
        </Typography>
      ),
    },
    {
      field: 'taskType',
      headerName: 'Type',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {taskTypeLabels[params.value] || params.value}
        </Typography>
      ),
    },
    {
      field: 'location',
      headerName: 'Lokation',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
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
          {params.row.status === 'PENDING' && (
            <Tooltip title="Godkend">
              <IconButton
                size="small"
                onClick={() => handleApprove(params.row.id)}
                sx={{
                  color: '#86efac',
                  '&:hover': { backgroundColor: 'rgba(134, 239, 172, 0.1)' },
                }}
              >
                <CheckIcon sx={{ fontSize: '1rem' }} />
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
          Tidsregistreringer
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedRows.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setBulkEditOpen(true)}
              sx={{ fontSize: '0.875rem' }}
            >
              Redigér {selectedRows.length} valgte
            </Button>
          )}
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
            Ny registrering
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
          rows={timeEntries}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
          rowSelectionModel={selectedRows}
        />
      </Box>

      <TimeEntryFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleDialogSuccess}
        entryId={editingEntryId}
      />

      <Dialog open={bulkEditOpen} onClose={() => setBulkEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Redigér {selectedRows.length} tidsregistreringer</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              select
              label="Arbejdstype (valgfri)"
              value={bulkEditData.taskType}
              onChange={(e) => setBulkEditData({ ...bulkEditData, taskType: e.target.value })}
              fullWidth
            >
              <MenuItem value="">-- Ingen ændring --</MenuItem>
              <MenuItem value="DISTRIBUTION">Distribution</MenuItem>
              <MenuItem value="TERMINAL_WORK">Terminal</MenuItem>
              <MenuItem value="DRIVING">Kørsel</MenuItem>
              <MenuItem value="MOVING">Flytning</MenuItem>
              <MenuItem value="LOADING">Lastning</MenuItem>
              <MenuItem value="UNLOADING">Losning</MenuItem>
            </TextField>
            <TextField
              label="Lokation (valgfri)"
              value={bulkEditData.location}
              onChange={(e) => setBulkEditData({ ...bulkEditData, location: e.target.value })}
              fullWidth
            />
            <TextField
              label="Rute (valgfri)"
              value={bulkEditData.route}
              onChange={(e) => setBulkEditData({ ...bulkEditData, route: e.target.value })}
              fullWidth
            />
            <TextField
              label="Kommentar (valgfri)"
              value={bulkEditData.comment}
              onChange={(e) => setBulkEditData({ ...bulkEditData, comment: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Status (valgfri)"
              value={bulkEditData.status}
              onChange={(e) => setBulkEditData({ ...bulkEditData, status: e.target.value })}
              fullWidth
            >
              <MenuItem value="">-- Ingen ændring --</MenuItem>
              <MenuItem value="PENDING">Afventer</MenuItem>
              <MenuItem value="APPROVED">Godkendt</MenuItem>
              <MenuItem value="REJECTED">Afvist</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEditOpen(false)}>Annuller</Button>
          <Button onClick={handleBulkEdit} variant="contained">Gem ændringer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
