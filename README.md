# Generate Service Matrix Action

[![Release](https://github.com/skyhook-io/generate-service-matrix/actions/workflows/release.yml/badge.svg)](https://github.com/skyhook-io/generate-service-matrix/actions/workflows/release.yml)

A GitHub Action that generates a deployment matrix for multi-service, multi-environment deployments. It reads your repository's configuration to produce a GitHub Actions `strategy.matrix` JSON object, enabling parallel deployments across services and environments.

## Configuration Formats

The action supports two configuration formats. Both can coexist in the same repository — their matrices are merged with deduplication by `service_name + overlay`.

### Skyhook (`.skyhook/skyhook.yaml`)

The Skyhook format defines services and environments in a single YAML file at `.skyhook/skyhook.yaml`.

**Environment discovery** works in two ways depending on whether a service has a `deploymentRepo`:

- **Without `deploymentRepo`**: environments are read from the `environments[]` array in `skyhook.yaml` (local path).
- **With `deploymentRepo`**: environments are discovered from the remote deployment repository — overlay directories are listed from `{deploymentRepoPath}/overlays/`, and environment details (cluster, cloud provider, account, location, namespace) are read from `skyhook/environments/{name}.yaml` files in that repo.

This means different services can have different sets of environments — one service might deploy to `dev` and `staging` (from its deployment repo), while another deploys to `dev`, `staging`, and `prod` (from the local config or a different deployment repo).

#### `skyhook.yaml`

```yaml
services:
  - name: api-gateway
    path: apps/api-gateway
    deploymentRepo: my-org/deployment-repo    # environments discovered from remote repo
    deploymentRepoPath: api-gateway            # path within deployment repo (defaults to service name)
  - name: worker
    path: apps/worker
    # no deploymentRepo — uses local environments[] below

environments:     # used by services without deploymentRepo
  - name: dev
    clusterName: nonprod-cluster
    cloudProvider: gcp
    account: my-project-nonprod
    location: us-east1-b
    namespace: dev
  - name: prod
    clusterName: prod-cluster
    cloudProvider: gcp
    account: my-project-prod
    location: us-east1-b
    namespace: prod
```

#### Remote deployment repo structure

For services with `deploymentRepo`, the action clones the repo (shallow, `--depth 1`) and reads:

```
deployment-repo/
├── api-gateway/
│   └── overlays/
│       ├── dev/          # each directory = one environment
│       ├── staging/
│       └── prod/
└── skyhook/
    └── environments/
        ├── dev.yaml      # environment details
        ├── staging.yaml
        └── prod.yaml
```

Each environment file (`skyhook/environments/{name}.yaml`):

```yaml
clusterName: my-cluster
cloudProvider: gcp
account: my-project-id
location: us-central1
namespace: default
autoDeploy: true
```

The environment `name` comes from the filename, not from inside the file. If an environment YAML file is missing, the overlay is still included with only its name populated.

Multiple services can reference the same deployment repo — it is cloned once and shared. Clone and environment config caches are keyed by `repo:branch` and `repo:branch:envName` respectively, so different deployment repos with same-named environments never collide.

### Koala (legacy)

The Koala format uses `.koala-monorepo.json` at the repository root to list services and `.koala.toml` files per service for environment configuration. Processing is handled by the external `workflow-utils` CLI (installed automatically via `npx`).

## Usage

### Basic — all environments

```yaml
- name: Create deployment matrix
  id: matrix
  uses: skyhook-io/generate-service-matrix@v1
  with:
    tag: v1.2.3
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Deploy services
  strategy:
    matrix: ${{ fromJson(steps.matrix.outputs.matrix) }}
    fail-fast: false
  runs-on: ubuntu-latest
  steps:
    - run: echo "Deploying ${{ matrix.service_name }} (${{ matrix.service_tag }}) to ${{ matrix.overlay }}"
```

### Filter by environment

```yaml
- name: Deploy to production only
  id: matrix
  uses: skyhook-io/generate-service-matrix@v1
  with:
    overlay: prod
    tag: ${{ github.ref_name }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Feature branch deployment

```yaml
- name: Deploy preview
  id: matrix
  uses: skyhook-io/generate-service-matrix@v1
  with:
    overlay: dev
    branch: ${{ github.head_ref }}
    tag: pr-${{ github.event.pull_request.number }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `tag` | The image tag to deploy | Yes | - |
| `github-token` | GitHub token for API access and deployment repo cloning | Yes | - |
| `overlay` | Environment filter (e.g., `dev`, `staging`, `prod`). If omitted, all environments are included. | No | (all) |
| `branch` | Branch for deployment context and deployment repo cloning. If omitted, uses the remote's default branch (HEAD). | No | (HEAD) |
| `repo-path` | Path to the repository root | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `matrix` | JSON string of the deployment matrix, ready for `strategy.matrix` via `fromJson()` |

## Matrix Output Format

```json
{
  "include": [
    {
      "service_name": "api-gateway",
      "service_dir": "apps/api-gateway",
      "service_repo": "my-org/my-app",
      "service_tag": "api-gateway_v1.2.3_01",
      "deployment_repo": "my-org/deployment-repo",
      "deployment_folder_path": "api-gateway",
      "overlay": "dev",
      "cluster": "nonprod-cluster",
      "cluster_location": "us-east1-b",
      "cloud_provider": "gcp",
      "namespace": "dev",
      "account": "my-project-nonprod",
      "auto_deploy": "false"
    }
  ]
}
```

| Field | Source |
|-------|--------|
| `service_name` | `skyhook.yaml` `services[].name` |
| `service_dir` | `skyhook.yaml` `services[].path` |
| `service_repo` | `GITHUB_REPOSITORY` env var |
| `service_tag` | Computed: `{service_name}_{tag}_{counter}` |
| `deployment_repo` | `skyhook.yaml` `services[].deploymentRepo` |
| `deployment_folder_path` | `skyhook.yaml` `services[].deploymentRepoPath` |
| `overlay` | Environment name |
| `cluster` | `environments[].clusterName` (local or remote) |
| `cluster_location` | `environments[].location` |
| `cloud_provider` | `environments[].cloudProvider` |
| `namespace` | `environments[].namespace` |
| `account` | `environments[].account` |
| `auto_deploy` | `environments[].autoDeploy` (default `false`) |

## Service Tag Counters

Each matrix entry gets a unique `service_tag` in the format `{service_name}_{tag}_{counter}` (e.g., `api-gateway_v1.2.3_01`). Counters are **per-service** and are seeded from two sources to prevent duplicate tags across multiple runs:

1. **Existing git tags** — the action queries `git ls-remote --tags origin` for tags matching `{service_name}_{tag}_NN` and starts after the highest existing counter.
2. **Koala matrix output** — if both Koala and Skyhook configs are present, counters from the Koala matrix carry forward into the Skyhook matrix.

## Permissions

```yaml
permissions:
  contents: read
```

The `github-token` must have read access to any deployment repos referenced by `services[].deploymentRepo`.

## License

MIT
