import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '../../../shared/context/PlatformAuthContext';
import Icon from '../../../shared/components/Icon';

export default function PlatformLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({});
  const { login } = usePlatformAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then(res => res.json())
      .then(data => setBranding(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/platform');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-login-page">
      <div className="platform-login-card glass-card">
        <div className="platform-login-header">
          <div className="platform-logo">
            {branding.platform_logo ? (
              <img src={branding.platform_logo} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8 }} />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            )}
          </div>
          <h1>{branding.company_name || 'WorkTrack'} Platform</h1>
          <p>Super Admin Access</p>
        </div>

        {error && <div className="glass-alert glass-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="platform-login-form">
          <div className="glass-input-group">
            <label>Username</label>
            <div className="glass-input-wrapper">
              <Icon icon="lucide:user" className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Platform admin username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="glass-input-group">
            <label>Password</label>
            <div className="glass-input-wrapper">
              <Icon icon="lucide:lock" className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Platform admin password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="glass-btn glass-btn-primary" style={{width:'100%', marginTop:8}} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{width:16,height:16,marginRight:8}} />
                Signing in...
              </>
            ) : (
              'Access Platform'
            )}
          </button>
        </form>

        <div className="platform-login-footer">
          <p>This is a restricted area for {branding.company_name || 'WorkTrack'} platform owners only.</p>
          <Link to="/login" className="platform-link">Back to Tenant Login</Link>
        </div>
      </div>
    </div>
  );
}
