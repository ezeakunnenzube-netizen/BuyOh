import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  PanelTop, Trash2, Eye, MapPin, Tag, Plus, ArrowLeft, 
  MessageSquareMore, BellRing, Bookmark, UserRound, Sparkles, CheckCircle,
  Search, X, ShieldCheck, TrendingUp, Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MyAdverts.css';

export default function MyAdverts() {
  const navigate = useNavigate();
  const { user, setIsAuthOpen } = useAuth();

  const [myAdverts, setMyAdverts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  useEffect(() => {
    const loadAdverts = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('buyoh_my_listings_v1')) || [];
        setMyAdverts(saved);
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
  }, []);

  const handleDeleteAd = (id) => {
    try {
      const updated = myAdverts.filter(ad => ad.id !== id);
      setMyAdverts(updated);
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
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

  if (!user) {
    return (
      <div className="adverts-page-wrapper">
        <div className="adverts-auth-prompt">
          <div className="adverts-auth-icon-glow">
            <PanelTop size={40} color="#8b5cf6" />
          </div>
          <h2>My Adverts Dashboard</h2>
          <p>Sign in to view, edit, and manage your posted marketplace listings.</p>
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
      <header className="home-nav-row adverts-desktop-nav">
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
          <NavLink to="/saved" replace className="home-nav-item">
            <button className="home-nav-icon-btn">
              <Bookmark className="home-nav-icon" color="white" />
            </button>
          </NavLink>
          <NavLink to="/adverts" replace className="home-nav-item home-nav-item-active">
            <button className="home-nav-icon-btn">
              <PanelTop className="home-nav-icon" color="#1d4ed8" />
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

      <div className="adverts-container">
        {/* Mobile Navigation Bar */}
        <div className="adverts-mobile-header">
          <button onClick={() => navigate(-1)} className="adverts-back-btn">
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="adverts-mobile-title">My Adverts</h2>
        </div>

        {/* ── Modern Hero Header Banner ── */}
        <div className="adverts-hero-banner">
          <div className="adverts-hero-content">
            <div className="adverts-hero-title-group">
              <div className="adverts-hero-icon-wrap">
                <PanelTop size={26} color="#c084fc" />
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
                  Manage, preview, and track your active marketplace listings in real time.
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
                <span className="adverts-stat-label">Portfolio Value</span>
                <span className="adverts-stat-value adverts-stat-highlight">{formatPrice(totalValue)}</span>
              </div>
            </div>
          </div>

          {/* Banner Toolbar (Search + Post Action) */}
          <div className="adverts-hero-toolbar">
            {myAdverts.length > 0 ? (
              <div className="adverts-search-box">
                <Search size={16} className="adverts-search-icon" />
                <input
                  type="text"
                  placeholder="Search my adverts by title, category, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="adverts-search-input"
                />
                {searchQuery && (
                  <button className="adverts-search-clear" onClick={() => setSearchQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : <div />}

            <button className="adverts-post-new-btn" onClick={() => navigate('/sell')}>
              <Plus size={16} /> Post New Ad
            </button>
          </div>
        </div>

        {/* ── Adverts Grid or Empty State ── */}
        {myAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <div className="adverts-empty-icon-glow">
              <Store size={42} color="#e67600" />
            </div>
            <h3>No Active Adverts Yet</h3>
            <p>You haven't posted any listings on BuyOh! marketplace yet. Post your first ad today!</p>
            <button className="empty-post-btn" onClick={() => navigate('/sell')}>
              <Plus size={16} /> Sell Something Now
            </button>
          </div>
        ) : filteredAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <Search size={38} color="#94a3b8" />
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
                  <img src={ad.image || "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80"} alt={ad.name} className="advert-img" />
                  <span className="advert-status-badge">
                    <CheckCircle size={10} /> Active
                  </span>
                </div>

                <div className="advert-body">
                  <h3 className="advert-name">{ad.name}</h3>
                  <p className="advert-price">{formatPrice(ad.price)}</p>
                  <div className="advert-meta">
                    <span><MapPin size={12} /> {ad.location}</span>
                    <span><Tag size={12} /> {ad.subcategory || ad.category}</span>
                  </div>

                  <div className="advert-actions">
                    <button className="btn-view-ad" onClick={() => navigate(`/product/${ad.id}`)}>
                      <Eye size={14} /> View Ad
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
            <h3>Delete Listing?</h3>
            <p>Are you sure you want to remove this ad from BuyOh! marketplace? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="btn-confirm-delete" onClick={() => handleDeleteAd(deleteId)}>
                Yes, Delete Ad
              </button>
              <button className="btn-cancel-delete" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="adverts-toast">{toastMessage}</div>
      )}
    </div>
  );
}
