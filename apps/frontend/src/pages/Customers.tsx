import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateCustomerDialog } from "@/features/customers/components/CreateCustomerDialog";
import { useAccounts } from "@/features/customers/hooks/useAccounts";

export default function Customers() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useAccounts();
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Customer accounts</h1>
        <Button onClick={() => setOpen(true)}>New customer</Button>
      </div>
      {error && <p role="alert" className="text-destructive">Unable to load customers. Please try again.</p>}
      {isLoading && <p>Loading customers...</p>}
      {!isLoading && !error && data?.accounts.length === 0 && <p>No accounts yet.</p>}
      {!!data?.accounts.length && <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-3">Account</th><th className="p-3">County</th><th className="p-3">Owner</th></tr></thead>
          <tbody>{data.accounts.map((customer) => <tr key={customer.id} className="border-b last:border-0">
            <td className="p-3"><Link className="text-primary hover:underline" to={`/dashboard/customers/${customer.id}`}>{customer.businessName}</Link></td>
            <td className="p-3">{customer.countyName}</td>
            <td className="p-3">{customer.owner ? `${customer.owner.firstName} ${customer.owner.lastName}` : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <CreateCustomerDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
