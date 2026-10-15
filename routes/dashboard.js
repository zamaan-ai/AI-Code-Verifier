const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Scan = require('../models/Scan');
const Finding = require('../models/Finding');

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ updatedAt: -1 }).limit(5);
    const latestScans = await Scan.find().sort({ createdAt: -1 }).limit(5).populate('projectId', 'name');
    const openFindings = await Finding.find({ status: 'open' }).sort({ severity: 1 }).limit(10);

    const severityCounts = await Finding.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const severityMap = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    severityCounts.forEach(s => { severityMap[s._id] = s.count; });

    const totalOpen = Object.values(severityMap).reduce((a, b) => a + b, 0);
    const avgRisk = projects.length
      ? Math.round(projects.reduce((sum, p) => sum + (p.riskScore || 0), 0) / projects.length)
      : 0;

    // Latest pipeline status
    const runningScan = await Scan.findOne({ status: 'running' }).sort({ createdAt: -1 });

    res.json({
      riskScore: avgRisk,
      severityBreakdown: severityMap,
      totalOpenFindings: totalOpen,
      fpRate: 0.08,
      wcetCompliance: 0.82,
      recentProjects: projects,
      recentScans: latestScans,
      recentFindings: openFindings,
      pipelineStatus: runningScan ? runningScan.pipeline : null,
      runningScanId: runningScan?._id || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
