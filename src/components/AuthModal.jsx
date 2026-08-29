import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, Eye, EyeOff, X, ShieldAlert, Sparkles, Check, Phone } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isSignUp) {
        // Sign Up Flow
        if (!whatsapp.trim()) {
          throw new Error('WhatsApp Number is mandatory for registration');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        localStorage.setItem('buyoh_user_whatsapp_v1', whatsapp.trim());
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName || 'New Marketplace User',
              full_name: fullName || 'New Marketplace User',
              whatsapp: whatsapp.trim()
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

        setSuccessMessage('Logged in successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess(data.user);
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setErrorMessage(err.message || 'Google Sign-In failed');
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
              <p>Sign in to access your chat history, preferences, and verified status details.</p>
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
          {/* Google Sign-In */}
          <div className="oauth-buttons-wrapper">
            <button 
              type="button" 
              className="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="auth-separator">
            <span className="separator-line" />
            <span className="separator-text">or continue with email</span>
            <span className="separator-line" />
          </div>
          {/* Full Name & WhatsApp Input (Sign Up Only) */}
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
                    required
                  />
                </div>
              </div>
              <div className="auth-input-group">
                <label>WhatsApp Number <span style={{color: '#ef4444'}}>*</span></label>
                <div className="auth-input-wrapper">
                  <Phone size={18} className="auth-field-icon" />
                  <input 
                    type="tel" 
                    placeholder="+234 809 123 4567" 
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    required
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
