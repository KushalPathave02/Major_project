import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
import { ThemeProvider } from './ThemeContext';

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
