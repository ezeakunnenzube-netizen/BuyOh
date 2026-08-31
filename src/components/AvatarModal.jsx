'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, Check, Image as ImageIcon, RefreshCw, 
  RotateCcw, ShieldCheck, CheckCircle2, AlertCircle, Camera
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { uploadAvatarImage } from '../utils/userSync';
import './AvatarModal.css';

export default function AvatarModal({ isOpen, onClose, currentAvatar, onAvatarChanged }) {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(currentAvatar);
  const [fileDetails, setFileDetails] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const initial = currentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';
      setSelectedImage(initial);
      setFileDetails(null);
      setErrorMsg('');
      setIsDragOver(false);
    }
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  const processImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WEBP, GIF, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB. Please choose a smaller photo.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
      setFileDetails({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type.split('/')[1]?.toUpperCase() || 'IMAGE'
      });
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    processImageFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleResetImage = () => {
    setSelectedImage(currentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80');
    setFileDetails(null);
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!selectedImage) return;

    setIsSaving(true);
    try {
      // 1. Process / upload image to Supabase Storage or lightweight compressed URL
      const finalAvatarUrl = await uploadAvatarImage(user, selectedImage);

      // 2. Save locally (general & user-scoped)
      localStorage.setItem('buyoh_user_avatar_v1', finalAvatarUrl);
      if (user?.id) {
        localStorage.setItem(`buyoh_user_avatar_${user.id}`, finalAvatarUrl);
      }

      // 3. Sync Supabase user_metadata
      if (user && user.id) {
        try {
          if (user.user_metadata) {
            user.user_metadata.avatar_url = finalAvatarUrl;
            user.user_metadata.picture = finalAvatarUrl;
          }
          await supabase.auth.updateUser({
            data: { 
              avatar_url: finalAvatarUrl,
              picture: finalAvatarUrl 
            }
          });
        } catch (err) {
          console.warn('Supabase avatar update warning:', err);
        }
      }

      // 4. Dispatch global broadcast event
      window.dispatchEvent(new CustomEvent('buyoh_avatar_updated', { detail: finalAvatarUrl }));

      if (onAvatarChanged) {
        onAvatarChanged(finalAvatarUrl);
      }

      onClose();
    } catch (err) {
      console.error('Error saving avatar:', err);
      setErrorMsg('Failed to save avatar photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="avatar-modal-backdrop" onClick={onClose}>
      <div className="avatar-upload-card" onClick={e => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="avatar-modal-header">
          <div className="header-title-group">
            <h2 className="modal-main-title">Change Profile Picture</h2>
            <p className="modal-sub-title">Upload a photo to represent your profile on BuyOh marketplace.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Friendly Avatar Live Showcase Bar */}
        <div className="avatar-upload-showcase">
          <div className="showcase-avatar-wrapper">
            <div className="showcase-avatar-ring">
              <img 
                src={selectedImage} 
                alt="Uploaded Avatar Preview" 
                className="showcase-avatar-img" 
              />
            </div>
            <span className="showcase-live-dot" title="Photo Ready" />
          </div>

          <div className="showcase-meta">
            <div className="showcase-user-title">
              <h3>Profile Picture Preview</h3>
              <span className="verified-user-tag"><ShieldCheck size={13} /> Visible on your profile</span>
            </div>

            {fileDetails && (
              <div className="showcase-actions">
                <button 
                  type="button" 
                  className="showcase-pill-btn reset-btn" 
                  onClick={handleResetImage}
                  title="Reset image upload"
                >
                  <RotateCcw size={13} /> Revert to Original
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Upload Body */}
        <div className="avatar-upload-body">
          <div 
            className={`image-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
            />

            <div className="dropzone-circle-icon">
              <Camera size={28} />
            </div>

            <div className="dropzone-text-block">
              <h3>Click or drag photo here to upload</h3>
              <p>Supports JPG, PNG, WEBP, GIF, SVG (Up to 10MB)</p>
            </div>

            <button type="button" className="browse-image-btn">
              Choose Photo
            </button>
          </div>

          {errorMsg && (
            <div className="upload-error-banner">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {fileDetails && (
            <div className="uploaded-file-banner">
              <div className="file-banner-left">
                <ImageIcon size={20} className="file-banner-icon" />
                <div className="file-banner-meta">
                  <span className="file-banner-name">{fileDetails.name}</span>
                  <span className="file-banner-sub">{fileDetails.size} • {fileDetails.type}</span>
                </div>
              </div>
              <div className="file-banner-status">
                <CheckCircle2 size={15} color="#15803d" />
                <span>Ready to save</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Action Buttons */}
        <div className="avatar-modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="btn-save-upload" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw size={16} className="spin-icon" /> Saving...
              </>
            ) : (
              <>
                <Check size={16} /> Save Avatar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
