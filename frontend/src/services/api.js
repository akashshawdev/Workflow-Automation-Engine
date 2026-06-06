import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' }
});

// Workflows
export const getWorkflows = () => api.get('/api/workflows').then(r => r.data);
export const getWorkflow = (id) => api.get(`/api/workflows/${id}`).then(r => r.data);
export const createWorkflow = (data) => api.post('/api/workflows', data).then(r => r.data);
export const updateWorkflow = (id, data) => api.put(`/api/workflows/${id}`, data).then(r => r.data);
export const deleteWorkflow = (id) => api.delete(`/api/workflows/${id}`).then(r => r.data);
export const activateWorkflow = (id) => api.post(`/api/workflows/${id}/activate`).then(r => r.data);
export const deactivateWorkflow = (id) => api.post(`/api/workflows/${id}/deactivate`).then(r => r.data);
export const runWorkflow = (id, data) => api.post(`/api/workflows/${id}/run`, { data }).then(r => r.data);
export const getWorkflowLogs = (id, limit = 100) => api.get(`/api/workflows/${id}/logs?limit=${limit}`).then(r => r.data);

// Executions & stats
export const getStats = () => api.get('/api/executions/stats').then(r => r.data);
export const getAllLogs = (limit = 200) => api.get(`/api/executions?limit=${limit}`).then(r => r.data);

// Health
export const checkHealth = () => api.get('/health').then(r => r.data);

// Webhook URL helper
export const getWebhookUrl = (workflowId) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/webhooks/${workflowId}`;

export default api;
