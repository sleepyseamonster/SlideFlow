import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { CarouselProvider } from './contexts/CarouselContext';
import { ContentLibraryProvider } from './contexts/ContentLibraryContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <CarouselProvider>
        <ContentLibraryProvider>
          <App />
        </ContentLibraryProvider>
      </CarouselProvider>
    </AuthProvider>
  </React.StrictMode>
);