# 🔬 DX-Ray Trace

> **Reproducibility & Drift Scanner** — Eliminate "It works on my machine" forever.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?logo=node.js)](https://nodejs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Built for Hackathon](https://img.shields.io/badge/Built%20For-Hackathon%20%F0%9F%8F%86-orange)](https://github.com)
[![CLI Tool](https://img.shields.io/badge/Type-CLI%20Tool-blueviolet)](https://github.com)

---

```
 ██████╗ ██╗  ██╗      ██████╗  █████╗ ██╗   ██╗
 ██╔══██╗╚██╗██╔╝      ██╔══██╗██╔══██╗╚██╗ ██╔╝
 ██║  ██║ ╚███╔╝ █████╗██████╔╝███████║ ╚████╔╝
 ██║  ██║ ██╔██╗ ╚════╝██╔══██╗██╔══██║  ╚██╔╝
 ██████╔╝██╔╝ ██╗      ██║  ██║██║  ██║   ██║
 ╚═════╝ ╚═╝  ╚═╝      ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝

 ████████╗██████╗  █████╗  ██████╗███████╗
 ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝
    ██║   ██████╔╝███████║██║     █████╗
    ██║   ██╔══██╗██╔══██║██║     ██╔══╝
    ██║   ██║  ██║██║  ██║╚██████╗███████╗
    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝
```

---

## 🚀 What is DX-Ray Trace?

**DX-Ray Trace** is a premium, fully interactive **Developer Experience CLI tool** that diagnoses, reports, and fixes the environment differences that cause projects to fail on new machines. It performs a deep multi-dimensional scan of your repository and produces an interactive **Compatibility Matrix** with a **DX Health Score** — then guides you through fixing every problem it finds, one by one, right from the terminal.

Think of it as an **X-Ray machine for your codebase**, combined with an **intelligent auto-repair engine**.

---

## ✨ Key Features

### 🔬 1. Environment Scan — `dx scan`
Run a comprehensive 10-dimensional scan of your project environment against a spec file (`dx-spec.yaml`). Generates a full **Compatibility Matrix** and **DX Health Score (0–100)**.

**Scans across 10 categories simultaneously:**

| Category | What It Checks |
|---|---|
| 🟢 Runtime Versions | Node.js, Python version matching |
| 📦 Dependencies | npm / pip packages installed & correct |
| 🔑 Environment Variables | Missing `.env` keys, placeholder values, `.env.example` drift |
| 📁 File Paths | Required files existence, hardcoded absolute paths |
| 🛡️ Security | Hardcoded localhost URLs, raw Stripe/AWS secrets in source code |
| 🐳 Docker | Required Docker images pulled and available |
| 🔌 Open Ports | Port conflicts that would block the app from starting |
| 📝 Docs Freshness | README existence and staleness detection |
| 🗂️ Git | Missing `.gitignore`, unprotected sensitive patterns in git history |
| 🏗️ Project Structure | Missing critical directories or entry points |

---

### 🛠️ 2. Interactive Issue Drill-Down
After every scan, DX-Ray Trace enters an **interactive issue viewer** instead of dumping a wall of text. Browse every detected problem with **arrow-key navigation**:

- **Select any issue** to expand its full diagnostic detail (Expected vs Actual, Auto-Fix hint, severity badge)
- **Instant inline fix**: If an issue is auto-fixable, it immediately launches the repair wizard right inside the viewer — no need to exit and run a separate command
- **Dynamic list shrink**: Fixed issues are removed from the list in real time — your list literally shrinks as you resolve problems
- **Returns cleanly** to the main menu when all issues are resolved

---

### 🔧 3. Auto-Fixer — `dx fix`
The Auto-Fixer engine can repair common issues with zero manual effort. Supports two modes:

- **Review Mode (Safe)**: Approve each fix individually before it is applied
- **Auto Mode (Fast)**: Apply all fixes automatically in sequence

**Auto-fixable issues include:**
- ✅ Copy `.env.example` → `.env`
- ✅ Interactively fill in missing environment variable values
- ✅ Replace hardcoded `localhost` URLs with `process.env.*` references
- ✅ Move raw secrets (Stripe keys, AWS tokens) to `.env` and inject references
- ✅ Run `npm install` / `pip install` to restore missing dependencies
- ✅ Generate a `.gitignore` with secure defaults
- ✅ Kill port-conflicting processes
- ✅ Switch Node.js version via `nvm`

---

### ⏱️ 4. Time Saved Gamification
At the end of every Auto-Fix session, DX-Ray Trace calculates the total time that would have been spent manually resolving every issue and displays a celebratory banner:

```
🎉 DX-Ray Trace just saved your team ~45 minutes of debugging context!
```

---

### 🧪 5. Simulate Fresh Install — `dx simulate`
Sandboxes your project in a temporary directory and simulates exactly what a **brand-new developer** would experience when cloning your repository for the first time.

**Simulates:**
- Copying project definition files (no `node_modules`)
- Running a fresh `npm install`
- Checking environment variable availability
- Validating runtime version compatibility
- Running the full compatibility scan

**Produces an Onboarding Difficulty rating:**

| Rating | Meaning |
|---|---|
| 🟢 Easy | New dev onboards in < 5 minutes |
| 🟡 Moderate | Expect 15–30 minutes of setup friction |
| 🟠 Hard | New dev will hit multiple blockers (~1 hour) |
| 🔴 Very Hard | Project is currently unreproducible for new devs |

---

### 🤝 6. Peer Drift Comparison — `dx compare`
Export your environment as a YAML snapshot and share it with teammates. DX-Ray Trace will **diff your machine against your peer's snapshot** — pinpointing exactly which runtime versions, dependencies, or environment variables have drifted between the two machines.

```bash
dx export                          # Creates dx-env-snapshot.yaml
dx compare dx-env-snapshot.yaml    # Compare against a teammate's snapshot
```

---

### 📤 7. Environment Snapshot Export — `dx export`
Capture a complete picture of your local environment at any moment in time as a portable YAML file. Share it with your team to reproduce your exact setup.

---

### 📝 8. Spec Generator — `dx init`
Auto-generates a `dx-spec.yaml` project specification file by **introspecting your current environment**. Detects and documents:
- Node.js and Python versions
- All npm dependencies
- Environment variable keys (from `.env` or `.env.example`)
- Required project structure

This spec file becomes your **"source of truth"** that all other scans run against.

---

### 🛡️ 9. Security Scanner
Baked directly into every `dx scan`, the Security Scanner searches across all TypeScript, JavaScript, Python, Ruby, Go, Java, and PHP source files for:
- **Hardcoded `localhost` URLs** that would break in staging/production
- **Hardcoded API secrets** — Stripe test keys (`sk_test_...`), AWS IAM keys (`AKIA...`)
- **Absolute file paths** that only work on one specific machine

When detected, the Auto-Fixer provides an **interactive wizard** to replace each hardcoded value with a proper `process.env.VARIABLE_NAME` reference and automatically injects the original value into your `.env` file.

---

### 🎛️ 10. Beautiful Interactive Menu
Running `dx` with no arguments launches a **full-screen interactive terminal application** with grouped menu sections, arrow-key navigation, and smooth screen transitions:

```
  ── 🔬 Diagnostics ──────────────────────────────
  🔍 Scan Environment    Check your env against the spec
  🔧 Auto-Fix Issues     Resolve detected problems interactively
  🧪 Simulate Fresh Install  Preview new-dev onboarding experience
  ── 🤝 Collaboration ────────────────────────────
  📤 Export Snapshot     Capture your local environment state
  🤝 Compare Peer Env    Diff your machine against a teammate
  ── ⚙️  Setup ────────────────────────────────────
  📝 Init DX Spec        Generate dx-spec.yaml from current env
```

---

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- npm 8 or higher

### Install Globally

```bash
git clone https://github.com/your-username/dx-ray-trace.git
cd dx-ray-trace
npm install
npm run build
npm link
```

Now the `dx` command is available globally everywhere on your machine.

---

## ⚡ Quick Start

```bash
# 1. Point DX-Ray Trace at your project and auto-generate a spec
cd /path/to/your-project
dx init

# 2. Run a full environment scan
dx scan

# 3. Auto-fix all detected issues interactively
dx fix

# 4. Simulate what a new developer experiences
dx simulate

# 5. Export your environment for peer comparison
dx export
```

---

## 🗂️ CLI Reference

| Command | Description |
|---|---|
| `dx` | Launch the beautiful interactive menu |
| `dx init [dir]` | Generate `dx-spec.yaml` from your current environment |
| `dx scan [dir]` | Run a full 10-category compatibility scan |
| `dx fix [dir]` | Auto-fix all detected issues with guided prompts |
| `dx simulate [dir]` | Simulate a fresh developer install |
| `dx export [dir]` | Export your environment as a shareable YAML snapshot |
| `dx compare <snapshot>` | Compare your environment against a peer's snapshot |

---

## 📄 dx-spec.yaml Example

```yaml
# dx-spec.yaml — DX-Ray Trace Project Specification
# Generated by: dx init

name: my-project

runtime:
  node: "20"
  python: "3.11"

dependencies:
  npm: true

env:
  - key: DATABASE_URL
    required: true
  - key: STRIPE_API_KEY
    required: true
  - key: JWT_SECRET
    required: true

ports:
  - 3000
  - 5432

git:
  requireGitignore: true
  requiredIgnores:
    - node_modules
    - .env
    - dist

paths:
  requiredFiles:
    - src/index.ts
    - package.json
  noHardcodedPaths: true
```

---

## 🏆 Hackathon Impact

DX-Ray Trace directly solves one of the **#1 causes of developer productivity loss** — environment inconsistency.

Studies show new developers spend an average of **4–8 hours** setting up a project for the first time. DX-Ray Trace compresses this to **minutes**.

- 🚀 Reduces new developer onboarding from hours to minutes
- 🔒 Prevents accidental secret leaks before they reach version control
- 🤝 Makes distributed team environments perfectly reproducible
- 📊 Gives engineering leads a quantified "DX Health Score" to track over time

---

## 🧱 Architecture

```
src/
├── index.ts              # CLI entry point (commander)
├── menu.ts               # Interactive TUI menu
├── scanner/
│   ├── runtimeScanner.ts # Node/Python version checks
│   ├── depScanner.ts     # npm / pip dependency checks
│   ├── envScanner.ts     # .env key validation & drift
│   ├── pathScanner.ts    # File paths & security scan
│   ├── osScanner.ts      # OS-level tooling checks
│   ├── dockerScanner.ts  # Docker image availability
│   ├── portScanner.ts    # Port conflict detection
│   ├── docsScanner.ts    # Documentation freshness
│   ├── gitScanner.ts     # Git hygiene checks
│   └── structureScanner.ts # Project structure validation
├── fixer/
│   ├── index.ts          # Auto-fixer engine
│   └── scriptGenerator.ts # Manual setup script generator
├── reporter/
│   ├── renderer.ts       # Report orchestration
│   ├── matrix.ts         # Compatibility Matrix table
│   ├── healthSummary.ts  # DX Health Score display
│   ├── issueList.ts      # Interactive drill-down viewer
│   └── score.ts          # Score calculation
├── simulator/
│   └── index.ts          # Fresh install simulator
├── init/
│   └── generator.ts      # spec file auto-generator
└── spec/
    ├── schema.ts          # TypeScript types & interfaces
    └── loader.ts          # YAML spec file loader
```

---

## 📜 License

ISC — Built with ❤️ for the hackathon community.
