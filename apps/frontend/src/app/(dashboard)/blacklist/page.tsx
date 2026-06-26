'use client';

import { useState, useEffect } from "react";
import { Trash2, ShieldAlert } from "lucide-react";
import { blacklistApi } from "@/lib/api";

export default function BlacklistPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [newDomain, setNewDomain] = useState("");
  const [newBusiness, setNewBusiness] = useState("");

  const fetchBlacklist = async () => {
    try {
      const { data, success } = await blacklistApi.getBlacklist();
      if (success && data) {
        setDomains((data as any).domains || []);
        setBusinesses((data as any).businesses || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      const res = await blacklistApi.addDomain(newDomain);
      if (res.success) {
        setNewDomain("");
        showMessage('success', "Domain added to blacklist");
        fetchBlacklist();
      } else {
        showMessage('error', res.error || 'Failed to add domain');
      }
    } catch (error) {
      showMessage('error', "Failed to add domain");
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    try {
      const res = await blacklistApi.removeDomain(domain);
      if (res.success) {
        showMessage('success', "Domain removed from blacklist");
        fetchBlacklist();
      } else {
        showMessage('error', res.error || 'Failed to remove domain');
      }
    } catch (error) {
      showMessage('error', "Failed to remove domain");
    }
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusiness.trim()) return;
    try {
      const res = await blacklistApi.addBusiness(newBusiness);
      if (res.success) {
        setNewBusiness("");
        showMessage('success', "Business added to blacklist");
        fetchBlacklist();
      } else {
        showMessage('error', res.error || 'Failed to add business');
      }
    } catch (error) {
      showMessage('error', "Failed to add business");
    }
  };

  const handleRemoveBusiness = async (name: string) => {
    try {
      const res = await blacklistApi.removeBusiness(name);
      if (res.success) {
        showMessage('success', "Business removed from blacklist");
        fetchBlacklist();
      } else {
        showMessage('error', res.error || 'Failed to remove business');
      }
    } catch (error) {
      showMessage('error', "Failed to remove business");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Global Blacklist</h1>
        <p className="text-[var(--text-muted)]">
          Manage domains and businesses that should never be added to the CRM.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domains Blacklist */}
        <div className="card">
          <div className="p-4 border-b flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Blacklisted Domains
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Any business with a website matching these domains will be instantly rejected.
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddDomain} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="e.g. google.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700 border-none">Add Domain</button>
            </form>

            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : domains.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No domains blacklisted.</p>
              ) : (
                domains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 border rounded-md" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{d.domain}</span>
                    <button type="button" onClick={() => handleRemoveDomain(d.domain)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Businesses Blacklist */}
        <div className="card">
          <div className="p-4 border-b flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Blacklisted Business Names
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Any business containing these words in their name will be instantly rejected.
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddBusiness} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="e.g. Amazon"
                value={newBusiness}
                onChange={(e) => setNewBusiness(e.target.value)}
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700 border-none">Add Business</button>
            </form>

            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : businesses.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No businesses blacklisted.</p>
              ) : (
                businesses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 border rounded-md" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                    <button type="button" onClick={() => handleRemoveBusiness(b.name)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
