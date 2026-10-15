const express = require('express');
const router = express.Router();
const Transpilation = require('../models/Transpilation');

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.projectId) filter.projectId = req.query.projectId;
    const items = await Transpilation.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Transpilation.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = new Transpilation({
      ...req.body,
      status: 'processing',
      progress: 10
    });
    await item.save();

    // Simulate transpilation
    setTimeout(async () => {
      const rustCode = generateMockRust(req.body.sourceCode || '');
      await Transpilation.findByIdAndUpdate(item._id, {
        status: 'completed',
        progress: 100,
        rustCode,
        borrowCheckerStatus: Math.random() > 0.3 ? 'pass' : 'warnings',
        borrowCheckerErrors: Math.random() > 0.3 ? [] : ['temporary value dropped while borrowed'],
        updatedAt: Date.now()
      });
    }, 2000);

    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const item = await Transpilation.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function generateMockRust(cCode) {
  return `// Auto-transpiled from C
// Borrow-checker validated

fn process_buffer(src: &[u8], dest: &mut [u8]) -> Result<(), &'static str> {
    if src.len() > dest.len() {
        return Err("buffer too small");
    }
    dest[..src.len()].copy_from_slice(src);
    Ok(())
}

// Original C logic preserved with safe Rust idioms
pub fn main_logic() {
    let mut buffer = [0u8; 256];
    // ... safe equivalents of original operations
}
`;
}

module.exports = router;
