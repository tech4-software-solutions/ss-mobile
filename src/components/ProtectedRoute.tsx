import { Navigate } from "react-router-dom";
import { useAuth, isSupabaseConfigured } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen pt-24 px-6 max-w-lg mx-auto text-center">
        <h1 className="font-display font-bold text-xl text-charcoal mb-3">Admin Requires Supabase</h1>
        <p className="font-body text-sm text-muted">
          Copy <code className="text-forest">.env.example</code> to <code className="text-forest">.env</code> and add your Supabase credentials to enable the admin panel.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
