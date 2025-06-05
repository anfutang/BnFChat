import { useState, useRef, useEffect } from 'react';

const useTimer = ({
  sessionData,
  getSessionData,
  updateTimer,
  handleSessionChange,
  setMessageModal,
  setShowMessageModal,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const intervalRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const timeRef = useRef(null);
  const alertedThreeMinRef = useRef(false);
  const alertedOneMinRef = useRef(false);

  const forceToNextSessionInfo = (sessionId) => {
    switch (sessionId) {
      case 1: return "Tutoriel terminé.";
      case 2: return "La session d'exercise est terminée. Cliquez sur Continuer pour commencer le test officiel.";
      case 3: return "Votre test est terminé. Cliquez sur Continuer pour accéder à la page d’évaluation.";
    }
  }

  const formatTime = (totalSeconds) => {
    if (totalSeconds == null) return '--:--';
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const onTimeout = () => {
    setMessageModal('info','Temps écoulé',forceToNextSessionInfo(sessionData.sessionId),'','Continuer',handleSessionChange);
  };

  const onTenMinLeft = () => {
    setMessageModal('warning','Attention : temps presque écoulé','Il vous reste 10 minutes.','OK');
  };
  
  const onOneMinLeft = () => {
    // console.log('oneMinLeft');
    setMessageModal('warning','Attention : temps presque écoulé','Il vous reste 1 minute.','OK');
  };

  // fetch session-specific user timer value from the backend 
  useEffect(() => {
    getSessionData(); 
  }, []);

  // save current timer value in timeRef
  useEffect(() => {
    timeRef.current = timeRemaining;
  }, [timeRemaining]);

  // set timer if sessionData changes
  useEffect(() => {
    if (!sessionData?.sessionId) return;

    let timerValue;

    if (sessionData.sessionId === 1) {
      timerValue = null;
    } else if (sessionData.sessionId === 2) {
      timerValue = sessionData?.timerExercise ?? 300;
    } else if (sessionData.sessionId === 3) {
      timerValue = sessionData?.timerTest ?? 2100;
    } else {
      timerValue = null;
    }

    if (
      typeof timerValue === 'number' &&
      timerValue > 0 &&
      sessionData.sessionId > 1 &&
      sessionData.sessionId < 4
    ) {
      setTimeRemaining(timerValue);
      setIsTimerRunning(true);
    } else {
      console.warn('Timer not started.');
    }
  }, [sessionData]);

  // countdown and alert when 3 minutes or 1 minute left
  useEffect(() => {
    if (!isTimerRunning || timeRemaining == null ) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;

        if (next === 600) {
          onTenMinLeft?.();
          // alertedThreeMinRef.current = true;
        }

        if (next === 60) {
          // console.log('oneMinLeft');
          onOneMinLeft?.();
          // alertedOneMinRef.current = true;
        }

        if (next <= 0) {
          clearInterval(intervalRef.current);
          clearInterval(saveIntervalRef.current);
          clearInterval(timeRef.current);
          setIsTimerRunning(false);
          onTimeout?.();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isTimerRunning]);

  // save timer values to the backend every 30 seconds
  useEffect(() => {
    if (!isTimerRunning || timeRef.current == null || timeRef.current <= 0) return;

    saveIntervalRef.current = setInterval(() => {
      const sessionId = sessionData?.sessionId;
      if (sessionId && timeRef.current >= 0) {
        updateTimer(sessionId,timeRef.current);
      }
    }, 30000);

    return () => clearInterval(saveIntervalRef.current);
  }, [isTimerRunning, sessionData?.sessionId]);

  // controller function
  const startTimer = () => {
    if (!isTimerRunning && timeRemaining > 0) {
      setIsTimerRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = (newSeconds) => {
    setTimeRemaining(newSeconds);
    setIsTimerRunning(false);
    alertedThreeMinRef.current = false;
    alertedOneMinRef.current = false;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer
  };
};

export default useTimer;
