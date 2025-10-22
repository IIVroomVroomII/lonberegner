import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { subscriptionAPI } from '../services/api';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface Subscription {
  id: string;
  status: string;
  trialEnd: string | null;
  trialType: string;
  daysRemainingInTrial: number | null;
  priceAmount: number;
  priceCurrency: string;
  priceFormatted: string;
  interval: string;
  stripeCurrentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  pdfUrl: string;
  hostedUrl: string;
}

const statusMap: Record<string, { label: string; color: any }> = {
  TRIALING: { label: 'Prøveperiode', color: 'info' },
  ACTIVE: { label: 'Aktiv', color: 'success' },
  PAST_DUE: { label: 'Betaling fejlet', color: 'error' },
  CANCELED: { label: 'Opsagt', color: 'default' },
  UNPAID: { label: 'Ubetalt', color: 'warning' },
};

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subResponse, invoicesResponse] = await Promise.all([
        subscriptionAPI.get(),
        subscriptionAPI.getInvoices(),
      ]);

      setSubscription(subResponse.data.data);
      setInvoices(invoicesResponse.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to load subscription:', err);
      setError(err.response?.data?.message || 'Kunne ikke hente abonnementsoplysninger');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCanceling(true);
      const inTrial = subscription?.status === 'TRIALING';
      await subscriptionAPI.cancel(inTrial);
      await loadData();
      setCancelDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kunne ikke opsige abonnement');
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setReactivating(true);
      await subscriptionAPI.reactivate();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kunne ikke genaktivere abonnement');
    } finally {
      setReactivating(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!subscription) {
    return (
      <Container maxWidth="lg">
        <Paper sx={{ p: 4, mt: 4 }}>
          <Alert severity="info">
            Du har ikke et aktivt abonnement. Kontakt support for at oprette et abonnement.
          </Alert>
        </Paper>
      </Container>
    );
  }

  const statusInfo = statusMap[subscription.status] || { label: subscription.status, color: 'default' };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Abonnement
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Status Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Status</Typography>
                  <Chip label={statusInfo.label} color={statusInfo.color} />
                </Box>

                <Divider sx={{ my: 2 }} />

                {subscription.status === 'TRIALING' && subscription.daysRemainingInTrial !== null && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>{subscription.daysRemainingInTrial} dage tilbage</strong> af din gratis prøveperiode
                      {subscription.trialType === 'EARLY_ADOPTER' && ' (Early Adopter - 60 dage)'}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Prøveperioden udløber: {format(new Date(subscription.trialEnd!), 'PPP', { locale: da })}
                    </Typography>
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Pris
                    </Typography>
                    <Typography variant="h6">{subscription.priceFormatted}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      pr. {subscription.interval === 'month' ? 'måned' : subscription.interval}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Næste betaling
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(subscription.stripeCurrentPeriodEnd), 'PPP', { locale: da })}
                    </Typography>
                  </Grid>

                  {subscription.cancelAtPeriodEnd && (
                    <Grid item xs={12}>
                      <Alert severity="warning">
                        <Typography variant="body2">
                          Dit abonnement er sat til at opsiges ved periodens udløb den{' '}
                          {format(new Date(subscription.stripeCurrentPeriodEnd), 'PPP', { locale: da })}
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
                </Grid>

                <Box sx={{ mt: 3 }}>
                  {subscription.cancelAtPeriodEnd ? (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleReactivate}
                      disabled={reactivating}
                    >
                      {reactivating ? <CircularProgress size={20} /> : 'Genaktiver abonnement'}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      Opsig abonnement
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Info Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Abonnementstype
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {subscription.trialType === 'EARLY_ADOPTER'
                    ? 'Early Adopter (60 dage gratis)'
                    : 'Standard (7 dage gratis)'}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  Oprettet
                </Typography>
                <Typography variant="body2">
                  {subscription.trialEnd && format(new Date(subscription.trialEnd).getTime() - (subscription.trialType === 'EARLY_ADOPTER' ? 60 : 7) * 24 * 60 * 60 * 1000, 'PPP', { locale: da })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Invoices */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Betalingshistorik
                </Typography>

                {invoices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ingen fakturaer endnu
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Dato</TableCell>
                          <TableCell>Beløb</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Handlinger</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {format(new Date(invoice.created), 'PPP', { locale: da })}
                            </TableCell>
                            <TableCell>
                              {(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={invoice.status === 'paid' ? 'Betalt' : invoice.status}
                                color={invoice.status === 'paid' ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {invoice.pdfUrl && (
                                <Button
                                  size="small"
                                  href={invoice.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download PDF
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>Opsig abonnement</DialogTitle>
          <DialogContent>
            {subscription.status === 'TRIALING' ? (
              <Typography>
                Da du er i prøveperioden, vil dit abonnement blive opsagt med det samme, og du vil ikke
                blive opkrævet noget beløb.
              </Typography>
            ) : (
              <Typography>
                Dit abonnement vil forblive aktivt indtil den{' '}
                {format(new Date(subscription.stripeCurrentPeriodEnd), 'PPP', { locale: da })}, hvorefter det
                vil blive opsagt.
              </Typography>
            )}
            <Typography sx={{ mt: 2 }}>
              Er du sikker på, at du vil opsige dit abonnement?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)} disabled={canceling}>
              Annuller
            </Button>
            <Button onClick={handleCancel} color="error" disabled={canceling}>
              {canceling ? <CircularProgress size={20} /> : 'Opsig'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
