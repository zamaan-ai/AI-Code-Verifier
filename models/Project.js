const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  name: { type: String, required: true },
  language: { type: String, default: 'unknown' },
  riskScore: { type: Number, default: 0 },
  size: { type: Number, default: 0 },
  lastScanned: Date
});

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  rootPath: { type: String, required: true },
  language: { type: String, default: 'mixed' },
  files: [FileSchema],
  riskScore: { type: Number, default: 0 },
  status: { type: String, enum: ['imported', 'scanning', 'scanned', 'error'], default: 'imported' },
  lastScanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan' }
}, { timestamps: true });

// Cascade cleanup when a project is deleted
ProjectSchema.pre('findOneAndDelete', async function (next) {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const id = doc._id;
    const Finding = mongoose.model('Finding');
    const Scan = mongoose.model('Scan');
    const Transpilation = mongoose.model('Transpilation');
    const WCET = mongoose.model('WCET');
    await Promise.all([
      Finding.deleteMany({ projectId: id }),
      Scan.deleteMany({ projectId: id }),
      Transpilation.deleteMany({ projectId: id }),
      WCET.deleteMany({ projectId: id })
    ]);
  }
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);
