import { supabase } from '../lib/supabaseClient';
import { products } from '../data/productData';

/**
 * Enterprise synchronization layer between Supabase Database (public.profiles & storage.avatars)
 * and Client Local Storage across all user accounts and multiple devices.
 */

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

export const safeJsonParse = (val, fallback = []) => {
  if (!val || typeof val !== 'string') return fallback;
  try {
    const res = JSON.parse(val);
    return res !== null && res !== undefined ? res : fallback;
  } catch (e) {
    return fallback;
  }
};

/**
 * Image compression utility to convert user avatars into clean JPEG data URLs
 */
export const compressImage = (fileOrDataUrl, maxWidth = 160, maxHeight = 160, quality = 0.8) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
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

        canvas.width = width || 120;
        canvas.height = height || 120;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn("Canvas compression notice:", err);
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null);
      }
    };
    img.onerror = () => {
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null);
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      resolve(null);
    }
  });
};

/**
 * Upload Avatar to Supabase Storage bucket 'avatars'
 */
export const uploadAvatarImage = async (user, fileOrDataUrl) => {
  if (!fileOrDataUrl) return DEFAULT_AVATAR;

  // 1. If it is already a public HTTP/HTTPS URL, return it directly
  if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
    return fileOrDataUrl;
  }

  // 2. Generate a compressed version
  const compressed = await compressImage(fileOrDataUrl, 160, 160, 0.8);
  const dataToSave = compressed || (typeof fileOrDataUrl === 'string' ? fileOrDataUrl : DEFAULT_AVATAR);

  // 3. Upload to Supabase Storage bucket 'avatars'
  if (user && user.id && typeof window !== 'undefined' && dataToSave && dataToSave.startsWith('data:')) {
    const bucketsToTry = ['avatars', 'public', 'images', 'photos'];
    for (const bucket of bucketsToTry) {
      try {
        const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
        const res = await fetch(dataToSave);
        const blob = await res.blob();

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/jpeg'
          });

        if (!error && data?.path) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      } catch (storageErr) {
        // Try next bucket
      }
    }
  }

  return dataToSave;
};

export const getCachedUserSync = () => {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed?.user) return parsed.user;
            if (parsed?.currentSession?.user) return parsed.currentSession.user;
            if (parsed?.session?.user) return parsed.session.user;
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  return null;
};

// --- USER PROFILE & AVATAR SYNC (DATABASE + STORAGE + METADATA) ---

export const getUserProfileData = (user) => {
  const activeUser = user || (typeof window !== 'undefined' ? getCachedUserSync() : null);

  if (!activeUser) {
    if (typeof window === 'undefined') {
      return {
        name: 'Marketplace User',
        email: '',
        phone: '+234 812 345 6789',
        whatsapp: '+234 812 345 6789',
        location: 'Lekki, Lagos',
        avatar: DEFAULT_AVATAR,
        banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
      };
    }
    const savedName = localStorage.getItem('buyoh_user_name_v1');
    const savedPhone = localStorage.getItem('buyoh_user_phone_v1');
    const savedWhatsapp = localStorage.getItem('buyoh_user_whatsapp_v1');
    const savedLocation = localStorage.getItem('buyoh_user_location_v1');
    const savedAvatar = localStorage.getItem('buyoh_user_avatar_v1');

    return {
      name: savedName || 'Adebayo Johnson',
      email: 'adebayo.johnson@buyoh.com',
      phone: savedPhone || '+234 812 345 6789',
      whatsapp: savedWhatsapp || '+234 812 345 6789',
      location: savedLocation || 'Lekki, Lagos',
      avatar: savedAvatar || DEFAULT_AVATAR,
      banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
    };
  }

  // When activeUser is logged in (or cached in local session):
  const meta = activeUser.user_metadata || {};
  let localProfile = null;
  let cachedUserAvatar = null;
  let cachedUserName = null;

  if (typeof window !== 'undefined') {
    localProfile = safeJsonParse(localStorage.getItem(`buyoh_user_profile_${activeUser.id}`), null);
    cachedUserAvatar = localStorage.getItem(`buyoh_user_avatar_${activeUser.id}`) || localStorage.getItem('buyoh_user_avatar_v1');
    cachedUserName = localStorage.getItem(`buyoh_user_name_${activeUser.id}`) || localStorage.getItem('buyoh_user_name_v1');
  }

  // Choose the best avatar synchronously without falling back to DEFAULT_AVATAR if custom avatar is cached
  let chosenAvatar = DEFAULT_AVATAR;
  if (localProfile?.avatar && localProfile.avatar !== DEFAULT_AVATAR) {
    chosenAvatar = localProfile.avatar;
  } else if (cachedUserAvatar && cachedUserAvatar !== DEFAULT_AVATAR) {
    chosenAvatar = cachedUserAvatar;
  } else if (meta.avatar_url && meta.avatar_url !== DEFAULT_AVATAR) {
    chosenAvatar = meta.avatar_url;
  } else if (meta.picture && meta.picture !== DEFAULT_AVATAR) {
    chosenAvatar = meta.picture;
  } else if (localProfile?.avatar) {
    chosenAvatar = localProfile.avatar;
  }

  const name = localProfile?.name || cachedUserName || meta.full_name || meta.name || activeUser.email?.split('@')[0] || 'Marketplace User';
  const email = activeUser.email || 'no-email@buyoh.com';
  const phone = localProfile?.phone || meta.phone || activeUser.phone || '+234 812 345 6789';
  const whatsapp = localProfile?.whatsapp || meta.whatsapp || meta.phone || phone;
  const location = localProfile?.location || meta.location || 'Lagos, Nigeria';

  // Background fetch from Supabase database table `public.profiles`
  if (typeof window !== 'undefined' && activeUser.id) {
    (async () => {
      try {
        const { data: dbProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUser.id)
          .maybeSingle();

        if (dbProfile && !error) {
          const freshData = {
            name: dbProfile.full_name || dbProfile.name || name,
            email: dbProfile.email || email,
            phone: dbProfile.phone || phone,
            whatsapp: dbProfile.whatsapp || whatsapp,
            location: dbProfile.location || location,
            avatar: dbProfile.avatar_url || chosenAvatar,
            banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
          };
          localStorage.setItem(`buyoh_user_profile_${activeUser.id}`, JSON.stringify(freshData));
          localStorage.setItem(`buyoh_user_avatar_${activeUser.id}`, freshData.avatar);
          localStorage.setItem('buyoh_user_avatar_v1', freshData.avatar);
          localStorage.setItem(`buyoh_user_name_${activeUser.id}`, freshData.name);
          localStorage.setItem('buyoh_user_name_v1', freshData.name);

          // Only fire update event if values actually changed to avoid unnecessary re-renders/flashes
          if (freshData.avatar !== chosenAvatar || freshData.name !== name || freshData.phone !== phone) {
            window.dispatchEvent(new CustomEvent('buyoh_profile_updated', { detail: freshData }));
          }
        }
      } catch (err) {}
    })();
  }

  // Cache back to local storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`buyoh_user_avatar_${activeUser.id}`, chosenAvatar);
      localStorage.setItem('buyoh_user_avatar_v1', chosenAvatar);
      localStorage.setItem(`buyoh_user_name_${activeUser.id}`, name);
      localStorage.setItem('buyoh_user_name_v1', name);
    } catch (e) {}
  }

  return {
    name,
    email,
    phone,
    whatsapp,
    location,
    avatar: chosenAvatar,
    banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
  };
};

export const saveUserProfileData = async (user, profileData) => {
  if (typeof window === 'undefined') return;
  const userKey = user?.id ? `buyoh_user_profile_${user.id}` : 'buyoh_user_profile_v1';
  
  try {
    localStorage.setItem(userKey, JSON.stringify(profileData));
    if (profileData.avatar) {
      localStorage.setItem('buyoh_user_avatar_v1', profileData.avatar);
      if (user?.id) localStorage.setItem(`buyoh_user_avatar_${user.id}`, profileData.avatar);
    }
    if (profileData.name) {
      localStorage.setItem('buyoh_user_name_v1', profileData.name);
      if (user?.id) localStorage.setItem(`buyoh_user_name_${user.id}`, profileData.name);
    }
    if (profileData.phone) {
      localStorage.setItem('buyoh_user_phone_v1', profileData.phone);
      if (user?.id) localStorage.setItem(`buyoh_user_phone_${user.id}`, profileData.phone);
    }
    if (profileData.whatsapp) {
      localStorage.setItem('buyoh_user_whatsapp_v1', profileData.whatsapp);
      if (user?.id) localStorage.setItem(`buyoh_user_whatsapp_${user.id}`, profileData.whatsapp);
    }
    if (profileData.location) {
      localStorage.setItem('buyoh_user_location_v1', profileData.location);
      if (user?.id) localStorage.setItem(`buyoh_user_location_${user.id}`, profileData.location);
    }

    if (user && user.id) {
      // 1. Sync to Supabase `public.profiles` database table
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: profileData.name,
            phone: profileData.phone,
            whatsapp: profileData.whatsapp,
            location: profileData.location,
            avatar_url: profileData.avatar,
            updated_at: new Date().toISOString()
          });
      } catch (dbErr) {
        console.warn("Supabase profiles table upsert notice:", dbErr);
      }

      // 2. Sync to Supabase `auth.users` user_metadata
      if (user.user_metadata) {
        Object.assign(user.user_metadata, {
          full_name: profileData.name,
          name: profileData.name,
          phone: profileData.phone,
          whatsapp: profileData.whatsapp,
          location: profileData.location,
          avatar_url: profileData.avatar,
          picture: profileData.avatar
        });
      }

      try {
        await supabase.auth.updateUser({
          data: {
            full_name: profileData.name,
            name: profileData.name,
            phone: profileData.phone,
            whatsapp: profileData.whatsapp,
            location: profileData.location,
            avatar_url: profileData.avatar,
            picture: profileData.avatar
          }
        });
      } catch (authErr) {
        console.warn("Supabase auth updateUser notice:", authErr);
      }
    }

    window.dispatchEvent(new CustomEvent('buyoh_profile_updated', { detail: profileData }));
    if (profileData.avatar) {
      window.dispatchEvent(new CustomEvent('buyoh_avatar_updated', { detail: profileData.avatar }));
    }
  } catch (e) {
    console.error("Error saving user profile data:", e);
  }
};

// --- SAVED ADVERTS SYNC ---

export const getSavedItemsForUser = (user) => {
  if (typeof window === 'undefined') return [];
  if (!user) {
    try {
      return safeJsonParse(localStorage.getItem('buyoh_saved_items_v1'), []);
    } catch (e) {
      return [];
    }
  }

  // 1. Check local user-scoped storage key
  try {
    const local = localStorage.getItem(`buyoh_saved_items_${user.id}`);
    if (local !== null && local !== undefined) {
      const parsed = safeJsonParse(local, null);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Fallback to Supabase cloud user_metadata
  const cloudSaved = user.user_metadata?.saved_items;
  if (Array.isArray(cloudSaved) && cloudSaved.length > 0) {
    try {
      localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(cloudSaved));
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(cloudSaved));
    } catch (e) {}
    return cloudSaved;
  }

  // 3. Fallback to legacy un-scoped local storage key
  try {
    const legacy = localStorage.getItem('buyoh_saved_items_v1');
    if (legacy !== null && legacy !== undefined) {
      const parsedLegacy = safeJsonParse(legacy, null);
      if (Array.isArray(parsedLegacy)) {
        localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(parsedLegacy));
        syncSavedItemsToCloud(user, parsedLegacy);
        return parsedLegacy;
      }
    }
  } catch (e) {}

  return [];
};

export const saveItemsForUser = async (user, items) => {
  if (typeof window === 'undefined') return;
  const sanitizedItems = Array.isArray(items) ? items : [];
  
  if (user && user.id) {
    const userKey = `buyoh_saved_items_${user.id}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(sanitizedItems));
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(sanitizedItems));
      if (user.user_metadata) {
        user.user_metadata.saved_items = sanitizedItems;
      }
      window.dispatchEvent(new CustomEvent('buyoh_saved_updated'));
      await syncSavedItemsToCloud(user, sanitizedItems);
    } catch (e) {
      console.error("Error saving user items:", e);
    }
  } else {
    try {
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(sanitizedItems));
      window.dispatchEvent(new CustomEvent('buyoh_saved_updated'));
    } catch (e) {
      console.error("Error saving guest items:", e);
    }
  }
};

export const syncSavedItemsToCloud = async (user, items) => {
  if (!user || !user.id) return;
  try {
    await supabase
      .from('profiles')
      .update({ saved_items: items, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch (e) {}

  try {
    await supabase.auth.updateUser({
      data: { saved_items: items }
    });
  } catch (err) {}
};

// --- MY LISTINGS SYNC ---

export const getMyListingsForUser = (user) => {
  if (typeof window === 'undefined') return [];
  if (!user) {
    try {
      return safeJsonParse(localStorage.getItem('buyoh_my_listings_v1'), []);
    } catch (e) {
      return [];
    }
  }

  // 1. Check local user-scoped storage key
  try {
    const local = localStorage.getItem(`buyoh_my_listings_${user.id}`);
    if (local !== null && local !== undefined) {
      const parsed = safeJsonParse(local, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(item => registerPublicListing(item));
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Fallback to cloud user_metadata on first login/new device
  const cloudListings = user.user_metadata?.my_listings;
  if (Array.isArray(cloudListings) && cloudListings.length > 0) {
    try {
      localStorage.setItem(`buyoh_my_listings_${user.id}`, JSON.stringify(cloudListings));
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(cloudListings));
      cloudListings.forEach(item => registerPublicListing(item));
    } catch (e) {}
    return cloudListings;
  }

  try {
    const legacy = localStorage.getItem('buyoh_my_listings_v1');
    if (legacy) {
      const parsed = safeJsonParse(legacy, []);
      const userListings = parsed.filter(ad => !ad.sellerId || ad.sellerId === user.id);
      if (userListings.length > 0) {
        localStorage.setItem(`buyoh_my_listings_${user.id}`, JSON.stringify(userListings));
        saveMyListingsForUser(user, userListings);
        return userListings;
      }
    }
  } catch (e) {}
  return [];
};

export const saveMyListingsForUser = async (user, listings) => {
  if (typeof window === 'undefined') return;
  const sanitizedListings = Array.isArray(listings) ? listings : [];
  if (user && user.id) {
    const userKey = `buyoh_my_listings_${user.id}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(sanitizedListings));
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(sanitizedListings));
      if (user.user_metadata) {
        user.user_metadata.my_listings = sanitizedListings;
      }
      
      // Update public pool
      try {
        const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
        let publicPool = safeJsonParse(rawPublic, []);
        if (!Array.isArray(publicPool)) publicPool = [];
        
        publicPool = publicPool.filter(p => p.sellerId !== user.id);
        publicPool = [...sanitizedListings, ...publicPool];
        
        localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));

      try {
        await supabase
          .from('profiles')
          .update({ my_listings: sanitizedListings, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (e) {}

      await supabase.auth.updateUser({
        data: { my_listings: sanitizedListings }
      });
    } catch (e) {
      console.error("Error saving user listings:", e);
    }
  } else {
    try {
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(sanitizedListings));
      
      const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
      let publicPool = safeJsonParse(rawPublic, []);
      if (Array.isArray(publicPool)) {
        const guestIds = new Set(sanitizedListings.map(item => String(item.id)));
        publicPool = publicPool.filter(p => {
          const isGuestListing = !p.sellerId;
          if (isGuestListing) {
            return guestIds.has(String(p.id));
          }
          return true;
        });
        localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
      }

      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
    } catch (e) {
      console.error("Error saving guest listings:", e);
    }
  }
};

// --- NOTIFICATIONS SYNC ---

export const getNotificationsForUser = (user, fallbackInitial = []) => {
  if (typeof window === 'undefined') return fallbackInitial;

  const localKey = user?.id ? `buyoh_notifications_${user.id}` : 'buyoh_notifications_v1';
  const local = safeJsonParse(localStorage.getItem(localKey), null);
  if (Array.isArray(local) && local.length > 0) return local;

  if (user && user.user_metadata?.notifications) {
    const cloudNotifs = user.user_metadata.notifications;
    if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
      try {
        localStorage.setItem(`buyoh_notifications_${user.id}`, JSON.stringify(cloudNotifs));
        localStorage.setItem('buyoh_notifications_v1', JSON.stringify(cloudNotifs));
      } catch (e) {}
      return cloudNotifs;
    }
  }

  const legacy = safeJsonParse(localStorage.getItem('buyoh_notifications_v1'), null);
  if (Array.isArray(legacy) && legacy.length > 0) return legacy;

  return fallbackInitial;
};

export const saveNotificationsForUser = async (user, notifications) => {
  if (typeof window === 'undefined') return;
  const sanitized = Array.isArray(notifications) ? notifications : [];
  const localKey = user?.id ? `buyoh_notifications_${user.id}` : 'buyoh_notifications_v1';

  try {
    localStorage.setItem(localKey, JSON.stringify(sanitized));
    localStorage.setItem('buyoh_notifications_v1', JSON.stringify(sanitized));

    if (user && user.id) {
      if (user.user_metadata) {
        user.user_metadata.notifications = sanitized;
      }
      try {
        await supabase
          .from('profiles')
          .update({ notifications: sanitized, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (e) {}

      await supabase.auth.updateUser({
        data: { notifications: sanitized }
      });
    }
  } catch (e) {
    console.error("Error saving notifications:", e);
  }
};

// --- FOLLOWED SELLERS SYNC ---

export const getFollowedSellersForUser = (user) => {
  if (typeof window === 'undefined') return [];

  const localKey = user?.id ? `buyoh_followed_sellers_${user.id}` : 'buyoh_followed_sellers_v1';
  const local = safeJsonParse(localStorage.getItem(localKey), null);
  if (Array.isArray(local) && local.length > 0) return local;

  if (user && user.user_metadata?.followed_sellers) {
    const cloudFollowed = user.user_metadata.followed_sellers;
    if (Array.isArray(cloudFollowed)) {
      try {
        localStorage.setItem(`buyoh_followed_sellers_${user.id}`, JSON.stringify(cloudFollowed));
        localStorage.setItem('buyoh_followed_sellers_v1', JSON.stringify(cloudFollowed));
      } catch (e) {}
      return cloudFollowed;
    }
  }

  const legacy = safeJsonParse(localStorage.getItem('buyoh_followed_sellers_v1'), null);
  if (Array.isArray(legacy)) return legacy;

  return [];
};

export const saveFollowedSellersForUser = async (user, followedSellers) => {
  if (typeof window === 'undefined') return;
  const sanitized = Array.isArray(followedSellers) ? followedSellers : [];
  const localKey = user?.id ? `buyoh_followed_sellers_${user.id}` : 'buyoh_followed_sellers_v1';

  try {
    localStorage.setItem(localKey, JSON.stringify(sanitized));
    localStorage.setItem('buyoh_followed_sellers_v1', JSON.stringify(sanitized));

    if (user && user.id) {
      if (user.user_metadata) {
        user.user_metadata.followed_sellers = sanitized;
      }
      try {
        await supabase
          .from('profiles')
          .update({ followed_sellers: sanitized, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (e) {}

      await supabase.auth.updateUser({
        data: { followed_sellers: sanitized }
      });
    }
  } catch (e) {
    console.error("Error saving followed sellers:", e);
  }
};

// --- GLOBAL PUBLIC MARKETPLACE LISTINGS SYNC ---

export const registerPublicListing = (newListing) => {
  if (typeof window === 'undefined') return;
  if (!newListing || !newListing.id) return;
  try {
    const raw = localStorage.getItem('buyoh_public_listings_v1');
    let publicListings = safeJsonParse(raw, []);
    if (!Array.isArray(publicListings)) publicListings = [];
    
    const existsIndex = publicListings.findIndex(p => String(p.id) === String(newListing.id));
    if (existsIndex >= 0) {
      publicListings[existsIndex] = newListing;
    } else {
      publicListings = [newListing, ...publicListings];
    }
    
    localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicListings));
    window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
  } catch (e) {
    console.error("Error registering public listing:", e);
  }
};

export const getAllPublicListings = (user) => {
  let publicPool = [];
  if (typeof window === 'undefined') return publicPool;
  
  try {
    const raw = localStorage.getItem('buyoh_public_listings_v1');
    publicPool = safeJsonParse(raw, []);
  } catch (e) {
    console.error("Error reading public listings pool:", e);
  }

  if (user) {
    const userListings = getMyListingsForUser(user);
    const userListingIds = new Set(userListings.map(item => String(item.id)));

    publicPool = publicPool.filter(p => {
      const isUserListing = (p.sellerId && String(p.sellerId) === String(user.id)) || 
                            (p.sellerEmail && String(p.sellerEmail) === String(user.email));
      if (isUserListing) {
        return userListingIds.has(String(p.id));
      }
      return true;
    });

    userListings.forEach(item => {
      if (!publicPool.some(p => String(p.id) === String(item.id))) {
        publicPool.unshift(item);
      }
    });

    try {
      localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
    } catch (e) {}
  }

  return publicPool;
};

// --- GENERAL PRODUCT POOL (SINGLE SOURCE OF TRUTH) ---

export const getGeneralProductPool = (user) => {
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

  const pool = [...cleanedListings];
  products.forEach(p => {
    if (!pool.some(existing => String(existing.id) === String(p.id))) {
      pool.push(p);
    }
  });

  return pool;
};
