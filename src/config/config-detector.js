const fs = require('fs');
const path = require('path');
const { SkyhookConfig } = require('./SkyhookConfig');

/**
 * Get the path to the Skyhook config file
 * @param {string} repoPath - Path to the repository root
 * @returns {string|null} - Path to skyhook.yaml if found, null otherwise
 */
function getSkyhookConfigPath(repoPath) {
  const skyhookPath = path.join(repoPath, SkyhookConfig.CONFIG_PATH);
  if (fs.existsSync(skyhookPath)) {
    return skyhookPath;
  }
  return null;
}

/**
 * Get the path to the Koala config file
 * @param {string} repoPath - Path to the repository root
 * @returns {string|null} - Path to .koala-monorepo.json if found, null otherwise
 */
function getKoalaConfigPath(repoPath) {
  const koalaPath = path.join(repoPath, '.koala-monorepo.json');
  if (fs.existsSync(koalaPath)) {
    return koalaPath;
  }
  return null;
}

/**
 * Detect which configuration format(s) are present in the repository
 * @param {string} repoPath - Path to the repository root
 * @returns {Object} - { hasSkyhook: boolean, hasKoala: boolean, skyhookPath: string|null, koalaPath: string|null }
 */
function detectConfigFormats(repoPath) {
  const skyhookPath = getSkyhookConfigPath(repoPath);
  const koalaPath = getKoalaConfigPath(repoPath);

  return {
    hasSkyhook: skyhookPath !== null,
    hasKoala: koalaPath !== null,
    skyhookPath,
    koalaPath
  };
}

module.exports = {
  getSkyhookConfigPath,
  getKoalaConfigPath,
  detectConfigFormats
};
