const express = require('express');
const router = express.Router();
const Finding = require('../models/Finding');

// GET /api/findings?severity=&status=&search=&page=1&limit=50&sort=severity
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.scanId) filter.scanId = req.query.scanId;
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { filePath: new RegExp(q, 'i') },
        { cwe: new RegExp(q, 'i') }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    // Correct severity ordering via severityRank
    const sortField = req.query.sort === 'confidence' ? { confidence: -1 } : { severityRank: 1, confidence: -1 };

    const [items, total] = await Promise.all([
      Finding.find(filter).sort(sortField).skip(skip).limit(limit),
      Finding.countDocuments(filter)
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const finding = await Finding.findById(req.params.id);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    res.json(finding);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'confidence', 'candidateFixes', 'reverifyAttempts', 'suggestedFixCode', 'fixSuggestion'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const finding = await Finding.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    res.json(finding);
  } catch (err) {
    next(err);
  }
});

// Generate multi-sample candidate fixes (simulated)
router.post('/:id/candidates', async (req, res, next) => {
  try {
    const finding = await Finding.findById(req.params.id);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    const base = finding.suggestedFixCode || finding.codeSnippet || '// fix';
    const candidates = [
      {
        code: base,
        explanation: 'Primary suggested fix based on Z3 counterexample.',
        status: 'pending'
      },
      {
        code: base.replace('memcpy', 'memcpy_s').replace('strcpy', 'strncpy'),
        explanation: 'Bounded copy variant — prefers safer libc alternatives.',
        status: 'pending'
      },
      {
        code: `if (len > MAX) return ERR;\n${base}`,
        explanation: 'Explicit bounds check inserted before the vulnerable operation.',
        status: 'pending'
      }
    ];

    finding.candidateFixes = candidates;
    await finding.save();
    res.json(finding);
  } catch (err) {
    next(err);
  }
});

// Mark a candidate as passed/failed (simulates ESBMC/Z3 check)
router.post('/:id/candidates/:idx/verify', async (req, res, next) => {
  try {
    const finding = await Finding.findById(req.params.id);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    const idx = parseInt(req.params.idx, 10);
    if (!finding.candidateFixes || !finding.candidateFixes[idx]) {
      return res.status(400).json({ error: 'Invalid candidate index' });
    }

    // Simulate: first candidate often passes, others mixed
    const passed = idx === 0 || Math.random() > 0.4;
    finding.candidateFixes[idx].status = passed ? 'passed' : 'failed';
    finding.reverifyAttempts = (finding.reverifyAttempts || 0) + 1;

    if (passed) {
      finding.suggestedFixCode = finding.candidateFixes[idx].code;
      finding.status = 'accepted';
    }

    // Escalate after max attempts
    const maxAttempts = 3;
    let escalated = false;
    if (!passed && finding.reverifyAttempts >= maxAttempts) {
      escalated = true;
    }

    await finding.save();
    res.json({ finding, escalated, message: escalated
      ? 'Max re-verify attempts reached. Escalate to human reviewer.'
      : (passed ? 'Candidate passed verification.' : 'Candidate failed verification.')
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
