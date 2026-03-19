import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import { Loader2, Shield } from 'lucide-react';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          navigate('/auth', { replace: true });
          return;
        }

        const res = await authAPI.googleSession(sessionId);
        login(res.data.user, res.data.token);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/auth', { replace: true });
      }
    };

    processSession();
  }, [navigate, login]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="auth-callback">
      <div className="flex flex-col items-center gap-4">
        <Shield className="w-12 h-12 text-primary animate-pulse" strokeWidth={1.5} />
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
}
