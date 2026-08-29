import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BellRing, BellOff, MessageSquare, Tag, AlertTriangle, ShieldCheck, 
  Trash2, Check, ArrowLeft, MoreVertical, Search, MessageSquareMore, 
  PanelTop, UserRound, Bookmark, Sparkles, ShoppingBag, Eye
} from 'lucide-react';
import './Notifications.css';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'offer',
    title: 'New Offer Received',
    message: 'Blessing Adebayo offered ₦550,000 for your Sony PlayStation 5 Disc Edition.',
    time: '2 mins ago',
    unread: true,
    actionLabel: 'View Offer',
    actionLink: '/messages?chatId=chat-004',
    itemImg: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'notif-002',
    type: 'alert',
    title: 'Price Drop on Saved Item',
    message: 'Apple iPhone 13 Pro (128GB) has dropped to ₦510,000 (was ₦540,000).',
    time: '1 hour ago',
    unread: true,
    actionLabel: 'View Listing',
    actionLink: '/messages?chatId=chat-001',
    itemImg: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'notif-003',
    type: 'system',
    title: 'Account Verified',
    message: 'Congratulations! Your seller verification profile is complete. You now have a verified shield badge.',
    time: '5 hours ago',
    unread: false,
    actionLabel: 'View Profile',
    actionLink: '#'
  },
  {
    id: 'notif-004',
    type: 'message',
    title: 'Unread Messages',
    message: 'You have unread messages from Babatunde Ogunlesi about the Toyota Camry.',
    time: 'Yesterday',
    unread: false,
    actionLabel: 'Reply Now',
    actionLink: '/messages?chatId=chat-001',
    itemImg: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'notif-005',
    type: 'system',
    title: 'Security Alert',
    message: 'A new login was detected on your account from Chrome on Android (Lagos, Nigeria).',
    time: '2 days ago',
    unread: false,
    actionLabel: 'Review Security',
    actionLink: '#'
  }
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('buyoh_notifications_v1');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [activeTab, setActiveTab] = useState('all'); // all, unread, offers, alerts
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('buyoh_notifications_v1', JSON.stringify(notifications));
  }, [notifications]);

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    );
    showToast('Notification marked as read');
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast('Notification deleted');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      setNotifications([]);
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
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
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
            <button className="home-nav-icon-btn">
              <MessageSquareMore className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">My Messages</div>
            </button>
          </NavLink>
          <NavLink to="/notifications" replace className="home-nav-item home-nav-item-active">
            <button className="home-nav-icon-btn">
              <BellRing className="home-nav-icon" color="#1d4ed8" />
              <div className="home-header-tooltip">Notifications</div>
            </button>
          </NavLink>
          <NavLink to="/saved" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <Bookmark className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">Saved</div>
            </button>
          </NavLink>
          <NavLink to="/adverts" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <PanelTop className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">My Adverts</div>
            </button>
          </NavLink>
          <NavLink to="/profile" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <UserRound className="home-nav-icon" color="white" />
              <div className="home-header-tooltip">My Profile</div>
            </button>
          </NavLink>
          <NavLink to="/sell" replace className="home-nav-item">
            <button className="home-sell-btn">
              <p className="home-sell-btn-text">+ Sell</p>
            </button>
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
