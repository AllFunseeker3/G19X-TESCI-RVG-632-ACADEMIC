// ============================================================================
// ARCHIVO: src/main.jsx
// FUNCIÓN GENERAL: punto de entrada React (root + router + tema global).
// FLUJO DE DATOS:
//   - ENTRAN: Components/ThemeModeProvider.jsx (modo + acento persistidos).
//   - SALEN: Pages/app.jsx recibe el theme vía <ThemeModeProvider>.
// QUÉ MODIFICAR SI hay cambios: si cambia el proveedor de tema, edita el
//   wrapper de abajo.
// ============================================================================
import { BrowserRouter } from 'react-router-dom'
import App from './Pages/app.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import ThemeModeProvider from './Components/ThemeModeProvider.jsx'

// ============ AQUÍ EMPIEZA ROOT + ROUTER + TEMA ============
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>

      <ThemeModeProvider>
        <App />
      </ThemeModeProvider>
      
    </BrowserRouter>
  </React.StrictMode>,
)
// ============ AQUÍ TERMINA ROOT + ROUTER + TEMA ============
