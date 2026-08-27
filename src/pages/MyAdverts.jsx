import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  PanelTop, Trash2, Eye, MapPin, Tag, Plus, ArrowLeft, 
  MessageSquareMore, BellRing, Bookmark, UserRound, Sparkles, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MyAdverts.css';

export default function MyAdverts() {
  const navigate = useNavigate();
  const { user, setIsAuthOpen } = useAuth();

  const [myAdverts, setMyAdverts] = useState([]);
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
    }).format(val);
  };

  if (!user) {
    return (
      <div className="adverts-page-wrapper">
        <div className="adverts-auth-prompt">
          <PanelTop size={48} color="#8b5cf6" />
          <h2>My Adverts</h2>
          <p>Sign in to view and manage your posted marketplace listings.</p>
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
        {/* Mobile Header */}
        <div className="adverts-mobile-header">
          <button onClick={() => navigate(-1)} className="adverts-back-btn">
            <ArrowLeft size={20} /> Back
          </button>
          <h2 className="adverts-mobile-title">My Adverts</h2>
        </div>

        {/* Header Title */}
        <div className="adverts-header">
          <div>
            <h1 className="adverts-title">
              <PanelTop size={24} color="#8b5cf6" /> My Adverts ({myAdverts.length})
            </h1>
            <p className="adverts-sub">Manage, preview, and track your active marketplace listings</p>
          </div>
          <button className="post-new-ad-btn" onClick={() => navigate('/sell')}>
            <Plus size={16} /> Post New Ad
          </button>
        </div>

        {/* Adverts List */}
        {myAdverts.length === 0 ? (
          <div className="adverts-empty-card">
            <Sparkles size={48} color="#e67600" />
            <h3>No Active Adverts Yet</h3>
            <p>You haven't posted any listings on BuyOh! marketplace yet. Post your first ad today!</p>
            <button className="empty-post-btn" onClick={() => navigate('/sell')}>
              + Sell Something Now
            </button>
          </div>
        ) : (
          <div className="adverts-grid">
            {myAdverts.map((ad) => (
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
                    <span><Tag size={12} /> {ad.category}</span>
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
