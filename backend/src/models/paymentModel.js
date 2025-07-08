// Payment data models and types
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash'
};

export const PAYMENT_TYPES = {
  SUBSCRIPTION: 'subscription',
  APPOINTMENT: 'appointment',
  SERVICE: 'service',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment'
};

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing'
};

export const SUBSCRIPTION_INTERVALS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const CURRENCY_CODES = {
  MXN: 'MXN',
  USD: 'USD',
  EUR: 'EUR'
};

// Payment model structure
export const PaymentModel = {
  id: 'string', // UUID
  userId: 'string', // Clerk user ID
  subscriptionId: 'string', // Optional - for subscription payments
  appointmentId: 'string', // Optional - for appointment payments
  amount: 'number', // Amount in cents
  currency: 'string', // Currency code (MXN, USD, EUR)
  status: 'string', // Payment status
  paymentMethod: 'string', // Payment method used
  paymentType: 'string', // Type of payment
  stripePaymentIntentId: 'string', // Stripe payment intent ID
  stripeChargeId: 'string', // Stripe charge ID
  clerkPaymentId: 'string', // Clerk payment ID
  description: 'string', // Payment description
  metadata: 'object', // Additional metadata
  failureReason: 'string', // Failure reason if failed
  refundedAt: 'date', // Refund date
  refundAmount: 'number', // Refund amount in cents
  refundReason: 'string', // Refund reason
  createdAt: 'date',
  updatedAt: 'date'
};

// Subscription model structure
export const SubscriptionModel = {
  id: 'string', // UUID
  userId: 'string', // Clerk user ID
  planId: 'string', // Subscription plan ID
  planName: 'string', // Plan name
  status: 'string', // Subscription status
  interval: 'string', // Billing interval
  amount: 'number', // Amount in cents
  currency: 'string', // Currency code
  stripeSubscriptionId: 'string', // Stripe subscription ID
  stripeCustomerId: 'string', // Stripe customer ID
  clerkSubscriptionId: 'string', // Clerk subscription ID
  currentPeriodStart: 'date', // Current period start
  currentPeriodEnd: 'date', // Current period end
  trialStart: 'date', // Trial start date
  trialEnd: 'date', // Trial end date
  cancelledAt: 'date', // Cancellation date
  cancelAtPeriodEnd: 'boolean', // Cancel at period end
  metadata: 'object', // Additional metadata
  createdAt: 'date',
  updatedAt: 'date'
};

// Invoice model structure
export const InvoiceModel = {
  id: 'string', // UUID
  userId: 'string', // Clerk user ID
  subscriptionId: 'string', // Optional - for subscription invoices
  paymentId: 'string', // Optional - associated payment
  invoiceNumber: 'string', // Invoice number
  status: 'string', // Invoice status
  subtotal: 'number', // Subtotal in cents
  tax: 'number', // Tax amount in cents
  total: 'number', // Total amount in cents
  currency: 'string', // Currency code
  dueDate: 'date', // Due date
  paidAt: 'date', // Payment date
  sentAt: 'date', // Email sent date
  pdfUrl: 'string', // PDF file URL
  stripeInvoiceId: 'string', // Stripe invoice ID
  clerkInvoiceId: 'string', // Clerk invoice ID
  items: 'array', // Invoice items
  customerInfo: 'object', // Customer information
  companyInfo: 'object', // Company information
  notes: 'string', // Additional notes
  metadata: 'object', // Additional metadata
  createdAt: 'date',
  updatedAt: 'date'
};

// Invoice item structure
export const InvoiceItemModel = {
  id: 'string', // UUID
  invoiceId: 'string', // Invoice ID
  description: 'string', // Item description
  quantity: 'number', // Quantity
  unitPrice: 'number', // Unit price in cents
  amount: 'number', // Total amount in cents
  metadata: 'object', // Additional metadata
  createdAt: 'date'
};

// Transaction model structure
export const TransactionModel = {
  id: 'string', // UUID
  userId: 'string', // Clerk user ID
  paymentId: 'string', // Associated payment ID
  type: 'string', // Transaction type (payment, refund, adjustment)
  amount: 'number', // Amount in cents
  currency: 'string', // Currency code
  status: 'string', // Transaction status
  description: 'string', // Transaction description
  reference: 'string', // External reference
  metadata: 'object', // Additional metadata
  createdAt: 'date',
  updatedAt: 'date'
};

// Payment plan model structure
export const PaymentPlanModel = {
  id: 'string', // UUID
  name: 'string', // Plan name
  description: 'string', // Plan description
  amount: 'number', // Amount in cents
  currency: 'string', // Currency code
  interval: 'string', // Billing interval
  intervalCount: 'number', // Number of intervals
  trialPeriodDays: 'number', // Trial period in days
  features: 'array', // Plan features
  isActive: 'boolean', // Plan is active
  stripePriceId: 'string', // Stripe price ID
  clerkPlanId: 'string', // Clerk plan ID
  metadata: 'object', // Additional metadata
  createdAt: 'date',
  updatedAt: 'date'
};

// Webhook event model structure
export const WebhookEventModel = {
  id: 'string', // UUID
  source: 'string', // Webhook source (stripe, clerk)
  eventType: 'string', // Event type
  eventId: 'string', // External event ID
  data: 'object', // Event data
  processed: 'boolean', // Event processed
  processedAt: 'date', // Processing date
  error: 'string', // Error message if failed
  retryCount: 'number', // Retry count
  createdAt: 'date',
  updatedAt: 'date'
};

// Validation functions
export const validatePaymentAmount = (amount) => {
  return typeof amount === 'number' && amount > 0 && amount <= 999999999; // Max ~$10M
};

export const validateCurrency = (currency) => {
  return Object.values(CURRENCY_CODES).includes(currency);
};

export const validatePaymentStatus = (status) => {
  return Object.values(PAYMENT_STATUSES).includes(status);
};

export const validatePaymentMethod = (method) => {
  return Object.values(PAYMENT_METHODS).includes(method);
};

export const validatePaymentType = (type) => {
  return Object.values(PAYMENT_TYPES).includes(type);
};

export const validateSubscriptionStatus = (status) => {
  return Object.values(SUBSCRIPTION_STATUSES).includes(status);
};

export const validateSubscriptionInterval = (interval) => {
  return Object.values(SUBSCRIPTION_INTERVALS).includes(interval);
};

export const validateInvoiceStatus = (status) => {
  return Object.values(INVOICE_STATUSES).includes(status);
};

// Helper functions
export const formatCurrency = (amount, currency = 'MXN') => {
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });
  return formatter.format(amount / 100); // Convert from cents
};

export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}${day}-${random}`;
};

export const calculateTax = (amount, taxRate = 0.16) => {
  return Math.round(amount * taxRate);
};

export const calculateTotal = (subtotal, tax = 0) => {
  return subtotal + tax;
};

// Export all models
export default {
  PaymentModel,
  SubscriptionModel,
  InvoiceModel,
  InvoiceItemModel,
  TransactionModel,
  PaymentPlanModel,
  WebhookEventModel,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_INTERVALS,
  INVOICE_STATUSES,
  CURRENCY_CODES,
  validatePaymentAmount,
  validateCurrency,
  validatePaymentStatus,
  validatePaymentMethod,
  validatePaymentType,
  validateSubscriptionStatus,
  validateSubscriptionInterval,
  validateInvoiceStatus,
  formatCurrency,
  generateInvoiceNumber,
  calculateTax,
  calculateTotal
};