const express = require('express');
const router = express.Router();
const { getAllWorkflows, getAllLogs } = require('../services/store');
const { getPollerStatus } = require('../services/scheduler');

// GET /api/executions — all recent logs across all workflows
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  const logs = getAllLogs(limit);
  res.json({ data: logs, count: logs.length });
});

// GET /api/executions/stats — dashboard stats
router.get('/stats', (req, res) => {
  const workflows = getAllWorkflows();
  const totalRuns = workflows.reduce((a, w) => a + (w.runs || 0), 0);
  const activeCount = workflows.filter(w => w.active).length;
  const recentLogs = getAllLogs(50);
  const errorCount = recentLogs.filter(l => l.level === 'error').length;

  res.json({
    totalWorkflows: workflows.length,
    activeWorkflows: activeCount,
    totalRuns,
    recentErrors: errorCount,
    activePollers: getPollerStatus().length,
    lastActivity: workflows.reduce((latest, w) => {
      if (!w.lastRun) return latest;
      return !latest || new Date(w.lastRun) > new Date(latest) ? w.lastRun : latest;
    }, null)
  });
});

module.exports = router;
