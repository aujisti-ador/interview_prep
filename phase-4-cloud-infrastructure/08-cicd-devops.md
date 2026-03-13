# CI/CD & DevOps — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical YAML/code examples
> **Last Updated:** 2026-03-13

---

## Table of Contents

1. [CI/CD Fundamentals](#q1-cicd-fundamentals)
2. [GitHub Actions Deep Dive](#q2-github-actions-deep-dive)
3. [Jenkins Basics](#q3-jenkins-basics)
4. [Infrastructure as Code (Terraform)](#q4-infrastructure-as-code-terraform)
5. [Monitoring & Alerting Infrastructure](#q5-monitoring--alerting-infrastructure)
6. [Git Workflow Best Practices (Lead-Level)](#q6-git-workflow-best-practices-lead-level)
7. [Release Management](#q7-release-management)
8. [Environment Management](#q8-environment-management)
9. [DevOps Culture & Practices (Lead-Level)](#q9-devops-culture--practices-lead-level)
10. [Quick Reference](#quick-reference)

---

## Q1: CI/CD Fundamentals

### Q: What is the difference between Continuous Integration, Continuous Delivery, and Continuous Deployment?

**A:** These three practices form a spectrum of automation maturity:

| Practice | Definition | Deploy to Prod | Human Gate? |
|---|---|---|---|
| **Continuous Integration (CI)** | Merge code frequently; every push triggers automated build + tests | No | N/A |
| **Continuous Delivery (CD)** | Every commit is deployable; artifact is always production-ready | Manual trigger | Yes |
| **Continuous Deployment (CD)** | Every commit that passes the pipeline auto-deploys to production | Automatic | No |

```
Developer Push → CI (build + test) → CD Delivery (artifact ready) → CD Deployment (auto-deploy)
                     │                        │                              │
                 Always runs            "Can deploy"                  "Does deploy"
```

**Key distinctions:**

- **CI** focuses on integration quality — catching bugs early by running tests on every commit
- **Continuous Delivery** means the artifact is always in a deployable state, but a human decides when to push the button
- **Continuous Deployment** removes the human gate entirely — if tests pass, code goes to production

> **BD startup context:** "Start with CI (automated tests). Add Continuous Delivery when you have staging. Graduate to Continuous Deployment only when you have solid monitoring, feature flags, and rollback automation. Most BD startups should aim for Continuous Delivery."

### Q: What are the typical stages in a CI/CD pipeline?

**A:**

```
┌──────┐   ┌──────┐   ┌───────┐   ┌──────────────┐   ┌────────┐   ┌────────────┐
│ Lint │ → │ Test │ → │ Build │ → │ Security Scan│ → │ Deploy │ → │ Smoke Test │
└──────┘   └──────┘   └───────┘   └──────────────┘   └────────┘   └────────────┘
```

| Stage | Purpose | Tools | Fails Fast? |
|---|---|---|---|
| **Lint** | Code style, static analysis | ESLint, Prettier, SonarQube | Yes (seconds) |
| **Test** | Unit, integration, e2e tests | Jest, Vitest, Playwright | Yes (minutes) |
| **Build** | Compile, bundle, Docker image | tsc, webpack, docker build | Yes (minutes) |
| **Security Scan** | Vulnerability detection | Snyk, Trivy, npm audit, OWASP | No (advisory) |
| **Deploy** | Push to target environment | AWS CLI, kubectl, Terraform | Yes |
| **Smoke Test** | Verify deployment health | curl, Postman, custom scripts | Yes (rollback) |

**Pipeline design principles:**
- **Fail fast:** Put the cheapest checks (lint) first
- **Parallelize:** Run independent stages concurrently (lint + unit tests)
- **Cache aggressively:** Cache dependencies, Docker layers, build artifacts
- **Environment isolation:** Each pipeline run is independent

### Q: Compare Trunk-Based Development vs Gitflow for CI/CD.

**A:**

| Aspect | Trunk-Based Development | Gitflow |
|---|---|---|
| **Branch lifetime** | Hours to 1-2 days | Days to weeks |
| **Merge conflicts** | Rare (frequent small merges) | Common (long-lived branches) |
| **CI/CD fit** | Natural fit (every merge triggers pipeline) | Requires extra setup (multiple branches) |
| **Release process** | Feature flags control what's live | Release branches cut from develop |
| **Team size** | Any (ideal for high-performing teams) | Larger teams with strict release cadence |
| **Complexity** | Low | Higher |
| **Rollback** | Toggle feature flag off | Revert merge or hotfix branch |

> **Lead insight:** "I advocate trunk-based development for most teams. It forces small, reviewable PRs and pairs naturally with CI/CD. Gitflow made sense before feature flags existed — now it mostly adds overhead."

### Q: Explain deployment strategies and when to use each.

**A:**

**1. Rolling Deployment:**
```
Time 0: [v1] [v1] [v1] [v1]
Time 1: [v2] [v1] [v1] [v1]   ← replace one at a time
Time 2: [v2] [v2] [v1] [v1]
Time 3: [v2] [v2] [v2] [v1]
Time 4: [v2] [v2] [v2] [v2]   ← done
```
- **How:** Replace instances one by one
- **Pro:** Zero downtime, minimal extra resources
- **Con:** Mixed versions during rollout, slow rollback
- **Use when:** Standard deployments, stateless services

**2. Blue-Green Deployment:**
```
              ┌─────────────┐
              │ Load Balancer│
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │                       │
   ┌─────▼─────┐         ┌──────▼────┐
   │  Blue (v1) │         │ Green (v2) │
   │  (current) │         │  (new)     │
   └────────────┘         └───────────┘
         │                       │
    Live traffic           Test here, then
                           switch traffic
```
- **How:** Run two identical environments; switch traffic instantly
- **Pro:** Instant rollback (switch back), zero downtime
- **Con:** 2x infrastructure cost during deployment
- **Use when:** Critical services, need instant rollback

**3. Canary Deployment:**
```
              ┌─────────────┐
              │ Load Balancer│
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │ 95%               5%  │
   ┌─────▼─────┐         ┌──────▼────┐
   │ Stable (v1)│         │ Canary (v2)│
   │  (bulk)    │         │  (test)    │
   └────────────┘         └───────────┘
```
- **How:** Route a small percentage of traffic to new version; gradually increase
- **Pro:** Minimal blast radius, data-driven rollout decisions
- **Con:** More complex routing, need good observability
- **Use when:** High-risk changes, large user base

**4. Feature Flags (Deploy != Release):**
```javascript
// Deploy v2 code to all servers, but control who sees it
if (featureFlags.isEnabled('new-checkout', { userId: user.id })) {
  return newCheckoutFlow(cart);
} else {
  return legacyCheckoutFlow(cart);
}
```
- **How:** Code is deployed but feature is toggled on/off per user/segment
- **Pro:** Decouple deploy from release, targeted rollout, instant kill switch
- **Con:** Technical debt if flags aren't cleaned up
- **Use when:** Every deployment (combine with other strategies)

### Q: Why should a Senior/Lead engineer care deeply about CI/CD?

**A:** At the senior/lead level, CI/CD is not "DevOps team's problem" — it's your responsibility:

1. **Pipeline design:** You're expected to architect pipelines that balance speed, safety, and cost
2. **Developer experience:** Slow pipelines kill productivity. A 30-minute pipeline means 30 minutes of context switching
3. **Quality gates:** You define what "production-ready" means (test coverage, security scans, performance budgets)
4. **Cost optimization:** CI minutes cost money. Caching, parallelization, and selective testing save real dollars
5. **Incident response:** When production breaks, your rollback strategy is your CI/CD pipeline running in reverse
6. **Team velocity:** DORA metrics (deployment frequency, lead time) directly correlate with CI/CD maturity

> **Lead mindset:** "I measure pipeline health like I measure application health. If CI takes >10 minutes, I treat it as a bug. If deploys require manual steps, I treat it as tech debt."

---

## Q2: GitHub Actions Deep Dive

### Q: Explain the GitHub Actions workflow structure.

**A:**

```
Repository
└── .github/workflows/
    └── ci.yml                    ← Workflow file
        ├── name: CI Pipeline     ← Workflow name
        ├── on: push              ← Event trigger
        └── jobs:
            ├── test:             ← Job 1
            │   ├── runs-on: ubuntu-latest
            │   └── steps:
            │       ├── uses: actions/checkout@v4    ← Action (reusable)
            │       ├── run: npm ci                  ← Shell command
            │       └── run: npm test
            └── deploy:           ← Job 2
                ├── needs: test   ← Dependency
                └── steps: ...
```

**Key concepts:**

| Concept | Description |
|---|---|
| **Workflow** | YAML file in `.github/workflows/`. Triggered by events. |
| **Event/Trigger** | What starts the workflow (push, PR, schedule, manual) |
| **Job** | A set of steps that run on the same runner. Jobs run in parallel by default. |
| **Step** | Individual task within a job. Either `uses` (action) or `run` (command). |
| **Action** | Reusable unit of code. From marketplace or custom. |
| **Runner** | VM that executes a job. GitHub-hosted or self-hosted. |

### Q: What event triggers are available and when do you use each?

**A:**

```yaml
on:
  # Code events
  push:
    branches: [main, develop]
    paths: ['src/**', 'package.json']     # Only trigger for relevant files
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  # Scheduled (cron)
  schedule:
    - cron: '0 2 * * 1'                   # Every Monday at 2 AM UTC

  # Manual trigger
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]

  # Cross-workflow
  workflow_call:                            # Reusable workflow (called by other workflows)
    inputs:
      node-version:
        type: string
        default: '20'

  # External events
  repository_dispatch:                     # Triggered via API call
    types: [deploy-trigger]
```

**Common trigger patterns:**

| Use Case | Trigger |
|---|---|
| Run tests on every PR | `pull_request` |
| Deploy on merge to main | `push: branches: [main]` |
| Nightly security scan | `schedule: cron` |
| Manual production deploy | `workflow_dispatch` |
| Shared CI logic across repos | `workflow_call` |
| External system triggers deploy | `repository_dispatch` |

### Q: How do you handle job dependencies, matrix builds, and caching?

**A:**

**Job dependencies with `needs`:**

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    needs: [lint, test]              # Runs only after BOTH lint and test succeed
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy:
    needs: build                     # Sequential dependency chain
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

```
  lint ──┐
         ├──→ build ──→ deploy
  test ──┘
```

**Matrix strategy (test across versions):**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        database: [postgres, mysql]
      fail-fast: false               # Don't cancel other matrix jobs if one fails
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
        env:
          DB_TYPE: ${{ matrix.database }}
```

This creates 6 parallel jobs: Node 18+Postgres, Node 18+MySQL, Node 20+Postgres, etc.

**Caching dependencies:**

```yaml
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: 'npm'                   # Built-in npm cache support

  # Or manual caching for more control
  - uses: actions/cache@v4
    with:
      path: |
        ~/.npm
        node_modules
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-

  # Docker layer caching
  - uses: docker/build-push-action@v5
    with:
      cache-from: type=gha
      cache-to: type=gha,mode=max
```

### Q: How do you manage secrets and environments with approval gates?

**A:**

**Secrets:**

```yaml
# Repository secrets: Settings → Secrets and variables → Actions
# Environment secrets: Settings → Environments → [env] → Secrets

steps:
  - name: Deploy
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}       # Masked in logs
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    run: aws ecs update-service ...

  # OIDC (preferred over static keys)
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
      aws-region: ap-southeast-1
```

**Environments with approval gates:**

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging                    # Auto-deploy, no approval needed
    steps:
      - run: ./deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production                      # Requires reviewer approval
      url: https://api.example.com
    steps:
      - run: ./deploy.sh production
```

Configure in GitHub: **Settings -> Environments -> production -> Required reviewers** (add team leads).

**Environment protection rules:**
- Required reviewers (1-6 people)
- Wait timer (e.g., 15 minutes after staging deploy)
- Deployment branches (only `main` can deploy to production)
- Custom branch policies

### Q: How do you build reusable workflows and composite actions?

**A:**

**Reusable workflow** (called by other workflows):

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image-tag:
        required: true
        type: string
    secrets:
      AWS_ROLE_ARN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-1
      - run: |
          aws ecs update-service \
            --cluster ${{ inputs.environment }} \
            --service api \
            --force-new-deployment
```

```yaml
# .github/workflows/main.yml — caller workflow
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      image-tag: ${{ github.sha }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
```

**Composite action** (reusable step):

```yaml
# .github/actions/setup-node-app/action.yml
name: 'Setup Node App'
description: 'Install Node.js and dependencies with caching'
inputs:
  node-version:
    description: 'Node.js version'
    default: '20'
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'
    - run: npm ci
      shell: bash
    - run: npx prisma generate
      shell: bash
```

```yaml
# Usage in any workflow
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-node-app
    with:
      node-version: '20'
  - run: npm test
```

### Q: Show a complete NestJS CI/CD pipeline with GitHub Actions.

**A:**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  ECR_REGISTRY: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com
  ECR_REPO: nestjs-api

jobs:
  # ─── Stage 1: Lint & Test ───────────────────────────
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit Tests
        run: npm run test -- --coverage
        env:
          NODE_ENV: test

      - name: E2E Tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        if: github.event_name == 'pull_request'
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/lcov.info

  # ─── Stage 2: Build & Push Docker Image ─────────────
  build-and-push:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-1

      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr-login

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        id: meta
        with:
          context: .
          push: true
          tags: |
            ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPO }}:${{ github.sha }}
            ${{ env.ECR_REGISTRY }}/${{ env.ECR_REPO }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Stage 3: Deploy to Staging ─────────────────────
  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-1

      - name: Deploy to ECS Staging
        run: |
          aws ecs update-service \
            --cluster staging \
            --service api \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster staging \
            --services api

      - name: Smoke test staging
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging-api.example.com/health)
            if [ "$STATUS" = "200" ]; then
              echo "Staging is healthy"
              exit 0
            fi
            echo "Attempt $i: Got $STATUS, retrying..."
            sleep 5
          done
          echo "Staging health check failed"
          exit 1

  # ─── Stage 4: Deploy to Production ──────────────────
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.example.com
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-1

      - name: Deploy to ECS Production
        run: |
          aws ecs update-service \
            --cluster production \
            --service api \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster production \
            --services api

      - name: Smoke test production
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
          if [ "$STATUS" != "200" ]; then
            echo "Production health check failed! Rolling back..."
            aws ecs update-service \
              --cluster production \
              --service api \
              --task-definition $(aws ecs describe-services --cluster production --services api --query 'services[0].taskDefinition' --output text)
            exit 1
          fi
```

### Q: When should you use self-hosted runners?

**A:**

**Use self-hosted runners when:**
- **Cost savings:** GitHub-hosted runners charge per minute; self-hosted are free (you pay for compute)
- **Private network access:** Need to reach internal databases, APIs, or on-premise resources
- **Custom hardware:** GPU workloads, ARM builds, high-memory jobs
- **Compliance:** Data must stay within your network (regulated industries)
- **Faster builds:** Persistent caches, pre-installed tools, warm Docker layer caches

**GitHub-hosted vs Self-hosted:**

| Aspect | GitHub-Hosted | Self-Hosted |
|---|---|---|
| **Cost** | $0.008/min (Linux) | Your infrastructure cost |
| **Setup** | Zero | Moderate (install runner agent) |
| **Maintenance** | None | You manage OS, updates, security |
| **Isolation** | Fresh VM per job | Shared machine (security risk) |
| **Performance** | 4 CPU, 16 GB RAM (standard) | Whatever you provision |
| **Network** | Public internet only | Private network access |

> **BD context:** "Self-hosted runners on a cheap EC2 instance can cut CI costs by 60-80%. We run ours on a t3.large ($60/month) — way cheaper than paying GitHub Actions minutes for a team of 10."

---

## Q3: Jenkins Basics

### Q: Explain Jenkins architecture and how it compares to GitHub Actions.

**A:**

```
┌──────────────────────────────────────────────────┐
│                 Jenkins Controller                 │
│  (formerly "Master")                              │
│                                                    │
│  ┌────────────┐  ┌──────────┐  ┌───────────────┐│
│  │ Web UI     │  │ Job Queue│  │ Plugin Manager ││
│  │ (Dashboard)│  │          │  │ (1800+ plugins)││
│  └────────────┘  └────┬─────┘  └───────────────┘│
│                       │                           │
└───────────────────────┼───────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
   ┌──────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐
   │  Agent 1    │ │  Agent 2   │ │  Agent 3    │
   │  (Linux)    │ │  (Windows) │ │  (Docker)   │
   │  label: ci  │ │  label: win│ │  label: dind│
   └─────────────┘ └────────────┘ └─────────────┘
```

**Jenkins vs GitHub Actions:**

| Aspect | Jenkins | GitHub Actions |
|---|---|---|
| **Hosting** | Self-hosted (always) | GitHub-hosted or self-hosted |
| **Config** | Jenkinsfile (Groovy) | YAML workflows |
| **Plugins** | 1800+ plugins | Marketplace actions |
| **Cost** | Infrastructure cost | Per-minute pricing |
| **Setup** | Complex (install, maintain) | Zero setup |
| **UI** | Dated but functional | Modern, integrated with GitHub |
| **Scaling** | Manual agent management | Auto-scaling runners |
| **Pipeline as Code** | Jenkinsfile | `.github/workflows/*.yml` |
| **Best for** | On-premise, complex enterprise, legacy | GitHub-hosted projects, modern workflows |

### Q: Show a Jenkins declarative pipeline.

**A:**

```groovy
// Jenkinsfile (Declarative Pipeline)
pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        DOCKER_REGISTRY = 'ecr.aws/my-repo'
        APP_NAME = 'nestjs-api'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Setup') {
            steps {
                sh 'node --version'
                sh 'npm ci'
            }
        }

        stage('Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test -- --coverage'
                    }
                    post {
                        always {
                            junit 'coverage/junit.xml'
                            publishHTML(target: [
                                reportDir: 'coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'Coverage Report'
                            ])
                        }
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER} ."
                sh "docker push ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}"
            }
        }

        stage('Deploy to Staging') {
            when { branch 'main' }
            steps {
                sh "kubectl set image deployment/api api=${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER} -n staging"
                sh 'kubectl rollout status deployment/api -n staging --timeout=300s'
            }
        }

        stage('Deploy to Production') {
            when { branch 'main' }
            input {
                message 'Deploy to production?'
                ok 'Deploy'
                submitter 'tech-leads'
            }
            steps {
                sh "kubectl set image deployment/api api=${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER} -n production"
                sh 'kubectl rollout status deployment/api -n production --timeout=300s'
            }
        }
    }

    post {
        failure {
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: "Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        success {
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "Build SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

**Declarative vs Scripted Pipeline:**

| Aspect | Declarative | Scripted |
|---|---|---|
| **Syntax** | Structured `pipeline {}` block | Groovy script in `node {}` |
| **Readability** | Easier for most users | More flexible, harder to read |
| **Validation** | Syntax validation before execution | Runtime errors only |
| **Use when** | 90% of use cases | Complex conditional logic, dynamic stages |

### Q: When should you use Jenkins over GitHub Actions?

**A:**

**Choose Jenkins when:**
- On-premise requirement (no code can leave your network)
- Complex workflows with 50+ stages and conditional logic
- Legacy systems that already have Jenkins infrastructure
- Need Groovy scripting for dynamic pipeline generation
- Enterprise environment with strict audit requirements

**Choose GitHub Actions when:**
- Code is on GitHub (natural integration)
- Team is small to medium
- Want zero infrastructure management
- Modern CI/CD with straightforward workflows
- Open-source projects (free for public repos)

---

## Q4: Infrastructure as Code (Terraform)

### Q: What is Infrastructure as Code and why does it matter?

**A:** Infrastructure as Code (IaC) means managing and provisioning infrastructure through machine-readable definition files rather than manual processes or interactive tools.

**Without IaC (manual):**
1. Open AWS Console
2. Click through 20 screens to create a VPC, subnets, security groups...
3. Hope you remember all the steps for the next environment
4. No audit trail, no version control, no reproducibility

**With IaC (Terraform):**
1. Write infrastructure definitions in code
2. Version control with Git
3. Review changes via PR
4. Apply consistently across environments
5. Full audit trail

**Why IaC matters at Senior/Lead level:**
- **Reproducibility:** Spin up identical environments in minutes
- **Disaster recovery:** Rebuild infrastructure from code after failure
- **Code review:** Infrastructure changes go through PR review like app code
- **Documentation:** The code IS the documentation of your infrastructure
- **Cost visibility:** See exactly what resources exist and why

### Q: Compare Terraform with alternatives.

**A:**

| Tool | Language | Cloud Support | State Management | Learning Curve |
|---|---|---|---|---|
| **Terraform** | HCL | Multi-cloud | Explicit state file | Moderate |
| **CloudFormation** | YAML/JSON | AWS only | Managed by AWS | Moderate |
| **AWS CDK** | TypeScript/Python/etc. | AWS only | CloudFormation stacks | Low (if you know the language) |
| **Pulumi** | TypeScript/Python/Go/etc. | Multi-cloud | Managed or self-hosted | Low (real programming languages) |
| **Ansible** | YAML | Multi-cloud | Stateless (idempotent) | Low |

**When to use Terraform:**
- Multi-cloud or planning to be
- Team is comfortable with HCL
- Need explicit state management and plan/apply workflow
- Large ecosystem of providers and modules

**When to use CDK/Pulumi:**
- Single cloud (CDK for AWS)
- Prefer writing infrastructure in TypeScript/Python
- Complex logic (loops, conditions) that is awkward in HCL
- Team is already proficient in the programming language

### Q: Explain Terraform state management and why it matters.

**A:**

Terraform state (`terraform.tfstate`) is a JSON file that maps your Terraform config to real-world resources.

```
terraform.tf (code)          terraform.tfstate (state)         AWS (reality)
┌─────────────────┐         ┌─────────────────────┐         ┌──────────────┐
│ resource "aws_  │         │ {                   │         │              │
│   instance" {   │  ────→  │   "aws_instance.web"│  ────→  │  i-0abc123   │
│   ami = "..."   │         │   "id": "i-0abc123" │         │  (running)   │
│ }               │         │ }                   │         │              │
└─────────────────┘         └─────────────────────┘         └──────────────┘
```

**Why state matters:**
- Terraform compares desired state (code) with current state (state file) to determine what to create/update/destroy
- Without state, Terraform would try to create everything from scratch on every run
- State contains sensitive data (database passwords, resource IDs)

**Remote state (production setup):**

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/api/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"    # Prevents concurrent modifications
  }
}
```

**State management best practices:**
1. **Never commit state to Git** — contains secrets
2. **Use remote backend** — S3 + DynamoDB for AWS
3. **Enable state locking** — prevents two people from applying simultaneously
4. **Enable encryption** — state contains sensitive data
5. **Use workspaces** for environment separation (or separate state files)
6. **Regular state backups** — enable S3 versioning

### Q: Show a Terraform example for deploying a NestJS app on AWS ECS.

**A:**

```hcl
# providers.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# variables.tf
variable "aws_region" {
  default = "ap-southeast-1"
}

variable "environment" {
  type = string
}

variable "app_port" {
  default = 3000
}

# vpc.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.environment}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"    # Save cost in non-prod
}

# ecs.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.environment}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.environment == "production" ? 1024 : 512
  memory                   = var.environment == "production" ? 2048 : 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.api.repository_url}:latest"
      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = tostring(var.app_port) }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.db_url.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.environment}/api"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.app_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.app_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true                  # Auto-rollback on deployment failure
  }
}

# rds.tf
resource "aws_db_instance" "postgres" {
  identifier     = "${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.environment == "production" ? "db.r6g.large" : "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = var.environment == "production" ? 100 : 50

  db_name  = "app"
  username = "admin"
  password = random_password.db_password.result

  multi_az               = var.environment == "production"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  backup_retention_period = var.environment == "production" ? 7 : 1
  skip_final_snapshot     = var.environment != "production"

  tags = {
    Environment = var.environment
  }
}

# outputs.tf
output "alb_dns" {
  value = aws_lb.api.dns_name
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}
```

**Terraform workflow:**

```bash
# Initialize (download providers, configure backend)
terraform init

# Preview changes (ALWAYS do this before apply)
terraform plan -var="environment=staging"

# Apply changes
terraform apply -var="environment=staging"

# Destroy (non-production only)
terraform destroy -var="environment=dev"
```

> **BD context:** "Terraform makes it easy to replicate your staging environment — invaluable when BD power outages corrupt a dev server. We once rebuilt our entire staging infra in 15 minutes from Terraform code."

### Q: What are Terraform best practices for a team?

**A:**

1. **Remote state with locking:** S3 + DynamoDB (never local state in a team)
2. **Modules for reusability:** Don't repeat VPC/ECS config for every environment
3. **Plan before apply:** Always review `terraform plan` output
4. **Use workspaces or separate directories** for environments:
   ```
   infrastructure/
   ├── modules/
   │   ├── vpc/
   │   ├── ecs/
   │   └── rds/
   ├── environments/
   │   ├── dev/
   │   │   ├── main.tf
   │   │   └── terraform.tfvars
   │   ├── staging/
   │   └── production/
   └── backend.tf
   ```
5. **Pin provider versions:** Avoid breaking changes
6. **Use `terraform fmt`** in CI to enforce consistent formatting
7. **Sensitive variables:** Use `sensitive = true` for secrets
8. **Import existing resources:** `terraform import` for brownfield adoption
9. **Policy as code:** Use Sentinel or Open Policy Agent (OPA) to enforce compliance

---

## Q5: Monitoring & Alerting Infrastructure

### Q: Explain the Prometheus + Grafana monitoring stack.

**A:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    Monitoring Architecture                         │
│                                                                    │
│  ┌──────────┐     ┌────────────┐     ┌──────────────────────┐   │
│  │ NestJS   │────→│ Prometheus │────→│  Grafana             │   │
│  │ App      │pull │ (Metrics   │     │  (Dashboards)        │   │
│  │ /metrics │     │  Storage)  │     │                      │   │
│  └──────────┘     └─────┬──────┘     └──────────────────────┘   │
│                         │                                        │
│  ┌──────────┐     ┌─────▼──────┐     ┌──────────────────────┐   │
│  │ Node     │────→│ Alert      │────→│  Slack / PagerDuty   │   │
│  │ Exporter │     │ Manager    │     │  (Notifications)     │   │
│  └──────────┘     └────────────┘     └──────────────────────┘   │
│                                                                    │
│  ┌──────────┐     ┌────────────┐     ┌──────────────────────┐   │
│  │ App Logs │────→│ Loki       │────→│  Grafana             │   │
│  │ (stdout) │push │ (Log       │     │  (Log Explorer)      │   │
│  │          │     │  Storage)  │     │                      │   │
│  └──────────┘     └────────────┘     └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Q: How does Prometheus work?

**A:** Prometheus is a **pull-based** time-series metrics database.

**Pull model:**
- Prometheus **scrapes** targets at regular intervals (e.g., every 15s)
- Your app exposes a `/metrics` endpoint in Prometheus exposition format
- Prometheus stores metrics as time series: `metric_name{label="value"} value timestamp`

**Metric types:**

| Type | Description | Example |
|---|---|---|
| **Counter** | Monotonically increasing value | `http_requests_total` |
| **Gauge** | Value that goes up and down | `active_connections` |
| **Histogram** | Distribution of values (buckets) | `http_request_duration_seconds` |
| **Summary** | Similar to histogram with quantiles | `request_duration_quantile` |

**NestJS Prometheus integration:**

```typescript
// Install: npm install prom-client @willsoto/nestjs-prometheus

// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
})
export class AppModule {}

// Custom metrics in a service
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class OrderService {
  constructor(
    @InjectMetric('orders_created_total')
    private ordersCounter: Counter,
    @InjectMetric('order_processing_duration_seconds')
    private processingDuration: Histogram,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const timer = this.processingDuration.startTimer();
    try {
      const order = await this.orderRepo.save(dto);
      this.ordersCounter.inc({ status: 'success', payment_method: dto.paymentMethod });
      return order;
    } catch (error) {
      this.ordersCounter.inc({ status: 'failure' });
      throw error;
    } finally {
      timer({ method: 'createOrder' });
    }
  }
}
```

**Prometheus configuration:**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alerts/*.yml'

scrape_configs:
  - job_name: 'nestjs-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['api:3000']
    # In K8s, use service discovery instead:
    # kubernetes_sd_configs:
    #   - role: pod

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

**Essential PromQL queries:**

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Error rate (percentage)
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m])) * 100

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active connections
sum(active_connections)

# CPU usage by container (K8s)
rate(container_cpu_usage_seconds_total[5m])

# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
/ node_memory_MemTotal_bytes * 100
```

### Q: How do you set up Grafana dashboards and alerting?

**A:**

**Grafana data sources:**

| Source | Purpose |
|---|---|
| **Prometheus** | Application and infrastructure metrics |
| **CloudWatch** | AWS service metrics (RDS, ECS, ALB) |
| **Loki** | Log aggregation and search |
| **Elasticsearch** | Full-text log search |
| **PostgreSQL** | Business metrics from database |

**Dashboard-as-code (JSON provisioning):**

```yaml
# docker-compose monitoring stack
services:
  grafana:
    image: grafana/grafana:latest
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}

# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: 'default'
    folder: 'API Dashboards'
    type: file
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

**Essential dashboards every backend team needs:**

| Dashboard | Key Panels | Alert On |
|---|---|---|
| **API Overview** | Request rate, error rate, latency (p50/p95/p99), active connections | Error rate > 1%, p95 > 2s |
| **Infrastructure** | CPU, memory, disk, network per node | CPU > 80%, disk > 85% |
| **Database** | Active connections, query duration, replication lag, cache hit ratio | Connections > 80%, replication lag > 30s |
| **Business Metrics** | Orders/min, revenue, active users, conversion rate | Orders drop > 50% from baseline |
| **Deployment** | Deploy frequency, rollback count, deploy duration | Deploy failure |

**Grafana alerting rules:**

```yaml
# grafana/provisioning/alerting/alerts.yml
groups:
  - name: API Alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) * 100 > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate: {{ $value }}%"
          runbook: "https://wiki.internal/runbooks/high-error-rate"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 2 seconds"

      - alert: PodCrashLooping
        expr: |
          increase(kube_pod_container_status_restarts_total[1h]) > 3
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash-looping"
```

### Q: What is Grafana Loki and how does it compare to Elasticsearch?

**A:** Loki is a horizontally-scalable, highly-available log aggregation system designed by Grafana Labs. It's like Prometheus, but for logs.

| Aspect | Grafana Loki | Elasticsearch (ELK) |
|---|---|---|
| **Indexing** | Only indexes labels (metadata) | Full-text indexes all log content |
| **Storage cost** | Low (compressed chunks, minimal index) | High (full inverted index) |
| **Query speed** | Fast for label-filtered queries, slower for grep | Fast for any text search |
| **Resource usage** | Lightweight | Heavy (JVM, memory-hungry) |
| **Query language** | LogQL (PromQL-inspired) | KQL / Lucene |
| **Setup complexity** | Simple (single binary mode) | Complex (Elasticsearch + Logstash + Kibana) |
| **Best for** | Cost-effective log aggregation, K8s-native | Full-text search, analytics, compliance |

**LogQL examples:**

```logql
# All error logs from api service
{app="api"} |= "error"

# Parse JSON logs and filter by status
{app="api"} | json | status >= 500

# Count errors per minute
count_over_time({app="api"} |= "error" [1m])

# Top 5 slowest endpoints
topk(5, sum by (path) (rate({app="api"} | json | unwrap duration [5m])))
```

### Q: Explain AlertManager and alert routing.

**A:** AlertManager handles alerts from Prometheus: deduplication, grouping, routing, silencing, and notification.

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx'

route:
  receiver: 'default-slack'
  group_by: ['alertname', 'service']
  group_wait: 30s              # Wait to batch alerts before first notification
  group_interval: 5m           # Time between grouped notifications
  repeat_interval: 4h          # Resend if alert still firing
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: critical
      receiver: 'slack-critical'
    - match:
        severity: warning
      receiver: 'slack-warning'
    - match:
        team: payments
      receiver: 'slack-payments-team'

receivers:
  - name: 'default-slack'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        severity: critical

  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'

  - name: 'slack-warning'
    slack_configs:
      - channel: '#alerts-warning'

  - name: 'slack-payments-team'
    slack_configs:
      - channel: '#team-payments-alerts'

# Inhibition: suppress warning if critical is already firing for same service
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
```

**Key AlertManager concepts:**

| Concept | Purpose |
|---|---|
| **Grouping** | Batch related alerts (e.g., all pod failures) into one notification |
| **Inhibition** | Suppress lower-severity alerts when a critical alert is already firing |
| **Silencing** | Temporarily mute alerts (during maintenance windows) |
| **Routing** | Send alerts to the right team/channel based on labels |

---

## Q6: Git Workflow Best Practices (Lead-Level)

### Q: Compare Trunk-Based Development, Gitflow, and GitHub Flow.

**A:**

**Trunk-Based Development:**
```
main ─────●───●───●───●───●───●───●───●───●────→
           \─●─/   \─●─/   \─●─/
          (short-lived feature branches, hours to 1-2 days)
```

**Gitflow:**
```
main    ─────────────●──────────────────●────────→
                    /                  /
release ──────────●──────────────────●───────────→
                 /                  /
develop ──●──●──●──●──●──●──●──●──●──────────────→
            \─●─/     \──●──/
          (feature branches, days to weeks)
```

**GitHub Flow:**
```
main ─────●─────────●─────────●─────────●────────→
           \──●──●──/         \──●──●──/
          (branch → PR → review → merge)
```

**Comparison:**

| Aspect | Trunk-Based | Gitflow | GitHub Flow |
|---|---|---|---|
| **Branch lifetime** | Hours to days | Days to weeks | Days |
| **Merge conflicts** | Rare | Common | Moderate |
| **CI/CD fit** | Natural fit | Requires setup | Good fit |
| **Release process** | Feature flags | Release branches | Merge to main = deploy |
| **Team size** | Any | Larger teams | Small to medium |
| **Complexity** | Low | High | Low |
| **Best for** | High-performing teams, microservices | Regulated releases, mobile apps | Web apps, SaaS products |

> **Lead recommendation:** "I default to GitHub Flow for most teams: simple, PR-based, works great with CI/CD. Graduate to trunk-based when the team is mature enough for feature flags. Avoid Gitflow unless you have hard release cycles (e.g., mobile app store reviews)."

### Q: What are best practices for commits and pull requests?

**A:**

**Conventional Commits:**

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type | When |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Maintenance (deps, configs) |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `test:` | Adding or correcting tests |
| `perf:` | Performance improvement |
| `ci:` | CI/CD changes |

**Examples:**
```
feat(orders): add order cancellation endpoint
fix(auth): handle expired refresh tokens gracefully
chore(deps): upgrade NestJS to v11
refactor(payments): extract payment gateway interface
ci: add security scanning step to pipeline
```

**PR best practices (Lead checklist):**

| Practice | Why |
|---|---|
| **Small PRs (< 400 lines)** | Faster reviews, fewer bugs, easier to revert |
| **Clear description with context** | Reviewer needs to understand WHY, not just WHAT |
| **Link to issue/ticket** | Traceability |
| **1-2 reviewers** | More than 2 adds overhead without value |
| **CI must pass** | Never merge a red PR |
| **Squash merge** | Clean history on main |
| **Self-review before requesting** | Catch obvious issues yourself |
| **Screenshots for UI changes** | Visual confirmation |

**PR description template:**

```markdown
## What
Brief description of the change.

## Why
Link to issue, business context, or technical motivation.

## How
Key technical decisions and trade-offs.

## Testing
- [ ] Unit tests added/updated
- [ ] E2E test for happy path
- [ ] Tested locally with docker-compose

## Checklist
- [ ] No breaking API changes (or documented in migration guide)
- [ ] Database migration is backward-compatible
- [ ] Feature flag wraps new behavior
```

### Q: What branch protection rules should a lead engineer configure?

**A:**

```yaml
# Recommended branch protection for 'main':
Branch Protection Rules:
  require_pull_request:
    required_approving_review_count: 1     # At least 1 approval
    dismiss_stale_reviews: true            # Re-review after new push
    require_code_owner_reviews: true       # CODEOWNERS must approve
    require_last_push_approval: true       # Pusher can't self-approve

  require_status_checks:
    strict: true                           # Branch must be up-to-date with main
    contexts:
      - 'lint-and-test'                    # CI must pass
      - 'security-scan'                    # Security checks must pass

  enforce_admins: true                     # Admins also follow rules
  require_linear_history: true             # Squash or rebase only (no merge commits)
  require_signed_commits: false            # Nice-to-have but adds friction
  allow_force_pushes: false                # Never force push to main
  allow_deletions: false                   # Can't delete main
```

**CODEOWNERS file:**

```
# .github/CODEOWNERS
# These owners are automatically requested for review

# Default: tech leads review everything
*                           @tech-leads

# Specific ownership
/src/modules/payments/      @payments-team
/src/modules/auth/          @security-team
/infrastructure/            @platform-team
/.github/workflows/         @platform-team
/database/migrations/       @tech-leads @dba-team
```

### Q: What does a code review checklist look like for a lead?

**A:**

**Functional review:**
- Does the code do what the PR description says?
- Are edge cases handled (null, empty, concurrent access)?
- Are error messages helpful for debugging?

**Architecture review:**
- Does this follow our established patterns?
- Is the responsibility in the right layer (controller vs service vs repository)?
- Will this scale with expected growth?

**Security review:**
- Input validation on all external data?
- No secrets in code?
- SQL injection, XSS, CSRF protections?
- Proper authorization checks?

**Performance review:**
- N+1 queries?
- Missing database indexes for new queries?
- Unbounded data fetching (pagination)?

**Operational review:**
- Logging for debugging (but not over-logging)?
- Metrics for new business operations?
- Database migration is backward-compatible?
- Feature flag wrapping new behavior?

---

## Q7: Release Management

### Q: Explain semantic versioning and changelog generation.

**A:**

**Semantic Versioning (SemVer):**

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Bug fixes (backward-compatible)
  │     └──────── New features (backward-compatible)
  └────────────── Breaking changes (not backward-compatible)

Examples:
  1.0.0 → 1.0.1   (bug fix)
  1.0.1 → 1.1.0   (new feature)
  1.1.0 → 2.0.0   (breaking change)
  2.0.0-beta.1     (pre-release)
```

**Automated changelog with Conventional Commits:**

If you use conventional commits, tools can auto-generate changelogs:

```
## [1.5.0] - 2026-03-13

### Features
- **orders:** add order cancellation endpoint (#142)
- **payments:** support GCash payment method (#156)

### Bug Fixes
- **auth:** handle expired refresh tokens gracefully (#148)
- **notifications:** fix duplicate email sending (#151)

### Performance
- **search:** add database index for product search (#153)
```

**Tools:**
- **release-please** (Google): Auto-creates release PRs from conventional commits
- **semantic-release**: Fully automated versioning and publishing
- **standard-version**: Bump version, generate changelog, create git tag
- **changesets**: Monorepo-friendly changelog management

### Q: What rollback strategies should you have in place?

**A:**

| Platform | Rollback Method | Speed | Command |
|---|---|---|---|
| **Kubernetes** | Rollout undo | Seconds | `kubectl rollout undo deployment/api` |
| **ECS** | Previous task definition | Minutes | `aws ecs update-service --task-definition api:PREV` |
| **Lambda** | Alias traffic shift | Seconds | `aws lambda update-alias --routing-config` |
| **Docker Compose** | Previous image tag | Seconds | `docker compose up -d` (with previous tag) |
| **Feature Flag** | Toggle off | Instant | Dashboard click or API call |

**Rollback decision tree:**

```
Production incident detected
         │
         ▼
  Is it a feature flag issue?
    │ Yes → Toggle flag off (instant)
    │ No ↓
  Is the database schema changed?
    │ No → Rollback deployment (seconds/minutes)
    │ Yes ↓
  Is the migration backward-compatible?
    │ Yes → Rollback deployment (schema stays)
    │ No ↓
  Execute manual rollback plan
  (forward-fix is usually faster)
```

**Database rollback strategy:**

The golden rule: **migrations must be backward-compatible**.

```
✅ Safe (can roll back app without touching DB):
  - Add a new column (nullable or with default)
  - Add a new table
  - Add a new index

❌ Unsafe (breaks old code if you roll back):
  - Drop a column
  - Rename a column
  - Change a column type

✅ How to safely "rename" a column:
  Step 1: Add new column (deploy)
  Step 2: Backfill data, write to both columns (deploy)
  Step 3: Switch reads to new column (deploy)
  Step 4: Drop old column (deploy, weeks later)
```

### Q: How do feature flags enable safe releases?

**A:**

**Feature flag workflow:**

```
1. Developer wraps new code in feature flag
2. Code is merged and deployed to production (flag OFF)
3. QA enables flag for internal users → test in production
4. Enable for 5% of users → monitor metrics
5. Gradually increase: 10% → 25% → 50% → 100%
6. If metrics degrade → instant kill switch (flag OFF)
7. After full rollout → remove flag (clean up tech debt)
```

**Implementation patterns:**

```typescript
// Simple boolean flag
if (featureFlags.isEnabled('new-search-algorithm')) {
  return newSearch(query);
}
return legacySearch(query);

// Percentage-based rollout
if (featureFlags.isEnabled('new-checkout', {
  userId: user.id,         // Consistent: same user always sees same version
  percentage: 10,          // 10% of users
})) {
  return newCheckout(cart);
}

// User segment targeting
if (featureFlags.isEnabled('beta-feature', {
  userId: user.id,
  attributes: {
    country: user.country,    // Only BD users
    plan: user.plan,          // Only premium users
    employee: user.isEmployee // Internal testing
  },
})) {
  return betaFeature();
}
```

**Feature flag tools:**

| Tool | Type | Cost | Best For |
|---|---|---|---|
| **LaunchDarkly** | SaaS | $$$ | Enterprise, advanced targeting |
| **Unleash** | Open source / SaaS | Free / $ | Self-hosted, good features |
| **ConfigCat** | SaaS | $ | Simple, affordable |
| **AWS AppConfig** | AWS service | $ | AWS-native, config management |
| **GrowthBook** | Open source | Free | A/B testing + flags |
| **Custom (DB/Redis)** | DIY | Free | Simple on/off flags |

> **Lead responsibility:** "Feature flags are powerful but create tech debt. I enforce a rule: every flag has an expiration date. If a flag has been at 100% for 2+ weeks, create a ticket to remove it."

---

## Q8: Environment Management

### Q: What environments should a team maintain and how should they differ?

**A:**

| Environment | Purpose | Who Uses It | Data | Infra Size | Deploy Trigger |
|---|---|---|---|---|---|
| **Local** | Development | Individual dev | Seed/mock data | Docker Compose | Manual |
| **Dev** | Integration testing | Dev team | Seeded test data | Minimal (t3.small) | Push to develop |
| **Staging** | Pre-production validation | QA, product | Production-like (anonymized) | Mirror prod (smaller) | Push to main |
| **Production** | Live users | Everyone | Real data | Full scale | Manual/auto after staging |

**Environment parity principle:** Staging should mirror production as closely as possible:

| Aspect | Dev | Staging | Production |
|---|---|---|---|
| **Database** | PostgreSQL (Docker) | RDS (db.t4g.micro) | RDS (db.r6g.large, Multi-AZ) |
| **Cache** | Redis (Docker) | ElastiCache (t3.micro) | ElastiCache (r6g.large, cluster) |
| **App instances** | 1 (local) | 1-2 (Fargate) | 2-4 (Fargate, auto-scaling) |
| **CDN** | None | CloudFront (optional) | CloudFront |
| **Monitoring** | Console logs | Basic Grafana | Full Prometheus + Grafana + alerts |
| **SSL** | Self-signed / none | ACM | ACM |

### Q: How do you manage environment-specific configuration?

**A:**

**Hierarchy (precedence order):**

```
1. Environment variables (highest priority — injected at runtime)
2. .env.{environment} file (committed, non-sensitive defaults)
3. Config file defaults (code-level defaults)
```

**NestJS configuration pattern:**

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 10,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  features: {
    newCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',
  },
});
```

**Where to store secrets per environment:**

| Secret Type | Local | Dev/Staging | Production |
|---|---|---|---|
| **DB password** | `.env.local` (gitignored) | AWS SSM Parameter Store | AWS SSM + rotation |
| **API keys** | `.env.local` | SSM / Secrets Manager | Secrets Manager |
| **JWT secret** | `.env.local` | SSM | Secrets Manager + rotation |
| **Feature flags** | `.env.local` | LaunchDarkly/Unleash | LaunchDarkly/Unleash |

### Q: What are preview environments and when should you use them?

**A:** Preview environments (also called ephemeral environments or review apps) are short-lived environments automatically created for each pull request.

```
PR #142 opened → Create environment pr-142.preview.example.com
                 ├── Deploy app with PR code
                 ├── Provision temporary database
                 └── Seed with test data

PR #142 merged/closed → Destroy environment (save costs)
```

**Benefits:**
- QA can test the exact PR in an isolated environment
- Product managers can preview features before merge
- No "works on my machine" issues
- Parallel feature development without environment conflicts

**GitHub Actions for preview environments:**

```yaml
name: Preview Environment
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy preview
        run: |
          # Using Vercel, Railway, or custom ECS setup
          PREVIEW_URL="pr-${{ github.event.number }}.preview.example.com"
          # ... deploy logic
      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `Preview deployed: https://pr-${context.issue.number}.preview.example.com`
            })

  cleanup-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Destroy preview environment
        run: |
          # Tear down infrastructure for this PR
          echo "Destroying preview for PR ${{ github.event.number }}"
```

### Q: How do you manage costs across environments?

**A:**

**Cost optimization strategies:**

| Strategy | Savings | Implementation |
|---|---|---|
| **Smaller instances for non-prod** | 50-70% | Terraform variables per environment |
| **Scheduled shutdown** | 60-70% | Lambda + EventBridge: stop dev/staging at night |
| **Spot instances for CI** | 60-90% | ECS Spot for build agents |
| **Single NAT gateway (non-prod)** | $30/mo per AZ saved | Terraform conditional |
| **Reserved instances (prod)** | 30-60% | 1-year commitment for stable workloads |
| **Preview env auto-cleanup** | Variable | Destroy on PR close + TTL |

**Scheduled shutdown example:**

```yaml
# CloudWatch EventBridge rule + Lambda
# Stop dev/staging ECS services at 8 PM, start at 8 AM (local time)
resource "aws_scheduler_schedule" "stop_dev" {
  name = "stop-dev-services"
  schedule_expression = "cron(0 14 ? * MON-FRI *)"  # 8 PM UTC+6

  target {
    arn      = aws_lambda_function.manage_ecs.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ action = "stop", cluster = "dev" })
  }
}
```

> **BD context:** "In BD startups, every dollar counts. We save ~$200/month by shutting down dev/staging outside work hours. That's significant when your total cloud bill is $500/month."

---

## Q9: DevOps Culture & Practices (Lead-Level)

### Q: What are the core DevOps principles a lead engineer should champion?

**A:**

**CALMS Framework:**

| Principle | Meaning | In Practice |
|---|---|---|
| **Culture** | Collaboration between dev and ops | Shared responsibility, no "throw over the wall" |
| **Automation** | Automate everything repeatable | CI/CD, IaC, automated testing, incident response |
| **Lean** | Eliminate waste, continuous improvement | Small batches, fast feedback loops |
| **Measurement** | Measure everything that matters | DORA metrics, SLOs, error budgets |
| **Sharing** | Knowledge sharing, transparency | Blameless postmortems, runbooks, documentation |

**"You Build It, You Run It" (Werner Vogels, Amazon):**
- The team that writes the code is responsible for running it in production
- Creates ownership: developers care more about quality when they carry the pager
- Faster incident resolution: the people who wrote the code debug it best
- Feedback loop: running your own code teaches you to write better code

### Q: What is GitOps and when should you use it?

**A:** GitOps uses Git as the single source of truth for declarative infrastructure and application deployment.

**Traditional CI/CD (push-based):**
```
Developer → Git Push → CI Pipeline → kubectl apply → Cluster
```

**GitOps (pull-based):**
```
Developer → Git Push → Git Repo (desired state)
                              ↑
                    ArgoCD/FluxCD watches
                              ↓
                     Kubernetes Cluster (actual state)

ArgoCD reconciles: actual state → desired state
```

**ArgoCD example:**

```yaml
# argocd-application.yml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nestjs-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/k8s-manifests.git
    targetRevision: main
    path: apps/nestjs-api/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true            # Delete resources removed from git
      selfHeal: true         # Revert manual changes to match git
    syncOptions:
      - CreateNamespace=true
```

**Benefits of GitOps:**
- **Auditability:** Every change has a git commit (who, what, when)
- **Rollback:** `git revert` to roll back any deployment
- **Disaster recovery:** Recreate cluster from git repo
- **Security:** No direct cluster access needed; CI pushes to git, ArgoCD pulls
- **Consistency:** Drift detection and auto-correction

**When to use GitOps:**
- Kubernetes-based infrastructure
- Multiple clusters or environments
- Strict audit and compliance requirements
- Team comfortable with declarative configuration

### Q: What are DORA metrics and why do they matter?

**A:** DORA (DevOps Research and Assessment) metrics measure software delivery performance. They directly correlate with organizational performance.

| Metric | Elite | High | Medium | Low |
|---|---|---|---|---|
| **Deployment Frequency** | Multiple per day | Weekly to monthly | Monthly to biannually | Fewer than biannually |
| **Lead Time for Changes** | < 1 hour | 1 day to 1 week | 1 week to 1 month | 1 to 6 months |
| **Change Failure Rate** | < 5% | 10-15% | 15-25% | > 25% |
| **Mean Time to Recover (MTTR)** | < 1 hour | < 1 day | 1 day to 1 week | > 1 week |

**How to measure DORA metrics:**

```typescript
// Track in your CI/CD pipeline
interface DeploymentEvent {
  commitSha: string;
  commitTimestamp: Date;      // When code was committed
  deployTimestamp: Date;       // When deployed to production
  environment: string;
  status: 'success' | 'failure' | 'rollback';
}

// Deployment Frequency: count of deployments per day/week
// Lead Time: deployTimestamp - commitTimestamp
// Change Failure Rate: rollbacks / total deployments
// MTTR: time between incident start and resolution
```

**Tools for DORA metrics:**
- **Sleuth:** Dedicated DORA metric tracking
- **LinearB:** Engineering metrics platform
- **Datadog DORA:** Built into Datadog CI visibility
- **Custom dashboards:** Grafana + deployment events from CI/CD

> **Lead perspective:** "I track DORA metrics monthly and share them with the team. It's not about blame — it's about identifying bottlenecks. If lead time is high, maybe our PR review process is slow. If change failure rate is high, maybe we need better testing."

### Q: What does a blameless postmortem look like?

**A:**

**Postmortem template:**

```markdown
# Incident Postmortem: [Title]

## Summary
- **Date:** 2026-03-10
- **Duration:** 2 hours 15 minutes (14:30 - 16:45 UTC+6)
- **Severity:** SEV-1 (production outage)
- **Impact:** 100% of API requests returned 503. ~5,000 users affected.

## Timeline
| Time (UTC+6) | Event |
|---|---|
| 14:30 | Deploy v2.3.1 to production |
| 14:32 | Error rate spikes to 95% (PagerDuty alert) |
| 14:35 | On-call engineer acknowledges, begins investigation |
| 14:45 | Identified: new migration locks `orders` table |
| 14:50 | Decision: rollback deployment |
| 14:55 | Rollback initiated via ECS previous task definition |
| 15:10 | Migration rolled back manually |
| 16:00 | Service fully recovered |
| 16:45 | All queued jobs processed, incident resolved |

## Root Cause
Database migration added a NOT NULL column to the `orders` table
(10M rows) without a DEFAULT value. PostgreSQL acquired an ACCESS
EXCLUSIVE lock on the table, blocking all reads and writes.

## What Went Well
- PagerDuty alert fired within 2 minutes
- On-call engineer responded within 3 minutes
- Team collaborated effectively in Slack

## What Went Wrong
- Migration was not tested against production-sized data
- No migration review checklist for large tables
- Rollback took 20 minutes (manual DB intervention needed)

## Action Items
| Action | Owner | Deadline | Status |
|---|---|---|---|
| Add migration linting to CI (check for table locks) | @dev-lead | 2026-03-17 | TODO |
| Create large-table migration runbook | @dba | 2026-03-20 | TODO |
| Test migrations against prod-sized staging DB | @platform | 2026-03-24 | TODO |
| Add automated rollback for failed deploys | @platform | 2026-03-31 | TODO |
```

**Blameless postmortem principles:**
1. **Focus on systems, not people:** "The process allowed this to happen" not "Person X caused this"
2. **Assume good intent:** Everyone was trying to do the right thing
3. **Ask "how" not "why":** "How did this slip through?" not "Why didn't you test this?"
4. **Action items must be specific:** Owner, deadline, and tracked to completion
5. **Share widely:** Entire engineering team should learn from every incident

### Q: What on-call practices should a lead engineer establish?

**A:**

**On-call rotation structure:**

```
Week 1: Engineer A (primary) + Engineer B (secondary)
Week 2: Engineer B (primary) + Engineer C (secondary)
Week 3: Engineer C (primary) + Engineer D (secondary)
...

Primary: First responder, triages all alerts
Secondary: Backup if primary is unavailable or needs help
```

**On-call expectations:**

| Aspect | Standard |
|---|---|
| **Response time (SEV-1)** | Acknowledge within 5 minutes |
| **Response time (SEV-2)** | Acknowledge within 30 minutes |
| **Availability** | Reachable and able to access laptop |
| **Handoff** | Written handoff doc at rotation change |
| **Compensation** | On-call stipend or comp time off |

**Runbook template:**

```markdown
# Runbook: High API Error Rate

## Alert
AlertManager: `HighErrorRate` (error rate > 1% for 5 minutes)

## First Steps
1. Check Grafana dashboard: [API Overview](http://grafana.internal/d/api)
2. Check recent deployments: `kubectl rollout history deployment/api`
3. Check logs: `kubectl logs -l app=api --tail=100`

## Common Causes & Fixes
| Symptom | Likely Cause | Fix |
|---|---|---|
| 502 errors | Pod crash-looping | Check logs, rollback if recent deploy |
| 503 errors | No healthy pods | Scale up, check node resources |
| Connection timeout | Database overloaded | Check RDS metrics, kill long queries |
| 500 + "ECONNREFUSED" | Redis down | Check ElastiCache, restart if needed |

## Escalation
- If not resolved in 30 minutes → page secondary on-call
- If database issue → page DBA (@dba-team)
- If infrastructure issue → page platform (@platform-team)
```

### Q: What is platform engineering and how does it relate to DevOps?

**A:** Platform engineering builds internal developer platforms (IDPs) that abstract away infrastructure complexity, allowing developers to self-serve.

```
Without Platform Engineering:
  Developer → "Hey DevOps, can you create a new service?" → Wait 2 days

With Platform Engineering:
  Developer → Internal Platform (CLI/UI) → Service created in minutes
             ┌──────────────────────────────┐
             │  Internal Developer Platform  │
             │                               │
             │  "Create new service"         │
             │  → Generates repo from template│
             │  → Sets up CI/CD pipeline      │
             │  → Provisions infrastructure   │
             │  → Configures monitoring       │
             │  → Adds to service catalog     │
             └──────────────────────────────┘
```

**What a platform team provides:**
- **Golden paths:** Opinionated templates for new services (NestJS template, CI/CD pipeline, Dockerfile, Terraform)
- **Self-service infrastructure:** CLI or UI to provision databases, caches, queues
- **Observability stack:** Pre-configured Prometheus, Grafana, Loki
- **Developer documentation:** How-to guides, ADRs, runbooks
- **Guardrails:** Security policies, cost limits, compliance as code

**Tools:**
- **Backstage** (Spotify): Developer portal and service catalog
- **Humanitec:** Platform orchestrator
- **Port:** Internal developer portal
- **Custom CLI:** Built with Commander.js/Oclif

> **Lead insight:** "Platform engineering is the evolution of DevOps. Instead of a DevOps team that becomes a bottleneck, you build tools that let developers help themselves. Start small: a service template and a CI/CD pipeline generator."

---

## Quick Reference

### CI/CD Pipeline Template (GitHub Actions)

```yaml
# Minimal production-ready pipeline
name: CI/CD
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

### Git Workflow Comparison

| Criteria | Trunk-Based | GitHub Flow | Gitflow |
|---|---|---|---|
| Simplicity | High | High | Low |
| CI/CD fit | Excellent | Good | Fair |
| Release control | Feature flags | Merge = deploy | Release branches |
| Recommended for | Microservices, mature teams | Web SaaS | Mobile, regulated |

### Terraform Commands Cheat Sheet

```bash
terraform init                  # Initialize, download providers
terraform plan                  # Preview changes (dry run)
terraform apply                 # Apply changes
terraform destroy               # Tear down all resources
terraform fmt                   # Format code
terraform validate              # Validate syntax
terraform state list            # List managed resources
terraform state show <resource> # Inspect specific resource
terraform import <addr> <id>    # Import existing resource
terraform workspace list        # List workspaces
terraform workspace select dev  # Switch workspace
terraform output                # Show output values
```

### DORA Metrics Targets

| Metric | Your Target | Elite Benchmark |
|---|---|---|
| Deploy Frequency | Daily | Multiple per day |
| Lead Time | < 1 day | < 1 hour |
| Change Failure Rate | < 10% | < 5% |
| MTTR | < 4 hours | < 1 hour |

### Common Interview Questions

1. **"Walk me through your CI/CD pipeline."** — Describe stages, tools, environments, approval gates, rollback strategy.

2. **"How do you handle database migrations in CI/CD?"** — Backward-compatible migrations, separate migration step, test against prod-sized data.

3. **"What's your deployment strategy for zero-downtime?"** — Rolling (default), blue-green (instant rollback), canary (risk mitigation).

4. **"How do you manage secrets in your pipeline?"** — Never in code. Use OIDC for AWS, GitHub Secrets for CI, SSM/Secrets Manager for runtime.

5. **"Describe a production incident and how you resolved it."** — Use the postmortem format: timeline, root cause, action items.

6. **"How do you ensure staging matches production?"** — IaC (same Terraform code, different variables), automated environment provisioning, data anonymization pipeline.

7. **"What DORA metrics do you track?"** — All four. Share current numbers and improvement trends.

8. **"How do you handle feature flags at scale?"** — Centralized flag management, percentage rollout, automatic cleanup of stale flags, monitoring per flag.

9. **"Terraform state conflict — two people applying at the same time?"** — Remote state with DynamoDB locking. Only one apply can run at a time.

10. **"How would you set up monitoring for a new service?"** — Prometheus metrics endpoint, Grafana dashboard (RED method: Rate, Errors, Duration), alerts for SLO breach, on-call runbook.

---

> **Study tip:** For Senior/Lead interviews, interviewers expect you to not just KNOW these tools, but to have OPINIONS about when to use them, experience with trade-offs, and the ability to set up pipelines from scratch. Practice by describing your current team's CI/CD pipeline and where you'd improve it.
