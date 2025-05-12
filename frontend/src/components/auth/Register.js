import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  
  const { register, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect
    if (currentUser) {
      navigate('/chat');
    }
  }, [currentUser, navigate]);

  // Check username availability when the user stops typing
  useEffect(() => {
    const checkUsernameTimeout = setTimeout(async () => {
      if (username && username.length >= 3) {
        setIsCheckingUsername(true);
        try {
          const response = await axios.post('/api/auth/check-username', { username });
          setUsernameAvailable(response.data.available);
        } catch (err) {
          console.error('Failed to check username:', err);
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(checkUsernameTimeout);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate inputs
    if (!username || !password || !confirmPassword) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (usernameAvailable === false) {
      setError('Username is already taken');
      setIsLoading(false);
      return;
    }

    try {
      const result = await register(username, password);
      
      if (result.success) {
        navigate('/profile');
      } else {
        setError(result.message || 'Registration failed');
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
        <h2>Register</h2>
        
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
              minLength={3}
            />
            {isCheckingUsername && <small>Checking availability...</small>}
            {usernameAvailable === true && <small className="text-success">Username is available</small>}
            {usernameAvailable === false && <small className="text-danger">Username is already taken</small>}
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
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || isCheckingUsername || usernameAvailable === false}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;