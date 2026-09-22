import { supabase } from '../lib/supabaseClient';
import { getGeneralProductPool } from '../utils/userSync';

/**
 * Shared realtime channel singleton.
 * Supabase requires a channel to be subscribed before broadcasts can be sent.
 * All broadcast functions reuse this channel.
 */
let _sharedChannel = null;
let _sharedChannelReady = false;

const getSharedChannel = () => {
  if (!_sharedChannel) {
    _sharedChannel = supabase.channel('buyoh-marketplace-realtime', {
      config: {
        broadcast: { ack: true, self: false }
      }
    });
    _sharedChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        _sharedChannelReady = true;
      }
    });
  }
  return _sharedChannel;
};

export const setSharedChannel = (channel) => {
  _sharedChannel = channel;
};

const safeBroadcast = async (event, payload) => {
  try {
    const channel = getSharedChannel();
    if (_sharedChannelReady) {
      await channel.send({ type: 'broadcast', event, payload });
    } else {
      // Channel may be connecting; retry every 200ms up to 15 times (~3s)
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts++;
        if (_sharedChannelReady || attempts > 15) {
          clearInterval(timer);
          try {
            await channel.send({ type: 'broadcast', event, payload });
          } catch (e) {
            console.warn('[chatService] Delayed broadcast warning:', e);
          }
        }
      }, 200);
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
      // Fallback: serialize small audio blob or image to Data URL so recipient can still play/view it
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
    // Fallback on exception
    return await blobToDataUrl(file);
  }
};

/**
 * Broadcast a typing indicator to the counterpart via Realtime.
 * Debounced on the caller side.
 */
export const broadcastTyping = (conversationId, userId) => {
  safeBroadcast('user_typing', {
    conversation_id: conversationId,
    user_id: userId,
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
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
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
    name: raw.contact?.name || raw.sellerName || raw.buyerName || (isSelling ? 'Buyer' : 'Seller'),
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
 * Fetch all conversations for a user from Supabase (with fallback to local storage).
 * Backward-compatible with databases that do not have updated_at column yet.
 */
export const fetchUserConversations = async (user) => {
  if (!user?.id) {
    return [];
  }

  try {
    // 1. Fetch conversations from Supabase
    // Try ordering by updated_at, fallback to created_at if updated_at does not exist yet
    let convRows = null;
    let { data: rowsWithUpdated, error: errUpdated } = await supabase
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (!errUpdated && Array.isArray(rowsWithUpdated)) {
      convRows = rowsWithUpdated;
    } else {
      const { data: rowsWithCreated, error: errCreated } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (errCreated) {
        console.warn('[chatService] Fetch conversations notice:', errCreated.message);
      }
      convRows = rowsWithCreated || [];
    }

    if (Array.isArray(convRows) && convRows.length > 0) {
      // 2. Fetch profiles for all counterparts to display real names, avatars, phone numbers
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

      // 5. Build normalized list
      const normalized = convRows.map(row => {
        const isBuyer = String(row.buyer_id || '').toLowerCase() === userUidLower;
        const counterpartId = isBuyer ? row.seller_id : row.buyer_id;
        const profile = profileMap[String(counterpartId).toLowerCase()] || profileMap[counterpartId] || {};
        const prod = productMap[String(row.product_id)] || {};

        let memberDuration = '5+ years on BuyOh';
        if (profile.created_at) {
          const yrs = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)));
          memberDuration = `${yrs}+ year${yrs > 1 ? 's' : ''} on BuyOh`;
        }

        const rawObj = {
          id: row.id,
          buyer_id: row.buyer_id,
          seller_id: row.seller_id,
          product_id: row.product_id,
          unread_count: row.unread_count || 0,
          contact: {
            id: counterpartId,
            name: profile.full_name || profile.name || (row.seller_id === user.id ? 'Interested Buyer' : 'Marketplace Seller'),
            avatar: profile.avatar_url || '',
            phone: profile.phone || '+234 800 000 0000',
            whatsapp: profile.whatsapp || profile.phone || '',
            location: profile.location || 'Nigeria',
            isOnline: false,
            lastSeen: formatLastSeen(profile.updated_at, false),
            verified: Boolean(profile.verified),
            rating: profile.rating || 5.0,
            memberSince: memberDuration,
            listings: Array.isArray(profile.my_listings) ? profile.my_listings : []
          },
          product: {
            id: row.product_id,
            name: prod.name || 'Listing Item',
            price: Number(prod.price || 0),
            image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : '') || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            condition: prod.condition || 'Used'
          },
          messages: messagesByConv[row.id] || []
        };

        return normalizeConversation(rawObj, user.id);
      }).filter(Boolean);

      // Cache locally
      try {
        localStorage.setItem(`buyoh_cloud_convs_${user.id}`, JSON.stringify(normalized));
      } catch (e) {}

      return normalized;
    }
  } catch (err) {
    console.error('[chatService] Fetch error:', err);
  }

  // Fallback: Check local cache for this user
  try {
    const cached = localStorage.getItem(`buyoh_cloud_convs_${user.id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.map(c => normalizeConversation(c, user.id)).filter(Boolean);
      }
    }
  } catch (e) {}

  return [];
};

/**
 * Get or create a conversation in Supabase for a specific product and seller
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

  try {
    // 1. Check if conversation already exists in Supabase
    const { data: existingRows } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(buyer_id.eq.${validBuyerId},seller_id.eq.${validSellerId}),and(buyer_id.eq.${validSellerId},seller_id.eq.${validBuyerId})`)
      .limit(10);

    if (existingRows && existingRows.length > 0) {
      const match = existingRows.find(r => String(r.product_id).toLowerCase() === String(validProductId).toLowerCase()) || existingRows[0];
      return { conversationId: match.id, isNew: false };
    }

    // Also check if conversation exists by buyer & product
    const { data: fallbackRows } = await supabase
      .from('conversations')
      .select('*')
      .eq('product_id', validProductId)
      .eq('buyer_id', validBuyerId)
      .limit(1);

    if (fallbackRows && fallbackRows.length > 0) {
      return { conversationId: fallbackRows[0].id, isNew: false };
    }

    // 2. Create new conversation in Supabase with ONLY columns guaranteed to exist
    const newConvId = generateUUID();

    const insertPayload = {
      id: newConvId,
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
      return { conversationId: newConvId, isNew: true, fallback: true };
    }

    return { conversationId: inserted?.id || newConvId, isNew: true };
  } catch (err) {
    console.error('[chatService] getOrCreateConversation error:', err);
    const fallbackId = generateUUID();
    return { conversationId: fallbackId, isNew: true, fallback: true };
  }
};

/**
 * Send a message to a conversation in Supabase + Broadcast in Realtime.
 * 100% resilient against schema differences (whether image/updated_at columns exist or not).
 */
export const sendMessage = async ({
  conversationId,
  senderId,
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
  const validMsgId = generateUUID();
  const now = new Date();

  // Pre-flight check: ensure parent conversation exists in Supabase to satisfy foreign key constraint
  try {
    const { data: convCheck } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', validConvId)
      .maybeSingle();

    if (!convCheck) {
      const validRecipientId = toValidUUID(recipientId || 'platform-seller');
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

  // Base payload that strictly matches standard public.messages schema
  const basePayload = {
    id: validMsgId,
    conversation_id: validConvId,
    sender_id: validSenderId,
    text: text || '',
    is_offer: Boolean(isOffer),
    offer_amount: Number(offerAmount) || 0,
    audio_url: audioUrl || null,
    duration: duration || null,
    status: isRecipientOnline ? 'delivered' : 'sent',
    created_at: now.toISOString()
  };

  let savedMessage = null;

  try {
    // 1. Try insert. Only attach image if it is a valid non-empty string
    let insertPayload = { ...basePayload };
    if (image && typeof image === 'string') {
      insertPayload.image = image;
    }

    let { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    // If schema cache says image column does not exist, retry without image and embed in text
    if (error && error.message && error.message.includes('image')) {
      console.warn('[chatService] Database missing image column; embedding in text payload');
      const fallbackPayload = { ...basePayload };
      if (image) {
        fallbackPayload.text = fallbackPayload.text ? `${fallbackPayload.text}\n[image] ${image}` : `[image] ${image}`;
      }
      const retryImg = await supabase
        .from('messages')
        .insert(fallbackPayload)
        .select('*')
        .maybeSingle();

      data = retryImg.data;
      error = retryImg.error;
    }

    // Auto-heal if foreign key violated
    if (error && error.message && (error.message.includes('foreign key') || error.message.includes('violates'))) {
      try {
        await supabase.from('conversations').upsert({
          id: validConvId,
          buyer_id: validSenderId,
          seller_id: toValidUUID(recipientId),
          unread_count: 1
        }, { onConflict: 'id' });

        const retryFk = await supabase
          .from('messages')
          .insert(basePayload)
          .select('*')
          .maybeSingle();

        data = retryFk.data;
        error = retryFk.error;
      } catch (healErr) {
        console.warn('[chatService] Auto-heal message insert failed:', healErr);
      }
    }

    if (error) {
      console.warn('[chatService] Send message warning:', error.message);
    }

    savedMessage = data || basePayload;
  } catch (err) {
    console.error('[chatService] sendMessage error:', err);
    savedMessage = basePayload;
  }

  // 2. Broadcast via shared Realtime Channel for instant cross-tab & cross-device delivery
  safeBroadcast('new_message', {
    ...savedMessage,
    conversation_id: validConvId,
    original_conversation_id: conversationId,
    recipient_id: recipientId,
    sender_id: senderId,
    image: image || savedMessage.image,
    product_info: productInfo
  });

  // 3. Dispatch in-app notification to counterpart profile
  if (recipientId && String(recipientId).toLowerCase() !== String(senderId).toLowerCase()) {
    try {
      const notifTitle = isOffer ? 'New Offer Received' : 'New Message';
      const notifMsg = isOffer 
        ? `Someone made an offer of ₦${Number(offerAmount).toLocaleString('en-NG')} on "${productInfo?.name || 'your listing'}".`
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

      // Update counterpart's profile notifications directly
      try {
        const { data: recipientProfile } = await supabase
          .from('profiles')
          .select('notifications')
          .eq('id', recipientId)
          .maybeSingle();

        if (recipientProfile) {
          const existingNotifs = Array.isArray(recipientProfile.notifications) ? recipientProfile.notifications : [];
          existingNotifs.unshift(newNotifItem);

          await supabase
            .from('profiles')
            .update({ notifications: existingNotifs, updated_at: now.toISOString() })
            .eq('id', recipientId);
        }
      } catch (e) {}
    } catch (notifErr) {
      console.warn('[chatService] Notification dispatch notice:', notifErr);
    }
  }

  return savedMessage;
};

/**
 * Mark messages in a conversation as read in Supabase and broadcast read event
 */
export const markConversationAsRead = async (conversationId, currentUserId) => {
  if (!conversationId || !currentUserId) return;
  const validConvId = toValidUUID(conversationId);
  const validUserId = toValidUUID(currentUserId);

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

    // Broadcast message_read event so sender's double tick turns read
    safeBroadcast('message_read', {
      conversation_id: validConvId,
      original_conversation_id: conversationId,
      read_by: currentUserId
    });
  } catch (e) {
    console.warn('[chatService] Mark as read notice:', e);
  }
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
 * Subscribe to real-time incoming messages, status changes & online presence
 */
export const subscribeToRealtimeChat = (userId, { onNewMessage, onStatusChange, onPresenceChange, onTyping }) => {
  if (!userId || typeof window === 'undefined') return () => {};

  // Remove any previously shared channel so we get a fresh one with presence config
  if (_sharedChannel) {
    try { supabase.removeChannel(_sharedChannel); } catch (e) {}
    _sharedChannel = null;
    _sharedChannelReady = false;
  }

  const currentUid = String(userId || '').toLowerCase();

  const channel = supabase.channel('buyoh-marketplace-realtime', {
    config: {
      broadcast: { ack: true, self: false },
      presence: { key: userId }
    }
  });

  // Track online presence
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const onlineIds = Object.keys(state);
    if (typeof onPresenceChange === 'function') {
      onPresenceChange(onlineIds);
    }
  });

  // Listen to Realtime Broadcasts for instant cross-tab / cross-device messaging
  channel.on('broadcast', { event: 'new_message' }, (event) => {
    const payload = event.payload;
    if (!payload) return;
    const targetRecipient = String(payload.recipient_id || '').toLowerCase();
    const sender = String(payload.sender_id || '').toLowerCase();
    
    // Accept if recipient is this user, or if sender is NOT this user and belongs to active chat
    const isTarget = targetRecipient === currentUid ||
      (payload.recipient_id && toValidUUID(payload.recipient_id) === toValidUUID(userId)) ||
      (!payload.recipient_id && sender !== currentUid);

    if (isTarget && typeof onNewMessage === 'function') {
      onNewMessage(payload);
    }
  });

  // Listen to Realtime Broadcasts for instant notification delivery
  channel.on('broadcast', { event: 'new_notification' }, (event) => {
    const payload = event.payload;
    if (!payload) return;
    const targetRecipient = String(payload.recipient_id || '').toLowerCase();
    const isTarget = targetRecipient === currentUid ||
      (payload.recipient_id && toValidUUID(payload.recipient_id) === toValidUUID(userId));

    if (isTarget && payload.notification) {
      try {
        const localKey = `buyoh_notifications_${userId}`;
        const raw = localStorage.getItem(localKey);
        const list = raw ? JSON.parse(raw) : [];
        if (!list.some(n => n.id === payload.notification.id)) {
          list.unshift(payload.notification);
          localStorage.setItem(localKey, JSON.stringify(list));
          localStorage.setItem('buyoh_notifications_v1', JSON.stringify(list));
          window.dispatchEvent(new CustomEvent('buyoh_notifications_updated'));
        }
      } catch (e) {}
    }
  });

  channel.on('broadcast', { event: 'message_delivered' }, (event) => {
    const payload = event.payload;
    if (!payload) return;
    const sender = String(payload.sender_id || '').toLowerCase();
    if (sender === currentUid || (payload.sender_id && toValidUUID(payload.sender_id) === toValidUUID(userId))) {
      if (typeof onStatusChange === 'function') {
        onStatusChange({
          messageId: payload.message_id,
          conversationId: payload.conversation_id,
          originalConversationId: payload.original_conversation_id,
          status: 'delivered'
        });
      }
    }
  });

  channel.on('broadcast', { event: 'message_read' }, (event) => {
    const payload = event.payload;
    if (payload && String(payload.read_by || '').toLowerCase() !== currentUid) {
      if (typeof onStatusChange === 'function') {
        onStatusChange({
          conversationId: payload.conversation_id,
          originalConversationId: payload.original_conversation_id,
          status: 'read'
        });
      }
    }
  });

  // Listen to typing indicator broadcasts
  channel.on('broadcast', { event: 'user_typing' }, (event) => {
    const payload = event.payload;
    if (payload && String(payload.user_id || '').toLowerCase() !== currentUid) {
      if (typeof onTyping === 'function') {
        onTyping({
          conversationId: payload.conversation_id,
          userId: payload.user_id,
          timestamp: payload.timestamp
        });
      }
    }
  });

  // Also listen to Postgres changes on messages table as persistent sync
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    },
    (payload) => {
      if (payload.new && String(payload.new.sender_id || '').toLowerCase() !== currentUid) {
        if (typeof onNewMessage === 'function') {
          onNewMessage(payload.new);
        }
      }
    }
  );

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages'
    },
    (payload) => {
      if (payload.new && payload.new.status && typeof onStatusChange === 'function') {
        onStatusChange({
          messageId: payload.new.id,
          conversationId: payload.new.conversation_id,
          status: payload.new.status
        });
      }
    }
  );

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      _sharedChannelReady = true;
      try {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString()
        });
      } catch (e) {}
    }
  });

  // Store as shared channel
  _sharedChannel = channel;

  return () => {
    try {
      channel.untrack();
    } catch (e) {}
    supabase.removeChannel(channel);
    _sharedChannel = null;
    _sharedChannelReady = false;
  };
};
