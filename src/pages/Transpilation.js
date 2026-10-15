import React, { useEffect, useState } from 'react';
import { Check, X, Edit, Loader, Save, GitMerge } from 'lucide-react';
import { getTranspilations, updateTranspilation } from '../services/api';
import './Transpilation.css';

export default function Transpilation() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [mergeMsg, setMergeMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const res = await getTranspilations();
      setItems(res.data);
      if (res.data.length && !selected) setSelected(res.data[0]);
      else if (selected) {
        const updated = res.data.find(i => i._id === selected._id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    setActionLoading(true);
    setMergeMsg('');
    try {
      await updateTranspilation(id, { status });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = () => {
    setEditCode(selected?.rustCode || '');
    setEditing(true);
    setMergeMsg('');
  };

  const saveEdit = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await updateTranspilation(selected._id, { rustCode: editCode, status: 'completed' });
      setSelected(res.data);
      setEditing(false);
      setMergeMsg('Rust code updated successfully.');
      await load();
    } catch (err) {
      console.error(err);
      setMergeMsg('Failed to save edit.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selected) return;
    setActionLoading(true);
    setMergeMsg('Merging accepted Rust into local codebase…');
    try {
      await new Promise(r => setTimeout(r, 900));
      await updateTranspilation(selected._id, { status: 'accepted' });
      setMergeMsg(`Merged successfully into local path for ${selected.sourceFile}. (Simulated write in air-gapped mode)`);
      await load();
    } catch (err) {
      console.error(err);
      setMergeMsg('Merge failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="transpilation-page">
      <div className="page-header">
        <div>
          <h1>Transpilation</h1>
          <p>C/C++ → Rust · Borrow-checker validation · Edit & Merge</p>
        </div>
      </div>

      <div className="trans-layout">
        <div className="card queue-list">
          <div className="queue-header">Batch Queue</div>
          {loading && items.length === 0 ? (
            <div className="empty-msg">Loading...</div>
          ) : items.length === 0 ? (
            <div className="empty-msg">No transpilation jobs. Send a finding from the detail view.</div>
          ) : items.map(item => (
            <div
              key={item._id}
              className={`queue-item ${selected?._id === item._id ? 'selected' : ''}`}
              onClick={() => { setSelected(item); setEditing(false); setMergeMsg(''); }}
            >
              <div className="queue-file">{item.sourceFile}</div>
              <div className="queue-meta">
                <span className={`badge badge-${item.status === 'completed' || item.status === 'accepted' ? 'low' : item.status === 'failed' || item.status === 'rejected' ? 'critical' : 'info'}`}>
                  {item.status}
                </span>
                {item.status === 'processing' && <Loader size={12} className="spin" />}
                <span className="progress-text">{item.progress}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="diff-panel">
          {selected ? (
            <>
              <div className="diff-header card">
                <div>
                  <strong>{selected.sourceFile}</strong>
                  <span className="borrow-status">
                    Borrow-checker:{' '}
                    <span className={`badge badge-${selected.borrowCheckerStatus === 'pass' ? 'low' : selected.borrowCheckerStatus === 'fail' ? 'critical' : 'medium'}`}>
                      {selected.borrowCheckerStatus}
                    </span>
                  </span>
                </div>
                <div className="diff-actions">
                  {!editing && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={startEdit} disabled={actionLoading}>
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAction(selected._id, 'accepted')}
                        disabled={selected.status === 'accepted' || actionLoading}
                      >
                        <Check size={13} /> Accept
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAction(selected._id, 'rejected')}
                        disabled={actionLoading}
                      >
                        <X size={13} /> Reject
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleMerge}
                        disabled={actionLoading || selected.status === 'rejected'}
                      >
                        <GitMerge size={13} /> Merge into Codebase
                      </button>
                    </>
                  )}
                  {editing && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={actionLoading}>
                        <Save size={13} /> Save Edit
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {mergeMsg && (
                <div className="card merge-msg">{mergeMsg}</div>
              )}

              <div className="diff-views">
                <div className="card code-pane">
                  <div className="pane-label">Original ({selected.sourceLanguage?.toUpperCase() || 'C'})</div>
                  <pre className="code-block">{selected.sourceCode || '// Source code not available'}</pre>
                </div>
                <div className="card code-pane">
                  <div className="pane-label">Rust Output {editing && <span style={{ color: 'var(--accent)' }}>(editing)</span>}</div>
                  {editing ? (
                    <textarea
                      className="code-editor"
                      value={editCode}
                      onChange={e => setEditCode(e.target.value)}
                      rows={16}
                      spellCheck={false}
                    />
                  ) : (
                    <pre className="code-block rust">
                      {selected.rustCode || (selected.status === 'processing' ? '// Transpiling...' : '// Not yet generated')}
                    </pre>
                  )}
                </div>
              </div>

              {selected.borrowCheckerErrors?.length > 0 && (
                <div className="card errors-card">
                  <h4>Borrow-Checker Warnings</h4>
                  <ul>
                    {selected.borrowCheckerErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="card empty-msg" style={{ padding: 60 }}>Select a job from the queue</div>
          )}
        </div>
      </div>
    </div>
  );
}
