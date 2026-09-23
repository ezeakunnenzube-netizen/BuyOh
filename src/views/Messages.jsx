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
  BellOff, Bell, Video, UserPlus, UserMinus, Star, SlidersHorizontal,
  Grid, List, Crown, MessageCircle, MapPin, CornerUpLeft, Copy, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { supabase } from '../lib/supabaseClient';
import { getFollowedSellersForUser, saveFollowedSellersForUser, getNotificationsForUser, saveNotificationsForUser, getUserProfileData } from '../utils/userSync';
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

// Helper to format date display for the sidebar chat item card
const formatSidebarDate = (msg) => {
  if (!msg) return '';
  
  if (msg.timestamp) {
    const msgDate = new Date(msg.timestamp);
    const now = new Date();
    const isToday = msgDate.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = msgDate.toDateString() === yesterday.toDateString();

    if (isToday) {
      return msg.time || msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday) {
      return 'Yesterday';
    }
    const diffDays = Math.floor((now - msgDate) / ONE_DAY);
    if (diffDays < 7) {
      return msgDate.toLocaleDateString([], { weekday: 'short' });
    }
    return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

// Helper to format date divider headers inside message thread
const formatDateDivider = (msg) => {
  if (!msg) return 'Today';
  
  if (msg.timestamp) {
    const msgDate = new Date(msg.timestamp);
    const now = new Date();
    if (msgDate.toDateString() === now.toDateString()) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (msg.time === 'Yesterday' || msg.dateLabel === 'Yesterday') return 'Yesterday';
  if (msg.time?.includes('ago')) return msg.time;
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
  const [conversations, setConversations] = useState([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
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
          if (paramChatId && syncedConvs.some(c => c.id === paramChatId)) {
            setActiveChatId(paramChatId);
          } else if (syncedConvs.length > 0 && !activeChatId) {
            setActiveChatId(syncedConvs[0].id);
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
                  verified: true,
                  phone: '+234 800 000 0000',
                  location: 'Nigeria'
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

              if (!activeChatIdRef.current) {
                setActiveChatId(autoCreatedConv.id);
                setIsMobileDetailOpen(true);
              }

              const nextList = [autoCreatedConv, ...prev];
              saveCachedConversations(user?.id, nextList);
              return nextList;
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
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  
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
  const [sellerAdverts, setSellerAdverts] = useState([]);
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [showSellerContact, setShowSellerContact] = useState(false);
  const [sellerFilterCondition, setSellerFilterCondition] = useState('all');
  const [sellerSortOrder, setSellerSortOrder] = useState('newest');
  const [isSellerGridView, setIsSellerGridView] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const menuRef = useRef(null);

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
    setToastMessage('Chat deleted');
    setTimeout(() => setToastMessage(''), 3000);
    setIsMobileDetailOpen(false);
  };

  const handleMoveToSpam = (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
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
                verified: true,
                phone: poolItem?.sellerPhone || poolItem?.phone || '+234 800 000 0000',
                location: poolItem?.location || 'Nigeria'
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

  const activeChat = conversations.find(c => c.id === activeChatId) || (conversations.length > 0 ? conversations[0] : null);

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

  // Fetch seller adverts for Jiji-style profile page
  useEffect(() => {
    if (!showProfileModal || !activeChat?.contact) return;
    setShowSellerContact(false);
    setSellerSearchQuery('');

    const fetchSellerData = async () => {
      const counterpartId = activeChat.contact.id;
      let listings = [];
      if (counterpartId) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('my_listings, phone, whatsapp, location, verified, rating, created_at')
            .eq('id', counterpartId)
            .single();

          if (prof?.my_listings && Array.isArray(prof.my_listings) && prof.my_listings.length > 0) {
            listings = prof.my_listings;
          }
        } catch (e) {}
      }

      if (listings.length === 0) {
        try {
          const { getGeneralProductPool } = await import('../utils/userSync');
          const pool = getGeneralProductPool(user);
          const matched = pool.filter(p => 
            (counterpartId && String(p.sellerId) === String(counterpartId)) ||
            (activeChat.contact.name && String(p.sellerName).toLowerCase() === String(activeChat.contact.name).toLowerCase())
          );
          if (matched.length > 0) {
            listings = matched;
          }
        } catch (e) {}
      }

      if (listings.length === 0 && activeChat.product?.name) {
        listings = [activeChat.product];
      }

      setSellerAdverts(listings);
    };

    fetchSellerData();
  }, [showProfileModal, activeChat]);

  // Memoized filtered adverts for Jiji seller modal
  const filteredSellerAdverts = React.useMemo(() => {
    let list = [...sellerAdverts];
    const q = sellerSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item => 
        (item.name || item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.condition || '').toLowerCase().includes(q)
      );
    }
    if (sellerFilterCondition !== 'all') {
      list = list.filter(item => (item.condition || '').toLowerCase().includes(sellerFilterCondition.toLowerCase()));
    }
    if (sellerSortOrder === 'price_low') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sellerSortOrder === 'price_high') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    return list;
  }, [sellerAdverts, sellerSearchQuery, sellerFilterCondition, sellerSortOrder]);

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

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setIsMobileDetailOpen(true);
    setIsChatSearchOpen(false);
    setChatSearchQuery('');
    setCurrentMatchIndex(0);
    router.replace(`/messages?chatId=${id}`);
  };

  const handleMobileBack = () => {
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
              <h2 className="sidebar-title">Messages</h2>
              <span className="unread-total-badge">
                {conversations.reduce((acc, c) => acc + c.unreadCount, 0)} New
              </span>
            </div>

            {/* Search conversations */}
            <div className="chat-search-wrap">
              <Search className="chat-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search chats or items..."
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
                        <span className="contact-name">{chat?.contact?.name || 'User'}</span>
                        <span className="chat-time">{formatSidebarDate(lastMsg)}</span>
                      </div>

                      <div className="product-mini-preview">
                        <Tag size={12} className="tag-icon" />
                        <span className="product-mini-name">{chat?.product?.name || 'Listing'}</span>
                      </div>

                      <div className="chat-item-bottom">
                        <p className="last-message-text">
                          {lastMsg?.sender === 'me' && <span className="you-label">You: </span>}
                          {lastMsg?.text || 'No messages yet'}
                        </p>
                        <div className="chat-item-badges">
                          {chat?.isMuted && <BellOff size={13} className="chat-muted-icon" title="Muted" />}
                          {(chat?.unreadCount || 0) > 0 && (
                            <span className="unread-badge">{chat.unreadCount}</span>
                          )}
                        </div>
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
                    onClick={() => setShowProfileModal(true)}
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
                      {activeChat?.contact?.verified && (
                        <ShieldCheck size={14} className="verified-badge-icon" title="Verified Seller" />
                      )}
                      {activeChat?.isMuted && (
                        <BellOff size={14} className="header-muted-indicator" title="Muted" />
                      )}
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
                        <span className="text-online">● Online</span>
                      ) : (
                        <span className="text-offline">● {activeChat?.contact?.lastSeen && activeChat.contact.lastSeen !== 'Online' ? activeChat.contact.lastSeen : 'Offline'}{activeChat?.contact?.location ? ` · ${activeChat.contact.location}` : ''}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="chat-header-actions">
                  {/* Mute toggle button */}
                  <button
                    className={`header-icon-btn ${activeChat?.isMuted ? 'header-icon-btn-muted' : ''}`}
                    onClick={() => handleToggleMute(activeChat?.id)}
                    title={activeChat?.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                  >
                    {activeChat?.isMuted ? <BellOff size={19} /> : <Bell size={19} />}
                  </button>

                  {/* Call button */}
                  {activeChat?.contact?.phone && (
                    <a
                      href={`tel:${activeChat.contact.phone}`}
                      className="header-call-btn"
                      title={`Call ${activeChat.contact.name || 'User'}`}
                    >
                      <Phone size={18} />
                      <span className="call-btn-text">Call</span>
                    </a>
                  )}

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
                            setShowProfileModal(true);
                          }}
                        >
                          <User size={17} className="dropdown-icon" />
                          <span>View profile</span>
                        </button>

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleToggleMute(activeChat?.id);
                          }}
                        >
                          {activeChat?.isMuted ? (
                            <>
                              <Bell size={17} className="dropdown-icon" />
                              <span>Unmute notifications</span>
                            </>
                          ) : (
                            <>
                              <BellOff size={17} className="dropdown-icon" />
                              <span>Mute notifications</span>
                            </>
                          )}
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
                                <span className="text-primary">Follow seller</span>
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
                      <strong>Safety Tip:</strong> Meet in a public place. Do not make advance payments before physical inspection.
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
                              {isMe && (
                                <span className="msg-status-indicator" title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                                  {msg.status === 'read' ? (
                                    <CheckCheck size={14} className="status-icon status-read" />
                                  ) : msg.status === 'delivered' ? (
                                    <CheckCheck size={14} className="status-icon status-delivered" />
                                  ) : (
                                    <Check size={14} className="status-icon status-sent" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          
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

              {/* Quick Reply Chips */}
              <div className="quick-reply-bar">
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
                <button type="button" className="quick-chip" onClick={() => handleSendMessage("Is this still available?")}>
                  Is this available?
                </button>
                <button type="button" className="quick-chip" onClick={() => handleSendMessage("What's your last price?")}>
                  What's last price?
                </button>
                <button type="button" className="quick-chip" onClick={() => handleSendMessage("Can I inspect it today?")}>
                  Can I inspect today?
                </button>
                <button type="button" className="quick-chip" onClick={() => handleSendMessage("Can you deliver to my location?")}>
                  Delivery options?
                </button>
                <button type="button" className="quick-chip" onClick={() => handleSendMessage("Where is the best meeting spot?")}>
                  Suggest meeting spot
                </button>
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
                    <Paperclip size={20} />
                  </button>

                  <button
                    type="button"
                    className={`input-action-btn ${showEmojiPicker ? 'active' : ''}`}
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                    title="Insert emoji"
                  >
                    <Smile size={20} />
                  </button>

                  <input
                    type="text"
                    placeholder="Type a message to seller..."
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

                  {!inputMessage.trim() && !selectedAttachment ? (
                    <button
                      type="button"
                      className="mic-btn"
                      onClick={startVoiceRecord}
                      title="Record voice note"
                    >
                      <Mic size={20} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="send-btn send-btn-active"
                      title="Send message"
                    >
                      <Send size={18} />
                    </button>
                  )}
                </form>
              )}
            </>
          ) : (
            <div className="no-active-chat">
              <MessageSquareMore size={48} className="no-chat-icon" />
              <h3>Select a conversation</h3>
              <p>Choose a chat from the sidebar to view messages and contact sellers.</p>
            </div>
          )}
        </div>
      </div>



      {/* ── JIJI SELLER PROFILE PAGE MODAL ── */}
      {showProfileModal && activeChat && (
        <div className="jiji-profile-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="jiji-profile-container" onClick={e => e.stopPropagation()}>
            
            {/* Top Navigation Bar in Jiji Green (#00b53f) */}
            <div className="jiji-nav-header">
              <button 
                type="button"
                className="jiji-back-btn" 
                onClick={() => setShowProfileModal(false)}
                title="Back to conversation"
              >
                <ArrowLeft size={22} />
              </button>

              <div className="jiji-nav-search-wrap">
                <input 
                  type="text"
                  placeholder={`Search in adverts of ${activeChat.contact?.name || 'Seller'}`}
                  value={sellerSearchQuery}
                  onChange={e => setSellerSearchQuery(e.target.value)}
                  className="jiji-nav-search-input"
                />
                {sellerSearchQuery && (
                  <button 
                    type="button" 
                    className="jiji-clear-search-btn"
                    onClick={() => setSellerSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="jiji-advert-count-badge" title="Total active adverts">
                <span>{filteredSellerAdverts.length}</span>
                <Tag size={15} />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="jiji-modal-scroll-area">
              
              {/* Seller Identity Card */}
              <div className="jiji-seller-card">
                <div className="jiji-seller-top-row">
                  {/* Hexagonal green bordered avatar */}
                  <div className="jiji-hex-avatar-wrap">
                    {renderContactAvatar(activeChat.contact?.avatar, activeChat.contact?.name, "jiji-hex-avatar")}
                  </div>

                  <div className="jiji-seller-details">
                    <h2 className="jiji-seller-name">{activeChat.contact?.name || 'Seller'}</h2>
                    
                    <div className="jiji-seller-badges-row">
                      <span className="jiji-badge-pill">
                        <User size={13} />
                        {activeChat.contact?.memberSince || '5+ years on BuyOh'}
                      </span>
                      {activeChat.contact?.verified && (
                        <span className="jiji-badge-pill jiji-badge-verified">
                          <ShieldCheck size={13} />
                          Verified ID
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

                {/* Feedback Row */}
                <div className="jiji-feedback-row">
                  <div className="jiji-feedback-left">
                    <MessageCircle size={18} className="jiji-feedback-icon" />
                    <span className="jiji-feedback-text">Feedback ({Math.max(5, (activeChat.contact?.rating ? Math.round(activeChat.contact.rating * 2) : 5))})</span>
                    <span className="jiji-rating-stars">★★★★★</span>
                  </div>
                  <ChevronRight size={18} className="jiji-feedback-arrow" />
                </div>

                {/* Show Contact CTA Button */}
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
                    <div className="jiji-revealed-phone-number">
                      <Phone size={18} />
                      <a href={`tel:${activeChat.contact?.phone || '+234 800 000 0000'}`}>
                        {activeChat.contact?.phone || '+234 800 000 0000'}
                      </a>
                    </div>
                    <div className="jiji-revealed-actions">
                      <a 
                        href={`tel:${activeChat.contact?.phone || '+234 800 000 0000'}`} 
                        className="jiji-call-link"
                      >
                        Call Now
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Filters and Sorting Toolbar */}
              <div className="jiji-filters-toolbar">
                <div className="jiji-filter-chips-scroll">
                  <button 
                    type="button" 
                    className={`jiji-filter-chip ${sellerFilterCondition === 'all' ? 'active' : ''}`}
                    onClick={() => setSellerFilterCondition('all')}
                  >
                    All filters ▾
                  </button>
                  <button 
                    type="button" 
                    className={`jiji-filter-chip ${sellerSortOrder !== 'newest' ? 'active' : ''}`}
                    onClick={() => setSellerSortOrder(prev => prev === 'price_low' ? 'price_high' : prev === 'price_high' ? 'newest' : 'price_low')}
                  >
                    Price, ₦ {sellerSortOrder === 'price_low' ? '↑' : sellerSortOrder === 'price_high' ? '↓' : '▾'}
                  </button>
                  <button 
                    type="button" 
                    className={`jiji-filter-chip ${sellerFilterCondition === 'brand new' ? 'active' : ''}`}
                    onClick={() => setSellerFilterCondition(prev => prev === 'brand new' ? 'all' : 'brand new')}
                  >
                    Brand New
                  </button>
                  <button 
                    type="button" 
                    className={`jiji-filter-chip ${sellerFilterCondition === 'used' ? 'active' : ''}`}
                    onClick={() => setSellerFilterCondition(prev => prev === 'used' ? 'all' : 'used')}
                  >
                    Condition ▾
                  </button>
                </div>

                <div className="jiji-sort-and-view">
                  <button 
                    type="button" 
                    className="jiji-sort-btn"
                    onClick={() => setSellerSortOrder(prev => prev === 'newest' ? 'price_low' : 'newest')}
                  >
                    <SlidersHorizontal size={15} />
                    <span>Sort ▾</span>
                  </button>
                  <button 
                    type="button" 
                    className="jiji-view-toggle-btn"
                    onClick={() => setIsSellerGridView(prev => !prev)}
                    title={isSellerGridView ? 'List view' : 'Grid view'}
                  >
                    {isSellerGridView ? <List size={16} /> : <Grid size={16} />}
                  </button>
                </div>
              </div>

              {/* Adverts Grid / List */}
              <div className={isSellerGridView ? "jiji-adverts-grid" : "jiji-adverts-list"}>
                {filteredSellerAdverts.length === 0 ? (
                  <div className="jiji-empty-adverts">
                    <p>No adverts matching your search.</p>
                  </div>
                ) : (
                  filteredSellerAdverts.map((ad, idx) => {
                    const adImg = ad.image || (Array.isArray(ad.images) ? ad.images[0] : null) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
                    const adPrice = Number(ad.price || 0);
                    const adTitle = ad.name || ad.title || 'Marketplace Item';
                    const adLocation = ad.location || activeChat.contact?.location || 'Lagos, Nigeria';
                    const adCondition = ad.condition || 'Used';

                    return (
                      <div 
                        key={ad.id || idx} 
                        className="jiji-ad-card"
                        onClick={() => {
                          if (ad.id) {
                            setShowProfileModal(false);
                            router.push(`/product/${ad.id}`);
                          }
                        }}
                      >
                        <div className="jiji-ad-img-wrapper">
                          <img src={adImg} alt={adTitle} className="jiji-ad-img" loading="lazy" />
                          <span className="jiji-ad-vip-tag">VIP</span>
                          
                          <div className="jiji-ad-img-badges">
                            <span className="jiji-ad-subbadge">
                              <ShieldCheck size={11} />
                              Verified ID
                            </span>
                            <span className="jiji-ad-subbadge">
                              <User size={11} />
                              5+ YEARS ON BUYOH
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
                          <span className="jiji-ad-location">
                            <MapPin size={13} />
                            {adLocation}
                          </span>
                          <div className="jiji-ad-footer-row">
                            <span className="jiji-ad-condition-pill">{adCondition}</span>
                            <span className="jiji-ad-crown-icon" title="Featured VIP advert">
                              <Crown size={15} />
                            </span>
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
                  <span>{isFollowingSeller(activeChat.contact?.name) ? 'Following' : 'Follow them'}</span>
                </button>
                <span className="jiji-follow-count-subtext">
                  {isFollowingSeller(activeChat.contact?.name) ? '16 followers' : '15 followers'}
                </span>
              </div>

            </div>
          </div>
        </div>
      )}

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
              <h3 className="chat-modal-title">Make an Offer</h3>
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
                <span className="preset-label">Quick discount offers:</span>
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
              <label className="chat-modal-label">Your Offer Amount (₦)</label>
              <input
                type="number"
                className="chat-modal-input"
                placeholder="Enter offer in ₦ e.g. 45000"
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
                    handleSendMessage(`🏷️ Proposed Offer: ₦${val.toLocaleString('en-NG')}`, true, val);
                    setShowInChatOfferModal(false);
                    setChatOfferAmount('');
                    showToast(`Offer of ₦${val.toLocaleString('en-NG')} sent!`);
                  }
                }}
              >
                Send Offer
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
