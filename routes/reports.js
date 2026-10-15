const express = require('express');
const router = express.Router();
const Scan = require('../models/Scan');
const Finding = require('../models/Finding');
const Project = require('../models/Project');

// Generate report data
router.post('/generate', async (req, res) => {
  try {
    const { projectId, template, format } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const latestScan = await Scan.findOne({ projectId }).sort({ createdAt: -1 });
    const findings = await Finding.find({ projectId });

    const openFindings = findings.filter(f => f.status === 'open' || f.status === 'accepted');
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;

    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        template: template || 'general',
        format: format || 'json',
        airGapped: true,
        tool: 'Air-Gapped AI Code Verifier v1.1'
      },
      project: {
        name: project.name,
        riskScore: project.riskScore,
        language: project.language,
        rootPath: project.rootPath
      },
      scan: latestScan ? {
        id: latestScan._id,
        completedAt: latestScan.completedAt,
        scope: latestScan.scope,
        summary: latestScan.summary
      } : null,
      summary: {
        totalFindings: findings.length,
        critical,
        high,
        open: openFindings.length,
        fpRate: latestScan?.summary?.fpRate ?? 0.07
      },
      findings: findings.map(f => ({
        severity: f.severity,
        cwe: f.cwe,
        title: f.title,
        filePath: f.filePath,
        confidence: f.confidence,
        status: f.status
      })),
      mandates: getMandateMappings(template),
      compliance: {
        template,
        mappings: getMandateMappings(template)
      }
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getMandateMappings(template) {
  const maps = {
    defense: ['CISA BOD 22-01', 'NSA Memory Safety', 'DoD DevSecOps'],
    automotive: ['ISO 26262 ASIL', 'UNECE R155', 'AUTOSAR'],
    medtech: ['IEC 62304', 'FDA Premarket Cybersecurity', 'ISO 14971'],
    financial: ['PCI DSS', 'SOC 2', 'FFIEC'],
    general: ['CWE Top 25', 'OWASP', 'NIST SSDF']
  };
  return maps[template] || maps.general;
}

module.exports = router;
