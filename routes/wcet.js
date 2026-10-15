const express = require('express');
const router = express.Router();
const WCET = require('../models/WCET');

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.projectId) filter.projectId = req.query.projectId;
    const results = await WCET.find(filter).sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { projectId, architecture } = req.body;
    const functions = [
      { functionName: 'init_system', filePath: 'src/init.c', wcetCycles: 1200, deadlineCycles: 2000, status: 'pass', margin: 800 },
      { functionName: 'process_packet', filePath: 'src/net.c', wcetCycles: 4500, deadlineCycles: 5000, status: 'pass', margin: 500 },
      { functionName: 'crypto_verify', filePath: 'src/crypto.c', wcetCycles: 8900, deadlineCycles: 8000, status: 'fail', margin: -900 },
      { functionName: 'log_event', filePath: 'src/log.c', wcetCycles: 320, deadlineCycles: 1000, status: 'pass', margin: 680 },
      { functionName: 'sensor_read', filePath: 'src/hal.c', wcetCycles: 2100, deadlineCycles: 2500, status: 'pass', margin: 400 }
    ];
    const overallStatus = functions.some(f => f.status === 'fail') ? 'fail' : 'pass';

    const wcet = new WCET({
      projectId,
      architecture: architecture || 'x86_64',
      functions,
      overallStatus
    });
    await wcet.save();
    res.status(201).json(wcet);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
