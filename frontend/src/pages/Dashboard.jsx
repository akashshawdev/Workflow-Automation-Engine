import React from 'react';
import { getWebhookUrl } from '../services/api';

export default function Dashboard({ store, onNew, onEdit, onDetail }) {
  const { workflows, stats, loading, run, toggle } = store;

  if (loading) return (
    <div>
      <div className="topbar"><span className="topbar-title">Dashboard</span></div>
      <div className="content"><div className="empty-state"><div className="empty-icon">⟳</div><p>Loading...</p></div></div>
    </div>
  );

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={onNew}>+ New Workflow</button>
        </div>
      </div>
      <div className="content">
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Workflows</div>
            <div className="stat-value">{stats?.totalWorkflows ?? workflows.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.activeWorkflows ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Runs</div>
            <div className="stat-value">{stats?.totalRuns ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Recent Errors</div>
            <div className="stat-value" style={{ color: stats?.recentErrors ? 'var(--danger)' : 'var(--text)' }}>{stats?.recentErrors ?? 0}</div>
          </div>
        </div>

        <div className="section-title">Workflows</div>

        {workflows.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">⌥</div>
            <p style={{ marginBottom: 16 }}>No workflows yet</p>
            <button className="btn btn-primary" onClick={onNew}>Create your first workflow</button>
          </div>
        )}

        {workflows.map(wf => (
          <div key={wf.id} className="wf-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wf-name">
                <span className={`status-dot${wf.active ? ' active' : ''}`} />
                {wf.name}
                <span className={`badge badge-${wf.active ? 'active' : 'inactive'}`}>{wf.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="wf-meta">
                {wf.steps?.length ?? 0} steps · {wf.runs ?? 0} runs
                {wf.lastRun ? ` · Last run: ${new Date(wf.lastRun).toLocaleString()}` : ''}
                {wf.description ? ` · ${wf.description}` : ''}
              </div>
            </div>
            <div className="wf-actions">
              <button className="btn btn-sm" onClick={() => onEdit(wf)}>Edit</button>
              <button className="btn btn-sm" onClick={() => toggle(wf)}>
                {wf.active ? 'Pause' : 'Activate'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => run(wf.id)}>▶ Run</button>
            </div>
          </div>
        ))}

        {stats?.lastActivity && (
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
            Last activity: {new Date(stats.lastActivity).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
