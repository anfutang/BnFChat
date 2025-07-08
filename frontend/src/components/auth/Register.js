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
  
  const { register, currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    // Only redirect to chat if user is logged in AND has completed their profile
    if (currentUser) {
      if (currentUser.profileCompleted === false) {
        navigate('/profile');
      }
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
      setError('Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    if (username.length < 3) {
      setError("Le nom d'utilisateur doit comporter au moins 3 caractères");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit comporter exactement 6 caractères alphanumériques");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    if (usernameAvailable === false) {
      setError("L'utilisateur existe déjà");
      setIsLoading(false);
      return;
    }

    try {
      const result = await register(username, password);
      
      if (result.success) {
        // navigate('/profile');
      } else {
        setError(result.message || "Échec de l'inscription");
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
        <div className="auth-logo-container">
          <div className="img-container"><img src="/blossom.png" alt="Logo" /></div>
          <h1>BnFChat</h1>
        </div>
        <h2>Inscriptioin</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Identifiant</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                e.target.setCustomValidity(''); 
              }}
              onInvalid={(e) => {
                  if (!e.target.value) {
                      e.target.setCustomValidity("Veuillez saisir votre nom d'utilisateur");
                  } else if (e.target.value.length < 3) {
                      e.target.setCustomValidity("Le nom d'utilisateur doit contenir au moins 3 caractères");
                  }
              }}
              disabled={isLoading}
              required
              minLength={3}
              style={{ width:"90%" }}
            />
            {isCheckingUsername && <small>Vérification de la disponibilité...</small>}
            {usernameAvailable === true && <small className="text-success">Nom d'utilisateur disponible</small>}
            {usernameAvailable === false && <small className="text-danger">Nom d'utilisateur déjà pris</small>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mot de Passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                e.target.setCustomValidity(''); 
              }}
              onInvalid={(e) => {
                if (!e.target.value) {
                    e.target.setCustomValidity("Veuillez saisir votre mot de passe");
                } else if (e.target.value.length < 3) {
                    e.target.setCustomValidity("Le mot de passe doit contenir au moins 6 caractères ou chiffres");
                }
              }}
              disabled={isLoading}
              required
              minLength={6}
              style={{ width:"90%" }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                e.target.setCustomValidity(''); 
              }}
              onInvalid={(e) => {
                if (!e.target.value) {
                    e.target.setCustomValidity("Veuillez resaisir votre mot de passe pour confirmation");
                }
              }}
              disabled={isLoading}
              required
              style={{ width:"90%" }}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || isCheckingUsername || usernameAvailable === false}
            style={{ width:"50%" }}
          >
            {isLoading ? 'Inscription en cours...' : "S'inscrire"}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Vous avez déjà un compte ? <Link to="/login" style={{ color:"black", fontWeight:"800" }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;