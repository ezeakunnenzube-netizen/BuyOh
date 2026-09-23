'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToRealtimeChat, 
  getCachedConversations, 
  markConversationAsRead 
} from '../services/chatService';
import { getNotificationsForUser } from '../utils/userSync';

const ChatContext = createContext({
  unreadCount: 0,
  unreadNotifsCount: 0,
  latestMessageToast: null,
  clearToast: () => {},
  markAsRead: () => {},
  playSentSound: () => {},
  playChime: () => {}
});

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [latestMessageToast, setLatestMessageToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Play subtle incoming message chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  // Play subtle outgoing message whoosh/pop
  const playSentSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {}
  };

  // Recalculate unread messages count from cached conversations
  const recalculateUnread = () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const convs = getCachedConversations(user.id);
    const total = convs.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
    setUnreadCount(total);
  };

  // Recalculate unread notifications count
  const recalculateUnreadNotifs = () => {
    if (!user) {
      setUnreadNotifsCount(0);
      return;
    }
    const notifs = getNotificationsForUser(user);
    const count = Array.isArray(notifs) ? notifs.filter(n => n.unread).length : 0;
    setUnreadNotifsCount(count);
  };

  useEffect(() => {
    recalculateUnread();
    recalculateUnreadNotifs();

    const handleUpdate = () => {
      recalculateUnread();
      recalculateUnreadNotifs();
    };

    window.addEventListener('buyoh_conversations_updated', handleUpdate);
    window.addEventListener('buyoh_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('buyoh_conversations_updated', handleUpdate);
      window.removeEventListener('buyoh_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user?.id]);

  // Global background listener active on ALL pages
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToRealtimeChat(user.id, {
      onNewMessage: (msgPayload) => {
        // If chat is currently muted by user preference, skip tone
        try {
          const rawMuted = localStorage.getItem(`buyoh_muted_chats_${user.id}`);
          const mutedSet = new Set(rawMuted ? JSON.parse(rawMuted) : []);
          if (!mutedSet.has(msgPayload.conversation_id)) {
            playChime();
          }
        } catch (e) {
          playChime();
        }

        // Show toast notification if not already on the active chat
        const senderName = msgPayload.sender_name || 'Buyer / Seller';
        const snippet = msgPayload.is_offer 
          ? `Offered ₦${Number(msgPayload.offer_amount || 0).toLocaleString('en-NG')} on "${msgPayload.product_info?.name || 'Listing'}"`
          : (msgPayload.text || 'Sent an attachment');

        setLatestMessageToast({
          id: msgPayload.id || Date.now(),
          title: `New message from ${senderName}`,
          message: snippet,
          chatId: msgPayload.conversation_id,
          avatar: msgPayload.sender_avatar || ''
        });

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setLatestMessageToast(null);
        }, 4000);

        recalculateUnread();
      },
      onStatusChange: () => {
        recalculateUnread();
      }
    });

    return () => {
      unsubscribe();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [user?.id]);

  const clearToast = () => setLatestMessageToast(null);

  const markAsRead = (convId) => {
    if (user?.id && convId) {
      markConversationAsRead(convId, user.id);
      recalculateUnread();
    }
  };

  return (
    <ChatContext.Provider value={{ unreadCount, unreadNotifsCount, latestMessageToast, clearToast, markAsRead, playSentSound, playChime }}>
      {children}
      {/* Global In-App Message Alert Banner */}
      {latestMessageToast && (
        <div 
          className="global-chat-toast"
          onClick={() => {
            window.location.href = `/messages?chatId=${latestMessageToast.chatId}`;
          }}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '380px',
            animation: 'slideDownToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {latestMessageToast.avatar ? (
            <img 
              src={latestMessageToast.avatar} 
              alt="Avatar" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px'
            }}>
              {latestMessageToast.title.slice(-1) || '💬'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#60a5fa', marginBottom: '2px' }}>
              {latestMessageToast.title}
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {latestMessageToast.message}
            </div>
          </div>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              clearToast();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
