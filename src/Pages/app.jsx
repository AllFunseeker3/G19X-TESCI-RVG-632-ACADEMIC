import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import DashBoardLayout from '../Components/DashboardLayout';
import Plantillas from './plantillas';
import Menu from './GenerarCarta';
import Inicio from './Inicio';
import Ingreso from './Ingreso';
import Revision from './Revision';
import Seguimiento from './Seguimiento';
import Configuracion from './Configuracion';
import Usuarios from './Usuarios';
import { leerToken } from '../lib/api.js';

// Vigila caída del back (sin-conexion) y 401 (sesion-expirada) -> /Ingreso.
function VigilanteSesion() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirigir = () => navigate('/Ingreso', { replace: true });
    window.addEventListener('sislegal:sin-conexion', redirigir);
    window.addEventListener('sislegal:sesion-expirada', redirigir);
    return () => {
      window.removeEventListener('sislegal:sin-conexion', redirigir);
      window.removeEventListener('sislegal:sesion-expirada', redirigir);
    };
  }, [navigate]);
  return null;
}

// Ruta protegida: sin token -> login.
function RutaProtegida({ children }) {
  if (!leerToken()) return <Navigate to="/Ingreso" replace />;
  return <DashBoardLayout>{children}</DashBoardLayout>;
}

function App() {
  return (
    <div className="Menu">
      <VigilanteSesion />
      <main>
        <Routes>
          <Route path="/" element={<Ingreso />} />
          <Route path="/Ingreso" element={<Ingreso />} />
          <Route path="/Inicio" element={<RutaProtegida><Inicio /></RutaProtegida>} />
          <Route path="/Plantillas" element={<RutaProtegida><Plantillas /></RutaProtegida>} />
          <Route path="/Revision" element={<RutaProtegida><Revision /></RutaProtegida>} />
          <Route path="/Seguimiento" element={<RutaProtegida><Seguimiento /></RutaProtegida>} />
          <Route path="/Menu" element={<RutaProtegida><Menu /></RutaProtegida>} />
          <Route path="/Configuracion" element={<RutaProtegida><Configuracion /></RutaProtegida>} />
          <Route path="/Usuarios" element={<RutaProtegida><Usuarios /></RutaProtegida>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
