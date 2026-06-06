const { v4: uuidv4 } = require('uuid');
const { syncWorkflows, loadWorkflows } = require('./jsonbin');
const logger = require('./logger');

// In-memory store (backed by JSONBin)
let workflows = [];
let masterBinId = process.env.JSONBIN_MASTER_BIN_ID || null;
let executionLogs = {}; // workflowId -> logs[]

async function initStore() {
  if (masterBinId) {
    const loaded = await loadWorkflows(masterBinId);
    if (loaded) {
      workflows = loaded;
      logger.info(`Loaded ${workflows.length} workflows from JSONBin bin: ${masterBinId}`);
    }
  }
}

async function persistToCloud() {
  try {
    const newBinId = await syncWorkflows(workflows, masterBinId);
    if (newBinId && !masterBinId) {
      masterBinId = newBinId;
      logger.info(`JSONBin master bin created: ${masterBinId}`);
    }
  } catch (err) {
    logger.error(`Cloud sync failed: ${err.message}`);
  }
}

function getAllWorkflows() {
  return workflows;
}

function getWorkflowById(id) {
  return workflows.find(w => w.id === id) || null;
}

function createWorkflow(data) {
  const wf = {
    id: uuidv4(),
    name: data.name || 'Untitled Workflow',
    description: data.description || '',
    trigger: data.trigger || { type: 'webhook', path: '' },
    steps: data.steps || [],
    active: false,
    runs: 0,
    lastRun: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  workflows.push(wf);
  persistToCloud();
  return wf;
}

function updateWorkflow(id, patch) {
  const idx = workflows.findIndex(w => w.id === id);
  if (idx === -1) return null;
  workflows[idx] = { ...workflows[idx], ...patch, updatedAt: new Date().toISOString() };
  persistToCloud();
  return workflows[idx];
}

function deleteWorkflow(id) {
  const idx = workflows.findIndex(w => w.id === id);
  if (idx === -1) return false;
  workflows.splice(idx, 1);
  delete executionLogs[id];
  persistToCloud();
  return true;
}

function addLog(workflowId, entry) {
  if (!executionLogs[workflowId]) executionLogs[workflowId] = [];
  executionLogs[workflowId].unshift(entry);
  // Keep last 500 logs per workflow
  executionLogs[workflowId] = executionLogs[workflowId].slice(0, 500);
}

function getLogs(workflowId, limit = 100) {
  return (executionLogs[workflowId] || []).slice(0, limit);
}

function getAllLogs(limit = 200) {
  return Object.entries(executionLogs).reduce((acc, [wfId, logs]) => {
    return acc.concat(logs.slice(0, 50).map(l => ({ ...l, workflowId: wfId })));
  }, []).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, limit);
}

function incrementRuns(id) {
  const idx = workflows.findIndex(w => w.id === id);
  if (idx === -1) return;
  workflows[idx].runs = (workflows[idx].runs || 0) + 1;
  workflows[idx].lastRun = new Date().toISOString();
  persistToCloud();
}

function getMasterBinId() { return masterBinId; }
function setMasterBinId(id) { masterBinId = id; }

module.exports = {
  initStore, getAllWorkflows, getWorkflowById, createWorkflow,
  updateWorkflow, deleteWorkflow, addLog, getLogs, getAllLogs,
  incrementRuns, getMasterBinId, setMasterBinId
};
