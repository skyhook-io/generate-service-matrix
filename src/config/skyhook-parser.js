const fs = require('fs');
const yaml = require('js-yaml');
const { SkyhookConfig } = require('./SkyhookConfig');

/**
 * Parse a skyhook.yaml configuration file
 * @param {string} filePath - Path to skyhook.yaml
 * @returns {SkyhookConfig} - Parsed configuration object
 */
function parseSkyhookConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Skyhook configuration file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  let rawConfig;
  try {
    rawConfig = yaml.load(content);
  } catch (error) {
    throw new Error(`Failed to parse skyhook.yaml: ${error.message}`);
  }

  const validation = validateSkyhookConfig(rawConfig);
  if (!validation.valid) {
    throw new Error(`Invalid skyhook.yaml:\n${validation.errors.join('\n')}`);
  }

  return SkyhookConfig.fromObject(rawConfig);
}

/**
 * Validate skyhook configuration structure
 * @param {Object} config - Parsed configuration object
 * @returns {Object} - Validation result { valid: boolean, errors: string[] }
 */
function validateSkyhookConfig(config) {
  const errors = [];

  if (!config) {
    errors.push('Configuration is empty or invalid');
    return { valid: false, errors };
  }

  // Validate services
  if (!config.services || !Array.isArray(config.services)) {
    errors.push('services must be an array');
  } else {
    config.services.forEach((service, index) => {
      if (!service.name) {
        errors.push(`services[${index}]: name is required`);
      }
      if (!service.path) {
        errors.push(`services[${index}]: path is required`);
      }
    });
  }

  // Validate environments if present
  if (config.environments) {
    if (!Array.isArray(config.environments)) {
      errors.push('environments must be an array');
    } else {
      config.environments.forEach((env, index) => {
        if (!env.name) {
          errors.push(`environments[${index}]: name is required`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  parseSkyhookConfig,
  validateSkyhookConfig
};
