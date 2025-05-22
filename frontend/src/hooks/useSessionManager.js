// hooks/useSessionManager.js - Updated to handle no auto-chat creation

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const useSessionManager = (socketRef) => {
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

  // Setup SocketIO listeners for session changes
  useEffect(() => {
    if (socketRef?.current) {
      const socket = socketRef.current;

      // Session change events
      socket.on('ongoing_chats_terminated', handleOngoingChatsTerminated);
      socket.on('session_change_success', handleSessionChangeSuccess);
      socket.on('session_change_error', handleSessionChangeError);

      return () => {
        socket.off('ongoing_chats_terminated', handleOngoingChatsTerminated);
        socket.off('session_change_success', handleSessionChangeSuccess);
        socket.off('session_change_error', handleSessionChangeError);
      };
    }
  }, [socketRef?.current]);

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
        timeRemaining: sessionId === 2 ? timerExercise : sessionId === 3 ? timerTest : null,
        currentChatId: null  // Don't expect a chat ID on initial load
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

  // SocketIO Event Handlers
  const handleOngoingChatsTerminated = useCallback((data) => {
    console.log('Ongoing chats terminated:', data);
    setSessionState(prev => ({ 
      ...prev, 
      isTransitioning: true,
      currentChatId: null  // Clear chat ID since chats were terminated
    }));
  }, []);

  const handleSessionChangeSuccess = useCallback((data) => {
    console.log('Session change successful:', data);
    
    const newSession = data.session_id;
    // Note: data.chat_id will be null - that's expected!
    
    setSessionState(prev => ({
      ...prev,
      currentSession: newSession,
      currentChatId: null,  // No chat created yet - will be created on first message
      timeRemaining: SESSION_DURATIONS[newSession],
      isTransitioning: false
    }));

    // Start timer for new session if needed
    if (SESSION_DURATIONS[newSession]) {
      startTimer(SESSION_DURATIONS[newSession]);
    }
    
    // Also update the server-side timer state
    updateServerSession(newSession);
  }, [startTimer]);

  const handleSessionChangeError = useCallback((data) => {
    console.error('Session change error:', data);
    setSessionState(prev => ({ 
      ...prev, 
      isTransitioning: false 
    }));
  }, []);

  // Update server session via HTTP (for user record)
  const updateServerSession = async (sessionId) => {
    try {
      await axios.post('/api/dev/change-session', { sessionId });
    } catch (error) {
      console.error('Failed to update server session:', error);
    }
  };

  const transitionToNextSession = async () => {
    if (sessionState.isTransitioning) return { already_transitioning: true };
    
    setSessionState(prev => ({ ...prev, isTransitioning: true }));
    
    try {
      await saveTimerToServer();
      
      if (sessionState.currentSession >= 3) {
        navigate('/feedback');
        return { redirect: true };
      }

      const newSessionId = sessionState.currentSession + 1;
      
      // Use SocketIO for session change if available
      if (socketRef?.current?.connected) {
        console.log(`Requesting session change to ${newSessionId} via SocketIO`);
        socketRef.current.emit('session_change', { 
          session_id: newSessionId 
        });
        
        // Return immediately - the SocketIO handlers will manage the state
        return { success: true, method: 'socketio' };
      } else {
        // Fallback to HTTP if no socket connection
        console.log(`Requesting session change to ${newSessionId} via HTTP`);
        const response = await axios.post('/api/dev/change-session', { 
          sessionId: newSessionId
        });
        
        // Note: response.data.chatId will be null - that's expected!
        
        setSessionState(prev => ({
          ...prev,
          currentSession: newSessionId,
          currentChatId: null,  // No chat created yet
          timeRemaining: SESSION_DURATIONS[newSessionId],
          isTransitioning: false
        }));

        // Start timer for new session if needed
        if (SESSION_DURATIONS[newSessionId]) {
          startTimer(SESSION_DURATIONS[newSessionId]);
        }
        
        return { 
          success: true, 
          chatId: null,  // No chat created
          resetChat: true, 
          method: 'http' 
        };
      }
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