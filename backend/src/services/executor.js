const axios = require('axios');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Main execution engine - runs a workflow step by step
 * @param {Object} workflow - The workflow definition
 * @param {any} triggerData - Data from the trigger event
 * @param {Function} onLog - Callback to persist log entries
 */
async function executeWorkflow(workflow, triggerData, onLog) {
  const runId = uuidv4();
  const logs = [];

  const log = (msg, level = 'info') => {
    const entry = { id: uuidv4(), runId, ts: new Date().toISOString(), msg, level };
    logs.push(entry);
    logger[level === 'warn' ? 'warn' : level === 'error' ? 'error' : level === 'success' ? 'info' : 'info'](
      `[WF:${workflow.id}] ${msg}`
    );
    if (onLog) onLog(entry);
  };

  log(`Execution started — run ID: ${runId}`);

  // Execution context available to all steps
  const ctx = {
    trigger: triggerData,
    vars: {},
    runId,
    workflowId: workflow.id,
    workflowName: workflow.name
  };

  let stepIndex = 0;
  for (const step of workflow.steps) {
    stepIndex++;
    log(`Step ${stepIndex}/${workflow.steps.length}: [${step.type}] ${step.label}`);

    try {
      const result = await runStep(step, ctx, log);
      if (result === 'STOP') {
        log(`Workflow stopped at step ${stepIndex} by condition`, 'warn');
        break;
      }
    } catch (err) {
      log(`Step ${stepIndex} failed: ${err.message}`, 'error');
      if (step.stopOnError !== false) {
        log('Halting workflow due to step error', 'error');
        break;
      }
    }
  }

  log(`Execution complete — ${stepIndex} step(s) processed`, 'success');
  return { runId, logs, ctx };
}

/**
 * Execute a single step
 */
async function runStep(step, ctx, log) {
  switch (step.type) {
    case 'http':
      return runHttpStep(step, ctx, log);
    case 'condition':
      return runConditionStep(step, ctx, log);
    case 'email':
      return runEmailStep(step, ctx, log);
    case 'transform':
      return runTransformStep(step, ctx, log);
    case 'delay':
      return runDelayStep(step, ctx, log);
    default:
      log(`Unknown step type: ${step.type}`, 'warn');
  }
}

async function runHttpStep(step, ctx, log) {
  const url = interpolate(step.url, ctx);
  const method = (step.method || 'GET').toUpperCase();

  let headers = {};
  try { headers = JSON.parse(interpolate(step.headers || '{}', ctx)); } catch {}

  let body = undefined;
  if (method !== 'GET' && step.body) {
    const raw = interpolate(step.body, ctx);
    try { body = JSON.parse(raw); } catch { body = raw; }
  }

  const res = await axios({ method, url, headers, data: body, timeout: 15000 });

  const saveKey = step.saveAs || 'response';
  ctx.vars[saveKey] = res.data;

  log(`HTTP ${method} ${url} → ${res.status} (saved as ctx.vars.${saveKey})`, 'success');
  return 'CONTINUE';
}

async function runConditionStep(step, ctx, log) {
  const fieldVal = getNestedVal(ctx, step.field);
  const pass = evalCondition(fieldVal, step.operator, step.value);

  log(`Condition: "${step.field}" [${step.operator}] "${step.value}" → ${pass ? 'TRUE ✓' : 'FALSE ✗'}`);

  if (pass) {
    if (step.thenAction === 'stop') return 'STOP';
  } else {
    if (step.elseAction === 'stop') return 'STOP';
  }
  return 'CONTINUE';
}

async function runEmailStep(step, ctx, log) {
  const to = interpolate(step.to, ctx);
  const subject = interpolate(step.subject, ctx);
  const body = interpolate(step.body, ctx);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    log(`Email skipped — SMTP not configured. Would send to: ${to}`, 'warn');
    return 'CONTINUE';
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`
  });

  log(`Email sent to ${to} — subject: "${subject}"`, 'success');
  return 'CONTINUE';
}

async function runTransformStep(step, ctx, log) {
  const fn = new Function('ctx', 'vars', 'trigger', `"use strict"; return (${step.expression})`);
  const result = fn(ctx, ctx.vars, ctx.trigger);
  const saveKey = step.saveAs || 'result';
  ctx.vars[saveKey] = result;
  log(`Transform → ctx.vars.${saveKey} = ${JSON.stringify(result).slice(0, 100)}`, 'success');
  return 'CONTINUE';
}

async function runDelayStep(step, ctx, log) {
  const ms = (parseInt(step.seconds) || 5) * 1000;
  log(`Delay: waiting ${step.seconds || 5}s...`);
  await new Promise(r => setTimeout(r, ms));
  log(`Delay complete`);
  return 'CONTINUE';
}

// --- Helpers ---

function interpolate(template, ctx) {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const val = getNestedVal(ctx, path.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function getNestedVal(ctx, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => acc?.[key], ctx);
}

function evalCondition(val, operator, target) {
  const v = String(val ?? '').toLowerCase().trim();
  const t = String(target ?? '').toLowerCase().trim();
  switch (operator) {
    case 'contains': return v.includes(t);
    case 'equals': return v === t;
    case 'not_equals': return v !== t;
    case 'starts_with': return v.startsWith(t);
    case 'ends_with': return v.endsWith(t);
    case 'is_empty': return !v || v === 'undefined' || v === 'null';
    case 'is_not_empty': return !!(v && v !== 'undefined' && v !== 'null');
    case 'greater_than': return parseFloat(v) > parseFloat(t);
    case 'less_than': return parseFloat(v) < parseFloat(t);
    default: return false;
  }
}

module.exports = { executeWorkflow, interpolate, getNestedVal, evalCondition };
