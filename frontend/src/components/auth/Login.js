import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [notificationInfo, setNotificationInfo] = useState('');

  useEffect(() => {
      setCurrentUser(null);
    }, []);

  useEffect(() => {
    // If user is already logged in, redirect to the appropriate page
    if (currentUser) {
      // 1. If the user has requested reset password, deny.
      // 2. If the number of online users surpass a specified threshold, deny.
      console.log(currentUser);
      if (currentUser.redirectedFromRegistration || currentUser.registrationCanceled) {
        setCurrentUser(null);
        return;
      }

      if (currentUser.requestResetPassword && !currentUser.allowedResetPassword) {
        setNotificationInfo("Vous avez une demande de réinitialisation de mot de passe en attente d’approbation. Votre compte est actuellement en état de suspension. Vous devez attendre l’approbation de l’administrateur avant de pouvoir accéder à la page de réinitialisation pour modifier votre mot de passe.");
        setShowInfoModal(true);
      } else if (currentUser.requestResetPassword && currentUser.allowedResetPassword) {
        setNotificationInfo("Vous avez une demande de réinitialisation de mot de passe déjà approuvée. Veuillez d’abord vous rendre sur la page de réinitialisation pour modifier votre mot de passe.");
        setShowInfoModal(true);
      } else if (currentUser.allowedLogin === false) {
        setNotificationInfo("Nous sommes désolés, mais en raison des limitations de capacité de notre application actuelle, le nombre maximal d'utilisateurs en ligne a été atteint. Veuillez réessayer de vous connecter à un autre moment. Merci beaucoup pour l’intérêt que vous portez à notre application.");
        setShowInfoModal(true);
      } else if (currentUser.profileCompleted === false) {
        navigate('/profile');
      } else if (currentUser.allowedLogin) {
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
      // console.log(username,password);
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
          <div className="img-container">
            <img src="/logo_bnfchat_white.png" alt="Logo" />
          </div>
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
              style={{ width:"90%" }}
            />
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

        <div className="auth-links">
          <p>
            Mot de passe oublié ? <Link to="/reset-password" style={{ color:"black", fontWeight:"800" }}>Réinitialisation</Link>
          </p>
        </div>
      </div>

      {showInfoModal && (<div className="notification-modal" style={{ height:"20%" }}>
        <div className="notification-modal-content" style={{ color:"black" }}>
            {notificationInfo}
        </div>
        <div className="notification-modal-footer">
            <button className="notification-cancel-btn" onClick={() => {setShowInfoModal(false);}}>OK</button>
        </div>
      </div>)}
    </div>
  );
};

export default Login;