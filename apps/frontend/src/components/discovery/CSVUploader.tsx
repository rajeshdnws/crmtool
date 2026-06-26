'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { leadsApi } from '@/lib/api';

interface ParsedLead {
  businessName: string;
  website: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  notes?: string;
}

export default function CSVUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setError(null);
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        // Map common column headers to our schema flexibly
        const mappedLeads: ParsedLead[] = data.map(row => {
          const findVal = (keys: string[]) => {
            const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
            return key ? row[key] : undefined;
          };

          return {
            businessName: findVal(['businessname', 'business name', 'company', 'companyname', 'name']) || '',
            website: findVal(['website', 'url', 'domain', 'link']) || '',
            email: findVal(['email', 'contactemail', 'emailaddress']),
            phone: findVal(['phone', 'phonenumber', 'contactphone']),
            city: findVal(['city', 'location']),
            state: findVal(['state', 'province']),
            country: findVal(['country']),
            industry: findVal(['industry', 'category', 'niche']),
            notes: findVal(['notes', 'description']),
          };
        }).filter(lead => lead.businessName && lead.website);

        if (mappedLeads.length === 0) {
          setError('No valid leads found. Please ensure your CSV has "Business Name" and "Website" columns.');
        } else {
          setParsedData(mappedLeads);
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    setError(null);
    
    const res = await leadsApi.bulkCreate(parsedData as unknown as Record<string, unknown>[]);
    setIsUploading(false);

    if (res.success && res.data) {
      const data = res.data as { imported: number; skipped: number };
      setResult(data);
      setParsedData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setError(res.error || 'Failed to import leads');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!parsedData.length && !result && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
            isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--border)] hover:border-orange-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
               style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Upload CSV File
          </h3>
          <p className="text-sm mt-2 max-w-sm" style={{ color: 'var(--text-muted)' }}>
            Drag and drop your CSV file here, or click to browse. Ensure it contains at least <strong style={{ color: 'var(--text-secondary)' }}>Business Name</strong> and <strong style={{ color: 'var(--text-secondary)' }}>Website</strong> columns.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm px-4 py-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="text-sm px-4 py-4 rounded-xl flex flex-col items-center text-center space-y-3"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#22c55e', color: 'white' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="font-semibold" style={{ color: '#22c55e' }}>Import Successful!</div>
            <div className="mt-1" style={{ color: 'var(--text-primary)' }}>
              Successfully imported <strong>{result.imported}</strong> leads.
            </div>
            {result.skipped > 0 && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Skipped {result.skipped} existing duplicates.
              </div>
            )}
          </div>
          <button onClick={() => setResult(null)} className="btn-ghost px-4 py-2 mt-2 text-xs border" style={{ border: '1px solid var(--border)' }}>
            Import Another File
          </button>
        </div>
      )}

      {/* Preview Zone */}
      {parsedData.length > 0 && !result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Preview Leads</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Found {parsedData.length} valid leads ready for import.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setParsedData([]); setError(null); }} disabled={isUploading}
                className="btn-ghost px-3 py-1.5 text-xs border" style={{ border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button onClick={handleImport} disabled={isUploading}
                className="btn-primary px-4 py-1.5 text-xs flex items-center gap-2"
                style={{ opacity: isUploading ? 0.7 : 1 }}>
                {isUploading && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {isUploading ? 'Importing...' : `Import ${parsedData.length} Leads`}
              </button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-muted)' }}>
                  <tr>
                    <th className="px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Business Name</th>
                    <th className="px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Website</th>
                    <th className="px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Email</th>
                    <th className="px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Industry</th>
                    <th className="px-4 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 50).map((lead, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-muted)' }}>
                      <td className="px-4 py-2 truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>{lead.businessName}</td>
                      <td className="px-4 py-2 truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>{lead.website}</td>
                      <td className="px-4 py-2 truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>{lead.email || '-'}</td>
                      <td className="px-4 py-2 truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{lead.industry || '-'}</td>
                      <td className="px-4 py-2 truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>
                        {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 50 && (
              <div className="p-2 text-center text-xs" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                Showing first 50 leads of {parsedData.length}...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
