const mongoose = require('mongoose');
const Project = require('./models/Project');
const Scan = require('./models/Scan');
const Finding = require('./models/Finding');
const Settings = require('./models/Settings');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/air_gapped_verifier';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for seeding...');

  await Promise.all([
    Project.deleteMany({}),
    Scan.deleteMany({}),
    Finding.deleteMany({}),
    Settings.deleteMany({}),
    User.deleteMany({})
  ]);

  // Default admin user (change password in production)
  const passwordHash = await User.hashPassword('admin123');
  await User.create({
    username: 'admin',
    passwordHash,
    role: 'admin'
  });
  console.log('👤 Default user: admin / admin123');

  const project = await Project.create({
    name: 'Flight Control Firmware',
    description: 'Safety-critical C codebase for avionics control loop',
    rootPath: '/opt/projects/flight-control',
    language: 'c',
    status: 'scanned',
    riskScore: 62,
    files: [
      { path: 'src/main.c', name: 'main.c', language: 'c', riskScore: 45, size: 4200 },
      { path: 'src/control_loop.c', name: 'control_loop.c', language: 'c', riskScore: 78, size: 8900 },
      { path: 'src/sensor_fusion.c', name: 'sensor_fusion.c', language: 'c', riskScore: 55, size: 6100 },
      { path: 'src/comms.c', name: 'comms.c', language: 'c', riskScore: 71, size: 5300 },
      { path: 'include/types.h', name: 'types.h', language: 'c', riskScore: 12, size: 1200 }
    ]
  });

  const project2 = await Project.create({
    name: 'Automotive ECU Core',
    description: 'ISO 26262 targeted C++ module',
    rootPath: '/opt/projects/ecu-core',
    language: 'cpp',
    status: 'imported',
    riskScore: 0,
    files: [
      { path: 'src/ecu_main.cpp', name: 'ecu_main.cpp', language: 'cpp', riskScore: 0, size: 7200 },
      { path: 'src/can_bus.cpp', name: 'can_bus.cpp', language: 'cpp', riskScore: 0, size: 4800 }
    ]
  });

  const scan = await Scan.create({
    projectId: project._id,
    scope: 'full',
    status: 'completed',
    startedAt: new Date(Date.now() - 3600000),
    completedAt: new Date(Date.now() - 3000000),
    pipeline: {
      ast: { status: 'completed', progress: 100, completedAt: new Date() },
      gnn: { status: 'completed', progress: 100, completedAt: new Date() },
      sae: { status: 'completed', progress: 100, completedAt: new Date() },
      z3: { status: 'completed', progress: 100, completedAt: new Date() }
    },
    summary: {
      totalFindings: 6,
      critical: 1,
      high: 2,
      medium: 2,
      low: 1,
      info: 0,
      riskScore: 62,
      fpRate: 0.07
    }
  });

  project.lastScanId = scan._id;
  await project.save();

  const findings = [
    {
      scanId: scan._id, projectId: project._id,
      filePath: 'src/control_loop.c', lineStart: 142, lineEnd: 148,
      severity: 'critical', cwe: 'CWE-119', title: 'Buffer Overflow in sensor buffer copy',
      description: 'memcpy without bounds check on sensor data',
      confidence: 0.96, status: 'open',
      codeSnippet: 'memcpy(sensor_buf, incoming, packet_len);',
      z3Witness: '(assert (> packet_len SENSOR_BUF_SIZE))\n(check-sat)\nsat\n(get-model)',
      plainExplanation: 'Incoming packet length is not validated against the fixed-size sensor buffer. An oversized packet can overwrite adjacent stack data.',
      fixSuggestion: 'Validate packet_len before copy or use a safer bounded copy.',
      suggestedFixCode: 'if (packet_len > SENSOR_BUF_SIZE) return ERR_OVERFLOW;\nmemcpy(sensor_buf, incoming, packet_len);'
    },
    {
      scanId: scan._id, projectId: project._id,
      filePath: 'src/comms.c', lineStart: 88, lineEnd: 92,
      severity: 'high', cwe: 'CWE-416', title: 'Use-After-Free on message handle',
      description: 'Message handle used after free in error path',
      confidence: 0.91, status: 'open',
      codeSnippet: 'free(msg);\nif (status != OK) { msg->retry++; }',
      z3Witness: '(assert (and (freed msg) (accessed msg)))\n(check-sat)\nsat',
      plainExplanation: 'In the error path the message structure is accessed after being freed.',
      fixSuggestion: 'Reorder operations or null the pointer after free.',
      suggestedFixCode: 'if (status != OK) { msg->retry++; }\nfree(msg);\nmsg = NULL;'
    },
    {
      scanId: scan._id, projectId: project._id,
      filePath: 'src/sensor_fusion.c', lineStart: 210, lineEnd: 215,
      severity: 'high', cwe: 'CWE-190', title: 'Integer overflow in sample count',
      description: 'Multiplication can overflow size_t',
      confidence: 0.88, status: 'open',
      codeSnippet: 'size_t bytes = samples * sizeof(Sample);',
      z3Witness: '(assert (> (* samples (sizeof Sample)) UINT64_MAX))\n(check-sat)\nsat',
      plainExplanation: 'Large sample counts cause integer overflow, leading to undersized allocations.',
      fixSuggestion: 'Use checked arithmetic.',
      suggestedFixCode: 'if (samples > SIZE_MAX / sizeof(Sample)) return ERR_OVERFLOW;\nsize_t bytes = samples * sizeof(Sample);'
    },
    {
      scanId: scan._id, projectId: project._id,
      filePath: 'src/control_loop.c', lineStart: 55, lineEnd: 60,
      severity: 'medium', cwe: 'CWE-476', title: 'Null pointer dereference risk',
      description: 'Pointer from allocator not checked',
      confidence: 0.82, status: 'open',
      codeSnippet: 'State *s = alloc_state();\ns->mode = MODE_ACTIVE;',
      z3Witness: '(assert (= s null))\n(check-sat)\nsat',
      plainExplanation: 'alloc_state may return NULL under memory pressure; dereference is unchecked.',
      fixSuggestion: 'Check for NULL after allocation.',
      suggestedFixCode: 'State *s = alloc_state();\nif (!s) return ERR_NOMEM;\ns->mode = MODE_ACTIVE;'
    },
    {
      scanId: scan._id, projectId: project._id,
      filePath: 'src/sensor_fusion.c', lineStart: 88, lineEnd: 92,
      severity: 'medium', cwe: 'CWE-125', title: 'Out-of-bounds read on history buffer',
      description: 'Index not clamped to buffer length',
      confidence: 0.79, status: 'open',
      codeSnippet: 'history[idx] = value;',
      z3Witness: '(assert (>= idx HISTORY_LEN))\n(check-sat)\nsat',
      plainExplanation: 'idx can exceed HISTORY_LEN under certain sensor rates.',
      fixSuggestion: 'Clamp or reject out-of-range indices.',
      suggestedFixCode: 'if (idx >= HISTORY_LEN) return;\nhistory[idx] = value;'
    },
    {
      scanId: scan._id, projectId: project._id,
      filePath: 'src/comms.c', lineStart: 12, lineEnd: 15,
      severity: 'low', cwe: 'CWE-561', title: 'Unreachable code',
      description: 'Code after early return',
      confidence: 0.97, status: 'open',
      codeSnippet: 'return ERR;\nlog_debug("never reached");',
      z3Witness: '; path condition unsatisfiable',
      plainExplanation: 'Statement after return is dead code.',
      fixSuggestion: 'Remove or relocate the log statement.',
      suggestedFixCode: 'log_debug("error path");\nreturn ERR;'
    }
  ];

  // severityRank is set by pre-save hook
  for (const f of findings) {
    await Finding.create(f);
  }

  await Settings.create({
    key: 'global',
    quantizationLevel: 'int8',
    hardwareProfile: 'cpu',
    z3Strictness: 'standard',
    saeAdvancedMode: false,
    offlineMode: true,
    telemetryDisabled: true,
    maxReverifyAttempts: 3
  });

  console.log('✅ Seed data created successfully');
  console.log(`   User: admin / admin123`);
  console.log(`   Projects: 2`);
  console.log(`   Scans: 1`);
  console.log(`   Findings: ${findings.length}`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
