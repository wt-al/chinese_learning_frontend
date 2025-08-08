import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import HomePage from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { GamePage } from './pages/GamePage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './index.css';

function GameRedirect() {
  const { sceneId } = useParams();
  return <Navigate to={`/game/${sceneId}/0`} replace />;
}

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* 直接使用页面组件，在页面内部处理认证 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/collection/:collectionId" element={<CollectionPage />} />
            <Route path="/game/:sceneId/:stepIndex" element={<GamePage />} />
            <Route path="/game/:sceneId" element={<GameRedirect />} />
            
            {/* 默认重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;