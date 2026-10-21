import { Link, useParams } from "react-router-dom";
import { useAccount } from "@/features/customers/hooks/useAccounts";

export default function CustomerDetails() {
  const id = Number(useParams<{ id: string }>().id);
  const { data: customer, isLoading, error } = useAccount(id);
  return <section className="space-y-4">
    <Link className="text-primary hover:underline" to="/dashboard/customers">← Customers</Link>
    {isLoading && <p>Loading customer...</p>}
    {error && <p role="alert" className="text-destructive">Customer not found or access denied.</p>}
    {customer && <div className="rounded-lg border bg-card p-6 space-y-3">
      <h1 className="text-2xl font-bold">{customer.businessName}</h1>
      <p>{customer.locationAddress}, {customer.countyName}</p>
      {customer.shortHistory && <p>{customer.shortHistory}</p>}
      <p>Owner: {customer.owner ? `${customer.owner.firstName} ${customer.owner.lastName}` : "Unassigned"}</p>
    </div>}
  </section>;
}
