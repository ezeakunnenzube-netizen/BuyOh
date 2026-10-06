'use client';

import React, { useState, useEffect } from 'react';
import NavLink from '../components/NavLink';
import DesktopNavbar from '../components/DesktopNavbar';
import { useRouter } from 'next/navigation';
import { 
  BellRing, BellOff, Tag, ShieldCheck, 
  Trash2, Check, ArrowLeft, Sparkles, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getNotificationsForUser, saveNotificationsForUser, syncUserDataFromCloud } from '../utils/userSync';
import './Notifications.css';

// Format notification date & time functionally
const formatNotificationDateTime = (n) => {
  let date = null;
  if (n.createdAt) {
    const d = new Date(n.createdAt);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && n.timestamp) {
    const d = new Date(Number(n.timestamp));
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && typeof n.id === 'string' && /^notif-(\d{10,})/.test(n.id)) {
    const match = n.id.match(/^notif-(\d{10,})/);
    if (match) {
      const d = new Date(Number(match[1]));
      if (!isNaN(d.getTime())) date = d;
    }
  }

  if (!date) {
    return n.time || 'Recently';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  const isToday = now.toDateString() === date.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  if (diffSecs >= 0 && diffSecs < 60) {
    return `Just now • ${timeStr}`;
  } else if (diffMins < 60 && diffMins > 0) {
    return `${diffMins}m ago • ${timeStr}`;
  } else if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
    return `${dateStr} at ${timeStr}`;
  }
};

const getFullDateTimeTooltip = (n) => {
  let date = null;
  if (n.createdAt) {
    const d = new Date(n.createdAt);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && n.timestamp) {
    const d = new Date(Number(n.timestamp));
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && typeof n.id === 'string' && /^notif-(\d{10,})/.test(n.id)) {
    const match = n.id.match(/^notif-(\d{10,})/);
    if (match) {
      const d = new Date(Number(match[1]));
      if (!isNaN(d.getTime())) date = d;
    }
  }
  return date ? date.toLocaleString() : (n.time || '');
};

export default function Notifications() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));
  const { user } = useAuth();
  const { unreadCount, unreadNotifsCount } = useChat();

  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [toastMessage, setToastMessage] = useState('');

  // Sync notifications when user changes or logs in on a new device
  useEffect(() => {
    const loadNotifications = () => {
      const raw = getNotificationsForUser(user, []);
      // Strictly exclude any chat message notifications and mock IDs
      const cleaned = (Array.isArray(raw) ? raw : []).filter(
        n => n && n.type !== 'message' && !String(n.id).startsWith('notif-chat-') && !['notif-001', 'notif-002', 'notif-003', 'notif-004'].includes(String(n.id))
      );
      setNotifications(cleaned);
    };

    loadNotifications();

    // Pull latest from cloud in background; fires buyoh_notifications_updated when done
    if (user?.id) {
      syncUserDataFromCloud(user).catch(() => {});
    }

    window.addEventListener('buyoh_notifications_updated', loadNotifications);
    window.addEventListener('storage', loadNotifications);
    return () => {
      window.removeEventListener('buyoh_notifications_updated', loadNotifications);
      window.removeEventListener('storage', loadNotifications);
    };
  }, [user]);

  const updateAndSyncNotifications = (newNotifs) => {
    // Strictly ensure no chat message notifications are saved
    const cleaned = newNotifs.filter(n => n.type !== 'message' && !String(n.id).startsWith('notif-chat-'));
    setNotifications(cleaned);
    saveNotificationsForUser(user, cleaned);
  };

  const handleMarkAsRead = (id) => {
    const next = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    updateAndSyncNotifications(next);
    showToast('Notification marked as read');
  };

  const handleMarkAllAsRead = () => {
    const next = notifications.map(n => ({ ...n, unread: false }));
    updateAndSyncNotifications(next);
    setActiveTab('all');
    showToast('All notifications marked as read');
  };

  const handleDelete = (id) => {
    const next = notifications.filter(n => n.id !== id);
    updateAndSyncNotifications(next);
    showToast('Notification deleted');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      updateAndSyncNotifications([]);
      setActiveTab('all');
      showToast('All notifications cleared');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const nonChatNotifications = notifications.filter(
    n => n.type !== 'message' && !String(n.id).startsWith('notif-chat-')
  );

  const filteredNotifications = nonChatNotifications.filter(n => {
    if (activeTab === 'unread') return n.unread;
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'offer':
        return <Tag className="notif-type-icon icon-offer" size={18} />;
      case 'alert':
        return <Sparkles className="notif-type-icon icon-alert" size={18} />;
      case 'system':
      default:
        return <ShieldCheck className="notif-type-icon icon-system" size={18} />;
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const unreadNotifsFiltered = nonChatNotifications.filter(n => n.unread).length;

  return (
    <div className="notifications-page-wrapper">
      {/* Header bar */}
      <DesktopNavbar />

      {/* Main container */}
      <div className="notifications-container">
        <div className="notifications-card">
          {/* Header Actions */}
          <div className="notif-header">
            <div className="notif-title-area">
              <button className="back-arrow-btn" onClick={handleBack} title="Go Back" aria-label="Go Back">
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <h2 className="notif-page-title">Notifications</h2>
              {unreadNotifsFiltered > 0 && (
                <span className="notif-badge-pill">
                  {unreadNotifsFiltered} New
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notif-actions">
                <button className="text-action-btn notif-mark-all-read-btn" onClick={handleMarkAllAsRead}>
                  <Check size={14} /> Mark all read
                </button>
                <button className="text-action-btn btn-danger-text" onClick={handleClearAll}>
                  <Trash2 size={14} /> Clear all
                </button>
              </div>
            )}
          </div>

          {/* Filter tabs — All & Unread */}
          <div className="notif-tabs">
            <button 
              type="button"
              className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              type="button"
              className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread {unreadNotifsFiltered > 0 ? `(${unreadNotifsFiltered})` : ''}
            </button>
          </div>

          {/* Notification List */}
          <div className="notif-list-area">
            {filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="empty-bell-icon-wrap">
                  <BellOff size={48} className="empty-bell-icon" />
                </div>
                <h3 className="empty-state-title">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="empty-state-text">
                  {activeTab === 'unread' 
                    ? "You're all caught up! There are no unread notifications at the moment."
                    : "Activity updates about your listings and account will appear here."}
                </p>
                {activeTab === 'unread' && nonChatNotifications.length > 0 && (
                  <button 
                    type="button"
                    className="notif-secondary-pill"
                    style={{ marginTop: '0.85rem' }}
                    onClick={() => setActiveTab('all')}
                  >
                    View All Notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="notif-list-grid">
                {filteredNotifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`notif-item-row ${n.unread ? 'notif-unread' : 'notif-read'}`}
                    onClick={() => {
                      if (n.unread) handleMarkAsRead(n.id);
                      if (n.actionLink && n.actionLink !== '#') {
                        navigate(n.actionLink);
                      }
                    }}
                    style={{ cursor: n.actionLink && n.actionLink !== '#' ? 'pointer' : 'default' }}
                  >
                    {/* Orange Dot at the top for Unread only */}
                    {n.unread && <span className="notif-orange-top-dot" title="Unread notification" />}

                    {/* Left Icon — Clean without dots */}
                    <div className="notif-icon-container">
                      {getIcon(n.type)}
                    </div>

                    {/* Middle details */}
                    <div className="notif-details">
                      <div className="notif-meta-row">
                        <span className="notif-time-label" title={getFullDateTimeTooltip(n)}>
                          {formatNotificationDateTime(n)}
                        </span>
                      </div>
                      <h4 className="notif-item-title">{n.title}</h4>
                      <p className="notif-item-desc">{n.message}</p>
                      
                      {/* Action buttons inside notification card */}
                      <div className="notif-btn-row">
                        {n.actionLink && n.actionLink !== '#' && (
                          <button 
                            className="notif-action-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(n.id);
                              navigate(n.actionLink);
                            }}
                          >
                            <Eye size={12} /> {n.actionLabel || (n.type === 'offer' ? 'View Offer' : 'View Details')}
                          </button>
                        )}
                        {n.unread && (
                          <button 
                            className="notif-secondary-pill notif-mark-card-read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(n.id);
                            }}
                            title="Mark as read"
                          >
                            <Check size={12} /> Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional Right image attachment */}
                    {n.itemImg && (
                      <div className="notif-img-attachment">
                        <img src={n.itemImg} alt="Attachment" />
                      </div>
                    )}

                    {/* Delete action */}
                    <button 
                      className="notif-delete-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(n.id);
                      }}
                      title="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="floating-toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
