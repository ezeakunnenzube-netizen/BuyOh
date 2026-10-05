import { supabase } from '../lib/supabaseClient';
import { products } from '../data/productData';

/**
 * Enterprise synchronization layer between Supabase Database (public.profiles & storage.avatars)
 * and Client Local Storage across all user accounts and multiple devices.
 *
 * Cross-Device Sync Architecture:
 *   - syncUserDataFromCloud(user) : Pull latest cloud data → merge with local → push merged back up
 *   - initUserRealtimeSync(user)  : Subscribe to Supabase Realtime so Device B reflects Device A changes
 */

export const DEFAULT_AVATAR = '';

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
 * UUID verification and deterministic formatting helpers
 */
export const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

export const toValidUUID = (input) => {
  if (!input) return '00000000-0000-4000-a000-000000000000';
  const str = String(input).trim();
  if (isUUID(str)) return str.toLowerCase();

  // Deterministic 128-bit hash formatted as RFC4122 v4 UUID
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x12345678, h4 = 0x98765432;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2718281829);
  }
  const hex = (h) => (h >>> 0).toString(16).padStart(8, '0');
  const part1 = hex(h1);
  const part2 = hex(h2).slice(0, 4);
  const part3 = '4' + hex(h3).slice(1, 4);
  const part4 = 'a' + hex(h4).slice(1, 4);
  const part5 = hex(h1 ^ h3) + hex(h2 ^ h4).slice(0, 4);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
};

/**
 * Robust product ID matcher handling original IDs, slugs, and deterministic UUID hashes
 */
export const isMatchingProductId = (listingId, targetId) => {
  if (!listingId || !targetId) return false;
  const s1 = String(listingId).trim();
  const s2 = String(targetId).trim();
  if (s1 === s2 || s1.toLowerCase() === s2.toLowerCase()) return true;
  try {
    const uuid1 = toValidUUID(s1);
    const uuid2 = toValidUUID(s2);
    if (uuid1 === s2.toLowerCase() || uuid2 === s1.toLowerCase() || uuid1 === uuid2) {
      return true;
    }
  } catch (e) {}
  return false;
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
  const dataToSave = compressed || (typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');

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

const isValidAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('photo-1535713875002-d1d0cf377fde')) return false;
  return url.trim().length > 0;
};

export const getUserProfileData = (user) => {
  const activeUser = user || (typeof window !== 'undefined' ? getCachedUserSync() : null);

  if (!activeUser || !activeUser.id) {
    return {
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      location: '',
      avatar: '',
      banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)',
      createdAt: null,
      verified: false
    };
  }

  // When activeUser is logged in:
  const meta = activeUser.user_metadata || {};
  let localProfile = null;
  let cachedUserAvatar = null;
  let cachedUserName = null;

  if (typeof window !== 'undefined') {
    localProfile = safeJsonParse(localStorage.getItem(`buyoh_user_profile_${activeUser.id}`), null);
    cachedUserAvatar = localStorage.getItem(`buyoh_user_avatar_${activeUser.id}`);
    cachedUserName = localStorage.getItem(`buyoh_user_name_${activeUser.id}`);
  }

  const cachedUserPhone = typeof window !== 'undefined' ? localStorage.getItem(`buyoh_user_phone_${activeUser.id}`) : null;
  const cachedUserWhatsapp = typeof window !== 'undefined' ? localStorage.getItem(`buyoh_user_whatsapp_${activeUser.id}`) : null;
  const cachedUserLocation = typeof window !== 'undefined' ? localStorage.getItem(`buyoh_user_location_${activeUser.id}`) : null;

  // Choose the best avatar synchronously (strictly user-scoped)
  let chosenAvatar = '';
  if (isValidAvatarUrl(localProfile?.avatar)) {
    chosenAvatar = localProfile.avatar;
  } else if (isValidAvatarUrl(cachedUserAvatar)) {
    chosenAvatar = cachedUserAvatar;
  } else if (isValidAvatarUrl(meta.avatar_url)) {
    chosenAvatar = meta.avatar_url;
  } else if (isValidAvatarUrl(meta.picture)) {
    chosenAvatar = meta.picture;
  }

  const name = localProfile?.name || localProfile?.full_name || cachedUserName || meta.full_name || meta.name || '';
  const email = localProfile?.email || activeUser.email || '';
  const phone = localProfile?.phone || cachedUserPhone || meta.phone || activeUser.phone || '';
  const whatsapp = localProfile?.whatsapp || cachedUserWhatsapp || meta.whatsapp || meta.phone || phone || '';
  const location = localProfile?.location || cachedUserLocation || meta.location || '';
  const createdAt = localProfile?.createdAt || localProfile?.created_at || activeUser.created_at || null;
  const verified = Boolean(localProfile?.verified ?? (activeUser.email_confirmed_at || meta.verified));

  return {
    name,
    email,
    phone,
    whatsapp,
    location,
    avatar: chosenAvatar,
    banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)',
    createdAt,
    verified
  };
};

export const saveUserProfileData = async (user, profileData) => {
  if (typeof window === 'undefined' || !user?.id) return;
  const userKey = `buyoh_user_profile_${user.id}`;
  
  try {
    localStorage.setItem(userKey, JSON.stringify(profileData));
    if (profileData.avatar) {
      localStorage.setItem(`buyoh_user_avatar_${user.id}`, profileData.avatar);
    }
    if (profileData.name) {
      localStorage.setItem(`buyoh_user_name_${user.id}`, profileData.name);
    }
    if (profileData.phone) {
      localStorage.setItem(`buyoh_user_phone_${user.id}`, profileData.phone);
    }
    if (profileData.whatsapp) {
      localStorage.setItem(`buyoh_user_whatsapp_${user.id}`, profileData.whatsapp);
    }
    if (profileData.location) {
      localStorage.setItem(`buyoh_user_location_${user.id}`, profileData.location);
    }

    if (user && user.id) {
      // Sync to Supabase `public.profiles` database table
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

      // Also sync auth user_metadata so user session stays aligned
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: profileData.name,
            name: profileData.name,
            phone: profileData.phone,
            whatsapp: profileData.whatsapp,
            location: profileData.location,
            avatar_url: profileData.avatar
          }
        });
      } catch (authErr) {
        // Safe notice
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
  if (typeof window === 'undefined' || !user?.id) return [];

  // Check local user-scoped storage key
  try {
    const local = localStorage.getItem(`buyoh_saved_items_${user.id}`);
    if (local !== null && local !== undefined) {
      const parsed = safeJsonParse(local, null);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  // Fallback to Supabase cloud user_metadata
  const cloudSaved = user.user_metadata?.saved_items;
  if (Array.isArray(cloudSaved) && cloudSaved.length > 0) {
    try {
      localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(cloudSaved));
    } catch (e) {}
    return cloudSaved;
  }

  return [];
};

export const saveItemsForUser = async (user, items) => {
  if (typeof window === 'undefined') return;
  const sanitizedItems = Array.isArray(items) ? items : [];
  
  if (user && user.id) {
    const userKey = `buyoh_saved_items_${user.id}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(sanitizedItems));
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
};

// --- MY LISTINGS SYNC ---

export const getMyListingsForUser = (user) => {
  if (typeof window === 'undefined' || !user?.id) return [];

  // Check local user-scoped storage key
  try {
    const local = localStorage.getItem(`buyoh_my_listings_${user.id}`);
    if (local !== null && local !== undefined) {
      const parsed = safeJsonParse(local, []);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  // Fallback to cloud user_metadata on first login/new device
  const cloudListings = user.user_metadata?.my_listings;
  if (Array.isArray(cloudListings) && cloudListings.length > 0) {
    try {
      localStorage.setItem(`buyoh_my_listings_${user.id}`, JSON.stringify(cloudListings));
    } catch (e) {}
    return cloudListings;
  }

  return [];
};

export const saveMyListingsForUser = async (user, listings) => {
  if (typeof window === 'undefined') return;
  const sanitizedListings = Array.isArray(listings) ? listings : [];
  if (user && user.id) {
    const userKey = `buyoh_my_listings_${user.id}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(sanitizedListings));
      
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

      // Session-aware cloud write with auto-refresh fallback
      try {
        let { data: { session } } = await supabase.auth.getSession();
        
        // If session is missing or token looks stale, attempt a refresh
        if (!session?.access_token) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed?.session;
        }

        if (session?.access_token) {
          const { error, data: updatedRows } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              my_listings: sanitizedListings,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select('id, updated_at');
          if (error) {
            console.warn('Cloud listings save warning:', error.message);
          } else if (!updatedRows || updatedRows.length === 0) {
            console.warn('Cloud listings: upsert matched 0 rows — check RLS in Supabase');
          } else {
            console.log(`[InfiBuy] Listings synced to cloud (${sanitizedListings.length} items)`);
          }
        } else {
          console.warn('saveMyListingsForUser: no active session after refresh, cloud write skipped');
        }
      } catch (e) {
        console.warn('saveMyListingsForUser cloud write error:', e);
      }
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
  if (typeof window === 'undefined' || !user?.id) return fallbackInitial;

  const localKey = `buyoh_notifications_${user.id}`;
  const local = safeJsonParse(localStorage.getItem(localKey), null);
  if (Array.isArray(local) && local.length > 0) return local;

  if (user && user.user_metadata?.notifications) {
    const cloudNotifs = user.user_metadata.notifications;
    if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
      try {
        localStorage.setItem(`buyoh_notifications_${user.id}`, JSON.stringify(cloudNotifs));
      } catch (e) {}
      return cloudNotifs;
    }
  }

  return fallbackInitial;
};

export const saveNotificationsForUser = async (user, notifications) => {
  if (typeof window === 'undefined' || !user?.id) return;
  const sanitized = Array.isArray(notifications) ? notifications : [];
  const localKey = `buyoh_notifications_${user.id}`;

  try {
    localStorage.setItem(localKey, JSON.stringify(sanitized));

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
    }
  } catch (e) {
    console.error("Error saving notifications:", e);
  }
};

// --- FOLLOWED SELLERS SYNC ---

export const getFollowedSellersForUser = (user) => {
  if (typeof window === 'undefined' || !user?.id) return [];

  const localKey = `buyoh_followed_sellers_${user.id}`;
  const local = safeJsonParse(localStorage.getItem(localKey), null);
  if (Array.isArray(local) && local.length > 0) return local;

  if (user && user.user_metadata?.followed_sellers) {
    const cloudFollowed = user.user_metadata.followed_sellers;
    if (Array.isArray(cloudFollowed)) {
      try {
        localStorage.setItem(`buyoh_followed_sellers_${user.id}`, JSON.stringify(cloudFollowed));
      } catch (e) {}
      return cloudFollowed;
    }
  }

  return [];
};

export const saveFollowedSellersForUser = async (user, followedSellers) => {
  if (typeof window === 'undefined' || !user?.id) return;
  const sanitized = Array.isArray(followedSellers) ? followedSellers : [];
  const localKey = `buyoh_followed_sellers_${user.id}`;

  try {
    localStorage.setItem(localKey, JSON.stringify(sanitized));

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
    
    const existsIndex = publicListings.findIndex(p => isMatchingProductId(p.id, newListing.id));
    if (existsIndex >= 0) {
      publicListings[existsIndex] = { ...publicListings[existsIndex], ...newListing };
    } else {
      publicListings = [newListing, ...publicListings];
    }
    
    localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicListings));
    window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
  } catch (e) {
    console.error("Error registering public listing:", e);
  }
};

/**
 * Enterprise cloud pull: Fetch public listings from all user profiles in Supabase
 * Ensures Account B immediately sees ads posted by Account A across devices and browsers.
 */
export const syncAllPublicListingsFromCloud = async () => {
  if (typeof window === 'undefined') return [];
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, name, phone, whatsapp, location, avatar_url, created_at, verified, my_listings')
      .not('my_listings', 'is', null);

    if (error) {
      console.warn('[userSync] Error fetching public listings from profiles:', error.message);
      return [];
    }

    if (!profiles || !Array.isArray(profiles)) return [];

    const cloudAllListings = [];
    profiles.forEach(prof => {
      if (Array.isArray(prof.my_listings)) {
        prof.my_listings.forEach(item => {
          if (item && item.id) {
            const enriched = {
              ...item,
              sellerId: item.sellerId || prof.id,
              sellerName: item.sellerName || prof.full_name || prof.name || 'Seller',
              sellerPhone: item.sellerPhone || prof.phone || prof.whatsapp || '',
              sellerWhatsApp: item.sellerWhatsApp || prof.whatsapp || prof.phone || '',
              sellerAvatar: item.sellerAvatar || prof.avatar_url || '',
              sellerLocation: item.sellerLocation || prof.location || item.location || '',
              sellerCreatedAt: item.sellerCreatedAt || prof.created_at || null,
              sellerVerified: prof.verified ?? item.sellerVerified
            };
            cloudAllListings.push(enriched);
          }
        });
      }
    });

    if (cloudAllListings.length > 0) {
      const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
      let localPublic = safeJsonParse(rawPublic, []);
      if (!Array.isArray(localPublic)) localPublic = [];

      const cloudIds = new Set(cloudAllListings.map(c => String(c.id)));
      const localOnly = localPublic.filter(p => p && p.id && !cloudIds.has(String(p.id)));
      const merged = [...cloudAllListings, ...localOnly];

      localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
      return merged;
    }

    return cloudAllListings;
  } catch (err) {
    console.error('[userSync] syncAllPublicListingsFromCloud exception:', err);
    return [];
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

// =============================================================================
// CROSS-DEVICE REALTIME SYNC ENGINE
// =============================================================================

/**
 * Registry to track active Supabase Realtime channels per user so we can
 * cleanly unsubscribe when the user logs out or the component unmounts.
 */
const _realtimeChannels = {};

/**
 * syncUserDataFromCloud(user)
 *
 * Fetches the authoritative profile row from Supabase and merges it with the
 * current device's localStorage, then dispatches the appropriate custom events
 * so all mounted views update their state automatically.
 *
 * Merge strategy:
 *   - Profile fields (name, phone, whatsapp, location, avatar): cloud wins
 *   - my_listings : merge(cloud ∪ local); push merged back to cloud if local had extras
 *   - saved_items : merge(cloud ∪ local); push merged back to cloud if local had extras
 *   - notifications: merge(cloud ∪ local); push merged back to cloud if local had extras
 */
export const syncUserDataFromCloud = async (user) => {
  if (!user || !user.id || typeof window === 'undefined') return;

  try {
    // Get session — attempt refresh if token is absent or stale
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed?.session;
    }

    const { data: dbProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('syncUserDataFromCloud: error fetching profile', error?.message);
      return;
    }

    // If profile row doesn't exist yet in public.profiles, create it with local data!
    if (!dbProfile) {
      const localProfile = getUserProfileData(user);
      const localListings = getMyListingsForUser(user);
      const localSaved = getSavedItemsForUser(user);
      const localNotifs = getNotificationsForUser(user);

      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: localProfile.name || '',
          full_name: localProfile.name || '',
          phone: localProfile.phone || '',
          whatsapp: localProfile.whatsapp || '',
          location: localProfile.location || 'Lagos, Nigeria',
          avatar_url: localProfile.avatar || '',
          my_listings: localListings,
          saved_items: localSaved,
          notifications: localNotifs,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      console.log('[InfiBuy] Created missing profile row in Supabase for user', user.id);
      return;
    }

    // --- 1. Sync profile fields ---
    const cloudProfile = {
      name: dbProfile.full_name || dbProfile.name || user.email?.split('@')[0] || 'Marketplace User',
      email: dbProfile.email || user.email || '',
      phone: dbProfile.phone || '',
      whatsapp: dbProfile.whatsapp || dbProfile.phone || '',
      location: dbProfile.location || 'Lagos, Nigeria',
      avatar: dbProfile.avatar_url && !dbProfile.avatar_url.includes('photo-1535713875002-d1d0cf377fde')
        ? dbProfile.avatar_url
        : '',
      banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
    };

    // Write to localStorage (USER-SCOPED ONLY)
    const profileKey = `buyoh_user_profile_${user.id}`;
    localStorage.setItem(profileKey, JSON.stringify(cloudProfile));
    if (cloudProfile.name) {
      localStorage.setItem(`buyoh_user_name_${user.id}`, cloudProfile.name);
    }
    if (cloudProfile.phone) {
      localStorage.setItem(`buyoh_user_phone_${user.id}`, cloudProfile.phone);
    }
    if (cloudProfile.whatsapp) {
      localStorage.setItem(`buyoh_user_whatsapp_${user.id}`, cloudProfile.whatsapp);
    }
    if (cloudProfile.location) {
      localStorage.setItem(`buyoh_user_location_${user.id}`, cloudProfile.location);
    }
    if (cloudProfile.avatar) {
      localStorage.setItem(`buyoh_user_avatar_${user.id}`, cloudProfile.avatar);
    }

    // Notify Profile view to re-render with fresh data
    window.dispatchEvent(new CustomEvent('buyoh_profile_updated', { detail: cloudProfile }));
    if (cloudProfile.avatar) {
      window.dispatchEvent(new CustomEvent('buyoh_avatar_updated', { detail: cloudProfile.avatar }));
    }

    // --- 2. Merge & sync my_listings ---
    const cloudListings = Array.isArray(dbProfile.my_listings) ? dbProfile.my_listings : [];
    const localListings = getMyListingsForUser(user);
    const cloudIds = new Set(cloudListings.map(l => String(l.id)));
    const onlyLocal = localListings.filter(l => !cloudIds.has(String(l.id)));

    let mergedListings = cloudListings;
    let listingsNeedCloudPush = false;
    if (onlyLocal.length > 0) {
      // Local device has listings not yet in cloud — merge and push
      mergedListings = [...onlyLocal, ...cloudListings];
      listingsNeedCloudPush = true;
    }

    const listingsKey = `buyoh_my_listings_${user.id}`;
    localStorage.setItem(listingsKey, JSON.stringify(mergedListings));

    // Rebuild public pool
    try {
      const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
      let publicPool = safeJsonParse(rawPublic, []);
      if (!Array.isArray(publicPool)) publicPool = [];
      publicPool = publicPool.filter(p => p.sellerId !== user.id);
      publicPool = [...mergedListings, ...publicPool];
      localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));

    if (listingsNeedCloudPush && session?.access_token) {
      // Push merged listings back to cloud with upsert
      supabase.from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          my_listings: mergedListings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .then(({ error: e }) => {
          if (e) console.warn('syncUserDataFromCloud: listings push error', e.message);
        });
    }

    // --- 3. Merge & sync saved_items ---
    const cloudSaved = Array.isArray(dbProfile.saved_items) ? dbProfile.saved_items : [];
    const localSaved = getSavedItemsForUser(user);
    const cloudSavedIds = new Set(cloudSaved.map(s => String(typeof s === 'object' ? s.id : s)));
    const onlyLocalSaved = localSaved.filter(s => {
      const id = String(typeof s === 'object' ? s.id : s);
      return !cloudSavedIds.has(id);
    });

    let mergedSaved = cloudSaved;
    let savedNeedCloudPush = false;
    if (onlyLocalSaved.length > 0) {
      mergedSaved = [...onlyLocalSaved, ...cloudSaved];
      savedNeedCloudPush = true;
    }

    const savedKey = `buyoh_saved_items_${user.id}`;
    localStorage.setItem(savedKey, JSON.stringify(mergedSaved));
    window.dispatchEvent(new CustomEvent('buyoh_saved_updated'));

    if (savedNeedCloudPush && session?.access_token) {
      supabase.from('profiles')
        .update({ saved_items: mergedSaved, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error: e }) => {
          if (e) console.warn('syncUserDataFromCloud: saved_items push error', e.message);
        });
    }

    // --- 4. Merge & sync notifications ---
    const cloudNotifs = Array.isArray(dbProfile.notifications) ? dbProfile.notifications : [];
    const localNotifs = getNotificationsForUser(user);
    const cloudNotifIds = new Set(cloudNotifs.map(n => String(n.id)));
    const onlyLocalNotifs = localNotifs.filter(n => n.id && !cloudNotifIds.has(String(n.id)));

    let mergedNotifs = cloudNotifs;
    let notifsNeedCloudPush = false;
    if (onlyLocalNotifs.length > 0) {
      mergedNotifs = [...onlyLocalNotifs, ...cloudNotifs];
      notifsNeedCloudPush = true;
    }

    const notifKey = `buyoh_notifications_${user.id}`;
    localStorage.setItem(notifKey, JSON.stringify(mergedNotifs));
    window.dispatchEvent(new CustomEvent('buyoh_notifications_updated'));

    if (notifsNeedCloudPush && session?.access_token) {
      supabase.from('profiles')
        .update({ notifications: mergedNotifs, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error: e }) => {
          if (e) console.warn('syncUserDataFromCloud: notifications push error', e.message);
        });
    }

    // --- 5. Merge & sync followed_sellers ---
    const cloudFollowed = Array.isArray(dbProfile.followed_sellers) ? dbProfile.followed_sellers : [];
    const localFollowed = getFollowedSellersForUser(user);
    const cloudFollowedIds = new Set(cloudFollowed.map(f => String(typeof f === 'object' ? (f.id || f) : f)));
    const onlyLocalFollowed = localFollowed.filter(f => {
      const id = String(typeof f === 'object' ? (f.id || f) : f);
      return !cloudFollowedIds.has(id);
    });
    let mergedFollowed = cloudFollowed;
    if (onlyLocalFollowed.length > 0) {
      mergedFollowed = [...onlyLocalFollowed, ...cloudFollowed];
    }
    const followedKey = `buyoh_followed_sellers_${user.id}`;
    localStorage.setItem(followedKey, JSON.stringify(mergedFollowed));

    // --- 6. Sync all public marketplace listings from cloud profiles in background ---
    syncAllPublicListingsFromCloud().catch(() => {});

  } catch (err) {
    console.warn('syncUserDataFromCloud error:', err);
  }
};

/**
 * initUserRealtimeSync(user)
 *
 * Opens a Supabase Realtime WebSocket channel that listens for any UPDATE to
 * this user's row in public.profiles.
 *
 * When Device A saves new data → Supabase broadcasts the change → Device B's
 * realtime handler fires → local storage is updated → custom events trigger
 * UI re-render. No manual refresh needed.
 *
 * Returns a cleanup function that unsubscribes the channel.
 */
export const initUserRealtimeSync = (user) => {
  if (!user?.id || typeof window === 'undefined') return () => {};

  // Avoid duplicate channels for the same user
  if (_realtimeChannels[user.id]) {
    return () => {};
  }

  const channelName = `cross-device-sync-${user.id}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      },
      async (payload) => {
        if (!payload.new) return;
        const row = payload.new;

        // Update profile fields in localStorage
        const updatedProfile = {
          name: row.full_name || row.name || 'Marketplace User',
          email: row.email || user.email || '',
          phone: row.phone || '',
          whatsapp: row.whatsapp || row.phone || '',
          location: row.location || 'Lagos, Nigeria',
          avatar: row.avatar_url && !row.avatar_url.includes('photo-1535713875002-d1d0cf377fde')
            ? row.avatar_url : '',
          banner: 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)'
        };

        localStorage.setItem(`buyoh_user_profile_${user.id}`, JSON.stringify(updatedProfile));
        if (updatedProfile.name) {
          localStorage.setItem(`buyoh_user_name_${user.id}`, updatedProfile.name);
        }
        if (updatedProfile.phone) {
          localStorage.setItem(`buyoh_user_phone_${user.id}`, updatedProfile.phone);
        }
        if (updatedProfile.whatsapp) {
          localStorage.setItem(`buyoh_user_whatsapp_${user.id}`, updatedProfile.whatsapp);
        }
        if (updatedProfile.location) {
          localStorage.setItem(`buyoh_user_location_${user.id}`, updatedProfile.location);
        }
        if (updatedProfile.avatar) {
          localStorage.setItem(`buyoh_user_avatar_${user.id}`, updatedProfile.avatar);
          window.dispatchEvent(new CustomEvent('buyoh_avatar_updated', { detail: updatedProfile.avatar }));
        }
        window.dispatchEvent(new CustomEvent('buyoh_profile_updated', { detail: updatedProfile }));

        // Update listings
        if (Array.isArray(row.my_listings)) {
          localStorage.setItem(`buyoh_my_listings_${user.id}`, JSON.stringify(row.my_listings));
          // Rebuild public pool
          try {
            const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
            let publicPool = safeJsonParse(rawPublic, []);
            if (!Array.isArray(publicPool)) publicPool = [];
            publicPool = publicPool.filter(p => p.sellerId !== user.id);
            publicPool = [...row.my_listings, ...publicPool];
            localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
        }

        // Update saved items
        if (Array.isArray(row.saved_items)) {
          localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(row.saved_items));
          window.dispatchEvent(new CustomEvent('buyoh_saved_updated'));
        }

        // Update notifications
        if (Array.isArray(row.notifications)) {
          localStorage.setItem(`buyoh_notifications_${user.id}`, JSON.stringify(row.notifications));
          window.dispatchEvent(new CustomEvent('buyoh_notifications_updated'));
        }

        // Update followed sellers
        if (Array.isArray(row.followed_sellers)) {
          localStorage.setItem(`buyoh_followed_sellers_${user.id}`, JSON.stringify(row.followed_sellers));
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[InfiBuy Realtime] Cross-device sync active for user ${user.id}`);
      }
    });

  _realtimeChannels[user.id] = channel;

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
    delete _realtimeChannels[user.id];
  };
};

/**
 * cleanupUserRealtimeSync(userId)
 * Call this on logout to remove the Realtime channel for the given user.
 */
export const cleanupUserRealtimeSync = (userId) => {
  if (!userId) return;
  const ch = _realtimeChannels[userId];
  if (ch) {
    supabase.removeChannel(ch);
    delete _realtimeChannels[userId];
  }
};

/**
 * initWindowFocusSync(user)
 *
 * Registers window focus + Page Visibility API listeners so data syncs
 * automatically whenever the user switches back to the InfiBuy tab or
 * unlocks their phone (which triggers a visibilitychange to 'visible').
 *
 * This is critical for mobile: phones suspend background tasks, so
 * realtime sockets may have been dropped. On visibility restore we run
 * a full pull sync to guarantee freshness.
 *
 * Returns a cleanup function to remove the listeners.
 */
export const initWindowFocusSync = (user) => {
  if (!user?.id || typeof window === 'undefined') return () => {};

  let syncTimeout = null;

  const triggerSync = () => {
    // Debounce: only run once if the events fire rapidly together
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncUserDataFromCloud(user).catch(() => {});
      syncAllPublicListingsFromCloud().catch(() => {});
    }, 500);
  };

  const onFocus = () => triggerSync();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') triggerSync();
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearTimeout(syncTimeout);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};

// Auto-trigger background public listings sync on startup in browser environment
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncAllPublicListingsFromCloud().catch(() => {});
  }, 100);
}
