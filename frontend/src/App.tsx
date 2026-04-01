import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import MainLayout from '@components/layout/MainLayout';
import { useAuth } from '@hooks/useAuth';

/* ── /join?ref=xxx → /register?ref=xxx redirect ── */
function JoinRedirect() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  return <Navigate to={ref ? `/register?ref=${ref}` : '/register'} replace />;
}

/* ── Auth guard at route level ── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Still loading auth state — show spinner (not blank)
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--c6-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }

  return <>{children}</>;
}

/* ── Lazy-loaded pages ── */
const Home = lazy(() => import('@pages/Home'));
const Marketplace = lazy(() => import('@pages/Marketplace'));
const Promo = lazy(() => import('@pages/Promo'));
const Live = lazy(() => import('@pages/Live'));
const Feed = lazy(() => import('@pages/Feed'));
const Hot = lazy(() => import('@pages/Hot'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Academy = lazy(() => import('@pages/Academy'));
const DPP = lazy(() => import('@pages/DPP'));
const Agents = lazy(() => import('@pages/Agents'));
const Gamification = lazy(() => import('@pages/Gamification'));
const KOC = lazy(() => import('@pages/KOC'));
const Vendor = lazy(() => import('@pages/Vendor'));
const Admin = lazy(() => import('@pages/Admin'));
const AdminLogin = lazy(() => import('@pages/AdminLogin'));
const Login = lazy(() => import('@pages/Login'));
const Register = lazy(() => import('@pages/Register'));
const Cart = lazy(() => import('@pages/Cart'));
const Checkout = lazy(() => import('@pages/Checkout'));
const ProductDetail = lazy(() => import('@pages/ProductDetail'));
const Pricing = lazy(() => import('@pages/Pricing'));
const Legal = lazy(() => import('@pages/Legal'));
const VNeIDCallback = lazy(() => import('@pages/VNeIDCallback'));
const NotFound = lazy(() => import('@pages/NotFound'));
const WKToken  = lazy(() => import('@pages/WKToken'));

/* ── Loading fallback ── */
function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--text-3)',
        fontSize: '0.9rem',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--c6-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth pages — outside MainLayout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/join" element={<JoinRedirect />} />
        <Route path="/auth/vneid/callback" element={<VNeIDCallback />} />

        {/* Admin routes — outside MainLayout (own layout) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />

        {/* User pages — inside MainLayout */}
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/promo" element={<Promo />} />
          <Route path="/live" element={<Live />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/hot" element={<Hot />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/dpp" element={<DPP />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/gamification" element={<Gamification />} />
          <Route path="/koc" element={<ProtectedRoute><KOC /></ProtectedRoute>} />
          <Route path="/vendor" element={<ProtectedRoute><Vendor /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/wk-token" element={<WKToken />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
