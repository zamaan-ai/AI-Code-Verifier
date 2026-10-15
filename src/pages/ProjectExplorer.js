import React, { useEffect, useState } from 'react';
import { FolderTree, FileCode, Play, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { getProjects, createProject, startScan } from '../services/api';
import './ProjectExplorer.css';

const langIcons = { c: 'C', cpp: 'C++', rust: 'Rs', h: 'H' };

export default function ProjectExplorer() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [scope, setScope] = useState('full');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState({ name: '', rootPath: '', language: 'c' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data);
      if (res.data.length && !selected) setSelected(res.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    try {
      const res = await createProject({
        ...importForm,
        status: 'imported',
        files: [
          { path: 'src/main.c', name: 'main.c', language: importForm.language, riskScore: 0, size: 1000 }
        ]
      });
      setProjects([res.data, ...projects]);
      setSelected(res.data);
      setShowImport(false);
      setImportForm({ name: '', rootPath: '', language: 'c' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleScan = async () => {
    if (!selected) return;
    try {
      await startScan({ projectId: selected._id, scope });
      alert('Scan started — check Dashboard for pipeline progress');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="loading-state">Loading projects...</div>;

  return (
    <div className="project-explorer">
      <div className="page-header">
        <div>
          <h1>Project / File Explorer</h1>
          <p>Local codebase navigation — air-gapped import only</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowImport(true)}>
          <Plus size={14} /> Import Project
        </button>
      </div>

      {showImport && (
        <div className="card import-form">
          <h3>Import Local Project</h3>
          <form onSubmit={handleImport}>
            <div className="form-row">
              <label>Project Name</label>
              <input required value={importForm.name} onChange={e => setImportForm({ ...importForm, name: e.target.value })} placeholder="My Firmware" />
            </div>
            <div className="form-row">
              <label>Root Path (local)</label>
              <input required value={importForm.rootPath} onChange={e => setImportForm({ ...importForm, rootPath: e.target.value })} placeholder="/opt/projects/my-firmware" />
            </div>
            <div className="form-row">
              <label>Primary Language</label>
              <select value={importForm.language} onChange={e => setImportForm({ ...importForm, language: e.target.value })}>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Import</button>
            </div>
          </form>
        </div>
      )}

      <div className="explorer-layout">
        <div className="card file-tree">
          <div className="tree-header">Projects</div>
          {projects.map(p => (
            <div key={p._id}>
              <div
                className={`tree-item project ${selected?._id === p._id ? 'selected' : ''}`}
                onClick={() => { setSelected(p); toggleExpand(p._id); }}
              >
                {expanded[p._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FolderTree size={14} />
                <span className="tree-name">{p.name}</span>
                {p.riskScore > 0 && <span className="risk-badge">{p.riskScore}</span>}
              </div>
              {expanded[p._id] && (p.files || []).map(f => (
                <div key={f.path} className="tree-item file">
                  <FileCode size={13} />
                  <span className="tree-name">{f.name}</span>
                  <span className="lang-tag">{langIcons[f.language] || f.language}</span>
                  {f.riskScore > 0 && <span className="risk-badge small">{f.riskScore}</span>}
                </div>
              ))}
            </div>
          ))}
          {projects.length === 0 && <div className="empty-msg">No projects imported</div>}
        </div>

        <div className="card project-detail">
          {selected ? (
            <>
              <h2>{selected.name}</h2>
              <p className="desc">{selected.description || 'No description'}</p>
              <div className="meta-grid">
                <div><span className="meta-label">Path</span><span className="mono">{selected.rootPath}</span></div>
                <div><span className="meta-label">Language</span><span>{selected.language}</span></div>
                <div><span className="meta-label">Status</span><span className="badge badge-info">{selected.status}</span></div>
                <div><span className="meta-label">Risk Score</span><span style={{ fontWeight: 700, fontSize: 18 }}>{selected.riskScore}</span></div>
                <div><span className="meta-label">Files</span><span>{(selected.files || []).length}</span></div>
              </div>

              <div className="scope-picker">
                <label>Scan Scope</label>
                <div className="scope-options">
                  {['full', 'diff', 'folder', 'file'].map(s => (
                    <button
                      key={s}
                      className={`scope-btn ${scope === s ? 'active' : ''}`}
                      onClick={() => setScope(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleScan} style={{ marginTop: 16 }}>
                <Play size={14} /> Run Pipeline Scan
              </button>
            </>
          ) : (
            <div className="empty-msg">Select a project</div>
          )}
        </div>
      </div>
    </div>
  );
}
