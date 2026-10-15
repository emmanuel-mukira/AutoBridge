import DashboardLayout from "@/components/layout/DashboardLayout";

/**
 * Dashboard component acts as a shell for the dashboard section of the application.
 * It uses DashboardLayout which provides the sidebar and main content area with an Outlet.
 */
export default function Dashboard() {
  return <DashboardLayout />;
}
