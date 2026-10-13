import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LuMail, LuLock, LuEye, LuEyeOff, LuArrowLeft, LuFactory,
  LuScanLine, LuCog, LuShieldCheck, LuWarehouse, LuTruck,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { Field, Input, Button } from '../components/ui';

/** The plant stages this system covers, shown under the card. */
const STAGES = [
  { icon: <LuScanLine />, label: 'Gate' },
  { icon: <LuCog />, label: 'Production' },
  { icon: <LuShieldCheck />, label: 'Quality' },
  { icon: <LuWarehouse />, label: 'Store' },
  { icon: <LuTruck />, label: 'Dispatch' },
];

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success('Login successful! Welcome back.');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
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
      <Link to="/" className="back-to-home">
        <LuArrowLeft /> Back to home
      </Link>

      <div className="auth-brandbar">
        <img src="/logo.png" alt="TrackBells" />
        <span className="auth-kicker"><LuFactory /> Factory Automation</span>
      </div>

      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="subtitle">Sign in to your factory workspace</p>

        <form onSubmit={handleSubmit}>
          <Field label="Email address">
            <div className="form-input-icon">
              <LuMail className="icon" />
              <Input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                autoFocus
                autoComplete="email"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </Field>

          <Field
            label={
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span>Password</span>
                <Link to="/forgot-password" className="forgot-link">Forgot?</Link>
              </span>
            }
          >
            <div className="form-input-icon">
              <LuLock className="icon" />
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                style={{ paddingLeft: 36, paddingRight: 38 }}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <LuEyeOff /> : <LuEye />}
              </button>
            </div>
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={loading}
            style={{ marginTop: 6 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="auth-link">
          New to TrackBells? <Link to="/signup">Create an account</Link>
        </div>
      </div>

      <div className="auth-stages">
        {STAGES.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <span className="tick">→</span>}
            <span className="stage">{s.icon} {s.label}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Login;
