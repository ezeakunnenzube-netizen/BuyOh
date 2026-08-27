import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { 
  MapPin, MessageSquareMore, Heart, 
  ArrowLeft, Phone, ShieldAlert, Eye, 
  Share2, Copy, Clock, Tag, Star, ChevronRight,
  BellRing, Bookmark, PanelTop, UserRound, Smartphone, X
} from 'lucide-react';
import { products } from '../data/productData';
import { useAuth } from '../context/AuthContext';
import './ProductDetails.css';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, setIsAuthOpen } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showContactNumber, setShowContactNumber] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [viewsCount, setViewsCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [showSafetyTips, setShowSafetyTips] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [postedAgo, setPostedAgo] = useState('');
  
  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Find product details
  useEffect(() => {
    let found = products.find(p => p.id === productId);
    if (!found) {
      try {
        const userListings = JSON.parse(localStorage.getItem('buyoh_my_listings_v1')) || [];
        found = userListings.find(p => p.id === productId);
      } catch (e) {
        console.error(e);
      }
    }

    if (found) {
      // Sanitize product.specs to scrub spurious historical keys
      if (found.specs && typeof found.specs === 'object') {
        const cat = found.category || '';
        const cleanSpecs = { ...found.specs };

        if (cat !== 'Vehicles') {
          delete cleanSpecs.transmission;
          delete cleanSpecs.mileage;
          delete cleanSpecs.year;
          delete cleanSpecs.fuelType;
        }
        if (cat !== 'Property') {
          delete cleanSpecs.bedrooms;
          delete cleanSpecs.bathrooms;
          delete cleanSpecs.propertyType;
          delete cleanSpecs.furnishing;
        }
        if (cat !== 'Fashion') {
          delete cleanSpecs.gender;
          delete cleanSpecs.size;
          delete cleanSpecs.material;
        }
        if (cat !== 'Gaming') {
          delete cleanSpecs.console;
        }
        found = { ...found, specs: cleanSpecs };
      }

      setProduct(found);
      setViewsCount(Math.floor(Math.random() * 500) + 120);
      setLikesCount(Math.floor(Math.random() * 40) + 5);
      // Simulated time ago
      const mins = Math.floor(Math.random() * 120) + 5;
      setPostedAgo(mins < 60 ? `${mins} min ago` : `${Math.floor(mins/60)}h ${mins%60}m ago`);
    }
  }, [productId]);

  // Load saved item status
  useEffect(() => {
    if (product) {
      try {
        const saved = JSON.parse(localStorage.getItem('buyoh_saved_items_v1')) || [];
        setIsSaved(saved.includes(product.id));
      } catch (e) {
        console.error(e);
      }
    }
  }, [product]);

  // Load reviews on mount
  useEffect(() => {
    const defaultReviews = [
      { id: 1, author: 'Chinedu O.', rating: 5, comment: 'Excellent seller, phone was in perfect condition exactly as advertised! Highly recommended.', date: '3 days ago' },
      { id: 2, author: 'Amara K.', rating: 4, comment: 'Great communication. Meetup was smooth at a secure mall. Item is working well.', date: '1 week ago' },
      { id: 3, author: 'Tunde A.', rating: 5, comment: 'Very professional. Swapped my old device and topped up cash. Smooth transaction.', date: '2 weeks ago' }
    ];

    try {
      const savedReviews = localStorage.getItem('buyoh_seller_reviews_v1');
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      } else {
        localStorage.setItem('buyoh_seller_reviews_v1', JSON.stringify(defaultReviews));
        setReviews(defaultReviews);
      }
    } catch (e) {
      setReviews(defaultReviews);
    }
  }, []);

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    if (!newComment.trim()) return;

    const newReview = {
      id: Date.now(),
      author: user.user_metadata?.full_name || user.email || 'Anonymous Buyer',
      rating: newRating,
      comment: newComment,
      date: 'Just now'
    };

    const updated = [newReview, ...reviews];
    setReviews(updated);
    localStorage.setItem('buyoh_seller_reviews_v1', JSON.stringify(updated));
    setNewComment('');
    setNewRating(5);
    showToast('Thank you! Feedback submitted successfully.');
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  if (!product) {
    return (
      <div className="product-not-found">
        <ShieldAlert size={48} color="#ef4444" />
        <h3>Product Not Found</h3>
        <p>The product you are looking for does not exist or has been removed.</p>
        <button onClick={() => navigate('/')} className="back-home-btn">Go to Home</button>
      </div>
    );
  }

  const formatPrice = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleWhatsAppChat = () => {
    showToast('Redirecting to WhatsApp...');
    const phoneNumber = "2348091234567"; // Mock seller WhatsApp number
    const text = encodeURIComponent(`Hello PHONEMART, I am interested in your item: "${product.name}" listed on BuyOh! for ${formatPrice(product.price)}. Is it still available?`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${text}`;
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 800);
  };

  const handleSaveToggle = () => {
    if (!user) { setIsAuthOpen(true); return; }
    try {
      let saved = JSON.parse(localStorage.getItem('buyoh_saved_items_v1')) || [];
      if (isSaved) {
        saved = saved.filter(id => id !== product.id);
        setIsSaved(false);
        showToast('Removed from saved items');
      } else {
        saved.push(product.id);
        setIsSaved(true);
        showToast('Saved to your collection ❤️');
      }
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(saved));
    } catch (e) { console.error(e); }
  };

  const handleMakeOffer = (e) => {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }
    if (!offerPrice) return;
    try {
      const messagesKey = 'buyoh_messages_v1';
      let chats = JSON.parse(localStorage.getItem(messagesKey)) || [];
      let chat = chats.find(c => c.productId === product.id);
      const newMsg = {
        id: `msg-${Date.now()}`,
        sender: 'me',
        text: `Hello! I would like to make an offer of ${formatPrice(offerPrice)} for your "${product.name}". Is it negotiable?`,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      if (chat) {
        chat.messages.push(newMsg);
      } else {
        chat = {
          id: `chat-${Date.now()}`,
          sellerName: "PHONEMART",
          sellerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          productImage: product.image,
          messages: [newMsg],
          isMuted: false,
          unreadCount: 0
        };
        chats.push(chat);
      }
      localStorage.setItem(messagesKey, JSON.stringify(chats));
      setShowOfferModal(false);
      showToast('Offer sent! Redirecting to chat...');
      setTimeout(() => navigate(`/messages?productId=${product.id}`), 1200);
    } catch (err) { console.error(err); }
  };

  const getSpecs = () => {
    if (product.specs && typeof product.specs === 'object') {
      const customSpecs = [];
      const s = product.specs;
      const cat = product.category || '';

      if (s.brand) customSpecs.push({ label: 'BRAND', value: s.brand });
      if (s.model) customSpecs.push({ label: 'MODEL', value: s.model });
      if (s.screenSize) customSpecs.push({ label: 'SCREEN SIZE', value: s.screenSize });
      if (s.storage) customSpecs.push({ label: 'INTERNAL STORAGE', value: s.storage });
      if (s.ram) customSpecs.push({ label: 'RAM MEMORY', value: s.ram });
      if (s.operatingSystem) customSpecs.push({ label: 'OPERATING SYSTEM', value: s.operatingSystem });
      if (s.battery) customSpecs.push({ label: 'BATTERY CAPACITY', value: s.battery });
      if (s.processor) customSpecs.push({ label: 'PROCESSOR', value: s.processor });
      if (s.displayTech) customSpecs.push({ label: 'DISPLAY TECH', value: s.displayTech });
      if (s.color) customSpecs.push({ label: 'COLOR', value: s.color });

      // Vehicles specs only
      if (cat === 'Vehicles') {
        if (s.year) customSpecs.push({ label: 'MANUFACTURE YEAR', value: s.year });
        if (s.transmission) customSpecs.push({ label: 'TRANSMISSION', value: s.transmission });
        if (s.fuelType) customSpecs.push({ label: 'FUEL TYPE', value: s.fuelType });
        if (s.mileage) customSpecs.push({ label: 'MILEAGE', value: s.mileage });
      }

      // Property specs only
      if (cat === 'Property') {
        if (s.propertyType) customSpecs.push({ label: 'PROPERTY TYPE', value: s.propertyType });
        if (s.bedrooms) customSpecs.push({ label: 'BEDROOMS', value: `${s.bedrooms} Bed` });
        if (s.bathrooms) customSpecs.push({ label: 'BATHROOMS', value: `${s.bathrooms} Bath` });
        if (s.furnishing) customSpecs.push({ label: 'FURNISHING', value: s.furnishing });
      }

      // Fashion specs only
      if (cat === 'Fashion') {
        if (s.gender) customSpecs.push({ label: 'GENDER', value: s.gender });
        if (s.size) customSpecs.push({ label: 'SIZE / FIT', value: s.size });
        if (s.material) customSpecs.push({ label: 'MATERIAL', value: s.material });
      }

      // Gaming specs only
      if (cat === 'Gaming' && s.console) {
        customSpecs.push({ label: 'PLATFORM', value: s.console });
      }

      if (product.condition) customSpecs.push({ label: 'CONDITION', value: product.condition });
      if (customSpecs.length > 0) return customSpecs;
    }

    const nameLower = product.name.toLowerCase();
    
    // 1. PHONES & TABLETS / SMARTPHONES
    if (nameLower.includes('iphone') || nameLower.includes('galaxy s') || nameLower.includes('pixel') || nameLower.includes('redmi') || nameLower.includes('ipad')) {
      const brand = nameLower.includes('iphone') || nameLower.includes('ipad') ? 'Apple'
                  : nameLower.includes('galaxy') ? 'Samsung'
                  : nameLower.includes('pixel') ? 'Google'
                  : nameLower.includes('redmi') ? 'Xiaomi' : 'Generic';
      const storage = nameLower.includes('256gb') ? '256 GB' : nameLower.includes('512gb') ? '512 GB' : '128 GB';
      return [
        { label: 'BRAND', value: brand },
        { label: 'CONDITION', value: product.condition || 'Used' },
        { label: 'INTERNAL STORAGE', value: storage },
        { label: 'RAM', value: nameLower.includes('pro') || nameLower.includes('ultra') ? '12 GB' : '8 GB' },
        { label: 'OPERATING SYSTEM', value: brand === 'Apple' ? 'iOS' : 'Android' },
        { label: 'SCREEN SIZE', value: nameLower.includes('pro max') || nameLower.includes('ultra') ? '6.7 inches' : '6.1 inches' }
      ];
    }

    // 2. LAPTOPS & COMPUTERS
    if (nameLower.includes('macbook') || nameLower.includes('xps') || nameLower.includes('hp pavilion') || nameLower.includes('laptop')) {
      const brand = nameLower.includes('macbook') ? 'Apple' : nameLower.includes('xps') ? 'Dell' : 'HP';
      return [
        { label: 'BRAND', value: brand },
        { label: 'CONDITION', value: product.condition || 'Used' },
        { label: 'PROCESSOR', value: nameLower.includes('macbook') ? 'Apple M1 Pro' : 'Intel Core i7' },
        { label: 'RAM', value: '16 GB' },
        { label: 'STORAGE CAPACITY', value: '512 GB SSD' },
        { label: 'OPERATING SYSTEM', value: brand === 'Apple' ? 'macOS' : 'Windows 11' }
      ];
    }

    // 3. TELEVISIONS & MONITORS
    if (nameLower.includes('tv') || nameLower.includes('television') || nameLower.includes('monitor')) {
      const size = nameLower.includes('65"') ? '65 inches' : nameLower.includes('55"') ? '55 inches' : '27 inches';
      return [
        { label: 'SCREEN SIZE', value: size },
        { label: 'CONDITION', value: product.condition || 'Brand New' },
        { label: 'DISPLAY TECHNOLOGY', value: nameLower.includes('qled') ? 'QLED' : nameLower.includes('oled') ? 'OLED' : 'LED' },
        { label: 'RESOLUTION', value: nameLower.includes('monitor') ? '2K QHD' : '4K UHD' },
        { label: 'REFRESH RATE', value: nameLower.includes('gaming') || nameLower.includes('monitor') ? '165 Hz' : '120 Hz' }
      ];
    }

    // 4. GAMING CONSOLES
    if (product.category === 'Gaming' && (nameLower.includes('playstation') || nameLower.includes('xbox') || nameLower.includes('nintendo') || nameLower.includes('console'))) {
      const brand = nameLower.includes('playstation') ? 'Sony' : nameLower.includes('xbox') ? 'Microsoft' : 'Nintendo';
      return [
        { label: 'BRAND', value: brand },
        { label: 'CONDITION', value: product.condition || 'Brand New' },
        { label: 'STORAGE CAPACITY', value: nameLower.includes('nintendo') ? '64 GB' : '1 TB' },
        { label: 'CONTROLLER', value: '1 Dual Wireless Included' },
        { label: 'EDITION', value: nameLower.includes('disc') ? 'Disc Edition' : 'Digital Edition' }
      ];
    }

    // 5. CAMERAS, DRONES & GOPROS
    if (product.category === 'Cameras') {
      const isDrone = nameLower.includes('drone') || nameLower.includes('mavic');
      const isAction = nameLower.includes('gopro') || nameLower.includes('hero');
      return [
        { label: 'TYPE', value: isDrone ? 'Quadcopter Drone' : isAction ? 'Action Camera' : 'Mirrorless Camera' },
        { label: 'CONDITION', value: product.condition || 'Used' },
        { label: 'SENSOR RESOLUTION', value: nameLower.includes('r6') ? '20 MP' : '24 MP' },
        { label: 'VIDEO RESOLUTION', value: isAction ? '5.3K' : '4K UHD' },
        { label: 'BRAND', value: nameLower.includes('canon') ? 'Canon' : nameLower.includes('sony') ? 'Sony' : nameLower.includes('dji') ? 'DJI' : 'GoPro' }
      ];
    }

    // 6. AUDIO & SPEAKERS
    if (product.category === 'Audio') {
      const isSpeaker = nameLower.includes('speaker') || nameLower.includes('jbl') || nameLower.includes('harman');
      return [
        { label: 'TYPE', value: isSpeaker ? 'Bluetooth Speaker' : 'Wireless Earbuds' },
        { label: 'CONDITION', value: product.condition || 'Brand New' },
        { label: 'CONNECTIVITY', value: 'Bluetooth 5.3' },
        { label: 'BATTERY LIFE', value: isSpeaker ? '20 Hours' : '30 Hours' },
        { label: 'NOISE CANCELLATION', value: nameLower.includes('speaker') ? 'N/A' : 'Active Noise Cancelling (ANC)' }
      ];
    }

    // 7. VEHICLES - CARS
    if (product.subcategory === 'Cars' || nameLower.includes('camry') || nameLower.includes('crv') || nameLower.includes('corolla') || nameLower.includes('c300')) {
      const brand = nameLower.includes('camry') || nameLower.includes('corolla') ? 'Toyota'
                  : nameLower.includes('crv') ? 'Honda'
                  : nameLower.includes('c300') ? 'Mercedes-Benz' : 'Generic';
      return [
        { label: 'BRAND', value: brand },
        { label: 'CONDITION', value: product.condition || 'Used' },
        { label: 'TRANSMISSION', value: 'Automatic' },
        { label: 'FUEL TYPE', value: 'Petrol' },
        { label: 'YEAR', value: nameLower.includes('2020') ? '2020' : nameLower.includes('2021') ? '2021' : nameLower.includes('2022') ? '2022' : '2019' },
        { label: 'BODY TYPE', value: nameLower.includes('crv') ? 'SUV' : 'Sedan' }
      ];
    }

    // 8. VEHICLES - MOTORCYCLES & SCOOTERS
    if (product.subcategory === 'Motorcycles & Scooters' || nameLower.includes('motorcycle') || nameLower.includes('scooter')) {
      return [
        { label: 'TYPE', value: nameLower.includes('scooter') ? 'Electric Scooter' : 'Cruiser' },
        { label: 'CONDITION', value: product.condition || 'Brand New' },
        { label: 'ENGINE CAPACITY', value: nameLower.includes('scooter') ? 'N/A' : '150 cc' },
        { label: 'FUEL CAPACITY', value: nameLower.includes('scooter') ? 'N/A' : '13 Liters' }
      ];
    }

    // 9. FASHION
    if (product.category === 'Fashion') {
      const isShoe = nameLower.includes('shoes') || nameLower.includes('sneakers') || nameLower.includes('air force');
      return [
        { label: 'ITEM TYPE', value: isShoe ? 'Footwear' : 'Accessories' },
        { label: 'CONDITION', value: product.condition || 'Brand New' },
        { label: 'GENDER', value: 'Unisex' },
        { label: 'MATERIAL', value: nameLower.includes('leather') ? 'Leather' : 'Senator Fabric' }
      ];
    }

    // 10. FURNITURE
    if (product.category === 'Furniture') {
      return [
        { label: 'TYPE', value: nameLower.includes('chair') ? 'Office Seating' : 'Home Furniture' },
        { label: 'CONDITION', value: product.condition || 'Brand New' },
        { label: 'MATERIAL', value: nameLower.includes('leather') ? 'Leather' : 'Wood & Metal' },
        { label: 'STYLE', value: 'Modern Minimalist' }
      ];
    }

    // DEFAULT FALLBACK
    return [
      { label: 'CONDITION', value: product.condition || 'Brand New' },
      { label: 'AVAILABILITY', value: 'In stock' },
      { label: 'DELIVERY AVAILABLE', value: 'Yes' },
      { label: 'RETURNS ACCEPTED', value: 'Within 7 days' }
    ];
  };

  const thumbnails = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"];

  // Similar products from same category
  const similarProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="detail-page-wrapper">
      {/* ── Sticky Desktop Navigation (same as Home) ── */}
      <header className="home-nav-row detail-desktop-nav">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
        </NavLink>
        <div className="home-nav-links">
          {user ? (
            <>
              <NavLink to="/messages" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
                {({isActive})=>(<button className="home-nav-icon-btn">
                  <MessageSquareMore className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
                  <div className="home-header-tooltip">My Messages</div>
                </button>)}
              </NavLink>
              <NavLink to="/notifications" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
                {({isActive})=>(<button className="home-nav-icon-btn">
                  <BellRing className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
                  <div className="home-header-tooltip">Notifications</div>
                </button>)}
              </NavLink>
              <NavLink to="/saved" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
                {({isActive})=>(<button className="home-nav-icon-btn">
                  <Bookmark className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
                  <div className="home-header-tooltip">Saved</div>
                </button>)}
              </NavLink>
              <NavLink to="/adverts" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
                {({isActive})=>(<button className="home-nav-icon-btn">
                  <PanelTop className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
                  <div className="home-header-tooltip">My Adverts</div>
                </button>)}
              </NavLink>
              <NavLink to="/profile" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
                {({isActive})=>(<button className="home-nav-icon-btn">
                  <UserRound className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
                  <div className="home-header-tooltip">My Profile</div>
                </button>)}
              </NavLink>
              <NavLink to="/sell" replace className="home-nav-item">
                <button className="home-sell-btn">
                  <p className="home-sell-btn-text" style={{color: '#e67600'}}>+ Sell</p>
                </button>
              </NavLink>
            </>
          ) : (
            <button className="nav-login-btn" onClick={() => setIsAuthOpen(true)}>
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      <div className="detail-page-container">
        {/* Breadcrumb Navigation */}
        <nav className="detail-breadcrumb">
          <NavLink to="/" className="bread-link">Home</NavLink>
          <ChevronRight size={12} className="bread-sep" />
          <span className="bread-link bread-cat" onClick={() => navigate('/')}>{product.category}</span>
          <ChevronRight size={12} className="bread-sep" />
          {product.subcategory && (
            <>
              <span className="bread-link bread-sub">{product.subcategory}</span>
              <ChevronRight size={12} className="bread-sep" />
            </>
          )}
          <span className="bread-current">{product.name.substring(0, 30)}...</span>
        </nav>

        {/* Mobile back button */}
        <div className="detail-mobile-header">
          <button onClick={() => navigate(-1)} className="mobile-back-btn">
            <ArrowLeft size={20} /> Back
          </button>
        </div>

        <div className="detail-grid">
          {/* LEFT COLUMN */}
          <div className="detail-left-col">
            {/* Cover Carousel */}
            <div className="detail-carousel-card">
              <span className="carousel-badge">{product.condition}</span>
              <div className="carousel-main-image-wrap">
                <img 
                  src={thumbnails[activeImageIndex]} 
                  alt={product.name} 
                  className="carousel-main-img" 
                />
                <span className="carousel-counter-badge">
                  📷 {activeImageIndex + 1}/{thumbnails.length}
                </span>
              </div>
              
              <div className="carousel-thumb-row">
                {thumbnails.map((thumb, idx) => (
                  <button 
                    key={idx} 
                    className={`thumb-btn ${activeImageIndex === idx ? 'thumb-active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <img src={thumb} alt="Thumbnail view" className="thumb-img" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Title Card */}
            <div className="detail-title-card">
              <div className="title-row-top">
                <h1 className="detail-product-name">{product.name}</h1>
                <button 
                  className={`detail-bookmark-btn ${isSaved ? 'bookmarked' : ''}`}
                  onClick={handleSaveToggle}
                  title={isSaved ? "Remove from saved" : "Save item"}
                >
                  <Heart size={20} fill={isSaved ? "#ef4444" : "none"} color={isSaved ? "#ef4444" : "#64748b"} />
                  <span>{likesCount}</span>
                </button>
              </div>

              <div className="title-meta-row">
                <span className="badge-promoted"><Smartphone size={11} /> Promoted</span>
                <span className="meta-text"><MapPin size={13} /> {product.location}</span>
                <span className="meta-text"><Clock size={13} /> {postedAgo}</span>
                <span className="meta-text-views"><Eye size={13} /> {viewsCount} views</span>
              </div>
            </div>

            {/* Specification grid */}
            <div className="detail-specs-card">
              <h3 className="specs-section-header"><Tag size={16} /> Specifications</h3>
              <div className="specs-grid">
                {getSpecs().map((spec, idx) => (
                  <div className="spec-item" key={idx}>
                    <span className="spec-value">{spec.value}</span>
                    <span className="spec-label">{spec.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description Block */}
            <div className="detail-desc-card">
              <h3 className="desc-title">Description</h3>
              <p className="desc-paragraph">
                {product.condition === 'Brand New' ? 'Brand new' : 'Neatly used'} {product.name} in excellent pristine condition with full warranty. 
                No faults, verified physical hardware check, all components and accessories intact. Ready for instant use. 
                Delivery can be arranged within Lagos and nationwide.
              </p>
              
              {/* Social Share Buttons */}
              <div className="social-share-row">
                <button className="share-btn fb-btn" onClick={() => showToast('Shared on Facebook')}>
                  <Share2 size={13} /> Facebook
                </button>
                <button className="share-btn wa-btn" onClick={handleWhatsAppChat}>
                  <MessageSquareMore size={13} /> WhatsApp
                </button>
                <button className="share-btn link-btn" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Link copied to clipboard!');
                }}>
                  <Copy size={13} /> Copy Link
                </button>
              </div>

              {/* Bottom Primary Actions */}
              <div className="detail-bottom-actions">
                <button 
                  className="btn-primary-action"
                  onClick={() => setShowContactNumber(prev => !prev)}
                >
                  <Phone size={16} /> 
                  {showContactNumber ? '+234 809 123 4567' : 'Show contact'}
                </button>
                <button 
                  className="btn-outline-action"
                  onClick={() => {
                    if (!user) setIsAuthOpen(true);
                    else setShowOfferModal(true);
                  }}
                >
                  Make an offer
                </button>
                <button className="btn-outline-action" onClick={() => showToast('Callback requested! Seller will contact you.')}>
                  Request call back
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="detail-right-col">
            {/* Price details card */}
            <div className="detail-price-card">
              <h2 className="detail-price-text">{formatPrice(product.price)}</h2>
              <div className="price-labels-row">
                <span className="price-tag-negotiable">Negotiable</span>
                <span className="price-tag-history">Price History</span>
              </div>
              
              <div className="market-trend-box">
                <span>Market price: ₦ {(product.price * 0.95 / 1000).toFixed(2)} K ~ {(product.price * 1.08 / 1000).toFixed(2)} K</span>
              </div>

              <button 
                className="whatsapp-cta-btn"
                onClick={handleWhatsAppChat}
              >
                💬 Chat on WhatsApp
              </button>
            </div>

            {/* Seller details card */}
            <div className="detail-seller-card">
              <div className="seller-profile-row">
                {product.sellerAvatar ? (
                  <img src={product.sellerAvatar} alt="Seller Avatar" className="seller-avatar-img" />
                ) : (
                  <div className="seller-avatar-icon">{(product.sellerName || 'P')[0].toUpperCase()}</div>
                )}
                <div className="seller-name-info">
                  <h4>{product.sellerName || 'PHONEMART'}</h4>
                  <div className="seller-badges">
                    <span>👤 {product.sellerJoined || '5+ years on BuyOh'}</span>
                    <span>🛡️ Verified Seller</span>
                  </div>
                  <span className="reply-rate-sub">⚡ Typically replies within a few minutes</span>
                </div>
              </div>

              <div className="seller-action-buttons">
                <button 
                  className="btn-primary-action"
                  onClick={() => setShowContactNumber(prev => !prev)}
                >
                  <Phone size={16} /> 
                  {showContactNumber ? (product.sellerPhone || product.contactPhone || '+234 809 123 4567') : 'Show contact'}
                </button>
                
                {user ? (
                  <NavLink 
                    to={`/messages?productId=${product.id}&prodName=${encodeURIComponent(product.name)}&prodPrice=${product.price}&prodImg=${encodeURIComponent(product.image)}`}
                    className="start-chat-link-btn"
                  >
                    <MessageSquareMore size={16} /> Start chat
                  </NavLink>
                ) : (
                  <button 
                    className="start-chat-link-btn"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    <MessageSquareMore size={16} /> Start chat
                  </button>
                )}
              </div>
            </div>

            {/* Feedbacks Card */}
            <div 
              className="detail-feedback-card" 
              onClick={() => {
                document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              style={{ cursor: 'pointer' }}
            >
              <div className="feedback-left">
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                <span>{averageRating} Rating ({reviews.length} Feedback)</span>
              </div>
              <button className="view-all-feedback-link">
                view all <ChevronRight size={12} />
              </button>
            </div>

            {/* Abuse links */}
            <div className="detail-abuse-links">
              <button className="abuse-link" onClick={() => showToast('Ad marked as unavailable')}>Mark unavailable</button>
              <button className="abuse-link report-btn" onClick={() => showToast('Report submitted. Thank you for keeping BuyOh safe!')}>
                🚨 Report Abuse
              </button>
            </div>

            {/* Safety Tips Card */}
            {showSafetyTips && (
              <div className="detail-safety-card">
                <div className="safety-header-row">
                  <h4>Safety tips</h4>
                  <button className="safety-dismiss-btn" onClick={() => setShowSafetyTips(false)}>
                    <X size={14} />
                  </button>
                </div>
                <ul>
                  <li>Avoid paying in advance, even for delivery</li>
                  <li>Meet with the seller at a safe public place</li>
                  <li>Inspect the item and ensure it's exactly what you want</li>
                  <li>Make sure that the packed item is the one you've inspected</li>
                  <li>Only pay if you're satisfied</li>
                </ul>
              </div>
            )}

            {/* Post Ad Like This */}
            <button className="post-like-this-btn" onClick={() => navigate('/sell')}>
              Post Ad Like This
            </button>
          </div>
        </div>

        {/* Seller Reviews & Feedback Section */}
        <div id="reviews-section" className="detail-reviews-card">
          <h3 className="specs-section-header">
            <Star size={16} fill="#8b5cf6" color="#8b5cf6" style={{ marginRight: '0.25rem' }} />
            Seller Feedback & Reviews
          </h3>
          
          <div className="reviews-summary-row">
            <div className="summary-score-box">
              <span className="summary-big-score">{averageRating}</span>
              <div className="stars-row-generic">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={14} 
                    fill={star <= Math.round(Number(averageRating)) ? '#f59e0b' : 'none'} 
                    color={star <= Math.round(Number(averageRating)) ? '#f59e0b' : '#cbd5e1'} 
                  />
                ))}
              </div>
              <span className="summary-count-label">Based on {reviews.length} reviews</span>
            </div>

            {/* Submit review form */}
            <div className="submit-review-form-wrap">
              <h4>Leave feedback for PHONEMART</h4>
              {user ? (
                <form onSubmit={handleAddReview} className="review-input-form">
                  <div className="star-picker-row">
                    <span className="rating-picker-label">Your Rating:</span>
                    <div className="star-buttons">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          className="star-picker-btn"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          <Star 
                            size={18} 
                            fill={(hoverRating || newRating) >= star ? '#f59e0b' : 'none'} 
                            color={(hoverRating || newRating) >= star ? '#f59e0b' : '#cbd5e1'} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="review-textarea-wrap">
                    <textarea
                      placeholder="Share your experience with this seller (e.g., product condition, delivery, reliability)..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-review-btn">
                    Submit Feedback
                  </button>
                </form>
              ) : (
                <div className="review-login-prompt">
                  <p>You must be signed in to leave seller feedback.</p>
                  <button type="button" onClick={() => setIsAuthOpen(true)} className="btn-outline-action">
                    Sign In / Register
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reviews List */}
          <div className="reviews-list-container">
            {reviews.length === 0 ? (
              <p className="no-reviews-text">No feedback yet. Be the first to leave a review!</p>
            ) : (
              reviews.map(r => (
                <div className="review-card-item" key={r.id}>
                  <div className="review-card-top">
                    <div className="review-author-wrap">
                      <div className="author-avatar">{r.author.charAt(0).toUpperCase()}</div>
                      <span className="review-author-name">{r.author}</span>
                    </div>
                    <div className="review-date-rating">
                      <div className="stars-row-generic">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            size={12} 
                            fill={star <= r.rating ? '#f59e0b' : 'none'} 
                            color={star <= r.rating ? '#f59e0b' : '#cbd5e1'} 
                          />
                        ))}
                      </div>
                      <span className="review-card-date">{r.date}</span>
                    </div>
                  </div>
                  <p className="review-card-comment">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Similar Products Section */}
        {similarProducts.length > 0 && (
          <div className="similar-products-section">
            <h3 className="similar-header">Similar Adverts</h3>
            <div className="similar-grid">
              {similarProducts.map(sp => (
                <NavLink to={`/product/${sp.id}`} key={sp.id} className="similar-card-link">
                  <div className="similar-card">
                    <div className="similar-img-wrap">
                      <img src={sp.image} alt={sp.name} className="similar-img" loading="lazy" />
                      <span className={`similar-condition ${sp.condition === 'Brand New' ? 'sim-new' : 'sim-used'}`}>
                        {sp.condition}
                      </span>
                    </div>
                    <div className="similar-info">
                      <p className="similar-name">{sp.name}</p>
                      <p className="similar-price">{formatPrice(sp.price)}</p>
                      <span className="similar-location"><MapPin size={11} /> {sp.location}</span>
                    </div>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="detail-toast">
          {toastMessage}
        </div>
      )}

      {/* MAKE OFFER MODAL */}
      {showOfferModal && (
        <div className="modal-backdrop" onClick={() => setShowOfferModal(false)}>
          <div className="offer-dialog-card" onClick={e => e.stopPropagation()}>
            <h3>Suggest a Price</h3>
            <p>Make an offer to buy "{product.name}". The seller will see this directly in your chat thread.</p>
            
            <form onSubmit={handleMakeOffer}>
              <div className="offer-input-wrap">
                <span className="currency-symbol">₦</span>
                <input 
                  type="number"
                  placeholder="Enter your price"
                  value={offerPrice}
                  onChange={e => setOfferPrice(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="offer-actions">
                <button type="submit" className="confirm-offer-btn">Send Offer</button>
                <button type="button" className="cancel-offer-btn" onClick={() => setShowOfferModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
