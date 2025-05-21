import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../utils/formatUtils';

const useSessionManager = () => {
  const [currentSession, setCurrentSession] = useState(1); // Start with tutorial
  const [sessionTimer, setSessionTimer] = useState(null); // Formatted time display
  const [timeRemaining, setTimeRemaining] = useState(null); // Time in seconds
  const [showSessionMessage, setShowSessionMessage] = useState(true);
  const [sessionEndAlert, setSessionEndAlert] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const timerIntervalRef = useRef(null);
  const saveTimerIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Load initial session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessionResponse = await axios.get('/api/dev/session-data');
        
        // Set current session based on server data
        const sessionId = sessionResponse.data.sessionId || 1;
        setCurrentSession(sessionId);
        
        // If we're in tutorial session, activate tutorial mode
        if (sessionId === 1) {
          setTutorialMode(true);
          setTutorialStep(1);
        } else {
          setTutorialMode(false);
          
          // Initialize timer with the saved value from the server or use defaults
          // Immediately start the timer with the appropriate value based on session type
          if (sessionId === 2) {
            const initialTime = sessionResponse.data.timerExercise !== null ? 
              sessionResponse.data.timerExercise : 300; // Default 5 minutes
            startTimer(initialTime);
          } else if (sessionId === 3) {
            const initialTime = sessionResponse.data.timerTest !== null ? 
              sessionResponse.data.timerTest : 2100; // Default 35 minutes
            startTimer(initialTime);
          }
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    };
    
    loadSessionData();
    
    // Clean up on unmount
    return () => {
      clearTimers();
    };
  }, []);

  // Effect to start appropriate timer when session changes
  useEffect(() => {
    // When entering a new session (not on initial load), start the appropriate timer
    if (currentSession === 2) {
      startSessionTimer(300); // 5 minutes for exercise session
    } else if (currentSession === 3) {
      startSessionTimer(2100); // 35 minutes for test session
    }
  }, [currentSession]);

  // Handle exercise session end
  useEffect(() => {
    if (sessionEndAlert) {
      const alertTimeout = setTimeout(() => {
        handleNextSession();
        setSessionEndAlert(false);
      }, 3000); // After alert display
      
      return () => clearTimeout(alertTimeout);
    }
  }, [sessionEndAlert]);

  // Effect to show guides in test session
  useEffect(() => {
    if (currentSession === 3 && showSessionMessage) {
      setShowGuides(true);
    } else {
      setShowGuides(false);
    }
  }, [currentSession, showSessionMessage]);

  // Clear all timers
  const clearTimers = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (saveTimerIntervalRef.current) {
      clearInterval(saveTimerIntervalRef.current);
      saveTimerIntervalRef.current = null;
    }
  };

  // Start a timer from a specific time value
  const startTimer = (seconds) => {
    // Clear any existing timer
    clearTimers();
    
    // Start a new timer
    setTimeRemaining(seconds);
    setSessionTimer(formatTime(seconds));
    
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prevTime => {
        const newTime = prevTime - 1;
        setSessionTimer(formatTime(newTime));
        
        if (newTime <= 0) {
          clearInterval(timerIntervalRef.current);
          
          // Alert based on session
          if (currentSession === 2) {
            setSessionEndAlert(true);
          } else if (currentSession === 3) {
            // Different alert for test session end
            // You might want to handle this differently
            alert('Your test session time is up. Please confirm and end the session.');
          }
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    // Start a separate interval to save timer value every 30 seconds
    saveTimerIntervalRef.current = setInterval(() => {
      saveTimerToDatabase();
    }, 30000); // Save every 30 seconds
  };

  // Save current timer value to database
  const saveTimerToDatabase = async () => {
    if (currentSession !== 1 && timeRemaining !== null) {
      try {
        await axios.post('/api/dev/update-timer', {
          sessionId: currentSession,
          timerValue: timeRemaining
        });
        console.log('Timer value saved:', timeRemaining);
      } catch (error) {
        console.error('Failed to save timer value:', error);
      }
    }
  };

  // Start the session timer
  const startSessionTimer = (totalSeconds) => {
    startTimer(totalSeconds);
  };

  // Function to move to next session
  const handleNextSession = async () => {
    if (currentSession < 3) {
      try {
        // Save the current timer before moving to next session
        if (currentSession === 2 || currentSession === 3) {
          await saveTimerToDatabase();
        }
        
        // Disable tutorial mode if leaving session 1
        if (currentSession === 1) {
          setTutorialMode(false);
        }
        
        // Clean up timer for timed sessions
        clearTimers();
        
        // Reset timer state
        setSessionTimer(null);
        setTimeRemaining(null);
        
        // API call to change session
        const response = await axios.post('/api/dev/change-session', { 
          sessionId: currentSession + 1
        });
        
        // Store the new chat ID
        if (response.data.chatId) {
          setCurrentChatId(response.data.chatId);
        }
        
        // Update session
        setCurrentSession(prevSession => prevSession + 1);
        setShowSessionMessage(true);
        setShowGuides(currentSession + 1 === 3); // Show guides if moving to test session
        
        // The timer for the new session will be started by the useEffect that watches currentSession
        
        return { resetChat: true, chatId: response.data.chatId };
      } catch (error) {
        console.error('Failed to change session:', error);
        return { error: true };
      }
    } else {
      // Save the timer one last time before redirecting
      await saveTimerToDatabase();
      
      // Redirect to feedback page
      navigate('/feedback');
      return { redirect: true };
    }
  };

  // Tutorial functions
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
    // Disable tutorial mode
    setTutorialMode(false);
    
    // Mark tutorial as completed
    try {
      await axios.post('/api/dev/complete-tutorial');
      // Prepare for transition to exercise session
      return handleNextSession();
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      return { error: true };
    }
  };

  // Function to confirm tutorial
  const handleConfirmTutorial = () => {
    return { 
      type: 'systemMessage', 
      message: 'Tutorial confirmed. You can now move to the exercise session.' 
    };
  };

  // Cleanup on close
  const cleanupSessionTimer = () => {
    clearTimers();
    
    // Save the timer one last time
    saveTimerToDatabase();
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
    currentChatId,
    handleNextSession,
    handleNextTutorialStep,
    handleRestartTutorial,
    handleExitTutorial,
    handleCompleteTutorial,
    handleConfirmTutorial,
    cleanupSessionTimer,
    saveTimerToDatabase
  };
};

export default useSessionManager;