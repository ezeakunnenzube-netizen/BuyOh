import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, MessageSquareMore, BellRing, PanelTop, UserRound, Bookmark, 
  Send, Phone, ShieldCheck, MoreVertical, ArrowLeft, CheckCheck, 
  Tag, Image as ImageIcon, Sparkles, Filter, AlertCircle, Circle,
  ChevronRight, ExternalLink, ChevronUp, ChevronDown, X, User, Flag, Trash2,
  Smile, Paperclip, Mic, Square, Play, Pause, Volume2, FileText,
  BellOff, Bell, Video, UserPlus, UserMinus
} from 'lucide-react';
import './Messages.css';

const NOW_TS = Date.now();
const ONE_HOUR = 3600000;
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
  { char: '🛍️', name: 'Shopping Bags', category: 'commerce', popular: true, keywords: ['shop', 'store', 'buy', 'bag', 'purchase', 'buyoh'] },
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

// Initial sample seed conversations with realistic Nigerian marketplace data
const INITIAL_CONVERSATIONS = [
  {
    id: 'chat-001',
    type: 'buying',
    contact: {
      name: 'Babatunde Ogunlesi',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isOnline: true,
      verified: true,
      phone: '+234 803 123 4567',
      location: 'Ikeja, Lagos'
    },
    product: {
      id: 'prod-001',
      name: 'Apple iPhone 13 Pro (128GB) - Graphite',
      price: 650000,
      image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=400&q=80',
      condition: 'Used'
    },
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Hello! Thanks for showing interest in my iPhone 13 Pro. Check the original photos below! 📱',
        image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=600&q=80',
        timestamp: NOW_TS - ONE_HOUR * 2,
        time: '10:15 AM',
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'me',
        text: 'Hi Babatunde, is the battery health still at 88% as stated?',
        timestamp: NOW_TS - ONE_HOUR * 1.5,
        time: '10:18 AM',
        status: 'read'
      },
      {
        id: 'm3',
        sender: 'them',
        text: 'Listen to my short voice note about the inspection details below 👇',
        isVoiceNote: true,
        duration: 8,
        timestamp: NOW_TS - ONE_HOUR * 1,
        time: '10:20 AM',
        status: 'unread'
      }
    ]
  },
  {
    id: 'chat-002',
    type: 'buying',
    contact: {
      name: 'Chidimma Okeke',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
      isOnline: false,
      verified: true,
      phone: '+234 812 987 6543',
      location: 'Lekki Phase 1, Lagos'
    },
    product: {
      id: 'prod-003',
      name: 'Apple MacBook Pro 14" M1 Pro (16GB RAM, 512GB SSD)',
      price: 1250000,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
      condition: 'Used'
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm1',
        sender: 'me',
        text: 'Good afternoon, is this MacBook Pro still available?',
        timestamp: NOW_TS - ONE_DAY * 1 - ONE_HOUR * 4,
        time: '2:15 PM',
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'them',
        text: 'Yes it is available! Original charger and box included.',
        timestamp: NOW_TS - ONE_DAY * 1 - ONE_HOUR * 3.5,
        time: '2:30 PM',
        status: 'read'
      },
      {
        id: 'm3',
        sender: 'me',
        text: 'Can I come inspect it tomorrow around 2pm?',
        timestamp: NOW_TS - ONE_DAY * 1 - ONE_HOUR * 3,
        time: '2:40 PM',
        status: 'read'
      },
      {
        id: 'm4',
        sender: 'them',
        text: 'That works perfectly! My shop is at Lekki Phase 1.',
        timestamp: NOW_TS - ONE_DAY * 1 - ONE_HOUR * 2,
        time: '2:45 PM',
        status: 'read'
      }
    ]
  },
  {
    id: 'chat-003',
    type: 'buying',
    contact: {
      name: 'Emeka Autos Nig Ltd',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      isOnline: true,
      verified: true,
      phone: '+234 706 555 0192',
      location: 'Maitama, Abuja'
    },
    product: {
      id: 'prod-010',
      name: 'Toyota Camry 2018 XLE Full Option - Direct Foreign Used',
      price: 14500000,
      image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=400&q=80',
      condition: 'Used'
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Welcome to Emeka Autos! Clean custom duty documents intact.',
        timestamp: NOW_TS - ONE_DAY * 2 - ONE_HOUR * 5,
        time: '11:00 AM',
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'me',
        text: 'What is your last price for cash payment?',
        timestamp: NOW_TS - ONE_DAY * 2 - ONE_HOUR * 4.5,
        time: '11:05 AM',
        status: 'read'
      },
      {
        id: 'm3',
        sender: 'them',
        text: 'Final price is ₦14,000,000. Feel free to bring your mechanic for full scan inspection.',
        timestamp: NOW_TS - ONE_DAY * 2 - ONE_HOUR * 4,
        time: '11:20 AM',
        status: 'read'
      }
    ]
  },
  {
    id: 'chat-004',
    type: 'selling',
    contact: {
      name: 'Blessing Adebayo',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      isOnline: false,
      verified: false,
      phone: '+234 814 333 2211',
      location: 'Yaba, Lagos'
    },
    product: {
      id: 'prod-007',
      name: 'Sony PlayStation 5 Disc Edition + 2 Controllers',
      price: 580000,
      image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=400&q=80',
      condition: 'Brand New'
    },
    unreadCount: 0,
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Hello, I saw your PS5 listing. Would you accept ₦540,000?',
        timestamp: NOW_TS - ONE_DAY * 3 - ONE_HOUR * 3,
        time: '4:10 PM',
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'me',
        text: 'Hi Blessing, last price is ₦560,000. It comes with 2 dualsense pads.',
        timestamp: NOW_TS - ONE_DAY * 3 - ONE_HOUR * 2.5,
        time: '4:25 PM',
        status: 'read'
      }
    ]
  }
];

const AUTO_REPLIES = [
  "Thanks for your message! Yes, this item is still available for sale.",
  "I am available for inspection anytime today or tomorrow. Where are you located?",
  "The price is slightly negotiable if you are paying cash immediately.",
  "Everything is in perfect working condition. No hidden faults at all!",
  "Let me know if you would like me to reserve it for you."
];

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Load state from localStorage or initial seed
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('buyoh_messages_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    const paramChatId = searchParams.get('chatId');
    if (paramChatId && conversations.some(c => c.id === paramChatId)) {
      return paramChatId;
    }
    return conversations[0]?.id || 'chat-001';
  });

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

  // Dropdown 3-dots menu & Profile modal state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const menuRef = useRef(null);

  // Followed sellers state
  const [followedSellers, setFollowedSellers] = useState(() => {
    const saved = localStorage.getItem('buyoh_followed_sellers_v1');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('buyoh_followed_sellers_v1', JSON.stringify(followedSellers));
  }, [followedSellers]);

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
        previewUrl: event.target.result
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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const realAudioUrl = URL.createObjectURL(audioBlob);

        if (recorder.stream) {
          recorder.stream.getTracks().forEach(track => track.stop());
        }

        const nowTs = Date.now();
        const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMsg = {
          id: `msg-${nowTs}`,
          sender: 'me',
          text: '🎙️ Voice Note',
          isVoiceNote: true,
          audioUrl: realAudioUrl,
          duration: duration,
          timestamp: nowTs,
          time: timeNow,
          status: 'sent'
        };

        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: [...c.messages, newMsg]
              };
            }
            return c;
          })
        );
      };

      recorder.stop();
    } else {
      const nowTs = Date.now();
      const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg = {
        id: `msg-${nowTs}`,
        sender: 'me',
        text: '🎙️ Voice Note',
        isVoiceNote: true,
        duration: duration,
        timestamp: nowTs,
        time: timeNow,
        status: 'sent'
      };

      setConversations(prev =>
        prev.map(c => {
          if (c.id === activeChatId) {
            return {
              ...c,
              messages: [...c.messages, newMsg]
            };
          }
          return c;
        })
      );
    }

    setIsRecordingAudio(false);
    setRecordingTimer(0);

    // Simulated reply to voice note
    setTimeout(() => {
      const replyTs = Date.now();
      const replyMsg = {
        id: `msg-${replyTs}`,
        sender: 'them',
        text: 'Got your voice note! Loud and clear. 👍',
        timestamp: replyTs,
        time: new Date(replyTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'unread'
      };

      setConversations(prev => {
        const next = prev.map(c => {
          if (c.id === activeChatId) {
            // Play notification tone only if conversation is not muted and push notifications are active
            const pushPref = localStorage.getItem('buyoh_pref_push');
            const isPushActive = pushPref !== null ? JSON.parse(pushPref) : true;
            if (!c.isMuted && isPushActive) {
              playAudioTone(750, 600, 0.15);
            }
            return {
              ...c,
              messages: [...c.messages, replyMsg],
              unreadCount: c.id === activeChatId ? c.unreadCount : c.unreadCount + 1
            };
          }
          return c;
        });
        return next;
      });
    }, 1500);
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

  // Simulate typing indicator
  useEffect(() => {
    if (!activeChatId) return;
    const delay = setTimeout(() => setIsTyping(true), 2500);
    const clear = setTimeout(() => setIsTyping(false), 6000);
    return () => { clearTimeout(delay); clearTimeout(clear); };
  }, [activeChatId]);

  const handleReportSeller = (name) => {
    setToastMessage(`Report submitted for ${name}`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Synchronize state with URL search parameters (handles browser Back button & back gestures)
  useEffect(() => {
    const paramChatId = searchParams.get('chatId');
    const prodId = searchParams.get('productId');
    const prodName = searchParams.get('prodName');
    const prodPrice = searchParams.get('prodPrice');
    const prodImg = searchParams.get('prodImg');
    const sellerName = searchParams.get('seller') || 'Verified Seller';

    if (paramChatId) {
      setActiveChatId(paramChatId);
      setIsMobileDetailOpen(true);
    } else if (prodId) {
      // Check if conversation already exists for this product
      const existing = conversations.find(c => c.product?.id === prodId);
      if (existing) {
        setActiveChatId(existing.id);
        setIsMobileDetailOpen(true);
      } else {
        // Create new conversation
        const newChat = {
          id: `chat-${Date.now()}`,
          type: 'buying',
          contact: {
            name: sellerName,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            isOnline: true,
            verified: true,
            phone: '+234 800 000 0000',
            location: 'Lagos, Nigeria'
          },
          product: {
            id: prodId,
            name: prodName || 'Marketplace Item',
            price: Number(prodPrice) || 50000,
            image: prodImg || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
            condition: 'Used'
          },
          unreadCount: 0,
          messages: [
            {
              id: `m-${Date.now()}`,
              sender: 'them',
              text: `Hello! Interested in my listing "${prodName || 'Item'}"? Ask me any questions!`,
              time: 'Just now',
              status: 'read'
            }
          ]
        };
        setConversations(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setIsMobileDetailOpen(true);
      }
    } else {
      // If no chatId or productId in URL parameters, close mobile detail view to show conversation list!
      setIsMobileDetailOpen(false);
    }
  }, [searchParams]);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('buyoh_messages_v1', JSON.stringify(conversations));
  }, [conversations]);

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

  // Mark active chat as read
  useEffect(() => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChatId && c.unreadCount > 0) {
          return {
            ...c,
            unreadCount: 0,
            messages: c.messages.map(m => ({ ...m, status: 'read' }))
          };
        }
        return c;
      })
    );
  }, [activeChatId]);

  const activeChat = conversations.find(c => c.id === activeChatId) || conversations[0];

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
    showToast('Deleted');
  };

  // Filtering conversations (searches contact name, product title, and message content)
  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      c.contact.name.toLowerCase().includes(q) ||
      c.product.name.toLowerCase().includes(q) ||
      c.messages.some(m => m.text.toLowerCase().includes(q));
    
    if (!matchesSearch) return false;
    if (filterTab === 'unread') return c.unreadCount > 0;
    if (filterTab === 'buying') return c.type === 'buying';
    if (filterTab === 'selling') return c.type === 'selling';
    return true;
  });

  // Function to send a text message
  const handleSendMessage = (textToSend = inputMessage, isOffer = false, offerVal = 0) => {
    const text = textToSend.trim();
    if (!text && !isOffer && !selectedAttachment) return;

    const nowTs = Date.now();
    const timeNow = new Date(nowTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: `msg-${nowTs}`,
      sender: 'me',
      text: isOffer ? `🏷️ Make an Offer: ₦${Number(offerVal).toLocaleString('en-NG')}` : text,
      isOffer: isOffer,
      offerAmount: offerVal,
      image: selectedAttachment ? selectedAttachment.previewUrl : null,
      timestamp: nowTs,
      time: timeNow,
      status: 'sent'
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    if (!isOffer) setInputMessage('');
    setSelectedAttachment(null);
    setShowEmojiPicker(false);

    // Simulate auto seller response after 1.2s
    setTimeout(() => {
      const replyText = isOffer
        ? `Thanks for your offer of ₦${Number(offerVal).toLocaleString('en-NG')}! Let me consider it and get back to you shortly.`
        : AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];

      const replyTs = Date.now();
      const replyMsg = {
        id: `msg-${replyTs}`,
        sender: 'them',
        text: replyText,
        timestamp: replyTs,
        time: new Date(replyTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'unread'
      };

      setConversations(prev => {
        const next = prev.map(c => {
          if (c.id === activeChatId) {
            // Play notification tone only if conversation is not muted and push notifications are active
            const pushPref = localStorage.getItem('buyoh_pref_push');
            const isPushActive = pushPref !== null ? JSON.parse(pushPref) : true;
            if (!c.isMuted && isPushActive) {
              playAudioTone(750, 600, 0.15);
            }
            return {
              ...c,
              messages: [...c.messages, replyMsg],
              unreadCount: c.id === activeChatId ? c.unreadCount : c.unreadCount + 1
            };
          }
          return c;
        });
        return next;
      });
    }, 1200);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setIsMobileDetailOpen(true);
    setIsChatSearchOpen(false);
    setChatSearchQuery('');
    setCurrentMatchIndex(0);
    setSearchParams({ chatId: id });
  };

  const handleMobileBack = () => {
    if (searchParams.get('chatId') || searchParams.get('productId')) {
      setSearchParams({});
    } else {
      setIsMobileDetailOpen(false);
    }
  };

  const formatPrice = (price) => '₦' + Number(price).toLocaleString('en-NG');

  return (
    <div className="messages-page-wrapper">
      {/* ── Sticky Desktop Header Navbar ── */}
      <header className="home-nav-row">
        <NavLink to="/" replace className="home-nav-brand">
          <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
        </NavLink>
        <div className="home-nav-links">
          <NavLink to="/messages" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <button className="home-nav-icon-btn">
                <MessageSquareMore className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">My Messages</div>
              </button>
            )}
          </NavLink>
          <NavLink to="/notifications" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <button className="home-nav-icon-btn">
                <BellRing className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">Notifications</div>
              </button>
            )}
          </NavLink>
          <NavLink to="/saved" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <button className="home-nav-icon-btn">
                <Bookmark className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">Saved</div>
              </button>
            )}
          </NavLink>
          <NavLink to="/adverts" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <button className="home-nav-icon-btn">
                <PanelTop className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">My Adverts</div>
              </button>
            )}
          </NavLink>
          <NavLink to="/profile" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <button className="home-nav-icon-btn">
                <UserRound className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                <div className="home-header-tooltip">My Profile</div>
              </button>
            )}
          </NavLink>
          <NavLink to="/sell" replace className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}>
            {({ isActive }) => (
              <button className="home-sell-btn">
                <p style={{ color: isActive ? "#1d4ed8" : "#e67600" }} className="home-sell-btn-text">+ Sell</p>
              </button>
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
            {filteredConversations.length === 0 ? (
              <div className="empty-chats">
                <MessageSquareMore size={36} className="empty-chats-icon" />
                <p className="empty-chats-title">No messages found</p>
                <p className="empty-chats-sub">Try searching with a different keyword or tab filter.</p>
              </div>
            ) : (
              filteredConversations.map(chat => {
                const lastMsg = chat.messages[chat.messages.length - 1];
                const isSelected = chat.id === activeChatId;

                return (
                  <div
                    key={chat.id}
                    className={`chat-item-card ${isSelected ? 'chat-item-selected' : ''}`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <div className="chat-avatar-wrap">
                      <img src={chat.contact.avatar} alt={chat.contact.name} className="chat-avatar" />
                      {chat.contact.isOnline && <span className="online-indicator" title="Online" />}
                    </div>

                    <div className="chat-item-content">
                      <div className="chat-item-top">
                        <span className="contact-name">{chat.contact.name}</span>
                        <span className="chat-time">{formatSidebarDate(lastMsg)}</span>
                      </div>

                      <div className="product-mini-preview">
                        <Tag size={12} className="tag-icon" />
                        <span className="product-mini-name">{chat.product.name}</span>
                      </div>

                      <div className="chat-item-bottom">
                        <p className="last-message-text">
                          {lastMsg?.sender === 'me' && <span className="you-label">You: </span>}
                          {lastMsg?.text || 'No messages yet'}
                        </p>
                        <div className="chat-item-badges">
                          {chat.isMuted && <BellOff size={13} className="chat-muted-icon" title="Muted" />}
                          {chat.unreadCount > 0 && (
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
                      <img src={activeChat.contact.avatar} alt={activeChat.contact.name} className="contact-avatar" />
                      {activeChat.contact.isOnline && <span className="online-indicator" />}
                    </div>
                  </button>

                  <div className="header-contact-meta">
                    <div className="contact-name-row">
                      <h3 className="contact-heading">{activeChat.contact.name}</h3>
                      {activeChat.contact.verified && (
                        <ShieldCheck size={14} className="verified-badge-icon" title="Verified Seller" />
                      )}
                      {activeChat.isMuted && (
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
                      ) : activeChat.contact.isOnline ? (
                        <span className="text-online">● Online</span>
                      ) : (
                        <span className="text-offline">● Offline · {activeChat.contact.location}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="chat-header-actions">
                  {/* Search in chat */}
                  <button
                    className={`header-icon-btn ${isChatSearchOpen ? 'header-icon-btn-active' : ''}`}
                    onClick={() => setIsChatSearchOpen(prev => !prev)}
                    title="Search in conversation"
                  >
                    <Search size={19} />
                  </button>

                  {/* Mute toggle */}
                  <button
                    className={`header-icon-btn ${activeChat.isMuted ? 'header-icon-btn-muted' : ''}`}
                    onClick={() => {
                      setConversations(prev =>
                        prev.map(c => {
                          if (c.id === activeChat.id) {
                            const nextMuted = !c.isMuted;
                            setToastMessage(nextMuted ? 'Notifications muted' : 'Notifications unmuted');
                            setTimeout(() => setToastMessage(''), 2500);
                            return { ...c, isMuted: nextMuted };
                          }
                          return c;
                        })
                      );
                    }}
                    title={activeChat.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                  >
                    {activeChat.isMuted ? <BellOff size={19} /> : <Bell size={19} />}
                  </button>

                  {/* Call button */}
                  <a
                    href={`tel:${activeChat.contact.phone}`}
                    className="header-call-btn"
                    title={`Call ${activeChat.contact.name}`}
                  >
                    <Phone size={18} />
                    <span className="call-btn-text">Call</span>
                  </a>

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

                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsChatSearchOpen(true);
                          }}
                        >
                          <Search size={17} className="dropdown-icon" />
                          <span>Search in conversation</span>
                        </button>

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
              {activeChat.product && (
                <div className="product-context-strip">
                  <img
                    src={activeChat.product.image}
                    alt={activeChat.product.name}
                    className="product-strip-img"
                  />
                  <div className="product-strip-info">
                    <span className="product-strip-label">Chatting about</span>
                    <span className="product-strip-name">{activeChat.product.name}</span>
                  </div>
                  <span className="product-strip-price">₦{activeChat.product.price?.toLocaleString()}</span>
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
                {activeChat.messages.map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const isMatch = chatSearchMatches[currentMatchIndex]?.msg.id === msg.id;

                  const currentDateLabel = formatDateDivider(msg);
                  const prevMsg = activeChat.messages[index - 1];
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
                        {!isMe && (
                          <img src={activeChat.contact.avatar} alt="avatar" className="msg-avatar-mini" />
                        )}
                        <div className="msg-bubble-wrapper">
                          <div className={`message-bubble ${isMe ? 'bubble-me' : 'bubble-them'} ${msg.isOffer ? 'bubble-offer' : ''} ${isMatch ? 'bubble-search-active' : ''}`}>
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
                                <img src={msg.image} alt="Attachment" className="msg-attachment-img" />
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
                            <div className="message-meta">
                              <span className="msg-time">{msg.time}</span>
                              {isMe && (
                                <CheckCheck size={14} className={`status-icon ${msg.status === 'read' ? 'status-read' : ''}`} />
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="delete-msg-btn"
                            title={msg.isVoiceNote ? "Delete voice note" : "Delete message"}
                            onClick={() => setDeleteMessageModal({ chatId: activeChat.id, messageId: msg.id, isVoiceNote: msg.isVoiceNote })}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              {/* Quick Reply Chips */}
              <div className="quick-reply-bar">
                <span className="quick-label">Quick replies:</span>
                <button className="quick-chip" onClick={() => handleSendMessage("Is this still available?")}>
                  Is this available?
                </button>
                <button className="quick-chip" onClick={() => handleSendMessage("What's your last price?")}>
                  What's last price?
                </button>
                <button className="quick-chip" onClick={() => handleSendMessage("Can I inspect it today?")}>
                  Can I inspect today?
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
                    onChange={e => setInputMessage(e.target.value)}
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



      {/* ── SELLER PROFILE MODAL ── */}
      {showProfileModal && activeChat && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seller Profile</h3>
              <button className="close-modal-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div className="modal-body profile-modal-body">
              <div className="profile-modal-avatar-container">
                <img src={activeChat.contact.avatar} alt="avatar" className="profile-large-avatar" />
                {activeChat.contact.isOnline && <span className="profile-online-badge" />}
              </div>
              <h3 className="profile-modal-name">{activeChat.contact.name}</h3>
              {activeChat.contact.verified && <span className="profile-verified-tag">✓ Verified Seller</span>}
              <p className="profile-modal-location">📍 {activeChat.contact.location}</p>
              <p className="profile-modal-phone">📞 {activeChat.contact.phone}</p>

              {/* Follower Stats */}
              <div className="profile-follower-stats">
                <div className="stat-box">
                  <span className="stat-val">{isFollowingSeller(activeChat.contact.name) ? '12.4K' : '12.3K'}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val">4.9 ★</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="stat-box">
                  <span className="stat-val">98%</span>
                  <span className="stat-label">Reply Rate</span>
                </div>
              </div>

              {/* Follow / Unfollow CTA */}
              <button 
                className={`profile-follow-btn ${isFollowingSeller(activeChat.contact.name) ? 'btn-following' : 'btn-follow'}`}
                onClick={() => toggleFollowSeller(activeChat.contact.name)}
              >
                {isFollowingSeller(activeChat.contact.name) ? (
                  <>
                    <UserMinus size={16} /> Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Follow
                  </>
                )}
              </button>
            </div>
            <div className="modal-footer">
              <button className="submit-offer-btn" onClick={() => setShowProfileModal(false)}>Close</button>
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
      {/* Delete Single Message / Voice Note Modal */}
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
    </div>
  );
}
