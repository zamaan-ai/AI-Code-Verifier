const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

router.get('/', async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) {
      settings = await Settings.create({ key: 'global' });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const allowed = [
      'quantizationLevel', 'hardwareProfile', 'z3Strictness',
      'saeAdvancedMode', 'offlineMode', 'telemetryDisabled', 'maxReverifyAttempts'
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
