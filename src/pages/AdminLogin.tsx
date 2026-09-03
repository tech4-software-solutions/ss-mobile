import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-wood">
      <div className="w-full max-w-md surface-elevated rounded-2xl p-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand mx-auto mb-6">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h1 className="font-display font-black text-2xl text-charcoal text-center mb-1">Admin Access</h1>
        <p className="font-body text-sm text-muted text-center mb-8">
          Sign in to manage SS Mobile Weligama
        </p>

        {!isSupabaseConfigured && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-body text-red-700">
            Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the project .env before signing in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-xs font-semibold text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl font-body text-sm bg-wood-50 border border-border outline-none focus:border-forest/50 focus:ring-2 focus:ring-forest/10"
              placeholder="admin@ssmobile.lk"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-semibold text-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl font-body text-sm bg-wood-50 border border-border outline-none focus:border-forest/50 focus:ring-2 focus:ring-forest/10"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm font-body text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full gradient-brand text-white font-display font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="font-body text-sm text-forest hover:underline"
          >
            Back to store
          </button>
        </p>
      </div>
    </div>
  );
}
