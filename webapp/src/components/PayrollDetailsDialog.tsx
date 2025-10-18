import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { payrollsAPI } from '../services/api';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface PayrollDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  payrollId: string | null;
}

interface PayrollComponent {
  componentType: string;
  description: string;
  hours: number | null;
  rate: number;
  amount: number;
  agreementReference: string | null;
}

interface PayrollDetails {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  weekendHours: number;
  baseSalary: number;
  overtimePay: number;
  nightAllowance: number;
  weekendAllowance: number;
  specialAllowance: number;
  totalGrossPay: number;
  pensionEmployer: number;
  pensionEmployee: number;
  vacation: number;
  specialSavings: number;
  status: string;
  employee: {
    employeeNumber: string;
    jobCategory: string;
    agreementType: string;
    user: {
      name: string;
    };
  };
  components: PayrollComponent[];
}

const componentTypeLabels: Record<string, string> = {
  BASE_SALARY: 'Grundløn',
  OVERTIME: 'Overarbejde',
  NIGHT_ALLOWANCE: 'Nattillæg',
  WEEKEND_ALLOWANCE: 'Weekendtillæg',
  HOLIDAY_ALLOWANCE: 'Helligdagstillæg',
  SHIFTED_TIME: 'Forskudt tid',
  SPECIAL_ALLOWANCE: 'Særligt tillæg',
  DRIVER_ALLOWANCE: 'Chauffør-tillæg',
  WAREHOUSE_ALLOWANCE: 'Lager-tillæg',
  MOVER_ALLOWANCE: 'Flytte-tillæg',
  SHIFT_ALLOWANCE: 'Skifttillæg',
  PENSION_EMPLOYER: 'Pension (arbejdsgiver)',
  PENSION_EMPLOYEE: 'Pension (medarbejder)',
  VACATION: 'Feriepenge',
  SPECIAL_SAVINGS: 'Særlig opsparing',
};

const agreementRules: Record<string, string> = {
  '§4': 'Arbejdstid - Ugentlig arbejdstid er 37 timer',
  '§6': 'Grundløn - Timeløn baseret på overenskomst',
  '§7': 'Overarbejde - 110% for 1-3 timer, 120% derefter',
  '§8': 'Særligt tillæg - 9% af ferieberettiget løn',
  '§9': 'Pension - Arbejdsgiver 9%, medarbejder 3%',
  '§11': 'Ferie og fritid - 12,5% feriepenge',
  '§12-13': 'Forskudt tid - 15% tillæg for ubekvem arbejdstid',
};

export default function PayrollDetailsDialog({
  open,
  onClose,
  payrollId,
}: PayrollDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [payroll, setPayroll] = useState<PayrollDetails | null>(null);

  useEffect(() => {
    if (open && payrollId) {
      fetchPayroll();
    }
  }, [open, payrollId]);

  const fetchPayroll = async () => {
    if (!payrollId) return;
    try {
      setLoading(true);
      const response = await payrollsAPI.get(payrollId);
      setPayroll(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
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

  const groupComponentsByType = (components: PayrollComponent[]) => {
    const groups: Record<string, PayrollComponent[]> = {};
    components.forEach((comp) => {
      if (!groups[comp.componentType]) {
        groups[comp.componentType] = [];
      }
      groups[comp.componentType].push(comp);
    });
    return groups;
  };

  if (!payroll) {
    return null;
  }

  const componentGroups = groupComponentsByType(payroll.components || []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#252526',
          border: '1px solid #3e3e42',
          borderRadius: '4px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #3e3e42',
          color: '#c084fc',
          fontSize: '1.1rem',
          fontWeight: 600,
          py: 1.5,
        }}
      >
        Lønberegning - {payroll.employee.user.name}
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 2 }}>
        <Grid container spacing={2.5}>
          {/* Periode og medarbejder info */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: '#1e1e1e',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Periode
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4', fontWeight: 500 }}>
                    {format(new Date(payroll.periodStart), 'dd/MM/yyyy', { locale: da })} -{' '}
                    {format(new Date(payroll.periodEnd), 'dd/MM/yyyy', { locale: da })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Medarbejder
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4', fontWeight: 500 }}>
                    {payroll.employee.user.name} ({payroll.employee.employeeNumber})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Jobkategori
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
                    {payroll.employee.jobCategory}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Overenskomst
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d4' }}>
                    {payroll.employee.agreementType}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Timer oversigt */}
          <Grid item xs={12}>
            <Typography
              sx={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#7dd3fc',
                mb: 1.5,
              }}
            >
              Timer oversigt
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #3e3e42',
                    borderRadius: '4px',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Total timer
                  </Typography>
                  <Typography sx={{ fontSize: '1.25rem', color: '#7dd3fc', fontWeight: 600 }}>
                    {Number(payroll.totalHours).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #3e3e42',
                    borderRadius: '4px',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Normale timer
                  </Typography>
                  <Typography sx={{ fontSize: '1.25rem', color: '#86efac', fontWeight: 600 }}>
                    {Number(payroll.regularHours).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #3e3e42',
                    borderRadius: '4px',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Overarbejde
                  </Typography>
                  <Typography sx={{ fontSize: '1.25rem', color: '#fcd34d', fontWeight: 600 }}>
                    {Number(payroll.overtimeHours).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #3e3e42',
                    borderRadius: '4px',
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>
                    Nat/Weekend
                  </Typography>
                  <Typography sx={{ fontSize: '1.25rem', color: '#c084fc', fontWeight: 600 }}>
                    {(Number(payroll.nightHours) + Number(payroll.weekendHours)).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* Lønkomponenter */}
          <Grid item xs={12}>
            <Typography
              sx={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#7dd3fc',
                mb: 1.5,
              }}
            >
              Lønkomponenter
            </Typography>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(125, 211, 252, 0.05)' }}>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
                      Type
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }} align="right">
                      Timer
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }} align="right">
                      Sats
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }} align="right">
                      Beløb
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
                      Regel
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(componentGroups).map(([type, components]) => {
                    const totalAmount = components.reduce((sum, c) => sum + Number(c.amount), 0);
                    const totalHours = components.reduce(
                      (sum, c) => sum + (c.hours ? Number(c.hours) : 0),
                      0
                    );
                    const avgRate = components[0]?.rate || 0;

                    return (
                      <TableRow key={type} sx={{ '&:hover': { backgroundColor: 'rgba(125, 211, 252, 0.03)' } }}>
                        <TableCell sx={{ color: '#d4d4d4', fontSize: '0.875rem', borderColor: '#3e3e42' }}>
                          {componentTypeLabels[type] || type}
                        </TableCell>
                        <TableCell sx={{ color: '#7dd3fc', fontSize: '0.875rem', borderColor: '#3e3e42' }} align="right">
                          {totalHours > 0 ? totalHours.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell sx={{ color: '#d4d4d4', fontSize: '0.875rem', borderColor: '#3e3e42' }} align="right">
                          {formatCurrency(avgRate)}
                        </TableCell>
                        <TableCell sx={{ color: '#86efac', fontSize: '0.875rem', fontWeight: 600, borderColor: '#3e3e42' }} align="right">
                          {formatCurrency(totalAmount)}
                        </TableCell>
                        <TableCell sx={{ color: '#9ca3af', fontSize: '0.75rem', borderColor: '#3e3e42' }}>
                          {components[0]?.agreementReference || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ backgroundColor: 'rgba(134, 239, 172, 0.1)' }}>
                    <TableCell colSpan={3} sx={{ color: '#d4d4d4', fontSize: '0.875rem', fontWeight: 600, borderColor: '#3e3e42' }}>
                      Total bruttoløn
                    </TableCell>
                    <TableCell sx={{ color: '#86efac', fontSize: '1rem', fontWeight: 700, borderColor: '#3e3e42' }} align="right">
                      {formatCurrency(Number(payroll.totalGrossPay))}
                    </TableCell>
                    <TableCell sx={{ borderColor: '#3e3e42' }} />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Overenskomstregler */}
          <Grid item xs={12}>
            <Accordion
              elevation={0}
              sx={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #3e3e42',
                borderRadius: '4px !important',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#7dd3fc' }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 1,
                  },
                }}
              >
                <InfoIcon sx={{ fontSize: '1.1rem', color: '#7dd3fc' }} />
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#7dd3fc' }}>
                  Anvendte overenskomstregler
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(agreementRules).map(([rule, description]) => (
                    <Box
                      key={rule}
                      sx={{
                        p: 1.5,
                        backgroundColor: '#252526',
                        border: '1px solid #3e3e42',
                        borderRadius: '4px',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={rule}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: '20px',
                            backgroundColor: 'rgba(125, 211, 252, 0.2)',
                            color: '#7dd3fc',
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: '0.8rem', color: '#d4d4d4' }}>
                        {description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: '1px solid #3e3e42',
          backgroundColor: '#1e1e1e',
          px: 2.5,
          py: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            fontSize: '0.875rem',
            color: '#7dd3fc',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: 'rgba(125, 211, 252, 0.1)',
            },
          }}
        >
          Luk
        </Button>
      </DialogActions>
    </Dialog>
  );
}
