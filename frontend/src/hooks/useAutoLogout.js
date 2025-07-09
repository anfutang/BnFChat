import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function useAutoLogout(timeoutMs = 10 * 60 * 1000) {
  const { currentUser, logout, ping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const timerRef = useRef(null);
  const prevPathRef = useRef(location.pathname);
  const hasLoggedOutRef = useRef(false);

  const handlePing = async () => {
    if (!currentUser?.userId) return;

    const result = await ping(currentUser.userId);
    
    if (result.success) {
        console.log("🟢 Ping success.");
    }
  };  

  useEffect(() => {
    handlePing();
  }, [currentUser?.userId]);

//   // 1. user leaves /chat or /account by changing urls, logout.
//   useEffect(() => {
//     if (!currentUser) return;

//     const allowedPaths = ['/chat', '/account'];
//     const prevPath = prevPathRef.current;
//     const currentPath = location.pathname;

//     const wasOnAllowedPage = allowedPaths.includes(prevPath);
//     const nowOnOtherPage = !allowedPaths.includes(currentPath);

//     console.log("nnnnnnnnn");
//     console.log(prevPathRef.current,currentPath);
//     console.log(wasOnAllowedPage, nowOnOtherPage);

//     if (wasOnAllowedPage && nowOnOtherPage) {
//         console.log(`🟠  Detected: user quits the application: ${prevPath} -> ${currentPath}`);
//         // avoid repetitive logout
//         if (!hasLoggedOutRef.current) {
//             hasLoggedOutRef.current = true;
//             handleLogout();
//         }
//     }

//     prevPathRef.current = currentPath;
//   }, [location.pathname, currentUser, logout, navigate]);

  // 2. no user activity in the last 10 minutes, automatically logout.
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

  // 3. user closes page or the navigator, logout.
  useEffect(() => {
    if (!currentUser) return;

    const handleUnload = () => {
        // console.log('🟠');
        const data = new FormData();
        data.append('userId', currentUser?.userId);
        navigator.sendBeacon('/api/auth/auto-logout', data);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentUser]);
}

export default useAutoLogout;
