'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, Eye, EyeOff, X, ShieldAlert, Sparkles, Check, Phone, MessageSquareMore } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, onSuccess, initialError }) {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError || '');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isSignUp) {
        // Sign Up Flow
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        if (phone.trim()) {
          localStorage.setItem('buyoh_user_phone_v1', phone.trim());
        }
        if (whatsapp.trim()) {
          localStorage.setItem('buyoh_user_whatsapp_v1', whatsapp.trim());
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName || 'New Marketplace User',
              full_name: fullName || 'New Marketplace User',
              phone: phone.trim(),
              whatsapp: whatsapp.trim() || phone.trim()
            }
          }
        });

        if (error) throw error;
        
        setSuccessMessage('Registration successful! Please check your email inbox to verify your account.');
        setTimeout(() => {
          setIsSignUp(false);
          setSuccessMessage('');
        }, 4000);
      } else {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        const activeUser = data.user;
        setSuccessMessage('Logged in successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess(activeUser);
          onClose();
        }, 800);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={e => e.stopPropagation()}>
        {/* Top Header */}
        <div className="auth-modal-header">
          <div className="auth-brand">
            <span className="logo-buy">Buy</span><span className="logo-oh">Oh!</span>
          </div>
          <button className="auth-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            Register
          </button>
        </div>

        {/* Form Body */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-welcome-text">
            {isSignUp ? (
              <p>Create an account to start chat negotiations, follow sellers, and publish listings.</p>
            ) : (
              <p>Sign in with your email and password to access your listings, chat history, and profile.</p>
            )}
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="auth-alert alert-error">
              <ShieldAlert size={16} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert alert-success">
              <Check size={16} className="alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}
          {/* Full Name, Phone & WhatsApp Input (Sign Up Only) */}
          {isSignUp && (
            <>
              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-field-icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. Adebayo Johnson" 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
              <div className="auth-input-group">
                <label>Contact Phone Number</label>
                <div className="auth-input-wrapper">
                  <Phone size={18} className="auth-field-icon" />
                  <input 
                    type="tel" 
                    placeholder="e.g. +234 809 123 4567" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
              <div className="auth-input-group">
                <label>WhatsApp Number (Optional)</label>
                <div className="auth-input-wrapper">
                  <MessageSquareMore size={18} className="auth-field-icon" />
                  <input 
                    type="tel" 
                    placeholder="e.g. +234 809 123 4567" 
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Input */}
          <div className="auth-input-group">
            <label>Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-field-icon" />
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="auth-input-group">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-field-icon" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
              />
              <button 
                type="button" 
                className="pwd-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="auth-submit-btn" 
            disabled={loading}
          >
            {loading ? (
              <span className="auth-loading-spinner" />
            ) : isSignUp ? (
              <>Create Account</>
            ) : (
              <>Sign In</>
            )}
          </button>
        </form>

        {/* Policy footer disclaimer */}
        <div className="auth-footer-disclaimer">
          <span>By continuing, you agree to BuyOh's Terms of Service and Safety Policy.</span>
        </div>
      </div>
    </div>
  );
}
