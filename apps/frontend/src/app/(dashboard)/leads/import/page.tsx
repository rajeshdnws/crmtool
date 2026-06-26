'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { leadsApi } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ManualImportPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'SUPPORT') {
      router.push('/leads');
    }
  }, [user, router]);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<{
    totalRecords: number;
    imported: number;
    duplicates: number;
    invalid: number;
    invalidDetails: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSummary(null);
    }
  };

  const handleDownloadSample = () => {
    const headers = ['Business Name', 'Contact Person', 'Email', 'Mobile Number', 'Location', 'Industry', 'Notes'];
    const sampleRow = ['Acme Corp', 'John Doe', 'john@acme.example.com', '+1 555-0100', 'San Francisco, CA', 'Software', 'Sample lead from website'];
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

  const parseData = async (file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as Record<string, string>[]),
          error: (err) => reject(new Error(`CSV Parse error: ${err.message}`)),
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            resolve(json as Record<string, string>[]);
          } catch (err: any) {
            reject(new Error(`Excel Parse error: ${err.message}`));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file type. Please upload a CSV or Excel file.'));
      }
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSummary(null);

    try {
      const rows = await parseData(file);
      
      if (rows.length === 0) {
        setError('The file is empty.');
        setIsUploading(false);
        return;
      }

      // Map columns
      const mappedLeads = rows.map((row) => {
        const getVal = (keys: string[]) => {
          const key = keys.find(k => Object.keys(row).some(rk => rk.toLowerCase().trim() === k.toLowerCase()));
          if (!key) return undefined;
          const actualKey = Object.keys(row).find(rk => rk.toLowerCase().trim() === key.toLowerCase());
          return actualKey ? row[actualKey] : undefined;
        };

        return {
          businessName: getVal(['businessName', 'business name', 'company', 'name']) || '',
          contactPerson: getVal(['contactPerson', 'contact person', 'contact name', 'contact']),
          email: getVal(['email', 'email address', 'contact email']),
          phone: getVal(['phone', 'phone number', 'mobile', 'mobile number']),
          city: getVal(['location', 'city', 'town']), // mapping location to city
          industry: getVal(['industry', 'category', 'type']),
          notes: getVal(['notes', 'description', 'info']),
        };
      });

      const res = await leadsApi.bulkCreate(mappedLeads);
      
      if (res.success && res.data) {
        setSummary(res.data as any);
      } else {
        setError(res.error || 'Failed to import leads.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during import.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Manual Leads Import
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Upload CSV or Excel files to bulk import leads.
          </p>
        </div>
        <Link href="/leads" className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm border" style={{ borderColor: 'var(--border)' }}>
          ← Back to Leads
        </Link>
      </div>

      <div className="card p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              1. Download the sample file to see the required format.
            </p>
            <button 
              onClick={handleDownloadSample}
              className="text-xs hover:underline font-medium flex items-center gap-1"
              style={{ color: '#f97316' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Sample
            </button>
          </div>
          
          <div className="space-y-2">
             <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              2. Upload your prepared file (.csv, .xlsx).
            </p>
            <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-colors"
              style={{ borderColor: file ? '#f97316' : 'var(--border)', background: 'var(--bg-muted)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: file ? '#f97316' : 'var(--text-muted)' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-center">
                <input 
                  type="file" 
                  id="file-upload"
                  accept=".csv, .xlsx, .xls" 
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium" style={{ color: '#f97316' }}>
                  Click to select file
                </label>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {file ? file.name : "or drag and drop here"}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {!summary && (
            <div className="flex justify-end pt-4">
              <button onClick={handleImport} disabled={isUploading || !file}
                className="btn-primary px-6 py-2.5 text-sm font-medium shadow-sm transition-all"
                style={{ opacity: (isUploading || !file) ? 0.7 : 1 }}>
                {isUploading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          )}

          {summary && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Import Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-muted)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary.totalRecords}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Total Records</div>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                  <div className="text-2xl font-bold text-green-600">{summary.imported}</div>
                  <div className="text-xs uppercase tracking-wider mt-1 text-green-700">Imported</div>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                  <div className="text-2xl font-bold text-orange-600">{summary.duplicates}</div>
                  <div className="text-xs uppercase tracking-wider mt-1 text-orange-700">Duplicates</div>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                  <div className="text-2xl font-bold text-red-600">{summary.invalid}</div>
                  <div className="text-xs uppercase tracking-wider mt-1 text-red-700">Invalid</div>
                </div>
              </div>

              {summary.invalidDetails && summary.invalidDetails.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h4 className="text-sm font-bold text-red-800 mb-2">Invalid Rows Details:</h4>
                  <ul className="list-disc pl-5 text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {summary.invalidDetails.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button onClick={() => { setSummary(null); setFile(null); }} className="btn-ghost mr-3 px-4 py-2 text-sm border" style={{ borderColor: 'var(--border)' }}>
                  Import Another File
                </button>
                <Link href="/leads" className="btn-primary px-4 py-2 text-sm">
                  View Leads
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
