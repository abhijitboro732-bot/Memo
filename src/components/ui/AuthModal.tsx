'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/lib/supabase/client';
import SkipseeLogo from './SkipseeLogo';

type AuthView = 'login' | 'signup' | 'forgot';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isAuthModalOpen) {
      setTimeout(() => {
        setView('login');
        setEmail('');
        setPassword('');
        setUsername('');
        setShowPassword(false);
        setError('');
        setSuccess('');
        setIsSubmitting(false);
      }, 300);
    }
  }, [isAuthModalOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) closeAuthModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAuthModalOpen, closeAuthModal]);

  // Lock body scroll
  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAuthModalOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Auth state change listener in AuthContext will close the modal
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: username },
        },
      });
      if (error) throw error;
      setSuccess('Account created! Check your email to verify.');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Password reset link sent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <motion.div
          className="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
        >
          <motion.div
            className="auth-modal"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button className="auth-close-btn" onClick={closeAuthModal}>
              <X size={18} />
            </button>

            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <SkipseeLogo size={48} withText={true} />
            </div>

            {/* Login View */}
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Sign in to upload videos and interact</p>

                <form onSubmit={handleLogin} className="auth-form">
                  <div className="auth-field">
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="Email address"
                        className="auth-input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="auth-input"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="auth-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                  >
                    Forgot password?
                  </button>

                  {error && <div className="auth-error">{error}</div>}

                  <motion.button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="auth-spinner" />
                        Signing in...
                      </span>
                    ) : 'Sign In'}
                  </motion.button>
                </form>

                <div className="auth-divider">
                  <span>or</span>
                </div>

                <p className="auth-switch">
                  Don&apos;t have an account?{' '}
                  <button
                    className="auth-switch-btn"
                    onClick={() => { setView('signup'); setError(''); setSuccess(''); }}
                  >
                    Sign Up
                  </button>
                </p>
              </motion.div>
            )}

            {/* Signup View */}
            {view === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">Join Voxo and start sharing videos</p>

                <form onSubmit={handleSignup} className="auth-form">
                  <div className="auth-field">
                    <div className="auth-input-wrapper">
                      <User size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="Username"
                        className="auth-input"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="Email address"
                        className="auth-input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password (min 6 characters)"
                        className="auth-input"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="auth-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && <div className="auth-error">{error}</div>}
                  {success && <div className="auth-success">{success}</div>}

                  <motion.button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="auth-spinner" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles size={16} />
                        Create Account
                      </span>
                    )}
                  </motion.button>
                </form>

                <div className="auth-divider">
                  <span>or</span>
                </div>

                <p className="auth-switch">
                  Already have an account?{' '}
                  <button
                    className="auth-switch-btn"
                    onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            )}

            {/* Forgot Password View */}
            {view === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  className="auth-back-btn"
                  onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                >
                  <ArrowLeft size={16} />
                  Back to login
                </button>

                <h2 className="auth-title" style={{ marginTop: '0.75rem' }}>Reset password</h2>
                <p className="auth-subtitle">Enter your email and we&apos;ll send a reset link</p>

                <form onSubmit={handleForgotPassword} className="auth-form">
                  <div className="auth-field">
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="Email address"
                        className="auth-input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {error && <div className="auth-error">{error}</div>}
                  {success && <div className="auth-success">{success}</div>}

                  <motion.button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={isSubmitting || !!success}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="auth-spinner" />
                        Sending...
                      </span>
                    ) : success ? 'Email Sent ✓' : 'Send Reset Link'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
