const { SkyhookConfig, SkyhookService, SkyhookEnvironment } = require('../src/config/SkyhookConfig');
const { parseSkyhookConfig, validateSkyhookConfig } = require('../src/config/skyhook-parser');
const { detectConfigFormats } = require('../src/config/config-detector');
const { buildMatrixFromSkyhook } = require('../src/matrix/matrix-builder');
const { DeploymentMatrix, DeploymentEntry } = require('../src/DeploymentMatrix');
const { cloneDeploymentRepo, listServiceOverlays, readEnvironmentConfig, resolveServiceEnvironments } = require('../src/deployment/repo-fetcher');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

// Test fixtures
const validSkyhookYaml = `
services:
  - name: vcs
    path: apps/vcs
    deploymentRepo: KoalaOps/deployment
    deploymentRepoPath: vcs
  - name: project-infra
    path: apps/project-infra
    deploymentRepo: KoalaOps/deployment
    deploymentRepoPath: project-infra

environments:
  - name: dev
    clusterName: nonprod-cluster-us-east1
    cloudProvider: gcp
    account: koalabackend
    location: us-east1-b
    namespace: dev
  - name: staging
    clusterName: nonprod-cluster-us-east1
    cloudProvider: gcp
    account: koalabackend
    location: us-east1-b
    namespace: staging
  - name: prod
    clusterName: prod-cluster-us-east1
    cloudProvider: gcp
    account: koalabackend
    location: us-east1-b
    namespace: prod
`;

describe('SkyhookConfig', () => {
  test('CONFIG_PATH is correct', () => {
    expect(SkyhookConfig.CONFIG_PATH).toBe('.skyhook/skyhook.yaml');
  });

  test('fromObject creates SkyhookConfig with services and environments', () => {
    const config = SkyhookConfig.fromObject({
      services: [{ name: 'test', path: 'apps/test' }],
      environments: [{ name: 'dev', clusterName: 'cluster1' }]
    });

    expect(config.services).toHaveLength(1);
    expect(config.environments).toHaveLength(1);
    expect(config.services[0]).toBeInstanceOf(SkyhookService);
    expect(config.environments[0]).toBeInstanceOf(SkyhookEnvironment);
  });

  describe('SkyhookEnvironment.autoDeploy', () => {
    test('defaults to false when not specified', () => {
      const env = new SkyhookEnvironment({ name: 'dev' });
      expect(env.autoDeploy).toBe(false);
    });

    test('accepts boolean true', () => {
      const env = new SkyhookEnvironment({ name: 'dev', autoDeploy: true });
      expect(env.autoDeploy).toBe(true);
    });

    test('accepts string "true"', () => {
      const env = new SkyhookEnvironment({ name: 'dev', autoDeploy: 'true' });
      expect(env.autoDeploy).toBe(true);
    });

    test('false when explicitly false', () => {
      const env = new SkyhookEnvironment({ name: 'dev', autoDeploy: false });
      expect(env.autoDeploy).toBe(false);
    });
  });
});

describe('validateSkyhookConfig', () => {
  test('valid config passes validation', () => {
    const config = {
      services: [{ name: 'test', path: 'apps/test' }],
      environments: [{ name: 'dev' }]
    };
    const result = validateSkyhookConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing services array fails validation', () => {
    const result = validateSkyhookConfig({ environments: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('services must be an array');
  });

  test('service without name fails validation', () => {
    const config = {
      services: [{ path: 'apps/test' }],
      environments: []
    };
    const result = validateSkyhookConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name is required'))).toBe(true);
  });

  test('service without path fails validation', () => {
    const config = {
      services: [{ name: 'test' }],
      environments: []
    };
    const result = validateSkyhookConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('path is required'))).toBe(true);
  });

  test('config without environments is valid (services use deploymentRepo)', () => {
    const config = {
      services: [{ name: 'test', path: 'apps/test', deploymentRepo: 'org/deploy' }]
    };
    const result = validateSkyhookConfig(config);
    expect(result.valid).toBe(true);
  });
});

describe('buildMatrixFromSkyhook', () => {
  const services = [
    { name: 'vcs', path: 'apps/vcs', deploymentRepo: 'KoalaOps/deployment', deploymentRepoPath: 'vcs' },
    { name: 'project-infra', path: 'apps/project-infra', deploymentRepo: 'KoalaOps/deployment', deploymentRepoPath: 'project-infra' }
  ];

  const environments = [
    { name: 'dev', clusterName: 'nonprod-cluster', cloudProvider: 'gcp', location: 'us-east1-b', namespace: 'dev', account: 'koalabackend' },
    { name: 'prod', clusterName: 'prod-cluster', cloudProvider: 'gcp', location: 'us-east1-b', namespace: 'prod', account: 'koalabackend' }
  ];

  test('creates matrix with service x environment combinations', () => {
    const matrix = buildMatrixFromSkyhook(services, environments, {
      tag: 'v1.0.0',
      serviceRepo: 'KoalaOps/orbit'
    });

    expect(matrix.count).toBe(4); // 2 services x 2 environments
  });

  test('per-service counter starts at 01 for each service', () => {
    const matrix = buildMatrixFromSkyhook(services, environments, {
      tag: 'v1.0.0',
      serviceRepo: 'KoalaOps/orbit'
    });

    const vcsEntries = matrix.include.filter(e => e.service_name === 'vcs');
    const infraEntries = matrix.include.filter(e => e.service_name === 'project-infra');

    expect(vcsEntries[0].service_tag).toBe('vcs_v1.0.0_01');
    expect(vcsEntries[1].service_tag).toBe('vcs_v1.0.0_02');
    expect(infraEntries[0].service_tag).toBe('project-infra_v1.0.0_01');
    expect(infraEntries[1].service_tag).toBe('project-infra_v1.0.0_02');
  });

  test('continues counter from serviceCounters map', () => {
    const serviceCounters = new Map();
    serviceCounters.set('vcs', 5); // vcs already has entries up to _05

    const matrix = buildMatrixFromSkyhook(services, environments, {
      tag: 'v1.0.0',
      serviceRepo: 'KoalaOps/orbit',
      serviceCounters
    });

    const vcsEntries = matrix.include.filter(e => e.service_name === 'vcs');
    expect(vcsEntries[0].service_tag).toBe('vcs_v1.0.0_06');
    expect(vcsEntries[1].service_tag).toBe('vcs_v1.0.0_07');

    // project-infra should start at _01 since it wasn't in the map
    const infraEntries = matrix.include.filter(e => e.service_name === 'project-infra');
    expect(infraEntries[0].service_tag).toBe('project-infra_v1.0.0_01');
  });

  test('applies environment filter', () => {
    const matrix = buildMatrixFromSkyhook(services, environments, {
      tag: 'v1.0.0',
      serviceRepo: 'KoalaOps/orbit',
      envFilter: 'dev'
    });

    expect(matrix.count).toBe(2); // 2 services x 1 environment (dev only)
    expect(matrix.include.every(e => e.overlay === 'dev')).toBe(true);
  });

  test('maps all fields correctly', () => {
    const matrix = buildMatrixFromSkyhook(services, environments, {
      tag: 'v1.0.0',
      serviceRepo: 'KoalaOps/orbit'
    });

    const entry = matrix.include[0];
    expect(entry.service_name).toBe('vcs');
    expect(entry.service_dir).toBe('apps/vcs');
    expect(entry.service_repo).toBe('KoalaOps/orbit');
    expect(entry.deployment_repo).toBe('KoalaOps/deployment');
    expect(entry.deployment_folder_path).toBe('vcs');
    expect(entry.cluster).toBe('nonprod-cluster');
    expect(entry.cluster_location).toBe('us-east1-b');
    expect(entry.cloud_provider).toBe('gcp');
    expect(entry.namespace).toBe('dev');
    expect(entry.account).toBe('koalabackend');
    expect(entry.auto_deploy).toBe('false');
  });

  test('auto_deploy reflects environment autoDeploy setting', () => {
    const envsWithAutoDeploy = [
      { name: 'dev', clusterName: 'c1', autoDeploy: true },
      { name: 'prod', clusterName: 'c2', autoDeploy: false }
    ];

    const matrix = buildMatrixFromSkyhook(
      [{ name: 'svc', path: 'apps/svc' }],
      envsWithAutoDeploy,
      { tag: 'v1.0.0', serviceRepo: 'org/repo' }
    );

    const devEntry = matrix.include.find(e => e.overlay === 'dev');
    const prodEntry = matrix.include.find(e => e.overlay === 'prod');
    expect(devEntry.auto_deploy).toBe('true');
    expect(prodEntry.auto_deploy).toBe('false');
  });
});

describe('buildMatrixFromSkyhook with perServiceEnvs', () => {
  const services = [
    { name: 'svc-remote', path: 'apps/svc-remote', deploymentRepo: 'org/deploy', deploymentRepoPath: 'svc-remote' },
    { name: 'svc-local', path: 'apps/svc-local' }
  ];

  const globalEnvs = [
    { name: 'dev', clusterName: 'global-cluster', cloudProvider: 'gcp', location: 'us-east1', namespace: 'dev', account: 'global-acct' }
  ];

  const remoteEnvs = [
    { name: 'staging', clusterName: 'remote-cluster', cloudProvider: 'aws', location: 'us-west-2', namespace: 'staging', account: 'remote-acct' },
    { name: 'prod', clusterName: 'remote-prod', cloudProvider: 'aws', location: 'us-west-2', namespace: 'prod', account: 'remote-acct' }
  ];

  test('uses per-service envs for services with deploymentRepo, global for others', () => {
    const perServiceEnvs = new Map();
    perServiceEnvs.set('svc-remote', remoteEnvs);

    const matrix = buildMatrixFromSkyhook(services, globalEnvs, {
      tag: 'v1.0.0',
      serviceRepo: 'org/source',
      perServiceEnvs
    });

    // svc-remote gets 2 envs (staging, prod) from deployment repo
    // svc-local gets 1 env (dev) from global config
    expect(matrix.count).toBe(3);

    const remoteEntries = matrix.include.filter(e => e.service_name === 'svc-remote');
    expect(remoteEntries).toHaveLength(2);
    expect(remoteEntries.map(e => e.overlay).sort()).toEqual(['prod', 'staging']);
    expect(remoteEntries[0].cluster).toBe('remote-cluster');

    const localEntries = matrix.include.filter(e => e.service_name === 'svc-local');
    expect(localEntries).toHaveLength(1);
    expect(localEntries[0].overlay).toBe('dev');
    expect(localEntries[0].cluster).toBe('global-cluster');
  });

  test('applies envFilter to per-service envs', () => {
    const perServiceEnvs = new Map();
    perServiceEnvs.set('svc-remote', remoteEnvs);

    const matrix = buildMatrixFromSkyhook(services, globalEnvs, {
      tag: 'v1.0.0',
      serviceRepo: 'org/source',
      perServiceEnvs,
      envFilter: 'staging'
    });

    // Only svc-remote has staging, svc-local has no staging env
    expect(matrix.count).toBe(1);
    expect(matrix.include[0].service_name).toBe('svc-remote');
    expect(matrix.include[0].overlay).toBe('staging');
  });

  test('services with empty remote envs produce no entries', () => {
    const perServiceEnvs = new Map();
    perServiceEnvs.set('svc-remote', []);

    const matrix = buildMatrixFromSkyhook(services, globalEnvs, {
      tag: 'v1.0.0',
      serviceRepo: 'org/source',
      perServiceEnvs
    });

    // Only svc-local gets entries from global envs
    expect(matrix.count).toBe(1);
    expect(matrix.include[0].service_name).toBe('svc-local');
  });
});

describe('cloneDeploymentRepo', () => {
  let originalExec;

  beforeEach(() => {
    originalExec = exec.exec;
  });

  afterEach(() => {
    exec.exec = originalExec;
  });

  test('clones repo and caches result', async () => {
    let capturedArgs;
    exec.exec = jest.fn(async (cmd, args, opts) => {
      capturedArgs = args;
      const targetDir = args[args.length - 1];
      fs.mkdirSync(targetDir, { recursive: true });
      return 0;
    });

    const cache = new Map();
    const result = await cloneDeploymentRepo('org/deploy-repo', 'main', ['fake-token'], cache);

    // Verify git clone was called with correct args
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(capturedArgs).toContain('clone');
    expect(capturedArgs).toContain('--depth');
    expect(capturedArgs).toContain('1');
    expect(capturedArgs).toContain('--single-branch');
    expect(capturedArgs).toContain('--branch');
    expect(capturedArgs).toContain('main');
    expect(capturedArgs).toContain('https://x-access-token:fake-token@github.com/org/deploy-repo.git');

    // Verify cache was populated
    expect(cache.has('org/deploy-repo:main')).toBe(true);
    expect(cache.get('org/deploy-repo:main')).toBe(result);

    // Second call should use cache, not clone again
    const result2 = await cloneDeploymentRepo('org/deploy-repo', 'main', ['fake-token'], cache);
    expect(result2).toBe(result);
    expect(exec.exec).toHaveBeenCalledTimes(1); // still 1, no second clone

    // Clean up
    fs.rmSync(result, { recursive: true, force: true });
  });

  test('different branch gets separate cache entry', async () => {
    exec.exec = jest.fn(async (cmd, args) => {
      const targetDir = args[args.length - 1];
      fs.mkdirSync(targetDir, { recursive: true });
      return 0;
    });

    const cache = new Map();
    const r1 = await cloneDeploymentRepo('org/repo', 'main', ['token'], cache);
    const r2 = await cloneDeploymentRepo('org/repo', 'develop', ['token'], cache);

    expect(r1).not.toBe(r2);
    expect(cache.size).toBe(2);
    expect(exec.exec).toHaveBeenCalledTimes(2);

    fs.rmSync(r1, { recursive: true, force: true });
    fs.rmSync(r2, { recursive: true, force: true });
  });

  test('falls back to second token when first fails', async () => {
    let lastUrl;
    exec.exec = jest.fn(async (cmd, args) => {
      const url = args.find(a => a.startsWith('https://'));
      lastUrl = url;
      if (url.includes('bad-token')) {
        throw new Error('Authentication failed');
      }
      const targetDir = args[args.length - 1];
      fs.mkdirSync(targetDir, { recursive: true });
      return 0;
    });

    const cache = new Map();
    const result = await cloneDeploymentRepo('org/repo', 'main', ['bad-token', 'good-token'], cache);

    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(lastUrl).toContain('good-token');
    expect(cache.has('org/repo:main')).toBe(true);

    fs.rmSync(result, { recursive: true, force: true });
  });

  test('throws when all tokens fail', async () => {
    exec.exec = jest.fn(async () => {
      throw new Error('Authentication failed');
    });

    const cache = new Map();
    await expect(
      cloneDeploymentRepo('org/repo', 'main', ['token-a', 'token-b'], cache)
    ).rejects.toThrow('Failed to clone org/repo@main');

    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(0);
  });
});

describe('resolveServiceEnvironments', () => {
  let tmpDir;
  let originalExec;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-envs-test-'));
    originalExec = exec.exec;
  });

  afterEach(() => {
    exec.exec = originalExec;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupDeploymentRepoFixture(repoDir, servicePath, overlays, envConfigs) {
    // Create overlay dirs
    for (const overlay of overlays) {
      fs.mkdirSync(path.join(repoDir, servicePath, 'overlays', overlay), { recursive: true });
    }
    // Create env config files
    if (envConfigs) {
      const envDir = path.join(repoDir, 'skyhook', 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      for (const [name, config] of Object.entries(envConfigs)) {
        fs.writeFileSync(path.join(envDir, `${name}.yaml`), yaml.dump(config));
      }
    }
  }

  test('resolves environments from deployment repo overlays and env configs', async () => {
    // Pre-populate the fixture directory to simulate a cloned repo
    setupDeploymentRepoFixture(tmpDir, 'my-svc', ['dev', 'prod'], {
      dev: { clusterName: 'dev-cluster', cloudProvider: 'gcp', account: 'dev-acct', location: 'us-east1', namespace: 'dev' },
      prod: { clusterName: 'prod-cluster', cloudProvider: 'gcp', account: 'prod-acct', location: 'us-east1', namespace: 'prod' }
    });

    // Mock exec to return our fixture dir instead of actually cloning
    const cloneCache = new Map();
    cloneCache.set('org/deploy:main', tmpDir); // pre-seed cache so no clone happens

    const envConfigCache = new Map();
    const service = { name: 'my-svc', deploymentRepo: 'org/deploy', deploymentRepoPath: 'my-svc' };

    const envs = await resolveServiceEnvironments(service, 'main', ['token'], cloneCache, envConfigCache);

    expect(envs).toHaveLength(2);
    const names = envs.map(e => e.name).sort();
    expect(names).toEqual(['dev', 'prod']);

    const devEnv = envs.find(e => e.name === 'dev');
    expect(devEnv.clusterName).toBe('dev-cluster');
    expect(devEnv.cloudProvider).toBe('gcp');
    expect(devEnv.account).toBe('dev-acct');

    // Verify env configs were cached
    expect(envConfigCache.has('org/deploy:main:dev')).toBe(true);
    expect(envConfigCache.has('org/deploy:main:prod')).toBe(true);
  });

  test('falls back to service.name when deploymentRepoPath is not set', async () => {
    setupDeploymentRepoFixture(tmpDir, 'api-service', ['staging'], {
      staging: { clusterName: 'stg-cluster', cloudProvider: 'aws', location: 'us-west-2', namespace: 'staging' }
    });

    const cloneCache = new Map();
    cloneCache.set('org/deploy:main', tmpDir);

    const service = { name: 'api-service', deploymentRepo: 'org/deploy' }; // no deploymentRepoPath

    const envs = await resolveServiceEnvironments(service, 'main', ['token'], cloneCache, new Map());

    expect(envs).toHaveLength(1);
    expect(envs[0].name).toBe('staging');
    expect(envs[0].clusterName).toBe('stg-cluster');
  });

  test('returns empty array when no overlays found', async () => {
    // tmpDir exists but has no overlays directory
    const cloneCache = new Map();
    cloneCache.set('org/deploy:main', tmpDir);

    const service = { name: 'missing-svc', deploymentRepo: 'org/deploy', deploymentRepoPath: 'missing-svc' };

    const envs = await resolveServiceEnvironments(service, 'main', ['token'], cloneCache, new Map());

    expect(envs).toEqual([]);
  });

  test('two services sharing the same deployment repo reuse one clone', async () => {
    // Set up both services in the same fixture dir
    setupDeploymentRepoFixture(tmpDir, 'svc-a', ['dev'], {
      dev: { clusterName: 'cluster-a', cloudProvider: 'gcp', namespace: 'dev' }
    });
    setupDeploymentRepoFixture(tmpDir, 'svc-b', ['dev', 'prod'], {});
    // dev env already created above, add prod
    const envDir = path.join(tmpDir, 'skyhook', 'environments');
    fs.writeFileSync(path.join(envDir, 'prod.yaml'), yaml.dump({ clusterName: 'cluster-b', namespace: 'prod' }));

    const cloneCache = new Map();
    cloneCache.set('org/deploy:main', tmpDir);
    const envConfigCache = new Map();

    const svcA = { name: 'svc-a', deploymentRepo: 'org/deploy', deploymentRepoPath: 'svc-a' };
    const svcB = { name: 'svc-b', deploymentRepo: 'org/deploy', deploymentRepoPath: 'svc-b' };

    const envsA = await resolveServiceEnvironments(svcA, 'main', ['token'], cloneCache, envConfigCache);
    const envsB = await resolveServiceEnvironments(svcB, 'main', ['token'], cloneCache, envConfigCache);

    expect(envsA).toHaveLength(1);
    expect(envsB).toHaveLength(2);

    // Both read the shared dev env config - should be same cached object
    const devFromA = envsA.find(e => e.name === 'dev');
    const devFromB = envsB.find(e => e.name === 'dev');
    expect(devFromA).toBe(devFromB); // same reference from cache
  });
});

describe('repo-fetcher', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-fetcher-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('listServiceOverlays', () => {
    test('lists overlay directories', () => {
      const overlaysDir = path.join(tmpDir, 'my-service', 'overlays');
      fs.mkdirSync(path.join(overlaysDir, 'dev'), { recursive: true });
      fs.mkdirSync(path.join(overlaysDir, 'staging'), { recursive: true });
      fs.mkdirSync(path.join(overlaysDir, 'prod'), { recursive: true });
      // Add a file that should be ignored
      fs.writeFileSync(path.join(overlaysDir, 'kustomization.yaml'), 'resources: []');

      const overlays = listServiceOverlays(tmpDir, 'my-service');
      expect(overlays.sort()).toEqual(['dev', 'prod', 'staging']);
    });

    test('returns empty array when overlays dir does not exist', () => {
      const overlays = listServiceOverlays(tmpDir, 'nonexistent');
      expect(overlays).toEqual([]);
    });
  });

  describe('readEnvironmentConfig', () => {
    test('reads and parses environment yaml', () => {
      const envDir = path.join(tmpDir, 'skyhook', 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(path.join(envDir, 'dev.yaml'), [
        'clusterName: my-cluster',
        'cloudProvider: gcp',
        'account: my-project',
        'location: us-central1',
        'namespace: dev-ns'
      ].join('\n'));

      const cache = new Map();
      const env = readEnvironmentConfig(tmpDir, 'org/repo', 'main', 'dev', cache);

      expect(env.name).toBe('dev');
      expect(env.clusterName).toBe('my-cluster');
      expect(env.cloudProvider).toBe('gcp');
      expect(env.account).toBe('my-project');
      expect(env.location).toBe('us-central1');
      expect(env.namespace).toBe('dev-ns');
    });

    test('caches parsed environment configs', () => {
      const envDir = path.join(tmpDir, 'skyhook', 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(path.join(envDir, 'dev.yaml'), 'clusterName: cached-cluster');

      const cache = new Map();
      const env1 = readEnvironmentConfig(tmpDir, 'org/repo', 'main', 'dev', cache);
      const env2 = readEnvironmentConfig(tmpDir, 'org/repo', 'main', 'dev', cache);

      expect(env1).toBe(env2); // Same object reference (cached)
      expect(cache.size).toBe(1);
    });

    test('different repos with same env name get separate cache entries', () => {
      const envDir = path.join(tmpDir, 'skyhook', 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(path.join(envDir, 'dev.yaml'), 'clusterName: cluster-a');

      const cache = new Map();
      readEnvironmentConfig(tmpDir, 'org/repo-a', 'main', 'dev', cache);
      readEnvironmentConfig(tmpDir, 'org/repo-b', 'main', 'dev', cache);

      expect(cache.size).toBe(2);
      expect(cache.has('org/repo-a:main:dev')).toBe(true);
      expect(cache.has('org/repo-b:main:dev')).toBe(true);
    });

    test('returns name-only env when yaml file is missing', () => {
      const cache = new Map();
      const env = readEnvironmentConfig(tmpDir, 'org/repo', 'main', 'missing', cache);

      expect(env.name).toBe('missing');
      expect(env.clusterName).toBeUndefined();
      expect(env.autoDeploy).toBe(false);
    });

    test('reads autoDeploy true from environment yaml', () => {
      const envDir = path.join(tmpDir, 'skyhook', 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(path.join(envDir, 'prod.yaml'), [
        'clusterName: prod-cluster',
        'autoDeploy: true'
      ].join('\n'));

      const cache = new Map();
      const env = readEnvironmentConfig(tmpDir, 'org/repo', 'main', 'prod', cache);
      expect(env.autoDeploy).toBe(true);
    });

    test('autoDeploy defaults to false when not in remote yaml', () => {
      const envDir = path.join(tmpDir, 'skyhook', 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(path.join(envDir, 'staging.yaml'), 'clusterName: stg-cluster');

      const cache = new Map();
      const env = readEnvironmentConfig(tmpDir, 'org/repo', 'main', 'staging', cache);
      expect(env.autoDeploy).toBe(false);
    });
  });
});

describe('DeploymentMatrix.merge', () => {
  test('merges two matrices and deduplicates by service_name + overlay', () => {
    const matrix1 = new DeploymentMatrix([
      new DeploymentEntry({ service_name: 'vcs', overlay: 'dev', service_tag: 'vcs_v1_01' }),
      new DeploymentEntry({ service_name: 'vcs', overlay: 'prod', service_tag: 'vcs_v1_02' })
    ]);

    const matrix2 = new DeploymentMatrix([
      new DeploymentEntry({ service_name: 'vcs', overlay: 'dev', service_tag: 'vcs_v2_01' }), // duplicate
      new DeploymentEntry({ service_name: 'infra', overlay: 'dev', service_tag: 'infra_v1_01' })
    ]);

    matrix1.merge(matrix2);

    expect(matrix1.count).toBe(3); // vcs:dev (from matrix2), vcs:prod, infra:dev

    // The duplicate should be from matrix2 (overwrites)
    const vcsDev = matrix1.include.find(e => e.service_name === 'vcs' && e.overlay === 'dev');
    expect(vcsDev.service_tag).toBe('vcs_v2_01');
  });
});
