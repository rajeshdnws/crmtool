'use client';

import { useState, useEffect } from 'react';
import { settingsApi, discoveryApi } from '@/lib/api';

export default function DiscoveryPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [requireWebsiteAndEmail, setRequireWebsiteAndEmail] = useState(false);
  const [config, setConfig] = useState({
    categories: '',
    cities: '',
    limit: '',
    enabled: 'true'
  });

  const fetchLogs = async () => {
    try {
      const res = await discoveryApi.getLogs();
      if (res.success && res.data) {
        setLogs(res.data as any[]);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  useEffect(() => {
    const fetchConfigAndLogs = async () => {
      try {
        const res = await settingsApi.getSettings();
        if (res.success && res.data) {
          setConfig({
            categories: res.data.discoveryCategories || '',
            cities: res.data.discoveryCities || '',
            limit: res.data.discoveryLimit || '20',
            enabled: res.data.discoveryEnabled || 'true',
          });
        }
        await fetchLogs();
      } catch (err) {
        console.error('Failed to fetch settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfigAndLogs();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await discoveryApi.getStatus() as any;
        if (res.success && typeof res.isRunning === 'boolean') {
          setRunning(res.isRunning);
        }
      } catch (e) {}
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (!running) return;

    const checkStatus = async () => {
      try {
        const res = await discoveryApi.getStatus() as any;
        if (res.success && typeof res.isRunning === 'boolean') {
          if (!res.isRunning) {
            setRunning(false);
            fetchLogs();
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [running]);


  const handleRunDiscovery = async () => {
    if (config.enabled === 'false') {
      setMessage({ type: 'error', text: 'Discovery is disabled in Settings.' });
      return;
    }

    if (!confirm(`Are you sure you want to run Business Discovery? This will search across ${config.cities.split(',').length} cities and ${config.categories.split(',').length} categories using your Google API Key.`)) {
      return;
    }

    setRunning(true);
    setMessage(null);

    try {
      const res = await discoveryApi.runDiscovery({ requireWebsiteAndEmail });
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Discovery started successfully in the background!' });
        setTimeout(fetchLogs, 1000); // refresh logs after 1s to show the START log
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to start discovery.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-[var(--text-muted)]">Loading discovery module...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Business Discovery</h1>
        <p className="text-[var(--text-muted)]">
          Automatically prospect new leads from Google Places based on your configured cities and industries.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 border-b pb-4" style={{ borderColor: 'var(--border-muted)' }}>
              Discovery Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-[var(--text-muted)] mb-1">Target Categories</div>
                <div className="flex flex-wrap gap-2">
                  {config.categories.split(',').filter(Boolean).map((cat, i) => (
                    <span key={i} className="px-3 py-1 bg-[#f97316]/10 text-[#f97316] text-sm rounded-full font-medium">
                      {cat.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-[var(--text-muted)] mb-1">Target Cities</div>
                <div className="flex flex-wrap gap-2">
                  {config.cities.split(',').filter(Boolean).map((city, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-500 text-sm rounded-full font-medium">
                      {city.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-muted)' }}>
              <div>
                <div className="text-sm text-[var(--text-muted)]">Daily Extraction Limit</div>
                <div className="font-semibold">{config.limit} Leads / Run</div>
              </div>
              <a href="/settings" className="text-sm font-medium text-[#f97316] hover:underline">
                Edit Configuration →
              </a>
            </div>
          </div>
        </div>

        <div>
          <div className="card p-6 flex flex-col justify-center items-center text-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-[#f97316]/10 flex items-center justify-center text-[#f97316]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            
            <div>
              <h3 className="font-bold text-lg">Run Discovery</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Trigger the Google Places scraper manually to fetch a batch of leads right now.
              </p>
            </div>

            <div className="w-full flex items-start gap-2 mt-2 px-4 py-3 rounded-lg border bg-[var(--bg-muted)] border-[var(--border-muted)] text-sm text-left">
              <input 
                type="checkbox" 
                id="strictContact"
                checked={requireWebsiteAndEmail}
                onChange={(e) => setRequireWebsiteAndEmail(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]"
              />
              <label htmlFor="strictContact" style={{ color: 'var(--text-muted)' }} className="cursor-pointer">
                <strong style={{ color: 'var(--text-primary)' }}>Strict Mode:</strong> Only save leads that have <span className="underline">both</span> a website and a discovered email address.
              </label>
            </div>

            <button
              onClick={handleRunDiscovery}
              disabled={running || config.enabled === 'false'}
              className="w-full btn-primary py-3 mt-2 flex items-center justify-center gap-2"
              style={{ opacity: (running || config.enabled === 'false') ? 0.6 : 1 }}
            >
              {running ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running...
                </>
              ) : 'Run Discovery Now'}
            </button>
            {config.enabled === 'false' && (
              <p className="text-xs text-red-500 mt-2">Enable Discovery in Settings first.</p>
            )}
          </div>
        </div>
      </div>

      {/* Logs Section */}
      <div className="mt-8 card p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-4" style={{ borderColor: 'var(--border-muted)' }}>
          <h2 className="text-lg font-semibold">Discovery Activity Logs</h2>
          <button onClick={fetchLogs} className="text-xs font-medium text-[#f97316] hover:underline flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh Logs
          </button>
        </div>
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-muted)] italic">No discovery runs logged yet.</p>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-muted)' }}>
                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      log.action === 'DISCOVERY_START' ? 'bg-blue-500/10 text-blue-400' :
                      log.action === 'DISCOVERY_COMPLETE' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {log.action.replace('DISCOVERY_', '')}
                    </span>
                    {log.action === 'DISCOVERY_START' && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Query: <strong>&quot;{log.details?.query}&quot;</strong> | Limit: {log.details?.limit}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{new Date(log.createdAt).toLocaleString()}</span>
                </div>

                {/* COMPLETE details */}
                {log.action === 'DISCOVERY_COMPLETE' && (
                  <div className="space-y-3">
                    {/* Summary pills */}
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        ✅ Saved: {log.details?.approvedCount ?? log.details?.successCount ?? 0}
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                        ❌ Rejected: {log.details?.rejectedCount ?? 0}
                      </span>
                      {log.details?.failedCount > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400">
                          ⚠️ Errors: {log.details.failedCount}
                        </span>
                      )}
                    </div>

                    {/* Gate breakdown */}
                    {log.details?.gateBreakdown && Object.keys(log.details.gateBreakdown).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] mb-1.5">Rejection Breakdown by Gate:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(log.details.gateBreakdown).map(([gate, count]: [string, any]) => (
                            <span key={gate} className="px-2 py-0.5 rounded text-xs border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                              {gate.replace('Gate', 'G').replace('_', ': ')} — {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Results Grid */}
                    {log.discoveryResults && log.discoveryResults.length > 0 ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[#f97316] transition-colors select-none font-medium mt-4">
                          View Detailed Results ({log.discoveryResults.length} businesses)
                        </summary>
                        <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-muted)' }}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[var(--bg-muted)] border-b" style={{ borderColor: 'var(--border-muted)' }}>
                                <th className="p-2 font-semibold">Business</th>
                                <th className="p-2 font-semibold">Status</th>
                                <th className="p-2 font-semibold">Opp Score</th>
                                <th className="p-2 font-semibold">AI Score</th>
                                <th className="p-2 font-semibold">Activity Confidence</th>
                                <th className="p-2 font-semibold">Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {log.discoveryResults.map((result: any) => (
                                <tr key={result.id} className="border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-muted)' }}>
                                  <td className="p-2 font-medium">{result.businessName}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                      result.validationStatus === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                      {result.validationStatus}
                                    </span>
                                  </td>
                                  <td className="p-2">{result.opportunityScore ?? '-'}</td>
                                  <td className="p-2">{result.aiScore ?? '-'}</td>
                                  <td className="p-2">{result.activityConfidenceScore ?? '-'}</td>
                                  <td className="p-2 text-[var(--text-muted)] max-w-xs truncate" title={result.rejectionReason || 'Approved'}>
                                    {result.rejectionReason || 'Approved'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ) : log.details?.rejections && log.details.rejections.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[#f97316] transition-colors select-none">
                          View legacy rejection samples ({log.details.rejections.length})
                        </summary>
                        <div className="mt-2 space-y-1 pl-2 border-l-2" style={{ borderColor: 'var(--border)' }}>
                          {log.details.rejections.map((r: any, i: number) => (
                            <div key={i} className="text-[var(--text-muted)]">
                              <span className="font-medium">{r.name}</span> — {r.reason}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* API errors */}
                    {log.details?.errors && log.details.errors.length > 0 && (
                      <div className="text-red-400 text-xs">
                        API Error: {log.details.errors[0]?.error}
                      </div>
                    )}
                  </div>
                )}

                {/* FAILED details */}
                {log.action === 'DISCOVERY_FAILED' && (
                  <span className="text-red-400 text-xs">{log.details?.error || 'Unknown error'}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
