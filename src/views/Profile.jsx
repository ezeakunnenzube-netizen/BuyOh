'use client';

import React, { useState, useEffect } from 'react';
import NavLink from '../components/NavLink';
import DesktopNavbar from '../components/DesktopNavbar';
import { useRouter } from 'next/navigation';
import { 
  User, ShieldCheck, MapPin, Phone, Mail, Bell, Lock, Eye, LogOut, 
  Trash2, ArrowLeft, Camera, Check, MessageSquareMore, 
  BellRing, PanelTop, UserRound, Bookmark, ShieldAlert, KeyRound,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { supabase } from '../lib/supabaseClient';
import AvatarModal from '../components/AvatarModal';
import { getSavedItemsForUser, getMyListingsForUser, getUserProfileData, saveUserProfileData, getFollowedSellersForUser, getNotificationsForUser, syncUserDataFromCloud, getCachedUserSync } from '../utils/userSync';
import { formatMemberSince } from '../utils/productUtils';
import './Profile.css';

export default function Profile() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));

  const { user, loading, logout, setIsAuthOpen } = useAuth();
  const { unreadCount } = useChat();
  
  // Load followed sellers count & unread notifications count synchronously from user-scoped storage
  const [followingCount, setFollowingCount] = useState(() => {
    try { return getFollowedSellersForUser(user).length; } catch { return 0; }
  });
  const [unreadNotifCount, setUnreadNotifCount] = useState(() => {
    try { 
      return getNotificationsForUser(user).filter(
        n => (n.unread || n.read === false) && n.type !== 'message' && !String(n.id).startsWith('notif-chat-')
      ).length; 
    } catch { return 0; }
  });
  const [myListingsCount, setMyListingsCount] = useState(() => {
    try { return getMyListingsForUser(user).length; } catch { return 0; }
  });
  const [savedCount, setSavedCount] = useState(() => {
    try { return getSavedItemsForUser(user).length; } catch { return 0; }
  });

  const [lastFetchedUserId, setLastFetchedUserId] = useState(null);
  const isDataFetched = lastFetchedUserId === user?.id;

  useEffect(() => {
    const loadCounts = () => {
      try {
        const followed = getFollowedSellersForUser(user);
        setFollowingCount(followed.length);

        const notifs = getNotificationsForUser(user);
        const unread = notifs.filter(
          n => (n.unread || n.read === false) && n.type !== 'message' && !String(n.id).startsWith('notif-chat-')
        );
        setUnreadNotifCount(unread.length);

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
    window.addEventListener('buyoh_profile_updated', loadCounts);
    window.addEventListener('buyoh_notifications_updated', loadCounts);
    window.addEventListener('storage', loadCounts);
    return () => {
      window.removeEventListener('buyoh_listings_updated', loadCounts);
      window.removeEventListener('buyoh_saved_updated', loadCounts);
      window.removeEventListener('buyoh_profile_updated', loadCounts);
      window.removeEventListener('buyoh_notifications_updated', loadCounts);
      window.removeEventListener('storage', loadCounts);
    };
  }, [user]);



  // User Profile Data State (Authoritative Cloud Source of Truth)
  const [userData, setUserData] = useState(() => getUserProfileData(user));

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(() => getUserProfileData(user).name || '');
  const [editedPhone, setEditedPhone] = useState(() => getUserProfileData(user).phone || '');
  const [editedWhatsapp, setEditedWhatsapp] = useState(() => getUserProfileData(user).whatsapp || '');
  const [editedLocation, setEditedLocation] = useState(() => getUserProfileData(user).location || '');

  const [toastMessage, setToastMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Sync profile data when user changes or loads from cloud
  useEffect(() => {
    if (!user) return;

    // Kick off a background cloud sync so this device reflects any changes made on another device
    syncUserDataFromCloud(user).catch(() => {});

    // Load synchronous cached profile data
    const current = getUserProfileData(user);
    setUserData(current);
    if (!isEditing) {
      setEditedName(current.name);
      setEditedPhone(current.phone);
      setEditedWhatsapp(current.whatsapp);
      setEditedLocation(current.location);
    }

    if (user.id) {
      // 1. Initial Cloud Query
      (async () => {
        try {
          const { data: dbProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (dbProfile && !error) {
            const freshData = {
              name: dbProfile.full_name || dbProfile.name || current.name || user.email?.split('@')[0] || 'Marketplace User',
              email: dbProfile.email || user.email,
              phone: dbProfile.phone || current.phone || '',
              whatsapp: dbProfile.whatsapp || current.whatsapp || dbProfile.phone || '',
              location: dbProfile.location || current.location || '',
              avatar: dbProfile.avatar_url && !dbProfile.avatar_url.includes('photo-1535713875002-d1d0cf377fde') ? dbProfile.avatar_url : '',
              banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)',
              createdAt: dbProfile.created_at || user?.created_at || null,
              verified: Boolean(dbProfile.verified ?? (user?.email_confirmed_at || user?.user_metadata?.verified))
            };
            try {
              localStorage.setItem(`buyoh_user_profile_${user.id}`, JSON.stringify(freshData));
              if (freshData.name) localStorage.setItem(`buyoh_user_name_${user.id}`, freshData.name);
              if (freshData.phone) localStorage.setItem(`buyoh_user_phone_${user.id}`, freshData.phone);
              if (freshData.whatsapp) localStorage.setItem(`buyoh_user_whatsapp_${user.id}`, freshData.whatsapp);
              if (freshData.location) localStorage.setItem(`buyoh_user_location_${user.id}`, freshData.location);
              if (freshData.avatar) localStorage.setItem(`buyoh_user_avatar_${user.id}`, freshData.avatar);
            } catch (e) {}
            setUserData(freshData);
            if (!isEditing) {
              setEditedName(freshData.name);
              setEditedPhone(freshData.phone);
              setEditedWhatsapp(freshData.whatsapp);
              setEditedLocation(freshData.location);
            }
          }
        } catch (err) {
          console.warn("Profile cloud fetch notice:", err);
        } finally {
          setLastFetchedUserId(user.id);
        }
      })();

      // 2. Direct Realtime Subscription to Supabase `public.profiles`
      const channel = supabase
        .channel(`realtime-profile-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${user.id}` 
        }, (payload) => {
          if (payload.new) {
            const freshData = {
              name: payload.new.full_name || payload.new.name || 'Marketplace User',
              email: payload.new.email || user.email,
              phone: payload.new.phone || '',
              whatsapp: payload.new.whatsapp || payload.new.phone || '',
              location: payload.new.location || '',
              avatar: payload.new.avatar_url && !payload.new.avatar_url.includes('photo-1535713875002-d1d0cf377fde') ? payload.new.avatar_url : '',
              banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)',
              createdAt: payload.new.created_at || user?.created_at || null,
              verified: Boolean(payload.new.verified ?? (user?.email_confirmed_at || user?.user_metadata?.verified))
            };
            try {
              localStorage.setItem(`buyoh_user_profile_${user.id}`, JSON.stringify(freshData));
              if (freshData.name) localStorage.setItem(`buyoh_user_name_${user.id}`, freshData.name);
              if (freshData.phone) localStorage.setItem(`buyoh_user_phone_${user.id}`, freshData.phone);
              if (freshData.whatsapp) localStorage.setItem(`buyoh_user_whatsapp_${user.id}`, freshData.whatsapp);
              if (freshData.location) localStorage.setItem(`buyoh_user_location_${user.id}`, freshData.location);
              if (freshData.avatar) localStorage.setItem(`buyoh_user_avatar_${user.id}`, freshData.avatar);
            } catch (e) {}
            setUserData(freshData);
            setIsCloudLoading(false);
            if (!isEditing) {
              setEditedName(freshData.name);
              setEditedPhone(freshData.phone);
              setEditedWhatsapp(freshData.whatsapp);
              setEditedLocation(freshData.location);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  // Listen for global avatar/profile update events
  useEffect(() => {
    const handleAvatarUpdated = (e) => {
      const newAvatar = e.detail;
      if (newAvatar) {
        setUserData(prev => ({ ...prev, avatar: newAvatar }));
      }
    };
    const handleProfileUpdated = (e) => {
      if (e.detail) {
        setUserData(prev => ({ ...prev, ...e.detail }));
        if (!isEditing) {
          if (e.detail.name) setEditedName(e.detail.name);
          if (e.detail.phone) setEditedPhone(e.detail.phone);
          if (e.detail.whatsapp) setEditedWhatsapp(e.detail.whatsapp);
          if (e.detail.location) setEditedLocation(e.detail.location);
        }
      }
    };
    window.addEventListener('buyoh_avatar_updated', handleAvatarUpdated);
    window.addEventListener('buyoh_profile_updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('buyoh_avatar_updated', handleAvatarUpdated);
      window.removeEventListener('buyoh_profile_updated', handleProfileUpdated);
    };
  }, [isEditing]);

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

    const updated = {
      ...userData,
      name: cleanName,
      phone: cleanPhone || 'Not provided',
      whatsapp: cleanWhatsapp || 'Not provided',
      location: cleanLocation || 'Lagos, Nigeria'
    };

    setUserData(updated);
    setIsEditing(false);
    showToast('Profile updated successfully');

    await saveUserProfileData(user, updated);
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
      if (user?.id) {
        // 1. Try to invoke the Supabase RPC function
        try {
          await supabase.rpc('delete_own_account');
        } catch (rpcErr) {
          console.warn("RPC delete error:", rpcErr);
        }

        // 2. Delete public.profiles database row
        try {
          await supabase.from('profiles').delete().eq('id', user.id);
        } catch (dbErr) {
          console.warn("Profiles delete notice:", dbErr);
        }
      }

      // 3. Purge all local user storage
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('buyoh') || k.includes('infibuy') || k.includes('sb-') || k.includes('supabase'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }

      showToast('Account deleted successfully');

      await logout();
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err) {
      console.error("Error deleting account:", err);
      showToast('Account data cleared.');
      await logout();
      window.location.href = '/';
    }
  };

  // Auth guard: show clean sign-in prompt when not logged in
  if (!user && !loading) {
    return (
      <div className="profile-page-wrapper">
        <DesktopNavbar />
        <div className="profile-container">
          <div className="profile-auth-prompt-container">
            <div className="profile-auth-card">
              <div className="profile-auth-icon-circle">
                <User size={34} />
              </div>
              <h2 className="profile-auth-title">Sign in to your Profile</h2>
              <p className="profile-auth-subtitle">
                Access your account settings, posted adverts, saved items, and notifications.
              </p>
              <button 
                type="button" 
                className="profile-signin-btn"
                onClick={() => setIsAuthOpen && setIsAuthOpen(true)}
              >
                Sign In / Register
              </button>
              <NavLink to="/" replace className="profile-auth-home-link" style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.88rem', textDecoration: 'none' }}>
                Return to Marketplace
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display NOTHING if the data has not been fetched yet
  if (loading || (user && !isDataFetched)) {
    return null;
  }



  return (
    <div className="profile-page-wrapper">
      {/* Top Header bar – desktop only */}
      <DesktopNavbar />

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
              {userData.avatar && !userData.avatar.includes('photo-1535713875002-d1d0cf377fde') ? (
                <img 
                  src={userData.avatar} 
                  alt="User Avatar" 
                  className="profile-avatar-large clickable-avatar" 
                  onClick={() => setIsAvatarModalOpen(true)}
                  title="Click to change avatar"
                />
              ) : (
                <div 
                  className="profile-avatar-large profile-avatar-initials clickable-avatar"
                  onClick={() => setIsAvatarModalOpen(true)}
                  title="Click to upload profile photo"
                >
                  {(userData.name || user?.email?.split('@')[0] || 'U').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
              )}
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
                <h3 className="profile-name-title">{userData.name || 'Marketplace User'}</h3>
                <span className="profile-badge-tag"><User size={13} /> {formatMemberSince(null, userData.createdAt || user?.created_at)}</span>
              </div>
              <p className="profile-email-sub">{userData.email || user?.email}</p>
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
              <div className="p-stat-box" style={{ cursor: 'pointer' }} onClick={() => navigate('/saved')}>
                <span className="p-stat-val">{savedCount}</span>
                <span className="p-stat-label">Saved Items</span>
              </div>
            </div>
          </div>

          {/* My Posted Adverts Shortcut Card */}
          <div className="profile-shortcut-card" onClick={() => navigate('/adverts')}>
            <div className="shortcut-icon-col">
              <PanelTop size={20} />
            </div>
            <div className="shortcut-text-col">
              <h4 className="shortcut-title">My Posted Adverts</h4>
              <p className="shortcut-sub">Manage your active marketplace listings, view stats, and delete ads</p>
            </div>
            <span className="shortcut-count-badge">{myListingsCount} Active</span>
          </div>

          {/* Saved Collection Shortcut Card */}
          <div className="profile-shortcut-card" onClick={() => navigate('/saved')}>
            <div className="shortcut-icon-col">
              <Bookmark size={20} />
            </div>
            <div className="shortcut-text-col">
              <h4 className="shortcut-title">Saved Collection</h4>
              <p className="shortcut-sub">View your bookmarked marketplace listings and track price drops</p>
            </div>
            <span className="shortcut-count-badge">{savedCount} Saved</span>
          </div>

          {/* Notifications Center Shortcut Card */}
          <div className="profile-shortcut-card" onClick={() => navigate('/notifications')}>
            <div className="shortcut-icon-col" style={{ position: 'relative' }}>
              <BellRing size={20} />
              {unreadNotifCount > 0 && <span className="shortcut-notif-dot" />}
            </div>
            <div className="shortcut-text-col">
              <h4 className="shortcut-title">Notification Centre</h4>
              <p className="shortcut-sub">View recent updates, price drops, and account alerts</p>
            </div>
            <span className="shortcut-count-badge">{unreadNotifCount} New</span>
          </div>

          {/* Settings Section split columns */}
          <div className="profile-settings-columns">
            {/* Column 1: Account Edit settings & Change Password */}
            <div className="settings-column-group">
              {/* Account Details Panel */}
              <div className="settings-panel">
                <h3 className="panel-title"><UserRound size={18} className="panel-icon" color="#000000" /> Account Details</h3>
                
                {!isEditing ? (
                  <div className="readonly-details">
                    <div className="info-row">
                      <span className="info-label">Full Name</span>
                      <span className="info-val">{userData.name || 'User'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone Number</span>
                      <span className="info-val">{userData.phone || 'Not provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">WhatsApp Number</span>
                      <span className="info-val">{userData.whatsapp || 'Not provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Location</span>
                      <span className="info-val">{userData.location || 'Not provided'}</span>
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
                    <KeyRound size={18} className="panel-icon" color="#000000" />
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
            <button className="owner-portal-access-btn" onClick={() => navigate('/admin')}>
              <ShieldCheck size={16} /> Admin Access
            </button>
            <div className="footer-right-actions">
              <button className="delete-account-action-btn" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={16} /> Delete Account
              </button>
              <button className="logout-action-btn" onClick={() => setShowLogoutConfirm(true)}>
                <LogOut size={16} /> Log Out
              </button>
            </div>
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
