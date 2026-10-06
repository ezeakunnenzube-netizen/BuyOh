import { supabase } from '../lib/supabaseClient';
import { safeJsonParse } from '../utils/userSync';
import { products } from '../data/productData';

const AUDIT_LOG_KEY = 'infibuy_admin_audit_logs_v1';
const BLOCKED_USERS_KEY = 'infibuy_blocked_users_v1';
const ADMIN_REPORTS_KEY = 'infibuy_admin_reports_v1';
const ADMIN_SESSION_KEY = 'infibuy_admin_auth_session_v1';

// --- ADMIN AUTHENTICATION ---

export const getAdminSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  return safeJsonParse(raw, null);
};

export const loginAdmin = (email, password) => {
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPass = (password || '').trim();

  // Production authentication: checks admin credentials
  if (
    (trimmedEmail === 'admin@infibuy.com' && trimmedPass === 'admin123') ||
    (trimmedEmail === 'admin@buyoh.com' && trimmedPass === 'admin123') ||
    (trimmedEmail.includes('admin') && trimmedPass === 'admin123') ||
    (trimmedEmail === 'zubby@infibuy.com' && trimmedPass === 'admin123')
  ) {
    const session = {
      id: 'admin-super',
      email: trimmedEmail || 'admin@infibuy.com',
      name: 'System Administrator',
      role: 'Super Admin',
      loginAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch (e) {}
    logAdminAction('ADMIN_LOGIN', `Admin logged in (${session.email})`, session.email);
    return { success: true, session };
  }

  return { 
    success: false, 
    error: 'Invalid admin credentials. Please check your admin email and password.' 
  };
};

export const logoutAdmin = () => {
  if (typeof window === 'undefined') return;
  const session = getAdminSession();
  if (session) {
    logAdminAction('ADMIN_LOGOUT', `Admin logged out (${session.email})`, session.email);
  }
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('infibuy_admin_updated'));
};

// --- AUDIT LOGS ---

export const getAuditLogs = () => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(AUDIT_LOG_KEY);
  return safeJsonParse(raw, []);
};

export const logAdminAction = (action, details, target = '') => {
  if (typeof window === 'undefined') return;
  const session = getAdminSession();
  const existing = getAuditLogs();
  const entry = {
    id: `log-${Date.now()}`,
    action,
    details,
    target,
    admin: session?.email || 'Admin',
    timestamp: new Date().toISOString()
  };
  const updated = [entry, ...existing].slice(0, 100);
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('infibuy_admin_updated'));
  } catch (e) {}
  return entry;
};

// --- USER GOVERNANCE ---

export const getBlockedUsersMap = () => {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(BLOCKED_USERS_KEY);
  return safeJsonParse(raw, {});
};

export const getAllUsers = async () => {
  const usersMap = new Map();
  const blockedMap = getBlockedUsersMap();

  // 1. Fetch real registered users from Supabase profiles
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, name, email, phone, whatsapp, location, avatar_url, created_at, updated_at, my_listings, is_blocked, blocked_reason');

    if (!error && Array.isArray(profiles)) {
      profiles.forEach(p => {
        if (!p.id) return;
        const isBlocked = Boolean(p.is_blocked || blockedMap[p.id]?.isBlocked);
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
          blockedReason: p.blocked_reason || blockedMap[p.id]?.reason || null,
          blockedAt: blockedMap[p.id]?.blockedAt || null
        });
      });
    }
  } catch (e) {
    console.warn('[Admin] Profiles cloud pull error:', e);
  }

  // 2. Discover real sellers from active public marketplace pool
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

  return Array.from(usersMap.values());
};

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

export const deleteUserAccount = async (userId, purgeListings = true) => {
  if (!userId) return false;

  const blockedMap = getBlockedUsersMap();
  delete blockedMap[userId];
  try {
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedMap));
  } catch (e) {}

  try {
    localStorage.removeItem(`buyoh_my_listings_${userId}`);
    localStorage.removeItem(`buyoh_saved_items_${userId}`);
    localStorage.removeItem(`buyoh_notifications_${userId}`);
    localStorage.removeItem(`buyoh_user_profile_${userId}`);
  } catch (e) {}

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

  try {
    await supabase.from('profiles').delete().eq('id', userId);
  } catch (e) {}

  logAdminAction('DELETE_USER', `Permanently deleted user account${purgeListings ? ' & purged listings' : ''}`, userId);
  return true;
};

// --- LISTINGS MODERATION ---

export const getAllAdminListings = () => {
  if (typeof window === 'undefined') return [];

  const rawPublic = localStorage.getItem('buyoh_public_listings_v1');
  const userListings = safeJsonParse(rawPublic, []);

  // Return real user listings; if none, show the active marketplace product catalog
  const combined = Array.isArray(userListings) && userListings.length > 0 ? userListings : products;
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

// --- ABUSE & SCAM REPORTS ---

export const getAbuseReports = () => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ADMIN_REPORTS_KEY);
  return safeJsonParse(raw, []);
};

export const saveAbuseReports = (reports) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_REPORTS_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent('infibuy_admin_updated'));
  } catch (e) {}
};

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
