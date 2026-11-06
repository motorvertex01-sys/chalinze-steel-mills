import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { LeadershipProfile } from "./leadershipTypes";

const LeadershipStage3D = lazy(() => import("./IndustrialScene").then((module) => ({ default: module.LeadershipScene3D })));

async function loadPublishedProfiles(): Promise<LeadershipProfile[]> {
  const response = await fetch("/api/leadership");
  if (!response.ok) throw new Error("Leadership information could not be loaded. Please try again later.");
  return response.json() as Promise<LeadershipProfile[]>;
}

function Portrait({ profile, large = false }: { profile: LeadershipProfile; large?: boolean }) {
  if (profile.is_vacant) return <div className={`leader-vacancy-art${large ? " is-large" : ""}`} aria-hidden="true"><span>POSITION<br />VACANT</span></div>;
  if (profile.section === "support") {
    return (
      <div className={`leader-support-art${large ? " is-large" : ""}`} role="img" aria-label={`Illustrative artwork for ${profile.name}`}>
        <span className="leader-support-symbol" aria-hidden="true"><i /><b /><i /></span>
        <small>SUPPORT OPERATIONS</small>
      </div>
    );
  }
  if (profile.photo_url) {
    return <img className={`leader-portrait${large ? " is-large" : ""}`} src={profile.photo_url} alt={`Portrait of ${profile.name}`} loading="lazy" />;
  }
  return (
    <div className={`leader-placeholder${large ? " is-large" : ""}`} role="img" aria-label={`Approved portrait of ${profile.name} has not been supplied`}>
      <span className="placeholder-bust" aria-hidden="true" />
      <small>PORTRAIT<br />NOT PROVIDED</small>
    </div>
  );
}

export function ProfileDetails({ profile, onClose, onPrevious, onNext, position }: {
  profile: LeadershipProfile;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  position?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      className="leadership-dialog"
      ref={dialogRef}
      aria-labelledby="profile-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") dialogRef.current?.close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <button className="leadership-dialog-close" type="button" aria-label="Close profile" onClick={() => dialogRef.current?.close()}><X size={20} /></button>
      <div className="leadership-dialog-portrait"><Portrait profile={profile} large /></div>
      <div className="leadership-dialog-copy">
        <span className="leadership-kicker">{profile.section === "board" ? "BOARD OF DIRECTORS" : profile.section === "management" ? "SENIOR MANAGEMENT" : "SUPPORTING STAFF"}</span>
        <h2 id="profile-dialog-title">{profile.name}</h2>
        {profile.title !== profile.name && <p className="leader-title">{profile.title}</p>}
        {!profile.is_vacant && (
          <>
            {profile.biography && <p className="profile-pending-copy">{profile.biography}</p>}
            <dl className="profile-details-list">
              {profile.background && <div><dt>Professional background</dt><dd>{profile.background}</dd></div>}
              {profile.qualifications && <div><dt>Qualifications & experience</dt><dd>{profile.qualifications}</dd></div>}
              {profile.responsibilities && <div><dt>Areas of responsibility</dt><dd>{profile.responsibilities}</dd></div>}
            </dl>
          </>
        )}
        {position && <span className="profile-position" aria-live="polite">{position}</span>}
        {(onPrevious || onNext) && <div className="profile-navigation">
          <button type="button" onClick={onPrevious} disabled={!onPrevious}><ArrowLeft size={15} /> Previous</button>
          <button type="button" onClick={onNext} disabled={!onNext}>Next <ArrowRight size={15} /></button>
        </div>}
      </div>
    </dialog>
  );
}

function ProfileCard({ profile, onOpen, featured = false, ordinal }: { profile: LeadershipProfile; onOpen: () => void; featured?: boolean; ordinal: number }) {
  const action = profile.is_vacant ? "Explore vacancy" : profile.section === "support" ? "View staff category" : "View role";
  const label = profile.title === profile.name ? profile.name : `${profile.name}, ${profile.title}`;

  return (
    <button className={`leader-card${featured ? " is-featured" : ""}${profile.is_vacant ? " is-vacant" : ""}`} type="button" onClick={onOpen} aria-label={`${action}: ${label}`}>
      <span className="leader-card-media"><Portrait profile={profile} /><span className="leader-card-index">{String(ordinal).padStart(2, "0")}</span><span className="leader-card-open"><ArrowUpRight size={17} /></span></span>
      <span className="leader-card-copy">
        <strong>{profile.name}</strong>
        {profile.title !== profile.name && <span className="leader-title">{profile.title}</span>}
        {!profile.is_vacant && profile.biography && <span className="leader-card-biography">{profile.biography}</span>}
        <span className="leader-profile-link">{action} <ArrowUpRight size={14} /></span>
      </span>
    </button>
  );
}

function ProfileGrid({ profiles, label, featured = false }: { profiles: LeadershipProfile[]; label: string; featured?: boolean }) {
  const [selected, setSelected] = useState<LeadershipProfile | null>(null);
  const activeIndex = selected ? profiles.findIndex((profile) => profile.id === selected.id) : -1;

  return (
    <>
      {profiles.length > 0 && (
        <div className={`leadership-grid${featured ? " is-featured-grid" : ""}`} aria-label={label}>
          {profiles.map((profile, index) => <ProfileCard key={profile.id} profile={profile} featured={featured} ordinal={index + 1} onOpen={() => setSelected(profile)} />)}
        </div>
      )}
      {selected && <ProfileDetails
        key={selected.id}
        profile={selected}
        onClose={() => setSelected(null)}
        position={`${activeIndex + 1} / ${profiles.length}`}
        onPrevious={activeIndex > 0 ? () => setSelected(profiles[activeIndex - 1]) : undefined}
        onNext={activeIndex < profiles.length - 1 ? () => setSelected(profiles[activeIndex + 1]) : undefined}
      />}
    </>
  );
}

function LeadershipScene({ onSkip }: { onSkip: () => void }) {
  const [introActive, setIntroActive] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setIntroActive(false);
      return;
    }
    const timer = window.setTimeout(() => setIntroActive(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className={`leadership-hero${introActive ? " is-entering" : ""}`} aria-labelledby="leadership-title">
      <div className="leadership-architecture" aria-hidden="true"><span /><i /><b /></div>
      <div className="leadership-hero-grid" aria-hidden="true" />
      <div className="leadership-scene3d">
        <Suspense fallback={<div className="leadership-scene-loading" role="status">Preparing leadership stage…</div>}>
          <LeadershipStage3D />
        </Suspense>
      </div>
      <div className="leadership-hero-copy">
        <span className="leadership-kicker">CHALINZE STEEL MILLS LTD · LEADERSHIP & GOVERNANCE</span>
        <h1 id="leadership-title">Stewardship.<br /><em>Strength.</em></h1>
        <p>Leadership, accountability and the people shaping Chalinze Steel Mills Ltd.</p>
        <a className="button button-orange" href="#board">Meet the leadership <ArrowRight size={16} /></a>
      </div>
      <div className="leadership-stage-caption" aria-hidden="true"><span>GOVERNANCE · PEOPLE · PURPOSE</span><span>UNITED REPUBLIC OF TANZANIA</span></div>
      {introActive && <button className="leadership-skip" type="button" onClick={() => { setIntroActive(false); onSkip(); }}>Skip introduction</button>}
    </section>
  );
}

export function LeadershipPage() {
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadPublishedProfiles()
      .then((data) => { if (active) setProfiles(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Leadership information could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const board = profiles.filter((profile) => profile.section === "board" && profile.placement === "board");
  const management = profiles.filter((profile) => profile.section === "management");
  const support = profiles.filter((profile) => profile.section === "support");

  return (
    <main className="leadership-page">
      <LeadershipScene onSkip={() => document.getElementById("board")?.scrollIntoView({ behavior: "smooth" })} />
      <nav className="leadership-subnav" aria-label="Leadership sections">
        <a href="#board">Board of Directors</a><a href="#senior-management">Senior Management Team</a><a href="#supporting-staff">Supporting Staff</a>
      </nav>
      {error && <p className="leadership-load-error" role="alert">{error}</p>}
      {loading && <p className="leadership-load-state" role="status">Loading approved leadership profiles…</p>}
      <section id="board" className="leadership-section board-section">
        <div className="section-index">01 / GOVERNANCE LEADERSHIP</div>
        <div className="leadership-section-heading"><div><span className="leadership-kicker">ACCOUNTABILITY & DIRECTION</span><h2>Board of<br /><em>Directors.</em></h2></div><p>Board leadership and governance for Chalinze Steel Mills Ltd.</p></div>
        {!loading && !error && <ProfileGrid profiles={board} label="Board of Directors profiles" featured />}
      </section>
      <section id="senior-management" className="leadership-section management-section">
        <div className="section-index">02 / EXECUTIVE OPERATIONS</div>
        <div className="leadership-section-heading"><div><span className="leadership-kicker">OPERATIONS & DELIVERY</span><h2>Senior Management<br /><em>Team.</em></h2></div><p>Executive and operational roles supporting project development and delivery.</p></div>
        {!loading && !error && <ProfileGrid profiles={management} label="Senior Management Team profiles" />}
      </section>
      <section id="supporting-staff" className="leadership-section supporting-section">
        <div className="section-index">03 / SUPPORTING OPERATIONS</div>
        <div className="leadership-section-heading"><div><span className="leadership-kicker">THE PEOPLE BEHIND THE WORK</span><h2>Supporting<br /><em>Staff.</em></h2></div><p>Supporting roles across day-to-day operations and site services.</p></div>
        {!loading && !error && <ProfileGrid profiles={support} label="Supporting Staff categories" />}
      </section>
      <section className="governance-statement">
        <span className="leadership-kicker">CORPORATE GOVERNANCE</span>
        <h2>Leadership with<br /><em>accountability.</em></h2>
        <p>Good governance supports responsible oversight, ethical conduct, risk awareness and accountability to stakeholders.</p>
        <Link className="button button-outline" to="/contact">Corporate enquiries <ArrowUpRight size={16} /></Link>
      </section>
    </main>
  );
}
