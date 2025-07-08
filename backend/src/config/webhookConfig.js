import logger from '../utils/logger.js';

// Clerk webhook configuration
export const clerkWebhookConfig = {
  // Webhook endpoint for Clerk user events
  userWebhookPath: '/api/webhooks/clerk/users',
  
  // Webhook endpoint for Clerk organization events (if needed)
  organizationWebhookPath: '/api/webhooks/clerk/organizations',
  
  // Supported user events
  supportedUserEvents: [
    'user.created',
    'user.updated', 
    'user.deleted',
    'user.email.changed',
    'user.profile.updated'
  ],
  
  // Supported organization events (for future use)
  supportedOrganizationEvents: [
    'organization.created',
    'organization.updated',
    'organization.deleted',
    'organizationMembership.created',
    'organizationMembership.updated',
    'organizationMembership.deleted'
  ]
};

// Stripe webhook configuration
export const stripeWebhookConfig = {
  // Webhook endpoint for Stripe events
  webhookPath: '/api/payments/webhooks/stripe',
  
  // Supported payment events
  supportedEvents: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'payment_method.attached',
    'customer.created',
    'customer.updated',
    'customer.deleted',
    'invoice.created',
    'invoice.finalized',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'checkout.session.completed',
    'checkout.session.expired'
  ]
};

// Webhook security configuration
export const webhookSecurity = {
  // Maximum webhook payload size (in bytes)
  maxPayloadSize: 1024 * 1024, // 1MB
  
  // Webhook timeout (in milliseconds)
  timeout: 10000, // 10 seconds
  
  // Rate limiting for webhooks
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 webhook requests per windowMs
    message: 'Too many webhook requests from this IP'
  },
  
  // Required headers for webhook verification
  requiredHeaders: {
    clerk: ['svix-id', 'svix-timestamp', 'svix-signature'],
    stripe: ['stripe-signature']
  }
};

// Webhook retry configuration
export const webhookRetry = {
  // Maximum number of retries for failed webhook processing
  maxRetries: 3,
  
  // Retry delay (in milliseconds)
  retryDelay: 1000, // 1 second
  
  // Exponential backoff multiplier
  backoffMultiplier: 2,
  
  // Maximum retry delay (in milliseconds)
  maxRetryDelay: 30000 // 30 seconds
};

// Webhook logging configuration
export const webhookLogging = {
  // Log all webhook events
  logAllEvents: true,
  
  // Log webhook payloads (disable in production for security)
  logPayloads: process.env.NODE_ENV === 'development',
  
  // Log webhook processing time
  logProcessingTime: true,
  
  // Log webhook errors
  logErrors: true
};

// Environment-specific webhook URLs
export const getWebhookUrls = () => {
  const baseUrl = process.env.WEBHOOK_BASE_URL || 
                  process.env.BACKEND_URL || 
                  `http://localhost:${process.env.PORT || 8000}`;
  
  return {
    clerk: {
      users: `${baseUrl}${clerkWebhookConfig.userWebhookPath}`,
      organizations: `${baseUrl}${clerkWebhookConfig.organizationWebhookPath}`
    },
    stripe: {
      main: `${baseUrl}${stripeWebhookConfig.webhookPath}`
    }
  };
};

// Webhook validation helpers
export const validateWebhookHeaders = (source, headers) => {
  const requiredHeaders = webhookSecurity.requiredHeaders[source];
  
  if (!requiredHeaders) {
    logger.warn(`Unknown webhook source: ${source}`);
    return false;
  }
  
  for (const header of requiredHeaders) {
    if (!headers[header]) {
      logger.warn(`Missing required webhook header: ${header} for source: ${source}`);
      return false;
    }
  }
  
  return true;
};

// Webhook event validation
export const validateWebhookEvent = (source, eventType) => {
  let supportedEvents;
  
  switch (source) {
    case 'clerk':
      supportedEvents = [
        ...clerkWebhookConfig.supportedUserEvents,
        ...clerkWebhookConfig.supportedOrganizationEvents
      ];
      break;
    case 'stripe':
      supportedEvents = stripeWebhookConfig.supportedEvents;
      break;
    default:
      logger.warn(`Unknown webhook source: ${source}`);
      return false;
  }
  
  if (!supportedEvents.includes(eventType)) {
    logger.warn(`Unsupported webhook event: ${eventType} for source: ${source}`);
    return false;
  }
  
  return true;
};

// Webhook configuration summary
export const getWebhookConfigSummary = () => {
  const urls = getWebhookUrls();
  
  return {
    environment: process.env.NODE_ENV || 'development',
    baseUrl: process.env.WEBHOOK_BASE_URL || process.env.BACKEND_URL || 'http://localhost:8000',
    endpoints: {
      clerk: urls.clerk,
      stripe: urls.stripe
    },
    security: {
      maxPayloadSize: webhookSecurity.maxPayloadSize,
      timeout: webhookSecurity.timeout,
      rateLimitEnabled: true
    },
    retry: {
      maxRetries: webhookRetry.maxRetries,
      initialDelay: webhookRetry.retryDelay,
      maxDelay: webhookRetry.maxRetryDelay
    },
    logging: webhookLogging
  };
};

export default {
  clerkWebhookConfig,
  stripeWebhookConfig,
  webhookSecurity,
  webhookRetry,
  webhookLogging,
  getWebhookUrls,
  validateWebhookHeaders,
  validateWebhookEvent,
  getWebhookConfigSummary
};