const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'current_password', 'new_password', 'token'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== 'production' ? {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  } : {}),
});

module.exports = logger;
