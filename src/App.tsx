import React, { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoadingState } from "./components/Editorial";
import { ToastProvider } from "./components/Toast";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { buildAuthPath } from "./lib/routes";
const ExplorePage = lazy(() =>
  import("./views/Browse").then((module) => ({ default: module.BrowsePage })),
);
const MethodPage = lazy(() =>
  import("./views/Browse").then((module) => ({ default: module.MethodPage })),
);
const PatternsPage = lazy(() => import("./views/Patterns"));
const ComparisonPage = lazy(() =>
  import("./views/StoryExperience").then((module) => ({
    default: module.ComparisonPage,
  })),
);
const AnalysisRequestPage = lazy(() =>
  import("./views/Workbench").then((module) => ({
    default: module.AnalysisRequestPage,
  })),
);
const ReadingDeskPage = lazy(() =>
  import("./views/Workbench").then((module) => ({
    default: module.ReadingDeskPage,
  })),
);
const ArchivePage = lazy(() =>
  import("./views/Workbench").then((module) => ({
    default: module.ArchivePage,
  })),
);
const LegacyComparisonPage = lazy(() =>
  import("./views/Workbench").then((module) => ({
    default: module.LegacyComparisonPage,
  })),
);
const Auth = lazy(() =>
  import("./views/Auth").then((module) => ({ default: module.Auth })),
);
const Profile = lazy(() =>
  import("./views/Profile").then((module) => ({ default: module.Profile })),
);
const ReadingPreferences = lazy(() =>
  import("./views/ReadingPreferences").then((module) => ({
    default: module.ReadingPreferences,
  })),
);
const UpdatePassword = lazy(() =>
  import("./views/UpdatePassword").then((module) => ({
    default: module.UpdatePassword,
  })),
);
function RequireAuth() {
  const { user, isAuthReady } = useAuth();
  const location = useLocation();
  if (!isAuthReady) return <LoadingState label="Opening your reading desk…" />;
  return user ? (
    <Outlet />
  ) : (
    <Navigate to={buildAuthPath(location.pathname + location.search)} replace />
  );
}
function Preferences() {
  return <ReadingPreferences />;
}
function NavigationEffects() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = location.pathname.startsWith("/following")
      ? "Tether · Follow what changes"
      : location.pathname.startsWith("/comparisons")
        ? "Tether · A living historical comparison"
        : "Tether · Understand the pattern";
  }, [location.pathname]);
  return null;
}
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationEffects />
        <Suspense fallback={<LoadingState label="Opening Tether…" />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route element={<Layout />}>
              <Route path="/" element={<ExplorePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route
                path="/feed"
                element={<Navigate to="/explore" replace />}
              />
              <Route path="/requests/:id" element={<AnalysisRequestPage />} />
              <Route path="/comparisons/:id" element={<ComparisonPage />} />
              <Route path="/collections" element={<ArchivePage />} />
              <Route path="/deep-dive" element={<LegacyComparisonPage />} />
              <Route path="/method" element={<MethodPage />} />
              <Route path="/patterns" element={<PatternsPage />} />
              <Route element={<RequireAuth />}>
                <Route
                  path="/following"
                  element={<ReadingDeskPage following />}
                />
                <Route path="/curations" element={<ReadingDeskPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/onboarding" element={<Preferences />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/explore" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
