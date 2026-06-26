'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { leadsApi } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportCsvModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDownloadSample = () => {
    const headers = ['Business Name', 'Website', 'Email', 'Phone', 'Industry', 'City', 'State', 'Country', 'Notes'];
    const sampleRow = ['Acme Corp', 'https://acme.example.com', 'contact@acme.example.com', '+1 555-0100', 'Software', 'San Francisco', 'CA', 'USA', 'Sample lead'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    setIsUploading(true);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          
          if (rows.length === 0) {
            setError('The CSV file is empty.');
            setIsUploading(false);
            return;
          }

          // Automatically try to match common column names
          const mappedLeads = rows.map((row) => {
            const getVal = (keys: string[]) => {
              const key = keys.find(k => Object.keys(row).some(rk => rk.toLowerCase().trim() === k.toLowerCase()));
              if (!key) return undefined;
              const actualKey = Object.keys(row).find(rk => rk.toLowerCase().trim() === key.toLowerCase());
              return actualKey ? row[actualKey] : undefined;
            };

            return {
              businessName: getVal(['businessName', 'business name', 'company', 'name']) || '',
              website: getVal(['website', 'url', 'domain', 'link']) || '',
              email: getVal(['email', 'email address', 'contact email']),
              phone: getVal(['phone', 'phone number', 'contact number']),
              industry: getVal(['industry', 'category', 'type']),
              city: getVal(['city', 'town']),
              state: getVal(['state', 'province', 'region']),
              country: getVal(['country']),
              notes: getVal(['notes', 'description', 'info']),
            };
          });

          const invalidLeads = mappedLeads.filter(l => !l.businessName || !l.website);
          
          if (mappedLeads.length === 0) {
            setError('No valid data found in CSV.');
            setIsUploading(false);
            return;
          }

          if (invalidLeads.length === mappedLeads.length) {
            setError('Could not find required columns (Business Name, Website). Please check your headers.');
            setIsUploading(false);
            return;
          }

          const res = await leadsApi.bulkCreate(mappedLeads);
          
          if (res.success) {
            onSuccess();
          } else {
            setError(res.error || 'Failed to import leads.');
          }
        } catch (err) {
          setError('An unexpected error occurred during import.');
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-md animate-fade-in"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Import Leads from CSV
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Upload a CSV file containing your leads. The file must contain headers. 
            <strong> Business Name</strong> and <strong>Website</strong> are required.
          </p>

          <button 
            onClick={handleDownloadSample}
            type="button"
            className="text-xs hover:underline font-medium flex items-center gap-1"
            style={{ color: '#f97316' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Sample CSV
          </button>

          <div className="p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="text-sm cursor-pointer"
            />
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm border"
              style={{ border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={handleImport} disabled={isUploading || !file}
              className="btn-primary px-4 py-2 text-sm"
              style={{ opacity: (isUploading || !file) ? 0.7 : 1 }}>
              {isUploading ? 'Importing...' : 'Import Leads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
