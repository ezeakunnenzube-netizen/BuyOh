'use client';

import React from 'react';
import NavLink from './NavLink';
import { MessageSquareMore, BellRing, Bookmark, PanelTop, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function DesktopNavbar({ className = '' }) {
  const { user, loading, setIsAuthOpen } = useAuth();
  const { unreadCount, unreadNotifsCount } = useChat();

  return (
    <header className={`home-nav-row detail-desktop-nav ${className}`.trim()}>
      <NavLink to="/" replace className="home-nav-brand">
        <span className="logo-infi">Infi</span><span className="logo-buy">Buy</span>
      </NavLink>

      <div className="home-nav-links">
        {user ? (
          <>
            <NavLink
              to="/messages"
              replace
              className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}
            >
              {({ isActive }) => (
                <span className="home-nav-icon-btn">
                  <MessageSquareMore className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  {unreadCount > 0 && (
                    <span className="home-nav-unread-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  <div className="home-header-tooltip">My Messages</div>
                </span>
              )}
            </NavLink>

            <NavLink
              to="/notifications"
              replace
              className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}
            >
              {({ isActive }) => (
                <span className="home-nav-icon-btn">
                  <BellRing className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  {unreadNotifsCount > 0 && (
                    <span className="home-nav-unread-badge">
                      {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
                    </span>
                  )}
                  <div className="home-header-tooltip">Notifications</div>
                </span>
              )}
            </NavLink>

            <NavLink
              to="/saved"
              replace
              className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}
            >
              {({ isActive }) => (
                <span className="home-nav-icon-btn">
                  <Bookmark className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  <div className="home-header-tooltip">Saved</div>
                </span>
              )}
            </NavLink>

            <NavLink
              to="/adverts"
              replace
              className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}
            >
              {({ isActive }) => (
                <span className="home-nav-icon-btn">
                  <PanelTop className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  <div className="home-header-tooltip">My Adverts</div>
                </span>
              )}
            </NavLink>

            <NavLink
              to="/profile"
              replace
              className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}
            >
              {({ isActive }) => (
                <span className="home-nav-icon-btn">
                  <UserRound className="home-nav-icon" color={isActive ? "#1d4ed8" : "white"} />
                  <div className="home-header-tooltip">My Profile</div>
                </span>
              )}
            </NavLink>

            <NavLink
              to="/sell"
              replace
              className={({ isActive }) => isActive ? "home-nav-item home-nav-item-active" : "home-nav-item"}
            >
              {({ isActive }) => (
                <span className="home-sell-btn">
                  <span className="home-sell-btn-text">+ Sell</span>
                </span>
              )}
            </NavLink>
          </>
        ) : loading ? null : (
          <button
            type="button"
            className="nav-login-btn"
            onClick={() => setIsAuthOpen && setIsAuthOpen(true)}
          >
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}
