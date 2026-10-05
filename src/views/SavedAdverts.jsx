'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NavLink from '../components/NavLink';
import DesktopNavbar from '../components/DesktopNavbar';
import { useRouter } from 'next/navigation';
import {
  Bookmark, MapPin, Tag, ArrowLeft, Eye, Trash2,
  Search, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getSavedItemsForUser, saveItemsForUser, syncUserDataFromCloud } from '../utils/userSync';
import { shouldShowConditionBadge } from '../utils/productUtils';
import './SavedAdverts.css';

export default function SavedAdverts() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));
  const { user, loading, setIsAuthOpen } = useAuth();
  const { unreadCount } = useChat();

  const [savedItems, setSavedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [removeId, setRemoveId] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  useEffect(() => {
    const loadSaved = () => {
      const saved = getSavedItemsForUser(user);
      setSavedItems(saved);
    };

    loadSaved();

    // Pull latest from cloud in background; fires buyoh_saved_updated when done
    if (user?.id) {
      syncUserDataFromCloud(user).catch(() => {});
    }

    window.addEventListener('buyoh_saved_updated', loadSaved);
    window.addEventListener('storage', loadSaved);
    return () => {
      window.removeEventListener('buyoh_saved_updated', loadSaved);
      window.removeEventListener('storage', loadSaved);
    };
  }, [user]);

  const handleRemove = async (id) => {
    try {
      const updated = savedItems.filter(item => {
        const itemId = typeof item === 'object' ? item.id : item;
        return String(itemId) !== String(id);
      });
      setSavedItems(updated);
      await saveItemsForUser(user, updated);
      setRemoveId(null);
      showToast('Removed from saved collection');
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    try {
      setSavedItems([]);
      await saveItemsForUser(user, []);
      setShowClearAllModal(false);
      showToast('All saved items cleared');
    } catch (e) {
      console.error(e);
    }
  };

  const formatPrice = (val, item) => {
    const isGhana = item?.currency === 'GHS' || item?.currency === 'GH₵' || item?.country === 'Ghana' || (typeof item?.location === 'string' && (item.location.includes('Ghana') || item.location.includes('Accra') || item.location.includes('Ashanti')));
    if (isGhana) {
      return 'GH₵ ' + Number(val || 0).toLocaleString();
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const filteredItems = useMemo(() => {
    let list = [...savedItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.subcategory || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [savedItems, searchQuery]);

  // While auth is resolving, render nothing to avoid flash of sign-in prompt
  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="saved-page-wrapper">
        <DesktopNavbar />
        <div className="saved-auth-prompt">
          <div className="auth-icon-circle">
            <Bookmark size={36} color="#0f172a" />
          </div>
          <h2>Saved Collection</h2>
          <p>Sign in to view, organize, and revisit your bookmarked marketplace listings.</p>
          <button className="saved-signin-btn" onClick={() => setIsAuthOpen(true)}>
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-page-wrapper">
      {/* Desktop Header */}
      <DesktopNavbar />

      <div className="saved-container">
        {/* Simple Clean Header */}
        <div className="saved-header">
          <div className="saved-header-left">
            
            <h1 className="saved-page-title">Saved Adverts</h1>
            {savedItems.length > 0 && (
              <span className="saved-count-pill">
                {savedItems.length}
              </span>
            )}
          </div>

          {savedItems.length > 0 && (
            <div className="saved-header-actions">
              <button 
                type="button" 
                className="saved-clear-btn" 
                onClick={() => setShowClearAllModal(true)}
                title="Remove all saved adverts"
              >
                <Trash2 size={15} />
                <span>Clear all</span>
              </button>
            </div>
          )}
        </div>

        {/* Search input — ONLY rendered if there is an ad available */}
        {savedItems.length > 0 && (
          <div className="saved-search-wrapper">
            <Search size={18} className="saved-search-icon" />
            <input
              type="text"
              placeholder="Search saved adverts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="saved-search-input"
              aria-label="Search saved adverts"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="saved-search-clear-btn" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search text"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* ── Saved Items Grid or Empty State ── */}
        {savedItems.length === 0 ? (
          <div className="saved-empty-state">
            <div className="empty-icon-wrap">
              <Bookmark size={40} className="empty-icon" />
            </div>
            <h3 className="empty-state-title">No saved adverts yet</h3>
            <p className="empty-state-desc">
              When you bookmark listings while browsing the marketplace, they will appear here.
            </p>
            <button className="empty-state-btn" onClick={() => navigate('/')}>
              Explore Marketplace
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="saved-empty-state">
            <div className="empty-icon-wrap">
              <Search size={36} className="empty-icon" />
            </div>
            <h3 className="empty-state-title">No matching adverts found</h3>
            <p className="empty-state-desc">We couldn't find any saved adverts matching "{searchQuery}".</p>
            <button 
              className="empty-state-btn" 
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="saved-grid">
            {filteredItems.map((item) => (
              <div className="saved-card" key={item.id}>
                <NavLink to={`/product/${item.id}`} className="saved-card-link">
                  <div className="saved-image-wrap">
                    <img 
                      src={item.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"} 
                      alt={item.name} 
                      className="saved-img" 
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                    {shouldShowConditionBadge(item) && (
                      <span className={`saved-condition-badge ${item.condition === 'Brand New' ? 'badge-new' : 'badge-used'}`}>
                        {item.condition}
                      </span>
                    )}
                  </div>
                </NavLink>

                <div className="saved-body">
                  <NavLink to={`/product/${item.id}`} className="saved-card-link">
                    <h3 className="saved-name">{item.name}</h3>
                  </NavLink>
                  <p className="saved-price">{formatPrice(item.price, item)}</p>
                  
                  <div className="saved-meta">
                    <span className="saved-meta-item">
                      <MapPin size={12} /> {item.location || 'Nigeria'}
                    </span>
                    <span className="saved-meta-item">
                      <Tag size={12} /> {item.subcategory || item.category || 'General'}
                    </span>
                  </div>

                  <div className="saved-actions">
                    <button 
                      type="button" 
                      className="btn-view-saved" 
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      <Eye size={14} />
                      <span>View Advert</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn-remove-saved" 
                      onClick={() => setRemoveId(item.id)}
                      title="Remove from saved"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove Single Item Confirmation Modal */}
      {removeId && (
        <div className="modal-backdrop" onClick={() => setRemoveId(null)}>
          <div className="saved-dialog-card" onClick={e => e.stopPropagation()}>
            <h3>Remove from Saved?</h3>
            <p>This item will be removed from your saved collection. You can always save it again later.</p>
            <div className="saved-modal-actions">
              <button className="btn-confirm-remove" onClick={() => handleRemove(removeId)}>
                Yes, Remove
              </button>
              <button className="btn-cancel-remove" onClick={() => setRemoveId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <div className="modal-backdrop" onClick={() => setShowClearAllModal(false)}>
          <div className="saved-dialog-card" onClick={e => e.stopPropagation()}>
            <h3>Clear All Saved Items?</h3>
            <p>Are you sure you want to remove all {savedItems.length} bookmarked listings from your collection?</p>
            <div className="saved-modal-actions">
              <button className="btn-confirm-remove" onClick={handleClearAll}>
                Yes, Clear All
              </button>
              <button className="btn-cancel-remove" onClick={() => setShowClearAllModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="saved-toast">{toastMessage}</div>
      )}
    </div>
  );
}
