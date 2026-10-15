import React, { useEffect, useState } from 'react';
import { GitCompare, X } from 'lucide-react';
import { getScans } from '../services/api';
import './ScanHistory.css';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    getScans()
      .then(res => setScans(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const scanA = scans.find(s => s._id === selectedA);
  const scanB = scans.find(s => s._id === selectedB);

  const delta = (a, b) => {
    if (a == null || b == null) return '—';
    const d = a - b;
    if (d === 0) return '0';
    return d > 0 ? `+${d}` : `${d}`;
  };

  const deltaClass = (a, b) => {
    if (a == null || b == null) return '';
    const d = a - b;
    if (d > 0) return 'delta-up';
    if (d < 0) return 'delta-down';
    return 'delta-same';
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h1>Scan History</h1>
          <p>Past sessions with summary deltas & comparison</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setShowCompare(!showCompare)}
          disabled={scans.length < 2}
        >
          <GitCompare size={14} />
          {showCompare ? 'Hide Comparison' : 'Compare Scans'}
        </button>
      </div>

      {showCompare && (
        <div className="card compare-panel">
          <div className="compare-header">
            <h3>Diff-to-Previous Scan Comparison</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCompare(false)}>
              <X size={13} /> Close
            </button>
          </div>
          <div className="compare-selectors">
            <div className="control-group">
              <label>Base Scan (older)</label>
              <select value={selectedA} onChange={e => setSelectedA(e.target.value)}>
                <option value="">Select scan…</option>
                {scans.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.projectId?.name || 'Project'} — {s.completedAt ? new Date(s.completedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()} ({s.summary?.totalFindings ?? 0} findings)
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label>Compare Scan (newer)</label>
              <select value={selectedB} onChange={e => setSelectedB(e.target.value)}>
                <option value="">Select scan…</option>
                {scans.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.projectId?.name || 'Project'} — {s.completedAt ? new Date(s.completedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()} ({s.summary?.totalFindings ?? 0} findings)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {scanA && scanB && (
            <div className="compare-results">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Base</th>
                    <th>Compare</th>
                    <th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Findings</td>
                    <td>{scanA.summary?.totalFindings ?? '—'}</td>
                    <td>{scanB.summary?.totalFindings ?? '—'}</td>
                    <td className={deltaClass(scanB.summary?.totalFindings, scanA.summary?.totalFindings)}>
                      {delta(scanB.summary?.totalFindings, scanA.summary?.totalFindings)}
                    </td>
                  </tr>
                  <tr>
                    <td>Risk Score</td>
                    <td>{scanA.summary?.riskScore ?? '—'}</td>
                    <td>{scanB.summary?.riskScore ?? '—'}</td>
                    <td className={deltaClass(scanB.summary?.riskScore, scanA.summary?.riskScore)}>
                      {delta(scanB.summary?.riskScore, scanA.summary?.riskScore)}
                    </td>
                  </tr>
                  <tr>
                    <td>Critical</td>
                    <td style={{ color: 'var(--critical)' }}>{scanA.summary?.critical ?? 0}</td>
                    <td style={{ color: 'var(--critical)' }}>{scanB.summary?.critical ?? 0}</td>
                    <td className={deltaClass(scanB.summary?.critical, scanA.summary?.critical)}>
                      {delta(scanB.summary?.critical, scanA.summary?.critical)}
                    </td>
                  </tr>
                  <tr>
                    <td>High</td>
                    <td style={{ color: 'var(--high)' }}>{scanA.summary?.high ?? 0}</td>
                    <td style={{ color: 'var(--high)' }}>{scanB.summary?.high ?? 0}</td>
                    <td className={deltaClass(scanB.summary?.high, scanA.summary?.high)}>
                      {delta(scanB.summary?.high, scanA.summary?.high)}
                    </td>
                  </tr>
                  <tr>
                    <td>Medium</td>
                    <td>{scanA.summary?.medium ?? 0}</td>
                    <td>{scanB.summary?.medium ?? 0}</td>
                    <td className={deltaClass(scanB.summary?.medium, scanA.summary?.medium)}>
                      {delta(scanB.summary?.medium, scanA.summary?.medium)}
                    </td>
                  </tr>
                  <tr>
                    <td>FP Rate</td>
                    <td>{scanA.summary?.fpRate != null ? `${(scanA.summary.fpRate * 100).toFixed(1)}%` : '—'}</td>
                    <td>{scanB.summary?.fpRate != null ? `${(scanB.summary.fpRate * 100).toFixed(1)}%` : '—'}</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td>Scope</td>
                    <td><span className="scope-tag">{scanA.scope}</span></td>
                    <td><span className="scope-tag">{scanB.scope}</span></td>
                    <td>{scanA.scope === scanB.scope ? 'Same' : 'Different'}</td>
                  </tr>
                </tbody>
              </table>
              <p className="compare-note">
                Negative delta (green) means improvement. Positive delta (red) means more issues found.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Project</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Findings</th>
              <th>Risk Score</th>
              <th>Critical</th>
              <th>High</th>
              <th>FP Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>Loading...</td></tr>
            ) : scans.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No scans yet</td></tr>
            ) : scans.map(s => (
              <tr key={s._id}>
                <td>{s.completedAt ? new Date(s.completedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.projectId?.name || '—'}</td>
                <td><span className="scope-tag">{s.scope}</span></td>
                <td>
                  <span className={`badge badge-${s.status === 'completed' ? 'low' : s.status === 'running' ? 'info' : s.status === 'failed' ? 'critical' : 'medium'}`}>
                    {s.status}
                  </span>
                </td>
                <td>{s.summary?.totalFindings ?? '—'}</td>
                <td style={{ fontWeight: 600 }}>{s.summary?.riskScore ?? '—'}</td>
                <td style={{ color: 'var(--critical)' }}>{s.summary?.critical ?? 0}</td>
                <td style={{ color: 'var(--high)' }}>{s.summary?.high ?? 0}</td>
                <td>{s.summary?.fpRate != null ? `${(s.summary.fpRate * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
