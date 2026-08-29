import "./Home.css"
import {useEffect, useLayoutEffect, useRef, useState, useMemo} from "react"
import {ChevronDown, Search, MapPin, X, MessageSquareMore, BellRing, PanelTop, UserRound, Bookmark} from "lucide-react"
import {NavLink} from "react-router-dom"
import {locations} from "../data/statesData.js"
import {products} from "../data/productData.js"
import {useAuth} from "../context/AuthContext"
import {getSavedItemsForUser, saveItemsForUser, getAllPublicListings} from "../utils/userSync"

const CATEGORIES = [
  { label: 'All',                    emoji: '🛒' },
  { label: 'Electronics',            emoji: '💻', hasSubmenu: true },
  { label: 'Phones & Tablets',       emoji: '📱', hasSubmenu: true },
  { label: 'Vehicles',               emoji: '🚗', hasSubmenu: true },
  { label: 'Property',               emoji: '🏠', hasSubmenu: true },
  { label: 'Fashion',                emoji: '👟', hasSubmenu: true },
  { label: 'Gaming',                 emoji: '🎮', hasSubmenu: true },
  { label: 'Cameras',                emoji: '📷', hasSubmenu: true },
  { label: 'Audio',                  emoji: '🎧', hasSubmenu: true },
  { label: 'Furniture',              emoji: '🛏️', hasSubmenu: true },
  { label: 'Beauty & Personal Care', emoji: '💄', hasSubmenu: true },
  { label: 'Services',               emoji: '🛠️', hasSubmenu: true },
  { label: 'Repair & Construction',  emoji: '🔨', hasSubmenu: true },
  { label: 'Babies & Kids',          emoji: '🍼', hasSubmenu: true },
  { label: 'Agriculture',            emoji: '🌾', hasSubmenu: true },
  { label: 'Animals',                emoji: '🐾', hasSubmenu: true },
  { label: 'Jobs',                   emoji: '💼', hasSubmenu: true },
]

const VEHICLE_SUBCATEGORIES = [
  { label: 'Cars',                        emoji: '🚗' },
  { label: 'Buses & Microbuses',          emoji: '🚌' },
  { label: 'Trucks & Trailers',           emoji: '🚛' },
  { label: 'Motorcycles & Scooters',      emoji: '🏍️' },
  { label: 'Vehicle Parts & Accessories', emoji: '⚙️' },
]

const ELECTRONICS_SUBCATEGORIES = [
  { label: 'Laptops & Computers',              emoji: '💻' },
  { label: 'TV & Video',                       emoji: '📺' },
  { label: 'Power Equipment',                  emoji: '🔋' },
  { label: 'Video Games & Consoles',           emoji: '🎮' },
]

const PHONES_SUBCATEGORIES = [
  { label: 'Mobile Phones',                    emoji: '📱' },
  { label: 'Accessories for Phones & Tablets', emoji: '🔌' },
  { label: 'Smart Watches',                    emoji: '⌚' },
  { label: 'Tablets',                          emoji: '📲' },
  { label: 'Headphones',                       emoji: '🎧' },
]

const PROPERTY_SUBCATEGORIES = [
  { label: 'Houses & Apartments for Rent',       emoji: '🏠' },
  { label: 'Houses & Apartments for Sale',       emoji: '💰' },
  { label: 'Land & Plots',                       emoji: '🌿' },
  { label: 'Commercial Property',                emoji: '🏢' },
  { label: 'Short Let',                          emoji: '🗓️' },
]

const FASHION_SUBCATEGORIES = [
  { label: "Women's Fashion",  emoji: '👗' },
  { label: "Men's Fashion",    emoji: '👔' },
  { label: "Baby & Kids' Fashion", emoji: '👶' },
]

const BEAUTY_SUBCATEGORIES = [
  { label: 'Hair Beauty',             emoji: '💇' },
  { label: 'Face Care',               emoji: '🧖' },
  { label: 'Oral Care',               emoji: '🦷' },
  { label: 'Body Care',               emoji: '🧔' },
  { label: 'Fragrance',               emoji: '🪤' },
  { label: 'Makeup',                  emoji: '💄' },
  { label: 'Sexual Wellness',         emoji: '❤️' },
  { label: 'Tools & Accessories',    emoji: '✂️' },
  { label: 'Vitamins & Supplements', emoji: '💊' },
  { label: 'Massagers',               emoji: '🧘' },
  { label: 'Health & Beauty Services', emoji: '🏥' },
]

const GAMING_SUBCATEGORIES = [
  { label: 'Video Games',              emoji: '🕹️' },
  { label: 'Gaming Consoles',          emoji: '🎮' },
  { label: 'Gaming Accessories',       emoji: '🏹' },
  { label: 'Gaming PCs & Laptops',     emoji: '💻' },
  { label: 'Gaming Chairs & Desks',    emoji: '💺' },
  { label: 'VR & AR Devices',          emoji: '🕶️' },
]

const CAMERAS_SUBCATEGORIES = [
  { label: 'Digital Cameras',          emoji: '📷' },
  { label: 'Camera Lenses',            emoji: '🔍' },
  { label: 'Camera Accessories',       emoji: '📸' },
  { label: 'Action Cameras',           emoji: '🏄' },
  { label: 'Drones',                   emoji: '🚁' },
  { label: 'Tripods & Stabilizers',    emoji: '🎥' },
  { label: 'Binoculars & Telescopes',  emoji: '🔭' },
]

const AUDIO_SUBCATEGORIES = [
  { label: 'Speakers & Sound Systems', emoji: '🔊' },
  { label: 'Headphones & Earphones',   emoji: '🎧' },
  { label: 'Microphones',              emoji: '🎤' },
  { label: 'Musical Instruments',      emoji: '🎸' },
  { label: 'DJ Equipment',             emoji: '🎶' },
  { label: 'Home Theatre Systems',     emoji: '🎦' },
  { label: 'Car Audio',                emoji: '🚗' },
  { label: 'Studio Equipment',         emoji: '🎹' },
]

const FURNITURE_SUBCATEGORIES = [
  { label: 'Sofas & Couches',          emoji: '🛋️' },
  { label: 'Beds & Mattresses',        emoji: '🛌' },
  { label: 'Tables & Chairs',          emoji: '🪑' },
  { label: 'Wardrobes & Cabinets',     emoji: '🚊' },
  { label: 'Office Furniture',         emoji: '💼' },
  { label: 'Kitchen & Dining Furniture', emoji: '🍽️' },
  { label: 'Outdoor Furniture',        emoji: '🌳' },
  { label: 'Home Decor & Accessories', emoji: '🛄' },
]

const SERVICES_SUBCATEGORIES = [
  { label: 'Home Services',            emoji: '🏠' },
  { label: 'Cleaning Services',        emoji: '🧹' },
  { label: 'Tutoring & Lessons',       emoji: '📚' },
  { label: 'Event Planning',           emoji: '🎉' },
  { label: 'Photography & Videography', emoji: '📸' },
  { label: 'Legal Services',           emoji: '⚖️' },
  { label: 'IT & Tech Support',        emoji: '💻' },
  { label: 'Logistics & Delivery',     emoji: '🚚' },
  { label: 'Catering & Food',          emoji: '🍳' },
]

const REPAIR_SUBCATEGORIES = [
  { label: 'Building Materials',       emoji: '🧱' },
  { label: 'Plumbing',                 emoji: '🚰' },
  { label: 'Electrical Work',          emoji: '⚡' },
  { label: 'Painting & Decorating',    emoji: '🖨️' },
  { label: 'Carpentry & Woodwork',     emoji: '🔨' },
  { label: 'HVAC & Air Conditioning',  emoji: '❄️' },
  { label: 'Roofing',                  emoji: '🏠' },
  { label: 'Tiling & Flooring',        emoji: '🖲️' },
]

const BABIES_SUBCATEGORIES = [
  { label: 'Baby Clothing',            emoji: '👶' },
  { label: 'Toys & Games',             emoji: '🏒' },
  { label: 'Baby Gear & Strollers',    emoji: '👩' },
  { label: 'Baby Feeding',             emoji: '🍼' },
  { label: "Kids' Furniture",          emoji: '🛍️' },
  { label: 'Baby Safety',              emoji: '🛡️' },
  { label: 'School Supplies',          emoji: '📚' },
]

const AGRICULTURE_SUBCATEGORIES = [
  { label: 'Farm Equipment',           emoji: '🚜' },
  { label: 'Seeds & Seedlings',        emoji: '🌱' },
  { label: 'Fertilizers & Pesticides', emoji: '🧪' },
  { label: 'Livestock & Poultry',      emoji: '🐄' },
  { label: 'Farm Produce',             emoji: '🌽' },
  { label: 'Irrigation Equipment',     emoji: '💧' },
  { label: 'Agricultural Services',    emoji: '🌾' },
]

const ANIMALS_SUBCATEGORIES = [
  { label: 'Dogs',                     emoji: '🐶' },
  { label: 'Cats',                     emoji: '🐱' },
  { label: 'Birds',                    emoji: '🐦' },
  { label: 'Fish & Aquarium',          emoji: '🐟' },
  { label: 'Reptiles',                 emoji: '🦎' },
  { label: 'Pet Food & Supplies',      emoji: '🥫' },
  { label: 'Veterinary Services',      emoji: '🐾' },
]

const JOBS_SUBCATEGORIES = [
  { label: 'Accounting & Finance',     emoji: '💰' },
  { label: 'Admin & Office',           emoji: '🗂️' },
  { label: 'Engineering',              emoji: '⚙️' },
  { label: 'Healthcare',               emoji: '🏥' },
  { label: 'IT & Software',            emoji: '💻' },
  { label: 'Sales & Marketing',        emoji: '📈' },
  { label: 'Teaching & Education',     emoji: '🊷' },
  { label: 'Driving & Logistics',      emoji: '🚚' },
  { label: 'Construction & Skilled Trades', emoji: '🔨' },
]


export default function Home(){
  const { user, loading, setIsAuthOpen } = useAuth();
  const [isOpen, setIsOpen]                     = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(locations[0].name)
  const [searchQuery, setSearchQuery]           = useState('')

  /* ── single-select category & subcategory ── */
  const [activeCategory, setActiveCategory]       = useState('All')    // one string
  const [activeSubcategory, setActiveSubcategory] = useState('')       // one string, '' = none
  const [vehicleMenuOpen,   setVehicleMenuOpen]   = useState(false)
  const [elecMenuOpen,      setElecMenuOpen]      = useState(false)
  const [phonesMenuOpen,    setPhonesMenuOpen]    = useState(false)
  const [propertyMenuOpen,  setPropertyMenuOpen]  = useState(false)
  const [fashionMenuOpen,   setFashionMenuOpen]   = useState(false)
  const [beautyMenuOpen,    setBeautyMenuOpen]    = useState(false)
  const [gamingMenuOpen,    setGamingMenuOpen]    = useState(false)
  const [camerasMenuOpen,   setCamerasMenuOpen]   = useState(false)
  const [audioMenuOpen,     setAudioMenuOpen]     = useState(false)
  const [furnitureMenuOpen, setFurnitureMenuOpen] = useState(false)
  const [servicesMenuOpen,  setServicesMenuOpen]  = useState(false)
  const [repairMenuOpen,    setRepairMenuOpen]    = useState(false)
  const [babiesMenuOpen,    setBabiesMenuOpen]    = useState(false)
  const [agricMenuOpen,     setAgricMenuOpen]     = useState(false)
  const [animalsMenuOpen,   setAnimalsMenuOpen]   = useState(false)
  const [jobsMenuOpen,      setJobsMenuOpen]      = useState(false)
  const [allProducts, setAllProducts] = useState(products);
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    const reloadListings = () => {
      try {
        const publicListings = getAllPublicListings(user);
        const defaultPlaceholder = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
        const cleanedListings = publicListings.map(item => {
          let img = item.image;
          if (!img || img.startsWith('blob:')) {
            img = defaultPlaceholder;
          }
          let imgs = Array.isArray(item.images) ? item.images.map(u => (!u || u.startsWith('blob:')) ? defaultPlaceholder : u) : [img];
          return { ...item, image: img, images: imgs };
        });

        const combined = [...cleanedListings];
        products.forEach(p => {
          if (!combined.some(existing => existing.id === p.id)) {
            combined.push(p);
          }
        });
        setAllProducts(combined);
      } catch (e) {
        console.error(e);
      }
    };

    const reloadSaved = () => {
      const saved = getSavedItemsForUser(user);
      setSavedItems(saved);
    };

    reloadListings();
    reloadSaved();

    window.addEventListener('buyoh_listings_updated', reloadListings);
    window.addEventListener('buyoh_saved_updated', reloadSaved);
    window.addEventListener('storage', reloadListings);
    window.addEventListener('storage', reloadSaved);
    return () => {
      window.removeEventListener('buyoh_listings_updated', reloadListings);
      window.removeEventListener('buyoh_saved_updated', reloadSaved);
      window.removeEventListener('storage', reloadListings);
      window.removeEventListener('storage', reloadSaved);
    };
  }, [user]);

  const toggleSaveProduct = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const existing = getSavedItemsForUser(user);
      const isSaved = existing.some(item => (typeof item === 'object' ? item.id : item) === product.id);
      let updated;
      if (isSaved) {
        updated = existing.filter(item => (typeof item === 'object' ? item.id : item) !== product.id);
      } else {
        updated = [product, ...existing.filter(item => typeof item === 'object')];
      }
      setSavedItems(updated);
      await saveItemsForUser(user, updated);
    } catch (err) {
      console.error(err);
    }
  };



  const containerRef    = useRef(null)
  const vehicleMenuRef  = useRef(null); const vehicleBtnRef   = useRef(null)
  const elecMenuRef     = useRef(null); const elecBtnRef      = useRef(null)
  const phonesMenuRef   = useRef(null); const phonesBtnRef    = useRef(null)
  const propertyMenuRef = useRef(null); const propertyBtnRef  = useRef(null)
  const fashionMenuRef  = useRef(null); const fashionBtnRef   = useRef(null)
  const beautyMenuRef   = useRef(null); const beautyBtnRef    = useRef(null)
  const gamingMenuRef   = useRef(null); const gamingBtnRef    = useRef(null)
  const camerasMenuRef  = useRef(null); const camerasBtnRef   = useRef(null)
  const audioMenuRef    = useRef(null); const audioBtnRef     = useRef(null)
  const furnitureMenuRef= useRef(null); const furnitureBtnRef = useRef(null)
  const servicesMenuRef = useRef(null); const servicesBtnRef  = useRef(null)
  const repairMenuRef   = useRef(null); const repairBtnRef    = useRef(null)
  const babiesMenuRef   = useRef(null); const babiesBtnRef    = useRef(null)
  const agricMenuRef    = useRef(null); const agricBtnRef     = useRef(null)
  const animalsMenuRef  = useRef(null); const animalsBtnRef   = useRef(null)
  const jobsMenuRef     = useRef(null); const jobsBtnRef      = useRef(null)
  const [vehiclePopupPos,   setVehiclePopupPos]   = useState({ top: 0 })
  const [elecPopupPos,      setElecPopupPos]      = useState({ top: 0 })
  const [phonesPopupPos,    setPhonesPopupPos]    = useState({ top: 0 })
  const [propertyPopupPos,  setPropertyPopupPos]  = useState({ top: 0 })
  const [fashionPopupPos,   setFashionPopupPos]   = useState({ top: 0 })
  const [beautyPopupPos,    setBeautyPopupPos]    = useState({ top: 0 })
  const [gamingPopupPos,    setGamingPopupPos]    = useState({ top: 0 })
  const [camerasPopupPos,   setCamerasPopupPos]   = useState({ top: 0 })
  const [audioPopupPos,     setAudioPopupPos]     = useState({ top: 0 })
  const [furniturePopupPos, setFurniturePopupPos] = useState({ top: 0 })
  const [servicesPopupPos,  setServicesPopupPos]  = useState({ top: 0 })
  const [repairPopupPos,    setRepairPopupPos]    = useState({ top: 0 })
  const [babiesPopupPos,    setBabiesPopupPos]    = useState({ top: 0 })
  const [agricPopupPos,     setAgricPopupPos]     = useState({ top: 0 })
  const [animalsPopupPos,   setAnimalsPopupPos]   = useState({ top: 0 })
  const [jobsPopupPos,      setJobsPopupPos]      = useState({ top: 0 })

  /* ── position fixed popups right below their pill ── */
  useLayoutEffect(()=>{
    if(vehicleMenuOpen && vehicleBtnRef.current){
      const r = vehicleBtnRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - r.bottom
      const spaceAbove = r.top
      const minRequiredSpace = 300
      // Position below if there's enough space, position above if enough space above, otherwise default to below
      const positionBelow = spaceBelow >= minRequiredSpace || spaceAbove < minRequiredSpace
      setVehiclePopupPos({ top: positionBelow ? r.bottom + 8 : r.top - 8, positionBelow })
    }
  },[vehicleMenuOpen])
  useLayoutEffect(()=>{
    if(elecMenuOpen && elecBtnRef.current){
      const r = elecBtnRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - r.bottom
      const spaceAbove = r.top
      const minRequiredSpace = 300
      const positionBelow = spaceBelow >= minRequiredSpace || spaceAbove < minRequiredSpace
      setElecPopupPos({ top: positionBelow ? r.bottom + 8 : r.top - 8, positionBelow })
    }
  },[elecMenuOpen])
  useLayoutEffect(()=>{
    if(phonesMenuOpen && phonesBtnRef.current){
      const r = phonesBtnRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - r.bottom
      const spaceAbove = r.top
      const minRequiredSpace = 300
      const positionBelow = spaceBelow >= minRequiredSpace || spaceAbove < minRequiredSpace
      setPhonesPopupPos({ top: positionBelow ? r.bottom + 8 : r.top - 8, positionBelow })
    }
  },[phonesMenuOpen])
  useLayoutEffect(()=>{
    if(propertyMenuOpen && propertyBtnRef.current){
      const r = propertyBtnRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - r.bottom
      const spaceAbove = r.top
      const minRequiredSpace = 300
      const positionBelow = spaceBelow >= minRequiredSpace || spaceAbove < minRequiredSpace
      setPropertyPopupPos({ top: positionBelow ? r.bottom + 8 : r.top - 8, positionBelow })
    }
  },[propertyMenuOpen])
  useLayoutEffect(()=>{
    if(fashionMenuOpen && fashionBtnRef.current){
      const r = fashionBtnRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - r.bottom
      const spaceAbove = r.top
      const minRequiredSpace = 300
      const positionBelow = spaceBelow >= minRequiredSpace || spaceAbove < minRequiredSpace
      setFashionPopupPos({ top: positionBelow ? r.bottom + 8 : r.top - 8, positionBelow })
    }
  },[fashionMenuOpen])
  useLayoutEffect(()=>{ if(beautyMenuOpen && beautyBtnRef.current){ const r=beautyBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setBeautyPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[beautyMenuOpen])
  useLayoutEffect(()=>{ if(gamingMenuOpen && gamingBtnRef.current){ const r=gamingBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setGamingPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[gamingMenuOpen])
  useLayoutEffect(()=>{ if(camerasMenuOpen && camerasBtnRef.current){ const r=camerasBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setCamerasPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[camerasMenuOpen])
  useLayoutEffect(()=>{ if(audioMenuOpen && audioBtnRef.current){ const r=audioBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setAudioPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[audioMenuOpen])
  useLayoutEffect(()=>{ if(furnitureMenuOpen && furnitureBtnRef.current){ const r=furnitureBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setFurniturePopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[furnitureMenuOpen])
  useLayoutEffect(()=>{ if(servicesMenuOpen && servicesBtnRef.current){ const r=servicesBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setServicesPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[servicesMenuOpen])
  useLayoutEffect(()=>{ if(repairMenuOpen && repairBtnRef.current){ const r=repairBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setRepairPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[repairMenuOpen])
  useLayoutEffect(()=>{ if(babiesMenuOpen && babiesBtnRef.current){ const r=babiesBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setBabiesPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[babiesMenuOpen])
  useLayoutEffect(()=>{ if(agricMenuOpen && agricBtnRef.current){ const r=agricBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setAgricPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[agricMenuOpen])
  useLayoutEffect(()=>{ if(animalsMenuOpen && animalsBtnRef.current){ const r=animalsBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setAnimalsPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[animalsMenuOpen])
  useLayoutEffect(()=>{ if(jobsMenuOpen && jobsBtnRef.current){ const r=jobsBtnRef.current.getBoundingClientRect(); const viewportHeight=window.innerHeight; const spaceBelow=viewportHeight-r.bottom; const spaceAbove=r.top; const minRequiredSpace=300; const positionBelow=spaceBelow>=minRequiredSpace||spaceAbove<minRequiredSpace; setJobsPopupPos({top:positionBelow?r.bottom+8:r.top-8,positionBelow}) } },[jobsMenuOpen])

  /* ── close dropdowns on outside click ── */
  useEffect(()=>{
    function handleClickOutside(e){
      if(containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false)
      if(vehicleMenuRef.current && !vehicleMenuRef.current.contains(e.target))
        setVehicleMenuOpen(false)
      if(elecMenuRef.current && !elecMenuRef.current.contains(e.target))
        setElecMenuOpen(false)
      if(phonesMenuRef.current && !phonesMenuRef.current.contains(e.target))
        setPhonesMenuOpen(false)
      if(propertyMenuRef.current && !propertyMenuRef.current.contains(e.target))
        setPropertyMenuOpen(false)
      if(fashionMenuRef.current && !fashionMenuRef.current.contains(e.target))
        setFashionMenuOpen(false)
      if(beautyMenuRef.current && !beautyMenuRef.current.contains(e.target)) setBeautyMenuOpen(false)
      if(gamingMenuRef.current && !gamingMenuRef.current.contains(e.target)) setGamingMenuOpen(false)
      if(camerasMenuRef.current && !camerasMenuRef.current.contains(e.target)) setCamerasMenuOpen(false)
      if(audioMenuRef.current && !audioMenuRef.current.contains(e.target)) setAudioMenuOpen(false)
      if(furnitureMenuRef.current && !furnitureMenuRef.current.contains(e.target)) setFurnitureMenuOpen(false)
      if(servicesMenuRef.current && !servicesMenuRef.current.contains(e.target)) setServicesMenuOpen(false)
      if(repairMenuRef.current && !repairMenuRef.current.contains(e.target)) setRepairMenuOpen(false)
      if(babiesMenuRef.current && !babiesMenuRef.current.contains(e.target)) setBabiesMenuOpen(false)
      if(agricMenuRef.current && !agricMenuRef.current.contains(e.target)) setAgricMenuOpen(false)
      if(animalsMenuRef.current && !animalsMenuRef.current.contains(e.target)) setAnimalsMenuOpen(false)
      if(jobsMenuRef.current && !jobsMenuRef.current.contains(e.target)) setJobsMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return ()=> document.removeEventListener('mousedown', handleClickOutside)
  },[])

  /* ── select a top-level category ── */
  const closeAllMenus = () => {
    setVehicleMenuOpen(false); setElecMenuOpen(false); setPhonesMenuOpen(false)
    setPropertyMenuOpen(false); setFashionMenuOpen(false); setBeautyMenuOpen(false)
    setGamingMenuOpen(false); setCamerasMenuOpen(false); setAudioMenuOpen(false)
    setFurnitureMenuOpen(false); setServicesMenuOpen(false); setRepairMenuOpen(false)
    setBabiesMenuOpen(false); setAgricMenuOpen(false); setAnimalsMenuOpen(false); setJobsMenuOpen(false)
  }
  const selectCategory = (label) => {
    const menuCats = ['Vehicles','Electronics','Phones & Tablets','Property','Fashion','Beauty & Personal Care']
    if(label === activeCategory && !menuCats.includes(label)){
      setActiveCategory('All'); setActiveSubcategory(''); closeAllMenus(); return
    }
    if(label === 'Vehicles'){
      setActiveCategory('Vehicles'); setActiveSubcategory('')
      setVehicleMenuOpen(p=>!p); setElecMenuOpen(false); setPhonesMenuOpen(false)
      setPropertyMenuOpen(false); setFashionMenuOpen(false); setBeautyMenuOpen(false); return
    }
    if(label === 'Electronics'){
      setActiveCategory('Electronics'); setActiveSubcategory('')
      setElecMenuOpen(p=>!p); setVehicleMenuOpen(false); setPhonesMenuOpen(false)
      setPropertyMenuOpen(false); setFashionMenuOpen(false); setBeautyMenuOpen(false); return
    }
    if(label === 'Phones & Tablets'){
      setActiveCategory('Phones & Tablets'); setActiveSubcategory('')
      setPhonesMenuOpen(p=>!p); setVehicleMenuOpen(false); setElecMenuOpen(false)
      setPropertyMenuOpen(false); setFashionMenuOpen(false); setBeautyMenuOpen(false); return
    }
    if(label === 'Property'){
      setActiveCategory('Property'); setActiveSubcategory('')
      setPropertyMenuOpen(p=>!p); setVehicleMenuOpen(false); setElecMenuOpen(false)
      setPhonesMenuOpen(false); setFashionMenuOpen(false); setBeautyMenuOpen(false); return
    }
    if(label === 'Fashion'){
      setActiveCategory('Fashion'); setActiveSubcategory('')
      setFashionMenuOpen(p=>!p); setVehicleMenuOpen(false); setElecMenuOpen(false)
      setPhonesMenuOpen(false); setPropertyMenuOpen(false); setBeautyMenuOpen(false); return
    }
    if(label === 'Beauty & Personal Care'){
      setActiveCategory('Beauty & Personal Care'); setActiveSubcategory('')
      setBeautyMenuOpen(p=>!p); closeAllMenus(); setBeautyMenuOpen(p=>!p); return
    }
    if(label === 'Gaming'){      setActiveCategory('Gaming');               setActiveSubcategory(''); closeAllMenus(); setGamingMenuOpen(p=>!p);    return }
    if(label === 'Cameras'){     setActiveCategory('Cameras');              setActiveSubcategory(''); closeAllMenus(); setCamerasMenuOpen(p=>!p);   return }
    if(label === 'Audio'){       setActiveCategory('Audio');                setActiveSubcategory(''); closeAllMenus(); setAudioMenuOpen(p=>!p);     return }
    if(label === 'Furniture'){   setActiveCategory('Furniture');            setActiveSubcategory(''); closeAllMenus(); setFurnitureMenuOpen(p=>!p); return }
    if(label === 'Services'){    setActiveCategory('Services');             setActiveSubcategory(''); closeAllMenus(); setServicesMenuOpen(p=>!p);  return }
    if(label === 'Repair & Construction'){ setActiveCategory('Repair & Construction'); setActiveSubcategory(''); closeAllMenus(); setRepairMenuOpen(p=>!p);   return }
    if(label === 'Babies & Kids'){         setActiveCategory('Babies & Kids');          setActiveSubcategory(''); closeAllMenus(); setBabiesMenuOpen(p=>!p);   return }
    if(label === 'Agriculture'){           setActiveCategory('Agriculture');             setActiveSubcategory(''); closeAllMenus(); setAgricMenuOpen(p=>!p);    return }
    if(label === 'Animals'){               setActiveCategory('Animals');                 setActiveSubcategory(''); closeAllMenus(); setAnimalsMenuOpen(p=>!p);  return }
    if(label === 'Jobs'){                  setActiveCategory('Jobs');                    setActiveSubcategory(''); closeAllMenus(); setJobsMenuOpen(p=>!p);     return }
    setActiveCategory(label); setActiveSubcategory(''); closeAllMenus()
  }

  /* ── select a vehicle subcategory (single pick) ── */
  const selectSubcategory = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub)
    setActiveCategory('Vehicles')
  }

  /* ── select an electronics subcategory (single pick) ── */
  const selectElecSubcategory = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub)
    setActiveCategory('Electronics')
  }

  /* ── select a phones & tablets subcategory (single pick) ── */
  const selectPhonesSubcategory = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub)
    setActiveCategory('Phones & Tablets')
  }

  /* ── select a property subcategory ── */
  const selectPropertySubcategory = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub)
    setActiveCategory('Property')
  }

  /* ── select a fashion subcategory ── */
  const selectFashionSubcategory = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub)
    setActiveCategory('Fashion')
  }

  /* ── select a beauty subcategory ── */
  const selectBeautySubcategory = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub)
    setActiveCategory('Beauty & Personal Care')
  }
  const selectSub = (cat, sub) => { setActiveSubcategory(p=>p===sub?'':sub); setActiveCategory(cat) }

  /* ── filter products ── */
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLocation =
        selectedLocation === locations[0].name ||
        product.location === selectedLocation ||
        (product.location && selectedLocation && product.location.toLowerCase().includes(selectedLocation.toLowerCase().replace('state', '').trim()));

      let matchesCategory;
      if (activeCategory === 'All') {
        matchesCategory = true;
      } else {
        matchesCategory =
          product.category === activeCategory &&
          (activeSubcategory === '' || product.subcategory === activeSubcategory);
      }

      const matchesPrice =
        (minPrice === '' || product.price >= Number(minPrice)) &&
        (maxPrice === '' || product.price <= Number(maxPrice));

      return matchesSearch && matchesLocation && matchesCategory && matchesPrice;
    });
  }, [allProducts, searchQuery, selectedLocation, activeCategory, activeSubcategory, minPrice, maxPrice]);

  const formatPrice = (price) => '₦' + price.toLocaleString('en-NG')

  const clearAllFilters = () => {
    setSearchQuery('')
    setActiveCategory('All')
    setActiveSubcategory('')
    setSelectedLocation(locations[0].name)
    setMinPrice('')
    setMaxPrice('')
    closeAllMenus()
  }

  const hasActiveFilters =
    searchQuery ||
    activeCategory !== 'All' ||
    selectedLocation !== locations[0].name ||
    minPrice !== '' ||
    maxPrice !== ''

  const sectionTitle = () => {
    if(searchQuery)          return `Results for "${searchQuery}"`
    if(activeSubcategory)    return activeSubcategory
    if(activeCategory !== 'All') return activeCategory
    return 'Featured Listings'
  }

  return(
    <>
    {/* ── Sticky Desktop Navbar ── */}
    <header className="home-nav-row">
      <a href="/" className="home-nav-brand">
        <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
      </a>
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
            <NavLink to="/sell" replace className={({isActive})=>isActive?"home-nav-item home-nav-item-active":"home-nav-item"}>
              {({isActive})=>(<button className="home-sell-btn">
                <p style={{color: isActive ? "#1d4ed8" : "#e67600"}} className="home-sell-btn-text">+ Sell</p>
              </button>)}
            </NavLink>
          </>
        ) : loading ? null : (
          <button className="nav-login-btn" onClick={() => setIsAuthOpen(true)}>
            Sign In / Register
          </button>
        )}
      </div>
    </header>

    {/* ── Hero Header ── */}
    <section className="home-header">
      <p className="home-header-text">Wetin you dey find?</p>
      <div ref={containerRef} className="search-area">

        {/* Location picker */}
        <button className="location-button" onClick={()=>setIsOpen(p=>!p)}>
          <span className="location-text">{selectedLocation}</span>
          <ChevronDown className={isOpen ? 'location-icon-rotated' : 'location-icon'}/>
        </button>

        {isOpen && (
          <div className="location-header-options">
            <div className="location-top">
              <div className="location-top-left">
                <p className="location-options-header">{selectedLocation}</p>
              </div>
              <div className="location-top-right">
                <Search className="location-search-icon"/>
                <input className="location-search-input"/>
              </div>
            </div>
            <div className="location-options">
              {locations.map(loc=>(
                <div className="location-option" key={loc.name} onClick={()=>{
                  setSelectedLocation(loc.name)
                  setIsOpen(false)
                }}>
                  <p className="location-option-text">{loc.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search input */}
        <div className="search-right">
          <input
            type="text"
            placeholder="I dey find...."
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-icon-btn">
            <Search className="search-icon"/>
          </div>
        </div>
      </div>

      {!user && (
        <div className="hero-auth-prompt-bar">
          <span className="prompt-text">Sign in to start negotiations, make offers, and chat with verified sellers!</span>
          <button className="prompt-action-btn" onClick={() => setIsAuthOpen(true)}>
            Get Started
          </button>
        </div>
      )}
    </section>

    {/* ── Products Section ── */}
    <section className="products-section">

      {/* ── Category pills ── */}
      <div className="categories-bar">
        {CATEGORIES.map(cat=>(
          <div
            key={cat.label}
            className="cat-pill-wrap"
            ref={
              cat.label === 'Vehicles'              ? vehicleMenuRef  :
              cat.label === 'Electronics'           ? elecMenuRef     :
              cat.label === 'Phones & Tablets'      ? phonesMenuRef   :
              cat.label === 'Property'              ? propertyMenuRef :
              cat.label === 'Fashion'               ? fashionMenuRef  :
              cat.label === 'Beauty & Personal Care'? beautyMenuRef   :
              cat.label === 'Gaming'                ? gamingMenuRef   :
              cat.label === 'Cameras'               ? camerasMenuRef  :
              cat.label === 'Audio'                 ? audioMenuRef    :
              cat.label === 'Furniture'             ? furnitureMenuRef:
              cat.label === 'Services'              ? servicesMenuRef :
              cat.label === 'Repair & Construction' ? repairMenuRef   :
              cat.label === 'Babies & Kids'         ? babiesMenuRef   :
              cat.label === 'Agriculture'           ? agricMenuRef    :
              cat.label === 'Animals'               ? animalsMenuRef  :
              cat.label === 'Jobs'                  ? jobsMenuRef     : null
            }
          >
            <button
              ref={
                cat.label === 'Vehicles'              ? vehicleBtnRef  :
                cat.label === 'Electronics'           ? elecBtnRef     :
                cat.label === 'Phones & Tablets'      ? phonesBtnRef   :
                cat.label === 'Property'              ? propertyBtnRef :
                cat.label === 'Fashion'               ? fashionBtnRef  :
                cat.label === 'Beauty & Personal Care'? beautyBtnRef   :
                cat.label === 'Gaming'                ? gamingBtnRef   :
                cat.label === 'Cameras'               ? camerasBtnRef  :
                cat.label === 'Audio'                 ? audioBtnRef    :
                cat.label === 'Furniture'             ? furnitureBtnRef:
                cat.label === 'Services'              ? servicesBtnRef :
                cat.label === 'Repair & Construction' ? repairBtnRef   :
                cat.label === 'Babies & Kids'         ? babiesBtnRef   :
                cat.label === 'Agriculture'           ? agricBtnRef    :
                cat.label === 'Animals'               ? animalsBtnRef  :
                cat.label === 'Jobs'                  ? jobsBtnRef     : null
              }
              id={`cat-${cat.label.toLowerCase().replace(/[^a-z0-9]/g,'-')}`}
              className={[
                'category-pill',
                activeCategory === cat.label ? 'category-pill-active' : '',
                cat.hasSubmenu && (
                  (cat.label==='Vehicles' && vehicleMenuOpen)||(cat.label==='Electronics' && elecMenuOpen)||
                  (cat.label==='Phones & Tablets' && phonesMenuOpen)||(cat.label==='Property' && propertyMenuOpen)||
                  (cat.label==='Fashion' && fashionMenuOpen)||(cat.label==='Beauty & Personal Care' && beautyMenuOpen)||
                  (cat.label==='Gaming' && gamingMenuOpen)||(cat.label==='Cameras' && camerasMenuOpen)||
                  (cat.label==='Audio' && audioMenuOpen)||(cat.label==='Furniture' && furnitureMenuOpen)||
                  (cat.label==='Services' && servicesMenuOpen)||(cat.label==='Repair & Construction' && repairMenuOpen)||
                  (cat.label==='Babies & Kids' && babiesMenuOpen)||(cat.label==='Agriculture' && agricMenuOpen)||
                  (cat.label==='Animals' && animalsMenuOpen)||(cat.label==='Jobs' && jobsMenuOpen)
                ) ? 'category-pill-open' : '',
              ].join(' ')}
              onClick={()=>selectCategory(cat.label)}
              title={cat.label}
            >
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-label">{cat.label}</span>
              {cat.hasSubmenu && (
                <ChevronDown
                  className={`cat-chevron ${
                    (cat.label==='Vehicles' && vehicleMenuOpen)||(cat.label==='Electronics' && elecMenuOpen)||
                    (cat.label==='Phones & Tablets' && phonesMenuOpen)||(cat.label==='Property' && propertyMenuOpen)||
                    (cat.label==='Fashion' && fashionMenuOpen)||(cat.label==='Beauty & Personal Care' && beautyMenuOpen)||
                    (cat.label==='Gaming' && gamingMenuOpen)||(cat.label==='Cameras' && camerasMenuOpen)||
                    (cat.label==='Audio' && audioMenuOpen)||(cat.label==='Furniture' && furnitureMenuOpen)||
                    (cat.label==='Services' && servicesMenuOpen)||(cat.label==='Repair & Construction' && repairMenuOpen)||
                    (cat.label==='Babies & Kids' && babiesMenuOpen)||(cat.label==='Agriculture' && agricMenuOpen)||
                    (cat.label==='Animals' && animalsMenuOpen)||(cat.label==='Jobs' && jobsMenuOpen)
                      ? 'cat-chevron-open' : ''
                  }`}
                  size={13}
                />
              )}
            </button>

            {/* Vehicle subcategory popup */}
            {cat.label === 'Vehicles' && (
              <>
                <div
                  className={`vehicle-submenu-backdrop ${vehicleMenuOpen ? 'active' : ''}`}
                  onClick={()=>setVehicleMenuOpen(false)}
                />
                <div
                  className={`vehicle-submenu ${vehicleMenuOpen ? 'vehicle-submenu-open' : ''} ${!vehiclePopupPos.positionBelow ? 'position-above' : ''}`}
                  style={{ top: vehiclePopupPos.top }}
                >
                  <p className="vehicle-submenu-title">Choose a type</p>
                  <div className="vehicle-submenu-grid">
                    {VEHICLE_SUBCATEGORIES.map(sub=>(
                      <button
                        key={sub.label}
                        className={`vehicle-sub-item ${activeSubcategory === sub.label ? 'vehicle-sub-active' : ''}`}
                        onClick={()=>{
                          selectSubcategory(sub.label)
                          setVehicleMenuOpen(false)
                        }}
                      >
                        <span className="sub-emoji">{sub.emoji}</span>
                        <span className="sub-label">{sub.label}</span>
                        {activeSubcategory === sub.label && (
                          <span className="sub-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    className="sub-all-vehicles"
                    onClick={()=>{
                      setActiveSubcategory('')
                      setActiveCategory('Vehicles')
                      setVehicleMenuOpen(false)
                    }}
                  >
                    Show all Vehicles
                  </button>
                </div>
              </>
            )}

            {/* Electronics subcategory popup */}
            {cat.label === 'Electronics' && (
              <>
                <div
                  className={`vehicle-submenu-backdrop ${elecMenuOpen ? 'active' : ''}`}
                  onClick={()=>setElecMenuOpen(false)}
                />
                <div
                  className={`vehicle-submenu ${elecMenuOpen ? 'vehicle-submenu-open' : ''} ${!elecPopupPos.positionBelow ? 'position-above' : ''}`}
                  style={{ top: elecPopupPos.top }}
                >
                  <p className="vehicle-submenu-title">Choose a type</p>
                  <div className="vehicle-submenu-grid">
                    {ELECTRONICS_SUBCATEGORIES.map(sub=>(
                      <button
                        key={sub.label}
                        className={`vehicle-sub-item ${activeSubcategory === sub.label ? 'vehicle-sub-active' : ''}`}
                        onClick={()=>{
                          selectElecSubcategory(sub.label)
                          setElecMenuOpen(false)
                        }}
                      >
                        <span className="sub-emoji">{sub.emoji}</span>
                        <span className="sub-label">{sub.label}</span>
                        {activeSubcategory === sub.label && (
                          <span className="sub-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    className="sub-all-vehicles"
                    onClick={()=>{
                      setActiveSubcategory('')
                      setActiveCategory('Electronics')
                      setElecMenuOpen(false)
                    }}
                  >
                    Show all Electronics
                  </button>
                </div>
              </>
            )}

            {/* Phones & Tablets subcategory popup */}
            {cat.label === 'Phones & Tablets' && (
              <>
                <div
                  className={`vehicle-submenu-backdrop ${phonesMenuOpen ? 'active' : ''}`}
                  onClick={()=>setPhonesMenuOpen(false)}
                />
                <div
                  className={`vehicle-submenu ${phonesMenuOpen ? 'vehicle-submenu-open' : ''} ${!phonesPopupPos.positionBelow ? 'position-above' : ''}`}
                  style={{ top: phonesPopupPos.top }}
                >
                  <p className="vehicle-submenu-title">Choose a type</p>
                  <div className="vehicle-submenu-grid">
                    {PHONES_SUBCATEGORIES.map(sub=>(
                      <button
                        key={sub.label}
                        className={`vehicle-sub-item ${activeSubcategory === sub.label ? 'vehicle-sub-active' : ''}`}
                        onClick={()=>{
                          selectPhonesSubcategory(sub.label)
                          setPhonesMenuOpen(false)
                        }}
                      >
                        <span className="sub-emoji">{sub.emoji}</span>
                        <span className="sub-label">{sub.label}</span>
                        {activeSubcategory === sub.label && (
                          <span className="sub-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    className="sub-all-vehicles"
                    onClick={()=>{
                      setActiveSubcategory('')
                      setActiveCategory('Phones & Tablets')
                      setPhonesMenuOpen(false)
                    }}
                  >
                    Show all Phones & Tablets
                  </button>
                </div>
              </>
            )}

            {/* Property subcategory popup */}
            {cat.label === 'Property' && (
              <>
                <div className={`vehicle-submenu-backdrop ${propertyMenuOpen?'active':''}`} onClick={()=>setPropertyMenuOpen(false)}/>
                <div className={`vehicle-submenu ${propertyMenuOpen?'vehicle-submenu-open':''} ${!propertyPopupPos.positionBelow?'position-above':''}`} style={{top:propertyPopupPos.top}}>
                  <p className="vehicle-submenu-title">Choose a type</p>
                  <div className="vehicle-submenu-grid">
                    {PROPERTY_SUBCATEGORIES.map(sub=>(
                      <button key={sub.label}
                        className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`}
                        onClick={()=>{selectPropertySubcategory(sub.label);setPropertyMenuOpen(false)}}>
                        <span className="sub-emoji">{sub.emoji}</span>
                        <span className="sub-label">{sub.label}</span>
                        {activeSubcategory===sub.label&&<span className="sub-check">✓</span>}
                      </button>
                    ))}
                  </div>
                  <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Property');setPropertyMenuOpen(false)}}>
                    Show all Property
                  </button>
                </div>
              </>
            )}

            {/* Fashion subcategory popup */}
            {cat.label === 'Fashion' && (
              <>
                <div className={`vehicle-submenu-backdrop ${fashionMenuOpen?'active':''}`} onClick={()=>setFashionMenuOpen(false)}/>
                <div className={`vehicle-submenu ${fashionMenuOpen?'vehicle-submenu-open':''} ${!fashionPopupPos.positionBelow?'position-above':''}`} style={{top:fashionPopupPos.top}}>
                  <p className="vehicle-submenu-title">Choose a type</p>
                  <div className="vehicle-submenu-grid">
                    {FASHION_SUBCATEGORIES.map(sub=>(
                      <button key={sub.label}
                        className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`}
                        onClick={()=>{selectFashionSubcategory(sub.label);setFashionMenuOpen(false)}}>
                        <span className="sub-emoji">{sub.emoji}</span>
                        <span className="sub-label">{sub.label}</span>
                        {activeSubcategory===sub.label&&<span className="sub-check">✓</span>}
                      </button>
                    ))}
                  </div>
                  <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Fashion');setFashionMenuOpen(false)}}>
                    Show all Fashion
                  </button>
                </div>
              </>
            )}

            {/* Beauty & Personal Care subcategory popup */}
            {cat.label === 'Beauty & Personal Care' && (
              <>
                <div className={`vehicle-submenu-backdrop ${beautyMenuOpen?'active':''}`} onClick={()=>setBeautyMenuOpen(false)}/>
                <div className={`vehicle-submenu ${beautyMenuOpen?'vehicle-submenu-open':''} ${!beautyPopupPos.positionBelow?'position-above':''}`} style={{top:beautyPopupPos.top}}>
                  <p className="vehicle-submenu-title">Choose a type</p>
                  <div className="vehicle-submenu-grid">
                    {BEAUTY_SUBCATEGORIES.map(sub=>(
                      <button key={sub.label}
                        className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`}
                        onClick={()=>{selectBeautySubcategory(sub.label);setBeautyMenuOpen(false)}}>
                        <span className="sub-emoji">{sub.emoji}</span>
                        <span className="sub-label">{sub.label}</span>
                        {activeSubcategory===sub.label&&<span className="sub-check">✓</span>}
                      </button>
                    ))}
                  </div>
                  <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Beauty & Personal Care');setBeautyMenuOpen(false)}}>
                    Show all Beauty & Personal Care
                  </button>
                </div>
              </>
            )}

            {/* Gaming */}
            {cat.label==='Gaming' && (
              <><div className={`vehicle-submenu-backdrop ${gamingMenuOpen?'active':''}`} onClick={()=>setGamingMenuOpen(false)}/>
              <div className={`vehicle-submenu ${gamingMenuOpen?'vehicle-submenu-open':''} ${!gamingPopupPos.positionBelow?'position-above':''}`} style={{top:gamingPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {GAMING_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Gaming',sub.label);setGamingMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Gaming');setGamingMenuOpen(false)}}>Show all Gaming</button>
              </div></>
            )}

            {/* Cameras */}
            {cat.label==='Cameras' && (
              <><div className={`vehicle-submenu-backdrop ${camerasMenuOpen?'active':''}`} onClick={()=>setCamerasMenuOpen(false)}/>
              <div className={`vehicle-submenu ${camerasMenuOpen?'vehicle-submenu-open':''} ${!camerasPopupPos.positionBelow?'position-above':''}`} style={{top:camerasPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {CAMERAS_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Cameras',sub.label);setCamerasMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Cameras');setCamerasMenuOpen(false)}}>Show all Cameras</button>
              </div></>
            )}

            {/* Audio */}
            {cat.label==='Audio' && (
              <><div className={`vehicle-submenu-backdrop ${audioMenuOpen?'active':''}`} onClick={()=>setAudioMenuOpen(false)}/>
              <div className={`vehicle-submenu ${audioMenuOpen?'vehicle-submenu-open':''} ${!audioPopupPos.positionBelow?'position-above':''}`} style={{top:audioPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {AUDIO_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Audio',sub.label);setAudioMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Audio');setAudioMenuOpen(false)}}>Show all Audio</button>
              </div></>
            )}

            {/* Furniture */}
            {cat.label==='Furniture' && (
              <><div className={`vehicle-submenu-backdrop ${furnitureMenuOpen?'active':''}`} onClick={()=>setFurnitureMenuOpen(false)}/>
              <div className={`vehicle-submenu ${furnitureMenuOpen?'vehicle-submenu-open':''} ${!furniturePopupPos.positionBelow?'position-above':''}`} style={{top:furniturePopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {FURNITURE_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Furniture',sub.label);setFurnitureMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Furniture');setFurnitureMenuOpen(false)}}>Show all Furniture</button>
              </div></>
            )}

            {/* Services */}
            {cat.label==='Services' && (
              <><div className={`vehicle-submenu-backdrop ${servicesMenuOpen?'active':''}`} onClick={()=>setServicesMenuOpen(false)}/>
              <div className={`vehicle-submenu ${servicesMenuOpen?'vehicle-submenu-open':''} ${!servicesPopupPos.positionBelow?'position-above':''}`} style={{top:servicesPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {SERVICES_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Services',sub.label);setServicesMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Services');setServicesMenuOpen(false)}}>Show all Services</button>
              </div></>
            )}

            {/* Repair & Construction */}
            {cat.label==='Repair & Construction' && (
              <><div className={`vehicle-submenu-backdrop ${repairMenuOpen?'active':''}`} onClick={()=>setRepairMenuOpen(false)}/>
              <div className={`vehicle-submenu ${repairMenuOpen?'vehicle-submenu-open':''} ${!repairPopupPos.positionBelow?'position-above':''}`} style={{top:repairPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {REPAIR_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Repair & Construction',sub.label);setRepairMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Repair & Construction');setRepairMenuOpen(false)}}>Show all Repair & Construction</button>
              </div></>
            )}

            {/* Babies & Kids */}
            {cat.label==='Babies & Kids' && (
              <><div className={`vehicle-submenu-backdrop ${babiesMenuOpen?'active':''}`} onClick={()=>setBabiesMenuOpen(false)}/>
              <div className={`vehicle-submenu ${babiesMenuOpen?'vehicle-submenu-open':''} ${!babiesPopupPos.positionBelow?'position-above':''}`} style={{top:babiesPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {BABIES_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Babies & Kids',sub.label);setBabiesMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Babies & Kids');setBabiesMenuOpen(false)}}>Show all Babies & Kids</button>
              </div></>
            )}

            {/* Agriculture */}
            {cat.label==='Agriculture' && (
              <><div className={`vehicle-submenu-backdrop ${agricMenuOpen?'active':''}`} onClick={()=>setAgricMenuOpen(false)}/>
              <div className={`vehicle-submenu ${agricMenuOpen?'vehicle-submenu-open':''} ${!agricPopupPos.positionBelow?'position-above':''}`} style={{top:agricPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {AGRICULTURE_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Agriculture',sub.label);setAgricMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Agriculture');setAgricMenuOpen(false)}}>Show all Agriculture</button>
              </div></>
            )}

            {/* Animals */}
            {cat.label==='Animals' && (
              <><div className={`vehicle-submenu-backdrop ${animalsMenuOpen?'active':''}`} onClick={()=>setAnimalsMenuOpen(false)}/>
              <div className={`vehicle-submenu ${animalsMenuOpen?'vehicle-submenu-open':''} ${!animalsPopupPos.positionBelow?'position-above':''}`} style={{top:animalsPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {ANIMALS_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Animals',sub.label);setAnimalsMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Animals');setAnimalsMenuOpen(false)}}>Show all Animals</button>
              </div></>
            )}

            {/* Jobs */}
            {cat.label==='Jobs' && (
              <><div className={`vehicle-submenu-backdrop ${jobsMenuOpen?'active':''}`} onClick={()=>setJobsMenuOpen(false)}/>
              <div className={`vehicle-submenu ${jobsMenuOpen?'vehicle-submenu-open':''} ${!jobsPopupPos.positionBelow?'position-above':''}`} style={{top:jobsPopupPos.top}}>
                <p className="vehicle-submenu-title">Choose a type</p>
                <div className="vehicle-submenu-grid">
                  {JOBS_SUBCATEGORIES.map(sub=>(<button key={sub.label} className={`vehicle-sub-item ${activeSubcategory===sub.label?'vehicle-sub-active':''}`} onClick={()=>{selectSub('Jobs',sub.label);setJobsMenuOpen(false)}}><span className="sub-emoji">{sub.emoji}</span><span className="sub-label">{sub.label}</span>{activeSubcategory===sub.label&&<span className="sub-check">✓</span>}</button>))}
                </div>
                <button className="sub-all-vehicles" onClick={()=>{setActiveSubcategory('');setActiveCategory('Jobs');setJobsMenuOpen(false)}}>Show all Jobs</button>
              </div></>
            )}
          </div>
        ))}
      </div>

      {/* ── Price Filter ── */}
      <div className="price-filter-bar">
        <span className="price-filter-label">💰 Price:</span>
        <div className="price-input-group">
          <span className="price-currency">₦</span>
          <input
            type="number"
            className="price-input"
            placeholder="Min"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            min="0"
          />
        </div>
        <span className="price-separator">—</span>
        <div className="price-input-group">
          <span className="price-currency">₦</span>
          <input
            type="number"
            className="price-input"
            placeholder="Max"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            min="0"
          />
        </div>
        {(minPrice || maxPrice) && (
          <button className="price-clear-btn" onClick={() => { setMinPrice(''); setMaxPrice(''); }}>
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="active-filters">
          {activeCategory !== 'All' && !activeSubcategory && (
            <span className="filter-chip">
              {activeCategory}
              <button className="chip-remove" onClick={clearAllFilters}><X size={12}/></button>
            </span>
          )}
          {activeSubcategory && (
            <span className="filter-chip">
              {activeCategory === 'Electronics'           ? '💻'
               : activeCategory === 'Phones & Tablets'    ? '📱'
               : activeCategory === 'Property'            ? '🏠'
               : activeCategory === 'Fashion'             ? '👗'
               : activeCategory === 'Beauty & Personal Care'? '💄'
               : '🚗'} {activeSubcategory}
              <button className="chip-remove" onClick={()=>setActiveSubcategory('')}><X size={12}/></button>
            </span>
          )}
          {searchQuery && (
            <span className="filter-chip filter-chip-search">
              "{searchQuery}"
              <button className="chip-remove" onClick={()=>setSearchQuery('')}><X size={12}/></button>
            </span>
          )}
          {selectedLocation !== locations[0].name && (
            <span className="filter-chip filter-chip-location">
              📍 {selectedLocation}
              <button className="chip-remove" onClick={()=>setSelectedLocation(locations[0].name)}><X size={12}/></button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="filter-chip filter-chip-price">
              💰 {minPrice ? `₦${Number(minPrice).toLocaleString('en-NG')}` : '₦0'} — {maxPrice ? `₦${Number(maxPrice).toLocaleString('en-NG')}` : '∞'}
              <button className="chip-remove" onClick={() => { setMinPrice(''); setMaxPrice(''); }}><X size={12}/></button>
            </span>
          )}
          <button className="clear-all-btn" onClick={clearAllFilters}>Clear all</button>
        </div>
      )}

      {/* Results header */}
      <div className="products-header-row">
        <h2 className="products-section-title">{sectionTitle()}</h2>
        <span className="products-count">
          {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid or empty state */}
      {filteredProducts.length === 0 ? (
        <div className="no-results">
          <Search className="no-results-icon"/>
          <p className="no-results-text">No products found</p>
          <p className="no-results-sub">Try a different search, category, or location</p>
          <button className="no-results-clear" onClick={clearAllFilters}>Clear all filters</button>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map(product=>(
            <div className="product-card" key={product.id}>
              <NavLink to={`/product/${product.id}`} className="product-card-media-link">
                <div className="product-image-wrap">
                  <img 
                    src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"} 
                    alt={product.name} 
                    className="product-image" 
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                  <span className={`product-condition-badge ${product.condition === 'Brand New' ? 'badge-new' : 'badge-used'}`}>
                    {product.condition}
                  </span>
                  <span className="product-category-tag">{product.subcategory || product.category}</span>
                  <button
                    type="button"
                    className={`card-save-btn ${savedItems.some(item => (typeof item === 'object' ? item.id : item) === product.id) ? 'card-save-active' : ''}`}
                    onClick={(e) => toggleSaveProduct(product, e)}
                    title={savedItems.some(item => (typeof item === 'object' ? item.id : item) === product.id) ? "Remove from Saved" : "Save Advert"}
                  >
                    <Bookmark size={15} fill={savedItems.some(item => (typeof item === 'object' ? item.id : item) === product.id) ? "#ffa705" : "none"} color={savedItems.some(item => (typeof item === 'object' ? item.id : item) === product.id) ? "#ffa705" : "#64748b"} />
                  </button>
                </div>
              </NavLink>
              <div className="product-info">
                <NavLink to={`/product/${product.id}`} className="product-card-info-link">
                  <p className="product-name">{product.name}</p>
                </NavLink>
                <p className="product-price">{formatPrice(product.price)}</p>
                <div className="product-meta">
                  <span className="product-location">
                    <MapPin className="meta-icon"/> {product.location}
                  </span>
                  {user ? (
                    <NavLink 
                      to={`/messages?productId=${product.id}&prodName=${encodeURIComponent(product.name)}&prodPrice=${product.price}&prodImg=${encodeURIComponent(product.image)}`}
                      className="product-chat-btn"
                      title="Chat with Seller"
                    >
                      <MessageSquareMore size={15}/> Chat
                    </NavLink>
                  ) : (
                    <button
                      type="button"
                      className="product-chat-btn"
                      onClick={() => setIsAuthOpen(true)}
                      title="Sign in to Chat"
                    >
                      <MessageSquareMore size={15}/> Chat
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
    </>
  )
}