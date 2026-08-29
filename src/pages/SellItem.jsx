import React, { useState, useRef, useEffect} from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { 
  Camera, X, MapPin, Tag, DollarSign, FileText, Layers, ChevronDown,
  ImagePlus, Sparkles, AlertCircle, CheckCircle, MessageSquareMore,
  BellRing, Bookmark, PanelTop, UserRound, ArrowLeft, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyListingsForUser, saveMyListingsForUser, registerPublicListing } from '../utils/userSync';
import './SellItem.css';

const CATEGORIES = [
  { label: 'Electronics', emoji: '💻', subcategories: ['Laptops & Computers', 'TV & Video', 'Power Equipment', 'Video Games & Consoles'] },
  { label: 'Phones & Tablets', emoji: '📱', subcategories: ['Mobile Phones', 'Accessories for Phones & Tablets', 'Smart Watches', 'Tablets', 'Headphones'] },
  { label: 'Vehicles', emoji: '🚗', subcategories: ['Cars', 'Buses & Microbuses', 'Trucks & Trailers', 'Motorcycles & Scooters', 'Vehicle Parts & Accessories'] },
  { label: 'Property', emoji: '🏠', subcategories: ['Houses & Apartments for Rent', 'Houses & Apartments for Sale', 'Land & Plots', 'Commercial Property', 'Short Let'] },
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

const CONDITIONS = ['Brand New', 'Used'];

const NIGERIAN_STATES = [
  'Lagos State', 'Abuja (FCT)', 'Rivers State', 'Oyo State', 'Kano State',
  'Ogun State', 'Delta State', 'Edo State', 'Enugu State', 'Kaduna State',
  'Anambra State', 'Imo State', 'Abia State', 'Benue State', 'Kwara State',
  'Osun State', 'Ondo State', 'Ekiti State', 'Cross River State', 'Akwa Ibom State'
];

export default function SellItem() {
  const navigate = useNavigate();
  const { user, loading, setIsAuthOpen } = useAuth();
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
  const [contactPhone, setContactPhone] = useState(() => user?.user_metadata?.phone || '');
  const [contactWhatsApp, setContactWhatsApp] = useState(() => user?.user_metadata?.whatsapp || localStorage.getItem('buyoh_user_whatsapp_v1') || user?.user_metadata?.phone || '');

  // Category Specific Specs State (all initialized to empty strings)
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [screenSize, setScreenSize] = useState('');
  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const [battery, setBattery] = useState('');
  const [color, setColor] = useState('');
  const [processor, setProcessor] = useState('');
  const [displayTech, setDisplayTech] = useState('');

  // Vehicle specs
  const [year, setYear] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [mileage, setMileage] = useState('');

  // Property specs
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [furnishing, setFurnishing] = useState('');

  // Fashion specs
  const [gender, setGender] = useState('');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');

  // Gaming specs
  const [gamingConsole, setGamingConsole] = useState('');

  // Services, Jobs, Agriculture, Appliances specs
  const [billingType, setBillingType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [jobType, setJobType] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [unitQuantity, setUnitQuantity] = useState('');
  const [powerSource, setPowerSource] = useState('');

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

  // Clean up any old spurious listing specs from localStorage on mount
  useEffect(() => {
    try {
      const saved = getMyListingsForUser(user);
      if (saved && Array.isArray(saved)) {
        let modified = false;
        const cleaned = saved.map(item => {
          if (item.specs) {
            const cleanedSpecs = { ...item.specs };
            if (item.category !== 'Vehicles') {
              delete cleanedSpecs.transmission;
              delete cleanedSpecs.mileage;
              delete cleanedSpecs.year;
              delete cleanedSpecs.fuelType;
            }
            if (item.category !== 'Property') {
              delete cleanedSpecs.bedrooms;
              delete cleanedSpecs.bathrooms;
              delete cleanedSpecs.propertyType;
              delete cleanedSpecs.furnishing;
            }
            if (item.category !== 'Fashion') {
              delete cleanedSpecs.gender;
              delete cleanedSpecs.size;
              delete cleanedSpecs.material;
            }
            if (JSON.stringify(cleanedSpecs) !== JSON.stringify(item.specs)) {
              modified = true;
              return { ...item, specs: cleanedSpecs };
            }
          }
          return item;
        });
        if (modified) {
          saveMyListingsForUser(user, cleaned);
        }
      }
    } catch (e) { console.error(e); }
  }, [user]);
  // Helper to compress uploaded image files into persistent base64 data URLs
  const compressImageFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 8) {
      showToast('Maximum 8 images allowed');
      return;
    }

    const processedImages = await Promise.all(
      files.map(async (file) => {
        const dataUrl = await compressImageFile(file);
        return {
          file,
          preview: dataUrl || URL.createObjectURL(file),
          dataUrl: dataUrl || null,
          id: Date.now() + Math.random()
        };
      })
    );

    setImages(prev => [...prev, ...processedImages]);
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
      if (category !== 'Services' && category !== 'Jobs' && !condition) errs.condition = 'Select item condition';
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
  const handleSubmit = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setIsSubmitting(true);

    const defaultPlaceholder = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
    
    // Ensure all image URLs are persistent data URLs or valid HTTP URLs, not temporary blob: URLs
    const imageUrls = images.map(img => {
      const url = img.dataUrl || img.preview;
      if (!url || url.startsWith('blob:')) {
        return defaultPlaceholder;
      }
      return url;
    });

    const listing = {
      id: `listing-${Date.now()}`,
      name: title,
      price: Number(price),
      category,
      subcategory,
      condition: (category === 'Services' || category === 'Jobs') ? '' : (condition || 'Used'),
      location,
      description,
      negotiable,
      contactPhone,
      contactWhatsApp,
      specs: (() => {
        const s = {};
        if (brand.trim()) s.brand = brand.trim();
        if (modelName.trim()) s.model = modelName.trim();
        if (screenSize.trim()) s.screenSize = screenSize.trim();
        if (storage.trim()) s.storage = storage.trim();
        if (ram.trim()) s.ram = ram.trim();
        if (operatingSystem.trim()) s.operatingSystem = operatingSystem.trim();
        if (battery.trim()) s.battery = battery.trim();
        if (color.trim()) s.color = color.trim();
        if (processor.trim()) s.processor = processor.trim();
        if (displayTech.trim()) s.displayTech = displayTech.trim();

        if (category === 'Vehicles') {
          if (year.trim()) s.year = year.trim();
          if (transmission.trim()) s.transmission = transmission.trim();
          if (fuelType.trim()) s.fuelType = fuelType.trim();
          if (mileage.trim()) s.mileage = mileage.trim();
        }

        if (category === 'Property') {
          if (propertyType.trim()) s.propertyType = propertyType.trim();
          if (bedrooms.trim()) s.bedrooms = bedrooms.trim();
          if (bathrooms.trim()) s.bathrooms = bathrooms.trim();
          if (furnishing.trim()) s.furnishing = furnishing.trim();
        }

        if (category === 'Fashion') {
          if (gender.trim()) s.gender = gender.trim();
          if (size.trim()) s.size = size.trim();
          if (material.trim()) s.material = material.trim();
        }

        if (category === 'Gaming') {
          if (gamingConsole.trim()) s.console = gamingConsole.trim();
        }

        if (category === 'Services') {
          if (billingType.trim()) s.billingType = billingType.trim();
          if (experienceLevel.trim()) s.experienceLevel = experienceLevel.trim();
        }

        if (category === 'Jobs') {
          if (jobType.trim()) s.jobType = jobType.trim();
          if (experienceRequired.trim()) s.experienceRequired = experienceRequired.trim();
        }

        if (category === 'Agriculture') {
          if (unitQuantity.trim()) s.unitQuantity = unitQuantity.trim();
        }

        if (powerSource.trim()) s.powerSource = powerSource.trim();

        return s;
      })(),
      imageCount: images.length,
      image: imageUrls[0] || defaultPlaceholder,
      images: imageUrls.length > 0 ? imageUrls : [defaultPlaceholder],
      createdAt: new Date().toISOString(),
      sellerId: user.id,
      sellerName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Marketplace Seller',
      sellerEmail: user.email,
      sellerPhone: contactPhone || user.user_metadata?.phone || '+234 809 123 4567',
      sellerWhatsApp: contactWhatsApp || contactPhone || '2348091234567',
      sellerLocation: location,
      sellerAvatar: user.user_metadata?.avatar_url || localStorage.getItem('buyoh_user_avatar_v1') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      sellerJoined: 'Joined August 2026',
      status: 'active'
    };

    // Save to localStorage and dispatch event for real-time synchronization
    try {
      const existing = getMyListingsForUser(user);
      existing.unshift(listing);
      await saveMyListingsForUser(user, existing);
      registerPublicListing(listing);

      // Also add to in-app notification list
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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="sell-page-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#e67600', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

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
          <button className="sell-back-btn" onClick={handleBack}>
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
        </div>
      </header>

      <div className="sell-container">
        {/* Mobile Header */}
        <div className="sell-mobile-header">
          <button onClick={handleBack} className="sell-mobile-back">
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

            {/* Condition (Only for physical items, not Services or Jobs) */}
            {category !== 'Services' && category !== 'Jobs' && (
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
            )}

            {/* DYNAMIC CATEGORY-SPECIFIC SPECIFICATIONS */}
            {(category === 'Phones & Tablets' || category === 'Electronics' || category === 'Cameras' || category === 'Audio') && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">⚡ Item Specifications (Optional)</h4>
                
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Brand / Manufacturer</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Apple, Samsung, Google, Sony, Dell, HP"
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Model Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Pixel 8, iPhone 15 Pro, XPS 13"
                      value={modelName}
                      onChange={e => setModelName(e.target.value)}
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
                    <div className="form-select-wrap">
                      <select className="form-select" value={storage} onChange={e => setStorage(e.target.value)}>
                        <option value="">Select storage capacity</option>
                        <option value="32 GB">32 GB</option>
                        <option value="64 GB">64 GB</option>
                        <option value="128 GB">128 GB</option>
                        <option value="256 GB">256 GB</option>
                        <option value="512 GB">512 GB</option>
                        <option value="1 TB">1 TB</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">RAM Memory</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={ram} onChange={e => setRam(e.target.value)}>
                        <option value="">Select RAM</option>
                        <option value="4 GB">4 GB</option>
                        <option value="6 GB">6 GB</option>
                        <option value="8 GB">8 GB</option>
                        <option value="12 GB">12 GB</option>
                        <option value="16 GB">16 GB</option>
                        <option value="32 GB">32 GB</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Operating System / Processor</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Android, iOS, Windows 11, Apple M1"
                      value={operatingSystem}
                      onChange={e => setOperatingSystem(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Obsidian, Titanium Gray, Midnight"
                      value={color}
                      onChange={e => setColor(e.target.value)}
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
                      placeholder="e.g. Toyota, Honda, Mercedes-Benz, Lexus"
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Camry XLE, Corolla, Civic, RX350"
                      value={modelName}
                      onChange={e => setModelName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Year of Manufacture</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
                        <option value="">Select year</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        <option value="2020">2020</option>
                        <option value="2019">2019</option>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                        <option value="2015">2015</option>
                        <option value="Older">Older than 2015</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Transmission</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={transmission} onChange={e => setTransmission(e.target.value)}>
                        <option value="">Select transmission</option>
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="CVT">CVT</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fuel Type</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={fuelType} onChange={e => setFuelType(e.target.value)}>
                        <option value="">Select fuel type</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Electric">Electric</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mileage</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 45,000 km"
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
                    <label className="form-label">Property Type</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                        <option value="">Select property type</option>
                        <option value="Flat / Apartment">Flat / Apartment</option>
                        <option value="Duplex">Duplex</option>
                        <option value="Terraced House">Terraced House</option>
                        <option value="Commercial Shop">Commercial Shop</option>
                        <option value="Land Plot">Land Plot</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bedrooms</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                        <option value="">Select bedrooms</option>
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
                    <label className="form-label">Bathrooms</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={bathrooms} onChange={e => setBathrooms(e.target.value)}>
                        <option value="">Select bathrooms</option>
                        <option value="1">1 Bathroom</option>
                        <option value="2">2 Bathrooms</option>
                        <option value="3">3 Bathrooms</option>
                        <option value="4">4 Bathrooms</option>
                        <option value="5+">5+ Bathrooms</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Furnishing Status</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={furnishing} onChange={e => setFurnishing(e.target.value)}>
                        <option value="">Select furnishing</option>
                        <option value="Fully Furnished">Fully Furnished</option>
                        <option value="Semi-Furnished">Semi-Furnished</option>
                        <option value="Unfurnished">Unfurnished</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {category === 'Fashion' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">👟 Fashion Specs</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Gender / Department</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="">Select gender</option>
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
                      placeholder="e.g. Medium, Large, EU 43, Size 12"
                      value={size}
                      onChange={e => setSize(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Material / Fabric</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Leather, Cotton, Denim, Silk, Gold"
                      value={material}
                      onChange={e => setMaterial(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'Gaming' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">🎮 Gaming Platform</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Platform / Console</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={gamingConsole} onChange={e => setGamingConsole(e.target.value)}>
                        <option value="">Select platform</option>
                        <option value="PlayStation 5">PlayStation 5</option>
                        <option value="PlayStation 4">PlayStation 4</option>
                        <option value="Xbox Series X/S">Xbox Series X/S</option>
                        <option value="Nintendo Switch">Nintendo Switch</option>
                        <option value="PC Gaming">PC Gaming</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {category === 'Services' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">🛠️ Service Specifications</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Pricing / Billing Basis</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={billingType} onChange={e => setBillingType(e.target.value)}>
                        <option value="">Select pricing structure</option>
                        <option value="Per Project / Job">Per Project / Job</option>
                        <option value="Hourly Rate">Hourly Rate</option>
                        <option value="Daily Rate">Daily Rate</option>
                        <option value="Fixed Quote">Fixed Quote</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Years of Experience</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                        <option value="">Select experience</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3-5 Years">3-5 Years</option>
                        <option value="5-10 Years">5-10 Years</option>
                        <option value="10+ Years Expert">10+ Years Expert</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {category === 'Jobs' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">💼 Job Role Specifications</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Employment Type</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={jobType} onChange={e => setJobType(e.target.value)}>
                        <option value="">Select job type</option>
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract / Freelance">Contract / Freelance</option>
                        <option value="Remote Work">Remote Work</option>
                        <option value="Internship">Internship</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Required Experience</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={experienceRequired} onChange={e => setExperienceRequired(e.target.value)}>
                        <option value="">Select required experience</option>
                        <option value="Entry Level (0-1 yrs)">Entry Level (0-1 yrs)</option>
                        <option value="Mid Level (2-4 yrs)">Mid Level (2-4 yrs)</option>
                        <option value="Senior Level (5+ yrs)">Senior Level (5+ yrs)</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {category === 'Agriculture' && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">🌾 Agriculture Specifications</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Quantity / Unit Type</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Per 50kg Bag, Per Tonne, Per Crate, Per Head"
                      value={unitQuantity}
                      onChange={e => setUnitQuantity(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {(category === 'Electronics' || category === 'Home & Appliances') && (
              <div className="spec-fields-box">
                <h4 className="spec-fields-title">⚡ Power & Utility Specifications</h4>
                <div className="spec-fields-grid">
                  <div className="form-group">
                    <label className="form-label">Power Source / Compatibility</label>
                    <div className="form-select-wrap">
                      <select className="form-select" value={powerSource} onChange={e => setPowerSource(e.target.value)}>
                        <option value="">Select power source</option>
                        <option value="AC Electric">AC Electric</option>
                        <option value="Solar / Inverter Friendly">Solar / Inverter Friendly</option>
                        <option value="Gas Powered">Gas Powered</option>
                        <option value="Rechargeable / Dual Power">Rechargeable / Dual Power</option>
                      </select>
                      <ChevronDown size={16} className="select-chevron" />
                    </div>
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
                placeholder={
                  category === 'Services' ? "Describe your service offerings in detail — scope of work, turnaround time, coverage areas, pricing structure, and portfolio..." :
                  category === 'Jobs' ? "Describe the job role — key responsibilities, required qualifications/skills, work hours, location, and compensation benefits..." :
                  category === 'Property' ? "Describe the property — location landmarks, security, water/electricity status, lease terms, and facility highlights..." :
                  category === 'Vehicles' ? "Describe the vehicle — engine health, customs clearance status, accident history, interior/exterior condition, and registration..." :
                  "Describe your item in detail — include condition, features, reason for selling, and what's included in the package..."
                }
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
                  {category !== 'Services' && category !== 'Jobs' && condition && (
                    <span className={`preview-condition ${condition === 'Brand New' ? 'cond-new' : 'cond-used'}`}>
                      {condition}
                    </span>
                  )}
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
              {category !== 'Services' && category !== 'Jobs' && condition && (
                <div className="summary-row">
                  <span>Condition</span>
                  <strong>{condition}</strong>
                </div>
              )}
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
