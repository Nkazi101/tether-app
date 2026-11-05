import React from "react";
import {
  Bookmark,
  BookOpen,
  Compass,
  Library,
  UserRound,
  ArrowUpRight,
  Radio,
  Plus,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { appRoutes, getAppViewFromPathname } from "../lib/routes";
import { useAuth } from "./AuthProvider";
import { Brand } from "./Editorial";

export function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const currentView = getAppViewFromPathname(location.pathname);
  const navItems = [
    {
      id: "explore",
      label: "Discover",
      icon: Compass,
      path: appRoutes.explore,
    },
    {
      id: "following",
      label: "Following",
      icon: Radio,
      path: appRoutes.following,
    },
    {
      id: "curations",
      label: "Saved",
      icon: Bookmark,
      path: appRoutes.curations,
    },
  ];
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                aria-current={currentView === item.id ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-account">
            <Link className="header-bring" to="/explore?bring=1">
              <Plus size={16} />
              <span>Bring a story</span>
            </Link>
            {user ? (
              <Link className="account-link" to={appRoutes.profile}>
                <UserRound size={17} />
                <span>{user.displayName?.split(" ")[0] || "Account"}</span>
              </Link>
            ) : (
              <Link className="account-link" to={appRoutes.auth}>
                Sign in <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <Brand home />
        <p>A little history changes the way you see things.</p>
        <Link to={appRoutes.collections}>
          Explore the archive <ArrowUpRight size={14} />
        </Link>
      </footer>
      <nav className="mobile-nav" aria-label="Primary mobile">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={currentView === item.id ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
