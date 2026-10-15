import { useAuth } from "@/app/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.roleId === 1;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your personal information and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Account Information</h3>
                <p className="text-sm text-muted-foreground">
                  Password changes and profile updates will be managed through our email service (Listmonk).
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  You will receive a secure link via email to update your information.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                Manage your billing information and subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Billing management will be available here. You'll be able to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li>View current subscription plan</li>
                  <li>Update payment methods</li>
                  <li>View billing history</li>
                  <li>Manage invoices</li>
                </ul>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Billing features are currently under development
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
