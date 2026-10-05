'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NavLink from '../components/NavLink';
import DesktopNavbar from '../components/DesktopNavbar';
import { useRouter } from 'next/navigation';
import {
  Bookmark, MapPin, Tag, ArrowLeft, Eye, Trash2,
  Search, X, ShoppingBag, SlidersHorizontal
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
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

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalValue = useMemo(() => {
    return savedItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  }, [savedItems]);


  const categories = useMemo(() => {
    const set = new Set();
    savedItems.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set)];
  }, [savedItems]);

  const filteredItems = useMemo(() => {
    let list = [...savedItems];
    if (selectedCategory !== 'All') {
      list = list.filter(item => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.subcategory || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'price-low') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    return list;
  }, [savedItems, selectedCategory, searchQuery, sortBy]);

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
            <Bookmark size={36} color="#ffa705" />
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
        {/* Mobile Title */}
        <div className="saved-mobile-header">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="saved-mobile-back-btn"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h2 className="saved-mobile-title">Saved Items</h2>
        </div>

        {/* ── Human-Crafted Hero Header Banner ── */}
        <div className="saved-hero-banner">
          <div className="saved-hero-top">
            <div className="saved-hero-left">
              <nav className="saved-breadcrumb" aria-label="Breadcrumb">
                <span onClick={() => navigate('/')} className="crumb-link">Home</span>
                <span className="crumb-sep">/</span>
                <span className="crumb-current">Saved Adverts</span>
              </nav>

              <div className="saved-title-row">
                
                <div className="saved-icon-badge">
                  <Bookmark size={22} className="saved-icon-svg" />
                </div>
                <h1 className="saved-hero-title">Saved Collection</h1>
                <span className="saved-count-chip">
                  {savedItems.length} {savedItems.length === 1 ? 'advert' : 'adverts'}
                </span>
              </div>

              <p className="saved-hero-desc">
                Review bookmarked listings, compare seller asking prices, and monitor items you intend to buy.
              </p>
            </div>

            <div className="saved-hero-actions">
              <button 
                type="button" 
                className="saved-action-btn btn-explore" 
                onClick={() => navigate('/')}
                title="Browse new marketplace items"
              >
                <ShoppingBag size={15} />
                <span>Explore Deals</span>
              </button>
              {savedItems.length > 0 && (
                <button 
                  type="button" 
                  className="saved-action-btn btn-clear-all" 
                  onClick={() => setShowClearAllModal(true)}
                  title="Remove all items from saved"
                >
                  <Trash2 size={15} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Solid KPI Metrics Tiles */}
          <div className="saved-metrics-row">
            <div className="saved-metric-tile">
              <div className="metric-icon-wrap metric-icon-orange">
                <Bookmark size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-tile-label">Saved Listings</span>
                <span className="metric-tile-value">{savedItems.length}</span>
              </div>
            </div>

            <div className="saved-metric-tile">
              <div className="metric-icon-wrap metric-icon-blue">
                <Tag size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-tile-label">Portfolio Value</span>
                <span className="metric-tile-value metric-accent">{formatPrice(totalValue)}</span>
              </div>
            </div>

          </div>

          {/* Integrated Search & Filter Controls */}
          {savedItems.length > 0 && (
            <div className="saved-toolbar-row">
              <div className="saved-search-wrapper">
                <Search size={16} className="saved-search-icon" />
                <input
                  type="text"
                  placeholder="Search saved items by title, category, or location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="saved-search-input"
                  aria-label="Filter saved listings"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    className="saved-clear-search-btn" 
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search text"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="saved-filter-controls">
                {categories.length > 2 && (
                  <div className="saved-category-pills">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`category-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="saved-sort-wrap">
                  <SlidersHorizontal size={14} className="sort-icon" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="saved-sort-select"
                    aria-label="Sort saved listings"
                  >
                    <option value="newest">Recently Saved</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Saved Items Grid or Empty State ── */}
        {savedItems.length === 0 ? (
          <div className="saved-empty-card">
            <div className="empty-icon-circle">
              <Bookmark size={36} color="#ffa705" />
            </div>
            <h3>No Saved Adverts Yet</h3>
            <p>
              Spot something you like? Click the bookmark icon on any product card in the marketplace to save and compare them here.
            </p>
            <button className="saved-browse-btn" onClick={() => navigate('/')}>
              <ShoppingBag size={16} />
              <span>Browse Marketplace Now</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="saved-empty-card">
            <div className="empty-icon-circle">
              <Search size={32} color="#64748b" />
            </div>
            <h3>No matching saved items found</h3>
            <p>Try searching with another keyword or resetting the category filter.</p>
            <button 
              className="saved-browse-btn" 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            >
              Reset Filters
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
                  <p className="saved-price">{formatPrice(item.price)}</p>
                  
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
