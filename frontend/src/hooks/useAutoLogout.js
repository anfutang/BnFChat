import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function useAutoLogout(timeoutMs = 10 * 60 * 1000) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout(); 
        navigate('/login');
      }, timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); 

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, logout, navigate, timeoutMs]);
}

export default useAutoLogout;
