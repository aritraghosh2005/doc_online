import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (token: string, username: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [isSignup, setIsSignup] = useState(false); // Toggle between Login/Signup
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isSignup ? 'signup' : 'login';
    
    try {
      const response = await fetch(`http://localhost:4000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isSignup) {
          // If signed up successfully, switch to login mode immediately
          setIsSignup(false);
          alert("Account created! Please log in.");
        } else {
          // If logged in, pass the token up to the App
          onLogin(data.token, data.username);
        }
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Server error. Is the backend running?');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">
            {isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p className="toggle-text" onClick={() => setIsSignup(!isSignup)}>
          {isSignup 
            ? "Already have an account? Log In" 
            : "New here? Create an account"}
        </p>
      </div>
    </div>
  );
};

export default Login;