import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../config/logger';
import { StripeService } from '../services/StripeService';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

/**
 * Hent subscription info for team
 */
export const getSubscription = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { teamId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
          },
        },
      },
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'Intet abonnement fundet',
      });
    }

    // Beregn dage tilbage af trial
    let daysRemainingInTrial = null;
    if (subscription.trialEnd) {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEnd);
      if (trialEnd > now) {
        daysRemainingInTrial = Math.ceil(
          (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    return res.json({
      success: true,
      data: {
        ...subscription,
        daysRemainingInTrial,
        priceFormatted: `${(subscription.priceAmount / 100).toFixed(2)} ${subscription.priceCurrency.toUpperCase()}`,
      },
    });
  } catch (error: any) {
    logger.error('Fejl ved hentning af subscription', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af abonnement',
    });
  }
};

/**
 * Opret subscription
 */
export const createSubscription = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { paymentMethodId, priceId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Betalingsmetode mangler',
      });
    }

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'Price ID mangler',
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { subscription: true },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team ikke fundet',
      });
    }

    if (team.subscription) {
      return res.status(400).json({
        success: false,
        message: 'Team har allerede et aktivt abonnement',
      });
    }

    const result = await StripeService.createSubscription({
      teamId,
      teamName: team.name,
      email: team.contactEmail,
      paymentMethodId,
      priceId,
    });

    return res.json({
      success: true,
      data: result.subscription,
      message: 'Abonnement oprettet',
    });
  } catch (error: any) {
    logger.error('Fejl ved oprettelse af subscription', { error: error.message });
    return res.status(500).json({
      success: false,
      message: error.message || 'Fejl ved oprettelse af abonnement',
    });
  }
};

/**
 * Opsig subscription
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { immediately } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    const result = await StripeService.cancelSubscription(teamId, immediately);

    return res.json({
      success: true,
      data: result,
      message: result.canceledImmediately
        ? 'Abonnement opsagt med det samme'
        : 'Abonnement opsagt - aktiv til periode slut',
    });
  } catch (error: any) {
    logger.error('Fejl ved opsigelse af subscription', { error: error.message });
    return res.status(500).json({
      success: false,
      message: error.message || 'Fejl ved opsigelse af abonnement',
    });
  }
};

/**
 * Genaktiver opsagt subscription
 */
export const reactivateSubscription = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    await StripeService.reactivateSubscription(teamId);

    return res.json({
      success: true,
      message: 'Abonnement genaktiveret',
    });
  } catch (error: any) {
    logger.error('Fejl ved genaktivering af subscription', { error: error.message });
    return res.status(500).json({
      success: false,
      message: error.message || 'Fejl ved genaktivering af abonnement',
    });
  }
};

/**
 * Opdater betalingsmetode
 */
export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { paymentMethodId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Betalingsmetode mangler',
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || !team.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        message: 'Stripe customer ikke fundet',
      });
    }

    // Tilføj betalingsmetode til customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: team.stripeCustomerId,
    });

    // Sæt som default betalingsmetode
    await stripe.customers.update(team.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    logger.info('Betalingsmetode opdateret', {
      teamId,
      customerId: team.stripeCustomerId,
    });

    return res.json({
      success: true,
      message: 'Betalingsmetode opdateret',
    });
  } catch (error: any) {
    logger.error('Fejl ved opdatering af betalingsmetode', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved opdatering af betalingsmetode',
    });
  }
};

/**
 * Hent betalingshistorik
 */
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || !team.stripeCustomerId) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const invoices = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      limit: 12,
    });

    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: new Date(invoice.created * 1000),
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
    }));

    return res.json({
      success: true,
      data: formattedInvoices,
    });
  } catch (error: any) {
    logger.error('Fejl ved hentning af fakturaer', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved hentning af fakturaer',
    });
  }
};

/**
 * Opret Stripe checkout session (alternativ signup flow)
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const teamId = authReq.user?.teamId;
    const { priceId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID mangler',
      });
    }

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'Price ID mangler',
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await StripeService.createCheckoutSession({
      teamId,
      priceId,
      successUrl: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/subscription`,
    });

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error: any) {
    logger.error('Fejl ved oprettelse af checkout session', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved oprettelse af checkout session',
    });
  }
};

/**
 * Hent Stripe public key
 */
export const getStripePublicKey = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
  });
};

/**
 * Webhook endpoint for Stripe events
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET ikke sat');
      return res.status(500).json({ error: 'Webhook secret ikke konfigureret' });
    }

    if (!sig) {
      return res.status(400).json({ error: 'Manglende stripe-signature header' });
    }

    // Verificer webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed', { error: err.message });
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Håndter event
    await StripeService.handleWebhookEvent(event);

    return res.json({ received: true });
  } catch (error: any) {
    logger.error('Fejl ved håndtering af webhook', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Fejl ved håndtering af webhook',
    });
  }
};
