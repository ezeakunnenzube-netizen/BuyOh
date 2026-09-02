'use client';

import React, { useState, useEffect } from 'react';
import NavLink from '../components/NavLink';
import { useRouter } from 'next/navigation';
import { 
  BellRing, BellOff, MessageSquare, Tag, AlertTriangle, ShieldCheck, 
  Trash2, Check, ArrowLeft, MoreVertical, Search, MessageSquareMore, 
  PanelTop, UserRound, Bookmark, Sparkles, ShoppingBag, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotificationsForUser, saveNotificationsForUser, syncUserDataFromCloud } from '../utils/userSync';
import './Notifications.css';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'offer',
    title: 'New Offer Received',
    message: 'Blessing Adebayo offered ₦550,000 for your Sony PlayStation 5 Disc Edition.',
    time: '2 mins ago',
    unread: true,
    actionLink: '/messages'
  },
  {
    id: 'notif-002',
    type: 'alert',
    title: 'Price Drop Alert',
    message: 'Toyota Corolla 2018 is now ₦7,500,000 (12% off original price).',
    time: '1 hour ago',
    unread: true,
    actionLink: '#'
  },
  {
    id: 'notif-003',
    type: 'message',
    title: 'New Message from Chinedu',
    message: 'Is the MacBook Pro 16" still available for inspection?',
    time: '3 hours ago',
    unread: false,
    actionLink: '/messages'
  },
  {
    id: 'notif-004',
    type: 'system',
    title: 'Listing Approved',
    message: 'Your advert "Apple iPhone 15 Pro Max 256GB" is now live on BuyOh marketplace.',
    time: 'Yesterday',
    unread: false,
    actionLink: '/adverts'
  },
  {
    id: 'notif-005',
    type: 'alert',
    title: 'Security Tip',
    message: 'Never make payments before inspecting items in person. Stay safe with verified sellers.',
    time: '2 days ago',
    unread: false,
    actionLink: '#'
  }
];

export default function Notifications() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));
  const { user } = useAuth();

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState('all'); // all, unread, offers, alerts
  const [toastMessage, setToastMessage] = useState('');

  // Sync notifications when user changes or logs in on a new device
  useEffect(() => {
    const loadNotifications = () => {
      setNotifications(getNotificationsForUser(user, INITIAL_NOTIFICATIONS));
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
    setNotifications(newNotifs);
    saveNotificationsForUser(user, newNotifs);
  };

  const handleMarkAsRead = (id) => {
    const next = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    updateAndSyncNotifications(next);
    showToast('Notification marked as read');
  };

  const handleMarkAllAsRead = () => {
    const next = notifications.map(n => ({ ...n, unread: false }));
    updateAndSyncNotifications(next);
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
      showToast('All notifications cleared');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return n.unread;
    if (activeTab === 'offers') return n.type === 'offer';
    if (activeTab === 'alerts') return n.type === 'alert' || n.type === 'system';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'offer':
        return <Tag className="notif-type-icon icon-offer" size={18} />;
      case 'alert':
        return <Sparkles className="notif-type-icon icon-alert" size={18} />;
      case 'message':
        return <MessageSquare className="notif-type-icon icon-message" size={18} />;
      case 'system':
      default:
        return <ShieldCheck className="notif-type-icon icon-system" size={18} />;
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="notifications-page-wrapper">
      {/* Header bar */}
      <header className="home-nav-row notif-desktop-nav">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
        </NavLink>
        <div className="home-nav-links">
          <NavLink to="/messages" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <MessageSquareMore className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">My Messages</div>
            </span>
          </NavLink>
          <NavLink to="/notifications" replace className="home-nav-item home-nav-item-active">
            <span className="home-nav-icon-btn">
              <BellRing className="home-nav-icon" color="#1d4ed8" />
              <div className="home-header-tooltip">Notifications</div>
            </span>
          </NavLink>
          <NavLink to="/saved" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <Bookmark className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">Saved</div>
            </span>
          </NavLink>
          <NavLink to="/adverts" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <PanelTop className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">My Adverts</div>
            </span>
          </NavLink>
          <NavLink to="/profile" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <UserRound className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">My Profile</div>
            </span>
          </NavLink>
          <NavLink to="/sell" replace className="home-nav-item">
            <span className="home-sell-btn">
              <span className="home-sell-btn-text">+ Sell</span>
            </span>
          </NavLink>
        </div>
      </header>

      {/* Main container */}
      <div className="notifications-container">
        <div className="notifications-card">
          {/* Header Actions */}
          <div className="notif-header">
            <div className="notif-title-area">
              <button className="back-arrow-btn" onClick={handleBack} title="Go Back">
                <ArrowLeft size={20} />
              </button>
              <h2 className="notif-page-title">Notifications</h2>
              {notifications.some(n => n.unread) && (
                <span className="notif-badge-pill">
                  {notifications.filter(n => n.unread).length} New
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notif-actions">
                <button className="text-action-btn" onClick={handleMarkAllAsRead}>
                  <Check size={14} /> Mark all read
                </button>
                <button className="text-action-btn btn-danger-text" onClick={handleClearAll}>
                  <Trash2 size={14} /> Clear all
                </button>
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="notif-tabs">
            <button 
              className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread
            </button>
            <button 
              className={`notif-tab ${activeTab === 'offers' ? 'active' : ''}`}
              onClick={() => setActiveTab('offers')}
            >
              Offers
            </button>
            <button 
              className={`notif-tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alerts
            </button>
          </div>

          {/* Notification List */}
          <div className="notif-list-area">
            {filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="empty-bell-icon-wrap">
                  <BellOff size={48} className="empty-bell-icon" />
                </div>
                <h3 className="empty-state-title">No notifications here</h3>
                <p className="empty-state-text">
                  {activeTab === 'unread' 
                    ? "You don't have any unread notifications at the moment."
                    : "We will notify you here when you receive new offers, price drops, or safety alerts."}
                </p>
              </div>
            ) : (
              <div className="notif-list-grid">
                {filteredNotifications.map(n => (
                  <div key={n.id} className={`notif-item-row ${n.unread ? 'notif-unread' : ''}`}>
                    {/* Left Icon */}
                    <div className="notif-icon-container">
                      {getIcon(n.type)}
                      {n.unread && <span className="unread-pulse-dot" />}
                    </div>

                    {/* Middle details */}
                    <div className="notif-details">
                      <div className="notif-meta-row">
                        <span className="notif-time-label">{n.time}</span>
                      </div>
                      <h4 className="notif-item-title">{n.title}</h4>
                      <p className="notif-item-desc">{n.message}</p>
                      
                      {/* Action buttons inside notification card */}
                      <div className="notif-btn-row">
                        {n.actionLabel && (
                          <button 
                            className="notif-action-pill"
                            onClick={() => {
                              if (n.actionLink && n.actionLink !== '#') {
                                navigate(n.actionLink);
                              } else {
                                handleMarkAsRead(n.id);
                              }
                            }}
                          >
                            <Eye size={12} /> {n.actionLabel}
                          </button>
                        )}
                        {n.unread && (
                          <button 
                            className="notif-secondary-pill"
                            onClick={() => handleMarkAsRead(n.id)}
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
                      onClick={() => handleDelete(n.id)}
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
