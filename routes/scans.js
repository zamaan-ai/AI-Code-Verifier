const express = require('express');
const router = express.Router();
const Scan = require('../models/Scan');
const Project = require('../models/Project');
const Finding = require('../models/Finding');

// Get all scans
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.projectId) filter.projectId = req.query.projectId;
    const scans = await Scan.find(filter).sort({ createdAt: -1 }).populate('projectId', 'name');
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single scan
router.get('/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id).populate('projectId', 'name');
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start new scan
router.post('/', async (req, res) => {
  try {
    const { projectId, scope, scopePath } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const scan = new Scan({
      projectId,
      scope: scope || 'full',
      scopePath,
      status: 'running',
      startedAt: new Date(),
      pipeline: {
        ast: { status: 'running', progress: 0 },
        gnn: { status: 'pending', progress: 0 },
        sae: { status: 'pending', progress: 0 },
        z3: { status: 'pending', progress: 0 }
      }
    });
    await scan.save();

    // Simulate pipeline progress (in real system this would be async workers)
    simulatePipeline(scan._id);

    res.status(201).json(scan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Helper: simulate pipeline for demo
async function simulatePipeline(scanId) {
  const stages = ['ast', 'gnn', 'sae', 'z3'];
  for (let i = 0; i < stages.length; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const update = {};
    update[`pipeline.${stages[i]}.status`] = 'completed';
    update[`pipeline.${stages[i]}.progress`] = 100;
    update[`pipeline.${stages[i]}.completedAt`] = new Date();
    if (i < stages.length - 1) {
      update[`pipeline.${stages[i + 1]}.status`] = 'running';
      update[`pipeline.${stages[i + 1]}.progress`] = 10;
    }
    await Scan.findByIdAndUpdate(scanId, update);
  }

  // Generate mock findings on completion
  const scan = await Scan.findById(scanId);
  const mockFindings = generateMockFindings(scan.projectId, scanId);
  await Finding.insertMany(mockFindings);

  const summary = {
    totalFindings: mockFindings.length,
    critical: mockFindings.filter(f => f.severity === 'critical').length,
    high: mockFindings.filter(f => f.severity === 'high').length,
    medium: mockFindings.filter(f => f.severity === 'medium').length,
    low: mockFindings.filter(f => f.severity === 'low').length,
    info: mockFindings.filter(f => f.severity === 'info').length,
    riskScore: Math.round(Math.random() * 40 + 30),
    fpRate: +(Math.random() * 0.15).toFixed(3)
  };

  await Scan.findByIdAndUpdate(scanId, {
    status: 'completed',
    completedAt: new Date(),
    summary
  });

  await Project.findByIdAndUpdate(scan.projectId, {
    status: 'scanned',
    riskScore: summary.riskScore,
    lastScanId: scanId,
    updatedAt: Date.now()
  });
}

function generateMockFindings(projectId, scanId) {
  const samples = [
    {
      severity: 'critical', cwe: 'CWE-119', title: 'Buffer Overflow in memcpy',
      description: 'Unbounded memcpy can write past buffer boundary',
      confidence: 0.94,
      codeSnippet: 'memcpy(dest, src, len); // len not checked against dest size',
      z3Witness: '(assert (> len (sizeof dest)))\n(check-sat)\nsat',
      plainExplanation: 'The length parameter is not validated against the destination buffer size, allowing an attacker to overwrite adjacent memory.',
      fixSuggestion: 'Add bounds check before memcpy or use memcpy_s / safer alternative.',
      suggestedFixCode: 'if (len > sizeof(dest)) return -1;\nmemcpy(dest, src, len);'
    },
    {
      severity: 'high', cwe: 'CWE-416', title: 'Use-After-Free',
      description: 'Pointer used after free()',
      confidence: 0.89,
      codeSnippet: 'free(ptr);\n*ptr = 0;',
      z3Witness: '(assert (and (freed ptr) (accessed ptr)))\n(check-sat)\nsat',
      plainExplanation: 'Memory is accessed after being freed, leading to undefined behavior and potential code execution.',
      fixSuggestion: 'Set pointer to NULL after free and check before use.',
      suggestedFixCode: 'free(ptr);\nptr = NULL;'
    },
    {
      severity: 'high', cwe: 'CWE-190', title: 'Integer Overflow',
      description: 'Arithmetic overflow in size calculation',
      confidence: 0.87,
      codeSnippet: 'size_t total = count * sizeof(item);',
      z3Witness: '(assert (> (* count (sizeof item)) MAX_SIZE_T))\n(check-sat)\nsat',
      plainExplanation: 'Multiplication can overflow, resulting in a smaller allocation than required.',
      fixSuggestion: 'Use checked multiplication or size_t-safe helpers.',
      suggestedFixCode: 'if (count > SIZE_MAX / sizeof(item)) return NULL;\nsize_t total = count * sizeof(item);'
    },
    {
      severity: 'medium', cwe: 'CWE-476', title: 'NULL Pointer Dereference',
      description: 'Possible NULL dereference',
      confidence: 0.78,
      codeSnippet: 'return obj->field;',
      z3Witness: '(assert (= obj null))\n(check-sat)\nsat',
      plainExplanation: 'obj may be NULL when field is accessed.',
      fixSuggestion: 'Add NULL check before dereference.',
      suggestedFixCode: 'if (!obj) return DEFAULT;\nreturn obj->field;'
    },
    {
      severity: 'medium', cwe: 'CWE-787', title: 'Out-of-bounds Write',
      description: 'Array index may exceed bounds',
      confidence: 0.82,
      codeSnippet: 'arr[i] = value;',
      z3Witness: '(assert (>= i (len arr)))\n(check-sat)\nsat',
      plainExplanation: 'Index i is not proven to be within array bounds.',
      fixSuggestion: 'Validate index against array length.',
      suggestedFixCode: 'if (i >= len) return -1;\narr[i] = value;'
    },
    {
      severity: 'low', cwe: 'CWE-561', title: 'Dead Code',
      description: 'Unreachable code detected',
      confidence: 0.95,
      codeSnippet: 'return 0;\nprintf("unreachable");',
      z3Witness: '(assert false) ; path unreachable',
      plainExplanation: 'Code after return is never executed.',
      fixSuggestion: 'Remove dead code or restructure control flow.',
      suggestedFixCode: 'return 0;'
    }
  ];

  return samples.map((s, idx) => ({
    ...s,
    projectId,
    scanId,
    filePath: `src/module_${(idx % 3) + 1}.c`,
    lineStart: 20 + idx * 15,
    lineEnd: 25 + idx * 15,
    status: 'open'
  }));
}

module.exports = router;
