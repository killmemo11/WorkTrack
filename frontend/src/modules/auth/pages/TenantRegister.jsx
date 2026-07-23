// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const INDUSTRIES = [
  'Technology / Software', 'Finance / Banking', 'Healthcare', 'Manufacturing',
  'Retail / E-Commerce', 'Education', 'Construction', 'Real Estate',
  'Transportation / Logistics', 'Telecommunications', 'Energy / Utilities',
  'Hospitality / Tourism', 'Media / Entertainment', 'Agriculture',
  'Legal / Consulting', 'Marketing / Advertising', 'Government / Public Sector',
  'Non-Profit', 'Other',
];

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+',
];

export default function TenantRegister() {
  const [plans, setPlans] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company_name: '', industry: '', employee_count: '', website: '',
    contact_person_name: '', contact_person_title: '', contact_email: '',
    email_verified: false, verification_code: '',
    contact_phone: '', plan: '', message: '',
  });
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [devCode, setDevCode] = useState('');
  const codeInputsRef = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const fileInputRef = useRef();

  const selectedPlan = plans.find(p => p.slug === form.plan);
  const isPaidPlan = selectedPlan && selectedPlan.price_monthly > 0;

  useEffect(() => {
    fetch('/api/platform/public/plans')
      .then(res => res.json())
      .then(data => { setPlans(data); if (data.length > 0) { const t = data.find(p => p.slug === 'trial') || data[0]; setForm(prev => ({ ...prev, plan: t.slug })); } })
      .catch(() => {});
    fetch('/api/public/payment-info')
      .then(res => res.json())
      .then(data => setPaymentInfo(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const t = setTimeout(() => setCodeCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [codeCooldown]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const totalSteps = isPaidPlan ? 5 : 4;

  const validateStep1 = () => {
    if (!form.company_name.trim()) { setError('Company name is required'); return false; }
    if (!form.industry) { setError('Please select your industry'); return false; }
    if (!form.employee_count) { setError('Please select company size'); return false; }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!form.contact_person_name.trim()) { setError('Contact person name is required'); return false; }
    if (!form.contact_person_title.trim()) { setError('Job title is required'); return false; }
    if (!form.contact_email.trim()) { setError('Email is required'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contact_email.trim())) { setError('Please enter a valid email address'); return false; }
    const domain = form.contact_email.split('@')[1]?.toLowerCase();
    const personalDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','aol.com','icloud.com','protonmail.com','mail.com','zoho.com','yandex.com','qq.com','163.com','126.com','gmx.com','proton.me','pm.me','me.com','mac.com','msn.com','aim.com','ymail.com','rocketmail.com','tutanota.com','fastmail.com','hushmail.com','rediffmail.com','juno.com','netzero.com','att.net','sbcglobal.net','verizon.net','cox.net','charter.net','comcast.net','inbox.com','mail.ru','bk.ru','list.ru','terra.com.br','bol.com.br','naver.com','daum.net','hanmail.net'];
    if (personalDomains.includes(domain)) {
      setError('Please use your company email. Personal providers (Gmail, Yahoo, Outlook, etc.) are not accepted.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    if (!form.email_verified) { setError('Please verify your email before continuing'); return false; }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) { setStep(3); setCodeSent(false); setForm(prev => ({ ...prev, verification_code: '' })); }
    else if (step === 3 && validateStep3()) setStep(4);
    else if (step === 4) {
      if (isPaidPlan) setStep(5);
      else handleSubmit();
    }
  };

  const handleBack = () => { setError(''); setStep(s => s - 1); };

  const handleSendCode = async () => {
    if (!validateStep2()) return;
    setSendingCode(true);
    setError('');
    setDevCode('');
    try {
      const res = await fetch('/api/public/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.contact_email.trim().toLowerCase(), company_name: form.company_name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setCodeSent(true);
      setCodeCooldown(60);
      if (data.dev_code) setDevCode(data.dev_code);
    } catch { setError('Network error. Please try again.'); }
    finally { setSendingCode(false); }
  };

  const handleCodeChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const codeArr = form.verification_code.split('');
    while (codeArr.length < 6) codeArr.push('');
    codeArr[idx] = val;
    const newCode = codeArr.join('');
    handleChange('verification_code', newCode);
    if (val && idx < 5) codeInputsRef[idx + 1].current?.focus();
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !form.verification_code[idx] && idx > 0) {
      codeInputsRef[idx - 1].current?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = form.verification_code.replace(/\s/g, '');
    if (code.length !== 6) { setError('Please enter the 6-digit code'); return; }
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/public/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.contact_email.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      handleChange('email_verified', true);
    } catch { setError('Verification failed. Please try again.'); }
    finally { setVerifying(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File size must be under 5MB'); return; }
    setPaymentProof(file);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPaymentProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('company_name', form.company_name.trim());
      formData.append('contact_email', form.contact_email.trim().toLowerCase());
      formData.append('contact_phone', form.contact_phone.trim() || '');
      formData.append('industry', form.industry || '');
      formData.append('website', form.website.trim() || '');
      formData.append('contact_person_name', form.contact_person_name.trim() || '');
      formData.append('contact_person_title', form.contact_person_title.trim() || '');
      formData.append('employee_count', form.employee_count || '');
      formData.append('message', form.message.trim() || '');
      formData.append('plan', form.plan || '');
      formData.append('email_verified', 'true');
      if (isPaidPlan && paymentProof) {
        formData.append('payment_proof', paymentProof);
        formData.append('payment_amount', selectedPlan.price_monthly);
        formData.append('payment_currency', selectedPlan.currency || 'EGP');
        formData.append('payment_method', 'instapay');
      }
      const res = await fetch('/api/public/tenant-signup', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setStep(data.error.includes('verify') ? 3 : 4); return; }
      setSuccess(true);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Success Screen ────────────────────────────
  if (success) {
    return (
      <div className="login-page-modern">
        <div className="login-bg">
          <div className="login-bg-gradient" />
          <div className="login-bg-orb login-orb-1" />
          <div className="login-bg-orb login-orb-2" />
          <div className="login-bg-orb login-orb-3" />
        </div>
        <div className="login-card-modern" style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ marginBottom: 24 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            Registration Submitted!
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#71717a', lineHeight: 1.6, margin: '0 0 24px' }}>
            Thank you, <strong style={{ color: '#d4d4d8' }}>{form.contact_person_name}</strong>!
            Your request for <strong style={{ color: '#d4d4d8' }}>{form.company_name}</strong> has been received.
          </p>
          <div style={{
            background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.12)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 28, textAlign: 'left',
          }}>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0 0 16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What happens next?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(isPaidPlan ? [
                { num: '1', text: 'Our team verifies your payment proof' },
                { num: '2', text: 'Our team reviews your registration (within 24 hours)' },
                { num: '3', text: 'You receive a magic link via email to set up your admin account' },
              ] : [
                { num: '1', text: 'Our team reviews your registration (within 24 hours)' },
                { num: '2', text: 'You receive a magic link via email to set up your admin account' },
                { num: '3', text: 'Configure your workspace and invite employees' },
              ]).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>{s.num}</div>
                  <span style={{ fontSize: '0.85rem', color: '#d4d4d8' }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/track-request" className="landing-btn-primary" style={{ padding: '12px 24px', fontSize: '0.85rem' }}>
              Track Your Request
            </Link>
            <Link to="/" className="landing-btn-secondary" style={{ padding: '12px 24px', fontSize: '0.85rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Step Indicators ───────────────────────────
  const steps = [
    { key: 'company', label: 'Company' },
    { key: 'contact', label: 'Contact' },
    { key: 'verify', label: 'Verify' },
    { key: 'details', label: 'Details' },
    ...(isPaidPlan ? [{ key: 'payment', label: 'Payment' }] : []),
  ];

  const renderStepIndicator = () => (
    <div className="tr-steps">
      {steps.map((s, i) => (
        <div key={s.key} className={`tr-step ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`}>
          <div className="tr-step-dot">
            {i + 1 < step ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span className="tr-step-label">{s.label}</span>
          {i < steps.length - 1 && <div className={`tr-step-line ${i + 1 < step ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );

  // ── Step 1: Company ───────────────────────────
  const renderStep1 = () => (
    <div className="tr-step-content">
      <div className="tr-field">
        <label className="tr-label">Company Name *</label>
        <input type="text" placeholder="e.g. Acme Corp" value={form.company_name} onChange={e => handleChange('company_name', e.target.value)} className="login-field-input" />
      </div>
      <div className="tr-field">
        <label className="tr-label">Industry / Sector *</label>
        <select value={form.industry} onChange={e => handleChange('industry', e.target.value)} className="login-field-input">
          <option value="">Select your industry</option>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div className="tr-row-2">
        <div className="tr-field">
          <label className="tr-label">Company Size *</label>
          <select value={form.employee_count} onChange={e => handleChange('employee_count', e.target.value)} className="login-field-input">
            <option value="">Select size</option>
            {COMPANY_SIZES.map(s => <option key={s} value={s.split('-')[0].replace('+','')}>{s} employees</option>)}
          </select>
        </div>
        <div className="tr-field">
          <label className="tr-label">Website</label>
          <input type="url" placeholder="https://company.com" value={form.website} onChange={e => handleChange('website', e.target.value)} className="login-field-input" />
        </div>
      </div>
    </div>
  );

  // ── Step 2: Contact Person ────────────────────
  const renderStep2 = () => (
    <div className="tr-step-content">
      <div className="tr-row-2">
        <div className="tr-field">
          <label className="tr-label">Full Name *</label>
          <input type="text" placeholder="John Smith" value={form.contact_person_name} onChange={e => handleChange('contact_person_name', e.target.value)} className="login-field-input" />
        </div>
        <div className="tr-field">
          <label className="tr-label">Job Title *</label>
          <input type="text" placeholder="HR Manager" value={form.contact_person_title} onChange={e => handleChange('contact_person_title', e.target.value)} className="login-field-input" />
        </div>
      </div>
      <div className="tr-field">
        <label className="tr-label">Company Email *</label>
        <input type="email" placeholder="admin@company.com" value={form.contact_email} onChange={e => { handleChange('contact_email', e.target.value); handleChange('email_verified', false); }} className="login-field-input" />
        <span className="tr-hint">Must be a company domain email (not Gmail, Yahoo, etc.)</span>
      </div>
    </div>
  );

  // ── Step 3: Email Verification ────────────────
  const renderStep3 = () => {
    const codeArr = (form.verification_code || '').split('');
    while (codeArr.length < 6) codeArr.push('');
    return (
      <div className="tr-step-content" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem', margin: 0 }}>
            We'll send a 6-digit verification code to<br/>
            <strong style={{ color: '#f4f4f5' }}>{form.contact_email}</strong>
          </p>
        </div>

        {form.email_verified ? (
          <div className="tr-verified-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Email Verified
          </div>
        ) : codeSent ? (
          <>
            <div className="tr-code-inputs">
              {codeArr.map((digit, i) => (
                <input
                  key={i}
                  ref={codeInputsRef[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  className="tr-code-input"
                />
              ))}
            </div>
            {devCode && (
              <p style={{ fontSize: '0.8rem', color: '#facc15', margin: '12px 0' }}>
                Dev mode — Your code: <strong>{devCode}</strong>
              </p>
            )}
            <button type="button" onClick={handleVerifyCode} className="login-submit-btn" disabled={verifying || form.verification_code.length < 6} style={{ marginTop: 16 }}>
              {verifying ? 'Verifying...' : 'Verify Code'}
            </button>
            <p style={{ fontSize: '0.8rem', color: '#52525b', marginTop: 16 }}>
              {codeCooldown > 0
                ? `Resend code in ${codeCooldown}s`
                : <button type="button" onClick={handleSendCode} className="tr-resend-btn" disabled={sendingCode}>
                    {sendingCode ? 'Sending...' : 'Resend Code'}
                  </button>
              }
            </p>
          </>
        ) : (
          <button type="button" onClick={handleSendCode} className="login-submit-btn" disabled={sendingCode}>
            {sendingCode ? 'Sending...' : 'Send Verification Code'}
          </button>
        )}
      </div>
    );
  };

  // ── Step 4: Additional Details + Plan Selection ──
  const renderStep4 = () => (
    <div className="tr-step-content">
      <div className="tr-field">
        <label className="tr-label">Phone Number</label>
        <input type="tel" placeholder="+20..." value={form.contact_phone} onChange={e => handleChange('contact_phone', e.target.value)} className="login-field-input" />
      </div>
      <div className="tr-field">
        <label className="tr-label">Select Plan *</label>
        <div className="tr-plans">
          {plans.map(p => (
            <div key={p.id} className={`tr-plan-card ${form.plan === p.slug ? 'active' : ''}`} onClick={() => handleChange('plan', p.slug)}>
              <div className="tr-plan-name">{p.name}</div>
              <div className="tr-plan-price">{p.price_monthly === 0 ? 'Free' : `${p.price_monthly} ${p.currency || 'EGP'}/mo`}</div>
              <div className="tr-plan-emp">{p.max_employees >= 9999 ? 'Unlimited' : `${p.max_employees} employees`}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="tr-field">
        <label className="tr-label">Additional Message</label>
        <textarea placeholder="Tell us about your needs, questions, or special requirements..." value={form.message} onChange={e => handleChange('message', e.target.value)} className="login-field-input" rows={3} style={{ resize: 'vertical' }} />
      </div>
    </div>
  );

  // ── Step 5: Payment (InstaPay) ────────────────
  const renderStep5 = () => (
    <div className="tr-step-content">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: 0 }}>
          Transfer <strong style={{ color: '#22c55e' }}>{selectedPlan?.price_monthly} {selectedPlan?.currency || 'EGP'}</strong> via InstaPay
        </p>
      </div>

      {paymentInfo && (
        <div className="tr-payment-info">
          <div className="tr-payment-info-row">
            <span className="label">Bank</span>
            <span className="value">{paymentInfo.bank_name || '—'}</span>
          </div>
          <div className="tr-payment-info-row">
            <span className="label">Account Name</span>
            <span className="value">{paymentInfo.account_name || '—'}</span>
          </div>
          <div className="tr-payment-info-row">
            <span className="label">Account Number</span>
            <span className="value">{paymentInfo.account_number || '—'}</span>
          </div>
          {paymentInfo.iban && (
            <div className="tr-payment-info-row">
              <span className="label">IBAN</span>
              <span className="value" style={{ fontSize: '0.75rem' }}>{paymentInfo.iban}</span>
            </div>
          )}
          {paymentInfo.instapay_id && (
            <div className="tr-payment-info-row">
              <span className="label">InstaPay ID</span>
              <span className="value">{paymentInfo.instapay_id}</span>
            </div>
          )}
          {paymentInfo.notes && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: '0.78rem', color: '#a1a1aa' }}>
              {paymentInfo.notes}
            </div>
          )}
        </div>
      )}

      <div className="tr-field">
        <label className="tr-label">Upload Payment Proof *</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div
          className={`tr-payment-proof-area ${paymentProof ? 'has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {paymentProofPreview ? (
            <>
              {paymentProof?.type?.startsWith('image/') ? (
                <img src={paymentProofPreview} alt="Payment proof" className="tr-payment-proof-preview" />
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              )}
              <div className="tr-payment-proof-name">{paymentProof.name}</div>
            </>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <p style={{ color: '#71717a', fontSize: '0.82rem', margin: '8px 0 0' }}>Click to upload screenshot or receipt</p>
              <p style={{ color: '#52525b', fontSize: '0.72rem', margin: '4px 0 0' }}>JPG, PNG, or PDF — Max 5MB</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="login-page-modern">
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-orb login-orb-1" />
        <div className="login-bg-orb login-orb-2" />
        <div className="login-bg-orb login-orb-3" />
      </div>

      <div className="login-card-modern tr-card">
        <div className="login-modern-header">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <h1>Register Your Company</h1>
          <p>Create your WorkTrack workspace in a few steps</p>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="login-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-modern-form">
          <div className="tr-step-wrapper">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && isPaidPlan && renderStep5()}
          </div>

          <div className="tr-nav">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="tr-btn-back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button type="button" onClick={handleNext} className="login-submit-btn" style={{ flex: 1 }}>
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            ) : (
              <button type="submit" className="login-submit-btn" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Submitting...' : isPaidPlan ? 'Submit Payment & Registration' : 'Submit Registration'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            )}
          </div>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#52525b', margin: '0 0 4px' }}>
            Already registered? <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
          <Link to="/" style={{ fontSize: '0.78rem', color: '#52525b', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
