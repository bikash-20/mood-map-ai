// src/App.tsx – Main application entry point
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import './styles/glass.css';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd flex flex-col items-center p-4">
        <nav className="w-full max-w-4xl glass-card flex justify-between items-center p-4 mb-6">
          <h1 className="text-2xl font-bold text-primaryText">Mood Map AI</h1>
          <div className="space-x-2">
            <button className="px-4 py-2 bg-accentPositive text-primaryText rounded-lg shadow-md">Login</button>
            <button className="px-4 py-2 bg-accentNegative text-primaryText rounded-lg shadow-md">Sign Up</button>
          </div>
        </nav>
        <main className="w-full max-w-4xl flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
        <footer className="w-full max-w-4xl glass-card text-center p-2 mt-6 text-secondaryText">
          © 2026 Mood Map AI – All rights reserved.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
