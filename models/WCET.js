const mongoose = require('mongoose');

const FunctionWCETSchema = new mongoose.Schema({
  functionName: String,
  filePath: String,
  wcetCycles: Number,
  deadlineCycles: Number,
  status: { type: String, enum: ['pass', 'fail', 'unknown'], default: 'unknown' },
  margin: Number
});

const WCETSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  architecture: { type: String, default: 'x86_64' },
  functions: [FunctionWCETSchema],
  overallStatus: { type: String, enum: ['pass', 'fail', 'partial'], default: 'partial' }
}, { timestamps: true });

module.exports = mongoose.model('WCET', WCETSchema);
