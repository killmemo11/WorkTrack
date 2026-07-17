const pino = require('pino');

let transport;
if (process.env.NODE_ENV !== 'production') {
  try {
    require.resolve('pino-pretty');
    transport = { target: 'pino-pretty', options: { colorize: true } };
  } catch {
    // pino-pretty not installed — fall back to default JSON logging
  }
}

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
  ...(transport ? { transport } : {}),
});

module.exports = logger;
