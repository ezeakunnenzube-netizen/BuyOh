import { supabase } from '../lib/supabaseClient';
import { products } from '../data/productData';

/**
 * Utility functions to manage user-scoped data (saved adverts, my listings, etc.)
 * and synchronize data seamlessly with Supabase user_metadata across devices.
 */

export const safeJsonParse = (val, fallback = []) => {
  if (!val || typeof val !== 'string') return fallback;
  try {
    const res = JSON.parse(val);
    return res !== null && res !== undefined ? res : fallback;
  } catch (e) {
    return fallback;
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

  // 1. Check local user-scoped storage key first (reflects user's immediate additions & removals)
  try {
    const local = localStorage.getItem(`buyoh_saved_items_${user.id}`);
    if (local !== null && local !== undefined) {
      const parsed = safeJsonParse(local, null);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading user saved items:", e);
  }

  // 2. Fallback to Supabase cloud user_metadata on initial load/new device
  const cloudSaved = user.user_metadata?.saved_items;
  if (Array.isArray(cloudSaved) && cloudSaved.length > 0) {
    try {
      localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(cloudSaved));
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(cloudSaved));
    } catch (e) {}
    return cloudSaved;
  }

  // 3. Fallback to legacy un-scoped local storage key if migrating
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
      // Update in-memory user_metadata so any references to user.user_metadata are also updated
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
    await supabase.auth.updateUser({
      data: {
        saved_items: items
      }
    });
  } catch (err) {
    console.error("Error syncing saved items to Supabase cloud:", err);
  }
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

  // 1. Check local user-scoped storage key first
  try {
    const local = localStorage.getItem(`buyoh_my_listings_${user.id}`);
    if (local !== null && local !== undefined) {
      const parsed = safeJsonParse(local, []);
      parsed.forEach(item => registerPublicListing(item));
      return parsed;
    }
  } catch (e) {
    console.error("Error loading user listings:", e);
  }

  // 2. Fallback to cloud user_metadata on first login/device
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
  } catch (e) {
    console.error("Error loading user listings:", e);
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
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(sanitizedListings));
      if (user.user_metadata) {
        user.user_metadata.my_listings = sanitizedListings;
      }
      
      // Update public pool: Remove user's listings and add updated ones
      try {
        const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
        let publicPool = safeJsonParse(rawPublic, []);
        if (!Array.isArray(publicPool)) publicPool = [];
        
        // Remove any old listings by this user
        publicPool = publicPool.filter(p => p.sellerId !== user.id);
        // Add updated ones
        publicPool = [...sanitizedListings, ...publicPool];
        
        localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
      } catch (e) {
        console.error("Error updating public pool during saveMyListingsForUser:", e);
      }

      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
      await supabase.auth.updateUser({
        data: {
          my_listings: sanitizedListings
        }
      });
    } catch (e) {
      console.error("Error saving user listings:", e);
    }
  } else {
    try {
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(sanitizedListings));
      
      // Update public pool for guest deletion
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

// --- GLOBAL PUBLIC MARKETPLACE LISTINGS SYNC ---

export const registerPublicListing = (newListing) => {
  if (typeof window === 'undefined') return;
  if (!newListing || !newListing.id) return;
  try {
    const raw = localStorage.getItem('buyoh_public_listings_v1');
    let publicListings = safeJsonParse(raw, []);
    if (!Array.isArray(publicListings)) publicListings = [];
    
    // Deduplicate by ID
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

  // If user is logged in, sync user's cloud listings into public pool and prune deleted ones
  if (user) {
    const userListings = getMyListingsForUser(user);
    const userListingIds = new Set(userListings.map(item => String(item.id)));

    // 1. Filter out any listing belonging to the user that is no longer in their active listings
    publicPool = publicPool.filter(p => {
      const isUserListing = (p.sellerId && String(p.sellerId) === String(user.id)) || 
                            (p.sellerEmail && String(p.sellerEmail) === String(user.email));
      if (isUserListing) {
        return userListingIds.has(String(p.id));
      }
      return true;
    });

    // 2. Ensure all active user listings are present in the public pool
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
