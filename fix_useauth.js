const fs = require('fs');
let file = 'frontend/src/hooks/useAuth.js';
let content = fs.readFileSync(file, 'utf8');

const updatedLogin = `
  const login = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(credentials);
      if (data.requires_2fa) {
        setLoading(false);
        return data; // Return to component to handle OTP UI
      }
      localStorage.setItem('trace_token', data.token);
      if (data.user) {
        localStorage.setItem('trace_user', JSON.stringify(data.user));
        setUser(data.user);
      }
      navigate('/dashboard');
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Authentication failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
`;

content = content.replace(
  /const login = async \(credentials\) \{[\s\S]*?finally \{\n      setLoading\(false\);\n    \}\n  \};/,
  updatedLogin.trim()
);

fs.writeFileSync(file, content);
