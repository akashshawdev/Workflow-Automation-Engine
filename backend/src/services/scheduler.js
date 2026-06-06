const cron = require('node-cron');
const axios = require('axios');
const { getAllWorkflows, addLog, incrementRuns } = require('./store');
const { executeWorkflow } = require('./executor');
const logger = require('./logger');

// Active pollers: workflowId -> { task, lastHash }
const pollers = new Map();

function initScheduler() {
  // Master tick every 10 seconds — checks which workflows need polling
  cron.schedule('*/10 * * * * *', () => {
    syncPollers();
  });
  logger.info('Scheduler initialized — syncing pollers every 10s');
}

function syncPollers() {
  const workflows = getAllWorkflows();

  // Start pollers for active polling workflows
  for (const wf of workflows) {
    if (wf.active && wf.trigger?.type === 'poll') {
      if (!pollers.has(wf.id)) {
        startPoller(wf);
      }
    }
  }

  // Stop pollers for inactive/deleted workflows
  for (const [id, poller] of pollers.entries()) {
    const wf = workflows.find(w => w.id === id);
    if (!wf || !wf.active) {
      stopPoller(id);
    }
  }
}

function startPoller(wf) {
  if (!wf.trigger?.url) {
    logger.warn(`Workflow ${wf.id} has no trigger URL, skipping poller`);
    return;
  }

  logger.info(`Starting poller for workflow "${wf.name}" every ${wf.trigger.intervalSec || 30}s`);

  const state = { lastHash: null, wfId: wf.id };
  pollers.set(wf.id, state);

  // Run immediately, then on interval
  runPoll(wf, state);
  state.intervalHandle = setInterval(() => {
    // Re-fetch latest workflow config in case it was updated
    const latest = getAllWorkflows().find(w => w.id === wf.id);
    if (latest && latest.active) runPoll(latest, state);
    else stopPoller(wf.id);
  }, (wf.trigger.intervalSec || 30) * 1000);
}

async function runPoll(wf, state) {
  try {
    const res = await axios.get(wf.trigger.url, { timeout: 10000 });
    const dataStr = JSON.stringify(res.data);

    if (state.lastHash === null) {
      // First poll — baseline, do not trigger
      state.lastHash = dataStr;
      addLog(wf.id, { id: require('uuid').v4(), ts: new Date().toISOString(), msg: `Poller baseline set for ${wf.trigger.url}`, level: 'info' });
      return;
    }

    if (dataStr !== state.lastHash) {
      state.lastHash = dataStr;
      logger.info(`Change detected for workflow "${wf.name}" — triggering execution`);

      addLog(wf.id, { id: require('uuid').v4(), ts: new Date().toISOString(), msg: `Change detected at ${wf.trigger.url} — executing workflow`, level: 'info' });

      const { logs } = await executeWorkflow(wf, res.data, (entry) => addLog(wf.id, entry));
      incrementRuns(wf.id);
    }
  } catch (err) {
    addLog(wf.id, {
      id: require('uuid').v4(), ts: new Date().toISOString(),
      msg: `Poll error: ${err.message}`, level: 'error'
    });
    logger.error(`Poll error for workflow ${wf.id}: ${err.message}`);
  }
}

function stopPoller(id) {
  const state = pollers.get(id);
  if (state?.intervalHandle) clearInterval(state.intervalHandle);
  pollers.delete(id);
  logger.info(`Stopped poller for workflow ${id}`);
}

function getPollerStatus() {
  return Array.from(pollers.keys());
}

module.exports = { initScheduler, startPoller, stopPoller, getPollerStatus };
