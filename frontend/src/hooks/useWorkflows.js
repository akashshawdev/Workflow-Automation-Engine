import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

export function useWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await api.getWorkflows();
      setWorkflows(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchWorkflows(), fetchStats()]);
    setLoading(false);
  }, [fetchWorkflows, fetchStats]);

  useEffect(() => {
    load();
    const interval = setInterval(() => { fetchWorkflows(); fetchStats(); }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const create = async (data) => {
    const res = await api.createWorkflow(data);
    await fetchWorkflows();
    return res.data;
  };

  const update = async (id, data) => {
    const res = await api.updateWorkflow(id, data);
    await fetchWorkflows();
    return res.data;
  };

  const remove = async (id) => {
    await api.deleteWorkflow(id);
    await fetchWorkflows();
  };

  const toggle = async (wf) => {
    if (wf.active) await api.deactivateWorkflow(wf.id);
    else await api.activateWorkflow(wf.id);
    await fetchWorkflows();
  };

  const run = async (id) => {
    const res = await api.runWorkflow(id);
    await fetchWorkflows();
    return res;
  };

  return { workflows, stats, loading, error, create, update, remove, toggle, run, refresh: load };
}

export function useWorkflowLogs(workflowId) {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    if (!workflowId) return;
    const fetch = async () => {
      try {
        const res = await api.getWorkflowLogs(workflowId);
        setLogs(res.data || []);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [workflowId]);
  return logs;
}
