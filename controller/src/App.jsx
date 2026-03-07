import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import Sidebar from './components/Sidebar';
import LiveIndicator from './components/LiveIndicator';
import { ToastProvider } from './components/Toast';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Songs = React.lazy(() => import('./pages/Songs'));
const Playlists = React.lazy(() => import('./pages/Playlists'));
const Events = React.lazy(() => import('./pages/Events'));
const Projection = React.lazy(() => import('./pages/Projection'));
const Users = React.lazy(() => import('./pages/Users'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Bibles = React.lazy(() => import('./pages/Bibles'));
const ProjectionDisplay = React.lazy(() => import('./pages/ProjectionDisplay'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function PageLoader() {
    return (
        <div className="loading-screen">
            <div className="spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</span>
        </div>
    );
}

function Layout({ children }) {
    return (
        <div className="layout">
            <Sidebar />
            <div className="main">
                <div className="page-content">
                    <Suspense fallback={<PageLoader />}>
                        {children}
                    </Suspense>
                </div>
            </div>
            <LiveIndicator />
        </div>
    );
}

import { connectWS } from './api';

export default function App() {
    React.useEffect(() => {
        // Conectar al WS al arrancar para que el servidor detecte que la app está abierta
        connectWS();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout><Dashboard /></Layout>} />
                        <Route path="/songs" element={<Layout><Songs /></Layout>} />
                        <Route path="/playlists" element={<Layout><Playlists /></Layout>} />
                        <Route path="/bibles" element={<Layout><Bibles /></Layout>} />
                        <Route path="/events" element={<Layout><Events /></Layout>} />
                        <Route path="/projection" element={
                            <div className="layout">
                                <Sidebar />
                                <div className="main" style={{ overflow: 'hidden' }}>
                                    <Suspense fallback={<PageLoader />}><Projection /></Suspense>
                                </div>
                            </div>
                        } />
                        <Route path="/display" element={<ProjectionDisplay />} />
                        <Route path="/users" element={<Layout><Users /></Layout>} />
                        <Route path="/settings" element={<Layout><Settings /></Layout>} />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </QueryClientProvider>
    );
}
