/**
 * Represents the Skyhook configuration structure from .skyhook/skyhook.yaml
 */
class SkyhookConfig {
  static CONFIG_PATH = '.skyhook/skyhook.yaml';

  /**
   * @param {Object} params
   * @param {SkyhookService[]} params.services - Array of service configurations
   * @param {SkyhookEnvironment[]} params.environments - Array of environment configurations
   */
  constructor({ services = [], environments = [] }) {
    this.services = services.map(s => new SkyhookService(s));
    this.environments = environments.map(e => new SkyhookEnvironment(e));
  }

  /**
   * Creates a SkyhookConfig from a parsed YAML object
   * @param {Object} obj - Parsed YAML object
   * @returns {SkyhookConfig}
   */
  static fromObject(obj) {
    return new SkyhookConfig({
      services: obj.services || [],
      environments: obj.environments || []
    });
  }
}

/**
 * Represents a service in the Skyhook configuration
 */
class SkyhookService {
  /**
   * @param {Object} params
   * @param {string} params.name - Service name
   * @param {string} params.path - Service directory path
   * @param {string} [params.deploymentRepo] - Deployment repository
   * @param {string} [params.deploymentRepoPath] - Path within deployment repo
   * @param {Object} [params.buildTool] - Build tool configuration
   */
  constructor({ name, path, deploymentRepo, deploymentRepoPath, buildTool }) {
    this.name = name;
    this.path = path;
    this.deploymentRepo = deploymentRepo;
    this.deploymentRepoPath = deploymentRepoPath;
    this.buildTool = buildTool;
  }
}

/**
 * Represents an environment in the Skyhook configuration
 */
class SkyhookEnvironment {
  /**
   * @param {Object} params
   * @param {string} params.name - Environment name (e.g., dev, staging, prod)
   * @param {string} [params.clusterName] - Kubernetes cluster name
   * @param {string} [params.cloudProvider] - Cloud provider (e.g., gcp, aws)
   * @param {string} [params.account] - Cloud account identifier
   * @param {string} [params.location] - Cluster location/zone
   * @param {string} [params.namespace] - Kubernetes namespace
   */
  constructor({ name, clusterName, cloudProvider, account, location, namespace, autoDeploy }) {
    this.name = name;
    this.clusterName = clusterName;
    this.cloudProvider = cloudProvider;
    this.account = account;
    this.location = location;
    this.namespace = namespace;
    this.autoDeploy = autoDeploy === true || autoDeploy === 'true';
  }
}

module.exports = { SkyhookConfig, SkyhookService, SkyhookEnvironment };
