const mongoose = require('mongoose');

const TranspilationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  findingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
  sourceFile: { type: String, required: true },
  sourceLanguage: { type: String, default: 'c' },
  sourceCode: String,
  rustCode: String,
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'accepted', 'rejected'],
    default: 'queued',
    index: true
  },
  borrowCheckerStatus: {
    type: String,
    enum: ['pending', 'pass', 'fail', 'warnings'],
    default: 'pending'
  },
  borrowCheckerErrors: [String],
  progress: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Transpilation', TranspilationSchema);
