import React, { useState, useEffect } from 'react';
import { getAllLogs } from '../services/api';

export default function LogsView({ store }) {
  const { workflows } = store;
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try { const res = await getAllLogs(200); setLogs(res.data || []); } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, []);

  const wfMap = Object.fromEntries(workflows.map(w => [w.id, w.name]));

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.level !== filter) return false;
    if (search && !l.msg?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { info: 0, success: 0, warn: 0, error: 0 };
  logs.forEach(l => { if (counts[l.level] !== undefined) counts[l.level]++; });

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Execution Logs</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ width: 220 }}
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ width: 130 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All levels</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="content">
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Info', key: 'info', color: 'var(--accent)' },
            { label: 'Success', key: 'success', color: 'var(--success)' },
            { label: 'Warnings', key: 'warn', color: 'var(--warning)' },
            { label: 'Errors', key: 'error', color: 'var(--danger)' },
          ].map(s => (
            <div key={s.key} className="stat-card" style={{ cursor: 'pointer', borderColor: filter === s.key ? s.color : undefined }}
              onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{counts[s.key]}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">≡</div>
            <p>{logs.length === 0 ? 'No logs yet — run a workflow to see execution details' : 'No logs match the current filter'}</p>
          </div>
        )}

        {filtered.map(l => (
          <div key={l.id} className={`log-entry log-${l.level}`} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <span style={{ opacity: 0.5, flexShrink: 0, fontSize: 11 }}>{new Date(l.ts).toLocaleTimeString()}</span>
            {l.workflowId && wfMap[l.workflowId] && (
              <span style={{ opacity: 0.6, flexShrink: 0, fontSize: 11, fontFamily: 'var(--mono)' }}>[{wfMap[l.workflowId]}]</span>
            )}
            <span>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
