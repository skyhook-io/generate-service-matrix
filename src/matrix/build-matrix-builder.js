const { readKustomizeImages } = require('../deployment/repo-fetcher');

/**
 * Build the build_matrix with images from kustomization.yaml files.
 * Extracts one entry per service with Docker images.
 *
 * @param {Array} services - Services from skyhook config
 * @param {Set} matrixServiceNames - Set of service names in the deployment matrix (filters out failed discoveries)
 * @param {Map} skyhookCloneCache - Cache of cloned deployment repos (repo:branch -> path)
 * @param {Object} options - Configuration options
 * @param {string} options.branch - Git branch
 * @param {string} options.repoPath - Path to the main service repo
 * @param {boolean} options.kustomizeImageFallback - Whether to use fallback image extraction
 * @param {Object} options.skyhookMatrix - Matrix from Skyhook config (contains serviceTags)
 * @returns {Array} Array of build matrix entries
 */
function buildBuildMatrix(services, matrixServiceNames, skyhookCloneCache, options) {
  const {
    branch = 'HEAD',
    repoPath,
    kustomizeImageFallback = false,
    skyhookMatrix
  } = options;

  const buildMatrixInclude = [];

  for (const service of services) {
    if (!matrixServiceNames.has(service.name)) continue;

    let images = '';
    let clonedPath;

    if (service.deploymentRepo) {
      // Use deployment repo if configured
      const cacheKey = `${service.deploymentRepo}:${branch || 'HEAD'}`;
      clonedPath = skyhookCloneCache.get(cacheKey);
    } else {
      // Fall back to main service repo if no deployment repo
      clonedPath = repoPath;
    }

    if (clonedPath) {
      const imageList = readKustomizeImages(
        clonedPath,
        service.deploymentRepoPath || service.path,
        service.name,
        { fallback: kustomizeImageFallback }
      );
      images = imageList.join('\n');
    }

    const serviceTag = skyhookMatrix && skyhookMatrix.serviceTags
      ? skyhookMatrix.serviceTags.get(service.name)
      : undefined;

    const entry = {
      service_name: service.name,
      service_dir: service.path,
      images
    };

    if (serviceTag) {
      entry.service_tag = serviceTag;
    }

    buildMatrixInclude.push(entry);
  }

  return buildMatrixInclude;
}

module.exports = { buildBuildMatrix };
