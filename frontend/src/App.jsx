import React, { useState } from 'react';
import Login from './pages/Login';
import Chat from './pages/Chat';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!token) {
    return <Login onAuth={setToken} />;
  }
  return <Chat token={token} onLogout={handleLogout} />;
}

export default App; 