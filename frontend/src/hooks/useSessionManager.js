import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../utils/formatUtils';

const useSessionManager = () => {
  const [currentSession, setCurrentSession] = useState("tutoriel"); // Commence par le tutoriel
  const [sessionTimer, setSessionTimer] = useState(null);
  const [showSessionMessage, setShowSessionMessage] = useState(true);
  const [sessionEndAlert, setSessionEndAlert] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const timerIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Charger les données de session initiales
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessionResponse = await axios.get('/api/dev/session-data');
        
        // Définir la session actuelle basée sur les données du serveur
        setCurrentSession(sessionResponse.data.sessionStep || "tutoriel");
        
        // Si on est dans la session tutoriel, activer le mode tutoriel
        if (sessionResponse.data.sessionStep === "tutoriel") {
          setTutorialMode(true);
          setTutorialStep(1);
        } else {
          setTutorialMode(false);
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    };
    
    loadSessionData();
  }, []);

  // Effet pour démarrer le minuteur pour la session appropriée
  useEffect(() => {
    if (currentSession === 2) {
      return startSessionTimer(5 * 60); // 5 minutes pour la session exercice
    } else if (currentSession === 3) {
      return startSessionTimer(35 * 60); // 35 minutes pour la session test
    }
  }, [currentSession]);

  // Gérer la fin de la session exercice
  useEffect(() => {
    if (sessionEndAlert) {
      const alertTimeout = setTimeout(() => {
        handleNextSession();
        setSessionEndAlert(false);
      }, 3000); // Après l'affichage de l'alerte
      
      return () => clearTimeout(alertTimeout);
    }
  }, [sessionEndAlert]);

  // Effet pour afficher les guides dans la session test
  useEffect(() => {
    if (currentSession === 3 && showSessionMessage) {
      setShowGuides(true);
    } else {
      setShowGuides(false);
    }
  }, [currentSession, showSessionMessage]);

  // Démarrer le minuteur
  const startSessionTimer = (totalSeconds) => {
    // Nettoyer tout minuteur existant
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    let timeLeft = totalSeconds;
    
    setSessionTimer(formatTime(timeLeft));
    
    timerIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setSessionTimer(formatTime(timeLeft));
      
      if (timeLeft <= 0) {
        clearInterval(timerIntervalRef.current);
        
        // Alerte de fin selon la session
        if (currentSession === 2) {
          setSessionEndAlert(true);
        } else if (currentSession === 3) {
          // Peut-être une alerte différente pour la fin de session test
          return { type: 'systemMessage', message: 'Votre temps de session test est écoulé. Veuillez confirmer et terminer la session.' };
        }
      }
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  };

  // Fonction pour passer à la session suivante
  const handleNextSession = async () => {
    if (currentSession < 3) {
      try {
        // Désactiver le mode tutoriel si on quitte la session 1
        if (currentSession === 1) {
          setTutorialMode(false);
        }
        
        // Nettoyage du minuteur pour les sessions avec chronomètre
        if ((currentSession === 2 || currentSession === 3) && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          setSessionTimer(null);
        }
        
        // Appel API pour changer de session
        await axios.post('/api/dev/change-session', { 
          sessionStep: currentSession + 1, 
        });
        
        // Mise à jour de la session
        setCurrentSession(prevSession => prevSession + 1);
        setShowSessionMessage(true);
        setShowGuides(currentSession + 1 === 3); // Afficher les guides si on passe à la session test
        
        return { resetChat: true };
      } catch (error) {
        console.error('Échec du changement de session:', error);
        return { error: true };
      }
    } else {
      // Rediriger vers la page de feedback
      navigate('/feedback');
      return { redirect: true };
    }
  };

  // Fonctions liées au tutoriel
  const handleNextTutorialStep = () => {
    setTutorialStep(prevStep => prevStep + 1);
  };

  const handleRestartTutorial = () => {
    setTutorialStep(1);
  };

  const handleExitTutorial = () => {
    setTutorialMode(false);
  };

  const handleCompleteTutorial = async () => {
    // Désactiver le mode tutoriel
    setTutorialMode(false);
    
    // Enregistrer que le tutoriel est terminé
    try {
      await axios.post('/api/dev/complete-tutorial');
      // Préparer le passage à la session exercice
      return handleNextSession();
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      return { error: true };
    }
  };

  // Fonction pour confirmer le tutoriel
  const handleConfirmTutorial = () => {
    return { 
      type: 'systemMessage', 
      message: 'Tutoriel confirmé. Vous pouvez maintenant passer à la session exercice.' 
    };
  };

  // Nettoyage à la fermeture
  const cleanupSessionTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  return {
    currentSession,
    sessionTimer,
    showSessionMessage,
    setShowSessionMessage,
    sessionEndAlert,
    tutorialMode,
    tutorialStep,
    showGuides,
    handleNextSession,
    handleNextTutorialStep,
    handleRestartTutorial,
    handleExitTutorial,
    handleCompleteTutorial,
    handleConfirmTutorial,
    cleanupSessionTimer
  };
};

export default useSessionManager;