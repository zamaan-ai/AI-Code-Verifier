import React, { useEffect, useState, useRef } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { getProjects, generateReport } from '../services/api';
import './Compliance.css';

const templates = [
  { id: 'defense', label: 'Defense', mandates: 'CISA BOD 22-01, NSA Memory Safety, DoD DevSecOps' },
  { id: 'automotive', label: 'Automotive', mandates: 'ISO 26262, UNECE R155, AUTOSAR' },
  { id: 'medtech', label: 'MedTech', mandates: 'IEC 62304, FDA Cybersecurity, ISO 14971' },
  { id: 'financial', label: 'Financial', mandates: 'PCI DSS, SOC 2, FFIEC' },
  { id: 'general', label: 'General', mandates: 'CWE Top 25, OWASP, NIST SSDF' },
];

export default function Compliance() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [template, setTemplate] = useState('general');
  const [format, setFormat] = useState('json');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    getProjects().then(res => {
      setProjects(res.data);
      if (res.data.length) setProjectId(res.data[0]._id);
    });
  }, []);

  const handleGenerate = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await generateReport({ projectId, template, format });
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${template}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    if (!report) return;
    // Open a print-friendly window so user can "Save as PDF"
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow pop-ups to print / save as PDF');
      return;
    }

    const findingsRows = (report.findings || []).map(f => `
      <tr>
        <td>${f.severity || ''}</td>
        <td>${f.cwe || ''}</td>
        <td>${f.title || ''}</td>
        <td>${f.filePath || ''}</td>
        <td>${f.status || ''}</td>
      </tr>
    `).join('');

    const mandates = (report.mandates || []).map(m => `<li>${m}</li>`).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compliance Report – ${report.project?.name || 'Project'}</title>
        <style>
          body { font-family: Inter, system-ui, sans-serif; padding: 32px; color: #0f172a; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
          ul { margin: 8px 0; padding-left: 20px; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Air-Gapped AI Code Verifier — Compliance Report</h1>
        <div class="meta">
          Generated: ${report.meta?.generatedAt || new Date().toISOString()} · 
          Template: <span class="badge">${report.meta?.template || template}</span> · 
          Air-Gapped: Yes · No external telemetry
        </div>

        <h2>Project</h2>
        <p><strong>${report.project?.name || '—'}</strong><br/>
        Language: ${report.project?.language || '—'} · Risk Score: ${report.project?.riskScore ?? '—'}</p>

        <h2>Applicable Mandates</h2>
        <ul>${mandates || '<li>None specified</li>'}</ul>

        <h2>Summary</h2>
        <p>
          Total Findings: <strong>${report.summary?.totalFindings ?? (report.findings || []).length}</strong> · 
          Critical: ${report.summary?.critical ?? 0} · 
          High: ${report.summary?.high ?? 0} · 
          Open: ${report.summary?.open ?? '—'}
        </p>

        <h2>Findings</h2>
        <table>
          <thead>
            <tr><th>Severity</th><th>CWE</th><th>Title</th><th>File</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${findingsRows || '<tr><td colspan="5">No findings</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          This report was generated in air-gapped mode. All analysis remained on-premises.<br/>
          Tool: Air-Gapped AI Code Verifier v1.1
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  return (
    <div className="compliance-page">
      <div className="page-header">
        <div>
          <h1>Compliance / Reports</h1>
          <p>Exportable audit reports with domain templates (JSON + Print/PDF)</p>
        </div>
      </div>

      <div className="templates-info">
        {templates.map(t => (
          <div
            key={t.id}
            className={`card template-card ${template === t.id ? 'active' : ''}`}
            onClick={() => setTemplate(t.id)}
          >
            <div className="template-name">{t.label}</div>
            <div className="template-mandates">{t.mandates}</div>
          </div>
        ))}
      </div>

      <div className="card controls-bar">
        <div className="control-group">
          <label>Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>Domain Template</label>
          <select value={template} onChange={e => setTemplate(e.target.value)}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)}>
            <option value="json">JSON</option>
            <option value="pdf">PDF (via Print)</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || !projectId}>
          <FileText size={14} />
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      {report && (
        <div className="card report-preview" ref={printRef}>
          <div className="report-header">
            <div>
              <h3>Report Ready</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {report.project?.name} · {report.meta?.template} · {report.meta?.generatedAt?.slice(0, 19) || ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleDownloadJSON}>
                <Download size={14} /> Download JSON
              </button>
              <button className="btn btn-primary" onClick={handlePrintPDF}>
                <Printer size={14} /> Print / Save as PDF
              </button>
            </div>
          </div>

          <div className="report-body">
            <div className="report-section">
              <h4>Project</h4>
              <p>{report.project?.name} (Risk: {report.project?.riskScore ?? '—'})</p>
            </div>
            <div className="report-section">
              <h4>Mandates</h4>
              <ul>
                {(report.mandates || []).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
            <div className="report-section">
              <h4>Findings Summary</h4>
              <p>
                Total: {report.summary?.totalFindings ?? (report.findings || []).length} · 
                Critical: {report.summary?.critical ?? 0} · 
                High: {report.summary?.high ?? 0}
              </p>
            </div>
            {(report.findings || []).length > 0 && (
              <div className="report-section">
                <h4>Findings ({report.findings.length})</h4>
                <div className="mini-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>CWE</th>
                        <th>Title</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.findings.slice(0, 20).map((f, i) => (
                        <tr key={i}>
                          <td><span className={`badge badge-${f.severity}`}>{f.severity}</span></td>
                          <td className="mono">{f.cwe}</td>
                          <td>{f.title}</td>
                          <td>{f.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.findings.length > 20 && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      …and {report.findings.length - 20} more (see full JSON or PDF)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
