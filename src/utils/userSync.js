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

  // 1. Check Supabase cloud user_metadata first (for cross-device sync)
  const cloudSaved = user.user_metadata?.saved_items;
  if (Array.isArray(cloudSaved) && cloudSaved.length > 0) {
    try {
      localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(cloudSaved));
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(cloudSaved));
    } catch (e) {}
    return cloudSaved;
  }

  // 2. Fallback to local user-scoped storage key
  try {
    const local = localStorage.getItem(`buyoh_saved_items_${user.id}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        syncSavedItemsToCloud(user, parsed);
        return parsed;
      }
    }

    // 3. Fallback to legacy un-scoped local storage key if migrating
    const legacy = localStorage.getItem('buyoh_saved_items_v1');
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        localStorage.setItem(`buyoh_saved_items_${user.id}`, JSON.stringify(parsedLegacy));
        syncSavedItemsToCloud(user, parsedLegacy);
        return parsedLegacy;
      }
    }
  } catch (e) {
    console.error("Error loading user saved items:", e);
  }

  return [];
};

export const saveItemsForUser = async (user, items) => {
  const sanitizedItems = Array.isArray(items) ? items : [];
  
  if (user && user.id) {
    const userKey = `buyoh_saved_items_${user.id}`;
    try {
      localStorage.setItem(userKey, JSON.stringify(sanitizedItems));
      localStorage.setItem('buyoh_saved_items_v1', JSON.stringify(sanitizedItems));
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

  const cloudListings = user.user_metadata?.my_listings;
  if (Array.isArray(cloudListings) && cloudListings.length > 0) {
    try {
      localStorage.setItem(`buyoh_my_listings_${user.id}`, JSON.stringify(cloudListings));
    } catch (e) {}
    return cloudListings;
  }

  try {
    const local = localStorage.getItem(`buyoh_my_listings_${user.id}`);
    if (local) {
      return JSON.parse(local) || [];
    }
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
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
    } catch (e) {
      console.error("Error saving guest listings:", e);
    }
  }
};
