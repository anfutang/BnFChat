import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const ResetPassword = () => {
  const [username, setUsername] = useState('');
  const [userExists, setUserExists] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = input username, 2 = input new password
  const [userState, setUserState] = useState(null); // store backend user info
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [sendRequestInfo, setSendRequestInfo] = useState('');
  const [notificationInfo, setNotificationInfo] = useState('');
  const [notificationInfoColor, setNotificationInfoColor] = useState('white');

  const [reinitialized, setReinitialized] = useState(false);

  const { resetPassword, currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentUser(null);
  }, []);

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/auth/check-username', { username });
      if (response.data.available) {
        setError("Votre nom d'utilisateur n'existe pas. Veuillez vous inscrire.");
        setIsLoading(false);
        return;
      }

      const user = response.data.user;
      setUserExists(true);
      setUserState(user);

      if (user.request_reset_password && user.allowed_reset_password) {
        // Case 2
        // setInfo("Administrateur a approuvé, veuillez définir un nouveau mot de passe.");
        setResetStep(2);
      } else if (!user.request_reset_password) {
        // Case 3: no previous reinitialization request
        setSendRequestInfo("Une demande de réinitialisation de mot de passe va être envoyée. Après cela, votre compte sera suspendu jusqu'à l'approbation de l'administrateur. Continuer ?");
        setShowConfirmModal(true);
      } else if (user.request_reset_password && !user.allowed_reset_password) {
        // Case 4
        setNotificationInfoColor("black");
        setNotificationInfo("Votre demande de réinitialisation n'a pas encore été approuvée. Veuillez réessayer plus tard.");
        setShowInfoModal(true);
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur s'est produite.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetRequest = async () => {
    if (!username) return;

    try {
        const response = await axios.post('/api/auth/request-reset-password', { username });
        
        if (response.data.success) {
            setShowConfirmModal(false);
            setNotificationInfoColor("rgb(45, 175, 45)");
            setNotificationInfo("Votre demande de réinitialisation a été envoyée. Revenez plus tard sur cette page pour réinitialiser votre mot de passe.");
            setShowInfoModal(true);
        } else {
            setNotificationInfoColor("red");
            setNotificationInfo("Échec de l’envoi de la demande de réinitialisation du mot de passe. Veuillez réessayer plus tard.");
            setShowInfoModal(true);
        }
    } catch (err) {
        setNotificationInfoColor("red");
        setNotificationInfo("Échec de l’envoi de la demande de réinitialisation du mot de passe. Veuillez réessayer plus tard.");
        setShowInfoModal(true);
        console.error('Failed to check username:', err);
    } 
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    if (password.length < 6) {
      setError("Le mot de passe doit comporter exactement 6 caractères alphanumériques");
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await resetPassword(username, password);

      if (result.success) {
        setReinitialized(true);
        setInfo("Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.");
        // setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(result.data?.message || "Échec de la réinitialisation.");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue lors de la réinitialisation.");
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
        <h2>Réinitialiser le mot de passe</h2>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        {resetStep === 1 && (
          <form onSubmit={handleUsernameSubmit}>
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
                    }
                }}
                disabled={isLoading}
                required
                style={{ width: '90%' }}
              />
            </div>
            <button type="submit" className="auth-button" disabled={isLoading} style={{ width: '50%' }}>
              {isLoading ? 'Vérification...' : 'Continuer'}
            </button>
          </form>
        )}

        {resetStep === 2 && (
          <form onSubmit={handlePasswordReset}>
            <div className="form-group">
              <label htmlFor="password">Nouveau mot de passe</label>
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
                style={{ width: '90%' }}
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
                style={{ width: '90%' }}
              />
            </div>
            <button type="submit" className="auth-button" disabled={isLoading || reinitialized} style={{ width: '50%' }}>
              {isLoading ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </form>
        )}

        <div className="auth-links">
            <p>
            Vous avez déjà un compte ? <Link to="/login" style={{ color:"black", fontWeight:"800" }}>Se connecter</Link>
            </p>
        </div>

        <div className="auth-links">
            <p>
            Vous n'avez pas de compte ? <Link to="/register" style={{ color:"black", fontWeight:"800" }}>S'inscrire</Link>
            </p>
        </div>
      </div>

      {showConfirmModal && (<div className="notification-modal">
        <div className="notification-modal-content">
            {sendRequestInfo}
        </div>
        <div className="notification-modal-footer">
            <button className="notification-cancel-btn" onClick={() => {setShowConfirmModal(false);}}>Annuler</button>
            <button className="notification-confirm-btn" onClick={handleSendResetRequest}>Continuer</button>
        </div>
      </div>)}

      {showInfoModal && (<div className="notification-modal">
        <div className="notification-modal-content" style={{ color:notificationInfoColor }}>
            {notificationInfo}
        </div>
        <div className="notification-modal-footer">
            <button className="notification-cancel-btn" onClick={() => {setShowInfoModal(false);}}>OK</button>
        </div>
      </div>)}
    </div>
  );
};

export default ResetPassword;
