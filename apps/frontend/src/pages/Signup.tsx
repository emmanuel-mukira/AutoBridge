import { useNavigate } from "react-router-dom";
import { SignupForm } from "@/features/auth/components/SignupForm";

export default function Signup() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/login");
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center px-4 py-12 overflow-hidden">
      <SignupForm onSuccess={handleSuccess} />
    </section>
  );
}
