'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DesktopNavbar from '../components/DesktopNavbar';
import { 
  Users, ShieldAlert, Package, AlertTriangle, 
  Search, Trash2, Ban, CheckCircle, RefreshCw, 
  ExternalLink, Eye, ArrowLeft, ArrowUpRight, 
  Clock, Sparkles, Filter, MoreVertical, X, Check,
  ShieldCheck, AlertCircle, Phone, Mail, MapPin, Tag
} from 'lucide-react';
import { 
  getAllUsers, blockUser, unblockUser, deleteUserAccount,
  getAllAdminListings, removeListing, restoreListing, togglePromoteListing,
  getAbuseReports, resolveReportTicket, getAuditLogs
} from '../services/adminService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('users'); // 'overview' | 'users' | 'listings' | 'reports' | 'audit'

  // Data states
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'active' | 'blocked'

  const [listingSearch, setListingSearch] = useState('');
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'active' | 'removed' | 'promoted'

  const [reportFilter, setReportFilter] = useState('pending'); // 'pending' | 'resolved' | 'all'

  // Action Modals State
  const [modalType, setModalType] = useState(null); // 'block' | 'deleteUser' | 'removeListing' | 'viewListing'
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [purgeAdsOnDelete, setPurgeAdsOnDelete] = useState(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadAllData = async () => {
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
    loadAllData();
    window.addEventListener('infibuy_admin_updated', loadAllData);
    window.addEventListener('buyoh_listings_updated', loadAllData);
    return () => {
      window.removeEventListener('infibuy_admin_updated', loadAllData);
      window.removeEventListener('buyoh_listings_updated', loadAllData);
    };
  }, []);

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

  // Handlers
  const handleConfirmBlock = async () => {
    if (!selectedTarget) return;
    const reason = actionReason.trim() || 'Violating marketplace community guidelines';
    await blockUser(selectedTarget.id, reason);
    showToast(`User ${selectedTarget.name || 'Account'} has been blocked`);
    closeModal();
    loadAllData();
  };

  const handleConfirmUnblock = async (userObj) => {
    await unblockUser(userObj.id);
    showToast(`User ${userObj.name || 'Account'} unblocked`);
    loadAllData();
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedTarget) return;
    await deleteUserAccount(selectedTarget.id, purgeAdsOnDelete);
    showToast(`User ${selectedTarget.name || 'Account'} deleted permanently`);
    closeModal();
    loadAllData();
  };

  const handleConfirmRemoveListing = () => {
    if (!selectedTarget) return;
    const reason = actionReason.trim() || 'Violation of listing rules';
    removeListing(selectedTarget.id, reason);
    showToast(`Listing "${selectedTarget.title}" taken down`);
    closeModal();
    loadAllData();
  };

  const handleRestoreListing = (listingObj) => {
    restoreListing(listingObj.id);
    showToast(`Listing "${listingObj.title}" restored`);
    loadAllData();
  };

  const handleTogglePromote = (listingObj) => {
    const isNowPromoted = togglePromoteListing(listingObj.id);
    showToast(isNowPromoted ? `Boosted "${listingObj.title}"` : `Promotion removed from "${listingObj.title}"`);
    loadAllData();
  };

  const handleResolveReport = (reportId, action, notes) => {
    resolveReportTicket(reportId, action, notes);
    showToast(`Report marked as ${action}`);
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

  return (
    <div className="admin-page-wrapper">
      <DesktopNavbar />

      <div className="admin-container">
        {/* Top Header Bar */}
        <div className="admin-header-card">
          <div className="admin-header-left">
            <button className="back-to-shop-btn" onClick={() => navigate('/')} title="Back to Marketplace">
              <ArrowLeft size={18} />
              <span>Marketplace</span>
            </button>
            <div className="admin-title-badge-row">
              <h1 className="admin-title">Store Owner Back-Office</h1>
              <span className="admin-role-badge">Owner Access</span>
            </div>
            <p className="admin-subtitle">
              Manage registered users, moderate classified adverts, investigate abuse reports, and enforce store policies.
            </p>
          </div>
          <div className="admin-header-right">
            <button className="admin-refresh-btn" onClick={loadAllData} title="Refresh Live Data">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Metric Cards */}
        <div className="admin-metrics-grid">
          <div className="metric-box metric-users" onClick={() => setActiveTab('users')}>
            <div className="metric-icon-wrap">
              <Users size={22} />
            </div>
            <div className="metric-data">
              <span className="metric-label">Registered Accounts</span>
              <span className="metric-val">{totalUsersCount}</span>
            </div>
          </div>

          <div className="metric-box metric-listings" onClick={() => setActiveTab('listings')}>
            <div className="metric-icon-wrap">
              <Package size={22} />
            </div>
            <div className="metric-data">
              <span className="metric-label">Active Adverts</span>
              <span className="metric-val">{activeListingsCount}</span>
            </div>
          </div>

          <div className="metric-box metric-reports" onClick={() => setActiveTab('reports')}>
            <div className="metric-icon-wrap">
              <AlertTriangle size={22} />
            </div>
            <div className="metric-data">
              <span className="metric-label">Abuse Reports</span>
              <span className="metric-val">{pendingReportsCount} Pending</span>
            </div>
          </div>

          <div className="metric-box metric-blocked" onClick={() => { setActiveTab('users'); setUserFilter('blocked'); }}>
            <div className="metric-icon-wrap">
              <Ban size={22} />
            </div>
            <div className="metric-data">
              <span className="metric-label">Suspended Users</span>
              <span className="metric-val">{blockedUsersCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="admin-tabs-bar">
          <button 
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} /> Users Directory ({totalUsersCount})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            <Package size={16} /> Advert Moderation ({listings.length})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <ShieldAlert size={16} /> Abuse & Scam Tickets {pendingReportsCount > 0 && <span className="tab-bubble">{pendingReportsCount}</span>}
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Clock size={16} /> Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: USERS DIRECTORY & ACCOUNT ACTIONS
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="admin-content-section">
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="search-icon-inside" />
                <input 
                  type="text" 
                  className="admin-search-input" 
                  placeholder="Search user by name, phone, email, or user ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                {userSearch && (
                  <button className="clear-search-btn" onClick={() => setUserSearch('')}><X size={14} /></button>
                )}
              </div>

              <div className="admin-pill-filters">
                <button 
                  className={`pill-filter ${userFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setUserFilter('all')}
                >
                  All ({users.length})
                </button>
                <button 
                  className={`pill-filter ${userFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setUserFilter('active')}
                >
                  Active ({users.filter(u => !u.isBlocked).length})
                </button>
                <button 
                  className={`pill-filter ${userFilter === 'blocked' ? 'active' : ''}`}
                  onClick={() => setUserFilter('blocked')}
                >
                  Blocked ({blockedUsersCount})
                </button>
              </div>
            </div>

            {/* Users Table / Grid */}
            {filteredUsers.length === 0 ? (
              <div className="admin-empty-state">
                <Users size={40} className="empty-icon" />
                <h3>No user accounts match your filter</h3>
                <p>Try refining your search keyword or clearing the filters.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Profile</th>
                      <th>Contact Details</th>
                      <th>Location</th>
                      <th>Listings</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={u.isBlocked ? 'row-blocked' : ''}>
                        <td>
                          <div className="user-profile-cell">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="admin-user-avatar" />
                            ) : (
                              <div className="admin-user-avatar-placeholder">
                                {(u.name || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="user-text-info">
                              <span className="user-name-title">{u.name || 'Anonymous User'}</span>
                              <span className="user-sub-id" title={u.id}>ID: {u.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="contact-info-cell">
                            <span className="contact-line"><Phone size={12} /> {u.phone || 'No phone'}</span>
                            <span className="contact-line contact-email"><Mail size={12} /> {u.email || 'No email'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="location-pill"><MapPin size={12} /> {u.location || 'Nigeria'}</span>
                        </td>
                        <td>
                          <span className="listings-counter-badge">{u.listingsCount || 0} ads</span>
                        </td>
                        <td>
                          {u.isBlocked ? (
                            <div className="status-badge-wrap">
                              <span className="badge-status-blocked">
                                <Ban size={12} /> Blocked
                              </span>
                              {u.blockedReason && (
                                <span className="block-reason-hint" title={u.blockedReason}>
                                  Reason: {u.blockedReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="badge-status-active">
                              <CheckCircle size={12} /> Active
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-action-btn-group">
                            {u.isBlocked ? (
                              <button 
                                className="action-btn-unblock" 
                                onClick={() => handleConfirmUnblock(u)}
                                title="Unblock user"
                              >
                                <Check size={14} /> Unblock
                              </button>
                            ) : (
                              <button 
                                className="action-btn-block" 
                                onClick={() => {
                                  setSelectedTarget(u);
                                  setModalType('block');
                                }}
                                title="Suspend or block user"
                              >
                                <Ban size={14} /> Block
                              </button>
                            )}

                            <button 
                              className="action-btn-delete" 
                              onClick={() => {
                                setSelectedTarget(u);
                                setModalType('deleteUser');
                              }}
                              title="Delete user account"
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

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: LISTINGS & ADVERT MODERATION
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'listings' && (
          <div className="admin-content-section">
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="search-icon-inside" />
                <input 
                  type="text" 
                  className="admin-search-input" 
                  placeholder="Search listings by title, seller, category, or location..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                />
                {listingSearch && (
                  <button className="clear-search-btn" onClick={() => setListingSearch('')}><X size={14} /></button>
                )}
              </div>

              <div className="admin-pill-filters">
                <button 
                  className={`pill-filter ${listingFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setListingFilter('all')}
                >
                  All ({listings.length})
                </button>
                <button 
                  className={`pill-filter ${listingFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setListingFilter('active')}
                >
                  Active ({activeListingsCount})
                </button>
                <button 
                  className={`pill-filter ${listingFilter === 'removed' ? 'active' : ''}`}
                  onClick={() => setListingFilter('removed')}
                >
                  Removed ({listings.filter(l => l.status === 'removed').length})
                </button>
                <button 
                  className={`pill-filter ${listingFilter === 'promoted' ? 'active' : ''}`}
                  onClick={() => setListingFilter('promoted')}
                >
                  Promoted ({listings.filter(l => l.isPromoted || l.promoted).length})
                </button>
              </div>
            </div>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
              <div className="admin-empty-state">
                <Package size={40} className="empty-icon" />
                <h3>No adverts match your criteria</h3>
                <p>Try searching with another keyword or changing the filter tab.</p>
              </div>
            ) : (
              <div className="admin-listings-grid">
                {filteredListings.map(item => {
                  const img = item.images?.[0] || item.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80";
                  const isRemoved = item.status === 'removed';
                  const isPromoted = Boolean(item.isPromoted || item.promoted);

                  return (
                    <div key={item.id} className={`admin-ad-card ${isRemoved ? 'card-removed' : ''}`}>
                      <div className="admin-ad-media">
                        <img src={img} alt={item.title || item.name} />
                        {isPromoted && <span className="ad-badge-vip"><Sparkles size={11} /> Boosted</span>}
                        {isRemoved && <span className="ad-badge-removed">Removed</span>}
                      </div>

                      <div className="admin-ad-body">
                        <div className="ad-category-row">
                          <span className="ad-cat-pill">{item.category || 'General'}</span>
                          {item.condition && <span className="ad-condition-pill">{item.condition}</span>}
                        </div>

                        <h4 className="admin-ad-title" title={item.title || item.name}>
                          {item.title || item.name}
                        </h4>

                        <div className="admin-ad-price">
                          ₦{new Intl.NumberFormat('en-NG').format(item.price || 0)}
                        </div>

                        <div className="admin-ad-seller-row">
                          <span className="seller-name"><Users size={12} /> {item.sellerName || 'Seller'}</span>
                          <span className="location-name"><MapPin size={12} /> {item.location || 'Lagos'}</span>
                        </div>

                        {item.removeReason && (
                          <div className="remove-reason-notice">
                            Reason: {item.removeReason}
                          </div>
                        )}

                        <div className="admin-ad-footer-actions">
                          <button 
                            className="btn-view-product"
                            onClick={() => navigate(`/product/${item.id}`)}
                            title="View public product page"
                          >
                            <ExternalLink size={13} /> View
                          </button>

                          <button 
                            className={`btn-promote-toggle ${isPromoted ? 'promoted-active' : ''}`}
                            onClick={() => handleTogglePromote(item)}
                            title={isPromoted ? 'Remove boost' : 'Promote listing'}
                          >
                            <Sparkles size={13} /> {isPromoted ? 'Boosted' : 'Boost'}
                          </button>

                          {isRemoved ? (
                            <button 
                              className="btn-restore-ad"
                              onClick={() => handleRestoreListing(item)}
                              title="Restore listing"
                            >
                              <CheckCircle size={13} /> Restore
                            </button>
                          ) : (
                            <button 
                              className="btn-take-down-ad"
                              onClick={() => {
                                setSelectedTarget(item);
                                setModalType('removeListing');
                              }}
                              title="Take down advert"
                            >
                              <Trash2 size={13} /> Take down
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

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3: ABUSE, FRAUD & SCAM REPORTS
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="admin-content-section">
            <div className="admin-filter-bar">
              <h3 className="section-subheading">User Abuse & Fraud Complaint Tickets</h3>
              <div className="admin-pill-filters">
                <button 
                  className={`pill-filter ${reportFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setReportFilter('pending')}
                >
                  Pending ({reports.filter(r => r.status === 'pending').length})
                </button>
                <button 
                  className={`pill-filter ${reportFilter === 'resolved' ? 'active' : ''}`}
                  onClick={() => setReportFilter('resolved')}
                >
                  Resolved ({reports.filter(r => r.status !== 'pending').length})
                </button>
                <button 
                  className={`pill-filter ${reportFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setReportFilter('all')}
                >
                  All Tickets ({reports.length})
                </button>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="admin-empty-state">
                <ShieldCheck size={48} className="empty-icon-shield" />
                <h3>No complaints in this queue</h3>
                <p>The marketplace is clean and all reports have been investigated.</p>
              </div>
            ) : (
              <div className="reports-ticket-list">
                {filteredReports.map(ticket => (
                  <div key={ticket.id} className={`report-ticket-card status-${ticket.status}`}>
                    <div className="ticket-top-row">
                      <div className="ticket-reason-box">
                        <AlertTriangle size={16} className="reason-alert-icon" />
                        <span className="ticket-reason-text">{ticket.reason}</span>
                      </div>
                      <span className={`ticket-status-pill status-${ticket.status}`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="ticket-body">
                      <p className="ticket-details-paragraph">"{ticket.details}"</p>
                      
                      <div className="ticket-meta-grid">
                        <div className="meta-cell">
                          <span className="meta-label">REPORTED LISTING</span>
                          <span className="meta-val">{ticket.listingTitle || 'N/A'}</span>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-label">REPORTED SELLER</span>
                          <span className="meta-val">{ticket.reportedUserName || 'N/A'}</span>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-label">COMPLAINT BY</span>
                          <span className="meta-val">{ticket.reporterName || 'Buyer'}</span>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-label">FILED AT</span>
                          <span className="meta-val">{new Date(ticket.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {ticket.status === 'pending' && (
                      <div className="ticket-actions-row">
                        <button 
                          className="btn-ticket-takedown"
                          onClick={() => {
                            removeListing(ticket.listingId, `Reported for: ${ticket.reason}`);
                            handleResolveReport(ticket.id, 'actioned', 'Ad removed by moderator');
                          }}
                        >
                          <Trash2 size={13} /> Take Down Advert
                        </button>

                        <button 
                          className="btn-ticket-ban"
                          onClick={() => {
                            blockUser(ticket.reportedUserId, `Repeated complaints: ${ticket.reason}`);
                            handleResolveReport(ticket.id, 'actioned', 'Seller suspended');
                          }}
                        >
                          <Ban size={13} /> Suspend Seller
                        </button>

                        <button 
                          className="btn-ticket-dismiss"
                          onClick={() => handleResolveReport(ticket.id, 'dismissed', 'False alarm / dismissed')}
                        >
                          <Check size={13} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 4: AUDIT TRAIL & LOGS
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'audit' && (
          <div className="admin-content-section">
            <h3 className="section-subheading">Store Owner Security & Moderation Log</h3>
            <p className="section-subtitle">Chronological record of user blocks, account purges, listing removals, and resolutions.</p>

            {auditLogs.length === 0 ? (
              <div className="admin-empty-state">
                <Clock size={40} className="empty-icon" />
                <h3>No activity logged yet</h3>
                <p>Actions performed by store owners and moderators will appear here.</p>
              </div>
            ) : (
              <div className="audit-logs-list">
                {auditLogs.map(log => (
                  <div key={log.id} className="audit-log-item">
                    <div className="audit-icon-bullet">
                      <Clock size={14} />
                    </div>
                    <div className="audit-log-content">
                      <div className="audit-title-row">
                        <span className="audit-action-tag">{log.action}</span>
                        <span className="audit-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="audit-details-text">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 1: BLOCK USER CONFIRMATION
         ════════════════════════════════════════════════════════════════════ */}
      {modalType === 'block' && selectedTarget && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger-header">
              <div className="modal-icon-circle danger-icon">
                <Ban size={22} />
              </div>
              <div className="modal-title-text">
                <h3>Suspend / Block User</h3>
                <p>Prevent <strong>{selectedTarget.name}</strong> from logging in and listing ads.</p>
              </div>
            </div>

            <div className="modal-body">
              <label className="modal-input-label">Reason for Suspension / Ban:</label>
              <textarea 
                className="modal-textarea"
                rows={3}
                placeholder="e.g. Non-delivery of goods, fraudulent payment claims, harassment..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-modal-confirm-danger" onClick={handleConfirmBlock}>
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 2: DELETE USER CONFIRMATION
         ════════════════════════════════════════════════════════════════════ */}
      {modalType === 'deleteUser' && selectedTarget && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger-header">
              <div className="modal-icon-circle danger-icon">
                <Trash2 size={22} />
              </div>
              <div className="modal-title-text">
                <h3>Delete User Account</h3>
                <p>Permanently erase account for <strong>{selectedTarget.name}</strong>.</p>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-warning-box">
                <AlertCircle size={18} />
                <span>This action cannot be undone. All user profile records will be permanently deleted.</span>
              </div>

              <label className="checkbox-row-label">
                <input 
                  type="checkbox" 
                  checked={purgeAdsOnDelete} 
                  onChange={(e) => setPurgeAdsOnDelete(e.target.checked)} 
                />
                <span>Also delete and remove all marketplace adverts posted by this user</span>
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-modal-confirm-danger" onClick={handleConfirmDeleteUser}>
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL 3: REMOVE LISTING CONFIRMATION
         ════════════════════════════════════════════════════════════════════ */}
      {modalType === 'removeListing' && selectedTarget && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger-header">
              <div className="modal-icon-circle danger-icon">
                <Trash2 size={22} />
              </div>
              <div className="modal-title-text">
                <h3>Take Down Advert</h3>
                <p>Remove <strong>{selectedTarget.title || selectedTarget.name}</strong> from public discovery.</p>
              </div>
            </div>

            <div className="modal-body">
              <label className="modal-input-label">Reason for removal:</label>
              <textarea 
                className="modal-textarea"
                rows={3}
                placeholder="e.g. Prohibited item, copyright violation, duplicate listing..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-modal-confirm-danger" onClick={handleConfirmRemoveListing}>
                Take Down Advert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="admin-floating-toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
