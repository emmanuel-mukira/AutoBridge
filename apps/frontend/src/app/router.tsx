import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./AppLayout";
import ProtectedRoute from "../components/shared/ProtectedRoute";
import GuestRoute from "../components/shared/GuestRoute";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";
import { LoadingFallback } from "../components/shared/LoadingFallback";

const Home = lazy(() => import("../pages/Home"));
const Login = lazy(() => import("../pages/Login"));
const Signup = lazy(() => import("../pages/Signup"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const InviteAccept = lazy(() => import("../pages/InviteAccept"));
const NotFound = lazy(() => import("../pages/NotFound"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const DashboardOverview = lazy(() => import("@/pages/dashboard/Overview"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
const AdminRoles = lazy(() => import("../pages/admin/AdminRoles"));
const Settings = lazy(() => import("../pages/Settings"));
const Leads = lazy(() => import("@/pages/Leads"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetails = lazy(() => import("@/pages/CustomerDetails"));
const Quotations = lazy(() => import("@/pages/Quotations"));
const CallPlanner = lazy(() => import("@/pages/CallPlanner"));
const Interactions = lazy(() => import("@/pages/Interactions"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Home />
          </Suspense>
        )
      },
      { 
        path: "/login", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GuestRoute>
              <Login />
            </GuestRoute>
          </Suspense>
        ),
      },
      { 
        path: "/signup", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GuestRoute>
              <Signup />
            </GuestRoute>
          </Suspense>
        ),
      },
      { 
        path: "/forgot-password", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GuestRoute>
              <ForgotPassword />
            </GuestRoute>
          </Suspense>
        ),
      },
      { 
        path: "/reset-password", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GuestRoute>
              <ResetPassword />
            </GuestRoute>
          </Suspense>
        ),
      },
      { 
        path: "/invite/accept", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <InviteAccept />
          </Suspense>
        )
      },
      {
        path: "/dashboard",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Suspense>
        ),
        children: [
          { 
            index: true, 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <DashboardOverview />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "leads", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <Leads />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "customers", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <Customers />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "customers/:id", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <CustomerDetails />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "quotations", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <Quotations />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "call-planner", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <CallPlanner />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "interactions", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <Interactions />
                </ErrorBoundary>
              </Suspense>
            )
          },
          { 
            path: "audit-logs", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute requireAdmin>
                  <ErrorBoundary>
                    <AuditLogs />
                  </ErrorBoundary>
                </ProtectedRoute>
              </Suspense>
            ),
          },
          { 
            path: "users", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          { 
            path: "roles", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute requireAdmin>
                  <AdminRoles />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          { 
            path: "settings", 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary>
                  <Settings />
                </ErrorBoundary>
              </Suspense>
            ),
          },
        ],
      },
      { 
        path: "*", 
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <NotFound />
          </Suspense>
        )
      },
    ],
  },
]);
