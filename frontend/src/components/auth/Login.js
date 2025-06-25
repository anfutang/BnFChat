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
      if (!currentUser.profileCompleted) {
        navigate('/profile');
      } else if (currentUser.permissionLevel > 1) {
        navigate('/chat');
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
      setError("Veuillez entrer à la fois le nom d'utilisateur et le mot de passe.");
      setIsLoading(false);
      return;
    }

    try {
      console.log(username,password);
      const result = await login(username, password);
      
      if (result.success) {
        // The redirection will now be handled by the useEffect
      } else {
        setError(result.message || 'Échec de la connexion');
      }
    } catch (err) {
      setError("Une erreur inattendue s'est produite.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-container">
          <div className="img-container"><img src="/blossom.png" alt="Logo" /></div>
          <h1>BnFChat</h1>
        </div>
        <h2>Connexion</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Identifiant</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
              style={{ width:"90%" }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mot de Passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              style={{ width:"90%" }}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
            style={{ width:"50%" }}
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Vous n'avez pas de compte ? <Link to="/register" style={{ color:"black", fontWeight:"800" }}>S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;