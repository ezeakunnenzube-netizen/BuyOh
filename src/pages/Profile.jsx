import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  User, ShieldCheck, MapPin, Phone, Mail, Bell, Lock, Eye, LogOut, 
  Trash2, ArrowLeft, Camera, Check, MessageSquareMore, 
  BellRing, PanelTop, UserRound, Bookmark, ShieldAlert, KeyRound,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import AvatarModal from '../components/AvatarModal';
import { getSavedItemsForUser, getMyListingsForUser } from '../utils/userSync';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();

  const { user, loading, logout } = useAuth();
  
  // Load followed sellers count & unread notifications count from localStorage!
  const [followingCount, setFollowingCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(2);
  const [myListingsCount, setMyListingsCount] = useState(() => getMyListingsForUser(user).length);
  const [savedCount, setSavedCount] = useState(() => getSavedItemsForUser(user).length);

  useEffect(() => {
    const loadCounts = () => {
      try {
        const saved = localStorage.getItem('buyoh_followed_sellers_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setFollowingCount(parsed.length);
        }
        const savedNotifs = localStorage.getItem('buyoh_notifications_v1');
        if (savedNotifs) {
          const parsedNotifs = JSON.parse(savedNotifs);
          if (Array.isArray(parsedNotifs)) {
            const unread = parsedNotifs.filter(n => n.unread || n.read === false);
            setUnreadNotifCount(unread.length);
          }
        }
        const userListings = getMyListingsForUser(user);
        setMyListingsCount(userListings.length);

        const savedItems = getSavedItemsForUser(user);
        setSavedCount(savedItems.length);
      } catch (e) {
        console.error(e);
      }
    };

    loadCounts();

    window.addEventListener('buyoh_listings_updated', loadCounts);
    window.addEventListener('buyoh_saved_updated', loadCounts);
    window.addEventListener('storage', loadCounts);
    return () => {
      window.removeEventListener('buyoh_listings_updated', loadCounts);
      window.removeEventListener('buyoh_saved_updated', loadCounts);
      window.removeEventListener('storage', loadCounts);
    };
  }, [user]);

  // User Profile Data State
  const [userData, setUserData] = useState(() => ({
    name: 'Adebayo Johnson',
    email: 'adebayo.johnson@buyoh.com',
    phone: '+234 812 345 6789',
    whatsapp: localStorage.getItem('buyoh_user_whatsapp_v1') || '+234 812 345 6789',
    location: 'Lekki, Lagos',
    avatar: localStorage.getItem('buyoh_user_avatar_v1') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
  }));

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userData.name);
  const [editedPhone, setEditedPhone] = useState(userData.phone);
  const [editedWhatsapp, setEditedWhatsapp] = useState(userData.whatsapp);
  const [editedLocation, setEditedLocation] = useState(userData.location);

  const [toastMessage, setToastMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Listen for global avatar update events
  useEffect(() => {
    const handleAvatarUpdated = (e) => {
      const newAvatar = e.detail || localStorage.getItem('buyoh_user_avatar_v1');
      if (newAvatar) {
        setUserData(prev => ({ ...prev, avatar: newAvatar }));
      }
    };
    window.addEventListener('buyoh_avatar_updated', handleAvatarUpdated);
    return () => window.removeEventListener('buyoh_avatar_updated', handleAvatarUpdated);
  }, []);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('buyoh_user_avatar_v1');
    const savedWhatsapp = localStorage.getItem('buyoh_user_whatsapp_v1');
    const savedName = localStorage.getItem('buyoh_user_name_v1');
    const savedPhone = localStorage.getItem('buyoh_user_phone_v1');
    const savedLocation = localStorage.getItem('buyoh_user_location_v1');

    if (user) {
      const name = savedName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Marketplace User';
      const email = user.email || 'no-email@buyoh.com';
      const phone = savedPhone || user.user_metadata?.phone || user.phone || '+234 812 345 6789';
      const whatsapp = savedWhatsapp || user.user_metadata?.whatsapp || user.user_metadata?.phone || phone;
      const location = savedLocation || user.user_metadata?.location || 'Lagos, Nigeria';
      const avatar = user.user_metadata?.avatar_url || savedAvatar || user.user_metadata?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

      setUserData(prev => ({
        ...prev,
        name,
        email,
        phone,
        whatsapp,
        location,
        avatar
      }));
      setEditedName(name);
      setEditedPhone(phone);
      setEditedWhatsapp(whatsapp);
      setEditedLocation(location);
    } else {
      if (savedName || savedPhone || savedWhatsapp || savedLocation || savedAvatar) {
        setUserData(prev => ({ 
          ...prev, 
          name: savedName || prev.name,
          phone: savedPhone || prev.phone,
          whatsapp: savedWhatsapp || prev.whatsapp,
          location: savedLocation || prev.location,
          avatar: savedAvatar || prev.avatar 
        }));
        if (savedName) setEditedName(savedName);
        if (savedPhone) setEditedPhone(savedPhone);
        if (savedWhatsapp) setEditedWhatsapp(savedWhatsapp);
        if (savedLocation) setEditedLocation(savedLocation);
      }
    }
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changePasswordExpanded, setChangePasswordExpanded] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const cleanName = editedName.trim() || 'Marketplace User';
    const cleanPhone = editedPhone.trim();
    const cleanWhatsapp = editedWhatsapp ? editedWhatsapp.trim() : '';
    const cleanLocation = editedLocation.trim();

    // 1. Immediately persist details locally so user edits are never lost
    try {
      localStorage.setItem('buyoh_user_name_v1', cleanName);
      if (cleanPhone) localStorage.setItem('buyoh_user_phone_v1', cleanPhone);
      if (cleanWhatsapp) localStorage.setItem('buyoh_user_whatsapp_v1', cleanWhatsapp);
      if (cleanLocation) localStorage.setItem('buyoh_user_location_v1', cleanLocation);
    } catch (e) {}

    // 2. Update UI state instantly
    setUserData(prev => ({
      ...prev,
      name: cleanName,
      phone: cleanPhone || 'Not provided',
      whatsapp: cleanWhatsapp || 'Not provided',
      location: cleanLocation || 'Lagos, Nigeria'
    }));
    setIsEditing(false);
    showToast('Profile updated successfully');

    // 3. Background sync to Supabase (graceful error handling)
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
            name: cleanName,
            phone: cleanPhone,
            whatsapp: cleanWhatsapp,
            location: cleanLocation
          }
        });
      } catch (err) {
        console.warn("Background Supabase profile sync notice:", err);
      }
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters");
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast("Password updated successfully!");
    } catch (err) {
      console.error("Error updating password:", err);
      showToast(err.message || "Failed to update password");
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    showToast('Logged out successfully');
    await logout();
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;
    setShowDeleteConfirm(false);
    setDeleteConfirmationInput('');

    try {
      // Call the Supabase database function to permanently delete the user
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;

      showToast('Account deleted permanently');
      
      // Clear all local data
      localStorage.removeItem('buyoh_messages_v1');
      localStorage.removeItem('buyoh_notifications_v1');
      localStorage.removeItem('buyoh_followed_sellers_v1');
      
      await logout();
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error("Error deleting account:", err);
      showToast(err.message || 'Failed to delete account. Please try again.');
    }
  };

  return (
    <div className="profile-page-wrapper">
      {/* Top Header bar – desktop only */}
      <header className="home-nav-row profile-desktop-nav">
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
          <NavLink to="/notifications" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <BellRing className="home-nav-icon" color="white" />
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
          <NavLink to="/profile" replace className="home-nav-item home-nav-item-active">
            <button className="home-nav-icon-btn">
              <UserRound className="home-nav-icon" color="#1d4ed8" />
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

      {/* Profile Page main container */}
      <div className="profile-container">
        <div className="profile-card">
          {/* Cover Banner */}
          <div className="profile-banner" style={{ background: userData.banner }}>
            
            <h2 className="profile-page-title">My Account</h2>
          </div>

          {/* User Profile Card Summary */}
          <div className="profile-summary-section">
            <div className="avatar-holder">
              <img 
                src={userData.avatar} 
                alt="User Avatar" 
                className="profile-avatar-large clickable-avatar" 
                onClick={() => setIsAvatarModalOpen(true)}
                title="Click to change avatar"
              />
              <button 
                className="avatar-change-badge" 
                title="Change Avatar" 
                onClick={() => setIsAvatarModalOpen(true)}
              >
                <Camera size={14} />
              </button>
            </div>
            
            <div className="profile-identity-info">
              <div className="profile-title-badges">
                <h3 className="profile-name-title">{userData.name}</h3>
                <span className="profile-badge-tag"><ShieldCheck size={13} /> Verified User</span>
              </div>
              <p className="profile-email-sub">{userData.email}</p>
            </div>

            {/* Profile Statistics Grid */}
            <div className="profile-stats-grid">
              <div className="p-stat-box" style={{ cursor: 'pointer' }} onClick={() => navigate('/adverts')}>
                <span className="p-stat-val">{myListingsCount}</span>
                <span className="p-stat-label">My Listings</span>
              </div>
              <div className="p-stat-box">
                <span className="p-stat-val">{followingCount}</span>
                <span className="p-stat-label">Sellers Followed</span>
              </div>
              <div className="p-stat-box">
                <span className="p-stat-val">4.9 ★</span>
                <span className="p-stat-label">User Rating</span>
              </div>
            </div>
          </div>

          {/* My Posted Adverts Shortcut Card */}
          <div className="profile-notifications-shortcut" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderColor: 'rgba(59, 130, 246, 0.3)', cursor: 'pointer' }} onClick={() => navigate('/adverts')}>
            <div className="p-notif-left">
              <div className="p-notif-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
                <PanelTop size={20} color="#60a5fa" />
              </div>
              <div className="p-notif-text">
                <h4 className="p-notif-title" style={{ color: '#ffffff' }}>My Posted Adverts</h4>
                <p className="p-notif-sub" style={{ color: '#cbd5e1' }}>Manage your active marketplace listings, view stats, and delete ads</p>
              </div>
            </div>
            <div className="p-notif-right">
              <span className="p-notif-badge" style={{ background: '#2563eb', color: '#ffffff' }}>{myListingsCount} Active</span>
            </div>
          </div>

          {/* Saved Collection Shortcut Card */}
          <div className="profile-notifications-shortcut" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)', borderColor: 'rgba(245, 158, 11, 0.3)', cursor: 'pointer' }} onClick={() => navigate('/saved')}>
            <div className="p-notif-left">
              <div className="p-notif-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                <Bookmark size={20} color="#fbbf24" />
              </div>
              <div className="p-notif-text">
                <h4 className="p-notif-title" style={{ color: '#ffffff' }}>Saved Collection</h4>
                <p className="p-notif-sub" style={{ color: '#cbd5e1' }}>View your bookmarked marketplace listings and track price drops</p>
              </div>
            </div>
            <div className="p-notif-right">
              <span className="p-notif-badge" style={{ background: '#f59e0b', color: '#ffffff' }}>{savedCount} Saved</span>
            </div>
          </div>

          {/* Notifications Shortcut Card — Locked for quick access */}
          <div className="profile-notifications-shortcut" onClick={() => navigate('/notifications')}>
            <div className="p-notif-left">
              <div className="p-notif-icon-wrap">
                <BellRing size={20} className="p-notif-bell" />
                {unreadNotifCount > 0 && <span className="p-notif-dot" />}
              </div>
              <div className="p-notif-text">
                <h4 className="p-notif-title">Notifications Center</h4>
                <p className="p-notif-sub">View recent alerts, offers, price drops, and system messages</p>
              </div>
            </div>
            <div className="p-notif-right">
              <span className="p-notif-badge">{unreadNotifCount} New</span>
            </div>
          </div>

          {/* Settings Section split columns */}
          <div className="profile-settings-columns">
            {/* Column 1: Account Edit settings & Change Password */}
            <div className="settings-column-group">
              {/* Account Details Panel */}
              <div className="settings-panel">
                <h3 className="panel-title"><UserRound size={18} className="panel-icon" /> Account Details</h3>
                
                {!isEditing ? (
                  <div className="readonly-details">
                    <div className="info-row">
                      <span className="info-label">Full Name</span>
                      <span className="info-val">{userData.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone Number</span>
                      <span className="info-val">{userData.phone}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">WhatsApp Number</span>
                      <span className="info-val">{userData.whatsapp || 'Not provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Location</span>
                      <span className="info-val">{userData.location}</span>
                    </div>
                    <button className="edit-details-btn" onClick={() => setIsEditing(true)}>
                      Edit Profile Details
                    </button>
                  </div>
                ) : (
                  <form className="edit-details-form" onSubmit={handleSaveProfile}>
                    <div className="input-group">
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={editedName} 
                        onChange={e => setEditedName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label>Phone Number</label>
                      <input 
                        type="text" 
                        value={editedPhone} 
                        onChange={e => setEditedPhone(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label>WhatsApp Number (Optional)</label>
                      <input 
                        type="tel" 
                        value={editedWhatsapp} 
                        onChange={e => setEditedWhatsapp(e.target.value)} 
                        placeholder="e.g. +234 809 123 4567"
                      />
                    </div>
                    <div className="input-group">
                      <label>Location</label>
                      <input 
                        type="text" 
                        value={editedLocation} 
                        onChange={e => setEditedLocation(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="edit-actions-row">
                      <button type="submit" className="save-btn"><Check size={14} /> Save</button>
                      <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Change Password Panel */}
              <div className="settings-panel margin-top-lg collapsible-settings-panel">
                <button
                  type="button"
                  className="collapsible-panel-header"
                  onClick={() => setChangePasswordExpanded(prev => !prev)}
                  aria-expanded={changePasswordExpanded}
                  title={changePasswordExpanded ? "Collapse panel" : "Expand panel"}
                >
                  <div className="panel-title-left">
                    <KeyRound size={18} className="panel-icon" />
                    <span>Change Password</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`collapse-chevron ${changePasswordExpanded ? 'expanded' : ''}`} 
                  />
                </button>

                {changePasswordExpanded && (
                  <form className="edit-details-form collapsible-panel-content" onSubmit={handleUpdatePassword}>
                    <div className="input-group">
                      <label>Current Password</label>
                      <div className="password-input-wrapper">
                        <input 
                          type={showPasswords ? 'text' : 'password'} 
                          value={currentPassword} 
                          onChange={e => setCurrentPassword(e.target.value)} 
                          placeholder="••••••••"
                          required 
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>New Password</label>
                      <div className="password-input-wrapper">
                        <input 
                          type={showPasswords ? 'text' : 'password'} 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                          placeholder="••••••••"
                          required 
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Confirm New Password</label>
                      <div className="password-input-wrapper">
                        <input 
                          type={showPasswords ? 'text' : 'password'} 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          placeholder="••••••••"
                          required 
                        />
                      </div>
                    </div>

                    <div className="password-options-row">
                      <label className="show-password-checkbox">
                        <input 
                          type="checkbox" 
                          checked={showPasswords} 
                          onChange={e => setShowPasswords(e.target.checked)} 
                        />
                        <span>Show Passwords</span>
                      </label>
                    </div>

                    <button type="submit" className="save-btn update-pwd-btn">
                      Update Password
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Logout & Delete Section Action */}
          <div className="profile-footer-actions">
            <button className="delete-account-action-btn" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={16} /> Delete Account
            </button>
            <button className="logout-action-btn" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut size={16} /> Log Out Account
            </button>
          </div>
        </div>
      </div>

      {/* ── LOGOUT CONFIRMATION MODAL ── */}
      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="logout-card-icon">
              <ShieldAlert size={36} color="#ef4444" />
            </div>
            <h3>Log Out Account?</h3>
            <p>Are you sure you want to log out? You will need to sign in again to send messages and post listing offers.</p>
            <div className="logout-card-actions">
              <button className="confirm-logout-btn" onClick={handleLogout}>Log Out</button>
              <button className="cancel-logout-btn" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT CONFIRMATION MODAL ── */}
      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="logout-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="logout-card-icon delete-card-icon">
              <Trash2 size={36} className="shake-alert-icon" />
            </div>
            <h3>Delete Account Permanently?</h3>
            <p>This action is irreversible. All listings, messages, and offer history will be permanently deleted. Type <strong>DELETE</strong> below to confirm.</p>
            
            <input 
              type="text" 
              className="delete-confirm-input" 
              placeholder="Type DELETE" 
              value={deleteConfirmationInput} 
              onChange={e => setDeleteConfirmationInput(e.target.value)} 
            />

            <div className="logout-card-actions">
              <button 
                className="confirm-logout-btn confirm-delete-btn" 
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationInput !== 'DELETE'}
              >
                Delete Permanently
              </button>
              <button className="cancel-logout-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AVATAR SELECTION MODAL ── */}
      <AvatarModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={userData.avatar}
        onAvatarChanged={(newAvatarUrl) => {
          setUserData(prev => ({ ...prev, avatar: newAvatarUrl }));
          showToast('Avatar updated successfully!');
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="floating-profile-toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
