import { supabase } from '../lib/supabaseClient';

/**
 * Utility functions to manage user-scoped data (saved adverts, my listings, etc.)
 * and synchronize data seamlessly with Supabase user_metadata across devices.
 */

// --- SAVED ADVERTS SYNC ---

export const getSavedItemsForUser = (user) => {
  if (!user) {
    try {
      return JSON.parse(localStorage.getItem('buyoh_saved_items_v1')) || [];
    } catch (e) {
      return [];
    }
  }

  // 1. Check local user-scoped storage key first (reflects user's immediate additions & removals)
  try {
    const local = localStorage.getItem(`buyoh_saved_items_${user.id}`);
    if (local !== null) {
      const parsed = JSON.parse(local);
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
    if (legacy !== null) {
      const parsedLegacy = JSON.parse(legacy);
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
  if (!user) {
    try {
      return JSON.parse(localStorage.getItem('buyoh_my_listings_v1')) || [];
    } catch (e) {
      return [];
    }
  }

  // 1. Check local user-scoped storage key first
  try {
    const local = localStorage.getItem(`buyoh_my_listings_${user.id}`);
    if (local !== null) {
      const parsed = JSON.parse(local) || [];
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
      const parsed = JSON.parse(legacy) || [];
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
  const sanitizedListings = Array.isArray(listings) ? listings : [];
  if (user && user.id) {
    const userKey = `buyoh_my_listings_${user.id}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(sanitizedListings));
      localStorage.setItem('buyoh_my_listings_v1', JSON.stringify(sanitizedListings));
      if (user.user_metadata) {
        user.user_metadata.my_listings = sanitizedListings;
      }
      sanitizedListings.forEach(item => registerPublicListing(item));

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
      sanitizedListings.forEach(item => registerPublicListing(item));
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
    } catch (e) {
      console.error("Error saving guest listings:", e);
    }
  }
};

// --- GLOBAL PUBLIC MARKETPLACE LISTINGS SYNC ---

export const registerPublicListing = (newListing) => {
  if (!newListing || !newListing.id) return;
  try {
    const raw = localStorage.getItem('buyoh_public_listings_v1');
    let publicListings = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(publicListings)) publicListings = [];
    
    // Deduplicate by ID
    const existsIndex = publicListings.findIndex(p => p.id === newListing.id);
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
  
  try {
    const raw = localStorage.getItem('buyoh_public_listings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) publicPool = parsed;
    }
  } catch (e) {
    console.error("Error reading public listings pool:", e);
  }

  // If user is logged in, sync user's cloud listings into public pool
  if (user) {
    const userListings = getMyListingsForUser(user);
    if (Array.isArray(userListings) && userListings.length > 0) {
      let updated = false;
      userListings.forEach(item => {
        if (!publicPool.some(p => p.id === item.id)) {
          publicPool.unshift(item);
          updated = true;
        }
      });
      if (updated) {
        try {
          localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(publicPool));
        } catch (e) {}
      }
    }
  }

  return publicPool;
};
