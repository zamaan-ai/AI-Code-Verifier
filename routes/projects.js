const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, rootPath } = req.body;
    if (!name || !rootPath) {
      return res.status(400).json({ error: 'name and rootPath are required' });
    }
    // basic path sanitization
    if (rootPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid rootPath' });
    }
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project and related data deleted', id: project._id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
