const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  scope: { type: String, enum: ['full', 'diff', 'folder', 'file'], default: 'full' },
  scopePath: String,
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },
  pipeline: {
    ast: { status: String, progress: Number, completedAt: Date },
    gnn: { status: String, progress: Number, completedAt: Date },
    sae: { status: String, progress: Number, completedAt: Date },
    z3: { status: String, progress: Number, completedAt: Date }
  },
  summary: {
    totalFindings: Number,
    critical: Number,
    high: Number,
    medium: Number,
    low: Number,
    info: Number,
    riskScore: Number,
    fpRate: Number
  },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Scan', ScanSchema);
