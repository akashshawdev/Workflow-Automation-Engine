import React, { useState } from 'react';
import { useWorkflowLogs } from '../hooks/useWorkflows';
import { getWebhookUrl } from '../services/api';

function LogsPanel({ workflowId }) {
  const logs = useWorkflowLogs(workflowId);
  if (!logs.length) return <div style={{ color: 'var(--text3)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No logs yet — run the workflow to see execution details</div>;
  return (
    <div>
      {logs.map(l => (
        <div key={l.id} className={`log-entry log-${l.level}`}>
          <span style={{ opacity: 0.6, marginRight: 8 }}>{new Date(l.ts).toLocaleTimeString()}</span>
          {l.msg}
        </div>
      ))}
    </div>
  );
}

export default function WorkflowList({ store, onNew, onEdit, onDetail, focusId }) {
  const { workflows, toggle, run, remove } = store;
  const [selectedId, setSelectedId] = useState(focusId || null);
  const [tab, setTab] = useState('overview');
  const selected = workflows.find(w => w.id === selectedId);

  const STEP_COLORS = { http: '#3b82f6', condition: '#f59e0b', email: '#22c55e', transform: '#a855f7', delay: '#06b6d4' };
  const STEP_ICONS = { http: '⇄', condition: '⑂', email: '✉', transform: '⟳', delay: '⏱' };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Workflows</span>
        <button className="btn btn-primary" onClick={onNew}>+ New Workflow</button>
      </div>
      <div className="content" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 16 }}>
        <div>
          {workflows.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">⌥</div>
              <p style={{ marginBottom: 16 }}>No workflows created yet</p>
              <button className="btn btn-primary" onClick={onNew}>Create workflow</button>
            </div>
          )}
          {workflows.map(wf => (
            <div key={wf.id} className="wf-row" style={{ cursor: 'pointer', borderColor: selectedId === wf.id ? 'var(--accent)' : undefined }}
              onClick={() => { setSelectedId(wf.id); setTab('overview'); }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wf-name">
                  <span className={`status-dot${wf.active ? ' active' : ''}`} />
                  {wf.name}
                  <span className={`badge badge-${wf.active ? 'active' : 'inactive'}`}>{wf.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="wf-meta">
                  {wf.steps?.length ?? 0} steps · polls every {wf.trigger?.intervalSec || 30}s · {wf.runs ?? 0} runs
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {(wf.steps || []).map((s, i) => (
                    <span key={i} className="badge badge-inactive" style={{ fontSize: 11 }}>
                      <span style={{ color: STEP_COLORS[s.type] || '#888' }}>{STEP_ICONS[s.type] || '•'}</span> {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="wf-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm" onClick={() => onEdit(wf)}>Edit</button>
                <button className="btn btn-sm" onClick={() => toggle(wf)}>{wf.active ? 'Pause' : 'Activate'}</button>
                <button className="btn btn-sm btn-primary" onClick={() => run(wf.id)}>▶</button>
                <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Delete this workflow?')) { remove(wf.id); setSelectedId(null); } }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="card" style={{ position: 'sticky', top: 80, alignSelf: 'start', maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{selected.name}</div>
                <span className={`badge badge-${selected.active ? 'active' : 'inactive'}`}>{selected.active ? '● Active' : 'Inactive'}</span>
              </div>
              <button className="btn btn-sm" onClick={() => setSelectedId(null)}>✕</button>
            </div>

            <div className="tab-row">
              {['overview', 'steps', 'webhook', 'logs'].map(t => (
                <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div>
                <div className="form-group">
                  <div className="form-label">Description</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{selected.description || '—'}</div>
                </div>
                <div className="grid-2" style={{ marginBottom: 12 }}>
                  <div><div className="form-label">Total runs</div><div style={{ fontSize: 20, fontWeight: 600 }}>{selected.runs || 0}</div></div>
                  <div><div className="form-label">Steps</div><div style={{ fontSize: 20, fontWeight: 600 }}>{selected.steps?.length || 0}</div></div>
                </div>
                <div className="form-group">
                  <div className="form-label">Last run</div>
                  <div style={{ fontSize: 13 }}>{selected.lastRun ? new Date(selected.lastRun).toLocaleString() : 'Never'}</div>
                </div>
                <div className="form-group">
                  <div className="form-label">Trigger URL</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--info)', wordBreak: 'break-all' }}>{selected.trigger?.url || '—'}</div>
                </div>
                <div className="form-group">
                  <div className="form-label">Poll interval</div>
                  <div style={{ fontSize: 13 }}>{selected.trigger?.intervalSec || 30} seconds</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => run(selected.id)}>▶ Run now</button>
                  <button className="btn btn-sm" onClick={() => toggle(selected)}>{selected.active ? 'Pause' : 'Activate'}</button>
                  <button className="btn btn-sm" onClick={() => onEdit(selected)}>Edit</button>
                </div>
              </div>
            )}

            {tab === 'steps' && (
              <div>
                {(!selected.steps || selected.steps.length === 0) && <div style={{ color: 'var(--text3)', fontSize: 13 }}>No steps configured</div>}
                {selected.steps?.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: STEP_COLORS[s.type] || '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0, fontWeight: 600 }}>{i + 1}</span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {s.type === 'http' && `${s.method} ${s.url}`}
                        {s.type === 'condition' && `${s.field} ${s.operator} "${s.value}"`}
                        {s.type === 'email' && `To: ${s.to}`}
                        {s.type === 'transform' && s.expression}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'webhook' && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
                  Send a POST request to this URL to trigger the workflow from any external service (Google Forms, Zapier, etc.):
                </p>
                <div className="form-label">Webhook URL</div>
                <div className="webhook-url">{getWebhookUrl(selected.id)}</div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
                  <p>Example with curl:</p>
                  <div className="webhook-url" style={{ marginTop: 6 }}>
                    {`curl -X POST ${getWebhookUrl(selected.id)} \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"John","email":"john@example.com"}'`}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="form-label">Test endpoint</div>
                  <div className="webhook-url">{getWebhookUrl(selected.id).replace('/webhooks/', '/webhooks/')}/test</div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>GET this URL to fire a test execution with sample data</p>
                </div>
              </div>
            )}

            {tab === 'logs' && <LogsPanel workflowId={selected.id} />}
          </div>
        )}
      </div>
    </div>
  );
}
