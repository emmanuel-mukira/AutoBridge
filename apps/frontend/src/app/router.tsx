import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./AppLayout";
import ProtectedRoute from "../components/shared/ProtectedRoute";
import GuestRoute from "../components/shared/GuestRoute";
import { LoadingFallback } from "../components/shared/LoadingFallback";

const Home = lazy(() => import("../pages/Home"));
const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Customers = lazy(() => import("../pages/Customers"));
const CustomerDetails = lazy(() => import("../pages/CustomerDetails"));
const NotFound = lazy(() => import("../pages/NotFound"));

const loaded = (element: React.ReactNode) => <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;

export const router = createBrowserRouter([{
  element: <AppLayout />,
  children: [
    { index: true, element: loaded(<Home />) },
    { path: "/login", element: loaded(<GuestRoute><Login /></GuestRoute>) },
    { path: "/dashboard", element: loaded(<ProtectedRoute><Dashboard /></ProtectedRoute>), children: [
      { index: true, element: <Navigate to="customers" replace /> },
      { path: "customers", element: loaded(<Customers />) },
      { path: "customers/:id", element: loaded(<CustomerDetails />) },
    ] },
    { path: "*", element: loaded(<NotFound />) },
  ],
}]);
