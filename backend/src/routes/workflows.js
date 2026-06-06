const express = require('express');
const router = express.Router();
const {
  getAllWorkflows, getWorkflowById, createWorkflow,
  updateWorkflow, deleteWorkflow, getLogs, getMasterBinId
} = require('../services/store');
const { executeWorkflow } = require('../services/executor');
const { addLog, incrementRuns } = require('../services/store');
const { startPoller, stopPoller, getPollerStatus } = require('../services/scheduler');

// GET /api/workflows — list all
router.get('/', (req, res) => {
  const workflows = getAllWorkflows();
  res.json({
    data: workflows,
    count: workflows.length,
    activePollers: getPollerStatus(),
    masterBinId: getMasterBinId()
  });
});

// GET /api/workflows/:id — single workflow
router.get('/:id', (req, res) => {
  const wf = getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ data: wf, logs: getLogs(wf.id) });
});

// POST /api/workflows — create
router.post('/', (req, res) => {
  const { name, description, trigger, steps } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const wf = createWorkflow({ name, description, trigger, steps });
  res.status(201).json({ data: wf, message: 'Workflow created' });
});

// PUT /api/workflows/:id — update
router.put('/:id', (req, res) => {
  const wf = getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const updated = updateWorkflow(req.params.id, req.body);
  res.json({ data: updated, message: 'Workflow updated' });
});

// DELETE /api/workflows/:id
router.delete('/:id', (req, res) => {
  const deleted = deleteWorkflow(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Workflow not found' });
  stopPoller(req.params.id);
  res.json({ message: 'Workflow deleted' });
});

// POST /api/workflows/:id/activate — toggle active + start/stop poller
router.post('/:id/activate', (req, res) => {
  const wf = getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const updated = updateWorkflow(req.params.id, { active: true });
  if (updated.trigger?.type === 'poll') startPoller(updated);
  res.json({ data: updated, message: 'Workflow activated' });
});

router.post('/:id/deactivate', (req, res) => {
  const wf = getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const updated = updateWorkflow(req.params.id, { active: false });
  stopPoller(req.params.id);
  res.json({ data: updated, message: 'Workflow deactivated' });
});

// POST /api/workflows/:id/run — manual trigger
router.post('/:id/run', async (req, res) => {
  const wf = getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  try {
    const triggerData = req.body?.data || { manual: true, triggeredAt: new Date().toISOString() };
    const { runId, logs } = await executeWorkflow(wf, triggerData, (entry) => addLog(wf.id, entry));
    incrementRuns(wf.id);
    res.json({ runId, logs, message: 'Workflow executed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id/logs
router.get('/:id/logs', (req, res) => {
  const wf = getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const limit = parseInt(req.query.limit) || 100;
  res.json({ data: getLogs(wf.id, limit) });
});

module.exports = router;
