import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bookmark, MapPin, Tag, ArrowLeft, Eye, Trash2,
  MessageSquareMore, BellRing, PanelTop, UserRound, Heart, Sparkles,
  Search, X, ShoppingBag, TrendingUp, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSavedItemsForUser, saveItemsForUser } from '../utils/userSync';
import './SavedAdverts.css';

export default function SavedAdverts() {
  const navigate = useNavigate();
  const { user, loading, setIsAuthOpen } = useAuth();

  const [savedItems, setSavedItems] = useState(() => getSavedItemsForUser(user));
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
      showToast('Removed from saved items');
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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return savedItems;
    const q = searchQuery.toLowerCase();
    return savedItems.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.subcategory || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q)
    );
  }, [savedItems, searchQuery]);

  if (loading) {
    return (
      <div className="saved-page-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="saved-page-wrapper">
        <div className="saved-auth-prompt">
          <div className="auth-icon-glow">
            <Bookmark size={40} color="#f59e0b" />
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

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="saved-page-wrapper">
      {/* Desktop Header */}
      <header className="home-nav-row saved-desktop-nav">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
        </NavLink>
        <div className="home-nav-links">
          <NavLink to="/messages" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <MessageSquareMore className="home-nav-icon" color="white" />
            </button>
          </NavLink>
          <NavLink to="/notifications" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <BellRing className="home-nav-icon" color="white" />
            </button>
          </NavLink>
          <NavLink to="/saved" replace className="home-nav-item home-nav-item-active">
            <button className="home-nav-icon-btn">
              <Bookmark className="home-nav-icon" color="#1d4ed8" />
            </button>
          </NavLink>
          <NavLink to="/adverts" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <PanelTop className="home-nav-icon" color="white" />
            </button>
          </NavLink>
          <NavLink to="/profile" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <UserRound className="home-nav-icon" color="white" />
            </button>
          </NavLink>
          <NavLink to="/sell" replace className="home-nav-item">
            <button className="home-sell-btn">
              <p className="home-sell-btn-text" style={{color: '#e67600'}}>+ Sell</p>
            </button>
          </NavLink>
        </div>
      </header>

      <div className="saved-container">
        {/* Mobile Navigation Bar */}
        <div className="saved-mobile-header">
          <button onClick={handleBack} className="saved-back-btn">
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="saved-mobile-title">Saved Items</h2>
        </div>

        {/* ── Modern Hero Header Banner ── */}
        <div className="saved-hero-banner">
          <div className="hero-banner-content">
            <div className="hero-title-group">
              <div className="hero-icon-wrap">
                <Bookmark size={26} color="#ffa705" />
              </div>
              <div>
                <div className="hero-badge-row">
                  <span className="hero-pill-badge">
                    <Sparkles size={11} /> Saved Collection
                  </span>
                  <span className="hero-pill-badge badge-verified">
                    <ShieldCheck size={11} /> Sync Active
                  </span>
                </div>
                <h1 className="hero-main-title">
                  My Saved Adverts <span className="hero-count">({savedItems.length})</span>
                </h1>
                <p className="hero-subtext">
                  Track price changes, compare listings, and revisit your bookmarked deals anytime.
                </p>
              </div>
            </div>

            {/* Quick Stats Pill Widgets */}
            <div className="hero-stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Saved</span>
                <span className="stat-value">{savedItems.length} {savedItems.length === 1 ? 'Ad' : 'Ads'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Combined Value</span>
                <span className="stat-value stat-highlight">{formatPrice(totalValue)}</span>
              </div>
            </div>
          </div>

          {/* Banner Toolbar (Search + Actions) */}
          {savedItems.length > 0 && (
            <div className="hero-banner-toolbar">
              <div className="saved-search-box">
                <Search size={16} className="saved-search-icon" />
                <input
                  type="text"
                  placeholder="Search saved items by title, category, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="saved-search-input"
                />
                {searchQuery && (
                  <button className="saved-search-clear" onClick={() => setSearchQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="hero-action-buttons">
                <button className="hero-btn hero-btn-secondary" onClick={() => navigate('/')}>
                  <ShoppingBag size={14} /> Explore Marketplace
                </button>
                <button className="hero-btn hero-btn-danger" onClick={() => setShowClearAllModal(true)}>
                  <Trash2 size={14} /> Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Saved Items Grid or Empty State ── */}
        {savedItems.length === 0 ? (
          <div className="saved-empty-card">
            <div className="empty-icon-glow">
              <Heart size={42} color="#ffa705" />
            </div>
            <h3>No Saved Items Yet</h3>
            <p>Browse listings on BuyOh! and tap the bookmark icon on any item card to save it here.</p>
            <button className="saved-browse-btn" onClick={() => navigate('/')}>
              <ShoppingBag size={16} /> Explore Marketplace Now
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="saved-empty-card">
            <Search size={38} color="#94a3b8" />
            <h3>No matching saved items</h3>
            <p>We couldn't find any saved items matching "{searchQuery}".</p>
            <button className="saved-browse-btn" onClick={() => setSearchQuery('')}>
              Clear Search Query
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
                    {item.category !== 'Services' && item.category !== 'Jobs' && item.condition && item.condition !== 'Service' && item.condition !== 'N/A' && (
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
                    <span><MapPin size={12} /> {item.location}</span>
                    <span><Tag size={12} /> {item.subcategory || item.category}</span>
                  </div>

                  <div className="saved-actions">
                    <button className="btn-view-saved" onClick={() => navigate(`/product/${item.id}`)}>
                      <Eye size={14} /> View
                    </button>
                    <button className="btn-remove-saved" onClick={() => setRemoveId(item.id)}>
                      <Trash2 size={14} /> Remove
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
