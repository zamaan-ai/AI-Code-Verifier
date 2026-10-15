import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFindings } from '../services/api';
import './Findings.css';

export default function Findings() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ severity: '', status: 'open', search: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 50 });

  useEffect(() => {
    load();
  }, [filters.severity, filters.status, page]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 50 };
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await getFindings(params);
      // Support both old array shape and new { items, pagination }
      if (Array.isArray(res.data)) {
        setFindings(res.data);
        setPagination({ total: res.data.length, pages: 1, limit: 50 });
      } else {
        setFindings(res.data.items || []);
        setPagination(res.data.pagination || { total: 0, pages: 1, limit: 50 });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load findings');
      setFindings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="findings-page">
      <div className="page-header">
        <div>
          <h1>Findings</h1>
          <p>Vulnerability list — server-side filter, sort & pagination</p>
        </div>
      </div>

      <div className="filters-bar card">
        <div className="search-box">
          <Search size={14} />
          <input
            placeholder="Search title, file, CWE..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), load())}
          />
        </div>
        <select value={filters.severity} onChange={e => { setFilters({ ...filters, severity: e.target.value }); setPage(1); }}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
        <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="accepted">Accepted</option>
          <option value="false_positive">False Positive</option>
          <option value="ignored">Ignored</option>
          <option value="fixed">Fixed</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => { setPage(1); load(); }}>
          <Filter size={13} /> Apply
        </button>
      </div>

      {error && <div className="card" style={{ color: 'var(--critical)', marginBottom: 12 }}>{error}</div>}

      <div className="card table-container">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>CWE</th>
              <th>Title</th>
              <th>File</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading...</td></tr>
            ) : findings.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No findings</td></tr>
            ) : findings.map(f => (
              <tr key={f._id}>
                <td><span className={`badge badge-${f.severity}`}>{f.severity}</span></td>
                <td className="mono">{f.cwe}</td>
                <td><Link to={`/findings/${f._id}`}>{f.title}</Link></td>
                <td className="mono" style={{ fontSize: 12 }}>{f.filePath}:{f.lineStart}</td>
                <td>{(f.confidence * 100).toFixed(0)}%</td>
                <td><span className="status-tag">{(f.status || '').replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
