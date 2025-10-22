import { Router } from 'express';
import {
  getSubscription,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  updatePaymentMethod,
  getInvoices,
  createCheckoutSession,
  getStripePublicKey,
  handleStripeWebhook,
} from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public endpoints
// GET /api/v1/subscription/config - Hent Stripe public key
router.get('/config', getStripePublicKey);

// POST /api/v1/subscription/webhook - Stripe webhook (NO AUTH - Stripe verificerer)
// VIGTIGT: Denne skal IKKE have authenticate middleware
// Raw body er nødvendigt for webhook signature verification
router.post('/webhook', handleStripeWebhook);

// Beskyttede endpoints - kræver authentication
router.use(authenticate);

// GET /api/v1/subscription - Hent subscription info
router.get('/', getSubscription);

// POST /api/v1/subscription - Opret subscription
router.post('/', createSubscription);

// POST /api/v1/subscription/cancel - Opsig subscription
router.post('/cancel', cancelSubscription);

// POST /api/v1/subscription/reactivate - Genaktiver opsagt subscription
router.post('/reactivate', reactivateSubscription);

// POST /api/v1/subscription/payment-method - Opdater betalingsmetode
router.post('/payment-method', updatePaymentMethod);

// GET /api/v1/subscription/invoices - Hent betalingshistorik
router.get('/invoices', getInvoices);

// POST /api/v1/subscription/checkout-session - Opret checkout session
router.post('/checkout-session', createCheckoutSession);

export default router;
