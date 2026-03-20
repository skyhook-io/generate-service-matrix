/**
 * Represents a single deployment entry in the matrix.
 */
class DeploymentEntry {
  /**
   * @param {Object} params
   * @param {string} params.service_dir - Service directory path (e.g., "apps/cats-demo")
   * @param {string} params.service_name - Service name
   * @param {string} params.service_repo - Source repository (e.g., "KoalaOps/orbit")
   * @param {string} params.cluster - Target cluster name
   * @param {string} params.cluster_location - Cluster location/zone
   * @param {string} params.overlay - Environment overlay (e.g., "dev", "staging", "production")
   * @param {string} params.auto_deploy - Whether auto-deploy is enabled ("true"/"false")
   * @param {string} params.cloud_provider - Cloud provider (e.g., "gcp", "aws")
   * @param {string} params.deployment_repo - Deployment repository
   * @param {string} params.deployment_folder_path - Path within deployment repo
   * @param {string} params.service_tag - Service image tag
   * @param {string} [params.namespace] - Kubernetes namespace
   * @param {string} [params.account] - Cloud account identifier
   */
  constructor({
    service_dir,
    service_name,
    service_repo,
    cluster,
    cluster_location,
    overlay,
    auto_deploy,
    cloud_provider,
    deployment_repo,
    deployment_folder_path,
    service_tag,
    namespace,
    account
  }) {
    this.service_dir = service_dir;
    this.service_name = service_name;
    this.service_repo = service_repo;
    this.cluster = cluster;
    this.cluster_location = cluster_location;
    this.overlay = overlay;
    this.auto_deploy = auto_deploy;
    this.cloud_provider = cloud_provider;
    this.deployment_repo = deployment_repo;
    this.deployment_folder_path = deployment_folder_path;
    this.service_tag = service_tag;
    this.namespace = namespace;
    this.account = account;
  }

  /**
   * Creates a DeploymentEntry from a plain object.
   * @param {Object} obj
   * @returns {DeploymentEntry}
   */
  static fromObject(obj) {
    return new DeploymentEntry(obj);
  }

  /**
   * Converts the entry to a plain object.
   * @returns {Object}
   */
  toObject() {
    const obj = {
      service_dir: this.service_dir,
      service_name: this.service_name,
      service_repo: this.service_repo,
      cluster: this.cluster,
      cluster_location: this.cluster_location,
      overlay: this.overlay,
      auto_deploy: this.auto_deploy,
      cloud_provider: this.cloud_provider,
      deployment_repo: this.deployment_repo,
      deployment_folder_path: this.deployment_folder_path,
      service_tag: this.service_tag
    };
    if (this.namespace) obj.namespace = this.namespace;
    if (this.account) obj.account = this.account;
    return obj;
  }
}

/**
 * Represents the deployment matrix containing multiple deployment entries.
 */
class DeploymentMatrix {
  /**
   * @param {DeploymentEntry[]} entries - Array of deployment entries
   */
  constructor(entries = []) {
    this.include = entries;
  }

  /**
   * Creates a DeploymentMatrix from a plain object.
   * @param {Object} obj - Plain object with include array
   * @returns {DeploymentMatrix}
   */
  static fromObject(obj) {
    const entries = (obj.include || []).map(entry => DeploymentEntry.fromObject(entry));
    return new DeploymentMatrix(entries);
  }

  /**
   * Creates a DeploymentMatrix from a JSON string.
   * @param {string} jsonString
   * @returns {DeploymentMatrix}
   */
  static fromJSON(jsonString) {
    const obj = JSON.parse(jsonString);
    return DeploymentMatrix.fromObject(obj);
  }

  /**
   * Adds a deployment entry to the matrix.
   * @param {DeploymentEntry} entry
   */
  addEntry(entry) {
    this.include.push(entry);
  }

  /**
   * Gets all entries for a specific service.
   * @param {string} serviceName
   * @returns {DeploymentEntry[]}
   */
  getEntriesByService(serviceName) {
    return this.include.filter(entry => entry.service_name === serviceName);
  }

  /**
   * Gets all entries for a specific overlay/environment.
   * @param {string} overlay
   * @returns {DeploymentEntry[]}
   */
  getEntriesByOverlay(overlay) {
    return this.include.filter(entry => entry.overlay === overlay);
  }

  /**
   * Gets all entries for a specific cluster.
   * @param {string} cluster
   * @returns {DeploymentEntry[]}
   */
  getEntriesByCluster(cluster) {
    return this.include.filter(entry => entry.cluster === cluster);
  }

  /**
   * Gets the count of entries in the matrix.
   * @returns {number}
   */
  get count() {
    return this.include.length;
  }

  /**
   * Checks if the matrix is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.include.length === 0;
  }

  /**
   * Merges another matrix into this one, deduplicating by service_name + overlay.
   * Entries from the other matrix take precedence for duplicates.
   * @param {DeploymentMatrix} otherMatrix
   * @returns {DeploymentMatrix} - Returns this matrix for chaining
   */
  merge(otherMatrix) {
    const seen = new Map();

    // Add entries from this matrix first
    for (const entry of this.include) {
      const key = `${entry.service_name}:${entry.overlay}`;
      seen.set(key, entry);
    }

    // Add/overwrite with entries from other matrix
    for (const entry of otherMatrix.include) {
      const key = `${entry.service_name}:${entry.overlay}`;
      seen.set(key, entry);
    }

    this.include = Array.from(seen.values());
    return this;
  }

  /**
   * Converts the matrix to a plain object suitable for GitHub Actions.
   * @returns {Object}
   */
  toObject() {
    return {
      include: this.include.map(entry => entry.toObject())
    };
  }

  /**
   * Converts the matrix to a JSON string.
   * @returns {string}
   */
  toJSON() {
    return JSON.stringify(this.toObject());
  }
}

module.exports = { DeploymentMatrix, DeploymentEntry };
