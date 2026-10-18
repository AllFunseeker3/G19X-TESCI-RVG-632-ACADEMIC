// ============================================================================
// ARCHIVO: src/Pages/app.jsx
// FUNCIÓN GENERAL: Define el ruteo de la app y protege rutas con token.
//   Monta cada página dentro de DashBoardLayout vía RutaProtegida.
// FLUJO DE DATOS:
//   - ENTRAN: token de ../lib/api.js (leerToken) y eventos sislegal:*.
//   - SALEN: a Pages/Ingreso.jsx (sin token) o a cada página protegida.
// QUÉ MODIFICAR SI hay cambios: agregar rutas aquí dentro de RutaProtegida.
// ============================================================================
import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import DashBoardLayout from '../Components/DashboardLayout';
import Plantillas from './plantillas';
import Menu from './GenerarCarta';
import Inicio from './Inicio';
import Ingreso from './Ingreso';
import Revision from './Revision';
import Seguimiento from './Seguimiento';
import Clientes from './Clientes';
import Configuracion from './Configuracion';
import Usuarios from './Usuarios';
import { leerToken, leerUsuario } from '../lib/api.js';

// ============ AQUÍ EMPIEZA VIGILANTE SESIÓN ============
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
// ============ AQUÍ TERMINA VIGILANTE SESIÓN ============

// ============ AQUÍ EMPIEZA RUTA PROTEGIDA ============
// Ruta protegida: sin token -> login.
function RutaProtegida({ children }) {
  if (!leerToken()) return <Navigate to="/Ingreso" replace />;
  // CC-01: cuentas con contraseña temporal pendiente van directo al cambio.
  if (leerUsuario()?.debe_cambiar_contrasena) return <Navigate to="/Ingreso" replace />;
  return <DashBoardLayout>{children}</DashBoardLayout>;
}
// ============ AQUÍ TERMINA RUTA PROTEGIDA ============

// ============ AQUÍ EMPIEZA APP / RUTAS ============
function App() {
  return (
    <div className="Menu">
      {/* ============ AQUÍ EMPIEZA VIGILANTE SESIÓN (JSX) ============ */}
      <VigilanteSesion />
      {/* ============ AQUÍ TERMINA VIGILANTE SESIÓN (JSX) ============ */}
      <main>
        {/* ============ AQUÍ EMPIEZA RUTAS ============ */}
        <Routes>
          <Route path="/" element={<Ingreso />} />
          <Route path="/Ingreso" element={<Ingreso />} />
          <Route path="/Inicio" element={<RutaProtegida><Inicio /></RutaProtegida>} />
          <Route path="/Plantillas" element={<RutaProtegida><Plantillas /></RutaProtegida>} />
          <Route path="/Revision" element={<RutaProtegida><Revision /></RutaProtegida>} />
          <Route path="/Seguimiento" element={<RutaProtegida><Seguimiento /></RutaProtegida>} />
          <Route path="/Clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />
          <Route path="/Menu" element={<RutaProtegida><Menu /></RutaProtegida>} />
          <Route path="/Configuracion" element={<RutaProtegida><Configuracion /></RutaProtegida>} />
          <Route path="/Usuarios" element={<RutaProtegida><Usuarios /></RutaProtegida>} />
        </Routes>
        {/* ============ AQUÍ TERMINA RUTAS ============ */}
      </main>
    </div>
  );
}
// ============ AQUÍ TERMINA APP / RUTAS ============

export default App;
