const axios = require('axios');
const logger = require('./logger');

const BASE_URL = process.env.JSONBIN_BASE_URL || 'https://api.jsonbin.io/v3';
const API_KEY = process.env.JSONBIN_API_KEY;

const jsonbinClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Master-Key': API_KEY
  }
});

/**
 * Create a new bin for a workflow
 */
async function createBin(name, data) {
  if (!API_KEY) throw new Error('JSONBIN_API_KEY not configured');
  const res = await jsonbinClient.post('/b', data, {
    headers: { 'X-Bin-Name': `workflow-${name}`, 'X-Bin-Private': 'true' }
  });
  logger.info(`JSONBin: created bin ${res.data.metadata.id} for "${name}"`);
  return res.data.metadata.id;
}

/**
 * Read a bin by ID
 */
async function readBin(binId) {
  if (!API_KEY) throw new Error('JSONBIN_API_KEY not configured');
  const res = await jsonbinClient.get(`/b/${binId}/latest`);
  return res.data.record;
}

/**
 * Update a bin by ID
 */
async function updateBin(binId, data) {
  if (!API_KEY) throw new Error('JSONBIN_API_KEY not configured');
  const res = await jsonbinClient.put(`/b/${binId}`, data);
  logger.debug(`JSONBin: updated bin ${binId}`);
  return res.data.record;
}

/**
 * Delete a bin by ID
 */
async function deleteBin(binId) {
  if (!API_KEY) throw new Error('JSONBIN_API_KEY not configured');
  await jsonbinClient.delete(`/b/${binId}`);
  logger.info(`JSONBin: deleted bin ${binId}`);
}

/**
 * List all bins in the account (uses search API)
 */
async function listBins() {
  if (!API_KEY) throw new Error('JSONBIN_API_KEY not configured');
  const res = await jsonbinClient.get('/b?sortBy=createdAt&order=desc');
  return res.data || [];
}

/**
 * Sync an entire workflows array to a single master bin
 */
async function syncWorkflows(workflows, masterBinId) {
  if (!API_KEY) {
    logger.warn('JSONBin: API key not set, skipping cloud sync');
    return null;
  }
  try {
    if (masterBinId) {
      await updateBin(masterBinId, { workflows, syncedAt: new Date().toISOString() });
      return masterBinId;
    } else {
      const id = await createBin('master', { workflows, syncedAt: new Date().toISOString() });
      return id;
    }
  } catch (err) {
    logger.error(`JSONBin sync failed: ${err.message}`);
    throw err;
  }
}

/**
 * Load workflows from master bin
 */
async function loadWorkflows(masterBinId) {
  if (!API_KEY || !masterBinId) return null;
  try {
    const data = await readBin(masterBinId);
    return data.workflows || [];
  } catch (err) {
    logger.error(`JSONBin load failed: ${err.message}`);
    return null;
  }
}

module.exports = { createBin, readBin, updateBin, deleteBin, listBins, syncWorkflows, loadWorkflows };
