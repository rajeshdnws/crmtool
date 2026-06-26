'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [form, setForm] = useState({
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    cronSchedule: '0 6 * * *',
    emailProvider: 'smtp',
    emailFromName: 'RSOrangeTech Sales',
    emailFromAddress: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    resendApiKey: '',
    sendgridApiKey: '',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    smtpToSales: '',
    googleApiKey: '',
    discoveryCategories: 'School, Coaching Institute, Hospital, Clinic, Real Estate Agency, Manufacturer, Restaurant',
    discoveryCities: 'Noida, Greater Noida, Ghaziabad, Delhi, Gurgaon, Faridabad',
    discoveryLimit: '20',
    discoveryEnabled: 'true',
    discoveryMinReviews: '5',
    discoveryAiValidation: 'true',
    automationEnabled: 'true'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsApi.getSettings();
        if (res.success && res.data) {
          setForm(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await settingsApi.updateSettings(form);
      if (res.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-[var(--text-muted)] animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Platform Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your integrations, automations, and system configurations.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* AI Configuration Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#f97316]">✨</span> AI Integration
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  name="openaiApiKey"
                  value={form.openaiApiKey}
                  onChange={handleChange}
                  placeholder="sk-..."
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">AI Model</label>
                <select
                  name="openaiModel"
                  value={form.openaiModel}
                  onChange={handleChange}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors appearance-none"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast/Cheap)</option>
                  <option value="gpt-4o">GPT-4o (Most Capable)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#f97316]">⏱️</span> Daily Automation
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Enable Automation</span>
                <select
                  name="automationEnabled"
                  value={form.automationEnabled}
                  onChange={handleChange}
                  className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-sm outline-none"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <button
                type="button"
              onClick={async () => {
                if (confirm('Are you sure you want to trigger the daily automation scan right now? This will process all unscanned leads.')) {
                  try {
                    const res = await settingsApi.triggerAutomation();
                    if (res.success) {
                      setMessage({ type: 'success', text: 'Automation scan started in the background!' });
                    } else {
                      setMessage({ type: 'error', text: res.error || 'Failed to start automation' });
                    }
                  } catch (e) {
                    setMessage({ type: 'error', text: 'Error triggering automation' });
                  }
                }
              }}
              className="px-4 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-sm font-semibold hover:bg-blue-500 hover:text-white transition-colors"
            >
              Run Daily Scan Now
            </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Scanner Schedule (CRON)</label>
              <input
                type="text"
                name="cronSchedule"
                value={form.cronSchedule}
                onChange={handleChange}
                placeholder="0 6 * * *"
                className="w-full md:w-1/2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors font-mono"
              />
              <p className="text-xs text-[var(--text-muted)] mt-2">Default: <code>0 6 * * *</code> (Every day at 6:00 AM).</p>
            </div>
          </div>
        </div>

        {/* Business Discovery Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#f97316]">🔍</span> Google Places Discovery
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Enable Discovery</span>
              <select
                name="discoveryEnabled"
                value={form.discoveryEnabled}
                onChange={handleChange}
                className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-sm outline-none"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Google API Key (Places API)</label>
              <input
                type="password"
                name="googleApiKey"
                value={form.googleApiKey}
                onChange={handleChange}
                placeholder="AIzaSy..."
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Target Categories (Comma Separated)</label>
              <input
                type="text"
                name="discoveryCategories"
                value={form.discoveryCategories}
                onChange={handleChange}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Target Cities (Comma Separated)</label>
              <input
                type="text"
                name="discoveryCities"
                value={form.discoveryCities}
                onChange={handleChange}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Daily Limit (Max Leads per Run)</label>
              <input
                type="number"
                name="discoveryLimit"
                value={form.discoveryLimit}
                onChange={handleChange}
                className="w-full md:w-1/3 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
              />
            </div>

            {/* ── Validation Sub-section ── */}
            <div className="mt-2 pt-4 border-t border-dashed" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">🛡️ Smart Validation Settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    Minimum Google Reviews
                    <span className="ml-1 text-xs opacity-60">(reject ghost listings)</span>
                  </label>
                  <input
                    type="number"
                    name="discoveryMinReviews"
                    value={form.discoveryMinReviews}
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    AI Qualification (Gate 7)
                    <span className="ml-1 text-xs opacity-60">(uses OpenAI credits)</span>
                  </label>
                  <select
                    name="discoveryAiValidation"
                    value={form.discoveryAiValidation}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  >
                    <option value="true">Enabled (recommended)</option>
                    <option value="false">Disabled (save credits)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Section */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#f97316]">📧</span> Email Provider & Settings
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Provider</span>
              <select
                name="emailProvider"
                value={form.emailProvider}
                onChange={handleChange}
                className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-sm outline-none"
              >
                <option value="smtp">SMTP (Default)</option>
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="ses">Amazon SES</option>
              </select>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-dashed" style={{ borderColor: 'var(--border-muted)' }}>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">From Name</label>
                <input
                  type="text"
                  name="emailFromName"
                  value={form.emailFromName}
                  onChange={handleChange}
                  placeholder="RSOrangeTech Sales"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">From Address</label>
                <input
                  type="text"
                  name="emailFromAddress"
                  value={form.emailFromAddress}
                  onChange={handleChange}
                  placeholder="sales@rsorangetech.com"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Sales Inbox (Receives Daily Summaries)</label>
                <input
                  type="text"
                  name="smtpToSales"
                  value={form.smtpToSales}
                  onChange={handleChange}
                  placeholder="sales@rsorangetech.com"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
            </div>

            {form.emailProvider === 'smtp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">SMTP Host</label>
                  <input
                    type="text"
                    name="smtpHost"
                    value={form.smtpHost}
                    onChange={handleChange}
                    placeholder="smtp.example.com"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">SMTP Port</label>
                  <input
                    type="text"
                    name="smtpPort"
                    value={form.smtpPort}
                    onChange={handleChange}
                    placeholder="587"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">SMTP Username</label>
                  <input
                    type="text"
                    name="smtpUser"
                    value={form.smtpUser}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">SMTP Password</label>
                  <input
                    type="password"
                    name="smtpPass"
                    value={form.smtpPass}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
              </div>
            )}

            {form.emailProvider === 'resend' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Resend API Key</label>
                <input
                  type="password"
                  name="resendApiKey"
                  value={form.resendApiKey}
                  onChange={handleChange}
                  placeholder="re_..."
                  className="w-full md:w-1/2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
            )}

            {form.emailProvider === 'sendgrid' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">SendGrid API Key</label>
                <input
                  type="password"
                  name="sendgridApiKey"
                  value={form.sendgridApiKey}
                  onChange={handleChange}
                  placeholder="SG...."
                  className="w-full md:w-1/2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                />
              </div>
            )}

            {form.emailProvider === 'ses' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">AWS Region</label>
                  <input
                    type="text"
                    name="awsRegion"
                    value={form.awsRegion}
                    onChange={handleChange}
                    placeholder="us-east-1"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
                <div></div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">AWS Access Key ID</label>
                  <input
                    type="password"
                    name="awsAccessKeyId"
                    value={form.awsAccessKeyId}
                    onChange={handleChange}
                    placeholder="AKIA..."
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">AWS Secret Access Key</label>
                  <input
                    type="password"
                    name="awsSecretAccessKey"
                    value={form.awsSecretAccessKey}
                    onChange={handleChange}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 outline-none focus:border-[#f97316] transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Saving...
              </>
            ) : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
