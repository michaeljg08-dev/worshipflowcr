import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home as HomeIcon, Music, Calendar, Settings, MonitorPlay } from 'lucide-react';
import './index.css';
import { supabase } from './utils/supabase';
import { setServerIp } from './api';

const Home = React.lazy(() => import('./pages/Home'));
const Setlist = React.lazy(() => import('./pages/Setlist'));
const SongView = React.lazy(() => import('./pages/SongView'));
const Songs = React.lazy(() => import('./pages/Songs'));
const Live = React.lazy(() => import('./pages/Live'));
const NetworkSettings = React.lazy(() => import('./pages/NetworkSettings'));

const queryClient = new QueryClient();

function Layout({ children }) {
  return (
    <div className="mobile-layout">
      <div className="mobile-content">
        <Suspense fallback={<div className="loading">Cargando...</div>}>
          {children}
        </Suspense>
      </div>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <HomeIcon size={24} />
          <span>Inicio</span>
        </NavLink>
        <NavLink to="/setlist" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Calendar size={24} />
          <span>Setlist</span>
        </NavLink>
        <NavLink to="/songs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Music size={24} />
          <span>Canciones</span>
        </NavLink>
        <NavLink to="/live" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <MonitorPlay size={24} />
          <span>En Vivo</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Settings size={24} />
          <span>Ajustes</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  const [discoveryState, setDiscoveryState] = React.useState({ status: 'idle', ip: null, error: null });

  // Autodescubrimiento inteligente de IP Local vía Nube
  React.useEffect(() => {
    const discoverLocal = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.from('live_state').select('lan_ip, updated_at').eq('id', 'default').single();
        if (data?.lan_ip && data?.updated_at) {
          const lastUpdate = new Date(data.updated_at).getTime();
          const now = new Date().getTime();
          const isFresh = (now - lastUpdate) < (1000 * 60 * 3); // 3 minutos

          if (isFresh) {
            localStorage.setItem('discovered_ip', data.lan_ip);
          } else {
            localStorage.removeItem('discovered_ip');
          }
        } else {
          localStorage.removeItem('discovered_ip');
        }
      } catch (e) { /* Silent fail */ }
    };

    discoverLocal();
    const interval = setInterval(discoverLocal, 10000); // Cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  // Detect if we are in the local /mobile path or a public root domain
  const basename = window.location.pathname.startsWith('/mobile') ? '/mobile' : '/';

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/setlist" element={<Layout><Setlist /></Layout>} />
          <Route path="/setlist/:id" element={<Layout><Setlist /></Layout>} />
          <Route path="/song/:id" element={<Layout><SongView /></Layout>} />
          <Route path="/songs" element={<Layout><Songs /></Layout>} />
          <Route path="/live" element={<Layout><Live /></Layout>} />
          <Route path="/settings" element={<Layout><NetworkSettings /></Layout>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
