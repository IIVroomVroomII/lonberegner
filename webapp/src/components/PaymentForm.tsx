import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface PaymentFormProps {
  onSuccess: (paymentMethodId: string) => void;
  loading: boolean;
  onBack: () => void;
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

export default function PaymentForm({ onSuccess, loading, onBack }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError('');
    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Kortoplysninger mangler');
      }

      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error('Kunne ikke oprette betalingsmetode');
      }

      // Pass payment method ID to parent
      onSuccess(paymentMethod.id);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Der skete en fejl ved behandling af betalingsoplysninger');
      setProcessing(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          p: 2,
          border: '1px solid #ccc',
          borderRadius: 1,
          mb: 3,
          '&:focus-within': {
            borderColor: 'primary.main',
          },
        }}
      >
        <CardElement options={cardElementOptions} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack} disabled={processing || loading}>
          Tilbage
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!stripe || processing || loading}
        >
          {processing || loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Opretter konto...
            </>
          ) : (
            'Start gratis prøveperiode'
          )}
        </Button>
      </Box>
    </Box>
  );
}
