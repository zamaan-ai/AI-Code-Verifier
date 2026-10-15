import React, { useEffect, useState } from 'react';
import { Save, Shield } from 'lucide-react';
import { getSettings, updateSettings } from '../services/api';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(res => setSettings(res.data)).catch(console.error);
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateSettings(settings);
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="loading-state">Loading settings...</div>;

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings / Configuration</h1>
          <p>Model, hardware, and verification parameters</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-grid">
        <div className="card">
          <h3>Model Configuration</h3>
          <div className="setting-row">
            <label>Quantization Level</label>
            <select value={settings.quantizationLevel} onChange={e => handleChange('quantizationLevel', e.target.value)}>
              <option value="int4">INT4 (fastest, lowest precision)</option>
              <option value="int8">INT8 (recommended)</option>
              <option value="fp16">FP16</option>
              <option value="fp32">FP32 (highest precision)</option>
            </select>
          </div>
          <div className="setting-row">
            <label>Hardware Profile</label>
            <select value={settings.hardwareProfile} onChange={e => handleChange('hardwareProfile', e.target.value)}>
              <option value="cpu">CPU Only</option>
              <option value="gpu">GPU (CUDA)</option>
              <option value="npu">NPU / Accelerator</option>
            </select>
          </div>
          <div className="setting-row">
            <label>SAE Advanced Mode</label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.saeAdvancedMode}
                onChange={e => handleChange('saeAdvancedMode', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div className="card">
          <h3>Verification Engine</h3>
          <div className="setting-row">
            <label>Z3 Strictness</label>
            <select value={settings.z3Strictness} onChange={e => handleChange('z3Strictness', e.target.value)}>
              <option value="relaxed">Relaxed (faster, more FPs possible)</option>
              <option value="standard">Standard</option>
              <option value="strict">Strict (slower, higher confidence)</option>
            </select>
          </div>
        </div>

        <div className="card trust-card">
          <h3><Shield size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Air-Gap Trust Indicators</h3>
          <div className="trust-row">
            <span>Offline Mode</span>
            <span className={`trust-val ${settings.offlineMode ? 'on' : 'off'}`}>
              {settings.offlineMode ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <div className="trust-row">
            <span>Telemetry</span>
            <span className={`trust-val ${settings.telemetryDisabled ? 'on' : 'off'}`}>
              {settings.telemetryDisabled ? 'DISABLED' : 'ENABLED'}
            </span>
          </div>
          <div className="trust-row">
            <span>External Network</span>
            <span className="trust-val on">BLOCKED</span>
          </div>
          <p className="trust-note">
            This instance runs fully air-gapped. No data leaves the local environment.
            Model weights and analysis results remain on-premises.
          </p>
        </div>
      </div>
    </div>
  );
}
