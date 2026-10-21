import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./AppLayout";
import ProtectedRoute from "../components/shared/ProtectedRoute";
import GuestRoute from "../components/shared/GuestRoute";
import { LoadingFallback } from "../components/shared/LoadingFallback";

const Home = lazy(() => import("../pages/Home"));
const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Accounts = lazy(() => import("../pages/Accounts"));
const AccountDetails = lazy(() => import("../pages/AccountDetails"));
const Opportunities = lazy(() => import("../pages/Opportunities"));
const OpportunityDetails = lazy(() => import("../pages/OpportunityDetails"));
const NotFound = lazy(() => import("../pages/NotFound"));

const loaded = (element: React.ReactNode) => <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;

export const router = createBrowserRouter([{
  element: <AppLayout />,
  children: [
    { index: true, element: loaded(<Home />) },
    { path: "/login", element: loaded(<GuestRoute><Login /></GuestRoute>) },
    { path: "/dashboard", element: loaded(<ProtectedRoute><Dashboard /></ProtectedRoute>), children: [
      { index: true, element: <Navigate to="accounts" replace /> },
      { path: "accounts", element: loaded(<Accounts />) },
      { path: "accounts/:id", element: loaded(<AccountDetails />) },
      { path: "opportunities", element: loaded(<Opportunities />) },
      { path: "opportunities/:id", element: loaded(<OpportunityDetails />) },
    ] },
    { path: "*", element: loaded(<NotFound />) },
  ],
}]);
