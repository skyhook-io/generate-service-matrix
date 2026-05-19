const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const { DeploymentMatrix } = require('./DeploymentMatrix');
const { detectConfigFormats } = require('./config/config-detector');
const { parseSkyhookConfig } = require('./config/skyhook-parser');
const { buildMatrixFromSkyhook, mergeMatrices } = require('./matrix/matrix-builder');
const { buildBuildMatrix } = require('./matrix/build-matrix-builder');
const { resolveServiceEnvironments } = require('./deployment/repo-fetcher');

async function run() {
  try {
    const overlay = core.getInput('overlay');
    const environmentsInput = core.getInput('environments');
    const forceDeploy = core.getInput('force-deploy') === 'true';
    const rawBranch = core.getInput('branch') || '';
    // Treat "HEAD" as empty so git clone uses the remote's default branch
    const branch = rawBranch === 'HEAD' ? '' : rawBranch;
    const tag = core.getInput('tag');
    const repoPath = core.getInput('repo-path') || '.';
    const onDiscoveryFailure = core.getInput('on-discovery-failure') || 'skip';
    const kustomizeImageFallback = core.getInput('kustomize-image-fallback') === 'true';

    // Build effective env filter: "environments" wins if non-empty, else fall back to legacy "overlay".
    // null means no filter (include all environments).
    const envList = environmentsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    let envFilterSet = null;
    if (envList.length > 0) {
      envFilterSet = new Set(envList);
      if (overlay) {
        core.info(`Both "environments" and "overlay" provided - using "environments". environments=[${envList.join(', ')}], overlay="${overlay}"`);
      } else {
        core.info(`Using environments filter: [${envList.join(', ')}]`);
      }
    } else if (overlay) {
      envFilterSet = new Set([overlay]);
      core.info(`Using overlay filter: "${overlay}"`);
    } else {
      core.info('No env filter set - all environments included');
    }
    if (forceDeploy) {
      core.info('force-deploy=true: all matched envs will be treated as auto_deploy=true');
    }

    // Collect all available tokens (deduplicated, ordered by priority)
    const inputToken = core.getInput('github-token');
    const envToken = process.env.GITHUB_TOKEN;
    const githubTokens = resolveTokens(inputToken, envToken);

    core.info(`Token sources: github-token input=${inputToken ? `yes (prefix: ${inputToken.substring(0, 8)}..., length: ${inputToken.length})` : 'no'}, GITHUB_TOKEN env=${envToken ? `yes (prefix: ${envToken.substring(0, 8)}..., length: ${envToken.length})` : 'no'}`);
    core.info(`Resolved ${githubTokens.length} unique token(s)`);

    // Validate inputs
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path not found: ${repoPath}`);
    }

    if (!tag) {
      throw new Error('tag input is required');
    }

    if (githubTokens.length === 0) {
      throw new Error('github-token input is required, or GITHUB_TOKEN environment variable must be set');
    }

    // Primary token used for most operations
    const githubToken = githubTokens[0];

    // Detect which config format(s) are present
    const configFormats = detectConfigFormats(repoPath);
    core.info(`Config detection: hasSkyhook=${configFormats.hasSkyhook}, hasKoala=${configFormats.hasKoala}`);

    if (!configFormats.hasSkyhook && !configFormats.hasKoala) {
      throw new Error('No configuration found. Expected .skyhook/skyhook.yaml or .koala-monorepo.json');
    }

    let koalaMatrix = null;
    let skyhookMatrix = null;
    const skyhookCloneCache = new Map();

    // Process Koala config if present
    if (configFormats.hasKoala) {
      core.info('📋 Processing Koala configuration (.koala-monorepo.json)');
      koalaMatrix = await processKoalaConfig(repoPath, branch, tag, githubToken, envFilterSet, forceDeploy);
    }

    // Log git credential config for debugging — actions/checkout may set a credential helper
    // that could intercept embedded-token URLs used for deployment repo cloning
    try {
      let credentialConfig = '';
      await exec.exec('git', ['config', '--global', '--list'], {
        silent: true,
        listeners: { stdout: (data) => { credentialConfig += data.toString(); } }
      });
      const credentialLines = credentialConfig.split('\n').filter(l => l.includes('credential') || l.includes('http.'));
      if (credentialLines.length > 0) {
        core.info(`Git credential/http config:\n${credentialLines.join('\n')}`);
      }
    } catch (_) {
      // ignore — just debug info
    }

    // Process Skyhook config if present
    // Get per-service counters from Koala output to continue from
    const serviceCounters = koalaMatrix ? getServiceCounters(koalaMatrix) : new Map();
    if (configFormats.hasSkyhook) {
      core.info('📋 Processing Skyhook configuration (.skyhook/skyhook.yaml)');
      skyhookMatrix = await processSkyhookConfig(configFormats.skyhookPath, tag, envFilterSet, repoPath, serviceCounters, branch, githubTokens, skyhookCloneCache, onDiscoveryFailure, forceDeploy);
    }

    // Determine final matrix
    let finalMatrix;
    if (koalaMatrix && skyhookMatrix) {
      core.info('🔀 Merging Koala and Skyhook configurations');
      finalMatrix = mergeMatrices(koalaMatrix, skyhookMatrix);
    } else if (skyhookMatrix) {
      finalMatrix = skyhookMatrix;
    } else {
      finalMatrix = koalaMatrix;
    }

    if (!finalMatrix || finalMatrix.isEmpty()) {
      throw new Error('Generated matrix is empty - no service/environment combinations found');
    }

    // Output full matrix (backward compatible with create-deployment-matrix)
    const fullMatrix = finalMatrix.toObject();
    core.setOutput('matrix', JSON.stringify(fullMatrix));
    core.info(`✅ Generated matrix with ${finalMatrix.count} entries:`);
    core.info(JSON.stringify(fullMatrix, null, 2));

    // Build build_matrix: one entry per service with images from kustomization.yaml
    // Only include services that are in the final matrix (excludes failed discoveries)
    const allServices = configFormats.hasSkyhook ? parseSkyhookConfig(configFormats.skyhookPath).services : [];
    const matrixServiceNames = new Set(finalMatrix.include.map(e => e.service_name));
    const buildMatrixInclude = buildBuildMatrix(allServices, matrixServiceNames, skyhookCloneCache, {
      branch,
      repoPath,
      kustomizeImageFallback,
      skyhookMatrix
    });

    const buildMatrix = { include: buildMatrixInclude };
    core.setOutput('build_matrix', JSON.stringify(buildMatrix));
    core.info(`✅ Generated build matrix with ${buildMatrixInclude.length} entries:`);
    core.info(JSON.stringify(buildMatrix, null, 2));

    // Build deploy_matrix: only auto_deploy entries
    const deployMatrixInclude = finalMatrix.include.filter(e => e.auto_deploy === 'true');
    const deployMatrix = { include: deployMatrixInclude.map(e => e.toObject()) };
    core.setOutput('deploy_matrix', JSON.stringify(deployMatrix));
    core.info(`✅ Generated deploy matrix with ${deployMatrixInclude.length} entries (auto_deploy only):`);
    core.info(JSON.stringify(deployMatrix, null, 2));

  } catch (error) {
    core.setFailed(error.message);
  }
}

/**
 * Get per-service counters from existing service_tags in a matrix
 * Parses tags like "service_name_v1.0.0_01" to extract the counter per service
 * @param {DeploymentMatrix} matrix
 * @returns {Map<string, number>} - Map of service_name -> highest counter
 */
function getServiceCounters(matrix) {
  const counters = new Map();

  for (const entry of matrix.include) {
    if (entry.service_tag && entry.service_name) {
      // service_tag format: {service_name}_{tag}_{counter}
      // e.g., "cloud-provisioner_v1.0.0_01"
      const match = entry.service_tag.match(/_(\d+)$/);
      if (match) {
        const counter = parseInt(match[1], 10);
        const current = counters.get(entry.service_name) || 0;
        if (counter > current) {
          counters.set(entry.service_name, counter);
        }
      }
    }
  }

  core.info(`Service counters from Koala matrix: ${JSON.stringify(Object.fromEntries(counters))}`);
  return counters;
}

/**
 * Process Koala configuration using workflow-utils CLI
 * @param {string} repoPath
 * @param {string} branch
 * @param {string} tag
 * @param {string} githubToken
 * @param {Set<string>|null} envFilterSet - Effective env filter (null = all envs)
 * @param {boolean} forceDeploy - When true, override auto_deploy to 'true' for all surviving entries
 */
async function processKoalaConfig(repoPath, branch, tag, githubToken, envFilterSet, forceDeploy) {
  core.info('🔍 Reading .koala-monorepo.json from repo root to identify services');
  core.info('📋 Extracting deployment configuration from .koala.toml files for different environments');

  // Build the command
  let cmd = `npx --yes workflow-utils get-services-env-config -dir . -outputFormat github-matrix -actionTag ${tag} -token ${githubToken}`;
  if (branch) {
    cmd += ` -branch ${branch}`;
  }

  // workflow-utils -envFilter takes a single value. If we have exactly one env in the filter,
  // use the native flag (also faster - drops other envs server-side). Otherwise, fetch all
  // envs and post-filter the parsed matrix below.
  let postFilterNeeded = false;
  if (envFilterSet) {
    if (envFilterSet.size === 1) {
      const single = [...envFilterSet][0];
      core.info(`🎯 Filtering for environment: ${single}`);
      cmd += ` -envFilter ${single}`;
    } else {
      core.info(`🎯 Filtering for environments (post-filter): [${[...envFilterSet].join(', ')}]`);
      postFilterNeeded = true;
    }
  } else {
    core.info('🌍 Including all environments');
  }

  core.info(`📦 Executing: ${cmd}`);

  // Execute the command
  let stdout = '';
  let stderr = '';

  const options = {
    cwd: repoPath,
    env: {
      ...process.env,
      GITHUB_TOKEN: githubToken
    },
    listeners: {
      stdout: (data) => {
        stdout += data.toString();
      },
      stderr: (data) => {
        stderr += data.toString();
      }
    }
  };

  await exec.exec('bash', ['-c', cmd], options);

  if (!stdout.trim()) {
    throw new Error('Failed to generate matrix from Koala config - empty result');
  }

  core.info('Raw output from workflow-utils:');
  core.info(stdout);

  // Parse the JSON into DeploymentMatrix
  let parsed = JSON.parse(stdout.trim());

  // Check if it's double-encoded (a string containing JSON)
  if (typeof parsed === 'string') {
    core.info('Detected double-encoded JSON, decoding...');
    parsed = JSON.parse(parsed);
  }

  const matrix = DeploymentMatrix.fromObject(parsed);

  // Post-filter by env name set when workflow-utils couldn't do it natively (multi-env).
  if (postFilterNeeded) {
    const before = matrix.include.length;
    matrix.include = matrix.include.filter(e => envFilterSet.has(e.overlay));
    core.info(`Post-filtered Koala matrix by environments: ${before} → ${matrix.include.length} entries`);
  }

  // force-deploy: override auto_deploy on every surviving entry.
  if (forceDeploy) {
    for (const entry of matrix.include) {
      entry.auto_deploy = 'true';
    }
    core.info(`force-deploy: overrode auto_deploy='true' on ${matrix.include.length} Koala entries`);
  }

  return matrix;
}

/**
 * Process Skyhook configuration
 * @param {string} skyhookPath - Path to skyhook.yaml
 * @param {string} tag - Image tag
 * @param {Set<string>|null} envFilterSet - Effective env filter (null = all envs)
 * @param {string} repoPath - Path to the git repository
 * @param {Map<string, number>} serviceCounters - Per-service counters from Koala
 * @param {string} branch - Branch for deployment repo cloning
 * @param {string[]} githubTokens - GitHub tokens to try for deployment repo access (in priority order)
 * @param {Map<string, string>} cloneCache - Shared clone cache (populated during resolution, reused for image extraction)
 * @param {string} onDiscoveryFailure - Strategy for clone failures: 'fail' or 'skip'
 * @param {boolean} forceDeploy - When true, override auto_deploy to 'true' on every surviving entry
 */
async function processSkyhookConfig(skyhookPath, tag, envFilterSet, repoPath, serviceCounters, branch, githubTokens, cloneCache, onDiscoveryFailure, forceDeploy) {
  const config = parseSkyhookConfig(skyhookPath);

  core.info(`Found ${config.services.length} services and ${config.environments.length} environments in Skyhook config`);

  // Get service repo from environment variable
  const serviceRepo = process.env.GITHUB_REPOSITORY || '';

  // Query existing git tags to find highest counters per service,
  // so we don't generate duplicate tags across runs on the same day.
  const existingCounters = await getExistingTagCounters(config.services, tag, repoPath);

  // Merge: take the highest counter from either source
  const mergedCounters = new Map(serviceCounters);
  for (const [name, counter] of existingCounters) {
    const current = mergedCounters.get(name) || 0;
    if (counter > current) {
      mergedCounters.set(name, counter);
    }
  }

  // Resolve per-service environments from deployment repos
  const perServiceEnvs = new Map();
  const envConfigCache = new Map();
  const failedServices = new Set();

  for (const service of config.services) {
    if (service.deploymentRepo) {
      core.info(`🔍 Resolving environments for ${service.name} from deployment repo ${service.deploymentRepo}`);
      try {
        const envs = await resolveServiceEnvironments(
          service, branch, githubTokens, cloneCache, envConfigCache
        );
        perServiceEnvs.set(service.name, envs);
      } catch (err) {
        if (onDiscoveryFailure === 'fail') {
          throw err;
        }
        core.warning(`Failed to discover metadata for service ${service.name}: ${err.message}. Excluding from output.`);
        failedServices.add(service.name);
      }
    }
  }

  if (failedServices.size > 0) {
    core.warning(`Excluded ${failedServices.size} service(s) due to discovery failures: ${[...failedServices].join(', ')}`);
  }

  // Filter out services that failed discovery
  const eligibleServices = config.services.filter(s => !failedServices.has(s.name));

  const matrix = buildMatrixFromSkyhook(eligibleServices, config.environments, {
    tag,
    serviceRepo,
    envFilterSet,
    serviceCounters: mergedCounters,
    perServiceEnvs,
    forceDeploy
  });

  return matrix;
}

/**
 * Query existing git tags to find the highest counter per service for the given tag base.
 * Looks for tags matching {service_name}_{tag}_NN and returns the highest NN per service.
 * @param {Array} services - Array of service configurations
 * @param {string} tag - Base image tag (e.g., "main_2026-03-12")
 * @param {string} repoPath - Path to the git repository
 * @returns {Promise<Map<string, number>>} - Map of service_name -> highest counter
 */
async function getExistingTagCounters(services, tag, repoPath) {
  const counters = new Map();

  let stdout = '';
  let stderr = '';
  try {
    await exec.exec('git', ['ls-remote', '--tags', 'origin'], {
      cwd: repoPath,
      listeners: {
        stdout: (data) => { stdout += data.toString(); },
        stderr: (data) => { stderr += data.toString(); }
      },
      silent: true
    });
  } catch (err) {
    core.warning(`Cannot access remote tags for counter detection: ${err.message}${stderr ? '\n' + stderr.trim() : ''}`);
    return counters;
  }

  for (const service of services) {
    // Match tags like: refs/tags/{service_name}_{tag}_NN
    const pattern = new RegExp(`refs/tags/${escapeRegExp(service.name)}_${escapeRegExp(tag)}_(\\d{2})$`, 'm');
    let highest = -1;

    for (const line of stdout.split('\n')) {
      if (line.includes('^{}')) continue; // skip annotated tag markers
      const match = line.match(pattern);
      if (match) {
        const counter = parseInt(match[1], 10);
        if (counter > highest) {
          highest = counter;
        }
      }
    }

    if (highest >= 0) {
      counters.set(service.name, highest);
      core.info(`🔢 Existing tag counter for ${service.name}: ${highest}`);
    }
  }

  core.info(`Existing tag counters from git: ${JSON.stringify(Object.fromEntries(counters))}`);
  return counters;
}

/**
 * Collect all distinct, non-empty tokens in priority order.
 * @param {...string} sources - Token values (may be empty/undefined)
 * @returns {string[]} - Deduplicated non-empty tokens
 */
function resolveTokens(...sources) {
  const seen = new Set();
  const tokens = [];
  for (const token of sources) {
    if (token && !seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }
  return tokens;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

run();
