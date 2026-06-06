import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import WorkflowList from './pages/WorkflowList';
import WorkflowBuilder from './pages/WorkflowBuilder';
import LogsView from './pages/LogsView';
import { useWorkflows } from './hooks/useWorkflows';
import './index.css';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const store = useWorkflows();

  const nav = (v, wf = null) => {
    setView(v);
    if (wf !== undefined) setEditingWorkflow(wf);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⟳</span>
          <div>
            <div className="brand-name">Workflow Automation Engine</div>
            <div className="brand-sub">Business Process Automation</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {[
            { id: 'dashboard', icon: '▦', label: 'Dashboard' },
            { id: 'workflows', icon: '⌥', label: 'Workflows' },
            { id: 'logs', icon: '≡', label: 'Execution Logs' }
          ].map(n => (
            <button
              key={n.id}
              className={`nav-item${view === n.id ? ' active' : ''}`}
              onClick={() => nav(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}

          {store.workflows.length > 0 && (
            <>
              <div className="nav-section-label" style={{ marginTop: 16 }}>Workflows</div>
              {store.workflows.map(wf => (
                <button
                  key={wf.id}
                  className={`nav-item nav-item-wf${selectedWorkflowId === wf.id ? ' active' : ''}`}
                  onClick={() => { setSelectedWorkflowId(wf.id); nav('detail'); }}
                >
                  <span className={`status-dot${wf.active ? ' active' : ''}`} />
                  <span className="wf-nav-label">{wf.name}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="server-status">
            <span className={`status-dot${store.error ? '' : ' active'}`} />
            <span>{store.error ? 'Backend offline' : 'Connected'}</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        {view === 'dashboard' && (
          <Dashboard
            store={store}
            onNew={() => nav('builder', null)}
            onEdit={(wf) => nav('builder', wf)}
            onDetail={(wf) => { setSelectedWorkflowId(wf.id); nav('detail'); }}
          />
        )}
        {view === 'workflows' && (
          <WorkflowList
            store={store}
            onNew={() => nav('builder', null)}
            onEdit={(wf) => nav('builder', wf)}
            onDetail={(wf) => { setSelectedWorkflowId(wf.id); nav('detail'); }}
          />
        )}
        {view === 'builder' && (
          <WorkflowBuilder
            workflow={editingWorkflow}
            store={store}
            onSave={async (wf) => {
              if (wf.id) await store.update(wf.id, wf);
              else await store.create(wf);
              nav('workflows');
            }}
            onCancel={() => nav('workflows')}
          />
        )}
        {view === 'logs' && <LogsView store={store} />}
        {view === 'detail' && (
          <WorkflowList
            store={store}
            focusId={selectedWorkflowId}
            onNew={() => nav('builder', null)}
            onEdit={(wf) => nav('builder', wf)}
            onDetail={(wf) => { setSelectedWorkflowId(wf.id); }}
          />
        )}
      </main>
    </div>
  );
}
