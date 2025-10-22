import Stripe from 'stripe';
import prisma from '../config/database';
import { logger } from '../config/logger';

// Initialisér Stripe med secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

export interface CreateSubscriptionParams {
  teamId: string;
  teamName: string;
  email: string;
  paymentMethodId: string;
  priceId: string;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
}

export class StripeService {
  /**
   * Beregn trial period baseret på oprettelsesdato
   * Før 1. november 2025 = 60 dage (EARLY_ADOPTER)
   * Efter = 7 dage (STANDARD)
   */
  static calculateTrialEnd(): { trialEnd: Date; trialType: 'STANDARD' | 'EARLY_ADOPTER' } {
    const now = new Date();
    const cutoffDate = new Date('2025-11-01T00:00:00Z');

    if (now < cutoffDate) {
      // Early adopter: 60 dage gratis
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 60);
      return { trialEnd, trialType: 'EARLY_ADOPTER' };
    } else {
      // Standard: 7 dage gratis
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 7);
      return { trialEnd, trialType: 'STANDARD' };
    }
  }

  /**
   * Opret Stripe customer og subscription
   */
  static async createSubscription(params: CreateSubscriptionParams) {
    try {
      const { teamId, teamName, email, paymentMethodId, priceId } = params;

      // Tjek om team allerede har en customer
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { subscription: true },
      });

      if (!team) {
        throw new Error('Team ikke fundet');
      }

      if (team.subscription) {
        throw new Error('Team har allerede et aktivt abonnement');
      }

      // Opret Stripe customer
      logger.info('Opretter Stripe customer', { teamId, email });
      const customer = await stripe.customers.create({
        email,
        name: teamName,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: {
          teamId,
        },
      });

      // Beregn trial period
      const { trialEnd, trialType } = this.calculateTrialEnd();
      const trialEndTimestamp = Math.floor(trialEnd.getTime() / 1000);

      // Opret subscription med trial
      logger.info('Opretter Stripe subscription', {
        customerId: customer.id,
        priceId,
        trialEnd,
        trialType,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_end: trialEndTimestamp,
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          teamId,
        },
      });

      // Hent price information
      const price = await stripe.prices.retrieve(priceId);

      // Opdater team med Stripe customer ID
      await prisma.team.update({
        where: { id: teamId },
        data: {
          stripeCustomerId: customer.id,
        },
      });

      // Gem subscription i database
      const dbSubscription = await prisma.subscription.create({
        data: {
          teamId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customer.id,
          stripePriceId: priceId,
          stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          status: subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
          trialEnd,
          trialType,
          priceAmount: price.unit_amount || 0,
          priceCurrency: price.currency || 'dkk',
          interval: price.recurring?.interval || 'month',
        },
      });

      logger.info('Subscription oprettet', {
        subscriptionId: subscription.id,
        teamId,
        status: subscription.status,
      });

      return {
        subscription: dbSubscription,
        stripeSubscription: subscription,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      };
    } catch (error: any) {
      logger.error('Fejl ved oprettelse af subscription', {
        error: error.message,
        teamId: params.teamId,
      });
      throw new Error(`Kunne ikke oprette abonnement: ${error.message}`);
    }
  }

  /**
   * Hent subscription fra Stripe
   */
  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error: any) {
      logger.error('Fejl ved hentning af subscription', {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Opdater subscription
   */
  static async updateSubscription(params: UpdateSubscriptionParams) {
    try {
      const { subscriptionId, priceId, cancelAtPeriodEnd } = params;

      const updateData: any = {};

      if (priceId) {
        // Hent aktuel subscription for at få item ID
        const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [
          {
            id: currentSubscription.items.data[0].id,
            price: priceId,
          },
        ];
      }

      if (cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = cancelAtPeriodEnd;
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, updateData);

      logger.info('Subscription opdateret', {
        subscriptionId,
        updates: updateData,
      });

      return subscription;
    } catch (error: any) {
      logger.error('Fejl ved opdatering af subscription', {
        error: error.message,
        subscriptionId: params.subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Opsig subscription
   * I trial period: Stopper med det samme
   * Efter trial: Stopper ved periode slut
   */
  static async cancelSubscription(teamId: string, immediately = false) {
    try {
      const dbSubscription = await prisma.subscription.findUnique({
        where: { teamId },
      });

      if (!dbSubscription) {
        throw new Error('Ingen aktiv subscription fundet');
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        dbSubscription.stripeSubscriptionId
      );

      // Hvis i trial period eller immediately flag, opsig med det samme
      const inTrial = stripeSubscription.status === 'trialing';

      if (inTrial || immediately) {
        logger.info('Opsiger subscription med det samme', {
          subscriptionId: dbSubscription.stripeSubscriptionId,
          teamId,
          inTrial,
        });

        await stripe.subscriptions.cancel(dbSubscription.stripeSubscriptionId);

        await prisma.subscription.update({
          where: { teamId },
          data: {
            status: 'CANCELED',
            cancelAtPeriodEnd: false,
            canceledAt: new Date(),
            endedAt: new Date(),
          },
        });

        return { canceledImmediately: true };
      } else {
        // Ellers opsig ved periode slut
        logger.info('Opsiger subscription ved periode slut', {
          subscriptionId: dbSubscription.stripeSubscriptionId,
          teamId,
          periodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        });

        await stripe.subscriptions.update(dbSubscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        await prisma.subscription.update({
          where: { teamId },
          data: {
            cancelAtPeriodEnd: true,
            canceledAt: new Date(),
          },
        });

        return {
          canceledImmediately: false,
          activeUntil: new Date((stripeSubscription as any).current_period_end * 1000),
        };
      }
    } catch (error: any) {
      logger.error('Fejl ved opsigelse af subscription', {
        error: error.message,
        teamId,
      });
      throw error;
    }
  }

  /**
   * Genaktiver opsagt subscription (hvis ikke udløbet endnu)
   */
  static async reactivateSubscription(teamId: string) {
    try {
      const dbSubscription = await prisma.subscription.findUnique({
        where: { teamId },
      });

      if (!dbSubscription) {
        throw new Error('Ingen subscription fundet');
      }

      if (!dbSubscription.cancelAtPeriodEnd) {
        throw new Error('Subscription er ikke opsagt');
      }

      await stripe.subscriptions.update(dbSubscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      await prisma.subscription.update({
        where: { teamId },
        data: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      logger.info('Subscription genaktiveret', {
        subscriptionId: dbSubscription.stripeSubscriptionId,
        teamId,
      });

      return { reactivated: true };
    } catch (error: any) {
      logger.error('Fejl ved genaktivering af subscription', {
        error: error.message,
        teamId,
      });
      throw error;
    }
  }

  /**
   * Håndter Stripe webhook events
   */
  static async handleWebhookEvent(event: Stripe.Event) {
    try {
      logger.info('Håndterer Stripe webhook', { type: event.type });

      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.syncSubscriptionStatus(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'customer.subscription.trial_will_end': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleTrialWillEnd(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailed(invoice);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentSucceeded(invoice);
          break;
        }

        default:
          logger.info('Uhåndteret webhook event type', { type: event.type });
      }

      return { received: true };
    } catch (error: any) {
      logger.error('Fejl ved håndtering af webhook', {
        error: error.message,
        eventType: event.type,
      });
      throw error;
    }
  }

  /**
   * Synkroniser subscription status fra Stripe
   */
  private static async syncSubscriptionStatus(stripeSubscription: Stripe.Subscription) {
    try {
      const teamId = stripeSubscription.metadata.teamId;

      if (!teamId) {
        logger.warn('Subscription mangler teamId i metadata', {
          subscriptionId: stripeSubscription.id,
        });
        return;
      }

      const statusMap: Record<string, any> = {
        trialing: 'TRIALING',
        active: 'ACTIVE',
        past_due: 'PAST_DUE',
        canceled: 'CANCELED',
        incomplete: 'INCOMPLETE',
        incomplete_expired: 'INCOMPLETE_EXPIRED',
        unpaid: 'UNPAID',
        paused: 'PAUSED',
      };

      await prisma.subscription.update({
        where: { teamId },
        data: {
          status: statusMap[stripeSubscription.status] || 'ACTIVE',
          stripeCurrentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      });

      logger.info('Subscription status synkroniseret', {
        subscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        teamId,
      });
    } catch (error: any) {
      logger.error('Fejl ved synkronisering af subscription status', {
        error: error.message,
        subscriptionId: stripeSubscription.id,
      });
      throw error;
    }
  }

  /**
   * Håndter slettet subscription
   */
  private static async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    try {
      const teamId = stripeSubscription.metadata.teamId;

      if (!teamId) {
        return;
      }

      await prisma.subscription.update({
        where: { teamId },
        data: {
          status: 'CANCELED',
          endedAt: new Date(),
        },
      });

      logger.info('Subscription slettet', {
        subscriptionId: stripeSubscription.id,
        teamId,
      });
    } catch (error: any) {
      logger.error('Fejl ved håndtering af slettet subscription', {
        error: error.message,
        subscriptionId: stripeSubscription.id,
      });
    }
  }

  /**
   * Send notifikation når trial period snart udløber
   */
  private static async handleTrialWillEnd(stripeSubscription: Stripe.Subscription) {
    try {
      const teamId = stripeSubscription.metadata.teamId;

      if (!teamId) {
        return;
      }

      // TODO: Send email notifikation til team
      logger.info('Trial period udløber snart', {
        subscriptionId: stripeSubscription.id,
        teamId,
        trialEnd: new Date(stripeSubscription.trial_end! * 1000),
      });
    } catch (error: any) {
      logger.error('Fejl ved håndtering af trial_will_end', {
        error: error.message,
        subscriptionId: stripeSubscription.id,
      });
    }
  }

  /**
   * Håndter fejlet betaling
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    try {
      const customerId = invoice.customer as string;
      const team = await prisma.team.findUnique({
        where: { stripeCustomerId: customerId },
      });

      if (!team) {
        return;
      }

      // Opdater subscription status
      await prisma.subscription.update({
        where: { teamId: team.id },
        data: {
          status: 'PAST_DUE',
        },
      });

      // TODO: Send email notifikation om fejlet betaling
      logger.warn('Betaling fejlede', {
        invoiceId: invoice.id,
        teamId: team.id,
      });
    } catch (error: any) {
      logger.error('Fejl ved håndtering af fejlet betaling', {
        error: error.message,
        invoiceId: invoice.id,
      });
    }
  }

  /**
   * Håndter succesfuld betaling
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      const customerId = invoice.customer as string;
      const team = await prisma.team.findUnique({
        where: { stripeCustomerId: customerId },
      });

      if (!team) {
        return;
      }

      // Opdater subscription status til ACTIVE hvis den var PAST_DUE
      const subscription = await prisma.subscription.findUnique({
        where: { teamId: team.id },
      });

      if (subscription && subscription.status === 'PAST_DUE') {
        await prisma.subscription.update({
          where: { teamId: team.id },
          data: {
            status: 'ACTIVE',
          },
        });
      }

      logger.info('Betaling gennemført', {
        invoiceId: invoice.id,
        teamId: team.id,
        amount: invoice.amount_paid,
      });
    } catch (error: any) {
      logger.error('Fejl ved håndtering af succesfuld betaling', {
        error: error.message,
        invoiceId: invoice.id,
      });
    }
  }

  /**
   * Opret Stripe checkout session (alternativ til direkte subscription creation)
   */
  static async createCheckoutSession(params: {
    teamId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    try {
      const { teamId, priceId, successUrl, cancelUrl } = params;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new Error('Team ikke fundet');
      }

      const { trialEnd } = this.calculateTrialEnd();
      const trialPeriodDays = Math.ceil(
        (trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: team.contactEmail,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: trialPeriodDays,
          metadata: {
            teamId,
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return session;
    } catch (error: any) {
      logger.error('Fejl ved oprettelse af checkout session', {
        error: error.message,
        teamId: params.teamId,
      });
      throw error;
    }
  }
}
