import React, { useState, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { 
  Camera, X, MapPin, Tag, DollarSign, FileText, Layers, ChevronDown,
  ImagePlus, Sparkles, AlertCircle, CheckCircle, MessageSquareMore,
  BellRing, Bookmark, PanelTop, UserRound, ArrowLeft, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SellItem.css';

const CATEGORIES = [
  { label: 'Electronics', emoji: '💻', subcategories: ['Laptops & Computers', 'TV & Video Equipment', 'Video Game Consoles', 'Audio & Music Equipment', 'Headphones', 'Photo & Video Cameras', 'Security & Surveillance', 'Networking Products', 'Printers & Scanners', 'Computer Monitors', 'Computer Hardware', 'Computer Accessories', 'Accessories & Supplies for Electronics', 'Video Games', 'Software'] },
  { label: 'Phones & Tablets', emoji: '📱', subcategories: ['Mobile Phones', 'Accessories for Phones & Tablets', 'Smart Watches', 'Tablets', 'Headphones'] },
  { label: 'Vehicles', emoji: '🚗', subcategories: ['Vehicle Parts & Accessories', 'Cars', 'Motorcycles & Scooters', 'Buses & Microbuses', 'Trucks & Trailers', 'Construction & Heavy Machinery', 'Watercraft & Boats', 'Personal Mobility', 'Car Services'] },
  { label: 'Property', emoji: '🏠', subcategories: ['New Builds', 'Houses & Apartments For Rent', 'Houses & Apartments For Sale', 'Short Let', 'Land & Plots for Rent', 'Land & Plots For Sale', 'Event Centres, Venues & Workstations', 'Commercial Property For Rent', 'Commercial Property For Sale'] },
  { label: 'Fashion', emoji: '👟', subcategories: ["Women's Fashion", "Men's Fashion", "Baby & Kids' Fashion"] },
  { label: 'Gaming', emoji: '🎮', subcategories: ['Video Games', 'Gaming Consoles', 'Gaming Accessories', 'Gaming PCs & Laptops', 'Gaming Chairs & Desks', 'VR & AR Devices'] },
  { label: 'Cameras', emoji: '📷', subcategories: ['Digital Cameras', 'Camera Lenses', 'Camera Accessories', 'Action Cameras', 'Drones', 'Tripods & Stabilizers', 'Binoculars & Telescopes'] },
  { label: 'Audio', emoji: '🎧', subcategories: ['Speakers & Sound Systems', 'Headphones & Earphones', 'Microphones', 'Musical Instruments', 'DJ Equipment', 'Home Theatre Systems', 'Car Audio', 'Studio Equipment'] },
  { label: 'Furniture', emoji: '🛏️', subcategories: ['Sofas & Couches', 'Beds & Mattresses', 'Tables & Chairs', 'Wardrobes & Cabinets', 'Office Furniture', 'Kitchen & Dining Furniture', 'Outdoor Furniture', 'Home Decor & Accessories'] },
  { label: 'Beauty & Personal Care', emoji: '💄', subcategories: ['Hair Beauty', 'Face Care', 'Oral Care', 'Body Care', 'Fragrance', 'Makeup', 'Sexual Wellness', 'Tools & Accessories', 'Vitamins & Supplements', 'Massagers', 'Health & Beauty Services'] },
  { label: 'Services', emoji: '🛠️', subcategories: ['Home Services', 'Cleaning Services', 'Tutoring & Lessons', 'Event Planning', 'Photography & Videography', 'Legal Services', 'IT & Tech Support', 'Logistics & Delivery', 'Catering & Food'] },
  { label: 'Repair & Construction', emoji: '🔨', subcategories: ['Building Materials', 'Plumbing', 'Electrical Work', 'Painting & Decorating', 'Carpentry & Woodwork', 'HVAC & Air Conditioning', 'Roofing', 'Tiling & Flooring'] },
  { label: 'Babies & Kids', emoji: '🍼', subcategories: ['Baby Clothing', 'Toys & Games', 'Baby Gear & Strollers', 'Baby Feeding', "Kids' Furniture", 'Baby Safety', 'School Supplies'] },
  { label: 'Agriculture', emoji: '🌾', subcategories: ['Farm Equipment', 'Seeds & Seedlings', 'Fertilizers & Pesticides', 'Livestock & Poultry', 'Farm Produce', 'Irrigation Equipment', 'Agricultural Services'] },
  { label: 'Animals', emoji: '🐾', subcategories: ['Dogs', 'Cats', 'Birds', 'Fish & Aquarium', 'Reptiles', 'Pet Food & Supplies', 'Veterinary Services'] },
  { label: 'Jobs', emoji: '💼', subcategories: ['Accounting & Finance', 'Admin & Office', 'Engineering', 'Healthcare', 'IT & Software', 'Sales & Marketing', 'Teaching & Education', 'Driving & Logistics', 'Construction & Skilled Trades'] },
];

const CONDITIONS = ['Brand New', 'Used', 'Refurbished'];

const NIGERIAN_STATES = [
  'Lagos State', 'Abuja (FCT)', 'Rivers State', 'Oyo State', 'Kano State',
  'Ogun State', 'Delta State', 'Edo State', 'Enugu State', 'Kaduna State',
  'Anambra State', 'Imo State', 'Abia State', 'Benue State', 'Kwara State',
  'Osun State', 'Ondo State', 'Ekiti State', 'Cross River State', 'Akwa Ibom State'
];

export default function SellItem() {
  const navigate = useNavigate();
  const { user, setIsAuthOpen } = useAuth();
  const fileInputRef = useRef(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [images, setImages] = useState([]);
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsApp, setContactWhatsApp] = useState('');

  // Category Specific Specs State
  const [brand, setBrand] = useState('');
  const [screenSize, setScreenSize] = useState('');
  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const [year, setYear] = useState('');
  const [transmission, setTransmission] = useState('Automatic');
  const [mileage, setMileage] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [size, setSize] = useState('');
  const [gender, setGender] = useState('Unisex');

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const selectedCatObj = CATEGORIES.find(c => c.label === category);
  const subcategories = selectedCatObj?.subcategories || [];

  // Image handling
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 8) {
      showToast('Maximum 8 images allowed');
      return;
    }
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Validation
  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!title.trim()) errs.title = 'Title is required';
      if (title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
      if (!category) errs.category = 'Select a category';
      if (!subcategory) errs.subcategory = 'Select a subcategory';
      if (!condition) errs.condition = 'Select item condition';
    }
    if (step === 2) {
      if (!price || Number(price) <= 0) errs.price = 'Enter a valid price';
      if (!location) errs.location = 'Select a location';
      if (!description.trim()) errs.description = 'Add a description';
      if (description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
    }
    if (step === 3) {
      if (images.length === 0) errs.images = 'Add at least 1 photo';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  // Submit listing
  const handleSubmit = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setIsSubmitting(true);

    // Build listing object
    const listing = {
      id: `listing-${Date.now()}`,
      name: title,
      price: Number(price),
      category,
      subcategory,
      condition,
      location,
      description,
      negotiable,
      contactPhone,
      contactWhatsApp,
      specs: {
        brand,
        screenSize,
        storage,
        ram,
        operatingSystem,
        year,
        transmission,
        mileage,
        bedrooms,
        size,
        gender
      },
      imageCount: images.length,
      image: images[0]?.preview || '',
      createdAt: new Date().toISOString(),
      sellerId: user.id,
      sellerName: user.user_metadata?.full_name || user.email,
      status: 'active'
    };

    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('buyoh_my_listings_v1')) || [];
      existing.unshift(listing);
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(existing));

      // Also add to notification
      const notifications = JSON.parse(localStorage.getItem('buyoh_notifications_v1')) || [];
      notifications.unshift({
        id: `notif-${Date.now()}`,
        type: 'listing',
        title: 'Ad Published Successfully!',
        body: `Your listing "${title}" is now live and visible to buyers.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Just now',
        read: false
      });
      localStorage.setItem('buyoh_notifications_v1', JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentStep(4); // Success step
    }, 1500);
  };

  const formatPrice = (val) => {
    if (!val) return '';
    return new Intl.NumberFormat('en-NG').format(val);
  };

  // If not logged in, show auth prompt
  if (!user) {
    return (
      <div className="sell-page-wrapper">
        <div className="sell-auth-prompt">
          <Sparkles size={48} color="#e67600" />
          <h2>Post Your First Ad</h2>
          <p>Sign in or create an account to start selling on BuyOh!</p>
          <button className="sell-signin-btn" onClick={() => setIsAuthOpen(true)}>
            Sign In / Register
          </button>
          <button className="sell-back-btn" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sell-page-wrapper">
      {/* Desktop Navigation */}
      <header className="home-nav-row detail-desktop-nav">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
        </NavLink>
        <div className="home-nav-links">
          <NavLink to="/messages" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
            {({isActive})=>(<button className="home-nav-icon-btn">
              <MessageSquareMore className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
            </button>)}
          </NavLink>
          <NavLink to="/notifications" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
            {({isActive})=>(<button className="home-nav-icon-btn">
              <BellRing className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
            </button>)}
          </NavLink>
          <NavLink to="/saved" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
            {({isActive})=>(<button className="home-nav-icon-btn">
              <Bookmark className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
            </button>)}
          </NavLink>
          <NavLink to="/profile" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
            {({isActive})=>(<button className="home-nav-icon-btn">
              <UserRound className="home-nav-icon" color={isActive?"#1d4ed8":"white"}/>
            </button>)}
          </NavLink>
          <NavLink to="/sell" replace className="home-nav-item">
            <button className="home-sell-btn">
              <p className="home-sell-btn-text" style={{color: '#e67600'}}>+ Sell</p>
            </button>
          </NavLink>
        </div>
      </header>

      <div className="sell-container">
        {/* Mobile Header */}
        <div className="sell-mobile-header">
          <button onClick={() => navigate(-1)} className="sell-mobile-back">
            <ArrowLeft size={20} /> Back
          </button>
          <h2 className="sell-mobile-title">Post Ad</h2>
        </div>

        {/* Page Header */}
        <div className="sell-page-header">
          <h1 className="sell-main-title">
            <Sparkles size={24} className="sell-title-icon" /> Post Your Ad
          </h1>
          <p className="sell-subtitle">Fill in the details below to list your item on BuyOh! marketplace</p>
        </div>

        {/* Progress Stepper */}
        {currentStep < 4 && (
          <div className="sell-stepper">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Pricing' },
              { num: 3, label: 'Photos' }
            ].map(step => (
              <div 
                key={step.num} 
                className={`step-item ${currentStep === step.num ? 'step-active' : ''} ${currentStep > step.num ? 'step-done' : ''}`}
              >
                <div className="step-circle">
                  {currentStep > step.num ? <CheckCircle size={16} /> : step.num}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 1: ITEM DETAILS
           ═══════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="sell-form-card">
            <h3 className="form-section-title"><Tag size={16} /> Item Details</h3>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Ad Title <span className="required">*</span></label>
              <input 
                type="text"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                placeholder="e.g. Samsung Galaxy S24 Ultra 256GB - Titanium Gray"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />
              <div className="input-helper-row">
                {errors.title && <span className="error-text"><AlertCircle size={12} /> {errors.title}</span>}
                <span className="char-count">{title.length}/100</span>
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category <span className="required">*</span></label>
              <div className={`form-select-wrap ${errors.category ? 'input-error' : ''}`}>
                <select 
                  className="form-select"
                  value={category}
                  onChange={e => { setCategory(e.target.value); setSubcategory(''); }}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(c => (
                    <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
              {errors.category && <span className="error-text"><AlertCircle size={12} /> {errors.category}</span>}
            </div>

            {/* Subcategory */}
            {category && (
              <div className="form-group">
                <label className="form-label">Subcategory <span className="required">*</span></label>
                <div className={`form-select-wrap ${errors.subcategory ? 'input-error' : ''}`}>
                  <select 
                    className="form-select"
                    value={subcategory}
                    onChange={e => setSubcategory(e.target.value)}
                  >
                    <option value="">Select subcategory</option>
                    {subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="select-chevron" />
                </div>
                {errors.subcategory && <span className="error-text"><AlertCircle size={12} /> {errors.subcategory}</span>}
              </div>
            )}

            {/* Condition */}
            <div className="form-group">
              <label className="form-label">Condition <span className="required">*</span></label>
              <div className="condition-pills">
                {CONDITIONS.map(cond => (
                  <button 
                    key={cond}
                    type="button"
                    className={`condition-pill ${condition === cond ? 'pill-active' : ''}`}
                    onClick={() => setCondition(cond)}
                  >
                    {cond}
                  </button>
                ))}
              </div>
              {errors.condition && <span className="error-text"><AlertCircle size={12} /> {errors.condition}</span>}
            </div>

            {/* DYNAMIC CATEGORY-SPECIFIC SPECIFICATIONS */}
            {(category === 'Phones & Tablets' || category === 'Electronics' || category === 'Gaming' || category === 'Cameras' || category === 'Audio') && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">⚡ Specifications (Optional)</h4>
                
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Brand / Make</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Apple, Samsung, Sony, Dell, HP"
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Screen Size</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 6.1 inches, 6.7 inches, 14 inches, 55 inches"
                      value={screenSize}
                      onChange={e => setScreenSize(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Internal Storage / Capacity</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 128 GB, 256 GB, 512 GB, 1 TB"
                      value={storage}
                      onChange={e => setStorage(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">RAM Memory</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 8 GB, 12 GB, 16 GB"
                      value={ram}
                      onChange={e => setRam(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Operating System / Processor</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. iOS, Android, macOS, Intel Core i7"
                      value={operatingSystem}
                      onChange={e => setOperatingSystem(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'Vehicles' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">🚘 Vehicle Specifications</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Vehicle Make / Brand</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Toyota, Honda, Mercedes-Benz"
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year of Manufacture</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 2022, 2021, 2020"
                      value={year}
                      onChange={e => setYear(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Transmission</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={transmission} onChange={e => setTransmission(e.target.value)}>
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mileage</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 64,000 km"
                      value={mileage}
                      onChange={e => setMileage(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'Property' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">🏠 Property Details</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Bedrooms</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                        <option value="1">1 Bedroom</option>
                        <option value="2">2 Bedrooms</option>
                        <option value="3">3 Bedrooms</option>
                        <option value="4">4 Bedrooms</option>
                        <option value="5+">5+ Bedrooms</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Furnishing Status</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Fully Serviced, Furnished, Unfurnished"
                      value={storage}
                      onChange={e => setStorage(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'Fashion' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">👟 Fashion Specs</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="Unisex">Unisex</option>
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Kids">Kids</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Size / Fit</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Medium, Large, EU 43"
                      value={size}
                      onChange={e => setSize(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-nav-buttons">
              <div />
              <button className="btn-next" onClick={nextStep}>
                Continue to Pricing →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 2: PRICING & DESCRIPTION
           ═══════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="sell-form-card">
            <h3 className="form-section-title"><DollarSign size={16} /> Pricing & Description</h3>

            {/* Price */}
            <div className="form-group">
              <label className="form-label">Price (₦) <span className="required">*</span></label>
              <div className={`price-input-wrap ${errors.price ? 'input-error' : ''}`}>
                <span className="price-currency">₦</span>
                <input 
                  type="number"
                  className="form-input price-input"
                  placeholder="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min="0"
                />
              </div>
              {price && <span className="price-preview">₦ {formatPrice(price)}</span>}
              {errors.price && <span className="error-text"><AlertCircle size={12} /> {errors.price}</span>}
              
              <label className="negotiable-toggle">
                <input 
                  type="checkbox" 
                  checked={negotiable} 
                  onChange={e => setNegotiable(e.target.checked)} 
                />
                <span className="toggle-label">Price is negotiable</span>
              </label>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label"><MapPin size={14} /> Location <span className="required">*</span></label>
              <div className={`form-select-wrap ${errors.location ? 'input-error' : ''}`}>
                <select 
                  className="form-select"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                >
                  <option value="">Select your location</option>
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-chevron" />
              </div>
              {errors.location && <span className="error-text"><AlertCircle size={12} /> {errors.location}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label"><FileText size={14} /> Description <span className="required">*</span></label>
              <textarea 
                className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                placeholder="Describe your item in detail — include condition, features, reason for selling, and what's included in the package..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={2000}
                rows={6}
              />
              <div className="input-helper-row">
                {errors.description && <span className="error-text"><AlertCircle size={12} /> {errors.description}</span>}
                <span className="char-count">{description.length}/2000</span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="form-group">
              <label className="form-label">Contact Phone (Optional)</label>
              <input 
                type="tel"
                className="form-input"
                placeholder="+234 809 123 4567"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number (Optional)</label>
              <input 
                type="tel"
                className="form-input"
                placeholder="+234 809 123 4567"
                value={contactWhatsApp}
                onChange={e => setContactWhatsApp(e.target.value)}
              />
            </div>

            <div className="form-nav-buttons">
              <button className="btn-prev" onClick={prevStep}>← Back</button>
              <button className="btn-next" onClick={nextStep}>Continue to Photos →</button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 3: PHOTOS & REVIEW
           ═══════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="sell-form-card">
            <h3 className="form-section-title"><Camera size={16} /> Photos & Preview</h3>

            {/* Image Upload */}
            <div className="form-group">
              <label className="form-label">Upload Photos <span className="required">*</span> <span className="label-hint">(Max 8)</span></label>
              
              <div className="image-upload-grid">
                {images.map((img) => (
                  <div key={img.id} className="uploaded-thumb">
                    <img src={img.preview} alt="Preview" className="thumb-preview" />
                    <button className="remove-thumb-btn" onClick={() => removeImage(img.id)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {images.length < 8 && (
                  <button 
                    className="add-image-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={24} />
                    <span>Add Photo</span>
                  </button>
                )}
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {errors.images && <span className="error-text"><AlertCircle size={12} /> {errors.images}</span>}
              
              <div className="photo-tips">
                <Info size={14} />
                <span>Add clear, well-lit photos. First photo will be the cover image.</span>
              </div>
            </div>

            {/* Listing Preview */}
            <div className="listing-preview-section">
              <h4 className="preview-header">📋 Listing Preview</h4>
              <div className="preview-card">
                {images[0] && (
                  <div className="preview-img-wrap">
                    <img src={images[0].preview} alt="Cover" className="preview-cover-img" />
                    <span className="preview-img-count">📷 {images.length}</span>
                  </div>
                )}
                <div className="preview-info">
                  <h3 className="preview-title">{title || 'Your listing title'}</h3>
                  <p className="preview-price">₦ {formatPrice(price) || '0'} {negotiable && <span className="preview-negotiable">Negotiable</span>}</p>
                  <div className="preview-meta">
                    <span><MapPin size={12} /> {location || 'Location'}</span>
                    <span><Layers size={12} /> {category || 'Category'} {subcategory ? `› ${subcategory}` : ''}</span>
                  </div>
                  <span className={`preview-condition ${condition === 'Brand New' ? 'cond-new' : 'cond-used'}`}>
                    {condition || 'Condition'}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-nav-buttons">
              <button className="btn-prev" onClick={prevStep}>← Back</button>
              <button 
                className="btn-submit" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="spinner-text">Publishing...</span>
                ) : (
                  <>🚀 Publish Listing</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 4: SUCCESS
           ═══════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="sell-success-card">
            <div className="success-icon-wrap">
              <CheckCircle size={64} color="#22c55e" />
            </div>
            <h2 className="success-title">Your Ad is Live! 🎉</h2>
            <p className="success-subtitle">
              "{title}" has been published on BuyOh! marketplace. 
              Buyers in {location} and beyond can now discover your listing.
            </p>

            <div className="success-summary">
              <div className="summary-row">
                <span>Category</span>
                <strong>{category} › {subcategory}</strong>
              </div>
              <div className="summary-row">
                <span>Price</span>
                <strong>₦ {formatPrice(price)} {negotiable ? '(Negotiable)' : ''}</strong>
              </div>
              <div className="summary-row">
                <span>Condition</span>
                <strong>{condition}</strong>
              </div>
              <div className="summary-row">
                <span>Photos</span>
                <strong>{images.length} uploaded</strong>
              </div>
            </div>

            <div className="success-actions">
              <button className="btn-next" onClick={() => navigate('/')}>
                Browse Listings
              </button>
              <button className="btn-prev" onClick={() => {
                // Reset form
                setTitle(''); setDescription(''); setPrice(''); setCategory('');
                setSubcategory(''); setCondition(''); setLocation('');
                setNegotiable(true); setImages([]); setContactPhone('');
                setContactWhatsApp(''); setCurrentStep(1); setErrors({});
              }}>
                Post Another Ad
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="sell-toast">{toastMessage}</div>
      )}
    </div>
  );
}
