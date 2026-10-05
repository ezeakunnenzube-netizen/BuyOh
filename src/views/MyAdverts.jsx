'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NavLink from '../components/NavLink';
import DesktopNavbar from '../components/DesktopNavbar';
import { useRouter } from 'next/navigation';
import { 
  PanelTop, Trash2, Eye, MapPin, Tag, Plus, ArrowLeft, 
  Search, X, ShieldCheck, Store, RefreshCcw, TrendingUp,
  Layers, CheckCircle, SlidersHorizontal, ShoppingBag
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
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
    const cur = currency === 'GHS' ? 'GHS' : 'NGN';
    const locale = cur === 'GHS' ? 'en-GH' : 'en-NG';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalValue = useMemo(() => {
    return myAdverts.reduce((acc, ad) => acc + (Number(ad.price) || 0), 0);
  }, [myAdverts]);

  // Detect the dominant currency for aggregate metrics
  const dominantCurrency = useMemo(() => {
    const ghsCount = myAdverts.filter(ad => ad.currency === 'GHS').length;
    return ghsCount > myAdverts.length / 2 ? 'GHS' : 'NGN';
  }, [myAdverts]);

  const avgPrice = useMemo(() => {
    if (myAdverts.length === 0) return 0;
    return Math.round(totalValue / myAdverts.length);
  }, [myAdverts, totalValue]);

  const categories = useMemo(() => {
    const set = new Set();
    myAdverts.forEach(ad => {
      if (ad.category) set.add(ad.category);
    });
    return ['All', ...Array.from(set)];
  }, [myAdverts]);

  const filteredAdverts = useMemo(() => {
    let list = [...myAdverts];
    if (selectedCategory !== 'All') {
      list = list.filter(ad => ad.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(ad =>
        (ad.name || '').toLowerCase().includes(q) ||
        (ad.category || '').toLowerCase().includes(q) ||
        (ad.subcategory || '').toLowerCase().includes(q) ||
        (ad.location || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'price-low') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    return list;
  }, [myAdverts, selectedCategory, searchQuery, sortBy]);

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
            <Store size={36} color="#2563eb" />
          </div>
          <h2>Seller Studio</h2>
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
        {/* Mobile Navigation Header Bar */}
        <div className="adverts-mobile-header">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="adverts-back-btn"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h2 className="adverts-mobile-title">My Adverts</h2>
        </div>

        {/* ── Human-Crafted Hero Header Banner ── */}
        <div className="adverts-hero-banner">
          <div className="adverts-hero-top">
            <div className="adverts-hero-left">
              <nav className="adverts-breadcrumb" aria-label="Breadcrumb">
                <span onClick={() => navigate('/')} className="crumb-link">Home</span>
                <span className="crumb-sep">/</span>
                <span className="crumb-current">Seller Studio</span>
              </nav>

              <div className="adverts-title-row">
                <button 
                  type="button" 
                  onClick={() => navigate(-1)} 
                  className="adverts-back-arrow-btn"
                  title="Go back"
                  aria-label="Go back"
                >
                  <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
                <div className="adverts-icon-badge">
                  <Store size={22} className="adverts-icon-svg" />
                </div>
                <h1 className="adverts-hero-title">My Adverts</h1>
                <span className="adverts-count-chip">
                  {myAdverts.length} {myAdverts.length === 1 ? 'listing' : 'listings'}
                </span>
              </div>

              <p className="adverts-hero-desc">
                Track your active listings, monitor inventory asking value, and publish new products to buyers.
              </p>
            </div>

            <div className="adverts-hero-actions">
              <button 
                type="button" 
                className="adverts-action-btn btn-post-new" 
                onClick={() => navigate('/sell')}
                title="Create a new marketplace listing"
              >
                <Plus size={16} />
                <span>Post New Ad</span>
              </button>

              <button
                type="button"
                id="adverts-sync-btn"
                className={`adverts-action-btn btn-sync adverts-sync-btn--${syncStatus}`}
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
                  {syncStatus === 'error' && 'Sync Failed'}
                  {syncStatus === 'idle' && 'Sync Cloud'}
                </span>
              </button>
            </div>
          </div>

          {/* Solid KPI Metrics Tiles */}
          <div className="adverts-metrics-row">
            <div className="adverts-metric-tile">
              <div className="metric-icon-wrap metric-icon-blue">
                <Layers size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-tile-label">Active Listings</span>
                <span className="metric-tile-value">{myAdverts.length}</span>
              </div>
            </div>

            <div className="adverts-metric-tile">
              <div className="metric-icon-wrap metric-icon-orange">
                <Tag size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-tile-label">Inventory Value</span>
                <span className="metric-tile-value metric-accent">{formatPrice(totalValue, dominantCurrency)}</span>
              </div>
            </div>

            <div className="adverts-metric-tile">
              <div className="metric-icon-wrap metric-icon-green">
                <TrendingUp size={18} />
              </div>
              <div className="metric-details">
                <span className="metric-tile-label">Avg. Asking Price</span>
                <span className="metric-tile-value">{formatPrice(avgPrice, dominantCurrency)}</span>
              </div>
            </div>
          </div>

          {/* Solid Filter & Search Toolbar */}
          <div className="adverts-hero-toolbar">
            <div className="adverts-search-box">
              <Search size={16} className="adverts-search-icon" />
              <input
                type="text"
                placeholder="Search listings by title, category, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="adverts-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="adverts-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="adverts-filters-group">
              {categories.length > 1 && (
                <div className="adverts-category-pills">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="adverts-sort-box">
                <SlidersHorizontal size={14} className="sort-icon" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="adverts-sort-select"
                  aria-label="Sort adverts"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Adverts Grid or Empty State ── */}
        {myAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <div className="adverts-empty-icon-circle">
              <Store size={36} color="#2563eb" />
            </div>
            <h3>No Active Listings Yet</h3>
            <p>You haven't posted any listings on InfiBuy marketplace yet. Publish your first item to connect with verified buyers today.</p>
            <button className="empty-post-btn" onClick={() => navigate('/sell')}>
              <Plus size={16} /> Post Your First Ad
            </button>
          </div>
        ) : filteredAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <div className="adverts-empty-icon-circle">
              <Search size={32} color="#64748b" />
            </div>
            <h3>No matching listings found</h3>
            <p>No active listings match your current search "{searchQuery}" in category "{selectedCategory}".</p>
            <button
              className="empty-post-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            >
              Clear Search & Filters
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
            <p>Are you sure you want to remove this listing from InfiBuy marketplace? This action cannot be undone.</p>
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
