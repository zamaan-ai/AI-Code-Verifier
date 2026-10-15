import React, { useEffect, useState } from 'react';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { getProjects, getWCET, runWCET } from '../services/api';
import './WCETAnalyzer.css';

export default function WCETAnalyzer() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [arch, setArch] = useState('x86_64');
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects().then(res => {
      setProjects(res.data);
      if (res.data.length) setSelectedProject(res.data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (selectedProject) {
      getWCET({ projectId: selectedProject }).then(res => {
        setResults(res.data);
        if (res.data.length) setCurrent(res.data[0]);
      });
    }
  }, [selectedProject]);

  const handleRun = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const res = await runWCET({ projectId: selectedProject, architecture: arch });
      setCurrent(res.data);
      setResults([res.data, ...results]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wcet-page">
      <div className="page-header">
        <div>
          <h1>WCET Analyzer</h1>
          <p>Worst-Case Execution Time vs deadline thresholds</p>
        </div>
      </div>

      <div className="card controls-bar">
        <div className="control-group">
          <label>Project</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>CPU / Architecture</label>
          <select value={arch} onChange={e => setArch(e.target.value)}>
            <option value="x86_64">x86_64</option>
            <option value="armv8">ARMv8-A</option>
            <option value="armv7">ARMv7-M (Cortex-M)</option>
            <option value="riscv64">RISC-V 64</option>
            <option value="powerpc">PowerPC</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
          <Play size={14} /> {loading ? 'Analyzing...' : 'Run WCET Analysis'}
        </button>
      </div>

      {current && (
        <>
          <div className="card overall-status">
            Overall Status:{' '}
            <span className={`badge badge-${current.overallStatus === 'pass' ? 'low' : 'critical'}`}>
              {current.overallStatus.toUpperCase()}
            </span>
            <span className="arch-label">Architecture: {current.architecture}</span>
          </div>

          <div className="card table-container">
            <table>
              <thead>
                <tr>
                  <th>Function</th>
                  <th>File</th>
                  <th>WCET (cycles)</th>
                  <th>Deadline</th>
                  <th>Margin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(current.functions || []).map((fn, i) => (
                  <tr key={i}>
                    <td className="mono">{fn.functionName}</td>
                    <td className="mono file-cell">{fn.filePath}</td>
                    <td>{fn.wcetCycles?.toLocaleString()}</td>
                    <td>{fn.deadlineCycles?.toLocaleString()}</td>
                    <td style={{ color: fn.margin >= 0 ? 'var(--success)' : 'var(--critical)' }}>
                      {fn.margin >= 0 ? '+' : ''}{fn.margin?.toLocaleString()}
                    </td>
                    <td>
                      {fn.status === 'pass' ? (
                        <span className="status-icon pass"><CheckCircle size={14} /> Pass</span>
                      ) : (
                        <span className="status-icon fail"><XCircle size={14} /> Fail</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple timeline visualization */}
          <div className="card">
            <h3 style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-secondary)' }}>Timeline vs Deadline</h3>
            <div className="timeline">
              {(current.functions || []).map((fn, i) => {
                const maxD = Math.max(...current.functions.map(f => f.deadlineCycles));
                const wcetPct = (fn.wcetCycles / maxD) * 100;
                const deadlinePct = (fn.deadlineCycles / maxD) * 100;
                return (
                  <div key={i} className="timeline-row">
                    <div className="timeline-label">{fn.functionName}</div>
                    <div className="timeline-bar-wrap">
                      <div className="timeline-deadline" style={{ width: `${deadlinePct}%` }} />
                      <div
                        className={`timeline-wcet ${fn.status}`}
                        style={{ width: `${wcetPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!current && !loading && (
        <div className="card empty-msg" style={{ padding: 40 }}>
          Select a project and run WCET analysis
        </div>
      )}
    </div>
  );
}
