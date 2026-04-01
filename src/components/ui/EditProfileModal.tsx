'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Check, ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    display_name: string;
    username: string;
    bio: string;
    avatar_url: string;
    website_url?: string;
  };
  onSave: (data: { display_name: string; bio: string; avatar_url: string; website_url: string }) => void;
}

/* ── Image Cropper ────────────────────────────────────────── */
function ImageCropper({
  imageUrl,
  onCrop,
  onCancel,
}: {
  imageUrl: string;
  onCrop: (croppedUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw preview
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280;
    canvas.width = size;
    canvas.height = size;

    const img = imageRef.current;
    const minDim = Math.min(img.width, img.height);
    const drawSize = minDim / scale;
    const sx = (img.width - drawSize) / 2 - (offset.x / size) * drawSize;
    const sy = (img.height - drawSize) / 2 - (offset.y / size) * drawSize;

    ctx.clearRect(0, 0, size, size);

    // Draw circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, sx, sy, drawSize, drawSize, 0, 0, size, size);
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 45, 85, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [imageLoaded, scale, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = () => setIsDragging(false);

  const handleCrop = () => {
    if (!imageRef.current) return;
    const outputCanvas = document.createElement('canvas');
    const outputSize = 400;
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const minDim = Math.min(img.width, img.height);
    const drawSize = minDim / scale;
    const sx = (img.width - drawSize) / 2 - (offset.x / 280) * drawSize;
    const sy = (img.height - drawSize) / 2 - (offset.y / 280) * drawSize;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, sx, sy, drawSize, drawSize, 0, 0, outputSize, outputSize);

    onCrop(outputCanvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="crop-container">
      <h3 className="crop-title">Crop Photo</h3>
      <p className="crop-subtitle">Drag to reposition, zoom to adjust</p>

      <div
        className="crop-canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="crop-canvas" />
        <div className="crop-drag-hint">
          <Move size={14} />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="crop-controls">
        <button
          className="crop-ctrl-btn"
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
        >
          <ZoomOut size={16} />
        </button>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.05"
          value={scale}
          onChange={e => setScale(parseFloat(e.target.value))}
          className="crop-slider"
        />
        <button
          className="crop-ctrl-btn"
          onClick={() => setScale(Math.min(3, scale + 0.1))}
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="crop-ctrl-btn"
          onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
          title="Reset"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Actions */}
      <div className="crop-actions">
        <button className="crop-cancel-btn" onClick={onCancel}>Cancel</button>
        <motion.button
          className="crop-save-btn"
          onClick={handleCrop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check size={16} />
          Apply
        </motion.button>
      </div>
    </div>
  );
}

/* ── Edit Profile Modal ───────────────────────────────────── */
export default function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSave,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url);
  const [websiteUrl, setWebsiteUrl] = useState(currentUser.website_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.display_name);
      setBio(currentUser.bio);
      setAvatarUrl(currentUser.avatar_url);
      setWebsiteUrl(currentUser.website_url || '');
      setCropImage(null);
      setIsSaving(false);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !cropImage) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, cropImage]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    setCropImage(url);
  };

  const handleCropComplete = (croppedUrl: string) => {
    setAvatarUrl(croppedUrl);
    setCropImage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save delay
    await new Promise(r => setTimeout(r, 800));
    // Auto-format website url
    let formattedWebsite = websiteUrl.trim();
    if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
      formattedWebsite = `https://${formattedWebsite}`;
    }

    onSave({ display_name: displayName, bio, avatar_url: avatarUrl, website_url: formattedWebsite });
    setIsSaving(false);
    onClose();
  };

  const hasChanges =
    displayName !== currentUser.display_name ||
    bio !== currentUser.bio ||
    avatarUrl !== currentUser.avatar_url ||
    websiteUrl !== (currentUser.website_url || '');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ep-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !cropImage && onClose()}
        >
          <motion.div
            className="ep-modal"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Crop view */}
            {cropImage ? (
              <ImageCropper
                imageUrl={cropImage}
                onCrop={handleCropComplete}
                onCancel={() => setCropImage(null)}
              />
            ) : (
              <>
                {/* Header */}
                <div className="ep-header">
                  <h2 className="ep-title">Edit Profile</h2>
                  <button className="ep-close-btn" onClick={onClose}>
                    <X size={18} />
                  </button>
                </div>

                <div className="ep-body">
                  {/* Avatar */}
                  <div className="ep-avatar-section">
                    <div className="ep-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="ep-avatar-img"
                      />
                      <div className="ep-avatar-overlay">
                        <Camera size={20} className="text-white" />
                      </div>
                    </div>
                    <button
                      className="ep-change-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                  </div>

                  {/* Name */}
                  <div className="ep-field">
                    <label className="ep-label">Display Name</label>
                    <input
                      type="text"
                      className="ep-input"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      maxLength={30}
                    />
                    <span className="ep-char-count">{displayName.length}/30</span>
                  </div>

                  {/* Username (read-only) */}
                  <div className="ep-field">
                    <label className="ep-label">Username</label>
                    <input
                      type="text"
                      className="ep-input ep-input-disabled"
                      value={`@${currentUser.username}`}
                      disabled
                    />
                  </div>

                  {/* Bio */}
                  <div className="ep-field">
                    <label className="ep-label">Bio</label>
                    <textarea
                      className="ep-textarea"
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 150))}
                      placeholder="Tell people about yourself..."
                      rows={3}
                      maxLength={150}
                    />
                    <span className="ep-char-count">{bio.length}/150</span>
                  </div>

                  {/* Website URL */}
                  <div className="ep-field">
                    <label className="ep-label">Website</label>
                    <input
                      type="url"
                      className="ep-input"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      placeholder="https://your-website.com"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="ep-footer">
                  <button className="ep-cancel-btn" onClick={onClose}>Cancel</button>
                  <motion.button
                    className="ep-save-btn"
                    disabled={!hasChanges || isSaving}
                    onClick={handleSave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <span className="auth-spinner" />
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Check size={16} />
                        Save Changes
                      </span>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
