'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, Server, CheckCircle2, Copy, Check, ShieldAlert } from 'lucide-react';

interface NetworkHeaderProps {
  dbMode: string;
  isDbConnected: boolean;
}

export default function NetworkHeader({ dbMode, isDbConnected }: NetworkHeaderProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [hostIp, setHostIp] = useState('10.1.25.99');
  const [port, setPort] = useState('3000');

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.hostIp) setHostIp(data.hostIp);
        if (data.port) setPort(String(data.port));
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const localUrl = `http://localhost:${port}`;
  const wifiUrl = `http://${hostIp}:${port}`;

  return (
    <div className="network-banner" id="network-status-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div className={`network-badge ${isDbConnected ? 'online' : ''}`}>
          <div className="badge-dot" />
          <Server size={13} />
          <span>DB: {dbMode}</span>
        </div>

        <div className="network-badge online">
          <Wifi size={13} />
          <span>WiFi Hosting: Active</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Local:</span>
          <code style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
            {localUrl}
          </code>
          <button
            onClick={() => copyToClipboard(localUrl, 'local')}
            title="Copy Local URL"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
          >
            {copied === 'local' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
          </button>
        </div>

        <span style={{ color: 'var(--border-medium)' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>WiFi / LAN:</span>
          <code style={{ color: 'var(--cyan-primary)', background: 'rgba(0, 240, 255, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            {wifiUrl}
          </code>
          <button
            onClick={() => copyToClipboard(wifiUrl, 'wifi')}
            title="Copy WiFi URL to access from phones/devices"
            style={{ background: 'none', border: 'none', color: 'var(--cyan-primary)', cursor: 'pointer', padding: '2px' }}
          >
            {copied === 'wifi' ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
