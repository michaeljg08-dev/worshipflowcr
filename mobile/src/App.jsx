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
        {children}
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
          const isFresh = (now - lastUpdate) < (1000 * 40); // 40 segundos para reflejar cierre rápido

          if (isFresh && data.lan_ip) {
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
    const interval = setInterval(discoverLocal, 5000); // Cada 5 segundos para agilidad
    return () => clearInterval(interval);
  }, []);

  // More robust basename detection
  const isLocalMobile = window.location.pathname.startsWith('/mobile');
  const basename = isLocalMobile ? '/mobile' : '/';

  console.log(`🚀 App mounting. Path: ${window.location.pathname}, Basename: ${basename}`);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <Suspense fallback={<div className="loading-screen" style={{ background: '#000b1d', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter, sans-serif' }}>Cargando Worship Flow...</div>}>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/setlist" element={<Setlist />} />
              <Route path="/setlist/:id" element={<Setlist />} />
              <Route path="/song/:id" element={<SongView />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/live" element={<Live />} />
              <Route path="/settings" element={<NetworkSettings />} />
            </Routes>
          </Layout>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
