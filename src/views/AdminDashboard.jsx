'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, ShieldAlert, Package, AlertTriangle, 
  Search, Trash2, Ban, CheckCircle, RefreshCw, 
  ExternalLink, Eye, ArrowLeft, ArrowUpRight, 
  Clock, Sparkles, Filter, MoreVertical, X, Check,
  ShieldCheck, AlertCircle, Phone, Mail, MapPin, Tag,
  Lock, LogOut, LayoutDashboard, FileText, ChevronRight
} from 'lucide-react';
import { 
  getAdminSession, loginAdmin, logoutAdmin,
  getAllUsers, blockUser, unblockUser, deleteUserAccount,
  getAllAdminListings, removeListing, restoreListing, togglePromoteListing,
  getAbuseReports, resolveReportTicket, getAuditLogs
} from '../services/adminService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));

  // Admin Authentication State
  const [adminSession, setAdminSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@infibuy.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'listings' | 'reports' | 'audit'

  // Data states
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'active' | 'blocked'

  const [listingSearch, setListingSearch] = useState('');
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'active' | 'removed' | 'promoted'

  const [reportFilter, setReportFilter] = useState('pending'); // 'pending' | 'resolved' | 'all'

  // Action Modals State
  const [modalType, setModalType] = useState(null); // 'block' | 'deleteUser' | 'removeListing'
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [purgeAdsOnDelete, setPurgeAdsOnDelete] = useState(true);

  // Verify Admin Session on mount
  useEffect(() => {
    const session = getAdminSession();
    setAdminSession(session);
    setAuthChecked(true);

    const handleSync = () => {
      setAdminSession(getAdminSession());
    };
    window.addEventListener('infibuy_admin_updated', handleSync);
    return () => window.removeEventListener('infibuy_admin_updated', handleSync);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadAllData = async () => {
    if (!adminSession) return;
    setLoading(true);
    try {
      const [uData, lData, rData, aData] = await Promise.all([
        getAllUsers(),
        Promise.resolve(getAllAdminListings()),
        Promise.resolve(getAbuseReports()),
        Promise.resolve(getAuditLogs())
      ]);
      setUsers(uData);
      setListings(lData);
      setReports(rData);
      setAuditLogs(aData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Error syncing dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminSession) {
      loadAllData();
      window.addEventListener('infibuy_admin_updated', loadAllData);
      window.addEventListener('buyoh_listings_updated', loadAllData);
      return () => {
        window.removeEventListener('infibuy_admin_updated', loadAllData);
        window.removeEventListener('buyoh_listings_updated', loadAllData);
      };
    }
  }, [adminSession]);

  // Login handler
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    setTimeout(() => {
      const res = loginAdmin(loginEmail, loginPassword);
      if (res.success) {
        setAdminSession(res.session);
        setLoginPassword('');
        showToast('Admin authenticated successfully');
      } else {
        setLoginError(res.error || 'Authentication failed');
      }
      setIsSubmittingLogin(false);
    }, 300);
  };

  // Logout handler
  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminSession(null);
    showToast('Admin session terminated');
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearch.toLowerCase();
      const matchesSearch = 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (userFilter === 'active') return !u.isBlocked;
      if (userFilter === 'blocked') return u.isBlocked;
      return true;
    });
  }, [users, userSearch, userFilter]);

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const q = listingSearch.toLowerCase();
      const matchesSearch = 
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.sellerName && l.sellerName.toLowerCase().includes(q)) ||
        (l.category && l.category.toLowerCase().includes(q)) ||
        (l.location && l.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (listingFilter === 'active') return l.status === 'active';
      if (listingFilter === 'removed') return l.status === 'removed';
      if (listingFilter === 'promoted') return Boolean(l.isPromoted || l.promoted);
      return true;
    });
  }, [listings, listingSearch, listingFilter]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (reportFilter === 'pending') return r.status === 'pending';
      if (reportFilter === 'resolved') return r.status !== 'pending';
      return true;
    });
  }, [reports, reportFilter]);

  // Action handlers
  const handleConfirmBlock = async () => {
    if (!selectedTarget) return;
    const reason = actionReason.trim() || 'Violation of marketplace terms';
    await blockUser(selectedTarget.id, reason);
    showToast(`User account suspended`);
    closeModal();
    loadAllData();
  };

  const handleConfirmUnblock = async (userObj) => {
    await unblockUser(userObj.id);
    showToast(`User account reinstated`);
    loadAllData();
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedTarget) return;
    await deleteUserAccount(selectedTarget.id, purgeAdsOnDelete);
    showToast(`User account permanently deleted`);
    closeModal();
    loadAllData();
  };

  const handleConfirmRemoveListing = () => {
    if (!selectedTarget) return;
    const reason = actionReason.trim() || 'Violation of marketplace rules';
    removeListing(selectedTarget.id, reason);
    showToast(`Listing taken down`);
    closeModal();
    loadAllData();
  };

  const handleRestoreListing = (listingObj) => {
    restoreListing(listingObj.id);
    showToast(`Listing restored to active marketplace`);
    loadAllData();
  };

  const handleTogglePromote = (listingObj) => {
    const isNowPromoted = togglePromoteListing(listingObj.id);
    showToast(isNowPromoted ? `Boost applied to listing` : `Promotion removed`);
    loadAllData();
  };

  const handleResolveReport = (reportId, action, notes) => {
    resolveReportTicket(reportId, action, notes);
    showToast(`Ticket status updated to ${action}`);
    loadAllData();
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTarget(null);
    setActionReason('');
  };

  // Metrics summary
  const totalUsersCount = users.length;
  const blockedUsersCount = users.filter(u => u.isBlocked).length;
  const activeListingsCount = listings.filter(l => l.status === 'active').length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  if (!authChecked) {
    return null; // Initial loading check
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN AUTHENTICATION GATE (When admin session is not active)
  // ══════════════════════════════════════════════════════════════════════════
  if (!adminSession) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-box">
          <div className="admin-login-header">
            <div className="admin-brand-row">
              <span className="admin-brand-main">Infi<span className="brand-dot">Buy</span></span>
              <span className="admin-badge-tag">ADMIN</span>
            </div>
            <h2 className="admin-login-title">Administrator Authentication</h2>
            <p className="admin-login-subtext">Restricted system. Authorized administration personnel only.</p>
          </div>

          {loginError && (
            <div className="admin-login-error-banner">
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="admin-login-form">
            <div className="admin-form-group">
              <label htmlFor="adminEmail">Admin Email</label>
              <div className="admin-input-wrap">
                <Mail size={16} className="input-icon" />
                <input 
                  id="adminEmail"
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@infibuy.com"
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label htmlFor="adminPassword">Password</label>
              <div className="admin-input-wrap">
                <Lock size={16} className="input-icon" />
                <input 
                  id="adminPassword"
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <span className="default-pass-hint">Default development credentials: <strong>admin@infibuy.com</strong> / <strong>admin123</strong></span>
            </div>

            <button 
              type="submit" 
              className="admin-login-submit-btn" 
              disabled={isSubmittingLogin}
            >
              {isSubmittingLogin ? 'Verifying...' : 'Sign In to Administration Console'}
            </button>
          </form>

          <div className="admin-login-footer">
            <button className="link-back-to-site" onClick={() => navigate('/')}>
              <ArrowLeft size={14} /> Back to InfiBuy Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATED ADMIN DASHBOARD LAYOUT (Sidebar + Main Content Canvas)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="admin-dashboard-layout">
      {/* ── SOLID ADMIN SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand-block">
          <div className="sidebar-brand">
            <span className="brand-title">Infi<span className="brand-dot">Buy</span></span>
            <span className="sidebar-admin-pill">ADMIN</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`sidebar-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            <span>Users Directory</span>
            {totalUsersCount > 0 && <span className="nav-count-badge">{totalUsersCount}</span>}
          </button>

          <button 
            className={`sidebar-nav-item ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            <Package size={18} />
            <span>Advert Moderation</span>
            {listings.length > 0 && <span className="nav-count-badge">{listings.length}</span>}
          </button>

          <button 
            className={`sidebar-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <ShieldAlert size={18} />
            <span>Abuse Reports</span>
            {pendingReportsCount > 0 && <span className="nav-count-alert">{pendingReportsCount}</span>}
          </button>

          <button 
            className={`sidebar-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Clock size={18} />
            <span>Audit Trail</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link-site" onClick={() => navigate('/')}>
            <ExternalLink size={14} />
            <span>View Marketplace</span>
          </button>

          <div className="admin-user-profile-widget">
            <div className="admin-avatar-small">A</div>
            <div className="admin-meta">
              <span className="admin-meta-role">Super Admin</span>
              <span className="admin-meta-email" title={adminSession.email}>{adminSession.email}</span>
            </div>
            <button className="btn-admin-logout" onClick={handleAdminLogout} title="Sign Out of Admin">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT CANVAS ── */}
      <main className="admin-main-canvas">
        {/* Top Operational Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <span className="topbar-breadcrumb">Admin Console</span>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="topbar-current-page">
              {activeTab === 'overview' && 'System Overview'}
              {activeTab === 'users' && 'User Governance'}
              {activeTab === 'listings' && 'Adverts & Listings'}
              {activeTab === 'reports' && 'Complaints & Abuse Tickets'}
              {activeTab === 'audit' && 'Security Audit Trail'}
            </span>
          </div>

          <div className="topbar-right">
            <button className="btn-topbar-sync" onClick={loadAllData} title="Sync database in real-time">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </header>

        <div className="admin-content-body">
          {/* ══════════════════════════════════════════════════════════════════
              VIEW 0: SYSTEM OVERVIEW (KPIs & SUMMARY)
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="overview-container">
              <div className="overview-headline">
                <h2>Administrative Overview</h2>
                <p>Real-time platform statistics across registered accounts, listings, and moderation queues.</p>
              </div>

              <div className="admin-kpi-grid">
                <div className="kpi-card" onClick={() => setActiveTab('users')}>
                  <div className="kpi-top">
                    <span className="kpi-title">Total Users</span>
                    <Users size={20} className="kpi-icon-neutral" />
                  </div>
                  <div className="kpi-number">{totalUsersCount}</div>
                  <div className="kpi-footer">
                    <span>{blockedUsersCount} suspended</span>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('listings')}>
                  <div className="kpi-top">
                    <span className="kpi-title">Active Adverts</span>
                    <Package size={20} className="kpi-icon-success" />
                  </div>
                  <div className="kpi-number">{activeListingsCount}</div>
                  <div className="kpi-footer">
                    <span>{listings.filter(l => l.status === 'removed').length} taken down</span>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('reports')}>
                  <div className="kpi-top">
                    <span className="kpi-title">Pending Reports</span>
                    <AlertTriangle size={20} className="kpi-icon-warning" />
                  </div>
                  <div className="kpi-number">{pendingReportsCount}</div>
                  <div className="kpi-footer">
                    <span>{reports.length} total tickets</span>
                  </div>
                </div>

                <div className="kpi-card" onClick={() => setActiveTab('audit')}>
                  <div className="kpi-top">
                    <span className="kpi-title">Audit Logs</span>
                    <Clock size={20} className="kpi-icon-neutral" />
                  </div>
                  <div className="kpi-number">{auditLogs.length}</div>
                  <div className="kpi-footer">
                    <span>Administrative actions</span>
                  </div>
                </div>
              </div>

              <div className="overview-split-grid">
                <div className="overview-panel">
                  <div className="panel-header">
                    <h3>Recent Administrative Actions</h3>
                    <button className="btn-link-action" onClick={() => setActiveTab('audit')}>View all</button>
                  </div>
                  <div className="panel-body">
                    {auditLogs.length === 0 ? (
                      <p className="empty-panel-text">No administrative actions logged yet.</p>
                    ) : (
                      <div className="recent-logs-list">
                        {auditLogs.slice(0, 5).map(log => (
                          <div key={log.id} className="recent-log-row">
                            <span className="log-badge-action">{log.action}</span>
                            <span className="log-details-text">{log.details}</span>
                            <span className="log-time-text">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overview-panel">
                  <div className="panel-header">
                    <h3>Recent User Accounts</h3>
                    <button className="btn-link-action" onClick={() => setActiveTab('users')}>Manage users</button>
                  </div>
                  <div className="panel-body">
                    {users.length === 0 ? (
                      <p className="empty-panel-text">No user accounts found in database.</p>
                    ) : (
                      <div className="recent-users-list">
                        {users.slice(0, 5).map(u => (
                          <div key={u.id} className="recent-user-row">
                            <div className="recent-user-avatar">{(u.name || 'U')[0].toUpperCase()}</div>
                            <div className="recent-user-info">
                              <span className="recent-user-name">{u.name}</span>
                              <span className="recent-user-phone">{u.phone}</span>
                            </div>
                            <span className={`status-tag ${u.isBlocked ? 'tag-blocked' : 'tag-active'}`}>
                              {u.isBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 1: USERS DIRECTORY & GOVERNANCE
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="admin-view-container">
              <div className="view-header-row">
                <div>
                  <h2 className="view-title">User Accounts Governance</h2>
                  <p className="view-description">Search, review, suspend, or delete user accounts across InfiBuy.</p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="admin-toolbar">
                <div className="toolbar-search-wrap">
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search by user name, phone, email, or user ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {userSearch && <button className="btn-clear-input" onClick={() => setUserSearch('')}><X size={14} /></button>}
                </div>

                <div className="toolbar-filters">
                  <button 
                    className={`btn-filter-pill ${userFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setUserFilter('all')}
                  >
                    All Accounts ({users.length})
                  </button>
                  <button 
                    className={`btn-filter-pill ${userFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setUserFilter('active')}
                  >
                    Active ({users.filter(u => !u.isBlocked).length})
                  </button>
                  <button 
                    className={`btn-filter-pill ${userFilter === 'blocked' ? 'active' : ''}`}
                    onClick={() => setUserFilter('blocked')}
                  >
                    Blocked ({blockedUsersCount})
                  </button>
                </div>
              </div>

              {/* Solid Data Table */}
              {filteredUsers.length === 0 ? (
                <div className="admin-table-empty">
                  <Users size={36} />
                  <h3>No accounts found</h3>
                  <p>No user accounts matched the current query or filter criteria.</p>
                </div>
              ) : (
                <div className="admin-table-card">
                  <table className="solid-admin-table">
                    <thead>
                      <tr>
                        <th>User Name & ID</th>
                        <th>Phone & Email</th>
                        <th>Location</th>
                        <th>Adverts</th>
                        <th>Account Status</th>
                        <th style={{ textAlign: 'right' }}>Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className={u.isBlocked ? 'tr-blocked' : ''}>
                          <td>
                            <div className="user-ident-cell">
                              <div className="user-circle-avatar">
                                {u.avatar ? <img src={u.avatar} alt={u.name} /> : (u.name || 'U')[0].toUpperCase()}
                              </div>
                              <div className="user-ident-text">
                                <span className="user-primary-name">{u.name || 'Unnamed User'}</span>
                                <span className="user-id-code" title={u.id}>ID: {u.id.substring(0, 10)}...</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="contact-cell">
                              <span className="contact-item"><Phone size={12} /> {u.phone || 'N/A'}</span>
                              <span className="contact-item-muted"><Mail size={12} /> {u.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td>
                            <span className="text-location">{u.location || 'Nigeria'}</span>
                          </td>
                          <td>
                            <span className="badge-adverts-count">{u.listingsCount || 0} ads</span>
                          </td>
                          <td>
                            {u.isBlocked ? (
                              <div className="blocked-status-block">
                                <span className="tag-solid-blocked"><Ban size={12} /> Suspended</span>
                                {u.blockedReason && <span className="blocked-note" title={u.blockedReason}>Reason: {u.blockedReason}</span>}
                              </div>
                            ) : (
                              <span className="tag-solid-active"><CheckCircle size={12} /> Active</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions-cluster">
                              {u.isBlocked ? (
                                <button 
                                  className="btn-action-reinstate"
                                  onClick={() => handleConfirmUnblock(u)}
                                  title="Unblock this user account"
                                >
                                  Reinstate
                                </button>
                              ) : (
                                <button 
                                  className="btn-action-suspend"
                                  onClick={() => {
                                    setSelectedTarget(u);
                                    setModalType('block');
                                  }}
                                  title="Suspend / Block this user account"
                                >
                                  Suspend
                                </button>
                              )}

                              <button 
                                className="btn-action-delete"
                                onClick={() => {
                                  setSelectedTarget(u);
                                  setModalType('deleteUser');
                                }}
                                title="Permanently delete user account"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 2: ADVERT MODERATION
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'listings' && (
            <div className="admin-view-container">
              <div className="view-header-row">
                <div>
                  <h2 className="view-title">Advert Moderation Console</h2>
                  <p className="view-description">Review, take down non-compliant listings, or feature listings across the marketplace.</p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="admin-toolbar">
                <div className="toolbar-search-wrap">
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search adverts by title, category, seller, location..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                  />
                  {listingSearch && <button className="btn-clear-input" onClick={() => setListingSearch('')}><X size={14} /></button>}
                </div>

                <div className="toolbar-filters">
                  <button 
                    className={`btn-filter-pill ${listingFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setListingFilter('all')}
                  >
                    All ({listings.length})
                  </button>
                  <button 
                    className={`btn-filter-pill ${listingFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setListingFilter('active')}
                  >
                    Active ({activeListingsCount})
                  </button>
                  <button 
                    className={`btn-filter-pill ${listingFilter === 'removed' ? 'active' : ''}`}
                    onClick={() => setListingFilter('removed')}
                  >
                    Removed ({listings.filter(l => l.status === 'removed').length})
                  </button>
                  <button 
                    className={`btn-filter-pill ${listingFilter === 'promoted' ? 'active' : ''}`}
                    onClick={() => setListingFilter('promoted')}
                  >
                    Boosted ({listings.filter(l => l.isPromoted || l.promoted).length})
                  </button>
                </div>
              </div>

              {/* Solid Listing Cards Grid */}
              {filteredListings.length === 0 ? (
                <div className="admin-table-empty">
                  <Package size={36} />
                  <h3>No adverts match this criteria</h3>
                  <p>Try refining your search keyword or selecting a different filter.</p>
                </div>
              ) : (
                <div className="solid-listings-grid">
                  {filteredListings.map(item => {
                    const img = item.images?.[0] || item.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80";
                    const isRemoved = item.status === 'removed';
                    const isPromoted = Boolean(item.isPromoted || item.promoted);

                    return (
                      <div key={item.id} className={`solid-ad-card ${isRemoved ? 'ad-card-removed' : ''}`}>
                        <div className="ad-card-media-wrap">
                          <img src={img} alt={item.title || item.name} />
                          {isPromoted && <span className="solid-pill-boosted"><Sparkles size={11} /> Boosted</span>}
                          {isRemoved && <span className="solid-pill-removed">Removed</span>}
                        </div>

                        <div className="ad-card-content">
                          <div className="ad-tags-row">
                            <span className="solid-tag-cat">{item.category || 'General'}</span>
                            {item.condition && <span className="solid-tag-cond">{item.condition}</span>}
                          </div>

                          <h4 className="ad-card-title" title={item.title || item.name}>{item.title || item.name}</h4>
                          <div className="ad-card-price">₦{new Intl.NumberFormat('en-NG').format(item.price || 0)}</div>

                          <div className="ad-card-meta-line">
                            <span><Users size={12} /> {item.sellerName || 'Seller'}</span>
                            <span><MapPin size={12} /> {item.location || 'Lagos'}</span>
                          </div>

                          {item.removeReason && (
                            <div className="ad-remove-reason-notice">
                              Take down reason: {item.removeReason}
                            </div>
                          )}

                          <div className="ad-card-actions-cluster">
                            <button 
                              className="btn-ad-view"
                              onClick={() => navigate(`/product/${item.id}`)}
                            >
                              <ExternalLink size={12} /> View
                            </button>

                            <button 
                              className={`btn-ad-boost ${isPromoted ? 'boosted' : ''}`}
                              onClick={() => handleTogglePromote(item)}
                            >
                              <Sparkles size={12} /> {isPromoted ? 'Boosted' : 'Boost'}
                            </button>

                            {isRemoved ? (
                              <button 
                                className="btn-ad-restore"
                                onClick={() => handleRestoreListing(item)}
                              >
                                Restore
                              </button>
                            ) : (
                              <button 
                                className="btn-ad-takedown"
                                onClick={() => {
                                  setSelectedTarget(item);
                                  setModalType('removeListing');
                                }}
                              >
                                Take Down
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 3: ABUSE & SCAM REPORTS
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="admin-view-container">
              <div className="view-header-row">
                <div>
                  <h2 className="view-title">Abuse & Scam Complaint Tickets</h2>
                  <p className="view-description">Investigate user reports regarding fake items, suspicious payments, and misleading listings.</p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="admin-toolbar">
                <div className="toolbar-filters">
                  <button 
                    className={`btn-filter-pill ${reportFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setReportFilter('pending')}
                  >
                    Pending ({reports.filter(r => r.status === 'pending').length})
                  </button>
                  <button 
                    className={`btn-filter-pill ${reportFilter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setReportFilter('resolved')}
                  >
                    Resolved ({reports.filter(r => r.status !== 'pending').length})
                  </button>
                  <button 
                    className={`btn-filter-pill ${reportFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setReportFilter('all')}
                  >
                    All Tickets ({reports.length})
                  </button>
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="admin-table-empty">
                  <ShieldCheck size={40} className="icon-green" />
                  <h3>No complaint tickets in this queue</h3>
                  <p>All user reports have been investigated and resolved.</p>
                </div>
              ) : (
                <div className="solid-reports-list">
                  {filteredReports.map(ticket => (
                    <div key={ticket.id} className={`solid-report-card status-${ticket.status}`}>
                      <div className="report-card-header">
                        <div className="report-reason-headline">
                          <AlertTriangle size={16} className="alert-icon-warning" />
                          <span className="reason-text">{ticket.reason}</span>
                        </div>
                        <span className={`status-pill pill-${ticket.status}`}>{ticket.status.toUpperCase()}</span>
                      </div>

                      <div className="report-card-body">
                        <div className="complaint-quote-box">"{ticket.details}"</div>

                        <div className="complaint-meta-grid">
                          <div className="meta-block">
                            <span className="label">TARGET LISTING</span>
                            <span className="val">{ticket.listingTitle || 'N/A'}</span>
                          </div>
                          <div className="meta-block">
                            <span className="label">REPORTED SELLER</span>
                            <span className="val">{ticket.reportedUserName || 'N/A'}</span>
                          </div>
                          <div className="meta-block">
                            <span className="label">REPORTED BY</span>
                            <span className="val">{ticket.reporterName || 'Buyer'}</span>
                          </div>
                          <div className="meta-block">
                            <span className="label">TIMESTAMP</span>
                            <span className="val">{new Date(ticket.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {ticket.status === 'pending' && (
                        <div className="report-card-actions">
                          <button 
                            className="btn-report-takedown"
                            onClick={() => {
                              removeListing(ticket.listingId, `Report ticket: ${ticket.reason}`);
                              handleResolveReport(ticket.id, 'actioned', 'Ad removed by admin');
                            }}
                          >
                            <Trash2 size={13} /> Take Down Advert
                          </button>

                          <button 
                            className="btn-report-suspend"
                            onClick={() => {
                              blockUser(ticket.reportedUserId, `Report ticket: ${ticket.reason}`);
                              handleResolveReport(ticket.id, 'actioned', 'User suspended');
                            }}
                          >
                            <Ban size={13} /> Suspend Seller
                          </button>

                          <button 
                            className="btn-report-dismiss"
                            onClick={() => handleResolveReport(ticket.id, 'dismissed', 'Dismissed by admin')}
                          >
                            Dismiss Ticket
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 4: SECURITY AUDIT TRAIL
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit' && (
            <div className="admin-view-container">
              <div className="view-header-row">
                <div>
                  <h2 className="view-title">Security & Administrative Audit Log</h2>
                  <p className="view-description">Immutable chronological log of all administrator operations, account actions, and listing moderation.</p>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className="admin-table-empty">
                  <Clock size={36} />
                  <h3>No activity logged yet</h3>
                  <p>Actions performed in this console will be recorded here.</p>
                </div>
              ) : (
                <div className="solid-audit-list">
                  {auditLogs.map(log => (
                    <div key={log.id} className="solid-audit-row">
                      <div className="audit-marker"><Clock size={14} /></div>
                      <div className="audit-content">
                        <div className="audit-top">
                          <span className="audit-badge">{log.action}</span>
                          <span className="audit-admin-agent">Operator: {log.admin}</span>
                          <span className="audit-time">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="audit-details">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: SUSPEND USER CONFIRMATION ── */}
      {modalType === 'block' && selectedTarget && (
        <div className="solid-modal-backdrop" onClick={closeModal}>
          <div className="solid-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="solid-modal-header header-danger">
              <div className="modal-icon-badge icon-danger"><Ban size={20} /></div>
              <div>
                <h3>Suspend User Account</h3>
                <p>Restrict <strong>{selectedTarget.name}</strong> from logging in and posting.</p>
              </div>
            </div>

            <div className="solid-modal-body">
              <label className="solid-label">Mandatory Reason for Suspension:</label>
              <textarea 
                className="solid-textarea"
                rows={3}
                placeholder="e.g. Fraudulent payment demands, non-delivery, policy violation..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>

            <div className="solid-modal-footer">
              <button className="btn-solid-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-solid-danger" onClick={handleConfirmBlock}>Confirm Suspension</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE USER CONFIRMATION ── */}
      {modalType === 'deleteUser' && selectedTarget && (
        <div className="solid-modal-backdrop" onClick={closeModal}>
          <div className="solid-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="solid-modal-header header-danger">
              <div className="modal-icon-badge icon-danger"><Trash2 size={20} /></div>
              <div>
                <h3>Permanently Delete Account</h3>
                <p>Erase account data for <strong>{selectedTarget.name}</strong>.</p>
              </div>
            </div>

            <div className="solid-modal-body">
              <div className="danger-alert-callout">
                <AlertCircle size={18} />
                <span>This action is immediate and cannot be undone. User records and credentials will be removed.</span>
              </div>

              <label className="solid-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={purgeAdsOnDelete} 
                  onChange={(e) => setPurgeAdsOnDelete(e.target.checked)} 
                />
                <span>Also purge and remove all adverts posted by this user from the marketplace</span>
              </label>
            </div>

            <div className="solid-modal-footer">
              <button className="btn-solid-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-solid-danger" onClick={handleConfirmDeleteUser}>Permanently Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REMOVE LISTING CONFIRMATION ── */}
      {modalType === 'removeListing' && selectedTarget && (
        <div className="solid-modal-backdrop" onClick={closeModal}>
          <div className="solid-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="solid-modal-header header-danger">
              <div className="modal-icon-badge icon-danger"><Trash2 size={20} /></div>
              <div>
                <h3>Take Down Advert</h3>
                <p>Remove <strong>{selectedTarget.title || selectedTarget.name}</strong> from public discovery.</p>
              </div>
            </div>

            <div className="solid-modal-body">
              <label className="solid-label">Reason for Takedown:</label>
              <textarea 
                className="solid-textarea"
                rows={3}
                placeholder="e.g. Prohibited item, copyright violation, duplicate advert..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>

            <div className="solid-modal-footer">
              <button className="btn-solid-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-solid-danger" onClick={handleConfirmRemoveListing}>Take Down Advert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SOLID TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="solid-admin-toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
