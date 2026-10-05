'use client';

import React, { useState, useEffect, useRef } from 'react';
import NavLink from '../components/NavLink';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, MessageSquareMore, BellRing, PanelTop, UserRound, Bookmark, 
  Send, Phone, ShieldCheck, MoreVertical, ArrowLeft, CheckCheck, Check,
  Tag, Image as ImageIcon, Sparkles, Filter, AlertCircle, Circle,
  ChevronRight, ExternalLink, ChevronUp, ChevronDown, X, User, Flag, Trash2,
  Smile, Paperclip, Mic, Square, Play, Pause, Volume2, FileText,
  BellOff, Bell, UserPlus, UserMinus, Star, SlidersHorizontal,
  Grid, List, MessageCircle, MapPin, CornerUpLeft, Copy, Download, Share2, Clock,
  MoreHorizontal, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { supabase } from '../lib/supabaseClient';
import { getFollowedSellersForUser, saveFollowedSellersForUser, getNotificationsForUser, saveNotificationsForUser, getUserProfileData, getMyListingsForUser } from '../utils/userSync';
import { formatMemberSince, formatAdPostedTime } from '../utils/productUtils';
import { 
  fetchUserConversations, 
  getOrCreateConversation, 
  sendMessage as sendCloudMessage, 
  markConversationAsRead, 
  subscribeToRealtimeChat, 
  broadcastMessageDelivered,
  broadcastTyping,
  uploadChatAttachment,
  formatLastSeen,
  generateUUID,
  toValidUUID,
  normalizeConversation,
  saveCachedConversations,
  getCachedConversations 
} from '../services/chatService';
import './Messages.css';

const ONE_DAY = 86400000;

// Helper to format date display for the sidebar chat item card (Messenger format: 1y, 2w, 3d, 5h, 10m)
const formatSidebarDate = (msg) => {
  if (!msg) return '';
  
  if (msg.timestamp) {
    const msgDate = new Date(msg.timestamp);
    const now = new Date();
    const diffMs = Math.max(0, now - msgDate);
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears >= 1) return `${diffYears}y`;
    if (diffWeeks >= 1) return `${diffWeeks}w`;
    if (diffDays >= 1) return `${diffDays}d`;
    if (diffHours >= 1) return `${diffHours}h`;
    if (diffMin >= 1) return `${diffMin}m`;
    return '1m';
  }

  return msg.time || '';
};

// Helper to render contact avatar with initials fallback
const renderContactAvatar = (avatarUrl, name, className = 'chat-avatar') => {
  if (avatarUrl && typeof avatarUrl === 'string' && !avatarUrl.includes('photo-1535713875002-d1d0cf377fde')) {
    return <img
      src={avatarUrl}
      alt={name || 'Avatar'}
      className={className}
      onError={(e) => {
        // Replace broken image with initials fallback
        const initials = (name || 'U').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
        const div = document.createElement('div');
        div.className = `${className} initials-avatar-badge`;
        div.textContent = initials;
        e.target.replaceWith(div);
      }}
    />;
  }
  const initials = (name || 'U').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return <div className={`${className} initials-avatar-badge`}>{initials}</div>;
};

// Helpers to persist muted chat IDs across reloads and device visits
const getMutedChatIds = (userId) => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`buyoh_muted_chats_${userId || 'guest'}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const saveMutedChatIds = (userId, set) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`buyoh_muted_chats_${userId || 'guest'}`, JSON.stringify([...set]));
  } catch {}
};

// Helper to format date divider headers inside message thread (e.g. 13/07/2024, 12:34)
const formatDateDivider = (msg) => {
  if (!msg) return '';
  
  if (msg.timestamp) {
    const msgDate = new Date(msg.timestamp);
    const day = String(msgDate.getDate()).padStart(2, '0');
    const month = String(msgDate.getMonth() + 1).padStart(2, '0');
    const year = msgDate.getFullYear();
    const timeStr = msg.time || msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}/${month}/${year}, ${timeStr}`;
  }

  if (msg.time) return msg.time;
  return 'Today';
};

const EMOJI_DATA = [
  // Smileys & Expressions
  { char: '😊', name: 'Smiling Face', category: 'smileys', popular: true, keywords: ['smile', 'happy', 'joy', 'blush', 'pleased', 'good'] },
  { char: '😀', name: 'Grinning Face', category: 'smileys', keywords: ['grin', 'happy', 'smile'] },
  { char: '😃', name: 'Big Eyes Smile', category: 'smileys', keywords: ['happy', 'joy', 'smile'] },
  { char: '😄', name: 'Smiling Eyes', category: 'smileys', keywords: ['laugh', 'happy', 'smile'] },
  { char: '😁', name: 'Beaming Face', category: 'smileys', keywords: ['grin', 'teeth', 'happy'] },
  { char: '😆', name: 'Squinting Laugh', category: 'smileys', keywords: ['haha', 'laugh', 'lol'] },
  { char: '😅', name: 'Sweat Smile', category: 'smileys', keywords: ['phew', 'relief', 'nervous', 'laugh'] },
  { char: '😂', name: 'Joy Tears', category: 'smileys', popular: true, keywords: ['lol', 'laugh', 'funny', 'tears', 'crying', 'haha'] },
  { char: '🤣', name: 'ROFL', category: 'smileys', keywords: ['rolling', 'floor', 'laugh', 'funny'] },
  { char: '😉', name: 'Winking Face', category: 'smileys', keywords: ['wink', 'flirt', 'joke'] },
  { char: '😍', name: 'Heart Eyes', category: 'smileys', popular: true, keywords: ['love', 'adore', 'heart', 'beautiful', 'like'] },
  { char: '🥰', name: 'Smiling Hearts', category: 'smileys', keywords: ['love', 'sweet', 'warm'] },
  { char: '😘', name: 'Blow Kiss', category: 'smileys', keywords: ['kiss', 'love', 'mwah'] },
  { char: '😋', name: 'Yummy Face', category: 'smileys', keywords: ['delicious', 'food', 'tasty'] },
  { char: '😎', name: 'Cool Sunglasses', category: 'smileys', keywords: ['cool', 'boss', 'smart', 'style', 'shades'] },
  { char: '🤗', name: 'Hugging Face', category: 'smileys', keywords: ['hug', 'warm', 'welcome'] },
  { char: '🤔', name: 'Thinking Face', category: 'smileys', keywords: ['think', 'ponder', 'wonder', 'hmm', 'question', 'inspect'] },
  { char: '🫡', name: 'Salute Face', category: 'smileys', keywords: ['salute', 'respect', 'yes', 'sir', 'ok', 'roger'] },
  { char: '🤫', name: 'Shushing Face', category: 'smileys', keywords: ['quiet', 'secret', 'hush', 'shh', 'silent'] },
  { char: '🥳', name: 'Party Face', category: 'smileys', keywords: ['celebrate', 'party', 'birthday', 'congrats', 'cheers'] },
  { char: '😮', name: 'Surprised Face', category: 'smileys', keywords: ['wow', 'oh', 'surprised', 'gasp'] },
  { char: '🥺', name: 'Pleading Eyes', category: 'smileys', keywords: ['please', 'beg', 'puppy', 'eyes', 'begging'] },
  { char: '😭', name: 'Loudly Crying', category: 'smileys', keywords: ['cry', 'sad', 'sob', 'tears', 'upset'] },
  { char: '😱', name: 'Screaming Fear', category: 'smileys', keywords: ['shocked', 'scared', 'omg', 'fear'] },
  { char: '😤', name: 'Triumph Huff', category: 'smileys', keywords: ['huff', 'angry', 'determined', 'steam'] },
  { char: '🤯', name: 'Exploding Head', category: 'smileys', keywords: ['mindblown', 'shocked', 'amazing', 'wow'] },
  { char: '😴', name: 'Sleeping Face', category: 'smileys', keywords: ['sleep', 'tired', 'night', 'zzz', 'late'] },
  { char: '🤑', name: 'Money Mouth', category: 'smileys', keywords: ['rich', 'money', 'dollar', 'naira', 'profit', 'cash'] },
  { char: '🧐', name: 'Monocle Inspect', category: 'smileys', keywords: ['inspect', 'check', 'investigate', 'examine', 'detail'] },

  // Hands & Gestures
  { char: '👍', name: 'Thumbs Up', category: 'gestures', popular: true, keywords: ['thumbs', 'up', 'like', 'approve', 'agree', 'ok', 'good', 'yes'] },
  { char: '👎', name: 'Thumbs Down', category: 'gestures', keywords: ['dislike', 'no', 'bad', 'disagree'] },
  { char: '👏', name: 'Clapping Hands', category: 'gestures', popular: true, keywords: ['clap', 'bravo', 'congrats', 'applause'] },
  { char: '🙌', name: 'Raising Hands', category: 'gestures', popular: true, keywords: ['praise', 'celebrate', 'cheers', 'yay'] },
  { char: '🤝', name: 'Handshake', category: 'gestures', popular: true, keywords: ['deal', 'agreement', 'partner', 'shake', 'done', 'sold', 'contract'] },
  { char: '🙏', name: 'Folded Hands', category: 'gestures', popular: true, keywords: ['pray', 'please', 'thanks', 'thank you', 'namaste', 'hope'] },
  { char: '👋', name: 'Waving Hand', category: 'gestures', keywords: ['wave', 'hello', 'hi', 'bye', 'goodbye'] },
  { char: '✌️', name: 'Victory Hand', category: 'gestures', keywords: ['peace', 'victory', 'two'] },
  { char: '🤞', name: 'Crossed Fingers', category: 'gestures', keywords: ['luck', 'hope', 'wish'] },
  { char: '🤟', name: 'Love-You Gesture', category: 'gestures', keywords: ['love', 'rock', 'sign'] },
  { char: '👌', name: 'OK Hand', category: 'gestures', popular: true, keywords: ['ok', 'perfect', 'fine', 'good', 'zero'] },
  { char: '🤏', name: 'Pinching Hand', category: 'gestures', keywords: ['small', 'little', 'bit', 'tiny'] },
  { char: '👈', name: 'Point Left', category: 'gestures', keywords: ['left', 'point', 'direction'] },
  { char: '👉', name: 'Point Right', category: 'gestures', keywords: ['right', 'point', 'direction'] },
  { char: '👆', name: 'Point Up', category: 'gestures', keywords: ['up', 'point', 'above'] },
  { char: '👇', name: 'Point Down', category: 'gestures', keywords: ['down', 'point', 'below'] },
  { char: '💪', name: 'Flexed Biceps', category: 'gestures', keywords: ['strong', 'power', 'gym', 'workout', 'muscle', 'fitness'] },
  { char: '✍️', name: 'Writing Hand', category: 'gestures', keywords: ['write', 'sign', 'contract', 'note', 'fill'] },
  { char: '🤙', name: 'Call Me Hand', category: 'gestures', keywords: ['call', 'phone', 'ring', 'contact'] },

  // Commerce & Products
  { char: '🛍️', name: 'Shopping Bags', category: 'commerce', popular: true, keywords: ['shop', 'store', 'buy', 'bag', 'purchase', 'infibuy'] },
  { char: '💰', name: 'Money Bag', category: 'commerce', popular: true, keywords: ['money', 'cash', 'bag', 'naira', 'wealth', 'pay', 'cost', 'price'] },
  { char: '💵', name: 'Dollar Cash', category: 'commerce', keywords: ['money', 'cash', 'bill', 'currency', 'naira', 'pay'] },
  { char: '💳', name: 'Credit Card', category: 'commerce', keywords: ['card', 'payment', 'bank', 'visa', 'transfer', 'atm'] },
  { char: '🏷️', name: 'Price Tag', category: 'commerce', keywords: ['price', 'tag', 'discount', 'label', 'sale', 'offer'] },
  { char: '📦', name: 'Package Parcel', category: 'commerce', popular: true, keywords: ['package', 'box', 'delivery', 'ship', 'order', 'parcel', 'waybill'] },
  { char: '📈', name: 'Chart Increasing', category: 'commerce', keywords: ['growth', 'profit', 'chart', 'up', 'business'] },
  { char: '📉', name: 'Chart Decreasing', category: 'commerce', keywords: ['discount', 'drop', 'low', 'down', 'cheap'] },
  { char: '🧾', name: 'Receipt', category: 'commerce', keywords: ['receipt', 'bill', 'invoice', 'paper', 'proof'] },
  { char: '🏪', name: 'Convenience Store', category: 'commerce', keywords: ['shop', 'store', 'market', 'seller'] },
  { char: '💎', name: 'Gem Diamond', category: 'commerce', keywords: ['diamond', 'gem', 'jewel', 'valuable', 'rare', 'premium', 'quality'] },
  { char: '🎁', name: 'Wrapped Gift', category: 'commerce', keywords: ['gift', 'present', 'bonus', 'free'] },
  { char: '🛒', name: 'Shopping Cart', category: 'commerce', keywords: ['cart', 'trolley', 'shop', 'buy'] },
  { char: '📱', name: 'Mobile Phone', category: 'commerce', popular: true, keywords: ['phone', 'mobile', 'iphone', 'smartphone', 'samsung', 'device', 'call'] },
  { char: '💻', name: 'Laptop Computer', category: 'commerce', keywords: ['laptop', 'macbook', 'pc', 'computer', 'tech'] },
  { char: '🚗', name: 'Automobile Car', category: 'commerce', popular: true, keywords: ['car', 'auto', 'vehicle', 'drive', 'ride', 'toyota', 'lexus', 'motor'] },
  { char: '🔑', name: 'Key', category: 'commerce', keywords: ['key', 'unlock', 'house', 'car', 'security'] },
  { char: '🏠', name: 'House', category: 'commerce', keywords: ['house', 'home', 'property', 'apartment', 'real estate'] },
  { char: '📺', name: 'Television TV', category: 'commerce', keywords: ['tv', 'television', 'screen', 'display'] },
  { char: '⌚', name: 'Watch', category: 'commerce', keywords: ['watch', 'time', 'apple watch', 'clock', 'smartwatch'] },
  { char: '🎧', name: 'Headphones', category: 'commerce', keywords: ['headphones', 'audio', 'sound', 'music', 'airpods'] },
  { char: '🚚', name: 'Delivery Truck', category: 'commerce', keywords: ['truck', 'delivery', 'transport', 'shipping', 'dispatch'] },
  { char: '💸', name: 'Money Wings', category: 'commerce', popular: true, keywords: ['spend', 'cash', 'money', 'transfer', 'paid', 'sent'] },
  { char: '📍', name: 'Location Pin', category: 'commerce', popular: true, keywords: ['location', 'place', 'map', 'pin', 'lagos', 'abuja', 'address'] },

  // Reactions & Symbols
  { char: '❤️', name: 'Red Heart', category: 'hearts', popular: true, keywords: ['heart', 'love', 'red', 'like', 'favourite'] },
  { char: '🧡', name: 'Orange Heart', category: 'hearts', keywords: ['heart', 'orange', 'love'] },
  { char: '💛', name: 'Yellow Heart', category: 'hearts', keywords: ['heart', 'yellow', 'love'] },
  { char: '💚', name: 'Green Heart', category: 'hearts', keywords: ['heart', 'green', 'love'] },
  { char: '💙', name: 'Blue Heart', category: 'hearts', keywords: ['heart', 'blue', 'love'] },
  { char: '💜', name: 'Purple Heart', category: 'hearts', keywords: ['heart', 'purple', 'love'] },
  { char: '🤎', name: 'Brown Heart', category: 'hearts', keywords: ['heart', 'brown', 'love'] },
  { char: '🖤', name: 'Black Heart', category: 'hearts', keywords: ['heart', 'black', 'love'] },
  { char: '🤍', name: 'White Heart', category: 'hearts', keywords: ['heart', 'white', 'pure'] },
  { char: '💖', name: 'Sparkling Heart', category: 'hearts', keywords: ['heart', 'sparkle', 'love'] },
  { char: '🔥', name: 'Fire Flame', category: 'hearts', popular: true, keywords: ['fire', 'flame', 'hot', 'lit', 'popular', 'trend'] },
  { char: '✨', name: 'Sparkles', category: 'hearts', popular: true, keywords: ['sparkles', 'clean', 'new', 'shine', 'magic', 'condition'] },
  { char: '⭐', name: 'Star', category: 'hearts', keywords: ['star', 'favorite', 'rating', 'top', 'grade'] },
  { char: '🌟', name: 'Glowing Star', category: 'hearts', keywords: ['star', 'glow', 'bright', 'excellent'] },
  { char: '⚡', name: 'High Voltage Bolt', category: 'hearts', popular: true, keywords: ['zap', 'fast', 'quick', 'instant', 'power', 'lightning'] },
  { char: '💯', name: 'Hundred Points', category: 'hearts', popular: true, keywords: ['100', 'full', 'authentic', 'original', 'real', 'perfect'] },
  { char: '✅', name: 'Check Mark Button', category: 'hearts', popular: true, keywords: ['check', 'done', 'yes', 'verified', 'available', 'correct'] },
  { char: '❌', name: 'Cross Mark', category: 'hearts', keywords: ['x', 'no', 'cancel', 'wrong', 'sold'] },
  { char: '🎉', name: 'Party Popper', category: 'hearts', keywords: ['congrats', 'party', 'popper', 'celebrate'] },
  { char: '🔔', name: 'Bell Notification', category: 'hearts', keywords: ['bell', 'notify', 'alert', 'notice'] }
];

const EMOJI_CATEGORIES = [
  { id: 'popular', label: '🔥 Popular' },
  { id: 'smileys', label: '😃 Smileys' },
  { id: 'gestures', label: '👍 Hands' },
  { id: 'commerce', label: '🛍️ Market' },
  { id: 'hearts', label: '❤️ Hearts' }
];



export default function Messages() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const navigate = (to) => (typeof to === 'number' ? router.back() : router.push(to));
  const { user, loading: authLoading } = useAuth();
  const { unreadCount, unreadNotifsCount, playSentSound } = useChat();
  const [conversations, setConversations] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = getCachedConversations(user.id);
        if (Array.isArray(cached) && cached.length > 0) return cached;
      } catch (e) {}
    }
    return [];
  });
  const [isLoadingConvs, setIsLoadingConvs] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = getCachedConversations(user.id);
        if (Array.isArray(cached) && cached.length > 0) return false;
      } catch (e) {}
    }
    return true;
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const sp = new URLSearchParams(window.location.search);
        const paramChatId = sp.get('chatId');
        if (paramChatId) return paramChatId;
      } catch (e) {}
    }
    return null;
  });
  const activeChat = activeChatId ? (conversations.find(c => c.id === activeChatId) || null) : null;
  const [toastMessage, setToastMessage] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  // Typing indicator state — maps conversation IDs to typing user info
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRefs = useRef({});
  const typingBroadcastRef = useRef(null);

  // Toast helper (used throughout Messages)
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Ref to track activeChatId inside realtime callbacks without causing re-subscriptions
  const activeChatIdRef = useRef(null);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Load authoritative real conversations for current user from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadConversations = async () => {
      if (!user) {
        setConversations([]);
        setIsLoadingConvs(false);
        return;
      }

      setIsLoadingConvs(true);
      try {
        const cloudConvs = await fetchUserConversations(user);
        if (isMounted) {
          const mutedSet = getMutedChatIds(user?.id);
          const syncedConvs = cloudConvs.map(c => ({
            ...c,
            isMuted: mutedSet.has(c.id) || Boolean(c.isMuted)
          }));
          setConversations(syncedConvs);
          const paramChatId = searchParams?.get('chatId');
          const paramSellerId = searchParams?.get('sellerId');
          const paramProductId = searchParams?.get('productId');
          const paramSellerName = searchParams?.get('seller');
          const shouldOpenProfile = searchParams?.get('openProfile') === 'true';

          let matchedConv = null;
          if (paramChatId) {
            matchedConv = syncedConvs.find(c => c.id === paramChatId);
          }
          if (!matchedConv && paramSellerId) {
            matchedConv = syncedConvs.find(c => 
              String(c.seller_id).toLowerCase() === String(paramSellerId).toLowerCase() || 
              String(c.contact?.id).toLowerCase() === String(paramSellerId).toLowerCase() || 
              String(c.buyer_id).toLowerCase() === String(paramSellerId).toLowerCase()
            );
          }
          if (!matchedConv && paramProductId) {
            matchedConv = syncedConvs.find(c => 
              String(c.product?.id).toLowerCase() === String(paramProductId).toLowerCase() || 
              String(c.product_id).toLowerCase() === String(paramProductId).toLowerCase()
            );
          }

          if (matchedConv) {
            setActiveChatId(matchedConv.id);
            if (shouldOpenProfile) {
              setIsMobileDetailOpen(true);
            }
          } else if (paramSellerId || paramSellerName || paramProductId) {
            const fallbackConv = normalizeConversation({
              id: paramChatId || generateUUID(),
              buyer_id: user?.id,
              seller_id: paramSellerId || 'seller',
              product_id: paramProductId || '',
              contact: {
                id: paramSellerId || 'seller',
                name: paramSellerName ? decodeURIComponent(paramSellerName) : 'Seller',
                avatar: '',
                isOnline: false,
                verified: false,
                phone: '',
                location: ''
              },
              product: {
                id: paramProductId || '',
                name: 'Listing Item',
                price: 0,
                image: ''
              },
              unread_count: 0,
              messages: []
            }, user?.id);

            setConversations(prev => [fallbackConv, ...prev.filter(c => c.id !== fallbackConv.id)]);
            setActiveChatId(fallbackConv.id);
            if (shouldOpenProfile) {
              setIsMobileDetailOpen(true);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        if (isMounted) setIsLoadingConvs(false);
      }
    };

    loadConversations();

    // Subscribe to realtime incoming messages, status updates & presence via Supabase
    let unsubscribe = () => {};
    if (user?.id) {
      unsubscribe = subscribeToRealtimeChat(user.id, {
        onPresenceChange: (onlineIds) => {
          const lowerOnlineSet = new Set((onlineIds || []).map(id => String(id).toLowerCase()));
          setOnlineUserIds(lowerOnlineSet);
          setConversations(prev => prev.map(c => {
            const cId = c.contact?.id || (String(c.buyer_id || '').toLowerCase() === String(user?.id || '').toLowerCase() ? c.seller_id : c.buyer_id);
            const isOnline = cId ? lowerOnlineSet.has(String(cId).toLowerCase()) : false;
            return {
              ...c,
              contact: {
                ...c.contact,
                isOnline,
                lastSeen: formatLastSeen(c.contact?.updated_at, isOnline)
              }
            };
          }));
        },
        onNewMessage: (newMsg) => {
          let resolvedImage = newMsg.image || null;
          let resolvedText = newMsg.text || '';
          if (!resolvedImage && resolvedText.includes('[image]')) {
            const parts = resolvedText.split('[image]');
            resolvedText = parts[0].trim();
            resolvedImage = parts[1].trim();
          }

          const isCurrentActive = 
            activeChatIdRef.current === newMsg.conversation_id || 
            (newMsg.conversation_id && toValidUUID(activeChatIdRef.current) === toValidUUID(newMsg.conversation_id));

          const formatted = {
            id: newMsg.id || generateUUID(),
            sender: 'them',
            sender_id: newMsg.sender_id,
            text: resolvedText,
            isOffer: Boolean(newMsg.is_offer),
            offerAmount: Number(newMsg.offer_amount || 0),
            audioUrl: newMsg.audio_url || null,
            duration: newMsg.duration || null,
            image: resolvedImage,
            time: newMsg.created_at ? new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            timestamp: newMsg.created_at ? new Date(newMsg.created_at).getTime() : Date.now(),
            status: isCurrentActive ? 'read' : 'delivered'
          };

          // Acknowledge delivery back to sender
          if (newMsg.conversation_id && newMsg.sender_id) {
            broadcastMessageDelivered(newMsg.conversation_id, newMsg.id, newMsg.sender_id);
            if (isCurrentActive) {
              markConversationAsRead(newMsg.conversation_id, user.id);
            }
          }

          // Generate in-app notification so Notifications view and bell update immediately
          try {
            const senderDisplayName = newMsg.sender_name || 'Buyer / Seller';
            const notifTitle = formatted.isOffer ? 'New Offer Received' : `New Message from ${senderDisplayName}`;
            const notifSnippet = formatted.isOffer 
              ? `Offer of ₦${formatted.offerAmount.toLocaleString('en-NG')} on "${newMsg.product_info?.name || 'your listing'}"`
              : (formatted.text || 'Sent you an attachment');

            const currentNotifs = getNotificationsForUser(user);
            const notifKey = `notif-chat-${formatted.id}`;
            if (!currentNotifs.some(n => n.id === notifKey)) {
              currentNotifs.unshift({
                id: notifKey,
                type: formatted.isOffer ? 'offer' : 'message',
                title: notifTitle,
                message: notifSnippet,
                time: 'Just now',
                unread: true,
                actionLink: `/messages?chatId=${newMsg.conversation_id}`
              });
              saveNotificationsForUser(user, currentNotifs);
              window.dispatchEvent(new CustomEvent('buyoh_notifications_updated'));
            }
          } catch (notifErr) {
            console.warn('Error recording chat notification:', notifErr);
          }

          setConversations(prev => {
            const convExists = prev.some(c => 
              c.id === newMsg.conversation_id || 
              (newMsg.conversation_id && toValidUUID(c.id) === toValidUUID(newMsg.conversation_id))
            );

            const mutedSet = getMutedChatIds(user?.id);
            const isChatMuted = mutedSet.has(newMsg.conversation_id);

            // Play sound tone ONLY if chat is not muted and push setting is on
            if (!isChatMuted) {
              const pushPref = typeof window !== 'undefined' ? localStorage.getItem('buyoh_pref_push') : null;
              const isPushActive = pushPref !== null ? JSON.parse(pushPref) : true;
              if (isPushActive) {
                playAudioTone(750, 600, 0.15);
              }
            }

            // AUTO-HEAL: If conversation does NOT exist yet in recipient's local state, create it now!
            if (!convExists) {
              const pInfo = newMsg.product_info || {};
              const counterpartDisplayName = newMsg.sender_name || 'Interested Buyer';
              const autoCreatedConv = normalizeConversation({
                id: newMsg.conversation_id,
                buyer_id: newMsg.sender_id,
                seller_id: user?.id,
                product_id: pInfo.id || newMsg.product_id,
                contact: {
                  id: newMsg.sender_id,
                  name: counterpartDisplayName,
                  avatar: newMsg.sender_avatar || '',
                  isOnline: newMsg.sender_id ? onlineUserIds.has(String(newMsg.sender_id).toLowerCase()) : false,
                  verified: false,
                  phone: '',
                  location: ''
                },
                product: {
                  id: pInfo.id,
                  name: pInfo.name || 'Listing Item',
                  price: pInfo.price || 0,
                  image: pInfo.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
                  condition: pInfo.condition || 'Used'
                },
                unread_count: isCurrentActive ? 0 : 1,
                messages: [formatted],
                isMuted: isChatMuted
              }, user?.id);

              const createdList = [autoCreatedConv, ...prev];
              saveCachedConversations(user?.id, createdList);
              return createdList;
            }

            const nextList = prev.map(c => {
              if (c.id === newMsg.conversation_id || toValidUUID(c.id) === toValidUUID(newMsg.conversation_id)) {
                if (c.messages?.some(m => m.id === formatted.id)) return c;

                if (isCurrentActive) {
                  markConversationAsRead(c.id, user.id);
                }

                // If counterpart contact name or avatar was generic, hydrate from newMsg
                const updatedContact = {
                  ...c.contact,
                  name: (newMsg.sender_name && newMsg.sender_name !== 'Buyer / Seller' && newMsg.sender_name !== 'Interested Buyer') 
                    ? newMsg.sender_name : (c.contact?.name || 'Contact'),
                  avatar: newMsg.sender_avatar || c.contact?.avatar || ''
                };

                return {
                  ...c,
                  contact: updatedContact,
                  messages: [...(c.messages || []), formatted],
                  unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + 1
                };
              }
              return c;
            });

            // Re-order: move the conversation with the new message to index 0 (top of sidebar!)
            const targetConv = nextList.find(c => c.id === newMsg.conversation_id || toValidUUID(c.id) === toValidUUID(newMsg.conversation_id));
            const reordered = targetConv ? [targetConv, ...nextList.filter(c => c !== targetConv)] : nextList;
            saveCachedConversations(user?.id, reordered);
            return reordered;
          });
        },
        onStatusChange: ({ messageId, conversationId, originalConversationId, status }) => {
          setConversations(prev => {
            const updated = prev.map(c => {
              const matchesConv = 
                c.id === conversationId || 
                c.id === originalConversationId ||
                (conversationId && toValidUUID(c.id) === toValidUUID(conversationId));

              if (!matchesConv) return c;

              return {
                ...c,
                messages: (c.messages || []).map(m => {
                  if (status === 'read' && m.sender === 'me') {
                    return { ...m, status: 'read' };
                  }
                  if (status === 'delivered' && m.sender === 'me' && m.status !== 'read') {
                    if (!messageId || m.id === messageId) {
                      return { ...m, status: 'delivered' };
                    }
                  }
                  return m;
                })
              };
            });
            saveCachedConversations(user?.id, updated);
            return updated;
          });
        },
        onTyping: ({ conversationId, userId, userName, timestamp }) => {
          // Show typing for the conversation, auto-clear after 3 seconds
          setTypingUsers(prev => ({ ...prev, [conversationId]: { userId, userName, timestamp } }));
          if (typingTimeoutRefs.current[conversationId]) {
            clearTimeout(typingTimeoutRefs.current[conversationId]);
          }
          typingTimeoutRefs.current[conversationId] = setTimeout(() => {
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[conversationId];
              return next;
            });
          }, 3000);
        }
      });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  const [filterTab, setFilterTab] = useState('all'); // all, unread, buying, selling
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return Boolean(sp.get('chatId') || sp.get('productId') || sp.get('sellerId') || sp.get('openProfile') === 'true');
    }
    return false;
  });
  
  // In-chat message search state
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Advanced header state
  const [isTyping, setIsTyping] = useState(false);
  const [headerExpanded, setHeaderExpanded] = useState(false);
  const [showSafetyAlert, setShowSafetyAlert] = useState(true);

  // Dropdown 3-dots menu & Jiji Profile modal state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSellerDataFetched, setIsSellerDataFetched] = useState(false);
  const [sellerProfileMeta, setSellerProfileMeta] = useState(null);
  const [sellerAdverts, setSellerAdverts] = useState([]);
  const [isLoadingSellerData, setIsLoadingSellerData] = useState(false);
  const [loadedSellerContactId, setLoadedSellerContactId] = useState(null);
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [showSellerContact, setShowSellerContact] = useState(false);
  const [isSellerGridView, setIsSellerGridView] = useState(true);
  const menuRef = useRef(null);

  const handleOpenProfileModal = async (chat = activeChat) => {
    if (!chat?.contact) return;
    const counterpartId = chat.contact.id;
    setIsLoadingSellerData(true);
    setIsSellerDataFetched(false);

    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, full_name, avatar_url, my_listings, phone, whatsapp, location, verified, rating, created_at')
        .eq('id', counterpartId)
        .maybeSingle();

      const freshMeta = {
        created_at: prof?.created_at || chat.contact.created_at || null,
        verified: Boolean(prof?.verified ?? chat.contact.verified),
        rating: prof?.rating || chat.contact.rating || null,
        phone: prof?.phone || chat.contact.phone || '',
        whatsapp: prof?.whatsapp || chat.contact.whatsapp || prof?.phone || chat.contact.phone || '',
        location: prof?.location || chat.contact.location || ''
      };

      let listings = [];
      if (prof?.my_listings && Array.isArray(prof.my_listings) && prof.my_listings.length > 0) {
        listings = prof.my_listings.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
      }

      if (listings.length === 0 && counterpartId && typeof window !== 'undefined') {
        try {
          const localRaw = localStorage.getItem(`buyoh_my_listings_${counterpartId}`);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              listings = parsed.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
            }
          }
        } catch (e) {}
      }

      if (listings.length === 0 && user?.id && counterpartId && String(user.id).toLowerCase() === String(counterpartId).toLowerCase()) {
        try {
          const myListings = getMyListingsForUser(user);
          if (Array.isArray(myListings) && myListings.length > 0) {
            listings = myListings.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
          }
        } catch (e) {}
      }

      setLoadedSellerContactId(counterpartId);
      setSellerProfileMeta(freshMeta);
      setSellerAdverts(listings);
      setIsLoadingSellerData(false);
      setIsSellerDataFetched(true);
      setShowSellerContact(false);
      setSellerSearchQuery('');
      setShowProfileModal(true);
    } catch (err) {
      console.warn('[Messages] handleOpenProfileModal error:', err);
      setIsLoadingSellerData(false);
      setIsSellerDataFetched(true);
      setShowProfileModal(true);
    }
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setIsSellerDataFetched(false);
    if (typeof window !== 'undefined' && window.history.state?.sellerProfileOpen) {
      window.history.back();
    }
  };

  // Intelligent deep link support for opening seller profile
  useEffect(() => {
    if (searchParams?.get('openProfile') === 'true' && activeChat?.contact && !showProfileModal && !isSellerDataFetched) {
      handleOpenProfileModal(activeChat);
      setIsMobileDetailOpen(true);
    }
  }, [searchParams, activeChat?.contact?.id, showProfileModal, isSellerDataFetched]);

  // Intelligent history integration for seller profile modal (mobile gesture & desktop back)
  useEffect(() => {
    if (showProfileModal) {
      try {
        window.history.pushState({ sellerProfileOpen: true }, '');
      } catch (e) {}

      const handlePopState = () => {
        setShowProfileModal(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [showProfileModal]);

  const handleShareSellerProfile = async () => {
    const sellerName = activeChat?.contact?.name || 'Seller';
    const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/messages?chatId=${activeChat?.id}&openProfile=true` : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${sellerName}'s Store on InfiBuy`,
          text: `Check out listings from ${sellerName} on InfiBuy!`,
          url: profileUrl
        });
      } catch (err) {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(profileUrl);
        showToast('Seller profile link copied to clipboard!');
      } catch (e) {
        showToast('Profile link ready to share');
      }
    }
  };

  // In-Chat Make an Offer & Quoted Reply & Lightbox states
  const [showInChatOfferModal, setShowInChatOfferModal] = useState(false);
  const [chatOfferAmount, setChatOfferAmount] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Followed sellers state (Authoritative Cloud Source of Truth)
  const [followedSellers, setFollowedSellers] = useState(() => getFollowedSellersForUser(user));

  useEffect(() => {
    setFollowedSellers(getFollowedSellersForUser(user));
  }, [user]);

  // Real-time online status derived dynamically from active Phoenix presence
  const isChatUserOnline = (chat) => {
    if (!chat) return false;
    const counterpartId = chat.contact?.id || (String(chat.buyer_id || '').toLowerCase() === String(user?.id || '').toLowerCase() ? chat.seller_id : chat.buyer_id);
    return counterpartId ? onlineUserIds.has(String(counterpartId).toLowerCase()) : false;
  };

  const isFollowingSeller = (name) => followedSellers.includes(name);

  const toggleFollowSeller = (name) => {
    let next;
    if (followedSellers.includes(name)) {
      next = followedSellers.filter(n => n !== name);
      setToastMessage(`Unfollowed ${name}`);
    } else {
      next = [...followedSellers, name];
      setToastMessage(`Following ${name}`);
    }
    setFollowedSellers(next);
    saveFollowedSellersForUser(user, next);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('popular');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [hoveredEmojiItem, setHoveredEmojiItem] = useState(null);
  const emojiPickerRef = useRef(null);

  // File Attachment State
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const fileInputRef = useRef(null);

  // Voice Note Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const recordingIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioRef = useRef(null);

  const chatThreadRef = useRef(null);

  // Click outside listener for 3-dots menu & Emoji Picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Voice recording timer effect
  useEffect(() => {
    if (isRecordingAudio) {
      setRecordingTimer(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecordingAudio]);

  const displayedEmojis = React.useMemo(() => {
    const q = emojiSearchQuery.trim().toLowerCase();
    if (q) {
      return EMOJI_DATA.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.char === q ||
        item.keywords.some(k => k.toLowerCase().includes(q))
      );
    }
    if (activeEmojiCategory === 'popular') {
      return EMOJI_DATA.filter(item => item.popular || item.category === 'popular');
    }
    return EMOJI_DATA.filter(item => item.category === activeEmojiCategory);
  }, [emojiSearchQuery, activeEmojiCategory]);

  const handleSelectEmoji = (emoji) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedAttachment({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        previewUrl: event.target.result,
        file: file
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const playAudioTone = (freq1 = 440, freq2 = 880, duration = 0.25) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq1, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch (e) {
      console.log('Audio tone error', e);
    }
  };

  const startVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      playAudioTone(400, 600, 0.15);
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Microphone permission error or unsupported:", err);
      alert("Microphone access is required to record voice notes. Please allow microphone access in your browser.");
    }
  };

  const cancelVoiceRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingTimer(0);
  };

  const sendVoiceRecord = () => {
    playAudioTone(600, 900, 0.2);
    const duration = recordingTimer || 1;

    const persistVoiceNote = async (audioBlob, localAudioUrl) => {
      if (!activeChat || !user?.id) return;

      const isCounterpartOnline = isChatUserOnline(activeChat);
      const nowTs = Date.now();
      const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msgId = generateUUID();

      const myProfile = getUserProfileData(user);
      const myName = myProfile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      const myAvatar = myProfile?.avatarUrl || user?.user_metadata?.avatar_url || '';

      const newMsg = {
        id: msgId,
        sender: 'me',
        sender_id: user.id,
        text: '🎙️ Voice Note',
        isVoiceNote: true,
        audioUrl: localAudioUrl,
        duration: duration,
        timestamp: nowTs,
        time: timeNow,
        status: isCounterpartOnline ? 'delivered' : 'sent'
      };

      // Optimistic UI update and cache persistence
      setConversations(prev => {
        const chatIndex = prev.findIndex(c => c.id === activeChatId);
        let updated;
        if (chatIndex >= 0) {
          const target = {
            ...prev[chatIndex],
            lastMessage: newMsg,
            lastMessageTime: timeNow,
            messages: [...(prev[chatIndex].messages || []), newMsg]
          };
          updated = [target, ...prev.filter((_, i) => i !== chatIndex)];
        } else {
          updated = prev;
        }
        saveCachedConversations(user?.id, updated);
        return updated;
      });

      // Upload audio to Supabase Storage and persist message
      try {
        let cloudAudioUrl = null;
        if (audioBlob) {
          cloudAudioUrl = await uploadChatAttachment(audioBlob, activeChat.id, user.id, 'voice');
        }

        await sendCloudMessage({
          conversationId: activeChat.id,
          senderId: user.id,
          recipientId: counterpartId,
          senderName: myName,
          senderAvatar: myAvatar,
          text: '🎙️ Voice Note',
          audioUrl: cloudAudioUrl || localAudioUrl,
          duration: duration,
          productInfo: activeChat.product,
          isRecipientOnline: isCounterpartOnline
        });
      } catch (err) {
        console.error('Error persisting voice note to cloud:', err);
      }
    };

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const realAudioUrl = URL.createObjectURL(audioBlob);

        if (recorder.stream) {
          recorder.stream.getTracks().forEach(track => track.stop());
        }

        persistVoiceNote(audioBlob, realAudioUrl);
      };

      recorder.stop();
    } else {
      // Fallback when MediaRecorder is not available
      persistVoiceNote(null, null);
    }

    setIsRecordingAudio(false);
    setRecordingTimer(0);
  };

  const handleTogglePlayAudio = (id, audioUrl) => {
    if (playingAudioId === id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        setPlayingAudioId(id);

        audio.play().catch(e => console.error("Audio playback error:", e));

        audio.onended = () => {
          setPlayingAudioId(null);
        };
      } else {
        // Fallback tone for simulated seed voice notes without audioUrl
        setPlayingAudioId(id);
        playAudioTone(520, 1040, 0.35);

        setTimeout(() => {
          setPlayingAudioId(null);
        }, 5000);
      }
    }
  };

  // Reset in-chat search state and dropdown menu whenever active chat changes
  useEffect(() => {
    setIsChatSearchOpen(false);
    setChatSearchQuery('');
    setCurrentMatchIndex(0);
    setIsMenuOpen(false);
  }, [activeChatId]);

  const handleDeleteChat = (idToDelete) => {
    setConversations(prev => prev.filter(c => c.id !== idToDelete));
    if (activeChatId === idToDelete) {
      setActiveChatId(null);
      router.replace('/messages');
    }
    setToastMessage('Chat deleted');
    setTimeout(() => setToastMessage(''), 3000);
    setIsMobileDetailOpen(false);
  };

  const handleMoveToSpam = (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      router.replace('/messages');
    }
    setToastMessage('Conversation moved to spam');
    setTimeout(() => setToastMessage(''), 3000);
    setIsMobileDetailOpen(false);
  };

  // Real typing indicator — derived from typingUsers state set by realtime
  useEffect(() => {
    if (!activeChatId) {
      setIsTyping(false);
      return;
    }
    const typingInfo = typingUsers[activeChatId];
    setIsTyping(Boolean(typingInfo));
  }, [activeChatId, typingUsers]);

  const handleReportSeller = (name) => {
    setToastMessage(`Report submitted for ${name}`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Synchronize state with URL search parameters (handles browser Back button & back gestures)
  useEffect(() => {
    const paramChatId = searchParams?.get('chatId');
    const prodId = searchParams?.get('productId');
    const sellerId = searchParams?.get('sellerId') || '';
    const sellerName = searchParams?.get('seller') || 'Marketplace Seller';
    const prodNameParam = searchParams?.get('prodName');
    const prodPriceParam = searchParams?.get('prodPrice');

    if (paramChatId) {
      setActiveChatId(paramChatId);
      setIsMobileDetailOpen(true);
    } else if (prodId && user) {
      // Check if conversation already exists in state
      const existing = conversations.find(c => String(c.product?.id) === String(prodId));
      if (existing) {
        setActiveChatId(existing.id);
        setIsMobileDetailOpen(true);
        router.replace(`/messages?chatId=${existing.id}`);
      } else {
        // Initialize or fetch cloud conversation
        const initChat = async () => {
          try {
            // Lookup product from general pool to get full details cleanly
            let poolItem = null;
            try {
              const { getGeneralProductPool } = await import('../utils/userSync');
              const pool = getGeneralProductPool(user);
              poolItem = pool.find(p => String(p.id) === String(prodId));
            } catch (e) {}

            const resolvedName = poolItem?.name || prodNameParam || 'Marketplace Item';
            const resolvedPrice = Number(poolItem?.price || prodPriceParam || 0);
            const resolvedImage = poolItem?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

            const targetSellerUid = sellerId || poolItem?.sellerId || poolItem?.userId || '';

            const res = await getOrCreateConversation({
              user,
              sellerId: targetSellerUid,
              productId: prodId,
              productDetails: { name: resolvedName, price: resolvedPrice, image: resolvedImage }
            });

            if (res.isSelf) {
              setToastMessage('You cannot chat with yourself on your own listing');
              setTimeout(() => setToastMessage(''), 3000);
              router.replace('/messages');
              return;
            }

            const newChatObj = normalizeConversation({
              id: res.conversationId,
              buyer_id: user.id,
              seller_id: targetSellerUid,
              product_id: prodId,
              contact: {
                id: targetSellerUid,
                name: sellerName !== 'Marketplace Seller' ? sellerName : (poolItem?.sellerName || 'Marketplace Seller'),
                avatar: poolItem?.sellerAvatar || '',
                isOnline: targetSellerUid ? onlineUserIds.has(String(targetSellerUid).toLowerCase()) : false,
                verified: Boolean(poolItem?.sellerVerified || poolItem?.verified),
                phone: poolItem?.sellerPhone || poolItem?.phone || '',
                location: poolItem?.location || poolItem?.sellerLocation || ''
              },
              product: {
                id: prodId,
                name: resolvedName,
                price: resolvedPrice,
                image: resolvedImage,
                condition: poolItem?.condition || 'Used'
              },
              unread_count: 0,
              messages: []
            }, user.id);

            setConversations(prev => {
              if (prev.some(c => c.id === newChatObj.id)) return prev;
              const updated = [newChatObj, ...prev];
              saveCachedConversations(user?.id, updated);
              return updated;
            });
            setActiveChatId(newChatObj.id);
            setIsMobileDetailOpen(true);
            router.replace(`/messages?chatId=${newChatObj.id}`);
          } catch (e) {
            console.error('Error creating chat:', e);
          }
        };
        initChat();
      }
    } else if (!paramChatId && !prodId) {
      setIsMobileDetailOpen(false);
    }
  }, [searchParams, user]);

  // (Cloud persistence handled by Supabase — no local storage needed)

  // Scroll to bottom on new messages inside internal thread container ONLY (prevents header/page from scrolling out of view)
  const scrollToBottom = () => {
    if (chatThreadRef.current) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeChatId, conversations, isMobileDetailOpen]);

  // Mark active chat as read in memory and in Supabase
  useEffect(() => {
    if (!activeChatId) return;

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChatId && (c.unreadCount > 0 || c.messages?.some(m => m.sender === 'them' && m.status !== 'read'))) {
          return {
            ...c,
            unreadCount: 0,
            messages: (c.messages || []).map(m => ({ ...m, status: 'read' }))
          };
        }
        return c;
      })
    );

    if (user?.id) {
      markConversationAsRead(activeChatId, user.id);
    }
  }, [activeChatId, user?.id]);

  const isSellerInChat = Boolean(
    activeChat?.type === 'selling' ||
    (user?.id && activeChat?.seller_id && String(activeChat.seller_id).toLowerCase() === String(user.id).toLowerCase())
  );

  // In-chat search matching messages
  const chatSearchMatches = React.useMemo(() => {
    if (!chatSearchQuery.trim() || !activeChat?.messages) return [];
    const q = chatSearchQuery.toLowerCase().trim();
    return activeChat.messages
      .map((msg, index) => ({ msg, index }))
      .filter(item => item.msg.text.toLowerCase().includes(q));
  }, [chatSearchQuery, activeChat]);

  // Scroll to matching message when match index changes
  useEffect(() => {
    if (chatSearchMatches.length > 0 && chatSearchMatches[currentMatchIndex]) {
      const matchMsgId = chatSearchMatches[currentMatchIndex].msg.id;
      const el = document.getElementById(`msg-bubble-${matchMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, chatSearchMatches]);

  const handlePrevMatch = () => {
    if (chatSearchMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev > 0 ? prev - 1 : chatSearchMatches.length - 1));
  };

  const handleNextMatch = () => {
    if (chatSearchMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev < chatSearchMatches.length - 1 ? prev + 1 : 0));
  };

  // Helper to render text with highlighted search query
  const renderHighlightedText = (text, query) => {
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  // Single Message Deletion state & handler
  const [deleteMessageModal, setDeleteMessageModal] = useState(null);

  const handleDeleteMessage = (chatId, messageId) => {
    if (playingAudioId === messageId) {
      setPlayingAudioId(null);
    }
    setConversations(prev =>
      prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.filter(m => m.id !== messageId)
          };
        }
        return c;
      })
    );
    setDeleteMessageModal(null);
    showToast('Message deleted');
  };

  // Fetch seller adverts for Jiji-style profile page without stale flashes
  useEffect(() => {
    if (!showProfileModal || !activeChat?.contact) return;
    setShowSellerContact(false);
    setSellerSearchQuery('');

    const counterpartId = activeChat.contact.id;

    // Immediately pre-populate data synchronously for the active seller
    if (loadedSellerContactId !== counterpartId) {
      setLoadedSellerContactId(counterpartId);
      setSellerProfileMeta({
        created_at: activeChat.contact.created_at || null,
        verified: Boolean(activeChat.contact.verified),
        rating: activeChat.contact.rating || null,
        phone: activeChat.contact.phone || '',
        whatsapp: activeChat.contact.whatsapp || activeChat.contact.phone || '',
        location: activeChat.contact.location || ''
      });

      let initialListings = [];
      if (counterpartId && typeof window !== 'undefined') {
        try {
          const localRaw = localStorage.getItem(`buyoh_my_listings_${counterpartId}`);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialListings = parsed.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
            }
          }
        } catch (e) {}
      }

      if (initialListings.length === 0 && user?.id && counterpartId && String(user.id).toLowerCase() === String(counterpartId).toLowerCase()) {
        try {
          const myListings = getMyListingsForUser(user);
          if (Array.isArray(myListings) && myListings.length > 0) {
            initialListings = myListings.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
          }
        } catch (e) {}
      }

      setSellerAdverts(initialListings);
      setIsLoadingSellerData(initialListings.length === 0);
    }

    let isCurrent = true;
    const fetchSellerData = async () => {
      let listings = [];
      if (counterpartId) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, name, full_name, avatar_url, my_listings, phone, whatsapp, location, verified, rating, created_at')
            .eq('id', counterpartId)
            .maybeSingle();

          if (prof && isCurrent) {
            setSellerProfileMeta({
              created_at: prof.created_at,
              verified: Boolean(prof.verified),
              rating: prof.rating || null,
              phone: prof.phone || '',
              whatsapp: prof.whatsapp || '',
              location: prof.location || ''
            });

            if (prof.my_listings && Array.isArray(prof.my_listings) && prof.my_listings.length > 0) {
              listings = prof.my_listings.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
            }
          }
        } catch (e) {
          console.warn('[Messages] fetchSellerData error:', e);
        }
      }

      // If user is viewing their own profile in chat or testing locally, check local user-scoped listings
      if (listings.length === 0 && counterpartId) {
        try {
          if (typeof window !== 'undefined') {
            const localRaw = localStorage.getItem(`buyoh_my_listings_${counterpartId}`);
            if (localRaw) {
              const parsed = JSON.parse(localRaw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                listings = parsed.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
              }
            }
          }
        } catch (e) {}
      }

      // If current authenticated user is this seller, sync with their live listings
      if (listings.length === 0 && user?.id && counterpartId && String(user.id).toLowerCase() === String(counterpartId).toLowerCase()) {
        try {
          const myListings = getMyListingsForUser(user);
          if (Array.isArray(myListings) && myListings.length > 0) {
            listings = myListings.filter(item => item && (item.name || item.title) && !item.archived && !item.deleted);
          }
        } catch (e) {}
      }

      if (isCurrent) {
        setSellerAdverts(listings);
        setIsLoadingSellerData(false);
      }
    };

    fetchSellerData();

    return () => {
      isCurrent = false;
    };
  }, [showProfileModal, activeChat, loadedSellerContactId]);

  // Memoized filtered adverts for seller modal (filtered by real-time search)
  const filteredSellerAdverts = React.useMemo(() => {
    if (loadedSellerContactId !== activeChat?.contact?.id) return [];
    let list = [...sellerAdverts];
    const q = sellerSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item => 
        (item.name || item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.condition || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [sellerAdverts, sellerSearchQuery, loadedSellerContactId, activeChat?.contact?.id]);

  // Filtering conversations with safe optional chaining
  const filteredConversations = (conversations || []).filter(c => {
    if (!c) return false;
    const q = searchQuery.toLowerCase().trim();
    const contactName = (c.contact?.name || '').toLowerCase();
    const productName = (c.product?.name || '').toLowerCase();
    const matchesSearch = 
      !q ||
      contactName.includes(q) ||
      productName.includes(q) ||
      (Array.isArray(c.messages) && c.messages.some(m => (m.text || '').toLowerCase().includes(q)));
    
    if (!matchesSearch) return false;
    if (filterTab === 'unread') return (c.unreadCount || 0) > 0;
    if (filterTab === 'buying') return c.type === 'buying';
    if (filterTab === 'selling') return c.type === 'selling';
    return true;
  });

  // Toggle mute notifications for a chat conversation
  const handleToggleMute = (chatId) => {
    if (!chatId) return;
    const mutedSet = getMutedChatIds(user?.id);
    const willMute = !mutedSet.has(chatId);
    if (willMute) {
      mutedSet.add(chatId);
    } else {
      mutedSet.delete(chatId);
    }
    saveMutedChatIds(user?.id, mutedSet);

    setConversations(prev =>
      prev.map(c => (c.id === chatId ? { ...c, isMuted: willMute } : c))
    );

    setToastMessage(willMute ? 'Notifications muted for this chat' : 'Notifications unmuted');
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Function to send a message (text or offer) with real two-way cloud persistence
  const handleSendMessage = async (textToSend = inputMessage, isOffer = false, offerVal = 0) => {
    const text = typeof textToSend === 'string' ? textToSend.trim() : '';
    if (!text && !isOffer && !selectedAttachment) return;
    if (!activeChat) return;

    const currentReply = replyingToMessage;
    setReplyingToMessage(null);

    // Play outgoing message sound
    if (playSentSound) {
      try { playSentSound(); } catch (e) {}
    } else {
      playAudioTone(440, 880, 0.15);
    }

    const counterpartId = activeChat.contact?.id || (String(activeChat.buyer_id || '').toLowerCase() === String(user?.id || '').toLowerCase() ? activeChat.seller_id : activeChat.buyer_id);
    const isCounterpartOnline = isChatUserOnline(activeChat);

    const myProfile = getUserProfileData(user);
    const myName = myProfile?.fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const myAvatar = myProfile?.avatarUrl || user?.user_metadata?.avatar_url || '';

    const nowTs = Date.now();
    const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = isOffer ? `🏷️ Proposed Offer: ₦${Number(offerVal).toLocaleString('en-NG')}` : text;
    const initialStatus = isCounterpartOnline ? 'delivered' : 'sent';

    // Upload image attachment to Supabase Storage if present
    let imageUrl = null;
    if (selectedAttachment && selectedAttachment.previewUrl) {
      imageUrl = selectedAttachment.previewUrl; // Show local preview immediately
    }

    const newMsg = {
      id: generateUUID(),
      sender: 'me',
      sender_id: user?.id,
      text: messageText,
      isOffer: Boolean(isOffer),
      offerAmount: Number(offerVal) || 0,
      image: imageUrl,
      replyTo: currentReply ? { id: currentReply.id, sender: currentReply.sender, text: currentReply.text } : null,
      timestamp: nowTs,
      time: timeNow,
      status: initialStatus
    };

    // Optimistic UI update and local cache persistence
    setConversations(prev => {
      const chatIndex = prev.findIndex(c => c.id === activeChat.id);
      let updated;
      if (chatIndex >= 0) {
        const targetChat = {
          ...prev[chatIndex],
          lastMessage: newMsg,
          lastMessageTime: timeNow,
          messages: [...(prev[chatIndex].messages || []), newMsg]
        };
        // Move active chat to the top of sidebar list
        updated = [targetChat, ...prev.filter((_, idx) => idx !== chatIndex)];
      } else {
        updated = prev;
      }
      saveCachedConversations(user?.id, updated);
      return updated;
    });

    const attachmentToUpload = selectedAttachment;
    if (!isOffer) setInputMessage('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);

    // Persist to Supabase and Realtime broadcast
    if (user?.id) {
      try {
        // Upload image to Supabase Storage if we have a file attachment
        let cloudImageUrl = null;
        if (attachmentToUpload && attachmentToUpload.file) {
          cloudImageUrl = await uploadChatAttachment(attachmentToUpload.file, activeChat.id, user.id, 'image');
        }

        const savedResult = await sendCloudMessage({
          conversationId: activeChat.id,
          senderId: user.id,
          recipientId: counterpartId,
          senderName: myName,
          senderAvatar: myAvatar,
          text: messageText,
          isOffer,
          offerAmount: offerVal,
          image: cloudImageUrl || imageUrl,
          replyTo: currentReply ? { id: currentReply.id, sender: currentReply.sender, text: currentReply.text } : null,
          productInfo: activeChat.product,
          isRecipientOnline: isCounterpartOnline
        });

        if (savedResult && savedResult.id) {
          setConversations(prev => {
            const updated = prev.map(c => {
              if (c.id === activeChat.id) {
                return {
                  ...c,
                  messages: c.messages.map(m => m.id === newMsg.id ? { ...m, id: savedResult.id, status: savedResult.status || m.status } : m)
                };
              }
              return c;
            });
            saveCachedConversations(user?.id, updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Error sending message to cloud:', err);
      }
    }
  };

  // Handle responding to an offer (Accept / Decline)
  const handleOfferResponse = async (offerVal, accepted) => {
    const text = accepted
      ? `🤝 Offer of ₦${Number(offerVal).toLocaleString('en-NG')} ACCEPTED! Let's arrange inspection and handover.`
      : `❌ Offer of ₦${Number(offerVal).toLocaleString('en-NG')} declined. Thank you for your interest!`;
    
    await handleSendMessage(text);
    setToastMessage(accepted ? 'Offer accepted!' : 'Offer declined.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCloseChat = () => {
    setActiveChatId(null);
    setIsMobileDetailOpen(false);
    setIsChatSearchOpen(false);
    setChatSearchQuery('');
    setCurrentMatchIndex(0);
    router.replace('/messages');
  };

  const handleSelectChat = (id) => {
    // On desktop, clicking the currently active chat deselects / closes it
    if (activeChatId === id && typeof window !== 'undefined' && window.innerWidth >= 768) {
      handleCloseChat();
      return;
    }
    setActiveChatId(id);
    setIsMobileDetailOpen(true);
    setIsChatSearchOpen(false);
    setChatSearchQuery('');
    setCurrentMatchIndex(0);
    router.replace(`/messages?chatId=${id}`);
  };

  const handleMobileBack = () => {
    setActiveChatId(null);
    setIsMobileDetailOpen(false);
    router.replace('/messages');
  };

  const formatPrice = (price) => '₦' + Number(price).toLocaleString('en-NG');

  // If user is not authenticated and auth check finished, render friendly prompt
  if (!authLoading && !user) {
    return (
      <div className="messages-page-wrapper">
        <header className="home-nav-row">
          <NavLink to="/" replace className="home-nav-brand">
            <span className="logo-infi">Infi</span><span className="logo-buy">Buy</span>
          </NavLink>
        </header>
        <div className="messages-auth-prompt-container">
          <div className="messages-auth-card">
            <div className="messages-auth-icon-circle">
              <MessageSquareMore size={40} color="#1d4ed8" />
            </div>
            <h2>Sign in to view your Messages</h2>
            <p>Connect with buyers and sellers, negotiate offers, and keep track of your transactions.</p>
            <NavLink to="/profile" className="messages-auth-btn">
              Sign In / Register
            </NavLink>
            <NavLink to="/" className="messages-auth-home-link">
              ← Return to marketplace
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page-wrapper">
      {/* ── Sticky Desktop Header Navbar ── */}
      <header className="home-nav-row">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-infi">Infi</span><span className="logo-buy">Buy</span>
        </NavLink>
        <div className="home-nav-links">
          <NavLink to="/messages" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <span className="home-nav-icon-btn">
                <div className="home-nav-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquareMore className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  {unreadCount > 0 && (
                    <span className="home-nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </div>
                <div className="home-header-tooltip">My Messages</div>
              </span>
            )}
          </NavLink>
          <NavLink to="/notifications" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <span className="home-nav-icon-btn">
                <div className="home-nav-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BellRing className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  {unreadNotifsCount > 0 && (
                    <span className="home-nav-unread-badge">{unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}</span>
                  )}
                </div>
                <div className="home-header-tooltip">Notifications</div>
              </span>
            )}
          </NavLink>
          <NavLink to="/saved" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <span className="home-nav-icon-btn">
                <Bookmark className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">Saved</div>
              </span>
            )}
          </NavLink>
          <NavLink to="/adverts" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <span className="home-nav-icon-btn">
                <PanelTop className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">My Adverts</div>
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <span className="home-nav-icon-btn">
                <UserRound className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">My Profile</div>
              </span>
            )}
          </NavLink>
          <NavLink to="/sell" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <span className="home-sell-btn">
                <span style={{ color: isActive ? "#1d4ed8" : "#e67600" }} className="home-sell-btn-text">+ Sell</span>
              </span>
            )}
          </NavLink>
        </div>
      </header>

      {/* ── Messages Main Layout Container ── */}
      <div className="messages-container">
        {/* ── LEFT SIDEBAR: Conversation List ── */}
        <div className={`chat-sidebar ${isMobileDetailOpen ? 'mobile-hidden' : ''}`}>
          <div className="chat-sidebar-header">
            <div className="sidebar-title-row">
              <h2 className="sidebar-title">Chats</h2>
              <div className="sidebar-header-actions">
                <button
                  type="button"
                  className="sidebar-round-btn"
                  title="More chat options"
                  onClick={() => setFilterTab(prev => prev === 'unread' ? 'all' : 'unread')}
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Search conversations */}
            <div className="chat-search-wrap">
              <Search className="chat-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search Messenger"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="chat-search-input"
              />
            </div>

            {/* Filter Tabs */}
            <div className="chat-filter-tabs">
              <button
                className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All
              </button>
              <button
                className={`filter-tab ${filterTab === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterTab('unread')}
              >
                Unread
              </button>
              <button
                className={`filter-tab ${filterTab === 'buying' ? 'active' : ''}`}
                onClick={() => setFilterTab('buying')}
              >
                Sellers
              </button>
              <button
                className={`filter-tab ${filterTab === 'selling' ? 'active' : ''}`}
                onClick={() => setFilterTab('selling')}
              >
                Buyers
              </button>
              <button
                className="filter-tab filter-tab-dots"
                onClick={() => setFilterTab(prev => prev === 'unread' ? 'all' : 'unread')}
                title="More filters"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          {/* Conversations List Scrollable Area */}
          <div className="conversations-list">
            {isLoadingConvs ? (
              <div className="empty-chats">
                <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px', border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p className="empty-chats-title">Loading chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-chats">
                <MessageSquareMore size={36} className="empty-chats-icon" />
                <p className="empty-chats-title">No conversations yet</p>
                <p className="empty-chats-sub">When you contact a seller or a buyer messages you, chats appear here.</p>
                <NavLink to="/" className="browse-ads-btn">Browse Marketplace</NavLink>
              </div>
            ) : (
              filteredConversations.map(chat => {
                const msgs = Array.isArray(chat.messages) ? chat.messages : [];
                const lastMsg = msgs[msgs.length - 1];
                const isSelected = chat.id === activeChatId;
                const isUnread = (chat?.unreadCount || 0) > 0;
                const timeAgo = formatSidebarDate(lastMsg);
                const snippetText = lastMsg?.text || (lastMsg?.image ? 'sent an attachment.' : lastMsg?.isVoiceNote ? 'sent a voice note.' : 'No messages yet');

                return (
                  <div
                    key={chat.id}
                    className={`chat-item-card ${isSelected ? 'chat-item-selected' : ''}`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <div className="chat-avatar-wrap">
                      {renderContactAvatar(chat?.contact?.avatar, chat?.contact?.name, "chat-avatar")}
                      {isChatUserOnline(chat) && <span className="online-indicator" title="Online" />}
                    </div>

                    <div className="chat-item-content">
                      <div className="chat-item-top">
                        <span className={`contact-name ${isUnread ? 'unread-bold' : ''}`}>
                          {chat?.contact?.name || 'User'}
                        </span>
                      </div>

                      <div className="chat-item-bottom">
                        <p className={`last-message-text ${isUnread ? 'unread-bold' : ''}`}>
                          {lastMsg?.sender === 'me' && <span className="you-label">You: </span>}
                          {snippetText}
                          {timeAgo ? ` · ${timeAgo}` : ''}
                        </p>
                        {isUnread && (
                          <span className="unread-dot-badge" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT MAIN CHAT AREA: Active Chat ── */}
        <div className={`chat-main-area ${!isMobileDetailOpen ? 'mobile-hidden' : ''}`}>
          {activeChat ? (
            <>
              {/* Chat Top Header - Modern Advanced Design */}
              <div className="chat-main-header">
                {/* Left: Back + Avatar + Contact Info */}
                <div className="header-left">
                  <button
                    className="mobile-back-btn"
                    onClick={handleMobileBack}
                    title="Back to messages"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <button
                    className="header-avatar-btn"
                    onClick={() => handleOpenProfileModal()}
                    title="View profile"
                  >
                    <div className="contact-avatar-wrap">
                      {renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "contact-avatar")}
                      {isChatUserOnline(activeChat) && <span className="online-indicator" title="Online" />}
                    </div>
                  </button>

                  <div className="header-contact-meta">
                    <div className="contact-name-row">
                      <h3 className="contact-heading">{activeChat?.contact?.name || 'User'}</h3>
                    </div>
                    <p className="contact-status-text">
                      {isTyping ? (
                        <span className="typing-indicator">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-label">typing...</span>
                        </span>
                      ) : isChatUserOnline(activeChat) ? (
                        <span className="text-online">Active now</span>
                      ) : (
                        <span className="text-offline">{activeChat?.contact?.lastSeen && activeChat.contact.lastSeen !== 'Online' ? activeChat.contact.lastSeen : 'Offline'}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="chat-header-actions">
                  {/* Phone Call button */}
                  <a
                    href={activeChat?.contact?.phone ? `tel:${activeChat.contact.phone}` : '#'}
                    onClick={(e) => {
                      if (!activeChat?.contact?.phone) {
                        e.preventDefault();
                        showToast('Phone number not provided by user');
                      }
                    }}
                    className="messenger-action-icon-btn"
                    title={`Call ${activeChat?.contact?.name || 'User'}`}
                  >
                    <Phone size={20} />
                  </a>

                  {/* Info (i) button - Messenger signature profile button */}
                  <button
                    type="button"
                    className="messenger-action-icon-btn messenger-info-btn"
                    onClick={() => handleOpenProfileModal()}
                    title="Conversation information"
                  >
                    <Info size={20} />
                  </button>

                  {/* 3-dots Dropdown Menu */}
                  <div className="more-menu-wrapper" ref={menuRef}>
                    <button
                      className="header-icon-btn"
                      onClick={() => setIsMenuOpen(prev => !prev)}
                      title="More options"
                    >
                      <MoreVertical size={20} className="more-menu-icon" />
                    </button>

                    {isMenuOpen && (
                      <div className="chat-options-dropdown">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleOpenProfileModal();
                          }}
                        >
                          <User size={17} className="dropdown-icon" />
                          <span>View profile</span>
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleCloseChat();
                          }}
                        >
                          <X size={17} className="dropdown-icon" />
                          <span>Close chat</span>
                        </button>



                        {activeChat?.contact?.name && (
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setIsMenuOpen(false);
                              toggleFollowSeller(activeChat.contact.name);
                            }}
                          >
                            {isFollowingSeller(activeChat.contact.name) ? (
                              <>
                                <UserMinus size={17} className="dropdown-icon text-danger" />
                                <span className="text-danger">Unfollow seller</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={17} className="dropdown-icon text-primary" />
                                <span className="text-primary">Follow </span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleMoveToSpam(activeChat.id);
                          }}
                        >
                          <AlertCircle size={17} className="dropdown-icon" />
                          <span>Move to spam</span>
                        </button>

                        {activeChat?.contact?.name && (
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setIsMenuOpen(false);
                              handleReportSeller(activeChat.contact.name);
                            }}
                          >
                            <Flag size={17} className="dropdown-icon" />
                            <span>Report this seller</span>
                          </button>
                        )}

                        <div className="dropdown-divider" />

                        <button
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleDeleteChat(activeChat.id);
                          }}
                        >
                          <Trash2 size={17} className="dropdown-icon danger-icon" />
                          <span className="text-danger">Delete chat</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Close conversation button (Desktop) */}
                  <button
                    type="button"
                    className="desktop-close-chat-btn"
                    onClick={handleCloseChat}
                    title="Close conversation"
                    aria-label="Close conversation"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Product Context Strip - shown when chat has an associated product */}
              {activeChat?.product && (
                <div className="product-context-strip">
                  {activeChat.product.image && (
                    <img
                      src={activeChat.product.image}
                      alt={activeChat.product.name || 'Product'}
                      className="product-strip-img"
                    />
                  )}
                  <div className="product-strip-info">
                    <span className="product-strip-label">Chatting about</span>
                    <span className="product-strip-name">{activeChat.product.name || 'Listing'}</span>
                  </div>
                  {activeChat.product.price != null && (
                    <span className="product-strip-price">₦{Number(activeChat.product.price).toLocaleString()}</span>
                  )}
                </div>
              )}

              {/* In-Chat Message Search Bar */}
              {isChatSearchOpen && (
                <div className="in-chat-search-bar">
                  <div className="in-chat-search-input-wrap">
                    <Search size={15} className="in-chat-search-icon" />
                    <input
                      type="text"
                      placeholder="Search in this conversation..."
                      value={chatSearchQuery}
                      onChange={e => {
                        setChatSearchQuery(e.target.value);
                        setCurrentMatchIndex(0);
                      }}
                      className="in-chat-search-input"
                      autoFocus
                    />
                  </div>

                  <div className="in-chat-search-meta">
                    <span className="search-match-count">
                      {chatSearchQuery.trim()
                        ? (chatSearchMatches.length > 0 ? `${currentMatchIndex + 1} of ${chatSearchMatches.length}` : 'No matches')
                        : ''}
                    </span>
                    <button
                      type="button"
                      className="search-nav-btn"
                      onClick={handlePrevMatch}
                      disabled={chatSearchMatches.length <= 1}
                      title="Previous match"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="search-nav-btn"
                      onClick={handleNextMatch}
                      disabled={chatSearchMatches.length <= 1}
                      title="Next match"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="search-close-btn"
                      onClick={() => {
                        setIsChatSearchOpen(false);
                        setChatSearchQuery('');
                      }}
                      title="Close search"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}



              {/* Safety Alert Banner */}
              {showSafetyAlert && (
                <div className="safety-alert">
                  <div className="safety-alert-content">
                    <AlertCircle size={15} className="safety-icon" />
                    <span>
                      {isSellerInChat ? (
                        <><strong>Seller Safety Tip:</strong> Verify buyer identity before sharing your address. Always collect payment before handing over the item.</>
                      ) : (
                        <><strong>Buyer Safety Tip:</strong> Meet in a public place. Do not make advance payments before physical inspection of the item.</>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="close-safety-btn"
                    onClick={() => setShowSafetyAlert(false)}
                    title="Dismiss safety tip"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Message History Thread */}
              <div className="chat-messages-thread" ref={chatThreadRef}>
                {(activeChat.messages || []).map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const isMatch = chatSearchMatches[currentMatchIndex]?.msg.id === msg.id;

                  const currentDateLabel = formatDateDivider(msg);
                  const prevMsg = (activeChat.messages || [])[index - 1];
                  const prevDateLabel = prevMsg ? formatDateDivider(prevMsg) : null;
                  const showDateDivider = index === 0 || currentDateLabel !== prevDateLabel;

                  return (
                    <React.Fragment key={msg.id || index}>
                      {showDateDivider && (
                        <div className="date-divider">
                          <span>{currentDateLabel}</span>
                        </div>
                      )}

                      <div
                        id={`msg-bubble-${msg.id}`}
                        className={`message-bubble-row ${isMe ? 'row-me' : 'row-them'}`}
                      >
                        {!isMe && renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "msg-avatar-mini")}
                        <div className="msg-bubble-wrapper">
                          <div className={`message-bubble ${isMe ? 'bubble-me' : 'bubble-them'} ${msg.isOffer ? 'bubble-offer' : ''} ${isMatch ? 'bubble-search-active' : ''}`}>
                            {/* Quoted Reply snippet */}
                            {msg.replyTo && (
                              <div className="quoted-reply-preview">
                                <div className="quoted-reply-sender">{msg.replyTo.sender === 'me' ? 'You' : (activeChat?.contact?.name || 'Seller')}</div>
                                <div className="quoted-reply-text">{msg.replyTo.text}</div>
                              </div>
                            )}

                            {msg.isVoiceNote ? (
                              <div className="voice-note-bubble-card">
                                <button
                                  type="button"
                                  className="vn-play-btn"
                                  onClick={() => handleTogglePlayAudio(msg.id, msg.audioUrl)}
                                  title={playingAudioId === msg.id ? "Pause voice note" : "Play voice note"}
                                >
                                  {playingAudioId === msg.id ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                                <div className="vn-waveform-wrap">
                                  <div className={`vn-bars ${playingAudioId === msg.id ? 'playing' : ''}`}>
                                    <span className="vn-bar" />
                                    <span className="vn-bar" />
                                    <span className="vn-bar" />
                                    <span className="vn-bar" />
                                    <span className="vn-bar" />
                                    <span className="vn-bar" />
                                    <span className="vn-bar" />
                                  </div>
                                  <span className="vn-duration">0:{msg.duration < 10 ? `0${msg.duration}` : msg.duration}</span>
                                </div>
                              </div>
                            ) : msg.image ? (
                              <div className="image-attachment-bubble">
                                <img 
                                  src={msg.image} 
                                  alt="Attachment" 
                                  className="msg-attachment-img clickable-img" 
                                  onClick={() => setLightboxImage(msg.image)}
                                  title="Click to view full image"
                                />
                                {msg.text && (
                                  <p className="message-text margin-top-xs">
                                    {renderHighlightedText(msg.text, isChatSearchOpen ? chatSearchQuery : searchQuery)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="message-text">
                                {renderHighlightedText(msg.text, isChatSearchOpen ? chatSearchQuery : searchQuery)}
                              </p>
                            )}
                            {/* Offer response buttons for recipient */}
                            {msg.isOffer && !isMe && msg.offerAmount && (
                              <div className="offer-response-row">
                                <button
                                  type="button"
                                  className="btn-offer-accept"
                                  onClick={() => handleOfferResponse(msg.offerAmount, true)}
                                >
                                  Accept (₦{Number(msg.offerAmount).toLocaleString()})
                                </button>
                                <button
                                  type="button"
                                  className="btn-offer-decline"
                                  onClick={() => handleOfferResponse(msg.offerAmount, false)}
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                            <div className="message-meta">
                              <span className="msg-time">{msg.time}</span>
                            </div>
                          </div>

                          {/* Seen Avatar / Status indicator for Outgoing messages */}
                          {isMe && (
                            <div className="msg-read-status-row">
                              {msg.status === 'read' ? (
                                <div className="seen-avatar-wrap" title={`Seen by ${activeChat?.contact?.name || 'User'}`}>
                                  {renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "seen-avatar-mini")}
                                </div>
                              ) : (
                                <span className="msg-status-indicator" title={msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                                  {msg.status === 'delivered' ? (
                                    <CheckCheck size={12} className="status-icon status-delivered" />
                                  ) : (
                                    <Check size={12} className="status-icon status-sent" />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Hover Quick Actions */}
                          <div className="msg-hover-actions">
                            <button
                              type="button"
                              className="msg-action-btn"
                              title="Reply to message"
                              onClick={() => setReplyingToMessage({
                                id: msg.id,
                                sender: msg.sender,
                                text: msg.text || (msg.isVoiceNote ? '🎙️ Voice Note' : msg.image ? '📷 Photo' : 'Message')
                              })}
                            >
                              <CornerUpLeft size={13} />
                            </button>
                            {msg.text && (
                              <button
                                type="button"
                                className="msg-action-btn"
                                title="Copy text"
                                onClick={() => {
                                  if (navigator?.clipboard?.writeText) {
                                    navigator.clipboard.writeText(msg.text);
                                  }
                                  showToast('Text copied to clipboard');
                                }}
                              >
                                <Copy size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="msg-action-btn msg-action-delete"
                              title={msg.isVoiceNote ? "Delete voice note" : "Delete message"}
                              onClick={() => setDeleteMessageModal({ chatId: activeChat.id, messageId: msg.id, isVoiceNote: msg.isVoiceNote })}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* In-stream Typing Indicator */}
                {isTyping && (
                  <div className="stream-typing-row">
                    {renderContactAvatar(activeChat?.contact?.avatar, activeChat?.contact?.name, "msg-avatar-mini")}
                    <div className="stream-typing-bubble">
                      <span className="typing-bounce-dot" />
                      <span className="typing-bounce-dot" />
                      <span className="typing-bounce-dot" />
                    </div>
                  </div>
                )}
              </div>

              {/* Replying Preview Bar */}
              {replyingToMessage && (
                <div className="chat-reply-preview-bar">
                  <div className="reply-preview-info">
                    <span className="reply-preview-label">
                      Replying to {replyingToMessage.sender === 'me' ? 'yourself' : (activeChat?.contact?.name || 'Seller')}
                    </span>
                    <span className="reply-preview-snippet">{replyingToMessage.text}</span>
                  </div>
                  <button
                    type="button"
                    className="reply-preview-close"
                    onClick={() => setReplyingToMessage(null)}
                    title="Cancel reply"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Quick Reply Chips - Tailored for Seller vs Buyer */}
              <div className="quick-reply-bar">
                {isSellerInChat ? (
                  <>
                    {activeChat?.product?.price && (
                      <button 
                        type="button"
                        className="quick-chip quick-chip-seller" 
                        onClick={() => {
                          setChatOfferAmount(activeChat.product.price ? String(Math.round(activeChat.product.price * 0.95)) : '');
                          setShowInChatOfferModal(true);
                        }}
                        title="Propose a special discounted price to this buyer"
                      >
                        🏷️ Special Price
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="quick-chip quick-chip-affirmative" 
                      onClick={() => handleSendMessage("Yes, it is still available and ready for inspection/pickup.")}
                    >
                      ✅ Yes, available
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("I can do a slight discount for a serious buyer. What is your offer?")}
                    >
                      🤝 What's your offer?
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip quick-chip-firm" 
                      onClick={() => handleSendMessage("The price is fixed and very fair considering its condition.")}
                    >
                      🔒 Price is firm
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("You are welcome to inspect and test it before paying. When are you free to meet?")}
                    >
                      📍 Ready for inspection
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("Yes, delivery can be arranged. Where is your location?")}
                    >
                      🚚 Delivery available
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("We can meet in a public, safe location for inspection. Where works for you?")}
                    >
                      📦 Suggest meeting spot
                    </button>
                  </>
                ) : (
                  <>
                    {activeChat?.product?.price && (
                      <button 
                        type="button"
                        className="quick-chip quick-chip-offer" 
                        onClick={() => {
                          setChatOfferAmount(activeChat.product.price ? String(Math.round(activeChat.product.price * 0.9)) : '');
                          setShowInChatOfferModal(true);
                        }}
                      >
                        🏷️ Make an Offer
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("Is this still available?")}
                    >
                      Is this available?
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("What is your best/last price for this?")}
                    >
                      What's last price?
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("Can I come inspect and test it today?")}
                    >
                      Can I inspect today?
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("Can you deliver to my location?")}
                    >
                      Delivery options?
                    </button>
                    <button 
                      type="button" 
                      className="quick-chip" 
                      onClick={() => handleSendMessage("Where is a safe, public spot for us to meet?")}
                    >
                      Suggest meeting spot
                    </button>
                  </>
                )}
              </div>

              {/* Attachment Preview Bar */}
              {selectedAttachment && (
                <div className="attachment-preview-bar">
                  <div className="attachment-thumb-box">
                    {selectedAttachment.type === 'image' ? (
                      <img src={selectedAttachment.previewUrl} alt="preview" className="attachment-preview-img" />
                    ) : (
                      <FileText size={20} className="doc-icon" />
                    )}
                  </div>
                  <span className="attachment-filename">{selectedAttachment.name}</span>
                  <button
                    type="button"
                    className="remove-attachment-btn"
                    onClick={() => setSelectedAttachment(null)}
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="emoji-picker-popover" ref={emojiPickerRef}>
                  <div className="emoji-picker-header">
                    <div className="emoji-search-wrapper">
                      <Search size={15} className="emoji-search-icon" />
                      <input
                        type="text"
                        placeholder="Search emojis e.g. 'naira', 'car', 'heart'..."
                        value={emojiSearchQuery}
                        onChange={(e) => setEmojiSearchQuery(e.target.value)}
                        className="emoji-search-input"
                      />
                      {emojiSearchQuery && (
                        <button
                          type="button"
                          className="emoji-clear-btn"
                          onClick={() => setEmojiSearchQuery('')}
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {!emojiSearchQuery && (
                    <div className="emoji-category-tabs">
                      {EMOJI_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`emoji-tab-btn ${activeEmojiCategory === cat.id ? 'active' : ''}`}
                          onClick={() => setActiveEmojiCategory(cat.id)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="emoji-scroll-area">
                    {displayedEmojis.length > 0 ? (
                      <div className="emoji-grid">
                        {displayedEmojis.map((item) => (
                          <button
                            key={item.char + item.name}
                            type="button"
                            className="emoji-btn"
                            title={`${item.name} (${item.keywords.slice(0, 3).join(', ')})`}
                            onClick={() => handleSelectEmoji(item.char)}
                            onMouseEnter={() => setHoveredEmojiItem(item)}
                            onMouseLeave={() => setHoveredEmojiItem(null)}
                          >
                            {item.char}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="emoji-empty-state">
                        <p className="empty-text">No emojis found for "{emojiSearchQuery}"</p>
                        <button
                          type="button"
                          className="reset-search-btn"
                          onClick={() => setEmojiSearchQuery('')}
                        >
                          Show all emojis
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="emoji-picker-footer">
                    {hoveredEmojiItem ? (
                      <span className="emoji-footer-preview">
                        <span className="preview-char">{hoveredEmojiItem.char}</span>
                        <span className="preview-name">{hoveredEmojiItem.name}</span>
                      </span>
                    ) : (
                      <span className="emoji-footer-count">
                        {displayedEmojis.length} {displayedEmojis.length === 1 ? 'emoji' : 'emojis'} available
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Message Input Footer Bar & Voice Recorder */}
              {isRecordingAudio ? (
                <div className="voice-recorder-bar">
                  <div className="recorder-status">
                    <span className="recording-dot" />
                    <span className="recording-timer">0:{recordingTimer < 10 ? `0${recordingTimer}` : recordingTimer}</span>
                  </div>
                  <div className="recording-waveform">
                    <span className="wave-bar bar-1" />
                    <span className="wave-bar bar-2" />
                    <span className="wave-bar bar-3" />
                    <span className="wave-bar bar-4" />
                    <span className="wave-bar bar-5" />
                  </div>
                  <button
                    type="button"
                    className="cancel-record-btn"
                    onClick={cancelVoiceRecord}
                    title="Cancel recording"
                  >
                    <X size={18} />
                  </button>
                  <button
                    type="button"
                    className="send-record-btn"
                    onClick={sendVoiceRecord}
                    title="Send voice note"
                  >
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <form
                  className="chat-input-row"
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach photo or document"
                  >
                    <ImageIcon size={20} />
                  </button>

                  <button
                    type="button"
                    className={`input-action-btn ${showEmojiPicker ? 'active' : ''}`}
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                    title="Insert emoji"
                  >
                    <Smile size={20} />
                  </button>

                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={startVoiceRecord}
                    title="Record voice note"
                  >
                    <Mic size={20} />
                  </button>

                  <input
                    type="text"
                    placeholder="Aa"
                    value={inputMessage}
                    onChange={e => {
                      setInputMessage(e.target.value);
                      // Broadcast typing indicator (debounced)
                      if (activeChat?.id && user?.id && e.target.value.trim()) {
                        if (typingBroadcastRef.current) clearTimeout(typingBroadcastRef.current);
                        typingBroadcastRef.current = setTimeout(() => {
                          broadcastTyping(activeChat.id, user.id);
                        }, 300);
                      }
                    }}
                    className="chat-text-input"
                  />

                  <button
                    type="submit"
                    className={`send-btn ${inputMessage.trim() || selectedAttachment ? 'send-btn-active' : ''}`}
                    title="Send message"
                    disabled={!inputMessage.trim() && !selectedAttachment}
                  >
                    <Send size={18} />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="no-active-chat-wrapper">
              <div className="human-empty-container">
                {/* Friendly SVG Illustration of human dialogue */}
                <div className="human-empty-art-wrap">
                  <svg
                    width="112"
                    height="112"
                    viewBox="0 0 112 112"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="human-empty-svg"
                    aria-hidden="true"
                  >
                    <circle cx="56" cy="56" r="50" fill="#f0f7ff" stroke="#e0edfd" strokeWidth="1.5" />
                    
                    <circle cx="86" cy="28" r="3.5" fill="#60a5fa" opacity="0.75" />
                    <circle cx="24" cy="42" r="2.5" fill="#93c5fd" opacity="0.6" />
                    <circle cx="84" cy="84" r="2" fill="#3b82f6" opacity="0.5" />

                    {/* Sender speech bubble (brand blue) */}
                    <g filter="url(#shadow-bubble-1)">
                      <rect x="25" y="32" width="46" height="34" rx="12" fill="#1d4ed8" />
                      <path d="M31 66 L25 73 L38 66 Z" fill="#1d4ed8" />
                      <rect x="33" y="43" width="24" height="3.5" rx="1.75" fill="#ffffff" />
                      <rect x="33" y="51" width="16" height="3.5" rx="1.75" fill="rgba(255,255,255,0.7)" />
                    </g>

                    {/* Recipient speech bubble (white with reply dots) */}
                    <g filter="url(#shadow-bubble-2)">
                      <rect x="46" y="50" width="44" height="32" rx="12" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
                      <path d="M82 82 L88 89 L80 81 Z" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
                      <circle cx="58" cy="66" r="2.75" fill="#1d4ed8" />
                      <circle cx="68" cy="66" r="2.75" fill="#2563eb" opacity="0.8" />
                      <circle cx="78" cy="66" r="2.75" fill="#60a5fa" opacity="0.65" />
                    </g>

                    <defs>
                      <filter id="shadow-bubble-1" x="20" y="28" width="56" height="52" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1d4ed8" floodOpacity="0.18" />
                      </filter>
                      <filter id="shadow-bubble-2" x="42" y="46" width="54" height="50" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.08" />
                      </filter>
                    </defs>
                  </svg>
                </div>

                <h2 className="human-empty-title">
                  {user?.user_metadata?.full_name 
                    ? `Welcome back, ${user.user_metadata.full_name.trim().split(/\s+/)[0]}! 👋` 
                    : (user?.user_metadata?.name 
                        ? `Welcome back, ${user.user_metadata.name.trim().split(/\s+/)[0]}! 👋` 
                        : 'Select a conversation')}
                </h2>

                <p className="human-empty-subtitle">
                  Choose someone from your conversations on the left to discuss an item, ask questions, or agree on a deal.
                </p>

                <div className="human-tips-row">
                  <div className="human-tip-card">
                    <span className="human-tip-emoji" role="img" aria-label="Chat">💬</span>
                    <div className="human-tip-text">
                      <strong>Say hello</strong>
                      <small>Ask about item condition & details</small>
                    </div>
                  </div>

                  <div className="human-tip-card">
                    <span className="human-tip-emoji" role="img" aria-label="Handshake">🤝</span>
                    <div className="human-tip-text">
                      <strong>Make an offer</strong>
                      <small>Bargain and agree on a fair price</small>
                    </div>
                  </div>

                  <div className="human-tip-card">
                    <span className="human-tip-emoji" role="img" aria-label="Pin">📍</span>
                    <div className="human-tip-text">
                      <strong>Meet safely</strong>
                      <small>Pick public places for pickups</small>
                    </div>
                  </div>
                </div>

                <div className="human-empty-actions">
                  <NavLink to="/" className="human-browse-btn">
                    <Search size={16} />
                    <span>Browse marketplace</span>
                  </NavLink>
                </div>

                <div className="human-trust-footer">
                  <ShieldCheck size={14} className="human-trust-icon" />
                  <span>Private and protected peer-to-peer messaging</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SELLER PROFILE PAGE MODAL ── */}
      {showProfileModal && activeChat && (() => {
        if (!isSellerDataFetched || isLoadingSellerData || loadedSellerContactId !== activeChat.contact?.id) {
          return null; // Display NOTHING if the data has not been fetched yet!
        }
        const isMetaMatchingActiveChat = loadedSellerContactId === activeChat.contact?.id;
        const metaToUse = isMetaMatchingActiveChat ? sellerProfileMeta : null;
        const sellerYearsText = formatMemberSince(
          activeChat.contact?.memberSince, 
          metaToUse?.created_at || activeChat.contact?.created_at
        );
        const sellerPhoneNum = metaToUse?.phone || activeChat.contact?.phone || '';
        const sellerWhatsAppNum = metaToUse?.whatsapp || activeChat.contact?.whatsapp || sellerPhoneNum;
        const isSellerVerified = Boolean(metaToUse?.verified ?? activeChat.contact?.verified);
        const sellerRatingVal = metaToUse?.rating || activeChat.contact?.rating || null;

        return (
          <div className="jiji-profile-backdrop" onClick={handleCloseProfileModal}>
            <div className="jiji-profile-container" onClick={e => e.stopPropagation()}>
              
              {/* Top Navigation Bar in InfiBuy Signature Warm Orange */}
              <div className="jiji-nav-header">
                <button 
                  type="button" 
                  className="jiji-back-btn" 
                  onClick={handleCloseProfileModal}
                  title="Back to conversation"
                  aria-label="Back to conversation"
                >
                  <ArrowLeft size={22} />
                </button>

                <div className="jiji-nav-search-wrap">
                  <input 
                    type="text"
                    placeholder={`Search listings from ${activeChat.contact?.name || 'Seller'}...`}
                    value={sellerSearchQuery}
                    onChange={e => setSellerSearchQuery(e.target.value)}
                    className="jiji-nav-search-input"
                  />
                  {sellerSearchQuery && (
                    <button 
                      type="button" 
                      className="jiji-clear-search-btn"
                      onClick={() => setSellerSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="jiji-advert-count-badge" title="Total active listings">
                  <span>{filteredSellerAdverts.length}</span>
                  <Tag size={15} />
                </div>

                <button
                  type="button"
                  className="jiji-share-header-btn"
                  onClick={handleShareSellerProfile}
                  title="Share seller profile"
                  aria-label="Share seller profile"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="jiji-modal-scroll-area">
                
                {/* Seller Identity Card */}
                <div className="jiji-seller-card">
                  <div className="jiji-seller-top-row">
                    {/* Rounded avatar */}
                    <div className="jiji-hex-avatar-wrap">
                      {renderContactAvatar(activeChat.contact?.avatar, activeChat.contact?.name, "jiji-hex-avatar")}
                    </div>

                    <div className="jiji-seller-details">
                      <h2 className="jiji-seller-name">{activeChat.contact?.name || 'Seller'}</h2>
                      
                      <div className="jiji-seller-badges-row">
                        <span className="jiji-badge-pill" title={`Member for ${sellerYearsText}`}>
                          <User size={13} />
                          {sellerYearsText}
                        </span>
                        {isSellerVerified && (
                          <span className="jiji-badge-pill jiji-badge-verified">
                            <ShieldCheck size={13} />
                            Verified Seller
                          </span>
                        )}
                      </div>

                      <div className="jiji-last-seen-row">
                        <span className={`jiji-last-seen-pill ${isChatUserOnline(activeChat) ? 'is-online' : ''}`}>
                          {isChatUserOnline(activeChat) ? '● Online now' : (activeChat.contact?.lastSeen && activeChat.contact.lastSeen !== 'Online' ? activeChat.contact.lastSeen : 'Offline')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Show Contact CTA Button / Revealed Contacts */}
                  {!showSellerContact ? (
                    <button 
                      type="button" 
                      className="jiji-show-contact-btn"
                      onClick={() => setShowSellerContact(true)}
                    >
                      <Phone size={18} />
                      <span>Show contact</span>
                    </button>
                  ) : (
                    <div className="jiji-revealed-contact-box">
                      {sellerPhoneNum ? (
                        <>
                          <div className="jiji-revealed-phone-number">
                            <Phone size={18} />
                            <a href={`tel:${sellerPhoneNum}`}>
                              {sellerPhoneNum}
                            </a>
                          </div>
                          <div className="jiji-revealed-actions">
                            <a 
                              href={`tel:${sellerPhoneNum}`} 
                              className="jiji-call-link"
                              title="Call seller phone directly"
                            >
                              <Phone size={14} /> Call Now
                            </a>
                            {sellerWhatsAppNum && (
                              <a 
                                href={`https://wa.me/${String(sellerWhatsAppNum).replace(/[^\d]/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="jiji-whatsapp-link"
                                title="Chat with seller on WhatsApp"
                              >
                                WhatsApp
                              </a>
                            )}
                            <button
                              type="button"
                              className="jiji-message-shortcut-btn"
                              onClick={handleCloseProfileModal}
                              title="Return to message this seller in chat"
                            >
                              <MessageSquareMore size={14} /> Message
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.86rem', color: '#64748b' }}>
                            No phone number published by this seller.
                          </p>
                          <button
                            type="button"
                            className="jiji-message-shortcut-btn"
                            onClick={handleCloseProfileModal}
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            <MessageSquareMore size={15} /> Message in InfiBuy Chat
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Clean Listings Section Header (price, brand new, condition, and sort filters removed per user request) */}
                <div className="jiji-listings-header-clean">
                  <div className="jiji-listings-count-wrap">
                    <h3 className="jiji-listings-title">
                      Listings ({filteredSellerAdverts.length})
                    </h3>
                    {sellerSearchQuery && (
                      <span className="jiji-search-tag">
                        "{sellerSearchQuery}"
                      </span>
                    )}
                  </div>

                  <div className="jiji-view-toggle-wrap">
                    <button 
                      type="button" 
                      className="jiji-view-toggle-btn"
                      onClick={() => setIsSellerGridView(prev => !prev)}
                      title={isSellerGridView ? 'Switch to list view' : 'Switch to grid view'}
                      aria-label="Toggle list or grid view"
                    >
                      {isSellerGridView ? <List size={16} /> : <Grid size={16} />}
                    </button>
                  </div>
                </div>

                {/* Adverts Grid / List */}
                <div className={isSellerGridView ? "jiji-adverts-grid" : "jiji-adverts-list"}>
                  {isLoadingSellerData && sellerAdverts.length === 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', width: '100%', padding: '12px 0' }}>
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{ height: '220px', borderRadius: '14px', background: '#f1f5f9', animation: 'buyohSkeletonPulse 1.5s infinite', border: '1px solid #e2e8f0' }} />
                      ))}
                    </div>
                  ) : filteredSellerAdverts.length === 0 ? (
                    <div className="jiji-empty-adverts">
                      <p>
                        {sellerSearchQuery 
                          ? `No listings matching "${sellerSearchQuery}".` 
                          : 'This user has no active listings.'}
                      </p>
                      {sellerSearchQuery && (
                        <button 
                          type="button" 
                          className="jiji-clear-empty-search-btn"
                          onClick={() => setSellerSearchQuery('')}
                        >
                          Clear search filter
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredSellerAdverts.map((ad, idx) => {
                      const adImg = ad.image || (Array.isArray(ad.images) ? ad.images[0] : null) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
                      const adPrice = Number(ad.price || 0);
                      const adTitle = ad.name || ad.title || 'Marketplace Item';
                      const adLocation = ad.location || sellerProfileMeta?.location || activeChat.contact?.location || 'Lagos, Nigeria';
                      const adCondition = ad.condition || 'Used';
                      const isConditionNew = adCondition.toLowerCase().includes('new');

                      return (
                        <div 
                          key={ad.id || idx} 
                          className="jiji-ad-card"
                          onClick={() => {
                            if (ad.id) {
                              setShowProfileModal(false);
                              router.push(`/product/${ad.id}?fromProfile=1&chatId=${activeChat.id}&sellerName=${encodeURIComponent(activeChat.contact?.name || '')}`);
                            }
                          }}
                        >
                          <div className="jiji-ad-img-wrapper">
                            <img src={adImg} alt={adTitle} className="jiji-ad-img" loading="lazy" />
                            
                            <div className="jiji-ad-img-badges">
                              {isSellerVerified && (
                                <span className="jiji-ad-subbadge">
                                  <ShieldCheck size={11} />
                                  Verified Seller
                                </span>
                              )}
                              <span className="jiji-ad-subbadge" title="Seller account tenure on InfiBuy">
                                <User size={11} />
                                SELLER: {sellerYearsText.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="jiji-ad-content">
                            <span className="jiji-ad-price">
                              ₦ {adPrice.toLocaleString('en-NG')}
                            </span>
                            <h4 className="jiji-ad-title" title={adTitle}>
                              {adTitle}
                            </h4>
                            <span className="jiji-ad-location" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <MapPin size={13} />
                                {adLocation}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>
                                <Clock size={11} />
                                {formatAdPostedTime(ad.created_at || ad.createdAt || ad.timestamp || ad.date)}
                              </span>
                            </span>
                            <div className="jiji-ad-footer-row">
                              <span className={`jiji-ad-condition-pill ${isConditionNew ? 'condition-new' : 'condition-used'}`}>{adCondition}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Follow Card CTA */}
                <div className="jiji-follow-cta-card">
                  <h4 className="jiji-follow-cta-title">Want to know when this seller posts new items?</h4>
                  <button 
                    type="button" 
                    className={`jiji-follow-submit-btn ${isFollowingSeller(activeChat.contact?.name) ? 'following' : ''}`}
                    onClick={() => toggleFollowSeller(activeChat.contact?.name)}
                  >
                    <UserPlus size={16} />
                    <span>{isFollowingSeller(activeChat.contact?.name) ? 'Following' : 'Follow Seller'}</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}


      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── DELETE MESSAGE MODAL ── */}
      {deleteMessageModal && (
        <div className="modal-backdrop" onClick={() => setDeleteMessageModal(null)}>
          <div className="delete-dialog-card" onClick={e => e.stopPropagation()}>
            <h3>Delete {deleteMessageModal.isVoiceNote ? 'Voice Note' : 'Message'}?</h3>
            <p>Are you sure you want to delete this {deleteMessageModal.isVoiceNote ? 'voice note' : 'message'}? It will be removed from your chat history.</p>
            <div className="delete-modal-actions">
              <button 
                type="button"
                className="btn-confirm-delete" 
                onClick={() => handleDeleteMessage(deleteMessageModal.chatId, deleteMessageModal.messageId)}
              >
                Delete
              </button>
              <button 
                type="button" 
                className="btn-cancel-delete" 
                onClick={() => setDeleteMessageModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IN-CHAT MAKE AN OFFER MODAL ── */}
      {showInChatOfferModal && activeChat && (
        <div className="chat-modal-backdrop" onClick={() => setShowInChatOfferModal(false)}>
          <div className="chat-modal-card" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3 className="chat-modal-title">
                {isSellerInChat ? 'Offer Special Price' : 'Make an Offer'}
              </h3>
              <button 
                type="button" 
                className="chat-modal-close" 
                onClick={() => setShowInChatOfferModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-modal-product-summary">
              {activeChat.product?.image && (
                <img src={activeChat.product.image} alt={activeChat.product.name} className="chat-modal-prod-img" />
              )}
              <div className="chat-modal-prod-info">
                <div className="chat-modal-prod-name">{activeChat.product?.name || 'Listing'}</div>
                <div className="chat-modal-prod-price">
                  Listed Price: <strong>₦{Number(activeChat.product?.price || 0).toLocaleString('en-NG')}</strong>
                </div>
              </div>
            </div>

            {Boolean(activeChat.product?.price) && (
              <div className="chat-preset-discounts">
                <span className="preset-label">
                  {isSellerInChat ? 'Quick discount options:' : 'Quick discount offers:'}
                </span>
                <div className="preset-chips-row">
                  {[-5, -10, -15, -20].map(pct => {
                    const discounted = Math.round(activeChat.product.price * (1 + pct / 100));
                    return (
                      <button
                        key={pct}
                        type="button"
                        className={`preset-chip ${chatOfferAmount === String(discounted) ? 'active' : ''}`}
                        onClick={() => setChatOfferAmount(String(discounted))}
                      >
                        {pct}% (₦{discounted.toLocaleString('en-NG')})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="chat-modal-input-wrap">
              <label className="chat-modal-label">
                {isSellerInChat ? 'Special Price for Buyer (₦)' : 'Your Offer Amount (₦)'}
              </label>
              <input
                type="number"
                className="chat-modal-input"
                placeholder={isSellerInChat ? "Enter special price in ₦" : "Enter offer in ₦ e.g. 45000"}
                value={chatOfferAmount}
                onChange={e => setChatOfferAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="chat-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowInChatOfferModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                disabled={!chatOfferAmount || Number(chatOfferAmount) <= 0}
                onClick={() => {
                  const val = Number(chatOfferAmount);
                  if (val > 0) {
                    const msgPrefix = isSellerInChat ? '🏷️ Seller Special Price:' : '🏷️ Proposed Offer:';
                    handleSendMessage(`${msgPrefix} ₦${val.toLocaleString('en-NG')}`, true, val);
                    setShowInChatOfferModal(false);
                    setChatOfferAmount('');
                    showToast(isSellerInChat ? `Special price of ₦${val.toLocaleString('en-NG')} sent!` : `Offer of ₦${val.toLocaleString('en-NG')} sent!`);
                  }
                }}
              >
                {isSellerInChat ? 'Send Special Price' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX FULLSCREEN MODAL ── */}
      {lightboxImage && (
        <div className="chat-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <button 
            type="button" 
            className="chat-lightbox-close" 
            onClick={() => setLightboxImage(null)}
            title="Close image preview"
          >
            <X size={24} />
          </button>
          <a 
            href={lightboxImage} 
            download="buyoh-attachment.jpg" 
            target="_blank" 
            rel="noreferrer" 
            className="chat-lightbox-download"
            onClick={e => e.stopPropagation()}
            title="Download image"
          >
            <Download size={18} />
            <span>Download</span>
          </a>
          <img 
            src={lightboxImage} 
            alt="Full Preview" 
            className="chat-lightbox-img" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
