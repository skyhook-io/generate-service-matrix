const core = require('@actions/core');
const { DeploymentMatrix, DeploymentEntry } = require('../DeploymentMatrix');

/**
 * Build a DeploymentMatrix from Skyhook services and environments
 * @param {Array} services - Array of service configurations from skyhook.yaml
 * @param {Array} environments - Array of environment configurations from skyhook.yaml (used for services without deploymentRepo)
 * @param {Object} options - Build options
 * @param {string} options.tag - Image tag to inject
 * @param {string} options.serviceRepo - Source repository (e.g., "KoalaOps/orbit")
 * @param {string} [options.envFilter] - Environment filter (optional)
 * @param {Map<string, number>} [options.serviceCounters] - Per-service counters from Koala
 * @param {Map<string, Array>} [options.perServiceEnvs] - Per-service environments from deployment repos
 * @returns {DeploymentMatrix}
 */
function buildMatrixFromSkyhook(services, environments, options = {}) {
  const { tag, serviceRepo, envFilter, serviceCounters = new Map(), perServiceEnvs = new Map() } = options;
  const matrix = new DeploymentMatrix();

  // Clone the counters map so we can modify it
  const counters = new Map(serviceCounters);

  core.info('📦 Building matrix from Skyhook configuration:');
  core.info(`   - Tag: ${tag}`);
  core.info(`   - Service repo (from GITHUB_REPOSITORY): ${serviceRepo}`);
  core.info(`   - Existing service counters: ${JSON.stringify(Object.fromEntries(counters))}`);

  core.info(`   - Services count: ${services.length}`);

  // Build matrix entries for each service x environment combination
  for (const service of services) {
    // Use per-service environments if available (from deployment repo), otherwise fall back to global
    let serviceEnvs = perServiceEnvs.has(service.name) ? perServiceEnvs.get(service.name) : environments;

    // Apply environment filter if provided
    if (envFilter) {
      serviceEnvs = serviceEnvs.filter(env => env.name === envFilter);
    }

    core.info(`   - ${service.name}: ${serviceEnvs.length} environments${perServiceEnvs.has(service.name) ? ' (from deployment repo)' : ' (from local config)'}`);

    for (const env of serviceEnvs) {
      // Get next counter for this service (per-service counter)
      const currentCounter = counters.get(service.name) || 0;
      const nextCounter = currentCounter + 1;
      counters.set(service.name, nextCounter);

      core.info(`\n🔧 Creating entry for ${service.name} (counter: ${nextCounter}):`);
      const entry = createDeploymentEntry(service, env, tag, serviceRepo, nextCounter);
      matrix.addEntry(entry);
    }
  }

  return matrix;
}

/**
 * Create a DeploymentEntry from Skyhook service and environment configs
 * @param {Object} service - Service configuration from skyhook.yaml
 * @param {Object} env - Environment configuration from skyhook.yaml
 * @param {string} tag - Image tag
 * @param {string} serviceRepo - Source repository
 * @param {number} counter - Counter for unique service tag (per-service)
 * @returns {DeploymentEntry}
 */
function createDeploymentEntry(service, env, tag, serviceRepo, counter) {
  const counterStr = String(counter).padStart(2, '0');
  const serviceTag = `${service.name}_${tag}_${counterStr}`;

  // Log where each value comes from
  core.info(`   service_name: "${service.name}" (from skyhook.yaml services[].name)`);
  core.info(`   service_dir: "${service.path}" (from skyhook.yaml services[].path)`);
  core.info(`   service_repo: "${serviceRepo}" (from GITHUB_REPOSITORY env var)`);
  core.info(`   deployment_repo: "${service.deploymentRepo || ''}" (from skyhook.yaml services[].deploymentRepo)`);
  core.info(`   deployment_folder_path: "${service.deploymentRepoPath || ''}" (from skyhook.yaml services[].deploymentRepoPath)`);
  core.info(`   overlay: "${env.name}" (from skyhook.yaml environments[].name)`);
  core.info(`   cluster: "${env.clusterName || ''}" (from skyhook.yaml environments[].clusterName)`);
  core.info(`   cluster_location: "${env.location || ''}" (from skyhook.yaml environments[].location)`);
  core.info(`   cloud_provider: "${env.cloudProvider || ''}" (from skyhook.yaml environments[].cloudProvider)`);
  core.info(`   namespace: "${env.namespace || ''}" (from skyhook.yaml environments[].namespace)`);
  core.info(`   account: "${env.account || ''}" (from skyhook.yaml environments[].account)`);
  core.info(`   auto_deploy: "true" (default value)`);
  core.info(`   service_tag: "${serviceTag}" (computed: {service_name}_{tag}_{counter})`);

  return new DeploymentEntry({
    service_name: service.name,
    service_dir: service.path,
    service_repo: serviceRepo,
    deployment_repo: service.deploymentRepo,
    deployment_folder_path: service.deploymentRepoPath,
    cluster: env.clusterName || '',
    cluster_location: env.location || '',
    overlay: env.name,
    cloud_provider: env.cloudProvider || '',
    namespace: env.namespace,
    account: env.account,
    auto_deploy: 'true',
    service_tag: serviceTag
  });
}

/**
 * Merge two DeploymentMatrix instances, deduplicating by service_name + overlay
 * @param {DeploymentMatrix} matrix1 - First matrix (usually from Koala)
 * @param {DeploymentMatrix} matrix2 - Second matrix (usually from Skyhook)
 * @returns {DeploymentMatrix} - New merged matrix
 */
function mergeMatrices(matrix1, matrix2) {
  core.info(`\n🔀 Merging matrices:`);
  core.info(`   - Matrix 1 (Koala): ${matrix1.count} entries`);
  core.info(`   - Matrix 2 (Skyhook): ${matrix2.count} entries`);

  const merged = new DeploymentMatrix([...matrix1.include]);
  merged.merge(matrix2);

  core.info(`   - Merged result: ${merged.count} entries (deduplicated by service_name + overlay)`);

  return merged;
}

module.exports = {
  buildMatrixFromSkyhook,
  createDeploymentEntry,
  mergeMatrices
};
