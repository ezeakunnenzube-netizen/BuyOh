import { supabase } from '../lib/supabaseClient.js';
import { getGeneralProductPool } from '../utils/userSync';

/**
 * Shared realtime channel singleton.
 * Supabase requires a channel to be subscribed before broadcasts can be sent.
 * All broadcast functions reuse this channel.
 */
let _sharedChannel = null;
let _sharedChannelReady = false;
let _sharedChannelSubscribers = 0;

/**
 * Cross-tab BroadcastChannel for 0ms latency sync across windows & tabs
 */
let _localBroadcastChannel = null;
const getLocalBroadcastChannel = () => {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
    if (!_localBroadcastChannel) {
      try {
        _localBroadcastChannel = new window.BroadcastChannel('buyoh-chat-sync');
      } catch (e) {}
    }
  }
  return _localBroadcastChannel;
};

export function getSharedChannel() {
  return initOrGetSharedChannel();
}

export function setSharedChannel(channel) {
  _sharedChannel = channel;
  _sharedChannelReady = true;
}

const safeBroadcast = async (event, payload) => {
  // 1. Broadcast via local BroadcastChannel for instant same-browser cross-tab delivery
  try {
    const localBc = getLocalBroadcastChannel();
    if (localBc) {
      localBc.postMessage({ type: 'broadcast', event, payload });
    }
  } catch (e) {}

  // 2. Broadcast via Supabase Realtime WebSocket for cross-browser & cross-device delivery
  try {
    const channel = getSharedChannel();
    if (_sharedChannelReady) {
      await channel.send({ type: 'broadcast', event, payload });
    } else {
      // Channel may be connecting; retry every 150ms up to 20 times (~3s)
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts++;
        if (_sharedChannelReady || attempts > 20) {
          clearInterval(timer);
          try {
            await channel.send({ type: 'broadcast', event, payload });
          } catch (e) {
            console.warn('[chatService] Delayed broadcast warning:', e);
          }
        }
      }, 150);
    }
  } catch (e) {
    console.warn('[chatService] Broadcast error:', e);
  }
};

/**
 * Helper to convert Blob or File to Base64 data URL as zero-dependency fallback
 */
const blobToDataUrl = (blob) => {
  return new Promise((resolve) => {
    try {
      if (!blob || typeof FileReader === 'undefined') {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    } catch (e) {
      resolve(null);
    }
  });
};

/**
 * Upload a file (voice note or image) to Supabase Storage chat-attachments bucket.
 * Returns the public URL, or falls back to a base64 Data URL if bucket does not exist.
 */
export const uploadChatAttachment = async (file, conversationId, senderId, type = 'image') => {
  if (!file || !conversationId || !senderId) return null;
  try {
    const ext = type === 'voice' ? 'webm' : (file.name?.split('.').pop() || 'jpg');
    const path = `${toValidUUID(conversationId)}/${toValidUUID(senderId)}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: type === 'voice' ? 'audio/webm' : file.type || 'image/jpeg'
      });

    if (error) {
      console.warn('[chatService] Supabase storage upload notice:', error.message, '-> falling back to data URL');
      if (file.size && file.size < 3000000) {
        return await blobToDataUrl(file);
      }
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(data.path);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.warn('[chatService] Upload attachment exception:', e);
    return await blobToDataUrl(file);
  }
};

/**
 * Broadcast a typing indicator to the counterpart via Realtime.
 */
export const broadcastTyping = (conversationId, userId, userName = '') => {
  safeBroadcast('user_typing', {
    conversation_id: conversationId,
    user_id: userId,
    user_name: userName,
    timestamp: Date.now()
  });
};

/**
 * UUID verification and generation helpers
 */
export const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const toValidUUID = (input) => {
  if (!input) return generateUUID();
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
 * Deterministically construct a consistent conversation UUID for two users and an optional product.
 * Whether User A or User B calls this, the resulting UUID is 100% identical.
 */
export const buildDeterministicConversationId = (user1Id, user2Id, productId) => {
  const u1 = String(user1Id || '').toLowerCase().trim();
  const u2 = String(user2Id || '').toLowerCase().trim();
  const p = String(productId || 'general').trim();
  const sortedUsers = [u1, u2].sort().join(':');
  return toValidUUID(`${sortedUsers}:${p}`);
};

/**
 * Format relative last seen string
 */
export const formatLastSeen = (isoDate, isOnline = false) => {
  if (isOnline) return 'Online';
  if (!isoDate) return 'Offline';
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 3) return 'Active just now';
    if (diffMins < 60) return `Last seen ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Last seen yesterday';
    return `Last seen ${diffDays} days ago`;
  } catch (e) {
    return 'Offline';
  }
};

/**
 * Local storage caching helpers
 */
export const getCachedConversations = (userId) => {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`buyoh_cloud_convs_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(c => normalizeConversation(c, userId)).filter(Boolean);
      }
    }
  } catch (e) {}
  return [];
};

export const saveCachedConversations = (userId, conversations) => {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`buyoh_cloud_convs_${userId}`, JSON.stringify(conversations));
    window.dispatchEvent(new CustomEvent('buyoh_conversations_updated', { detail: conversations }));
  } catch (e) {}
};

/**
 * Persist a single message to local cache for a user immediately (used for both send and receive)
 */
export const appendMessageToUserCache = (userId, conversationId, messageObj, conversationMeta = null) => {
  if (!userId || !conversationId || !messageObj || typeof window === 'undefined') return;

  try {
    const existingList = getCachedConversations(userId);
    const validConvId = toValidUUID(conversationId);
    let conv = existingList.find(c => c.id === conversationId || toValidUUID(c.id) === validConvId);

    if (conv) {
      // Append message if not already present
      if (!conv.messages.some(m => m.id === messageObj.id)) {
        conv.messages = [...conv.messages, messageObj];
        if (messageObj.sender === 'them' && messageObj.status !== 'read') {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
      }
      // Re-order: move this conversation to the top
      const updatedList = [conv, ...existingList.filter(c => c.id !== conv.id)];
      saveCachedConversations(userId, updatedList);
    } else if (conversationMeta) {
      // Create new conversation entry in local cache
      const newConv = normalizeConversation({
        ...conversationMeta,
        id: conversationId,
        messages: [messageObj],
        unread_count: messageObj.sender === 'them' ? 1 : 0
      }, userId);

      if (newConv) {
        saveCachedConversations(userId, [newConv, ...existingList]);
      }
    }
  } catch (e) {
    console.warn('[chatService] appendMessageToUserCache notice:', e);
  }
};

/**
 * Normalizes any conversation object to guarantee safe properties:
 * - c.id
 * - c.type ('buying' | 'selling')
 * - c.contact: { id, name, avatar, phone, whatsapp, location, isOnline, lastSeen, verified, rating, listingsCount }
 * - c.product: { id, name, price, image, condition }
 * - c.messages: array of { id, sender, text, timestamp, time, status, isOffer, offerAmount, audioUrl, duration }
 * - c.unreadCount: number
 * - c.isMuted: boolean
 */
export const normalizeConversation = (raw, currentUserId = null) => {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || generateUUID();
  const buyerId = raw.buyer_id || raw.buyerId || '';
  const sellerId = raw.seller_id || raw.sellerId || '';
  const currentUid = currentUserId ? String(currentUserId).toLowerCase() : '';
  const isSelling = currentUid && String(sellerId).toLowerCase() === currentUid;
  const isBuying = currentUid && String(buyerId).toLowerCase() === currentUid;
  const type = raw.type || (isSelling ? 'selling' : 'buying');

  // Contact resolution - counterpart is the other person
  const counterpartId = isSelling ? buyerId : (isBuying ? sellerId : (raw.contact?.id || sellerId || buyerId));

  let contact = {
    id: counterpartId,
    name: raw.contact?.name || raw.sellerName || raw.buyerName || (isSelling ? 'Interested Buyer' : 'Marketplace Seller'),
    avatar: raw.contact?.avatar || raw.sellerAvatar || raw.buyerAvatar || '',
    phone: raw.contact?.phone || raw.sellerPhone || raw.buyerPhone || '+234 800 000 0000',
    whatsapp: raw.contact?.whatsapp || raw.sellerWhatsApp || raw.buyerWhatsApp || '',
    location: raw.contact?.location || raw.sellerLocation || raw.buyerLocation || 'Nigeria',
    isOnline: raw.contact?.isOnline ?? false,
    lastSeen: raw.contact?.lastSeen || 'Recently',
    verified: raw.contact?.verified ?? false,
    rating: raw.contact?.rating || 5.0,
    memberSince: raw.contact?.memberSince || '5+ years on BuyOh',
    listings: Array.isArray(raw.contact?.listings) ? raw.contact.listings : []
  };

  // Product resolution
  let product = {
    id: raw.product?.id || raw.product_id || raw.productId || '',
    name: raw.product?.name || raw.productName || 'Marketplace Item',
    price: Number(raw.product?.price || raw.productPrice || 0),
    image: raw.product?.image || raw.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    condition: raw.product?.condition || 'Used'
  };

  // Messages resolution
  const rawMsgs = Array.isArray(raw.messages) ? raw.messages : [];
  const messages = rawMsgs.map(m => {
    const senderIdStr = String(m.sender_id || '').toLowerCase();
    const isMe = currentUid 
      ? (senderIdStr ? senderIdStr === currentUid : m.sender === 'me')
      : m.sender === 'me';

    const timestamp = m.timestamp ? Number(m.timestamp) : (m.created_at ? new Date(m.created_at).getTime() : Date.now());
    const time = m.time || (m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now');

    // Extract image if embedded in text as [image] URL
    let resolvedImage = m.image || null;
    let resolvedText = m.text || '';
    if (!resolvedImage && resolvedText.includes('[image]')) {
      const parts = resolvedText.split('[image]');
      resolvedText = parts[0].trim();
      resolvedImage = parts[1].trim();
    }

    return {
      id: m.id || generateUUID(),
      sender: isMe ? 'me' : 'them',
      sender_id: m.sender_id || (isMe ? currentUserId : contact.id),
      text: resolvedText,
      isOffer: Boolean(m.is_offer || m.isOffer),
      offerAmount: Number(m.offer_amount || m.offerAmount || 0),
      image: resolvedImage,
      audioUrl: m.audio_url || m.audioUrl || null,
      duration: m.duration || null,
      timestamp,
      time,
      status: m.status || 'sent'
    };
  });

  return {
    id: String(id),
    buyer_id: buyerId,
    seller_id: sellerId,
    product_id: product.id,
    type,
    contact,
    product,
    messages,
    unreadCount: Number(raw.unread_count || raw.unreadCount || 0),
    isMuted: Boolean(raw.is_muted || raw.isMuted)
  };
};

/**
 * Fetch all conversations for a user from Supabase, merging with cached local conversations
 */
export const fetchUserConversations = async (user) => {
  if (!user?.id) {
    return [];
  }

  const cached = getCachedConversations(user.id);

  try {
    // 1. Fetch conversations from Supabase
    // 1. Fetch conversations from Supabase
    let convRows = null;
    const { data: rows, error: errConv } = await supabase
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!errConv && Array.isArray(rows)) {
      convRows = rows;
    } else {
      if (errConv) console.warn('[chatService] fetchUserConversations notice:', errConv.message);
      convRows = [];
    }

    if (Array.isArray(convRows) && convRows.length > 0) {
      // 2. Fetch profiles for all counterparts
      const userUidLower = String(user.id).toLowerCase();
      const counterpartIds = [...new Set(
        convRows.map(c => {
          const bLower = String(c.buyer_id || '').toLowerCase();
          return bLower === userUidLower ? c.seller_id : c.buyer_id;
        }).filter(Boolean)
      )];
      
      let profileMap = {};
      if (counterpartIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, full_name, avatar_url, phone, whatsapp, location, verified, rating, updated_at, created_at, my_listings')
          .in('id', counterpartIds);

        if (profiles) {
          profiles.forEach(p => {
            profileMap[String(p.id).toLowerCase()] = p;
            profileMap[p.id] = p;
          });
        }
      }

      // 3. Fetch all messages for these conversations
      const convIds = convRows.map(c => c.id);
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true });

      const messagesByConv = {};
      if (allMessages) {
        allMessages.forEach(m => {
          if (!messagesByConv[m.conversation_id]) {
            messagesByConv[m.conversation_id] = [];
          }
          messagesByConv[m.conversation_id].push(m);
        });
      }

      // 4. Resolve products pool
      const generalPool = getGeneralProductPool(user);
      const productMap = {};
      generalPool.forEach(p => {
        productMap[String(p.id)] = p;
        if (p.id) {
          productMap[toValidUUID(p.id)] = p;
        }
      });

      // 5. Build normalized cloud list
      const cloudNormalized = convRows.map(row => {
        const isBuyer = String(row.buyer_id || '').toLowerCase() === userUidLower;
        const counterpartId = isBuyer ? row.seller_id : row.buyer_id;
        const profile = profileMap[String(counterpartId).toLowerCase()] || profileMap[counterpartId] || {};
        const prod = productMap[String(row.product_id)] || productMap[toValidUUID(row.product_id)] || {};

        let memberDuration = '5+ years on BuyOh';
        if (profile.created_at) {
          const yrs = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)));
          memberDuration = `${yrs}+ year${yrs > 1 ? 's' : ''} on BuyOh`;
        }

        // Merge messages from DB and local cache
        const dbMsgs = messagesByConv[row.id] || [];
        const localMatch = cached.find(c => c.id === row.id || toValidUUID(c.id) === toValidUUID(row.id));
        const localMsgs = localMatch ? localMatch.messages : [];

        // Union messages by ID
        const msgMap = new Map();
        [...localMsgs, ...dbMsgs].forEach(m => {
          if (m && m.id) msgMap.set(m.id, m);
        });
        const combinedMsgs = Array.from(msgMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        const rawObj = {
          id: row.id,
          buyer_id: row.buyer_id,
          seller_id: row.seller_id,
          product_id: row.product_id,
          unread_count: row.unread_count || 0,
          contact: {
            id: counterpartId,
            name: profile.full_name || profile.name || localMatch?.contact?.name || (isBuyer ? 'Marketplace Seller' : 'Interested Buyer'),
            avatar: profile.avatar_url || localMatch?.contact?.avatar || '',
            phone: profile.phone || localMatch?.contact?.phone || '+234 800 000 0000',
            whatsapp: profile.whatsapp || profile.phone || localMatch?.contact?.whatsapp || '',
            location: profile.location || localMatch?.contact?.location || 'Nigeria',
            isOnline: false,
            lastSeen: formatLastSeen(profile.updated_at, false),
            verified: Boolean(profile.verified),
            rating: profile.rating || 5.0,
            memberSince: memberDuration,
            listings: Array.isArray(profile.my_listings) ? profile.my_listings : []
          },
          product: {
            id: row.product_id,
            name: prod.name || localMatch?.product?.name || 'Listing Item',
            price: Number(prod.price || localMatch?.product?.price || 0),
            image: prod.image || localMatch?.product?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            condition: prod.condition || localMatch?.product?.condition || 'Used'
          },
          messages: combinedMsgs
        };

        return normalizeConversation(rawObj, user.id);
      }).filter(Boolean);

      // Merge any local-only conversations not yet in Supabase
      const cloudIds = new Set(cloudNormalized.map(c => toValidUUID(c.id)));
      const onlyLocal = cached.filter(c => !cloudIds.has(toValidUUID(c.id)));
      const merged = [...cloudNormalized, ...onlyLocal];

      saveCachedConversations(user.id, merged);
      return merged;
    }
  } catch (err) {
    console.error('[chatService] Fetch error:', err);
  }

  // If Supabase query failed or returned empty, return cached conversations
  return cached;
};

/**
 * Get or create a conversation with a deterministic UUID shared by both accounts
 */
export const getOrCreateConversation = async ({ user, sellerId, productId, productDetails }) => {
  if (!user?.id) {
    throw new Error('User must be signed in to start a conversation.');
  }

  // Prevent user from chatting with themselves
  if (sellerId && String(sellerId).toLowerCase() === String(user.id).toLowerCase()) {
    return { isSelf: true };
  }

  const validBuyerId = toValidUUID(user.id);
  const validSellerId = toValidUUID(sellerId || 'platform-seller');
  const validProductId = toValidUUID(productId || 'general-product');

  // Compute the deterministic conversation ID shared symmetrically by both participants
  const deterministicConvId = buildDeterministicConversationId(user.id, sellerId, productId);

  // Check if conversation already exists in local cache
  const cached = getCachedConversations(user.id);
  const existingLocal = cached.find(c => 
    c.id === deterministicConvId || 
    toValidUUID(c.id) === deterministicConvId ||
    (c.product_id === validProductId && (c.contact?.id === sellerId || c.contact?.id === validSellerId))
  );

  if (existingLocal) {
    return { conversationId: existingLocal.id, isNew: false };
  }

  try {
    // 1. Check if conversation already exists in Supabase
    const { data: existingRows } = await supabase
      .from('conversations')
      .select('*')
      .or(`id.eq.${deterministicConvId},and(buyer_id.eq.${validBuyerId},seller_id.eq.${validSellerId}),and(buyer_id.eq.${validSellerId},seller_id.eq.${validBuyerId})`)
      .limit(10);

    if (existingRows && existingRows.length > 0) {
      const match = existingRows.find(r => r.id === deterministicConvId || String(r.product_id).toLowerCase() === String(validProductId).toLowerCase()) || existingRows[0];
      return { conversationId: match.id, isNew: false };
    }

    // 2. Insert new conversation in Supabase with the deterministic UUID
    const insertPayload = {
      id: deterministicConvId,
      buyer_id: validBuyerId,
      seller_id: validSellerId,
      product_id: validProductId,
      unread_count: 0
    };

    const { data: inserted, error: insErr } = await supabase
      .from('conversations')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    if (insErr) {
      console.warn('[chatService] Insert conversation notice:', insErr.message);
    }

    return { conversationId: inserted?.id || deterministicConvId, isNew: true };
  } catch (err) {
    console.warn('[chatService] getOrCreateConversation exception:', err);
    return { conversationId: deterministicConvId, isNew: true, fallback: true };
  }
};

/**
 * Send a message to a conversation in Supabase + Broadcast in Realtime + Multi-tab sync.
 * Normal messaging app behavior: instant delivery, optimistic rendering, persistent local cache.
 */
export const sendMessage = async ({
  conversationId,
  senderId,
  senderName = '',
  senderAvatar = '',
  recipientId,
  text,
  isOffer = false,
  offerAmount = 0,
  audioUrl = null,
  image = null,
  duration = null,
  productInfo = null,
  isRecipientOnline = false
}) => {
  if (!conversationId || !senderId) return null;

  const validConvId = toValidUUID(conversationId);
  const validSenderId = toValidUUID(senderId);
  const validRecipientId = toValidUUID(recipientId || 'platform-seller');
  const validMsgId = generateUUID();
  const now = new Date();

  // Base payload matching standard public.messages schema
  const basePayload = {
    id: validMsgId,
    conversation_id: validConvId,
    sender_id: validSenderId,
    text: text || '',
    is_offer: Boolean(isOffer),
    offer_amount: Number(offerAmount) || 0,
    audio_url: audioUrl || null,
    duration: duration || null,
    image: image || null,
    status: isRecipientOnline ? 'delivered' : 'sent',
    created_at: now.toISOString()
  };

  // Immediate Local Cache update for sender
  const senderMessage = {
    id: validMsgId,
    sender: 'me',
    sender_id: validSenderId,
    text: text || '',
    isOffer: Boolean(isOffer),
    offerAmount: Number(offerAmount) || 0,
    audioUrl: audioUrl || null,
    duration: duration || null,
    image: image || null,
    status: isRecipientOnline ? 'delivered' : 'sent',
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: now.getTime()
  };

  appendMessageToUserCache(senderId, validConvId, senderMessage, {
    id: validConvId,
    buyer_id: validSenderId,
    seller_id: validRecipientId,
    product_id: productInfo?.id || '',
    contact: {
      id: recipientId,
      name: 'Recipient',
      avatar: ''
    },
    product: productInfo || { name: 'Marketplace Item' }
  });

  // Pre-flight check / insert parent conversation in Supabase
  try {
    const { data: convCheck } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', validConvId)
      .maybeSingle();

    if (!convCheck) {
      await supabase
        .from('conversations')
        .insert({
          id: validConvId,
          buyer_id: validSenderId,
          seller_id: validRecipientId,
          product_id: productInfo?.id ? toValidUUID(productInfo.id) : null,
          unread_count: 1
        });
    }
  } catch (preErr) {
    console.warn('[chatService] Pre-flight conversation check warning:', preErr);
  }

  // Insert into public.messages table
  let savedMessage = basePayload;
  try {
    let insertPayload = { ...basePayload };
    const { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      savedMessage = data;
    } else if (error) {
      console.warn('[chatService] Send message DB notice:', error.message);
    }
  } catch (err) {
    console.warn('[chatService] sendMessage DB exception:', err);
  }

  // Broadcast via shared Realtime Channel + BroadcastChannel for instant cross-account delivery
  const broadcastPayload = {
    ...savedMessage,
    id: validMsgId,
    conversation_id: validConvId,
    original_conversation_id: conversationId,
    recipient_id: recipientId,
    sender_id: senderId,
    sender_name: senderName,
    sender_avatar: senderAvatar,
    image: image || savedMessage.image,
    product_info: productInfo,
    created_at: now.toISOString()
  };

  safeBroadcast('new_message', broadcastPayload);

  // Dispatch in-app notification to counterpart profile
  if (recipientId && String(recipientId).toLowerCase() !== String(senderId).toLowerCase()) {
    try {
      const notifTitle = isOffer ? 'New Offer Received' : `New Message from ${senderName || 'Buyer'}`;
      const notifMsg = isOffer 
        ? `${senderName || 'A buyer'} made an offer of ₦${Number(offerAmount).toLocaleString('en-NG')} on "${productInfo?.name || 'your listing'}".`
        : (text || 'Sent you an attachment').substring(0, 80);

      const newNotifItem = {
        id: `notif-${Date.now()}`,
        type: isOffer ? 'offer' : 'message',
        title: notifTitle,
        message: notifMsg,
        time: 'Just now',
        unread: true,
        actionLink: `/messages?chatId=${conversationId}`
      };

      safeBroadcast('new_notification', {
        recipient_id: recipientId,
        notification: newNotifItem
      });
    } catch (notifErr) {
      console.warn('[chatService] Notification dispatch notice:', notifErr);
    }
  }

  return savedMessage;
};

/**
 * Mark messages in a conversation as read in Supabase, local cache, and broadcast event
 */
export const markConversationAsRead = async (conversationId, currentUserId) => {
  if (!conversationId || !currentUserId) return;
  const validConvId = toValidUUID(conversationId);
  const validUserId = toValidUUID(currentUserId);

  // Update local cache
  try {
    const list = getCachedConversations(currentUserId);
    const updated = list.map(c => {
      if (c.id === conversationId || toValidUUID(c.id) === validConvId) {
        return {
          ...c,
          unreadCount: 0,
          messages: (c.messages || []).map(m => m.sender === 'them' ? { ...m, status: 'read' } : m)
        };
      }
      return c;
    });
    saveCachedConversations(currentUserId, updated);
  } catch (e) {}

  // Update Supabase
  try {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', validConvId)
      .neq('sender_id', validUserId);

    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', validConvId);
  } catch (e) {
    console.warn('[chatService] Mark as read DB notice:', e);
  }

  // Broadcast message_read event so sender's double tick turns blue
  safeBroadcast('message_read', {
    conversation_id: validConvId,
    original_conversation_id: conversationId,
    read_by: currentUserId
  });
};

/**
 * Broadcast message delivered acknowledgment
 */
export const broadcastMessageDelivered = (conversationId, messageId, senderId) => {
  safeBroadcast('message_delivered', {
    conversation_id: toValidUUID(conversationId),
    original_conversation_id: conversationId,
    message_id: messageId,
    sender_id: senderId
  });
};

/**
 * Global Realtime Chat Manager singleton:
 * Listens to incoming messages, delivers them across tabs & windows,
 * and maintains continuous connectivity.
 */
/**
 * Global Realtime Chat Manager & Subscribers Registry.
 *
 * NOTE: Phoenix Channels / Supabase Realtime require all event handlers
 * (.on('broadcast'), .on('presence'), .on('postgres_changes')) to be attached
 * BEFORE .subscribe() is invoked on the channel.
 *
 * This singleton registers all channel callbacks ONCE at creation time,
 * and dynamically dispatches incoming events to all active subscriber callbacks
 * across components (e.g. ChatContext and Messages page).
 */
const _activeChatSubscribers = new Set();
let _bcListenerAttached = false;

const ensureBroadcastChannelListener = () => {
  if (_bcListenerAttached) return;
  const localBc = getLocalBroadcastChannel();
  if (!localBc) return;
  _bcListenerAttached = true;

  localBc.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;
    if (data.event === 'new_message') {
      _dispatchIncomingMessage(data.payload);
    } else if (data.event === 'message_delivered') {
      _dispatchStatusChange(data.payload, 'delivered');
    } else if (data.event === 'message_read') {
      _dispatchStatusChange(data.payload, 'read');
    } else if (data.event === 'user_typing') {
      _dispatchTyping(data.payload);
    }
  });
};

const _dispatchIncomingMessage = (payload) => {
  if (!payload) return;
  const targetRecipient = String(payload.recipient_id || '').toLowerCase();
  const sender = String(payload.sender_id || '').toLowerCase();

  for (const sub of _activeChatSubscribers) {
    const currentUid = sub.currentUid;
    const isTarget = targetRecipient === currentUid ||
      (payload.recipient_id && toValidUUID(payload.recipient_id) === toValidUUID(sub.userId)) ||
      (!payload.recipient_id && sender !== currentUid);

    if (isTarget && sender !== currentUid) {
      // 1. Acknowledge delivery back to sender
      if (payload.conversation_id && payload.sender_id) {
        broadcastMessageDelivered(payload.conversation_id, payload.id, payload.sender_id);
      }

      // 2. Persist to recipient's local cache immediately
      const formattedForRecipient = {
        id: payload.id || generateUUID(),
        sender: 'them',
        sender_id: payload.sender_id,
        text: payload.text || '',
        isOffer: Boolean(payload.is_offer),
        offerAmount: Number(payload.offer_amount || 0),
        audioUrl: payload.audio_url || null,
        duration: payload.duration || null,
        image: payload.image || null,
        time: payload.created_at ? new Date(payload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        timestamp: payload.created_at ? new Date(payload.created_at).getTime() : Date.now(),
        status: 'delivered'
      };

      appendMessageToUserCache(sub.userId, payload.conversation_id, formattedForRecipient, {
        id: payload.conversation_id,
        buyer_id: payload.sender_id,
        seller_id: sub.userId,
        product_id: payload.product_info?.id || payload.product_id || '',
        contact: {
          id: payload.sender_id,
          name: payload.sender_name || 'Counterpart',
          avatar: payload.sender_avatar || '',
          isOnline: false,
          verified: true
        },
        product: payload.product_info || { name: 'Marketplace Item' }
      });

      // 3. Dispatch global in-app event so notification bell & toast update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('buyoh_chat_message_received', { detail: payload }));
      }

      // 4. Trigger caller callback
      if (typeof sub.onNewMessage === 'function') {
        sub.onNewMessage(payload);
      }
    }
  }
};

const _dispatchStatusChange = (payload, overrideStatus = null) => {
  if (!payload) return;
  const status = overrideStatus || payload.status;
  for (const sub of _activeChatSubscribers) {
    if (status === 'delivered') {
      const sender = String(payload.sender_id || '').toLowerCase();
      if (sender === sub.currentUid || (payload.sender_id && toValidUUID(payload.sender_id) === toValidUUID(sub.userId))) {
        if (typeof sub.onStatusChange === 'function') {
          sub.onStatusChange({
            messageId: payload.message_id || payload.id,
            conversationId: payload.conversation_id,
            originalConversationId: payload.original_conversation_id,
            status: 'delivered'
          });
        }
      }
    } else if (status === 'read') {
      if (String(payload.read_by || '').toLowerCase() !== sub.currentUid) {
        if (typeof sub.onStatusChange === 'function') {
          sub.onStatusChange({
            conversationId: payload.conversation_id,
            originalConversationId: payload.original_conversation_id,
            status: 'read'
          });
        }
      }
    } else if (typeof sub.onStatusChange === 'function') {
      sub.onStatusChange(payload);
    }
  }
};

const _dispatchTyping = (payload) => {
  if (!payload) return;
  for (const sub of _activeChatSubscribers) {
    if (String(payload.user_id || '').toLowerCase() !== sub.currentUid) {
      if (typeof sub.onTyping === 'function') {
        sub.onTyping({
          conversationId: payload.conversation_id,
          userId: payload.user_id,
          userName: payload.user_name,
          timestamp: payload.timestamp
        });
      }
    }
  }
};

const _dispatchPresenceSync = () => {
  if (!_sharedChannel) return;
  try {
    const state = _sharedChannel.presenceState();
    const onlineIds = new Set();
    if (state && typeof state === 'object') {
      for (const [key, presences] of Object.entries(state)) {
        if (key && key !== 'user' && key !== 'guest') {
          onlineIds.add(key.toLowerCase());
        }
        if (Array.isArray(presences)) {
          for (const p of presences) {
            if (p.user_id) onlineIds.add(String(p.user_id).toLowerCase());
            if (p.userId) onlineIds.add(String(p.userId).toLowerCase());
          }
        }
      }
    }
    const onlineIdsArray = Array.from(onlineIds);
    for (const sub of _activeChatSubscribers) {
      if (typeof sub.onPresenceChange === 'function') {
        sub.onPresenceChange(onlineIdsArray);
      }
    }
  } catch (e) {
    console.warn('Presence sync error:', e);
  }
};

function initOrGetSharedChannel(userId = null) {
  if (typeof window === 'undefined') return null;

  ensureBroadcastChannelListener();

  if (!_sharedChannel) {
    const presenceKey = userId ? String(userId).toLowerCase() : 'user';
    _sharedChannel = supabase.channel('buyoh-marketplace-realtime', {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: presenceKey }
      }
    });

    // 1. Setup broadcast handlers BEFORE subscribe()
    _sharedChannel.on('broadcast', { event: 'new_message' }, (event) => {
      _dispatchIncomingMessage(event.payload);
    });

    _sharedChannel.on('broadcast', { event: 'message_delivered' }, (event) => {
      _dispatchStatusChange(event.payload, 'delivered');
    });

    _sharedChannel.on('broadcast', { event: 'message_read' }, (event) => {
      _dispatchStatusChange(event.payload, 'read');
    });

    _sharedChannel.on('broadcast', { event: 'user_typing' }, (event) => {
      _dispatchTyping(event.payload);
    });

    // 2. Setup presence handlers BEFORE subscribe() - sync, join, and leave
    _sharedChannel.on('presence', { event: 'sync' }, () => {
      _dispatchPresenceSync();
    });
    _sharedChannel.on('presence', { event: 'join' }, () => {
      _dispatchPresenceSync();
    });
    _sharedChannel.on('presence', { event: 'leave' }, () => {
      _dispatchPresenceSync();
    });

    // 3. Setup Postgres changes handlers BEFORE subscribe()
    _sharedChannel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        if (payload.new) {
          _dispatchIncomingMessage(payload.new);
        }
      }
    );

    _sharedChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      (payload) => {
        if (payload.new && payload.new.status) {
          _dispatchStatusChange({
            messageId: payload.new.id,
            conversationId: payload.new.conversation_id,
            status: payload.new.status
          });
        }
      }
    );

    // 4. NOW subscribe() safely once
    _sharedChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        _sharedChannelReady = true;
        // Track presence for all currently registered active subscribers
        for (const sub of _activeChatSubscribers) {
          if (sub.userId) {
            try {
              await _sharedChannel.track({
                user_id: String(sub.userId).toLowerCase(),
                online_at: new Date().toISOString()
              });
            } catch (err) {}
          }
        }
        _dispatchPresenceSync();
      }
    });
  }
  return _sharedChannel;
}

export const subscribeToRealtimeChat = (userId, { onNewMessage, onStatusChange, onPresenceChange, onTyping } = {}) => {
  if (!userId || typeof window === 'undefined') return () => {};

  const normalizedUid = String(userId).toLowerCase();
  const subscriber = {
    userId: normalizedUid,
    currentUid: normalizedUid,
    onNewMessage,
    onStatusChange,
    onPresenceChange,
    onTyping
  };

  _activeChatSubscribers.add(subscriber);

  // Initialize shared channel (attaches all handlers once and calls subscribe())
  const channel = initOrGetSharedChannel(normalizedUid);

  // If channel is already subscribed, immediately track presence and dispatch
  if (channel && _sharedChannelReady && typeof channel.track === 'function') {
    channel.track({
      user_id: normalizedUid,
      online_at: new Date().toISOString()
    }).then(() => {
      _dispatchPresenceSync();
    }).catch(() => {});
  }

  // Handle page visibility / tab focus to keep presence alive and accurate
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && channel && _sharedChannelReady && typeof channel.track === 'function') {
      channel.track({
        user_id: normalizedUid,
        online_at: new Date().toISOString()
      }).catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Handle page unload / navigation away to untrack presence immediately
  const handleBeforeUnload = () => {
    try {
      if (channel && typeof channel.untrack === 'function') {
        channel.untrack();
      }
    } catch (e) {}
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return unsubscribe handler
  return () => {
    _activeChatSubscribers.delete(subscriber);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);

    // If no more subscribers for this user, untrack
    const hasRemaining = Array.from(_activeChatSubscribers).some(s => s.userId === normalizedUid);
    if (!hasRemaining && channel && typeof channel.untrack === 'function') {
      channel.untrack().catch(() => {});
    }
  };
};
