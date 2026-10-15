const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  quantizationLevel: { type: String, enum: ['int8', 'int4', 'fp16', 'fp32'], default: 'int8' },
  hardwareProfile: { type: String, default: 'cpu' },
  z3Strictness: { type: String, enum: ['relaxed', 'standard', 'strict'], default: 'standard' },
  saeAdvancedMode: { type: Boolean, default: false },
  offlineMode: { type: Boolean, default: true },
  telemetryDisabled: { type: Boolean, default: true },
  maxReverifyAttempts: { type: Number, default: 3 }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
