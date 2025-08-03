import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Personal from './pages/Personal';
import ProtectedRoute from './components/ProtectedRoute';
import UploadTransactions from './pages/UploadTransactions';

import Analytics from './pages/Analytics';
import Wallet from './pages/Wallet';
import Messages from './pages/Messages';


// TODO: Implement these components
const CSVExportModal = () => <div style={{ display: 'none' }}>CSV Export Modal</div>;
const UploadFileModal = () => <div style={{ display: 'none' }}>Upload File Modal</div>;
const LogoutButton = () => <button style={{ display: 'none' }}>Logout</button>;

function App() {
  return (
    
      <Router>
        {/* Place modals at root so they can be triggered from anywhere */}
        <CSVExportModal />
        <UploadFileModal />
        <LogoutButton />
        <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/personal" element={
          <ProtectedRoute>
            <Personal />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <UploadTransactions />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute>
            <Wallet />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
    
  );
}

export default App;
