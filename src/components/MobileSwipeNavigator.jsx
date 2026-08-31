'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const CONTROL_PANEL_TABS = ['/', '/messages', '/sell', '/saved', '/profile'];

export default function MobileSwipeNavigator() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, setIsAuthOpen } = useAuth();

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const isSwipingRef = useRef(false);

  // 1. Mobile Horizontal Touch Swipe Gesture Handling between Control Panel Tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
      isSwipingRef.current = true;

      // Don't intercept swipe if starting from interactive form elements
      const target = e.target;
      if (
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('button') ||
        target.closest('.location-header-options') ||
        target.closest('.auth-modal-backdrop') ||
        target.closest('.categories-bar') ||
        target.closest('.image-upload-grid') ||
        target.closest('.conversations-list') ||
        target.closest('.chat-messages-scroll')
      ) {
        isSwipingRef.current = false;
      }
    };

    const handleTouchEnd = (e) => {
      if (!isSwipingRef.current || e.changedTouches.length !== 1) return;
      isSwipingRef.current = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = touch.clientY - touchStartYRef.current;
      const timeElapsed = Date.now() - touchStartTimeRef.current;

      // Check if horizontal swipe is intentional and dominant over vertical scroll
      const isHorizontalSwipe =
        Math.abs(deltaX) > 60 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.5 &&
        timeElapsed < 600;

      if (!isHorizontalSwipe) return;

      const currentIndex = CONTROL_PANEL_TABS.indexOf(pathname);
      if (currentIndex === -1) return; // Only apply between main control panel pages

      // In Messages, do not swipe away if user is in an individual active conversation
      const hasActiveChat = searchParams?.get('chatId') || searchParams?.get('productId');
      if (pathname === '/messages' && hasActiveChat) return;

      if (deltaX < 0) {
        // Swiped Left -> Move to Next Tab
        const nextIndex = currentIndex + 1;
        if (nextIndex < CONTROL_PANEL_TABS.length) {
          const nextTab = CONTROL_PANEL_TABS[nextIndex];
          if (!loading && !user && nextTab !== '/') {
            setIsAuthOpen(true);
          } else {
            router.replace(nextTab);
          }
        }
      } else if (deltaX > 0) {
        // Swiped Right -> Move to Previous Tab
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          const prevTab = CONTROL_PANEL_TABS[prevIndex];
          if (!loading && !user && prevTab !== '/') {
            setIsAuthOpen(true);
          } else {
            router.replace(prevTab);
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pathname, searchParams, user, loading, router, setIsAuthOpen]);

  // 2. Control Panel History Trap: Back gestures stop on current control panel page (e.g. Sell stays at Sell)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only trap back gestures on main control panel tab routes
    const isControlPanelTab = CONTROL_PANEL_TABS.includes(pathname);
    if (!isControlPanelTab) return;

    // Ensure a state entry exists to catch mobile back gestures
    try {
      window.history.replaceState({ tab: pathname }, '', window.location.href);
      window.history.pushState({ tab: pathname, trapped: true }, '', window.location.href);
    } catch (e) {}

    const handlePopState = (e) => {
      // If we are on a control panel page (like Sell, Messages, Saved, Profile), stay on current page
      if (CONTROL_PANEL_TABS.includes(pathname)) {
        try {
          window.history.pushState({ tab: pathname, trapped: true }, '', window.location.href);
        } catch (err) {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  return null;
}
