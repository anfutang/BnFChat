import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';
import './ProfileWizard.css';

// Composants pour chaque étape du questionnaire
import AgeEducationStep from './wizard/AgeEducationStep';
import SituationStep from './wizard/SituationStep';
import ResearchExperienceStep from './wizard/ResearchExperienceStep';
import GallicaExperienceStep from './wizard/GallicaExperienceStep';
import ContactPreferencesStep from './wizard/ContactPreferencesStep';
import AvatarSelectionStep from './wizard/AvatarSelectionStep';

const ProfileWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState({
    'age': null,
    'diplome': null,
    'situation': null,
    'recherche_academique': null,
    'recherche_amateur': null,
    'utilise_gallica': null,
    'usage_gallica': null,
    'frequence_gallica': null,
    'contact_autorise': null,
    'avatar_seed': null
  });
  
  const [error, setError] = useState('');
  const fillUncompletedErrorInfo = 'Veuillez remplir tous les champs';
  const [isLoading, setIsLoading] = useState(false);
  const { submitProfile, currentUser, setCurrentUser, cancel } = useAuth();
  const navigate = useNavigate();

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [notificationInfo, setNotificationInfo] = useState('');

  const [profileCompleted, setProfileCompleted] = useState(false);
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!showInfoModal) return;
  
    if (seconds === 0) {
      navigate('/login');
      return;
    }
  
    const timer = setTimeout(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);
  
    return () => clearTimeout(timer);
  }, [seconds, showInfoModal, navigate]);

  // console.log("enter profile:", currentUser);

  useEffect(() => {
    if (!currentUser) {
      handleCancel();
    }
  });

  useEffect(() => {
    // If user has already completed profile, redirect to chat
    if (currentUser) {
      if (!currentUser.profileCompleted) return;

      if (currentUser.allowedLogin === false) {
        setNotificationInfo("Votre inscription a réussi, mais la connexion est momentanément impossible car le nombre maximal d’utilisateurs en ligne a été atteint. Veuillez réessayer de vous connecter ultérieurement. Vous allez être redirigé vers la page de connexion. Merci de votre compréhension.");
        setShowInfoModal(true); 
        setSeconds(10);
      } 

      if (currentUser.allowedLogin) {
        navigate('/chat');
      }
    }
    
  }, [currentUser, navigate]);

  const handleChange = (name, value) => {
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const nextStep = () => {
    // Validation par étape (peut être adaptée selon les besoins)
    if (currentStep === 1) {
      if (!profileData.age || !profileData.diplome) {
        setError(fillUncompletedErrorInfo);
        return;
      }
    }

    if (currentStep === 2) {
      if (!profileData.situation) {
        setError(fillUncompletedErrorInfo);
        return;
      }
    }

    if (currentStep === 3) {
      if (profileData.recherche_academique === null || profileData.recherche_amateur === null) {
        setError(fillUncompletedErrorInfo);
        return;
      }
    }

    if (currentStep === 4) {
      if (profileData.utilise_gallica === null || (profileData.utilise_gallica && (!profileData.usage_gallica || !profileData.frequence_gallica))) {
        setError(fillUncompletedErrorInfo);
        return;
      }
    }

    if (currentStep === 5) {
      if (profileData.contact_autorise === null) {
        setError(fillUncompletedErrorInfo);
        return;
      }
    }
    
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (currentStep === 6) {
      if (!profileData.avatar_seed) {
        setError('Veuillez choisir un avatar');
        return;
      }
    }

    setError('');
    setIsLoading(true);

    try {
      // Formatage des données pour le backend
      const completeProfileData = {
        ...profileData,
        'profile_created': true
      };

      const result = await submitProfile(completeProfileData);
      
      if (result.success) {
        // navigate('/chat');
        setProfileCompleted(true);
      } else {
        setError(result.message || 'Échec de la soumission du profil');
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    // If user cancels profile creation, log them out
    await cancel();
    setCurrentUser(prev => ({
      ...prev, 
      registrationCanceled: true
    }));
    navigate('/login');
  };

  // Rendu de l'étape actuelle
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AgeEducationStep 
            profileData={profileData} 
            handleChange={handleChange} 
          />
        );
      case 2:
        return (
          <SituationStep 
            profileData={profileData} 
            handleChange={handleChange} 
          />
        );
      case 3:
        return (
          <ResearchExperienceStep 
            profileData={profileData} 
            handleChange={handleChange} 
          />
        );
      case 4:
        return (
          <GallicaExperienceStep 
            profileData={profileData} 
            handleChange={handleChange} 
          />
        );
      case 5:
        return (
          <ContactPreferencesStep 
            profileData={profileData} 
            handleChange={handleChange} 
          />
        );
      case 6:
        return (
          <AvatarSelectionStep 
            profileData={profileData} 
            handleChange={handleChange} 
          />
        );
      default:
        return null;
    }
  };

  // Show loading or not found message if not authenticated
  // if (!currentUser) {
  //   return <div className="auth-container" style={{ color:"white" }}>Chargement...</div>;
  // }

  return (
    <div className="auth-container">
      <div className="auth-card wizard-card">
        <h2>Complétez votre profil</h2>
        <p className="wizard-welcome">Bienvenue, {currentUser?.username}! Veuillez compléter votre profil pour continuer.</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="wizard-progress">
          {Array.from({ length: 6 }, (_, i) => (
            <div 
              key={i} 
              className={`wizard-step ${currentStep >= i+1 ? 'active' : ''}`}
            />
          ))}
        </div>
        
        <div className="wizard-content">
          {renderStep()}
        </div>
        
        <div className="wizard-actions">
          {currentStep > 1 && (
            <button 
              type="button" 
              className="wizard-button secondary" 
              onClick={prevStep}
              disabled={isLoading || profileCompleted}
            >
              Précédent
            </button>
          )}
          
          {currentStep === 1 && (
            <button
              type="button"
              className="wizard-button secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Annuler
            </button>
          )}
          
          {currentStep < 6 ? (
            <button 
              type="button" 
              className="wizard-button primary" 
              onClick={nextStep}
              disabled={isLoading}
            >
              Suivant
            </button>
          ) : (
            <button 
              type="button" 
              className="wizard-button primary" 
              onClick={handleSubmit}
              disabled={isLoading || profileCompleted}
            >
              {isLoading ? 'Enregistrement...' : 'Terminer'}
            </button>
          )}
        </div>
      </div>

      {showInfoModal && (<div className="notification-modal" style={{ height:"20%" }}>
        <div className="notification-modal-content" style={{ color:"black" }}>
            {notificationInfo}
        </div>
        <div className="notification-modal-footer" style={{ color:"orangered" }}>
          Redirection dans {seconds} secondes
        </div>
      </div>)}
    </div>
  );
};

export default ProfileWizard;