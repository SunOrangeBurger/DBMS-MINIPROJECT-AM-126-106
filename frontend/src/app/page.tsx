'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Shield,
  User,
  Sparkles,
  LogIn,
  LogOut,
  ChevronRight,
  Database,
  Layers,
  Cpu,
  Car,
} from 'lucide-react';
import NetworkHeader from '@/components/NetworkHeader';
import AdminPortal from '@/components/AdminPortal';
import MechanicWorkbench from '@/components/MechanicWorkbench';
import CustomerPortal from '@/components/CustomerPortal';
import SemanticSearchLab from '@/components/SemanticSearchLab';
import LoginModal from '@/components/LoginModal';
import { User as UserType, UserRole } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'admin' | 'mechanic' | 'customer' | 'lab'>('admin');
  const [currentUser, setCurrentUser] = useState<UserType>({
    user_id: 1,
    full_name: 'Admin',
    email: 'admin@autocare.com',
    password_hash: '',
    role: 'admin',
    phone: '9900000000',
    is_active: 1,
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [dbMode, setDbMode] = useState('Checking database...');
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check DB status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.database) {
          setDbMode(data.database.mode);
          setIsDbConnected(data.database.connected);
        }
      })
      .catch(() => {
        setDbMode('Local Repository');
        setIsDbConnected(false);
      });
  }, [refreshKey]);

  const handleLoginSuccess = (user: UserType, role: UserRole) => {
    setCurrentUser(user);
    if (role === 'admin') setActiveTab('admin');
    else if (role === 'staff') setActiveTab('mechanic');
    else if (role === 'customer') setActiveTab('customer');
  };

  const handleLogout = () => {
    setIsLoginOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Network & WiFi Hosting Banner */}
      <NetworkHeader dbMode={dbMode} isDbConnected={isDbConnected} />

      {/* 2. Top Application Navigation */}
      <header className="app-header" id="main-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Wrench size={24} />
          </div>
          <div>
            <div className="brand-title">
              AUTOCARE
              <span className="brand-badge">LEVEL 3 DBMS</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              MySQL 8.4 Relational Core + AI Vector Semantic Engine
            </div>
          </div>
        </div>

        {/* Role Portal Switcher */}
        <nav className="role-nav" aria-label="Portal Navigation" id="portal-navigation">
          <button
            id="nav-tab-admin"
            className={`role-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Shield size={16} />
            <span>Admin Portal</span>
          </button>

          <button
            id="nav-tab-mechanic"
            className={`role-tab-btn ${activeTab === 'mechanic' ? 'active' : ''}`}
            onClick={() => setActiveTab('mechanic')}
          >
            <Wrench size={16} />
            <span>Mechanic Workbench</span>
          </button>

          <button
            id="nav-tab-customer"
            className={`role-tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            <Car size={16} />
            <span>Customer Garage</span>
          </button>

          <button
            id="nav-tab-lab"
            className={`role-tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => setActiveTab('lab')}
          >
            <Sparkles size={16} />
            <span>AI Semantic Lab</span>
          </button>
        </nav>

        {/* User Identity & Switch Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="user-profile-badge">
            <div className="user-avatar">
              {currentUser.full_name?.[0] || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser.full_name}</span>
              <span className="user-role-label">{currentUser.role}</span>
            </div>
          </div>

          <button
            id="btn-switch-account"
            className="btn-secondary btn-sm"
            onClick={() => setIsLoginOpen(true)}
            title="Switch User Role or Sign In"
          >
            <LogIn size={14} />
            <span>Switch Role</span>
          </button>
        </div>
      </header>

      {/* 3. Main Content Body */}
      <main style={{ flex: 1 }} id="portal-content-area">
        {activeTab === 'admin' && (
          <AdminPortal onRefreshNeeded={() => setRefreshKey((k) => k + 1)} />
        )}
        {activeTab === 'mechanic' && (
          <MechanicWorkbench onRefreshNeeded={() => setRefreshKey((k) => k + 1)} />
        )}
        {activeTab === 'customer' && (
          <CustomerPortal onRefreshNeeded={() => setRefreshKey((k) => k + 1)} />
        )}
        {activeTab === 'lab' && (
          <SemanticSearchLab />
        )}
      </main>

      {/* 4. Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', padding: '20px 28px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>AutoCare System</span>
            <span>•</span>
            <span>Level 3 DBMS Project (MySQL 8.4 DDL, Views, Procedures, Triggers & Vector RAG)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Admin: <code>Admin</code> / <code>Admin123</code></span>
            <span>•</span>
            <span style={{ color: 'var(--cyan-primary)' }}>Accessible on Localhost & WiFi LAN</span>
          </div>
        </div>
      </footer>

      {/* 5. Authentication Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
