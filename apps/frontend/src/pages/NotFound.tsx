import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">404 - Not Found</h1>
      <p className="mt-2 text-muted-foreground">The page you are looking for does not exist.</p>
      <div className="mt-4">
        <Link to="/" className="underline">Go Home</Link>
      </div>
    </main>
  );
}
