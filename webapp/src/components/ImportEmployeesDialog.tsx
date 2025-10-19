import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { importAPI } from '../services/api';

interface ImportEmployeesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImportError {
  row: number;
  email: string;
  error: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
}

export default function ImportEmployeesDialog({ open, onClose, onSuccess }: ImportEmployeesDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Kun CSV filer er tilladt');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      const response = await importAPI.importEmployees(selectedFile);
      const importResult = response.data.data;
      setResult(importResult);

      if (importResult.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fejl ved upload af fil');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await importAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee-import-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Fejl ved download af skabelon');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    onClose();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
    } else {
      setError('Kun CSV filer er tilladt');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Importer medarbejdere
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{ color: 'var(--text-secondary)' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Download Template Section */}
        <Box sx={{ mb: 3 }}>
          <Alert
            severity="info"
            sx={{
              backgroundColor: 'rgba(97, 175, 239, 0.1)',
              border: '1px solid var(--accent-blue)',
              color: 'var(--text-primary)',
              '& .MuiAlert-icon': { color: 'var(--accent-blue)' },
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>
              Download skabelonen og udfyld den med medarbejderdata.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              sx={{
                borderColor: 'var(--accent-blue)',
                color: 'var(--accent-blue)',
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'var(--accent-blue)',
                  backgroundColor: 'rgba(97, 175, 239, 0.1)',
                },
              }}
            >
              Download CSV skabelon
            </Button>
          </Alert>
        </Box>

        {/* File Upload Section */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          sx={{
            border: '2px dashed var(--border-color)',
            borderRadius: '8px',
            p: 4,
            textAlign: 'center',
            backgroundColor: 'var(--bg-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'var(--accent-blue)',
              backgroundColor: 'var(--bg-hover)',
            },
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUploadIcon
            sx={{ fontSize: '3rem', color: 'var(--text-secondary)', mb: 2 }}
          />
          <Typography sx={{ color: 'var(--text-primary)', mb: 1 }}>
            {selectedFile ? selectedFile.name : 'Træk og slip CSV fil her, eller klik for at vælge'}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kun CSV filer accepteres (max 5MB)
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Box>

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ color: 'var(--text-secondary)', mb: 1, fontSize: '0.875rem' }}>
              Uploader og processerer fil...
            </Typography>
            <LinearProgress sx={{ backgroundColor: 'var(--bg-active)' }} />
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mt: 3,
              backgroundColor: 'rgba(224, 108, 117, 0.1)',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
              '& .MuiAlert-icon': { color: 'var(--accent-red)' },
            }}
          >
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${result.success} succesfulde`}
                sx={{
                  backgroundColor: 'rgba(134, 239, 172, 0.1)',
                  border: '1px solid var(--accent-green)',
                  color: 'var(--accent-green)',
                  '& .MuiChip-icon': { color: 'var(--accent-green)' },
                }}
              />
              {result.failed > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${result.failed} fejlede`}
                  sx={{
                    backgroundColor: 'rgba(224, 108, 117, 0.1)',
                    border: '1px solid var(--accent-red)',
                    color: 'var(--accent-red)',
                    '& .MuiChip-icon': { color: 'var(--accent-red)' },
                  }}
                />
              )}
            </Box>

            {result.errors.length > 0 && (
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    mb: 1,
                  }}
                >
                  Fejl detaljer:
                </Typography>
                <List
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                  }}
                >
                  {result.errors.map((err, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        borderBottom:
                          index < result.errors.length - 1
                            ? '1px solid var(--border-color)'
                            : 'none',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            Række {err.row}: {err.email}
                          </Typography>
                        }
                        secondary={
                          <Typography sx={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>
                            {err.error}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: '1px solid var(--border-color)',
          p: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            color: 'var(--text-secondary)',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
            },
          }}
        >
          {result ? 'Luk' : 'Annuller'}
        </Button>
        {!result && (
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            variant="contained"
            sx={{
              backgroundColor: 'var(--accent-blue)',
              color: '#ffffff',
              textTransform: 'none',
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
            Upload og importer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
