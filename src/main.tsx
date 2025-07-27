import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Bicicletas from "./pages/Bicicletas";
import OrdenesReparacion from "./pages/OrdenesReparacion";
import Facturas from "./pages/Facturas";
import Pagos from "./pages/Pagos";
import Inventario from "./pages/Inventario";
import AlertasStock from "./pages/AlertasStock";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import './index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Index /></ProtectedRoute>,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: "/bicicletas",
    element: <ProtectedRoute><Bicicletas /></ProtectedRoute>,
  },
  {
    path: "/ordenes",
    element: <ProtectedRoute><OrdenesReparacion /></ProtectedRoute>,
  },
  {
    path: "/facturas",
    element: <ProtectedRoute><Facturas /></ProtectedRoute>,
  },
  {
    path: "/pagos",
    element: <ProtectedRoute><Pagos /></ProtectedRoute>,
  },
  {
    path: "/inventario",
    element: <ProtectedRoute><Inventario /></ProtectedRoute>,
  },
  {
    path: "/alertas-stock",
    element: <ProtectedRoute><AlertasStock /></ProtectedRoute>,
  },
  {
    path: "/analytics",
    element: <ProtectedRoute><Analytics /></ProtectedRoute>,
  },
  {
    path: "/logs",
    element: <ProtectedRoute><Logs /></ProtectedRoute>,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
