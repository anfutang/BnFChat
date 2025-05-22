import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const useSessionManager = () => {
  const [sessionState, setSessionState] = useState({
    currentSession: 1,
    timeRemaining: null,
    currentChatId: null,
    isTransitioning: false
  });
  
  const timerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const navigate = useNavigate();

  // Session durations in seconds
  const SESSION_DURATIONS = {
    1: null,  // Tutorial - no timer
    2: 300,   // Exercise - 5 minutes
    3: 2100   // Test - 35 minutes
  };

  // Load initial session data
  useEffect(() => {
    loadSessionData();
    return () => clearAllTimers();
  }, []);

  // Auto-save timer every 30 seconds
  useEffect(() => {
    if (sessionState.timeRemaining !== null && sessionState.currentSession > 1) {
      saveTimerRef.current = setInterval(saveTimerToServer, 30000);
      return () => {
        if (saveTimerRef.current) {
          clearInterval(saveTimerRef.current);
        }
      };
    }
  }, [sessionState.timeRemaining, sessionState.currentSession]);

  const loadSessionData = async () => {
    try {
      const response = await axios.get('/api/dev/session-data');
      const { sessionId, timerExercise, timerTest } = response.data;
      
      setSessionState(prev => ({
        ...prev,
        currentSession: sessionId,
        timeRemaining: sessionId === 2 ? timerExercise : sessionId === 3 ? timerTest : null
      }));

      // Only start timer for exercise (2) and test (3) sessions
      if (sessionId === 2) {
        const savedTime = timerExercise || SESSION_DURATIONS[2];
        startTimer(savedTime);
      } else if (sessionId === 3) {
        const savedTime = timerTest || SESSION_DURATIONS[3];
        startTimer(savedTime);
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  const startTimer = useCallback((seconds) => {
    clearAllTimers();
    
    setSessionState(prev => ({ ...prev, timeRemaining: seconds }));
    
    timerRef.current = setInterval(() => {
      setSessionState(prev => {
        const newTime = prev.timeRemaining - 1;
        
        if (newTime <= 0) {
          clearInterval(timerRef.current);
          handleTimerExpired();
          return { ...prev, timeRemaining: 0 };
        }
        
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
  }, []);

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);
  };

  const saveTimerToServer = async () => {
    if (sessionState.currentSession > 1 && sessionState.timeRemaining !== null) {
      try {
        await axios.post('/api/dev/update-timer', {
          sessionId: sessionState.currentSession,
          timerValue: sessionState.timeRemaining
        });
      } catch (error) {
        console.error('Failed to save timer:', error);
      }
    }
  };

  const handleTimerExpired = () => {
    if (sessionState.currentSession === 2) {
      // Exercise session ended - move to test
      setTimeout(() => transitionToNextSession(), 2000);
    } else if (sessionState.currentSession === 3) {
      // Test session ended - move to feedback
      navigate('/feedback');
    }
  };

  const transitionToNextSession = async () => {
    if (sessionState.isTransitioning) return;
    
    setSessionState(prev => ({ ...prev, isTransitioning: true }));
    
    try {
      await saveTimerToServer();
      
      if (sessionState.currentSession >= 3) {
        navigate('/feedback');
        return { redirect: true };
      }

      const response = await axios.post('/api/dev/change-session', { 
        sessionId: sessionState.currentSession + 1
      });
      
      const newSession = sessionState.currentSession + 1;
      const newChatId = response.data.chatId;
      
      setSessionState(prev => ({
        ...prev,
        currentSession: newSession,
        currentChatId: newChatId,
        timeRemaining: SESSION_DURATIONS[newSession],
        isTransitioning: false
      }));

      // Start timer for new session if needed
      if (SESSION_DURATIONS[newSession]) {
        startTimer(SESSION_DURATIONS[newSession]);
      }
      
      return { success: true, chatId: newChatId, resetChat: true };
    } catch (error) {
      console.error('Session transition failed:', error);
      setSessionState(prev => ({ ...prev, isTransitioning: false }));
      return { error: true };
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    currentSession: sessionState.currentSession,
    timeRemaining: sessionState.timeRemaining,
    formattedTime: formatTime(sessionState.timeRemaining),
    currentChatId: sessionState.currentChatId,
    isTransitioning: sessionState.isTransitioning,
    transitionToNextSession,
    saveTimerToServer
  };
};

export default useSessionManager;