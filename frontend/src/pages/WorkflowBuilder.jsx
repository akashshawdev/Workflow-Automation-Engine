import React, { useState } from 'react';

const STEP_TYPES = [
  { type: 'http', label: 'HTTP Request', icon: '⇄', color: '#3b82f6', desc: 'Call any REST API' },
  { type: 'condition', label: 'Condition', icon: '⑂', color: '#f59e0b', desc: 'If/else branching logic' },
  { type: 'email', label: 'Send Email', icon: '✉', color: '#22c55e', desc: 'Send via SMTP' },
  { type: 'transform', label: 'Transform', icon: '⟳', color: '#a855f7', desc: 'Map & reshape data' },
  { type: 'delay', label: 'Delay', icon: '⏱', color: '#06b6d4', desc: 'Wait N seconds' },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

function defaultStep(type) {
  const base = { id: uid(), type, label: STEP_TYPES.find(s => s.type === type)?.label || type, stopOnError: true };
  if (type === 'http') return { ...base, method: 'GET', url: '', headers: '{\n  "Content-Type": "application/json"\n}', body: '', saveAs: 'response' };
  if (type === 'condition') return { ...base, field: '', operator: 'contains', value: '', thenAction: 'continue', elseAction: 'stop' };
  if (type === 'email') return { ...base, to: '', subject: '', body: '' };
  if (type === 'transform') return { ...base, expression: '', saveAs: 'result' };
  if (type === 'delay') return { ...base, seconds: 5 };
  return base;
}

function StepEditor({ step, index, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const meta = STEP_TYPES.find(s => s.type === step.type);

  return (
    <div className="step-block">
      <div className="step-header" onClick={() => setOpen(o => !o)}>
        <span className="step-num" style={{ background: meta?.color || '#555', color: '#fff' }}>{index + 1}</span>
        <span style={{ color: meta?.color, fontSize: 16, marginRight: 2 }}>{meta?.icon}</span>
        <span className="step-label">{step.label}</span>
        <button className="btn btn-sm btn-danger" style={{ padding: '3px 7px' }} onClick={e => { e.stopPropagation(); onRemove(); }}>✕</button>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="step-body">
          <div className="form-group">
            <label className="form-label">Step label</label>
            <input className="form-input" value={step.label} onChange={e => onChange({ ...step, label: e.target.value })} />
          </div>

          {step.type === 'http' && <>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-select" value={step.method} onChange={e => onChange({ ...step, method: e.target.value })}>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">URL</label>
                <input className="form-input" value={step.url} placeholder="https://api.example.com/endpoint" onChange={e => onChange({ ...step, url: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Headers (JSON)</label>
              <textarea className="form-textarea" value={step.headers} rows={3} onChange={e => onChange({ ...step, headers: e.target.value })} />
            </div>
            {step.method !== 'GET' && (
              <div className="form-group">
                <label className="form-label">Body — use {'{{ctx.trigger.payload.field}}'} for dynamic values</label>
                <textarea className="form-textarea" value={step.body} rows={4} placeholder={'{\n  "email": "{{ctx.trigger.payload.email}}"\n}'} onChange={e => onChange({ ...step, body: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Save response as</label>
              <input className="form-input" value={step.saveAs} placeholder="response" onChange={e => onChange({ ...step, saveAs: e.target.value })} />
              <div className="form-hint">Access as <code>{'{{ctx.vars.' + (step.saveAs || 'response') + '}}'}</code> in later steps</div>
            </div>
          </>}

          {step.type === 'condition' && <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 8 }}>
              <div className="form-group">
                <label className="form-label">Field path</label>
                <input className="form-input" value={step.field} placeholder="ctx.trigger.payload.email" onChange={e => onChange({ ...step, field: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Operator</label>
                <select className="form-select" value={step.operator} onChange={e => onChange({ ...step, operator: e.target.value })}>
                  {['contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'].map(o => (
                    <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Value</label>
                <input className="form-input" value={step.value} onChange={e => onChange({ ...step, value: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">If TRUE →</label>
                <select className="form-select" value={step.thenAction} onChange={e => onChange({ ...step, thenAction: e.target.value })}>
                  <option value="continue">Continue to next step</option>
                  <option value="stop">Stop workflow</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">If FALSE →</label>
                <select className="form-select" value={step.elseAction} onChange={e => onChange({ ...step, elseAction: e.target.value })}>
                  <option value="stop">Stop workflow</option>
                  <option value="continue">Continue to next step</option>
                </select>
              </div>
            </div>
          </>}

          {step.type === 'email' && <>
            <div className="form-group">
              <label className="form-label">To — supports {'{{ctx.trigger.payload.email}}'}</label>
              <input className="form-input" value={step.to} placeholder="recipient@example.com" onChange={e => onChange({ ...step, to: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" value={step.subject} placeholder="New lead: {{ctx.trigger.payload.name}}" onChange={e => onChange({ ...step, subject: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Body</label>
              <textarea className="form-textarea" value={step.body} rows={5} onChange={e => onChange({ ...step, body: e.target.value })} />
            </div>
          </>}

          {step.type === 'transform' && <>
            <div className="form-group">
              <label className="form-label">JS expression (access ctx, vars, trigger)</label>
              <textarea className="form-textarea" value={step.expression} rows={4} placeholder="ctx.trigger.payload.name?.toUpperCase()" onChange={e => onChange({ ...step, expression: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Save result as</label>
              <input className="form-input" value={step.saveAs} placeholder="result" onChange={e => onChange({ ...step, saveAs: e.target.value })} />
            </div>
          </>}

          {step.type === 'delay' && (
            <div className="form-group">
              <label className="form-label">Wait (seconds)</label>
              <input className="form-input" type="number" min={1} max={300} value={step.seconds} onChange={e => onChange({ ...step, seconds: parseInt(e.target.value) || 5 })} />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
              <input type="checkbox" checked={step.stopOnError !== false} onChange={e => onChange({ ...step, stopOnError: e.target.checked })} />
              Stop workflow if this step fails
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowBuilder({ workflow, store, onSave, onCancel }) {
  const [wf, setWf] = useState(() => workflow ? { ...workflow } : {
    name: 'New Workflow', description: '',
    trigger: { type: 'poll', url: '', intervalSec: 30 },
    steps: []
  });
  const [saving, setSaving] = useState(false);

  const setTrigger = (k, v) => setWf(w => ({ ...w, trigger: { ...w.trigger, [k]: v } }));
  const addStep = (type) => setWf(w => ({ ...w, steps: [...w.steps, defaultStep(type)] }));
  const updateStep = (i, step) => setWf(w => { const s = [...w.steps]; s[i] = step; return { ...w, steps: s }; });
  const removeStep = (i) => setWf(w => ({ ...w, steps: w.steps.filter((_, j) => j !== i) }));
  const moveStep = (i, dir) => setWf(w => {
    const s = [...w.steps];
    const j = i + dir;
    if (j < 0 || j >= s.length) return w;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...w, steps: s };
  });

  const handleSave = async () => {
    if (!wf.name.trim()) return alert('Workflow name is required');
    setSaving(true);
    try { await onSave(wf); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{workflow ? `Edit: ${workflow.name}` : 'New Workflow'}</span>
        <div className="topbar-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '✓ Save Workflow'}
          </button>
        </div>
      </div>

      <div className="content" style={{ maxWidth: 760 }}>
        <div className="card">
          <div className="card-title">Workflow Info</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={wf.name} onChange={e => setWf(w => ({ ...w, name: e.target.value }))} placeholder="Google Form → CRM Prospect" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={wf.description} onChange={e => setWf(w => ({ ...w, description: e.target.value }))} placeholder="What does this workflow do?" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Trigger — Poll URL for Changes</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">URL to poll</label>
              <input className="form-input" value={wf.trigger.url} placeholder="https://sheets.googleapis.com/v4/spreadsheets/.../values/A1:Z" onChange={e => setTrigger('url', e.target.value)} />
              <div className="form-hint">Engine polls this URL every N seconds. Workflow fires when response changes.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Interval (seconds)</label>
              <input className="form-input" type="number" min={10} value={wf.trigger.intervalSec} onChange={e => setTrigger('intervalSec', parseInt(e.target.value) || 30)} />
            </div>
          </div>
          <hr className="divider" />
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            For real-time webhooks (Google Forms, Stripe, GitHub, etc.) — after saving, use the <strong>Webhook URL</strong> shown in the workflow detail panel.
            New data arrives as <code>ctx.trigger.payload</code> in your steps.
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Steps ({wf.steps.length})</div>
            <div className="step-picker">
              {STEP_TYPES.map(s => (
                <button key={s.type} className="step-type-btn" onClick={() => addStep(s.type)} title={s.desc}>
                  <span style={{ color: s.color }}>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          {wf.steps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>
              Add steps above to build your workflow pipeline
            </div>
          )}

          {wf.steps.map((step, i) => (
            <div key={step.id}>
              {i > 0 && <div className="step-connector">↓</div>}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', right: -36, top: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {i > 0 && <button className="btn btn-icon btn-sm" onClick={() => moveStep(i, -1)} title="Move up">↑</button>}
                  {i < wf.steps.length - 1 && <button className="btn btn-icon btn-sm" onClick={() => moveStep(i, 1)} title="Move down">↓</button>}
                </div>
                <StepEditor step={step} index={i} onChange={s => updateStep(i, s)} onRemove={() => removeStep(i)} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '✓ Save Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
}
