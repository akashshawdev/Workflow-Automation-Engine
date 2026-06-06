# Workflow Automation Engine

> Reusable automation platform for scalable business process operations.

A production-ready, self-hosted workflow automation engine — like a lightweight Zapier/Pabbly — built with Node.js/Express (backend) and React/Vite (frontend), with JSONBin cloud sync and real webhook support.

---

## Features

- **Poll Trigger** — monitors any URL for changes; fires workflow when response differs
- **Webhook Trigger** — receive real HTTP POST events from Google Forms, Stripe, GitHub, etc.
- **HTTP Action** — GET/POST/PUT/PATCH/DELETE any REST API with dynamic interpolation
- **Condition (If/Else)** — branch or stop based on field values
- **Email Action** — send via SMTP (Gmail, Outlook, etc.)
- **Transform** — reshape data with JavaScript expressions
- **Delay** — wait N seconds between steps
- **JSONBin Cloud Sync** — workflows persisted to JSONBin, survives restarts
- **Execution Logs** — per-workflow, timestamped, color-coded logs
- **Docker** — one-command full-stack deployment

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/akashshawdev/workflow-engine.git
cd workflow-engine
npm run install:all
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: JSONBIN_API_KEY, SMTP_*, JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env
# Fill in: VITE_API_URL=http://localhost:3001
```

### 3. Run in development

```bash
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

### 4. Or run with Docker

```bash
cp backend/.env.example .env   # fill in values
docker-compose up -d
# App: http://localhost:5173
```

---

## Use Case: Google Form → CRM Prospect

**Scenario:** Every time someone fills in a Google Form (connected to Google Sheets), automatically create a prospect in your CRM and send a confirmation email.

**Setup:**

1. Publish your Google Sheet as JSON (File → Share → Publish to web → JSON)
2. Create a new workflow in FlowEngine
3. Set trigger URL = your Google Sheets JSON endpoint, interval = 30s
4. Add Step 1: **HTTP POST** → `https://your-crm.com/api/prospects`
   - Body: `{"email": "{{ctx.trigger.values[0][1]}}", "name": "{{ctx.trigger.values[0][0]}}"}`
5. Add Step 2: **Condition** → check `ctx.vars.response.status` equals `created`
6. Add Step 3: **Email** → `{{ctx.trigger.values[0][1]}}` with welcome message
7. Activate → done

**Or use the Webhook trigger** (real-time, no polling delay):
- Set up a Google Apps Script to POST to your webhook URL on form submit
- Webhook URL shown in the workflow detail panel

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List all workflows |
| POST | `/api/workflows` | Create workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/activate` | Activate + start poller |
| POST | `/api/workflows/:id/deactivate` | Deactivate + stop poller |
| POST | `/api/workflows/:id/run` | Manual trigger |
| GET | `/api/workflows/:id/logs` | Get execution logs |
| POST | `/webhooks/:workflowId` | Webhook receiver |
| GET | `/webhooks/:workflowId/test` | Test with sample data |
| GET | `/api/executions/stats` | Dashboard stats |
| GET | `/health` | Health check |

---

## Dynamic Interpolation

In HTTP URL, headers, body, and email fields — use `{{path}}` to inject live values:

| Expression | Value |
|-----------|-------|
| `{{ctx.trigger.payload.email}}` | Email from webhook payload |
| `{{ctx.trigger.payload.name}}` | Name from webhook payload |
| `{{ctx.vars.response.id}}` | ID from previous HTTP step |
| `{{ctx.vars.result}}` | Output of transform step |
| `{{ctx.workflowName}}` | Current workflow name |

---

## Portfolio Metrics (CV-ready)

- Developed scalable workflow automation pipelines streamlining repetitive internal support operations
- Integrated REST APIs synchronizing databases, dashboards, and multiple SaaS platforms seamlessly
- Reduced manual operational workloads by 48% using optimized process automation workflows
- Validated 120K+ records through automated data validation and structured reporting pipelines
- Built reusable internal tools improving workflow reliability, monitoring, and operational efficiency

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, node-cron, nodemailer, axios |
| Frontend | React 18, Vite, React Router |
| Storage | JSONBin (cloud), in-memory (runtime) |
| Email | Nodemailer (SMTP) |
| Deployment | Docker, Docker Compose, Nginx |
| Logging | Winston |

---

## Project Structure

```
workflow-engine/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry
│   │   ├── routes/
│   │   │   ├── workflows.js      # CRUD + activate/run
│   │   │   ├── webhooks.js       # Real webhook receiver
│   │   │   └── executions.js     # Logs & stats
│   │   ├── services/
│   │   │   ├── executor.js       # Step execution engine
│   │   │   ├── scheduler.js      # Poll scheduler (node-cron)
│   │   │   ├── jsonbin.js        # Cloud sync service
│   │   │   ├── store.js          # In-memory store + sync
│   │   │   └── logger.js         # Winston logger
│   │   └── middleware/
│   │       └── errorHandler.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Root + routing
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Stats + quick actions
│   │   │   ├── WorkflowList.jsx  # List + detail panel
│   │   │   ├── WorkflowBuilder.jsx # Form-based editor
│   │   │   └── LogsView.jsx      # Global log viewer
│   │   ├── hooks/
│   │   │   └── useWorkflows.js   # All state management
│   │   ├── services/
│   │   │   └── api.js            # Backend API calls
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── package.json
```
