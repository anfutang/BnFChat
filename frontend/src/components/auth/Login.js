import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect to the appropriate page
    if (currentUser) {
      if (currentUser.permissionLevel > 0) {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(username, password);
      
      if (result.success) {
        if (result.needsProfile) {
          navigate('/profile');
        } else {
          // Auth context will handle the redirect based on permission level
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;