import { supabase } from '../lib/supabaseClient';
import { getGeneralProductPool } from '../utils/userSync';

/**
 * Normalizes any conversation object to guarantee safe properties:
 * - c.id
 * - c.type ('buying' | 'selling')
 * - c.contact: { name, avatar, phone, whatsapp, location, isOnline, verified }
 * - c.product: { id, name, price, image, condition }
 * - c.messages: array of { id, sender, text, timestamp, time, status, isOffer, offerAmount, audioUrl, duration }
 * - c.unreadCount: number
 * - c.isMuted: boolean
 */
export const normalizeConversation = (raw, currentUserId = null) => {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || `chat-${Date.now()}`;
  const buyerId = raw.buyer_id || raw.buyerId || '';
  const sellerId = raw.seller_id || raw.sellerId || '';
  const isSelling = currentUserId && sellerId === currentUserId;
  const isBuying = currentUserId && buyerId === currentUserId;
  const type = raw.type || (isSelling ? 'selling' : 'buying');

  // Contact resolution
  let contact = {
    id: isSelling ? buyerId : sellerId,
    name: raw.contact?.name || raw.sellerName || raw.buyerName || (isSelling ? 'Buyer' : 'Seller'),
    avatar: raw.contact?.avatar || raw.sellerAvatar || raw.buyerAvatar || '',
    phone: raw.contact?.phone || raw.sellerPhone || raw.buyerPhone || '+234 800 000 0000',
    whatsapp: raw.contact?.whatsapp || raw.sellerWhatsApp || raw.buyerWhatsApp || '',
    location: raw.contact?.location || raw.sellerLocation || raw.buyerLocation || 'Nigeria',
    isOnline: raw.contact?.isOnline ?? true,
    verified: raw.contact?.verified ?? false,
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
    const isMe = currentUserId 
      ? (m.sender_id ? m.sender_id === currentUserId : m.sender === 'me')
      : m.sender === 'me';

    const timestamp = m.timestamp ? Number(m.timestamp) : (m.created_at ? new Date(m.created_at).getTime() : Date.now());
    const time = m.time || (m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now');

    return {
      id: m.id || `msg-${timestamp}`,
      sender: isMe ? 'me' : 'them',
      sender_id: m.sender_id || (isMe ? currentUserId : contact.id),
      text: m.text || '',
      isOffer: Boolean(m.is_offer || m.isOffer),
      offerAmount: Number(m.offer_amount || m.offerAmount || 0),
      image: m.image || null,
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
 * Fetch all conversations for a user from Supabase (with fallback to local storage)
 */
export const fetchUserConversations = async (user) => {
  if (!user?.id) {
    // If not logged in, return empty array
    return [];
  }

  try {
    // 1. Fetch conversations from Supabase
    const { data: convRows, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (convErr) {
      console.warn('[chatService] Fetch conversations warning:', convErr.message);
    }

    if (Array.isArray(convRows) && convRows.length > 0) {
      // 2. Fetch profiles for all counterparts to display real names, avatars, phone numbers
      const counterpartIds = [...new Set(convRows.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id).filter(Boolean))];
      
      let profileMap = {};
      if (counterpartIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, full_name, avatar_url, phone, whatsapp, location, verified')
          .in('id', counterpartIds);

        if (profiles) {
          profiles.forEach(p => {
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
      });

      // 5. Build normalized list
      const normalized = convRows.map(row => {
        const counterpartId = row.buyer_id === user.id ? row.seller_id : row.buyer_id;
        const profile = profileMap[counterpartId] || {};
        const prod = productMap[String(row.product_id)] || {};

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
            whatsapp: profile.whatsapp || '',
            location: profile.location || 'Nigeria',
            isOnline: true,
            verified: Boolean(profile.verified)
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
  if (sellerId && sellerId === user.id) {
    return { isSelf: true };
  }

  try {
    // 1. Check if conversation already exists in Supabase
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('product_id', String(productId));

    if (sellerId) {
      query = query.eq('buyer_id', user.id).eq('seller_id', sellerId);
    } else {
      query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    }

    const { data: existingRows } = await query.limit(1);

    if (existingRows && existingRows.length > 0) {
      const conv = existingRows[0];
      return { conversationId: conv.id, isNew: false };
    }

    // 2. Create new conversation in Supabase
    const newConvId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const actualSellerId = sellerId || 'platform-seller';

    const { data: inserted, error: insErr } = await supabase
      .from('conversations')
      .insert({
        id: newConvId,
        buyer_id: user.id,
        seller_id: actualSellerId,
        product_id: String(productId),
        unread_count: 0
      })
      .select('*')
      .single();

    if (insErr) {
      console.warn('[chatService] Insert conversation warning:', insErr.message);
      // If RLS blocked or table issue, still allow local session conversation
      return { conversationId: newConvId, isNew: true, fallback: true };
    }

    return { conversationId: inserted.id, isNew: true };
  } catch (err) {
    console.error('[chatService] getOrCreateConversation error:', err);
    const localId = `conv-${Date.now()}`;
    return { conversationId: localId, isNew: true, fallback: true };
  }
};

/**
 * Send a message to a conversation in Supabase
 */
export const sendMessage = async ({
  conversationId,
  senderId,
  recipientId,
  text,
  isOffer = false,
  offerAmount = 0,
  audioUrl = null,
  duration = null,
  productInfo = null
}) => {
  if (!conversationId || !senderId) return null;

  const now = new Date();
  const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const msgPayload = {
    id: newMsgId,
    conversation_id: conversationId,
    sender_id: senderId,
    text: text || '',
    is_offer: Boolean(isOffer),
    offer_amount: Number(offerAmount) || 0,
    audio_url: audioUrl || null,
    duration: duration || null,
    status: 'sent',
    created_at: now.toISOString()
  };

  try {
    // 1. Save to Supabase messages table
    const { data, error } = await supabase
      .from('messages')
      .insert(msgPayload)
      .select('*')
      .single();

    if (error) {
      console.warn('[chatService] Send message warning:', error.message);
    }

    // 2. If it's an offer or message to another real user, send real-time notification
    if (recipientId && recipientId !== senderId) {
      try {
        const { data: recipientProfile } = await supabase
          .from('profiles')
          .select('notifications')
          .eq('id', recipientId)
          .single();

        const existingNotifs = Array.isArray(recipientProfile?.notifications) ? recipientProfile.notifications : [];
        const notifTitle = isOffer ? 'New Offer Received' : 'New Message';
        const notifMsg = isOffer 
          ? `Someone made an offer of ₦${Number(offerAmount).toLocaleString('en-NG')} on "${productInfo?.name || 'your listing'}".`
          : text.substring(0, 80);

        existingNotifs.unshift({
          id: `notif-${Date.now()}`,
          type: isOffer ? 'offer' : 'message',
          title: notifTitle,
          message: notifMsg,
          time: 'Just now',
          unread: true,
          actionLink: `/messages?chatId=${conversationId}`
        });

        await supabase
          .from('profiles')
          .update({ notifications: existingNotifs, updated_at: now.toISOString() })
          .eq('id', recipientId);
      } catch (notifErr) {
        console.warn('[chatService] Notification dispatch notice:', notifErr);
      }
    }

    return data || msgPayload;
  } catch (err) {
    console.error('[chatService] sendMessage error:', err);
    return msgPayload;
  }
};

/**
 * Mark messages in a conversation as read in Supabase
 */
export const markConversationAsRead = async (conversationId, currentUserId) => {
  if (!conversationId || !currentUserId) return;

  try {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId);

    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
  } catch (e) {
    console.warn('[chatService] Mark as read notice:', e);
  }
};

/**
 * Subscribe to real-time incoming messages & status changes
 */
export const subscribeToRealtimeChat = (userId, onNewMessage) => {
  if (!userId || typeof window === 'undefined') return () => {};

  const channel = supabase
    .channel(`realtime-chat-user-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        if (payload.new && payload.new.sender_id !== userId) {
          if (typeof onNewMessage === 'function') {
            onNewMessage(payload.new);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
