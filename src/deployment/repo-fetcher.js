const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const os = require('os');
const { SkyhookEnvironment } = require('../config/SkyhookConfig');

/**
 * Clone a deployment repo (shallow, cached by repo:branch).
 * Tries each token in order until one succeeds.
 * @param {string} repoFullName - e.g. "org/deploy-repo"
 * @param {string} branch - branch to clone (empty string = remote HEAD)
 * @param {string[]} githubTokens - GitHub tokens to try in priority order
 * @param {Map<string, string>} cloneCache - cache of repo:branch -> cloned path
 * @returns {Promise<string>} - path to cloned repo
 */
async function cloneDeploymentRepo(repoFullName, branch, githubTokens, cloneCache) {
  const cacheKey = `${repoFullName}:${branch || 'HEAD'}`;
  const branchLabel = branch || 'HEAD';

  if (cloneCache.has(cacheKey)) {
    core.info(`Using cached clone for ${cacheKey}`);
    return cloneCache.get(cacheKey);
  }

  const sanitized = repoFullName.replace(/[^a-zA-Z0-9_-]/g, '-');
  let lastError;

  // Build clone args: omit --branch to use remote HEAD when no branch specified
  const baseArgs = ['clone', '--depth', '1'];
  if (branch) {
    baseArgs.push('--single-branch', '--branch', branch);
  }

  for (let i = 0; i < githubTokens.length; i++) {
    const token = githubTokens[i];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `skyhook-${sanitized}-`));
    const repoUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;

    core.info(`Cloning ${repoFullName}@${branchLabel} (token ${i + 1}/${githubTokens.length})`);

    let stderr = '';
    try {
      await exec.exec('git', [...baseArgs, repoUrl, tmpDir], {
        silent: true,
        listeners: {
          stderr: (data) => { stderr += data.toString(); }
        }
      });

      cloneCache.set(cacheKey, tmpDir);
      core.info(`Cloned ${repoFullName}@${branchLabel} successfully`);
      return tmpDir;
    } catch (err) {
      // Clean up failed clone attempt
      fs.rmSync(tmpDir, { recursive: true, force: true });
      lastError = err;

      if (i < githubTokens.length - 1) {
        core.info(`Token ${i + 1} failed for ${repoFullName}, trying next token`);
      }
    }
  }

  throw new Error(`Failed to clone ${repoFullName}@${branchLabel}: ${lastError.message}`);
}

/**
 * List overlay directories for a service in a cloned deployment repo.
 * @param {string} clonedRepoPath - path to cloned repo root
 * @param {string} deploymentRepoPath - service path within the deployment repo (e.g. "vcs")
 * @returns {string[]} - array of environment/overlay names
 */
function listServiceOverlays(clonedRepoPath, deploymentRepoPath) {
  const overlaysDir = path.join(clonedRepoPath, deploymentRepoPath, 'overlays');

  if (!fs.existsSync(overlaysDir)) {
    core.warning(`Overlays directory not found: ${overlaysDir}`);
    return [];
  }

  const entries = fs.readdirSync(overlaysDir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

/**
 * Read environment config from skyhook/environments/{name}.yaml in a cloned deployment repo.
 * @param {string} clonedRepoPath - path to cloned repo root
 * @param {string} repoFullName - repo identifier for cache key
 * @param {string} branch - branch for cache key
 * @param {string} envName - environment name
 * @param {Map<string, SkyhookEnvironment>} envConfigCache - cache of parsed env configs
 * @returns {SkyhookEnvironment}
 */
function readEnvironmentConfig(clonedRepoPath, repoFullName, branch, envName, envConfigCache) {
  const cacheKey = `${repoFullName}:${branch}:${envName}`;

  if (envConfigCache.has(cacheKey)) {
    return envConfigCache.get(cacheKey);
  }

  const envFilePath = path.join(clonedRepoPath, 'skyhook', 'environments', `${envName}.yaml`);

  if (!fs.existsSync(envFilePath)) {
    core.warning(`Environment config not found: ${envFilePath}, using name-only environment`);
    const env = new SkyhookEnvironment({ name: envName });
    envConfigCache.set(cacheKey, env);
    return env;
  }

  const content = fs.readFileSync(envFilePath, 'utf8');
  const parsed = yaml.load(content);

  const env = new SkyhookEnvironment({
    name: envName,
    clusterName: parsed.clusterName,
    cloudProvider: parsed.cloudProvider,
    account: parsed.account,
    location: parsed.location,
    namespace: parsed.namespace,
    autoDeploy: parsed.autoDeploy
  });

  envConfigCache.set(cacheKey, env);
  return env;
}

/**
 * Resolve environments for a service that has a deploymentRepo.
 * Clones the repo, lists overlays, reads env configs.
 * @param {Object} service - SkyhookService instance
 * @param {string} branch - branch to clone
 * @param {string[]} githubTokens - GitHub tokens to try in priority order
 * @param {Map<string, string>} cloneCache - clone cache
 * @param {Map<string, SkyhookEnvironment>} envConfigCache - env config cache
 * @returns {Promise<SkyhookEnvironment[]>}
 */
async function resolveServiceEnvironments(service, branch, githubTokens, cloneCache, envConfigCache) {
  const clonedPath = await cloneDeploymentRepo(
    service.deploymentRepo, branch, githubTokens, cloneCache
  );

  const overlayNames = listServiceOverlays(clonedPath, service.deploymentRepoPath || service.name);

  if (overlayNames.length === 0) {
    core.warning(`No overlays found for service ${service.name} in ${service.deploymentRepo}`);
    return [];
  }

  core.info(`Found ${overlayNames.length} overlays for ${service.name}: ${overlayNames.join(', ')}`);

  const environments = [];
  for (const envName of overlayNames) {
    const env = readEnvironmentConfig(
      clonedPath, service.deploymentRepo, branch, envName, envConfigCache
    );
    environments.push(env);
  }

  return environments;
}

module.exports = {
  cloneDeploymentRepo,
  listServiceOverlays,
  readEnvironmentConfig,
  resolveServiceEnvironments
};
