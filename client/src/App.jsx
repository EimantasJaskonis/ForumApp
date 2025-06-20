import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate  } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { useUser } from './context/UserContext';
import MainOutlet from './components/MainOutlet';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Forum from './pages/Forum';
import Ask from './pages/Ask';
import User from './pages/User';
import TimeoutModal from './components/molecules/TimeoutModal';
import styled from 'styled-components';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #000;
  color: #00ff00;
  font-family: 'Courier New', Courier, monospace;
`;

const AutoLogoutHandler = ({ children }) => {
  const { resetLogoutTimer } = useUser();

  useEffect(() => {
    const resetTimer = () => resetLogoutTimer?.();
    
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetLogoutTimer]);

  return children;
};

// Pagrindinis komponentas, kuris apima maršrutus ir modalą ir tvarko atsijungimo nukreipimą 

function AppContent() {
  const { 
    showTimeoutModal, 
    closeTimeoutModal, 
    redirectAfterLogout,
    setRedirectAfterLogout
  } = useUser();
  
  const navigate = useNavigate(); // Naudojamas navigacijai po atsijungimo

  // Redirect po atsijungimo

  React.useEffect(() => {
    if (redirectAfterLogout) {
      navigate('/');
      setRedirectAfterLogout(false);
    }
  }, [redirectAfterLogout, navigate, setRedirectAfterLogout]);

  return ( // Pagrindinis komponentas, kuris apima maršrutus ir modalą    
    <>
       <AutoLogoutHandler>
        <AppContainer>
          <Routes>
            <Route element={<MainOutlet />}>
              <Route path="/" element={<Home />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/ask" element={<Ask />} />
              <Route path="/user" element={<User />} />
              {/* Pašalinamas klausimų detalės puslapis */}
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppContainer>
      </AutoLogoutHandler>
      
      {showTimeoutModal && (
        <TimeoutModal
          isOpen={showTimeoutModal}
          onClose={closeTimeoutModal}
        />
      )}
    </>
  );
}

// Pagrindinis App komponentas, kuris apima maršrutus ir kontekstą

function App() {
  return (
    <UserProvider>
        <Router>
          <AppContent />
        </Router>
    </UserProvider>
  );
}

export default App;
