import { createRoot } from 'react-dom/client';
import { AuthProvider } from './app/auth';
import App from './app/App.tsx';
import './styles/index.css';

/**
 * Entry point — wraps the entire app with Auth0's AuthProvider
 * so every component in the tree can access authentication state.
 */
createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
