import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LuLock as HiOutlineLockClosed,
  LuEye as HiEye,
  LuEyeOff as HiEyeOff,
} from 'react-icons/lu';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium';
    return 'strong';
  };

  const strength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, formData.password);
      toast.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch (error) {
      const msg = error.response?.data?.message || 'Reset failed. Link may have expired.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Drifting brand blobs, same as the landing hero. */}
      <span className="blob-a" aria-hidden="true" />
      <span className="blob-b" aria-hidden="true" />
      <span className="blob-c" aria-hidden="true" />
      <div className="auth-card">
        {/* Header */}
        <div style={{
          width: '70px', height: '70px',
          background: 'var(--c-blue)',
          borderRadius: '18px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '32px', marginBottom: '24px',
          boxShadow: '0 10px 40px rgba(59,130,246,0.3)'
        }}>🔑</div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.8rem',
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px'
        }}>Reset Password</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.7 }}>
          Enter your new password below. Make sure it's strong and secure.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="form-input-icon">
              <HiOutlineLockClosed className="icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleChange}
                autoFocus
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>
            {formData.password && (
              <>
                <div className={`password-strength ${strength}`}>
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                </div>
                <div className={`strength-text ${strength}`}>
                  {strength === 'weak' && 'Weak — add more characters'}
                  {strength === 'medium' && 'Medium — add uppercase & numbers'}
                  {strength === 'strong' && 'Strong password ✓'}
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="form-input-icon">
              <HiOutlineLockClosed className="icon" />
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                className="form-input"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button type="button" className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className="form-error">Passwords do not match</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="auth-link" style={{ marginTop: '24px' }}>
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
