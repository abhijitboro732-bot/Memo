'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Film, Image, Music, Hash, MapPin,
  Eye, Globe, Lock, Users, ChevronDown, Sparkles, Check
} from 'lucide-react';
import { useUpload } from '@/lib/UploadContext';
import { useAuth } from '@/lib/AuthContext';
import { uploadVideo } from '@/lib/supabase/videos';

type Visibility = 'public' | 'friends' | 'private';

export default function UploadModal() {
  const { isUploadOpen, closeUpload } = useUpload();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [musicName, setMusicName] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [showVisMenu, setShowVisMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUploadOpen) closeUpload();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isUploadOpen, closeUpload]);

  // Lock body scroll
  useEffect(() => {
    if (isUploadOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isUploadOpen]);

  const resetForm = useCallback(() => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setThumbnailUrl(null);
    setCaption('');
    setTags('');
    setMusicName('');
    setLocation('');
    setVisibility('public');
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
  }, []);

  const handleClose = () => {
    resetForm();
    closeUpload();
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      alert('File size must be under 500MB');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Generate thumbnail from video
    const video = document.createElement('video');
    video.src = url;
    video.currentTime = 1;
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL('image/jpeg'));
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;
    setIsUploading(true);
    setUploadProgress(0);

    // Progress simulation while actual upload runs
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 400);

    try {
      // Convert thumbnail data URL to Blob
      let thumbBlob: Blob | null = null;
      if (thumbnailUrl) {
        const res = await fetch(thumbnailUrl);
        thumbBlob = await res.blob();
      }

      const result = await uploadVideo({
        file: videoFile,
        caption,
        tags,
        musicName: musicName || 'Original Sound',
        visibility,
        userId: user.id,
        thumbnailBlob: thumbBlob,
      });

      clearInterval(interval);

      if (!result.success) {
        setUploadProgress(0);
        setIsUploading(false);
        alert(`Upload failed: ${result.error}`);
        return;
      }

      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);

      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      clearInterval(interval);
      setUploadProgress(0);
      setIsUploading(false);
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    }
  };

  const visOptions: { value: Visibility; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'public', label: 'Public', icon: <Globe size={14} />, desc: 'Everyone can see' },
    { value: 'friends', label: 'Friends', icon: <Users size={14} />, desc: 'Only your followers' },
    { value: 'private', label: 'Private', icon: <Lock size={14} />, desc: 'Only you' },
  ];

  const currentVis = visOptions.find(v => v.value === visibility)!;

  return (
    <AnimatePresence>
      {isUploadOpen && (
        <motion.div
          className="upload-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="upload-modal"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="upload-header">
              <h2 className="upload-title">
                <Upload size={18} className="text-primary" />
                Upload Video
              </h2>
              <button className="upload-close-btn" onClick={handleClose}>
                <X size={18} />
              </button>
            </div>

            {/* Success state */}
            {uploadComplete ? (
              <div className="upload-success">
                <motion.div
                  className="upload-success-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Check size={40} className="text-white" />
                </motion.div>
                <h3 className="upload-success-title">Video Uploaded!</h3>
                <p className="upload-success-desc">Your video is now being processed and will appear in the feed shortly.</p>
              </div>
            ) : (
              <div className="upload-body">
                {/* Left: Video preview / drop zone */}
                <div className="upload-left">
                  {!videoPreviewUrl ? (
                    <div
                      className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleInputChange}
                      />
                      <motion.div
                        className="upload-dropzone-icon"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Film size={40} />
                      </motion.div>
                      <p className="upload-dropzone-text">
                        Drag & drop your video here
                      </p>
                      <p className="upload-dropzone-hint">
                        or click to browse
                      </p>
                      <div className="upload-dropzone-specs">
                        <span>MP4, WebM, MOV</span>
                        <span>•</span>
                        <span>Up to 500MB</span>
                        <span>•</span>
                        <span>9:16 recommended</span>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-preview">
                      <video
                        ref={videoPreviewRef}
                        src={videoPreviewUrl}
                        className="upload-preview-video"
                        loop
                        muted
                        playsInline
                        autoPlay
                      />
                      <div className="upload-preview-overlay">
                        <button
                          className="upload-change-btn"
                          onClick={() => {
                            setVideoFile(null);
                            setVideoPreviewUrl(null);
                            setThumbnailUrl(null);
                          }}
                        >
                          <Film size={14} />
                          Change video
                        </button>
                      </div>
                      {videoFile && (
                        <div className="upload-file-info">
                          <span className="upload-file-name">{videoFile.name}</span>
                          <span className="upload-file-size">
                            {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Form */}
                <div className="upload-right">
                  {/* Caption */}
                  <div className="upload-field">
                    <label className="upload-label">
                      <Sparkles size={13} className="text-accent-light" />
                      Caption
                      <span className="upload-char-count">{caption.length}/300</span>
                    </label>
                    <textarea
                      className="upload-textarea"
                      placeholder="Write an engaging caption..."
                      value={caption}
                      onChange={e => setCaption(e.target.value.slice(0, 300))}
                      rows={3}
                    />
                  </div>

                  {/* Tags */}
                  <div className="upload-field">
                    <label className="upload-label">
                      <Hash size={13} />
                      Hashtags
                    </label>
                    <input
                      className="upload-input"
                      placeholder="#trending #fyp #viral"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                    />
                  </div>

                  {/* Music */}
                  <div className="upload-field">
                    <label className="upload-label">
                      <Music size={13} />
                      Sound / Music
                    </label>
                    <input
                      className="upload-input"
                      placeholder="Original Sound"
                      value={musicName}
                      onChange={e => setMusicName(e.target.value)}
                    />
                  </div>

                  {/* Location */}
                  <div className="upload-field">
                    <label className="upload-label">
                      <MapPin size={13} />
                      Location
                    </label>
                    <input
                      className="upload-input"
                      placeholder="Add location (optional)"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>

                  {/* Visibility */}
                  <div className="upload-field">
                    <label className="upload-label">
                      <Eye size={13} />
                      Visibility
                    </label>
                    <div className="upload-vis-wrapper">
                      <button
                        className="upload-vis-btn"
                        onClick={() => setShowVisMenu(!showVisMenu)}
                      >
                        {currentVis.icon}
                        <span>{currentVis.label}</span>
                        <ChevronDown size={14} className={`upload-vis-chevron ${showVisMenu ? 'open' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showVisMenu && (
                          <motion.div
                            className="upload-vis-menu"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                          >
                            {visOptions.map(opt => (
                              <button
                                key={opt.value}
                                className={`upload-vis-option ${visibility === opt.value ? 'active' : ''}`}
                                onClick={() => {
                                  setVisibility(opt.value);
                                  setShowVisMenu(false);
                                }}
                              >
                                {opt.icon}
                                <div>
                                  <p className="upload-vis-option-label">{opt.label}</p>
                                  <p className="upload-vis-option-desc">{opt.desc}</p>
                                </div>
                                {visibility === opt.value && <Check size={14} className="text-primary ml-auto" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Upload button */}
                  <div className="upload-actions">
                    <button className="upload-draft-btn" onClick={handleClose}>
                      Discard
                    </button>
                    <motion.button
                      className="upload-submit-btn"
                      disabled={!videoFile || isUploading}
                      onClick={handleUpload}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isUploading ? (
                        <span className="flex items-center gap-2">
                          <span className="upload-spinner" />
                          Uploading... {Math.min(Math.round(uploadProgress), 100)}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Upload size={16} />
                          Post Video
                        </span>
                      )}
                    </motion.button>
                  </div>

                  {/* Progress bar during upload */}
                  {isUploading && (
                    <div className="upload-progress-bar">
                      <motion.div
                        className="upload-progress-fill"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(uploadProgress, 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
