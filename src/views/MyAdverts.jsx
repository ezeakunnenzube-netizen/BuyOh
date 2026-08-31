'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NavLink from '../components/NavLink';
import { useRouter } from 'next/navigation';
import { 
  PanelTop, Trash2, Eye, MapPin, Tag, Plus, ArrowLeft, 
  MessageSquareMore, BellRing, Bookmark, UserRound, Sparkles, CheckCircle,
  Search, X, ShieldCheck, Store, Clock, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyListingsForUser, saveMyListingsForUser } from '../utils/userSync';
import './MyAdverts.css';

export default function MyAdverts() {
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));
  const { user, loading, setIsAuthOpen } = useAuth();

  const [myAdverts, setMyAdverts] = useState(() => getMyListingsForUser(user));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Active'
  const [toastMessage, setToastMessage] = useState('');
  const [deleteId, setDeleteId] = useState(null);

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

    window.addEventListener('buyoh_listings_updated', loadAdverts);
    window.addEventListener('storage', loadAdverts);
    return () => {
      window.removeEventListener('buyoh_listings_updated', loadAdverts);
      window.removeEventListener('storage', loadAdverts);
    };
  }, [user]);

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

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalValue = useMemo(() => {
    return myAdverts.reduce((acc, ad) => acc + (Number(ad.price) || 0), 0);
  }, [myAdverts]);

  const avgPrice = useMemo(() => {
    if (myAdverts.length === 0) return 0;
    return Math.round(totalValue / myAdverts.length);
  }, [myAdverts, totalValue]);

  const filteredAdverts = useMemo(() => {
    if (!searchQuery.trim()) return myAdverts;
    const q = searchQuery.toLowerCase();
    return myAdverts.filter(ad =>
      (ad.name || '').toLowerCase().includes(q) ||
      (ad.category || '').toLowerCase().includes(q) ||
      (ad.subcategory || '').toLowerCase().includes(q) ||
      (ad.location || '').toLowerCase().includes(q)
    );
  }, [myAdverts, searchQuery]);

  if (loading) {
    return (
      <div className="adverts-page-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="adverts-page-wrapper">
        <div className="adverts-auth-prompt">
          <div className="adverts-auth-icon-glow">
            <PanelTop size={42} color="#1d4ed8" />
          </div>
          <h2>Seller Adverts Dashboard</h2>
          <p>Sign in to view, edit, and manage your posted marketplace listings in real time.</p>
          <button className="adverts-signin-btn" onClick={() => setIsAuthOpen(true)}>
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
    <div className="adverts-page-wrapper">
      {/* Desktop Header */}
      <header className="home-nav-row adverts-desktop-nav">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
        </NavLink>
        <div className="home-nav-links">
          <NavLink to="/messages" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <MessageSquareMore className="home-nav-icon" color="white" />
            </span>
          </NavLink>
          <NavLink to="/notifications" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <BellRing className="home-nav-icon" color="white" />
            </span>
          </NavLink>
          <NavLink to="/saved" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <Bookmark className="home-nav-icon" color="white" />
            </span>
          </NavLink>
          <NavLink to="/adverts" replace className="home-nav-item home-nav-item-active">
            <span className="home-nav-icon-btn">
              <PanelTop className="home-nav-icon" color="#1d4ed8" />
            </span>
          </NavLink>
          <NavLink to="/profile" replace className="home-nav-item">
            <span className="home-nav-icon-btn">
              <UserRound className="home-nav-icon" color="white" />
            </span>
          </NavLink>
          <NavLink to="/sell" replace className="home-nav-item">
            <span className="home-sell-btn">
              <span className="home-sell-btn-text" style={{color: '#e67600'}}>+ Sell</span>
            </span>
          </NavLink>
        </div>
      </header>

      <div className="adverts-container">
        {/* Mobile Navigation Header Bar */}
        <div className="adverts-mobile-header">
          <button onClick={handleBack} className="adverts-back-btn">
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="adverts-mobile-title">My Adverts</h2>
        </div>

        {/* ── Modern Hero Header Banner ── */}
        <div className="adverts-hero-banner">
          <div className="adverts-hero-content">
            <div className="adverts-hero-title-group">
              <div className="adverts-hero-icon-wrap">
                <PanelTop size={28} color="#93c5fd" />
              </div>
              <div>
                <div className="adverts-hero-badge-row">
                  <span className="adverts-pill-badge">
                    <Sparkles size={11} /> Seller Dashboard
                  </span>
                  <span className="adverts-pill-badge badge-verified">
                    <ShieldCheck size={11} /> Verified Seller
                  </span>
                </div>
                <h1 className="adverts-hero-main-title">
                  My Active Adverts <span className="adverts-hero-count">({myAdverts.length})</span>
                </h1>
                <p className="adverts-hero-subtext">
                  Track performance, preview listings, and manage your marketplace offers.
                </p>
              </div>
            </div>

            {/* Quick Stats Pill Widgets */}
            <div className="adverts-hero-stats-row">
              <div className="adverts-stat-card">
                <span className="adverts-stat-label">Active Listings</span>
                <span className="adverts-stat-value">{myAdverts.length} {myAdverts.length === 1 ? 'Ad' : 'Ads'}</span>
              </div>
              <div className="adverts-stat-card">
                <span className="adverts-stat-label">Total Value</span>
                <span className="adverts-stat-value adverts-stat-highlight">{formatPrice(totalValue)}</span>
              </div>
              <div className="adverts-stat-card desktop-only-stat">
                <span className="adverts-stat-label">Avg. Price / Ad</span>
                <span className="adverts-stat-value">{formatPrice(avgPrice)}</span>
              </div>
            </div>
          </div>

          {/* Clean Search Bar Toolbar (Single search without redundant duplicate button) */}
          {myAdverts.length > 0 && (
            <div className="adverts-hero-toolbar">
              <div className="adverts-search-box">
                <Search size={17} className="adverts-search-icon" />
                <input
                  type="text"
                  placeholder="Filter my adverts by title, category, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="adverts-search-input"
                />
                {searchQuery && (
                  <button className="adverts-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Adverts Grid or Empty State ── */}
        {myAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <div className="adverts-empty-icon-glow">
              <Store size={44} color="#1d4ed8" />
            </div>
            <h3>No Active Adverts Yet</h3>
            <p>You haven't posted any listings on BuyOh! marketplace yet. Create your first listing today to start receiving buyer offers.</p>
            <button className="empty-post-btn" onClick={() => navigate('/sell')}>
              <Plus size={16} /> Post Your First Ad
            </button>
          </div>
        ) : filteredAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <Search size={40} color="#94a3b8" />
            <h3>No matching adverts found</h3>
            <p>We couldn't find any of your adverts matching "{searchQuery}".</p>
            <button className="empty-post-btn" onClick={() => setSearchQuery('')}>
              Clear Search Query
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
                    <CheckCircle size={11} /> Active
                  </span>
                </div>

                <div className="advert-body">
                  <h3 className="advert-name" title={ad.name}>{ad.name}</h3>
                  <p className="advert-price">{formatPrice(ad.price)}</p>
                  
                  <div className="advert-meta-tags">
                    <span className="meta-tag"><MapPin size={12} /> {ad.location || 'Lagos'}</span>
                    <span className="meta-tag"><Tag size={12} /> {ad.subcategory || ad.category || 'General'}</span>
                  </div>

                  <div className="advert-actions">
                    <button className="btn-view-ad" onClick={() => navigate(`/product/${ad.id}`)}>
                      <Eye size={14} /> View Listing
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
            <div className="delete-icon-circle">
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3>Delete Listing?</h3>
            <p>Are you sure you want to remove this listing from BuyOh! marketplace? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="btn-confirm-delete" onClick={() => handleDeleteAd(deleteId)}>
                Delete Listing
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
