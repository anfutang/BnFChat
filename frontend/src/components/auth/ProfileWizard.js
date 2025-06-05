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
    'age': '',
    'diplome': '',
    'situation': '',
    'recherche_academique': false,
    'recherche_amateur': false,
    'utilise_gallica': false,
    'usage_gallica': '',
    'frequence_gallica': '',
    'contact_autorise': false,
    'avatar_seed': null
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { submitProfile, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // If user has already completed profile, redirect to chat
    if (currentUser.profileCompleted) {
      navigate('/chat');
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
        setError('Veuillez remplir tous les champs obligatoires');
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
    setError('');
    setIsLoading(true);

    try {
      // Formatage des données pour le backend
      const completeProfileData = {
        ...profileData,
        'avatar_seed': profileData.avatar_seed || Math.floor(Math.random() * 1000),
        'profile_created': true
      };

      const result = await submitProfile(completeProfileData);
      
      if (result.success) {
        navigate('/chat');
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
    await logout();
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
  if (!currentUser) {
    return <div className="auth-container">Chargement...</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card wizard-card">
        <h2>Complétez votre profil</h2>
        <p className="wizard-welcome">Bienvenue, {currentUser.username}! Veuillez compléter votre profil pour continuer.</p>
        
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
              disabled={isLoading}
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
              disabled={isLoading}
            >
              {isLoading ? 'Enregistrement...' : 'Terminer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileWizard;