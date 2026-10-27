import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./AppLayout";
import ProtectedRoute from "../components/shared/ProtectedRoute";
import GuestRoute from "../components/shared/GuestRoute";
import { LoadingFallback } from "../components/shared/LoadingFallback";
import ApplicationError from "../pages/ApplicationError";

const Home = lazy(() => import("../pages/Home"));
const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const DashboardOverview = lazy(() => import("../pages/dashboard/Overview"));
const Clients = lazy(() => import("../pages/Clients"));
const ClientDetails = lazy(() => import("../pages/ClientDetails"));
const Opportunities = lazy(() => import("../pages/Opportunities"));
const OpportunityDetails = lazy(() => import("../pages/OpportunityDetails"));
const Interactions = lazy(() => import("../pages/Interactions"));
const CallPlanner = lazy(() => import("../pages/CallPlanner"));
const Products = lazy(() => import("../pages/Products"));
const Quotations = lazy(() => import("../pages/Quotations"));
const QuotationDetails = lazy(() => import("../pages/QuotationDetails"));
const NotFound = lazy(() => import("../pages/NotFound"));

const loaded = (element: React.ReactNode) => (
  <Suspense fallback={<LoadingFallback />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <ApplicationError />,
    children: [
      { index: true, element: loaded(<Home />) },
      {
        path: "/login",
        element: loaded(
          <GuestRoute>
            <Login />
          </GuestRoute>,
        ),
      },
      {
        path: "/dashboard",
        element: loaded(
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>,
        ),
        children: [
          { index: true, element: loaded(<DashboardOverview />) },
          { path: "clients", element: loaded(<Clients />) },
          { path: "clients/:id", element: loaded(<ClientDetails />) },
          { path: "opportunities", element: loaded(<Opportunities />) },
          {
            path: "opportunities/:id",
            element: loaded(<OpportunityDetails />),
          },
          { path: "interactions", element: loaded(<Interactions />) },
          { path: "follow-ups", element: loaded(<CallPlanner />) },
          { path: "products", element: loaded(<Products />) },
          { path: "quotations", element: loaded(<Quotations />) },
          { path: "quotations/:id", element: loaded(<QuotationDetails />) },
        ],
      },
      { path: "*", element: loaded(<NotFound />) },
    ],
  },
]);
