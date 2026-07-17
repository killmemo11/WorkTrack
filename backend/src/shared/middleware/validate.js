const Joi = require('joi');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    req[source] = value;
    next();
  };
}

function validateQuery(schema) {
  return validate(schema, 'query');
}

module.exports = { validate, validateQuery };
