import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import {
  LuMail, LuLock, LuUser, LuPhone, LuEye, LuEyeOff, LuBuilding2,
  LuMapPin, LuBriefcase, LuKeyRound, LuArrowLeft, LuGlobe,
  LuFactory, LuCheck, LuArrowRight,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { COUNTRY_LIST } from '../config/countryConfig';
import { Field, Input, Select, Button, FormGrid } from '../components/ui';

const STEPS = [
  { n: 1, label: 'Admin profile' },
  { n: 2, label: 'Organization' },
  { n: 3, label: 'Verify email' },
];

/** Input with a leading icon, matching the login page's treatment. */
const IconInput = ({ icon, children }) => (
  <div className="form-input-icon">
    {React.cloneElement(icon, { className: 'icon' })}
    {children}
  </div>
);

const Signup = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // We don't use useAuth.signup anymore because we do a custom flow, but we can use login to set token
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    orgName: '', industry: 'Manufacturing', subIndustry: 'Drag Chain', orgAddress: '', country: 'India',
    otpCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const getPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium';
    return 'strong';
  };
  const strength = getPasswordStrength(formData.password);

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      return toast.error('Please fill in all required fields');
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setStep(2);
  };

  const handleNextStep2 = async (e) => {
    e.preventDefault();
    if (!formData.orgName) return toast.error('Please enter an Organization Name');
    if (!formData.subIndustry) return toast.error('Please select a Manufacturing Sector');

    setLoading(true);
    try {
      await authAPI.onboardSendOTP({ email: formData.email });
      toast.success('Verification code sent to your email!');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP. Email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    if (!formData.otpCode || formData.otpCode.length !== 6) return toast.error('Please enter a valid 6-digit OTP');

    setLoading(true);
    try {
      const res = await authAPI.onboardVerifyOrg({
        personalDetails: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        },
        orgDetails: {
          name: formData.orgName,
          industry: formData.industry,
          subIndustry: formData.subIndustry,
          address: formData.orgAddress,
          country: formData.country
        },
        otpCode: formData.otpCode
      });

      toast.success(res.data.message || 'Application submitted successfully!');

      // Navigate to login (user cannot login until approved anyway, but this is the right place to send them)
      navigate('/login');

    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
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

      <div className="auth-card wide">
        {/* Step rail */}
        <ol className="step-rail">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className={`step${step === s.n ? ' current' : ''}${step > s.n ? ' done' : ''}`}
            >
              <span className="step-dot">{step > s.n ? <LuCheck /> : s.n}</span>
              <span className="step-label">{s.label}</span>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <>
            <h2>Create admin account</h2>
            <p className="subtitle">You will be the Super Admin of your new organization</p>
            <form onSubmit={handleNextStep1}>
              <FormGrid>
                <Field label="Full name" required span="all">
                  <IconInput icon={<LuUser />}>
                    <Input
                      type="text" name="name" placeholder="Enter your full name"
                      value={formData.name} onChange={handleChange} autoFocus
                      style={{ paddingLeft: 36 }}
                    />
                  </IconInput>
                </Field>

                <Field label="Email address" required>
                  <IconInput icon={<LuMail />}>
                    <Input
                      type="email" name="email" placeholder="you@company.com"
                      value={formData.email} onChange={handleChange}
                      style={{ paddingLeft: 36 }}
                    />
                  </IconInput>
                </Field>

                <Field label="Phone number">
                  <IconInput icon={<LuPhone />}>
                    <Input
                      type="tel" name="phone" placeholder="Enter your phone number"
                      value={formData.phone} onChange={handleChange}
                      style={{ paddingLeft: 36 }}
                    />
                  </IconInput>
                </Field>

                <Field label="Password" required>
                  <IconInput icon={<LuLock />}>
                    <Input
                      type={showPassword ? 'text' : 'password'} name="password"
                      placeholder="Min 6 characters"
                      value={formData.password} onChange={handleChange}
                      style={{ paddingLeft: 36, paddingRight: 38 }}
                    />
                    <button
                      type="button" className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <LuEyeOff /> : <LuEye />}
                    </button>
                  </IconInput>
                  {formData.password && (
                    <div className={`password-strength ${strength}`}>
                      <div className="bar" />
                      <div className="bar" />
                      <div className="bar" />
                    </div>
                  )}
                </Field>

                <Field label="Confirm password" required>
                  <IconInput icon={<LuLock />}>
                    <Input
                      type={showConfirm ? 'text' : 'password'} name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword} onChange={handleChange}
                      style={{ paddingLeft: 36, paddingRight: 38 }}
                    />
                    <button
                      type="button" className="toggle-password"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <LuEyeOff /> : <LuEye />}
                    </button>
                  </IconInput>
                </Field>
              </FormGrid>

              <Button
                type="submit" variant="primary" size="lg" block
                iconRight={<LuArrowRight />} style={{ marginTop: 18 }}
              >
                Continue to organization
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Set up organization</h2>
            <p className="subtitle">Tell us about your factory or company</p>
            <form onSubmit={handleNextStep2}>
              <FormGrid>
                <Field label="Organization name" required span="all">
                  <IconInput icon={<LuBuilding2 />}>
                    <Input
                      type="text" name="orgName" placeholder="e.g. Acme Manufacturing"
                      value={formData.orgName} onChange={handleChange} autoFocus
                      style={{ paddingLeft: 36 }}
                    />
                  </IconInput>
                </Field>

                <Field label="Industry" required>
                  <IconInput icon={<LuBriefcase />}>
                    <Select
                      name="industry" value={formData.industry} onChange={handleChange}
                      style={{ paddingLeft: 36 }}
                    >
                      <option value="Manufacturing">Manufacturing</option>
                    </Select>
                  </IconInput>
                </Field>

                {formData.industry === 'Manufacturing' && (
                  <Field label="Manufacturing sector" required>
                    <IconInput icon={<LuFactory />}>
                      <Select
                        name="subIndustry" value={formData.subIndustry} onChange={handleChange}
                        style={{ paddingLeft: 36 }}
                      >
                        <option value="Drag Chain">Drag Chain</option>
                        <option value="Automotive">Automotive</option>
                        <option value="Energy & Power">Energy &amp; Power</option>
                        <option value="Food & Beverage">Food &amp; Beverage</option>
                        <option value="Pharmaceutical">Pharmaceutical</option>
                        <option value="Chemicals & Petrochemicals">Chemicals &amp; Petrochemicals</option>
                      </Select>
                    </IconInput>
                  </Field>
                )}

                <Field label="Country" required>
                  <IconInput icon={<LuGlobe />}>
                    <Select
                      name="country" value={formData.country} onChange={handleChange}
                      style={{ paddingLeft: 36 }}
                    >
                      {COUNTRY_LIST.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </IconInput>
                </Field>

                <Field label="Address / location" span={formData.industry === 'Manufacturing' ? undefined : 'all'}>
                  <IconInput icon={<LuMapPin />}>
                    <Input
                      type="text" name="orgAddress" placeholder="City, State"
                      value={formData.orgAddress} onChange={handleChange}
                      style={{ paddingLeft: 36 }}
                    />
                  </IconInput>
                </Field>
              </FormGrid>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Back</Button>
                <Button
                  type="submit" variant="primary" size="lg" loading={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Sending code…' : 'Send verification code'}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Verify your email</h2>
            <p className="subtitle">
              We&apos;ve sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{formData.email}</strong>
            </p>
            <form onSubmit={handleSubmitFinal}>
              <Field label="Enter 6-digit code" required>
                <IconInput icon={<LuKeyRound />}>
                  <Input
                    type="text" name="otpCode" placeholder="000000" maxLength={6}
                    value={formData.otpCode} onChange={handleChange} autoFocus
                    inputMode="numeric"
                    style={{
                      paddingLeft: 36,
                      fontSize: '1.3rem',
                      letterSpacing: '0.35em',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      height: 46,
                    }}
                  />
                </IconInput>
              </Field>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <Button variant="secondary" size="lg" onClick={() => setStep(2)}>Back</Button>
                <Button
                  type="submit" variant="primary" size="lg" loading={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Creating workspace…' : 'Verify & launch workspace'}
                </Button>
              </div>
            </form>
          </>
        )}

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>

      <div className="auth-foot">
        <Link to="/privacy-policy">Privacy Policy</Link>
      </div>
    </div>
  );
};

export default Signup;
