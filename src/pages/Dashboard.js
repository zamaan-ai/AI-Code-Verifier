import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Shield, Activity, Clock, Play, RefreshCw,
  ChevronRight, CheckCircle, Loader
} from 'lucide-react';
import { getDashboard, startScan } from '../services/api';
import './Dashboard.css';

const severityColors = {
  critical: 'var(--critical)',
  high: 'var(--high)',
  medium: 'var(--medium)',
  low: 'var(--low)',
  info: 'var(--info)'
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    try {
      const res = await getDashboard();
      setData(res.data);
      if (res.data.runningScanId) setScanning(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNewScan = async () => {
    if (!data?.recentProjects?.[0]) return;
    setScanning(true);
    try {
      await startScan({ projectId: data.recentProjects[0]._id, scope: 'full' });
      load();
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  if (loading) {
    return <div className="loading-state"><Loader className="spin" size={24} /> Loading dashboard...</div>;
  }

  const severity = data?.severityBreakdown || {};
  const pipeline = data?.pipelineStatus;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Air-gapped verification overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleNewScan} disabled={scanning}>
            {scanning ? <Loader size={14} className="spin" /> : <Play size={14} />}
            {scanning ? 'Scanning...' : 'New Scan'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="cards-grid">
        <div className="card metric-card">
          <div className="metric-label">Overall Risk Score</div>
          <div className="metric-value" style={{ color: data.riskScore > 60 ? 'var(--critical)' : data.riskScore > 40 ? 'var(--high)' : 'var(--success)' }}>
            {data.riskScore}
          </div>
          <div className="metric-sub">Average across projects</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">Open Findings</div>
          <div className="metric-value">{data.totalOpenFindings}</div>
          <div className="severity-pills">
            {Object.entries(severity).map(([sev, count]) => count > 0 && (
              <span key={sev} className={`badge badge-${sev}`}>{count} {sev}</span>
            ))}
          </div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">False Positive Rate</div>
          <div className="metric-value">{((data.fpRate || 0) * 100).toFixed(1)}%</div>
          <div className="metric-sub">Estimated from past reviews</div>
        </div>
        <div className="card metric-card">
          <div className="metric-label">WCET Compliance</div>
          <div className="metric-value" style={{ color: 'var(--success)' }}>
            {((data.wcetCompliance || 0) * 100).toFixed(0)}%
          </div>
          <div className="metric-sub">Functions within deadline</div>
        </div>
      </div>

      {/* Pipeline Status */}
      {pipeline && (
        <div className="card pipeline-card">
          <div className="pipeline-header">
            <Activity size={16} />
            <span>Pipeline Status</span>
            <span className="badge badge-info">Running</span>
          </div>
          <div className="pipeline-stages">
            {['ast', 'gnn', 'sae', 'z3'].map((stage) => {
              const s = pipeline[stage] || {};
              const status = s.status || 'pending';
              return (
                <div key={stage} className={`stage ${status}`}>
                  <div className="stage-icon">
                    {status === 'completed' ? <CheckCircle size={16} /> :
                     status === 'running' ? <Loader size={16} className="spin" /> :
                     <Clock size={16} />}
                  </div>
                  <div className="stage-name">{stage.toUpperCase()}</div>
                  <div className="stage-bar">
                    <div className="stage-fill" style={{ width: `${s.progress || 0}%` }} />
                  </div>
                  <div className="stage-pct">{s.progress || 0}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Recent Findings */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Findings</h3>
            <Link to="/findings" className="link-more">View all <ChevronRight size={14} /></Link>
          </div>
          <div className="findings-list">
            {(data.recentFindings || []).slice(0, 5).map((f) => (
              <Link to={`/findings/${f._id}`} key={f._id} className="finding-row">
                <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                <div className="finding-info">
                  <div className="finding-title">{f.title}</div>
                  <div className="finding-meta">{f.filePath} · {f.cwe}</div>
                </div>
                <div className="finding-conf">{(f.confidence * 100).toFixed(0)}%</div>
              </Link>
            ))}
            {(!data.recentFindings || data.recentFindings.length === 0) && (
              <div className="empty-msg">No open findings</div>
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Scans</h3>
            <Link to="/history" className="link-more">History <ChevronRight size={14} /></Link>
          </div>
          <div className="scans-list">
            {(data.recentScans || []).map((s) => (
              <div key={s._id} className="scan-row">
                <div>
                  <div className="scan-project">{s.projectId?.name || 'Unknown'}</div>
                  <div className="scan-meta">
                    {s.scope} · {s.status} · {s.summary?.totalFindings || 0} findings
                  </div>
                </div>
                <div className="scan-risk">{s.summary?.riskScore ?? '—'}</div>
              </div>
            ))}
            {(!data.recentScans || data.recentScans.length === 0) && (
              <div className="empty-msg">No scans yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
