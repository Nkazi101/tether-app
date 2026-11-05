import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MoveUpRight, Bookmark } from "lucide-react";
import { Brand, TetherMark, EditorialImage } from "../components/Editorial";
import { useAuth } from "../components/AuthProvider";
import { appRoutes, buildDeepDivePath } from "../lib/routes";

export function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="landing-header">
        <Brand home />
        <nav aria-label="Introduction">
          <a href="#perspective">The idea</a>
          <a href="#approach">Our approach</a>
          <Link to={appRoutes.collections}>The collections</Link>
        </nav>
        <Link
          className="account-link"
          to={user ? appRoutes.feed : appRoutes.auth}
        >
          {user ? "Your daily read" : "Sign in"}
          <ArrowUpRight size={16} />
        </Link>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-rule" /> A wider lens on the world
            </p>
            <h1>
              The news moves fast.
              <br />
              <em>History runs deep.</em>
            </h1>
            <p className="hero-description">
              Make sense of today through the patterns of the past. Tether
              connects current events to history, with the evidence and the
              differences in view.
            </p>
            <div className="hero-actions">
              <Link to={appRoutes.feed} className="button-primary">
                Read today’s parallels <ArrowRight size={18} />
              </Link>
              <Link to={appRoutes.explore} className="text-link">
                Bring your own headline <ArrowUpRight size={16} />
              </Link>
            </div>
            <p className="hero-footnote">
              Open to curious minds. No account needed to explore.
            </p>
          </div>
          <div
            className="hero-composition"
            aria-label="Present and past, connected"
          >
            <figure className="hero-photo photo-now">
              <div className="photo-label">
                <span>01 / The present</span>
                <MoveUpRight size={14} />
              </div>
              <EditorialImage
                src="/images/trade-port.jpg"
                alt="Cargo ships and cranes at a modern container port"
                eager
              />
              <figcaption>Trade networks. A connected world.</figcaption>
            </figure>
            <div className="hero-thread">
              <TetherMark />
            </div>
            <figure className="hero-photo photo-then">
              <div className="photo-label">
                <span>02 / The perspective</span>
                <span>↗</span>
              </div>
              <EditorialImage
                src="/images/temple-of-poseidon.jpg"
                alt="The ancient columns of the Temple of Poseidon at Sounion, Greece"
                eager
              />
              <figcaption>Old systems. Familiar pressures.</figcaption>
            </figure>
            <p className="composition-credit">
              Conceptual imagery ·{" "}
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noreferrer"
              >
                Unsplash
              </a>
            </p>
          </div>
        </section>
        <div className="landing-manifesto">
          <span>Read beyond the headline.</span>
          <span>Follow the connection.</span>
          <span>Make up your own mind.</span>
        </div>
        <section id="perspective" className="landing-perspective">
          <div className="section-intro">
            <p className="eyebrow">The past is a useful place to look</p>
            <h2>
              A new story.
              <br />A familiar <em>pattern.</em>
            </h2>
            <p>
              Different centuries. Different people. Sometimes, the same
              pressures underneath. A good historical parallel gives you another
              way to see what’s happening.
            </p>
            <Link className="text-link" to={appRoutes.explore}>
              Find a connection <ArrowUpRight size={16} />
            </Link>
          </div>
          <article className="example-comparison">
            <div className="comparison-topline">
              <span className="eyebrow">An illustrative connection</span>
              <TetherMark />
            </div>
            <div className="comparison-event">
              <span className="comparison-label">Now</span>
              <h3>AI is changing who gets to create and share knowledge.</h3>
            </div>
            <div className="comparison-event then">
              <span className="comparison-label">Then · 15th century</span>
              <h3>The printing press put information into new hands.</h3>
            </div>
            <div className="comparison-insight">
              <p>
                When access to a powerful tool expands, authority shifts with
                it. The technology changes; the struggle over who controls
                information is familiar.
              </p>
              <Link
                to={buildDeepDivePath(
                  "Generative AI Disrupts Knowledge Economies",
                  "The Gutenberg Disruption and the Democratization of Authority",
                  "/",
                )}
                className="text-link"
              >
                Examine the parallel <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </section>
        <section id="approach" className="landing-approach">
          <div>
            <p className="eyebrow">Perspective, with perspective</p>
            <h2>
              History offers context.
              <br />
              <em>You bring the judgment.</em>
            </h2>
          </div>
          <div className="approach-list">
            {[
              [
                "01",
                "Start with what’s happening.",
                "Read the daily feed or bring a headline, event, or question you want to understand.",
              ],
              [
                "02",
                "Look beneath the surface.",
                "Explore historical cases with similar pressures, incentives, and shifts in power.",
              ],
              [
                "03",
                "Question the connection.",
                "Read the sources and the differences. Save what’s useful and build your own perspective.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-closing">
          <Bookmark size={24} strokeWidth={1.4} />
          <p className="eyebrow">For the threads worth keeping</p>
          <h2>
            Let your curiosity
            <br />
            <em>build into something.</em>
          </h2>
          <p>
            Save the connections that stay with you.
            <br />
            Return to them as the world changes.
          </p>
          <Link
            className="button-primary"
            to={
              user
                ? appRoutes.curations
                : "/auth?mode=sign-up&next=%2Fcurations"
            }
          >
            {user ? "Open your saved parallels" : "Start your own collection"}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand home />
        <p>Current events. Historical perspective.</p>
        <Link to={appRoutes.feed}>
          Start reading <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
