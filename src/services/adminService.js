import { supabase } from '../lib/supabaseClient';
import { safeJsonParse } from '../utils/userSync';
import { products } from '../data/productData';

const AUDIT_LOG_KEY = 'infibuy_admin_audit_logs_v1';
const BLOCKED_USERS_KEY = 'infibuy_blocked_users_v1';
const ADMIN_REPORTS_KEY = 'infibuy_admin_reports_v1';

// Initial sample reports so store owners have tangible cases to review out of the box
const INITIAL_REPORTS = [
  {
    id: 'rep-001',
    listingId: 'p-1',
    listingTitle: 'Sony PlayStation 5 Disc Edition + 2 Controllers',
    reportedUserId: 'seller-demo-1',
    reportedUserName: 'Chinedu Electronics',
    reporterName: 'Emeka Okafor',
    reason: 'Suspicious / Fake Seller',
    details: 'Seller requested direct bank transfer outside InfiBuy before shipping the console.',
    status: 'pending', // 'pending' | 'actioned' | 'dismissed'
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'rep-002',
    listingId: 'p-2',
    listingTitle: 'Toyota Corolla 2018 Clean Title',
    reportedUserId: 'seller-demo-2',
    reportedUserName: 'AutoDeals Lekki',
    reporterName: 'Amina Bello',
    reason: 'Misleading Price',
    details: 'The listed price is ₦7.5M but seller quoted ₦12M when contacted via phone.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
  }
];

export const getAuditLogs = () => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(AUDIT_LOG_KEY);
  return safeJsonParse(raw, []);
};

export const logAdminAction = (action, details, target = '') => {
  if (typeof window === 'undefined') return;
  const existing = getAuditLogs();
  const entry = {
    id: `log-${Date.now()}`,
    action,
    details,
    target,
    admin: 'Store Owner',
    timestamp: new Date().toISOString()
  };
  const updated = [entry, ...existing].slice(0, 100); // keep recent 100
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('infibuy_admin_updated'));
  } catch (e) {}
  return entry;
};

export const getBlockedUsersMap = () => {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(BLOCKED_USERS_KEY);
  return safeJsonParse(raw, {});
};

/**
 * Fetch all users across Supabase profiles, public listings, and local storage
 */
export const getAllUsers = async () => {
  const usersMap = new Map();
  const blockedMap = getBlockedUsersMap();

  // 1. Fetch from Supabase profiles
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, name, email, phone, whatsapp, location, avatar_url, created_at, updated_at, my_listings');

    if (!error && Array.isArray(profiles)) {
      profiles.forEach(p => {
        if (!p.id) return;
        const isBlocked = Boolean(blockedMap[p.id]?.isBlocked);
        const listingsCount = Array.isArray(p.my_listings) ? p.my_listings.length : 0;
        usersMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.name || 'User',
          email: p.email || 'N/A',
          phone: p.phone || p.whatsapp || 'N/A',
          location: p.location || 'Lagos, Nigeria',
          avatar: p.avatar_url || '',
          joinedAt: p.created_at || new Date().toISOString(),
          listingsCount,
          isBlocked,
          blockedReason: blockedMap[p.id]?.reason || null,
          blockedAt: blockedMap[p.id]?.blockedAt || null
        });
      });
    }
  } catch (e) {
    console.warn('[Admin] Profiles cloud pull notice:', e);
  }

  // 2. Discover sellers from public marketplace pool
  try {
    if (typeof window !== 'undefined') {
      const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
      const publicListings = safeJsonParse(rawPublic, []);
      if (Array.isArray(publicListings)) {
        publicListings.forEach(item => {
          const sId = item.sellerId || item.userId;
          if (!sId) return;
          if (!usersMap.has(sId)) {
            const isBlocked = Boolean(blockedMap[sId]?.isBlocked);
            usersMap.set(sId, {
              id: sId,
              name: item.sellerName || 'Marketplace Seller',
              email: 'N/A',
              phone: item.sellerPhone || item.contactPhone || 'N/A',
              location: item.location || 'Lagos, Nigeria',
              avatar: item.sellerAvatar || '',
              joinedAt: item.sellerCreatedAt || item.createdAt || new Date().toISOString(),
              listingsCount: 1,
              isBlocked,
              blockedReason: blockedMap[sId]?.reason || null,
              blockedAt: blockedMap[sId]?.blockedAt || null
            });
          } else {
            const u = usersMap.get(sId);
            u.listingsCount = Math.max(u.listingsCount, 1);
          }
        });
      }
    }
  } catch (e) {}

  // 3. Fallback demo users if platform is brand new
  if (usersMap.size === 0) {
    usersMap.set('demo-user-1', {
      id: 'demo-user-1',
      name: 'Chinedu Electronics',
      email: 'chinedu.tech@gmail.com',
      phone: '+234 803 123 4567',
      location: 'Computer Village, Ikeja',
      avatar: '',
      joinedAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      listingsCount: 4,
      isBlocked: false
    });
    usersMap.set('demo-user-2', {
      id: 'demo-user-2',
      name: 'AutoDeals Lekki',
      email: 'sales@autodealslekki.ng',
      phone: '+234 812 987 6543',
      location: 'Lekki Phase 1, Lagos',
      avatar: '',
      joinedAt: new Date(Date.now() - 86400000 * 90).toISOString(),
      listingsCount: 7,
      isBlocked: false
    });
  }

  return Array.from(usersMap.values());
};

/**
 * Block a user and record ban reason
 */
export const blockUser = async (userId, reason = 'Violation of marketplace terms') => {
  if (!userId) return false;

  const blockedMap = getBlockedUsersMap();
  blockedMap[userId] = {
    isBlocked: true,
    reason,
    blockedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedMap));
  } catch (e) {}

  // Cloud sync
  try {
    await supabase
      .from('profiles')
      .update({
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (e) {}

  logAdminAction('BLOCK_USER', `User blocked. Reason: "${reason}"`, userId);
  return true;
};

/**
 * Unblock a previously suspended user
 */
export const unblockUser = async (userId) => {
  if (!userId) return false;

  const blockedMap = getBlockedUsersMap();
  delete blockedMap[userId];

  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedMap));
  } catch (e) {}

  try {
    await supabase
      .from('profiles')
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null
      })
      .eq('id', userId);
  } catch (e) {}

  logAdminAction('UNBLOCK_USER', 'User account reinstated & unblocked', userId);
  return true;
};

/**
 * Permanently delete a user account and optionally wipe their listings
 */
export const deleteUserAccount = async (userId, purgeListings = true) => {
  if (!userId) return false;

  // 1. Remove from local blocked tracking
  const blockedMap = getBlockedUsersMap();
  delete blockedMap[userId];
  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedMap));
  } catch (e) {}

  // 2. Remove user-scoped localStorage items
  try {
    localStorage.removeItem(`buyoh_my_listings_${userId}`);
    localStorage.removeItem(`buyoh_saved_items_${userId}`);
    localStorage.removeItem(`buyoh_notifications_${userId}`);
    localStorage.removeItem(`buyoh_user_profile_${userId}`);
  } catch (e) {}

  // 3. Purge user's listings from public marketplace pool
  if (purgeListings && typeof window !== 'undefined') {
    try {
      const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
      let pool = safeJsonParse(rawPublic, []);
      if (Array.isArray(pool)) {
        pool = pool.filter(item => (item.sellerId !== userId && item.userId !== userId));
        localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(pool));
        window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
      }
    } catch (e) {}
  }

  // 4. Cloud delete
  try {
    await supabase.from('profiles').delete().eq('id', userId);
  } catch (e) {}

  logAdminAction('DELETE_USER', `Permanently deleted user account${purgeListings ? ' & purged listings' : ''}`, userId);
  return true;
};

/**
 * Fetch all marketplace listings for admin moderation
 */
export const getAllAdminListings = () => {
  if (typeof window === 'undefined') return products;

  const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
  const userListings = safeJsonParse(rawPublic, []);

  // Merge static catalog products with user-posted listings
  const combined = [...(Array.isArray(userListings) ? userListings : []), ...products];
  const uniqueMap = new Map();
  combined.forEach(p => {
    if (p && p.id && !uniqueMap.has(String(p.id))) {
      uniqueMap.set(String(p.id), {
        ...p,
        status: p.status || 'active',
        isPromoted: Boolean(p.isPromoted || p.promoted)
      });
    }
  });

  return Array.from(uniqueMap.values());
};

/**
 * Remove / Take Down a listing (Moderator action)
 */
export const removeListing = (listingId, reason = 'Content violation') => {
  if (!listingId || typeof window === 'undefined') return false;

  const strId = String(listingId);
  try {
    const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
    let pool = safeJsonParse(rawPublic, []);
    if (Array.isArray(pool)) {
      pool = pool.map(item => {
        if (String(item.id) === strId) {
          return { ...item, status: 'removed', removeReason: reason };
        }
        return item;
      });
      localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(pool));
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
    }
  } catch (e) {}

  logAdminAction('REMOVE_LISTING', `Removed advert ID ${strId}. Reason: "${reason}"`, strId);
  return true;
};

/**
 * Restore a removed listing
 */
export const restoreListing = (listingId) => {
  if (!listingId || typeof window === 'undefined') return false;

  const strId = String(listingId);
  try {
    const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
    let pool = safeJsonParse(rawPublic, []);
    if (Array.isArray(pool)) {
      pool = pool.map(item => {
        if (String(item.id) === strId) {
          return { ...item, status: 'active', removeReason: null };
        }
        return item;
      });
      localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(pool));
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
    }
  } catch (e) {}

  logAdminAction('RESTORE_LISTING', `Restored advert ID ${strId} to active status`, strId);
  return true;
};

/**
 * Toggle featured / promoted boost on a listing
 */
export const togglePromoteListing = (listingId) => {
  if (!listingId || typeof window === 'undefined') return false;

  const strId = String(listingId);
  let newStatus = false;
  try {
    const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
    let pool = safeJsonParse(rawPublic, []);
    if (Array.isArray(pool)) {
      pool = pool.map(item => {
        if (String(item.id) === strId) {
          newStatus = !Boolean(item.isPromoted || item.promoted);
          return { ...item, isPromoted: newStatus, promoted: newStatus };
        }
        return item;
      });
      localStorage.setItem('buyoh_public_listings_v1', JSON.stringify(pool));
      window.dispatchEvent(new CustomEvent('buyoh_listings_updated'));
    }
  } catch (e) {}

  logAdminAction('TOGGLE_PROMOTION', `${newStatus ? 'Promoted (VIP Boosted)' : 'Unpromoted'} listing ID ${strId}`, strId);
  return newStatus;
};

/**
 * Fetch abuse and scam report tickets
 */
export const getAbuseReports = () => {
  if (typeof window === 'undefined') return INITIAL_REPORTS;
  const raw = localStorage.getItem(ADMIN_REPORTS_KEY);
  const parsed = safeJsonParse(raw, null);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  return INITIAL_REPORTS;
};

export const saveAbuseReports = (reports) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_REPORTS_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent('infibuy_admin_updated'));
  } catch (e) {}
};

/**
 * Resolve an abuse report ticket
 */
export const resolveReportTicket = (reportId, action = 'dismissed', notes = '') => {
  const reports = getAbuseReports();
  const updated = reports.map(r => {
    if (r.id === reportId) {
      return { ...r, status: action, resolutionNotes: notes, resolvedAt: new Date().toISOString() };
    }
    return r;
  });
  saveAbuseReports(updated);
  logAdminAction('RESOLVE_REPORT', `Report ${reportId} marked as ${action.toUpperCase()}${notes ? ': ' + notes : ''}`, reportId);
  return updated;
};
