import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Step,
  Stepper,
  StepLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import { authAPI, subscriptionAPI } from '../services/api';

// Price ID fra Stripe
const STRIPE_PRICE_ID = 'price_1SL1062d3f9wlWaGZSQfmtFJ';

const steps = ['Organisationsoplysninger', 'Betalingsoplysninger', 'Bekræftelse'];

export default function SignUpPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [trialInfo, setTrialInfo] = useState<{ days: number; type: string } | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    teamName: '',
    organizationNumber: '',
    contactEmail: '',
    contactPhone: '',
    password: '',
    confirmPassword: '',
  });

  // Load Stripe publishable key on mount
  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const response = await subscriptionAPI.getStripeConfig();
        const publishableKey = response.data.data.publishableKey;
        setStripePromise(loadStripe(publishableKey));
      } catch (err) {
        console.error('Failed to load Stripe key:', err);
        setError('Kunne ikke indlæse betalingssystem');
      }
    };
    loadStripeKey();

    // Calculate trial period
    const now = new Date();
    const cutoffDate = new Date('2025-11-01T00:00:00Z');
    if (now < cutoffDate) {
      setTrialInfo({ days: 60, type: 'EARLY_ADOPTER' });
    } else {
      setTrialInfo({ days: 7, type: 'STANDARD' });
    }
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const validateStep1 = () => {
    if (!formData.teamName || !formData.contactEmail) {
      setError('Udfyld venligst alle påkrævede felter');
      return false;
    }
    if (!formData.contactEmail.includes('@')) {
      setError('Indtast venligst en gyldig email');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Adgangskode skal være mindst 6 tegn');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Adgangskoder matcher ikke');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');

    if (activeStep === 0) {
      if (!validateStep1()) return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (paymentMethodId: string) => {
    setLoading(true);
    setError('');

    try {
      // 1. Register user and team
      const registerResponse = await authAPI.register({
        name: formData.teamName,
        organizationNumber: formData.organizationNumber || undefined,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        password: formData.password,
      });

      const { token } = registerResponse.data;
      localStorage.setItem('token', token);

      // 2. Create subscription with payment method
      await subscriptionAPI.create({
        paymentMethodId,
        priceId: STRIPE_PRICE_ID,
      });

      // 3. Navigate to dashboard
      setActiveStep(2);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Signup failed:', err);
      setError(err.response?.data?.message || 'Der skete en fejl ved oprettelse. Prøv igen.');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Organisationsnavn"
              value={formData.teamName}
              onChange={handleChange('teamName')}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="CVR-nummer (valgfrit)"
              value={formData.organizationNumber}
              onChange={handleChange('organizationNumber')}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.contactEmail}
              onChange={handleChange('contactEmail')}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Telefonnummer (valgfrit)"
              value={formData.contactPhone}
              onChange={handleChange('contactPhone')}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Adgangskode"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              margin="normal"
              required
              helperText="Mindst 6 tegn"
            />
            <TextField
              fullWidth
              label="Bekræft adgangskode"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              margin="normal"
              required
            />

            {trialInfo && (
              <Card sx={{ mt: 3, bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🎉 Gratis prøveperiode
                  </Typography>
                  <Typography>
                    Du får <strong>{trialInfo.days} dage gratis</strong> at prøve systemet.
                    {trialInfo.type === 'EARLY_ADOPTER' && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Early Adopter fordel - få 60 dage gratis!
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Du kan opsige når som helst i prøveperioden, og der trækkes intet beløb.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" gutterBottom>
              Indtast betalingsoplysninger for at starte din gratis prøveperiode.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Du vil ikke blive opkrævet før prøveperioden udløber.
            </Typography>

            {stripePromise && (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  onSuccess={handleSubmit}
                  loading={loading}
                  onBack={handleBack}
                />
              </Elements>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" gutterBottom>
              ✓ Velkommen til systemet!
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Din konto er oprettet og din {trialInfo?.days} dages gratis prøveperiode er startet.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Du omdirigeres til dashboard...
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Opret konto
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Start din gratis prøveperiode i dag
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {renderStep()}

          {activeStep === 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => navigate('/login')}>Har allerede en konto?</Button>
              <Button variant="contained" onClick={handleNext}>
                Næste
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
