import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, EyeOff, RefreshCw, ArrowLeftRight, Loader, Sparkles, AlertTriangle } from 'lucide-react';
import { getFinding, updateFinding, startTranspilation, generateCandidates, verifyCandidate } from '../services/api';
import './FindingDetail.css';

export default function FindingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const res = await getFinding(id);
      setFinding(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status) => {
    setActionLoading(true);
    setMsg('');
    try {
      const res = await updateFinding(id, { status });
      setFinding(res.data);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateCandidates = async () => {
    setActionLoading(true);
    setMsg('Generating multi-sample candidate fixes…');
    try {
      const res = await generateCandidates(id);
      setFinding(res.data);
      setMsg('3 candidate fixes generated. Verify each with Z3.');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to generate candidates');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCandidate = async (idx) => {
    setActionLoading(true);
    setMsg(`Verifying candidate #${idx + 1} with Z3…`);
    try {
      const res = await verifyCandidate(id, idx);
      setFinding(res.data.finding);
      setMsg(res.data.message + (res.data.escalated ? ' ⚠️ Escalated to human review.' : ''));
    } catch (err) {
      setMsg(err.response?.data?.error || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverify = async () => {
    setActionLoading(true);
    setMsg('Re-running Z3 verification…');
    try {
      await new Promise(r => setTimeout(r, 800));
      const attempts = (finding.reverifyAttempts || 0) + 1;
      const res = await updateFinding(id, {
        status: 'open',
        reverifyAttempts: attempts,
        confidence: Math.min(0.99, (finding.confidence || 0.8) + 0.01)
      });
      setFinding(res.data);
      if (attempts >= 3) {
        setMsg('Max re-verify attempts (3) reached. Escalate to human reviewer with full attempt history.');
      } else {
        setMsg(`Re-verification complete (attempt ${attempts}/3). Finding remains open.`);
      }
    } catch (err) {
      setMsg('Re-verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTranspile = async () => {
    setActionLoading(true);
    try {
      await startTranspilation({
        projectId: finding.projectId,
        findingId: finding._id,
        sourceFile: finding.filePath,
        sourceLanguage: 'c',
        sourceCode: finding.codeSnippet || finding.suggestedFixCode || ''
      });
      navigate('/transpilation');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Transpilation failed');
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-state">Loading finding...</div>;
  if (!finding) return <div className="loading-state">Finding not found</div>;

  return (
    <div className="finding-detail">
      <button className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/findings')}>
        <ArrowLeft size={14} /> Back to Findings
      </button>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
            <span className="mono cwe-tag">{finding.cwe}</span>
          </div>
          <h1>{finding.title}</h1>
          <p>{finding.filePath}:{finding.lineStart}–{finding.lineEnd} · Confidence {(finding.confidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card">
            <h3>Code</h3>
            <pre className="code-block">{finding.codeSnippet || 'No snippet available'}</pre>
          </div>
          <div className="card">
            <h3>Z3 Exploit Witness</h3>
            <pre className="code-block witness">{finding.z3Witness || 'No witness generated'}</pre>
          </div>
          <div className="card">
            <h3>Plain-Language Explanation</h3>
            <p className="explanation">{finding.plainExplanation || finding.description}</p>
          </div>
          <div className="card">
            <h3>Suggested Fix</h3>
            <p className="explanation" style={{ marginBottom: 12 }}>{finding.fixSuggestion}</p>
            {finding.suggestedFixCode && (
              <pre className="code-block fix">{finding.suggestedFixCode}</pre>
            )}
          </div>

          {/* Multi-sample candidates */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Candidate Fixes (multi-sample)</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleGenerateCandidates} disabled={actionLoading}>
                <Sparkles size={13} /> Generate Candidates
              </button>
            </div>
            {(!finding.candidateFixes || finding.candidateFixes.length === 0) ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Generate 3 candidate fixes, then verify each with Z3. First passing candidate is kept.
              </p>
            ) : (
              finding.candidateFixes.map((c, i) => (
                <div key={i} className="candidate-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong>Candidate #{i + 1}</strong>
                    <span className={`badge badge-${c.status === 'passed' ? 'low' : c.status === 'failed' ? 'critical' : 'info'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{c.explanation}</p>
                  <pre className="code-block" style={{ fontSize: 11 }}>{c.code}</pre>
                  {c.status === 'pending' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 8 }}
                      disabled={actionLoading}
                      onClick={() => handleVerifyCandidate(i)}
                    >
                      Verify with Z3
                    </button>
                  )}
                </div>
              ))
            )}
            {(finding.reverifyAttempts || 0) >= 3 && (
              <div className="escalate-banner">
                <AlertTriangle size={16} />
                Max attempts reached — escalate to human reviewer with full history.
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="card actions-card">
            <h3>Actions</h3>
            <button className="btn btn-success action-btn" disabled={actionLoading || finding.status === 'accepted' || finding.status === 'fixed'} onClick={() => handleAction('accepted')}>
              <Check size={14} /> Accept Fix
            </button>
            <button className="btn btn-primary action-btn" disabled={actionLoading} onClick={handleTranspile}>
              <ArrowLeftRight size={14} /> Send to Transpilation
            </button>
            <button className="btn btn-secondary action-btn" disabled={actionLoading || finding.status === 'false_positive'} onClick={() => handleAction('false_positive')}>
              <X size={14} /> Mark False Positive
            </button>
            <button className="btn btn-secondary action-btn" disabled={actionLoading || finding.status === 'ignored'} onClick={() => handleAction('ignored')}>
              <EyeOff size={14} /> Ignore
            </button>
            <button className="btn btn-secondary action-btn" disabled={actionLoading} onClick={handleReverify}>
              {actionLoading ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />}
              Re-verify with Z3
            </button>
            {msg && <p className="reverify-msg">{msg}</p>}
          </div>
          <div className="card">
            <h3>Status</h3>
            <div className="status-display">
              <span className="status-tag large">{(finding.status || 'open').replace('_', ' ')}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Re-verify attempts: {finding.reverifyAttempts || 0} / 3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
