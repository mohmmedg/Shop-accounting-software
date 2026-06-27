import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient.ts';
import { setupDatabase } from './lib/setupDatabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import './index.css';

// Auto-setup Supabase tables on app start
setupDatabase().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-left"
          richColors
          dir="rtl"
          toastOptions={{
            style: { fontFamily: 'inherit', direction: 'rtl' },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
