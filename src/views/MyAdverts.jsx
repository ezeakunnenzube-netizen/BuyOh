'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NavLink from '../components/NavLink';
import DesktopNavbar from '../components/DesktopNavbar';
import { useRouter } from 'next/navigation';
import { 
  PanelTop, Trash2, Eye, MapPin, Tag, Plus, ArrowLeft, 
  Search, X, Store, RefreshCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getMyListingsForUser, saveMyListingsForUser, syncUserDataFromCloud } from '../utils/userSync';
import './MyAdverts.css';

export default function MyAdverts() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));
  const { user, loading, setIsAuthOpen } = useAuth();
  const { unreadCount } = useChat();

  const [myAdverts, setMyAdverts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  useEffect(() => {
    const loadAdverts = () => {
      try {
        const saved = getMyListingsForUser(user);
        const defaultPlaceholder = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
        const cleaned = saved.map(ad => {
          let img = ad.image;
          if (!img || img.startsWith('blob:')) {
            img = defaultPlaceholder;
          }
          let imgs = Array.isArray(ad.images) ? ad.images.map(u => (!u || u.startsWith('blob:')) ? defaultPlaceholder : u) : [img];
          return { ...ad, image: img, images: imgs };
        });
        setMyAdverts(cleaned);
      } catch (e) {
        console.error(e);
      }
    };

    loadAdverts();

    // Pull latest from cloud in background; fires buyoh_listings_updated when done
    if (user?.id) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      syncUserDataFromCloud(user)
        .then(() => {
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 4000);
        })
        .catch(() => {
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 4000);
        })
        .finally(() => setIsSyncing(false));
    }

    window.addEventListener('buyoh_listings_updated', loadAdverts);
    window.addEventListener('storage', loadAdverts);
    return () => {
      window.removeEventListener('buyoh_listings_updated', loadAdverts);
      window.removeEventListener('storage', loadAdverts);
    };
  }, [user]);

  const handleManualSync = async () => {
    if (isSyncing || !user?.id) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await syncUserDataFromCloud(user);
      setSyncStatus('synced');
      showToast(`Listings synced — ${getMyListingsForUser(user).length} active ads found`);
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (e) {
      setSyncStatus('error');
      showToast('Sync failed. Please check your connection.');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAd = async (id) => {
    try {
      const updated = myAdverts.filter(ad => ad.id !== id);
      setMyAdverts(updated);
      await saveMyListingsForUser(user, updated);
      setDeleteId(null);
      showToast('Ad deleted successfully');
    } catch (e) {
      console.error(e);
    }
  };

  // Respects each ad's stored currency (GHS for Ghana, NGN for Nigeria)
  const formatPrice = (val, currency) => {
    const cur = currency === 'GHS' || currency === 'GH₵' ? 'GHS' : 'NGN';
    const locale = cur === 'GHS' ? 'en-GH' : 'en-NG';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const filteredAdverts = useMemo(() => {
    let list = [...myAdverts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(ad =>
        (ad.name || '').toLowerCase().includes(q) ||
        (ad.category || '').toLowerCase().includes(q) ||
        (ad.subcategory || '').toLowerCase().includes(q) ||
        (ad.location || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [myAdverts, searchQuery]);

  // While auth is resolving, render nothing to avoid flash of sign-in prompt
  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="adverts-page-wrapper">
        <DesktopNavbar />
        <div className="adverts-auth-prompt">
          <div className="adverts-auth-icon-circle">
            <Store size={36} color="#0f172a" />
          </div>
          <h2>My Posted Adverts</h2>
          <p>Sign in to view, monitor, and manage your active marketplace listings.</p>
          <button className="adverts-signin-btn" onClick={() => setIsAuthOpen(true)}>
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adverts-page-wrapper">
      {/* Desktop Header */}
      <DesktopNavbar />

      <div className="adverts-container">
        {/* Simple Clean Header */}
        <div className="adverts-header">
          <div className="adverts-header-left">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="back-arrow-btn"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <h1 className="adverts-page-title">My Adverts</h1>
            {myAdverts.length > 0 && (
              <span className="adverts-count-pill">
                {myAdverts.length}
              </span>
            )}
          </div>

          <div className="adverts-header-actions">
            <button 
              type="button" 
              className="adverts-post-btn" 
              onClick={() => navigate('/sell')}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Post New Ad</span>
            </button>

            <button
              type="button"
              id="adverts-sync-btn"
              className={`adverts-sync-btn adverts-sync-btn--${syncStatus}`}
              onClick={handleManualSync}
              disabled={isSyncing}
              title={syncStatus === 'synced' ? 'Synced with cloud' : 'Sync listings with cloud'}
            >
              <RefreshCcw
                size={14}
                className={isSyncing ? 'adverts-sync-spin' : ''}
              />
              <span>
                {syncStatus === 'syncing' && 'Syncing...'}
                {syncStatus === 'synced' && 'Synced ✓'}
                {syncStatus === 'error' && 'Retry'}
                {syncStatus === 'idle' && 'Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* Search input — ONLY rendered if there is an ad available */}
        {myAdverts.length > 0 && (
          <div className="adverts-search-wrapper">
            <Search size={18} className="adverts-search-icon" />
            <input
              type="text"
              placeholder="Search your adverts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="adverts-search-input"
              aria-label="Search your adverts"
            />
            {searchQuery && (
              <button
                type="button"
                className="adverts-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* ── Adverts Grid or Empty State ── */}
        {myAdverts.length === 0 ? (
          <div className="adverts-empty-state">
            <div className="empty-icon-wrap">
              <Store size={40} className="empty-icon" />
            </div>
            <h3 className="empty-state-title">No adverts posted yet</h3>
            <p className="empty-state-desc">
              You haven't posted any advertisements yet. Start selling today to connect with buyers across the marketplace.
            </p>
            <button className="empty-state-btn" onClick={() => navigate('/sell')}>
              <Plus size={16} strokeWidth={2.5} />
              <span>Post Your First Ad</span>
            </button>
          </div>
        ) : filteredAdverts.length === 0 ? (
          <div className="adverts-empty-state">
            <div className="empty-icon-wrap">
              <Search size={36} className="empty-icon" />
            </div>
            <h3 className="empty-state-title">No matching adverts found</h3>
            <p className="empty-state-desc">No adverts match your current search "{searchQuery}".</p>
            <button
              className="empty-state-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="adverts-grid">
            {filteredAdverts.map((ad) => (
              <div className="advert-card" key={ad.id}>
                <div className="advert-image-wrap">
                  <img 
                    src={ad.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"} 
                    alt={ad.name} 
                    className="advert-img" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  <span className="advert-status-badge">
                    <span className="status-dot"></span> Active
                  </span>
                </div>

                <div className="advert-body">
                  <h3 className="advert-name" title={ad.name}>{ad.name}</h3>
                  <p className="advert-price">{formatPrice(ad.price, ad.currency)}</p>
                  
                  <div className="advert-meta-tags">
                    <span className="meta-tag"><MapPin size={12} /> {ad.location || 'Nigeria'}</span>
                    <span className="meta-tag"><Tag size={12} /> {ad.subcategory || ad.category || 'General'}</span>
                  </div>

                  <div className="advert-actions">
                    <button className="btn-view-ad" onClick={() => navigate(`/product/${ad.id}`)}>
                      <Eye size={14} /> View Advert
                    </button>
                    <button className="btn-delete-ad" onClick={() => setDeleteId(ad.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="delete-dialog-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Advert?</h3>
            <p>Are you sure you want to remove this advert from the marketplace? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="btn-confirm-delete" onClick={() => handleDeleteAd(deleteId)}>
                Delete Advert
              </button>
              <button className="btn-cancel-delete" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="adverts-toast">{toastMessage}</div>
      )}
    </div>
  );
}
