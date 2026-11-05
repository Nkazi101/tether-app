import React, { useState } from "react";
import { Operations } from "./Operations";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  SlidersHorizontal,
  LogOut,
  Database,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { PageHeading } from "../components/Editorial";
import { useToast } from "../components/Toast";
import { useAuth } from "../components/AuthProvider";
import { getAuthHeaders } from "../lib/auth-client";
import {
  invalidateHistoryViews,
  useCurrentUserProfileQuery,
} from "../lib/queries";
import { appRoutes } from "../lib/routes";

export function Profile() {
  const { showToast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileQuery = useCurrentUserProfileQuery(user?.id);
  const queryClient = useQueryClient();
  if (!user) return null;
  return (
    <div className="page-wrap profile-wrap">
      <PageHeading
        eyebrow="Your account"
        title={
          <>
            A space for <em>perspective.</em>
          </>
        }
      />
      <section className="profile-header">
        <div className="profile-avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            (user.displayName || user.email || "T").charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h2>{user.displayName || "Your reading desk"}</h2>
          <p>{user.email}</p>
        </div>
      </section>
      <div>
        <Link className="setting-row" to={appRoutes.curations}>
          <Bookmark size={20} />
          <div>
            <h2>Your saved parallels</h2>
            <p>Return to the connections you’re keeping.</p>
          </div>
          <ArrowUpRight size={17} />
        </Link>
        <Link className="setting-row" to={appRoutes.onboarding}>
          <SlidersHorizontal size={20} />
          <div>
            <h2>Reading preferences</h2>
            <p>Keep your favorite categories within easy reach.</p>
          </div>
          <ArrowUpRight size={17} />
        </Link>
        <button
          className="setting-row"
          disabled={isSigningOut}
          onClick={async () => {
            setIsSigningOut(true);
            try {
              await signOut();
              navigate(appRoutes.feed);
              showToast("You’re signed out. Keep exploring.");
            } catch {
              showToast("Could not sign out. Try again.");
              setIsSigningOut(false);
            }
          }}
        >
          <LogOut size={20} />
          <div>
            <h2>{isSigningOut ? "Signing out…" : "Sign out"}</h2>
            <p>Your saved reading will be here when you return.</p>
          </div>
          <ArrowUpRight size={17} />
        </button>
      </div>
      {profileQuery.data?.role === "admin" && <Operations />}
    </div>
  );
}
