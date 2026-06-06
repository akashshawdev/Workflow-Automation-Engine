const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getAllWorkflows, addLog, incrementRuns } = require('../services/store');
const { executeWorkflow } = require('../services/executor');
const logger = require('../services/logger');

/**
 * POST /webhooks/:workflowId
 * Real webhook receiver — any external service can POST here to trigger a workflow
 * Supports optional HMAC-SHA256 signature verification
 */
router.post('/:workflowId', async (req, res) => {
  const { workflowId } = req.params;

  const workflows = getAllWorkflows();
  const wf = workflows.find(w => w.id === workflowId);

  if (!wf) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  if (!wf.active) {
    return res.status(200).json({ message: 'Workflow is inactive, event ignored' });
  }

  // Optional signature verification (for production security)
  if (wf.trigger?.webhookSecret) {
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-signature'];
    if (signature) {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expected = 'sha256=' + crypto.createHmac('sha256', wf.trigger.webhookSecret).update(rawBody).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        logger.warn(`Webhook signature mismatch for workflow ${workflowId}`);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
  }

  // Parse body
  let payload;
  try {
    payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  } catch {
    payload = req.body?.toString() || {};
  }

  // Enrich trigger data with HTTP context
  const triggerData = {
    payload,
    headers: req.headers,
    method: req.method,
    query: req.query,
    ip: req.ip,
    receivedAt: new Date().toISOString()
  };

  logger.info(`Webhook received for workflow "${wf.name}" from ${req.ip}`);

  // Acknowledge immediately (webhooks should respond fast)
  res.status(202).json({
    message: 'Webhook received, workflow triggered',
    workflowId,
    workflowName: wf.name,
    triggeredAt: triggerData.receivedAt
  });

  // Execute async (don't block the response)
  setImmediate(async () => {
    try {
      addLog(workflowId, {
        id: uuidv4(), ts: new Date().toISOString(),
        msg: `Webhook received from ${req.ip} — executing workflow`, level: 'info'
      });
      await executeWorkflow(wf, triggerData, (entry) => addLog(workflowId, entry));
      incrementRuns(workflowId);
    } catch (err) {
      logger.error(`Webhook execution failed for ${workflowId}: ${err.message}`);
      addLog(workflowId, {
        id: uuidv4(), ts: new Date().toISOString(),
        msg: `Execution failed: ${err.message}`, level: 'error'
      });
    }
  });
});

/**
 * GET /webhooks/:workflowId/test
 * Test endpoint — fire a test event with sample data
 */
router.get('/:workflowId/test', async (req, res) => {
  const { workflowId } = req.params;
  const workflows = getAllWorkflows();
  const wf = workflows.find(w => w.id === workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const sampleData = {
    payload: { test: true, name: 'Test User', email: 'test@example.com', timestamp: new Date().toISOString() },
    headers: { 'content-type': 'application/json' },
    receivedAt: new Date().toISOString()
  };

  try {
    const { runId, logs } = await executeWorkflow(wf, sampleData, (entry) => addLog(workflowId, entry));
    incrementRuns(workflowId);
    res.json({ runId, logs, sampleData, message: 'Test execution complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
