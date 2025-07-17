/**
 * Configuración de monitoreo y métricas
 */

const monitoringService = require('../services/monitoringService');
const { metricsMiddleware, errorTrackingMiddleware } = require('../utils/metrics');

/**
 * Configuración para diferentes entornos
 */
const monitoringConfigs = {
  development: {
    enabled: true,
    interval: 30000,        // 30 segundos
    logLevel: 'debug',
    persistMetrics: false,
    alerts: {
      enabled: false,
      channels: []
    },
    thresholds: {
      responseTime: 10000,    // 10 segundos (más permisivo en dev)
      errorRate: 10,          // 10%
      memoryUsage: 90,        // 90%
      activeConnections: 500,
      cacheHitRate: 50
    }
  },

  production: {
    enabled: true,
    interval: 60000,        // 1 minuto
    logLevel: 'info',
    persistMetrics: true,
    alerts: {
      enabled: true,
      channels: ['email', 'slack'] // Configurar según necesidades
    },
    thresholds: {
      responseTime: 5000,     // 5 segundos
      errorRate: 5,           // 5%
      memoryUsage: 85,        // 85%
      activeConnections: 1000,
      cacheHitRate: 70
    }
  },

  test: {
    enabled: false,
    interval: 5000,         // 5 segundos
    logLevel: 'error',
    persistMetrics: false,
    alerts: {
      enabled: false,
      channels: []
    },
    thresholds: {
      responseTime: 1000,
      errorRate: 0,
      memoryUsage: 95,
      activeConnections: 100,
      cacheHitRate: 90
    }
  }
};

/**
 * Configuración de alertas por canal
 */
const alertChannels = {
  email: {
    enabled: false,
    recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  slack: {
    enabled: false,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: process.env.SLACK_CHANNEL || '#alerts',
    username: 'MunDoctor Monitoring',
    emoji: ':warning:'
  },

  webhook: {
    enabled: false,
    url: process.env.WEBHOOK_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': process.env.WEBHOOK_AUTH_TOKEN ? `Bearer ${process.env.WEBHOOK_AUTH_TOKEN}` : undefined
    }
  }
};

/**
 * Clase para gestionar la configuración de monitoreo
 */
class MonitoringConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = monitoringConfigs[this.environment];
    this.initialized = false;
  }

  /**
   * Inicializa el sistema de monitoreo
   */
  initialize() {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    // Configurar umbrales
    monitoringService.setThresholds(this.config.thresholds);

    // Configurar manejadores de eventos
    this.setupEventHandlers();

    // Iniciar el servicio de monitoreo
    monitoringService.start(this.config.interval);

    this.initialized = true;
    console.log(`Monitoring initialized for ${this.environment} environment`);
  }

  /**
   * Configura los manejadores de eventos de monitoreo
   */
  setupEventHandlers() {
    // Manejador de alertas
    monitoringService.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    // Manejador de errores críticos
    monitoringService.on('error', (error) => {
      if (error.details?.statusCode >= 500) {
        this.handleCriticalError(error);
      }
    });

    // Manejador de métricas personalizadas
    monitoringService.on('custom_metric', (metric) => {
      this.handleCustomMetric(metric);
    });

    // Manejador de eventos de negocio importantes
    monitoringService.on('business', (event) => {
      this.handleBusinessEvent(event);
    });
  }

  /**
   * Maneja alertas del sistema
   */
  async handleAlert(alert) {
    console.warn(`[ALERT] ${alert.type}:`, alert.data);

    if (!this.config.alerts.enabled) {
      return;
    }

    // Enviar alerta por cada canal configurado
    for (const channel of this.config.alerts.channels) {
      try {
        await this.sendAlert(channel, alert);
      } catch (error) {
        console.error(`Error sending alert via ${channel}:`, error);
      }
    }
  }

  /**
   * Envía alerta a un canal específico
   */
  async sendAlert(channel, alert) {
    const channelConfig = alertChannels[channel];
    
    if (!channelConfig?.enabled) {
      return;
    }

    switch (channel) {
      case 'email':
        await this.sendEmailAlert(alert, channelConfig);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, channelConfig);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channelConfig);
        break;
    }
  }

  /**
   * Envía alerta por email
   */
  async sendEmailAlert(alert, config) {
    // Implementación básica - requiere configurar nodemailer
    console.log('EMAIL ALERT:', alert);
    // TODO: Implementar envío real de email
  }

  /**
   * Envía alerta a Slack
   */
  async sendSlackAlert(alert, config) {
    if (!config.webhookUrl) {
      return;
    }

    const payload = {
      channel: config.channel,
      username: config.username,
      icon_emoji: config.emoji,
      text: `🚨 *${alert.type}* (${alert.severity})`,
      attachments: [{
        color: this.getAlertColor(alert.severity),
        fields: [
          {
            title: 'Tipo',
            value: alert.type,
            short: true
          },
          {
            title: 'Severidad',
            value: alert.severity,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(alert.timestamp).toISOString(),
            short: true
          },
          {
            title: 'Datos',
            value: JSON.stringify(alert.data, null, 2),
            short: false
          }
        ]
      }]
    };

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack API responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending Slack alert:', error);
    }
  }

  /**
   * Envía alerta a webhook personalizado
   */
  async sendWebhookAlert(alert, config) {
    if (!config.url) {
      return;
    }

    const payload = {
      type: 'alert',
      environment: this.environment,
      service: 'mundoctor-backend',
      alert
    };

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending webhook alert:', error);
    }
  }

  /**
   * Maneja errores críticos
   */
  handleCriticalError(error) {
    console.error('[CRITICAL ERROR]:', error);
    
    // En producción, podríamos querer reiniciar el servicio
    if (this.environment === 'production' && error.details?.count > 10) {
      console.error('Too many critical errors, consider restarting service');
    }
  }

  /**
   * Maneja métricas personalizadas
   */
  handleCustomMetric(metric) {
    if (this.config.logLevel === 'debug') {
      console.log('[CUSTOM METRIC]:', metric);
    }
  }

  /**
   * Maneja eventos de negocio importantes
   */
  handleBusinessEvent(event) {
    // Log eventos importantes
    const importantEvents = [
      'user_registration',
      'professional_signup',
      'appointment_booking',
      'payment_processed'
    ];

    if (importantEvents.includes(event.event)) {
      console.log(`[BUSINESS EVENT] ${event.event}:`, event.data);
    }
  }

  /**
   * Obtiene color para alerta según severidad
   */
  getAlertColor(severity) {
    const colors = {
      info: '#36a64f',      // Verde
      warning: '#ff9900',   // Naranja
      critical: '#ff0000'   // Rojo
    };
    return colors[severity] || colors.info;
  }

  /**
   * Obtiene middleware de métricas configurado
   */
  getMetricsMiddleware() {
    if (!this.config.enabled) {
      return (req, res, next) => next();
    }
    return metricsMiddleware;
  }

  /**
   * Obtiene middleware de tracking de errores configurado
   */
  getErrorTrackingMiddleware() {
    if (!this.config.enabled) {
      return (error, req, res, next) => next(error);
    }
    return errorTrackingMiddleware;
  }

  /**
   * Detiene el monitoreo
   */
  shutdown() {
    if (this.initialized) {
      monitoringService.stop();
      monitoringService.removeAllListeners();
      this.initialized = false;
      console.log('Monitoring service shutdown');
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.initialized) {
      // Reinicializar si es necesario
      monitoringService.setThresholds(this.config.thresholds);
    }
  }
}

// Instancia singleton
const monitoringConfig = new MonitoringConfig();

// Configurar alertas basado en variables de entorno
if (process.env.ALERT_EMAIL_RECIPIENTS) {
  alertChannels.email.enabled = true;
}

if (process.env.SLACK_WEBHOOK_URL) {
  alertChannels.slack.enabled = true;
}

if (process.env.WEBHOOK_URL) {
  alertChannels.webhook.enabled = true;
}

module.exports = {
  monitoringConfig,
  monitoringConfigs,
  alertChannels
};