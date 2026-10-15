const mongoose = require('mongoose');

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const FindingSchema = new mongoose.Schema({
  scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  filePath: { type: String, required: true },
  lineStart: Number,
  lineEnd: Number,
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], required: true, index: true },
  severityRank: { type: Number, default: 2, index: true },
  cwe: String,
  title: { type: String, required: true },
  description: String,
  confidence: { type: Number, min: 0, max: 1, default: 0.8 },
  status: {
    type: String,
    enum: ['open', 'accepted', 'false_positive', 'ignored', 'fixed'],
    default: 'open',
    index: true
  },
  codeSnippet: String,
  z3Witness: String,
  plainExplanation: String,
  fixSuggestion: String,
  suggestedFixCode: String,
  // Multi-sample repair support
  candidateFixes: [{
    code: String,
    explanation: String,
    status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' }
  }],
  reverifyAttempts: { type: Number, default: 0 }
}, { timestamps: true });

FindingSchema.pre('save', function (next) {
  if (this.severity && SEVERITY_RANK[this.severity] !== undefined) {
    this.severityRank = SEVERITY_RANK[this.severity];
  }
  next();
});

FindingSchema.statics.SEVERITY_RANK = SEVERITY_RANK;

module.exports = mongoose.model('Finding', FindingSchema);
