import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Eye, Factory, LogOut, Plus, Save, Send, Trash2, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileDetails } from "./LeadershipPage";
import type { LeadershipProfile, ProfileInput, ProfileStatus } from "./leadershipTypes";

type AdminSession = { authenticated: boolean; email: string | null; role: "admin" | "editor" | null; configured: boolean };
type AuditEntry = { id: number; profile_id: string; admin_email: string; action: string; before: unknown; after: unknown; created_at: string };
type ManufacturingContent = {
  headline: string;
  introduction: string;
  stages: { id: string; title: string; shortTitle: string }[];
  media?: { heroImage?: string; heroVideo?: string; stageImages?: Record<string, string> };
  [key: string]: unknown;
};
type ManufacturingAdminData = { published: ManufacturingContent; draft: ManufacturingContent; updated_by: string; updated_at: string };

const emptyProfile = (): ProfileInput => ({
  section: "board",
  placement: "board",
  name: "",
  title: "",
  biography: "",
  background: "",
  qualifications: "",
  responsibilities: "",
  photo_url: "",
  is_vacant: false,
  status: "draft",
  sort_order: 10,
});

function auditEntryLabel(entry: AuditEntry) {
  const value = entry.after ?? entry.before;
  if (value && typeof value === "object" && "name" in value && typeof value.name === "string") return value.name;
  return entry.profile_id;
}

function auditSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.stages)) return value;
  return {
    headline: record.headline,
    stageTitles: record.stages.map((stage: unknown) => stage && typeof stage === "object" && "title" in stage ? stage.title : "Untitled stage"),
    qualityStageCount: Array.isArray(record.quality) ? record.quality.length : 0,
    downstreamCategoryCount: Array.isArray(record.downstream) ? record.downstream.length : 0,
    media: record.media && typeof record.media === "object" ? Object.keys(record.media) : [],
  };
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status}).`);
  return result;
}

function statusLabel(status: ProfileStatus) {
  return ({ draft: "Draft", pending_approval: "Pending Approval", published: "Published", archived: "Archived" })[status];
}

export function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [manufacturingJson, setManufacturingJson] = useState("");
  const [manufacturingMeta, setManufacturingMeta] = useState<Pick<ManufacturingAdminData, "updated_by" | "updated_at"> | null>(null);
  const [manufacturingPreview, setManufacturingPreview] = useState<ManufacturingContent | null>(null);
  const [manufacturingMediaTarget, setManufacturingMediaTarget] = useState("heroImage");
  const [manufacturingError, setManufacturingError] = useState("");
  const [manufacturingNotice, setManufacturingNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileInput>(emptyProfile());
  const [preview, setPreview] = useState<LeadershipProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshAdminData = async () => {
    const [nextProfiles, nextAudit, nextManufacturing] = await Promise.all([
      apiRequest<LeadershipProfile[]>("/api/admin/profiles"),
      apiRequest<AuditEntry[]>("/api/admin/audit"),
      apiRequest<ManufacturingAdminData>("/api/admin/manufacturing"),
    ]);
    setProfiles(nextProfiles);
    setAudit(nextAudit);
    setManufacturingJson(JSON.stringify(nextManufacturing.draft, null, 2));
    setManufacturingMeta({ updated_by: nextManufacturing.updated_by, updated_at: nextManufacturing.updated_at });
  };

  useEffect(() => {
    let active = true;
    apiRequest<AdminSession>("/api/admin/session")
      .then(async (value) => {
        if (!active) return;
        setSession(value);
        if (value.authenticated) await refreshAdminData();
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "The administrator service is unavailable."); });
    return () => { active = false; };
  }, []);

  const clearFeedback = () => { setError(""); setNotice(""); };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const signedIn = await apiRequest<{ authenticated: boolean; email: string; role: "admin" | "editor" }>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setSession({ authenticated: true, email: signedIn.email, role: signedIn.role, configured: true });
      setPassword("");
      await refreshAdminData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    clearFeedback();
    try {
      await apiRequest("/api/admin/logout", { method: "POST" });
      setSession({ authenticated: false, email: null, role: null, configured: true });
      setProfiles([]);
      setAudit([]);
      setEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-out failed.");
    }
  };

  const openNewProfile = () => {
    setEditingId(null);
    setForm(emptyProfile());
    clearFeedback();
  };

  const openProfile = (profile: LeadershipProfile) => {
    setEditingId(profile.id);
    setForm({
      section: profile.section,
      placement: profile.placement,
      name: profile.name,
      title: profile.title,
      biography: profile.biography,
      background: profile.background,
      qualifications: profile.qualifications,
      responsibilities: profile.responsibilities,
      photo_url: profile.photo_url,
      is_vacant: profile.is_vacant,
      status: profile.status,
      sort_order: profile.sort_order,
    });
    clearFeedback();
    document.getElementById("profile-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      const url = editingId ? `/api/admin/profiles/${encodeURIComponent(editingId)}` : "/api/admin/profiles";
      const saved = await apiRequest<LeadershipProfile>(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await refreshAdminData();
      setEditingId(saved.id);
      setForm({
        section: saved.section,
        placement: saved.placement,
        name: saved.name,
        title: saved.title,
        biography: saved.biography,
        background: saved.background,
        qualifications: saved.qualifications,
        responsibilities: saved.responsibilities,
        photo_url: saved.photo_url,
        is_vacant: saved.is_vacant,
        status: saved.status,
        sort_order: saved.sort_order,
      });
      setNotice("Profile saved. The change has been recorded in the audit history.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPortrait = async (file?: File) => {
    if (!file) return;
    clearFeedback();
    setBusy(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const result = await apiRequest<{ photo_url: string }>("/api/admin/upload", { method: "POST", body });
      setForm((current) => ({ ...current, photo_url: result.photo_url, is_vacant: false }));
      setNotice("Portrait uploaded. Save the profile to apply the image.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Portrait upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteProfile = async (profile: LeadershipProfile) => {
    if (!window.confirm(`Permanently remove ${profile.name}? This action will be recorded in the audit history.`)) return;
    clearFeedback();
    try {
      await apiRequest(`/api/admin/profiles/${encodeURIComponent(profile.id)}`, { method: "DELETE" });
      if (editingId === profile.id) openNewProfile();
      await refreshAdminData();
      setNotice("Profile removed and recorded in the audit history.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be removed.");
    }
  };

  const setField = <K extends keyof ProfileInput>(field: K, value: ProfileInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const parseManufacturingDraft = () => {
    try {
      const parsed = JSON.parse(manufacturingJson) as ManufacturingContent;
      if (!parsed || typeof parsed !== "object" || typeof parsed.headline !== "string" || !Array.isArray(parsed.stages)) {
        throw new Error("The draft must be a manufacturing content object with a headline and stage list.");
      }
      return parsed;
    } catch (cause) {
      setManufacturingError(cause instanceof Error ? cause.message : "The manufacturing draft is not valid JSON.");
      return null;
    }
  };

  const previewManufacturing = () => {
    setManufacturingError("");
    setManufacturingNotice("");
    const parsed = parseManufacturingDraft();
    if (parsed) setManufacturingPreview(parsed);
  };

  const saveManufacturingDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManufacturingError("");
    setManufacturingNotice("");
    const parsed = parseManufacturingDraft();
    if (!parsed) return;
    setBusy(true);
    try {
      const saved = await apiRequest<{ saved: boolean; updated_by: string; updated_at: string }>("/api/admin/manufacturing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      setManufacturingJson(JSON.stringify(parsed, null, 2));
      setManufacturingMeta({ updated_by: saved.updated_by, updated_at: saved.updated_at });
      setManufacturingPreview(parsed);
      setManufacturingNotice("Manufacturing draft saved. Public content remains unchanged until an administrator publishes it.");
      await refreshAdminData();
    } catch (cause) {
      setManufacturingError(cause instanceof Error ? cause.message : "Manufacturing draft could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const publishManufacturingDraft = async () => {
    if (!window.confirm("Publish the saved manufacturing content to the public website? Confirm all technical claims and approved imagery first.")) return;
    setManufacturingError("");
    setManufacturingNotice("");
    const parsed = parseManufacturingDraft();
    if (!parsed) return;
    setBusy(true);
    try {
      await apiRequest("/api/admin/manufacturing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      await apiRequest("/api/admin/manufacturing/publish", { method: "POST" });
      await refreshAdminData();
      setManufacturingPreview(parsed);
      setManufacturingNotice("Manufacturing content published. The change is recorded in the audit history.");
    } catch (cause) {
      setManufacturingError(cause instanceof Error ? cause.message : "Manufacturing content could not be published.");
    } finally {
      setBusy(false);
    }
  };

  const uploadManufacturingMedia = async (file?: File) => {
    if (!file) return;
    setManufacturingError("");
    setManufacturingNotice("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("media", file);
      const result = await apiRequest<{ media_url: string; media_type: "image" | "video" }>("/api/admin/manufacturing/media", { method: "POST", body });
      const parsed = parseManufacturingDraft();
      if (!parsed) return;
      const media = { heroImage: "", heroVideo: "", stageImages: {}, ...parsed.media };
      if (manufacturingMediaTarget === "heroImage") {
        if (result.media_type !== "image") throw new Error("The hero image slot accepts approved images only.");
        media.heroImage = result.media_url;
      }
      else if (manufacturingMediaTarget === "heroVideo") {
        if (result.media_type !== "video") throw new Error("Choose an MP4 or WebM asset for the hero video slot.");
        media.heroVideo = result.media_url;
      } else {
        if (result.media_type !== "image") throw new Error("Stage presentation slots accept approved images only.");
        const stageId = manufacturingMediaTarget.slice("stage:".length);
        if (!parsed.stages.some((stage) => stage.id === stageId)) throw new Error("Choose a valid production stage before adding its image.");
        media.stageImages[stageId] = result.media_url;
      }
      const updated = { ...parsed, media };
      setManufacturingJson(JSON.stringify(updated, null, 2));
      setManufacturingPreview(updated);
      setManufacturingNotice("Approved asset uploaded and added to the draft. Save the draft to record the media change.");
    } catch (cause) {
      setManufacturingError(cause instanceof Error ? cause.message : "Manufacturing media upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><span className="leadership-kicker">CHALINZE STEEL MILLS LTD</span><h1>Leadership<br /><em>administration.</em></h1><p>Manage, review and publish company leadership profiles.</p></div>
        <Link className="button button-outline" to="/leadership"><ArrowLeft size={15} /> Public leadership page</Link>
      </header>
      {!session && !error && <p className="leadership-load-state" role="status">Connecting to the administration service…</p>}
      {error && <p className="admin-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="admin-feedback" role="status">{notice}</p>}
      {session && !session.authenticated && (
        <section className="admin-login">
          <span className="leadership-kicker">AUTHORIZED ADMINISTRATORS ONLY</span>
          <h2>Sign in to manage leadership information.</h2>
          {session.configured ? (
            <form onSubmit={signIn}>
              <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="button button-orange" type="submit" disabled={busy}>Sign in <ArrowUpRight size={15} /></button>
            </form>
          ) : <p>The administrator account has not been configured. Follow the secure setup instructions in the project README to create the first authorized account.</p>}
        </section>
      )}
      {session?.authenticated && <>
        <div className="admin-toolbar"><p>Signed in as <strong>{session.email}</strong> · {session.role === "admin" ? "Administrator" : "Content editor"}. Changes are recorded.</p><button className="admin-quiet-button" type="button" onClick={signOut}><LogOut size={15} /> Sign out</button></div>
        <section className="admin-review-callout"><strong>Publication review</strong><span>Profiles in Draft, Pending Approval or Archived are not visible publicly. Set a profile to Published only after the company has approved its name, position, portrait and biography.</span></section>
        <section className="admin-manufacturing">
          <div className="admin-section-heading"><div><span className="leadership-kicker">PUBLIC SITE CONTENT</span><h2>Manufacturing experience</h2></div><Factory size={22} aria-hidden="true" /></div>
          <div className="admin-review-callout"><strong>Draft & approval</strong><span>Save changes to the private draft, preview them, and publish only after company and engineering review. Every save and publication is recorded in the change history. {manufacturingMeta && <>Last content change: {new Date(manufacturingMeta.updated_at).toLocaleString()} by {manufacturingMeta.updated_by}.</>}</span></div>
          {manufacturingError && <p className="admin-feedback is-error" role="alert">{manufacturingError}</p>}
          {manufacturingNotice && <p className="admin-feedback" role="status">{manufacturingNotice}</p>}
          <form onSubmit={saveManufacturingDraft}>
            <label className="admin-manufacturing-json">Manufacturing content draft (JSON)
              <textarea rows={24} spellCheck={false} value={manufacturingJson} onChange={(event) => { setManufacturingJson(event.target.value); setManufacturingPreview(null); setManufacturingError(""); setManufacturingNotice(""); }} aria-describedby="manufacturing-json-help" />
            </label>
            <small id="manufacturing-json-help">Edit the page content, six production stages, quality journey, product references and publication note. Invalid content is rejected with a specific validation message.</small>
            <div className="admin-manufacturing-media">
              <label>Approved asset placement
                <select value={manufacturingMediaTarget} onChange={(event) => setManufacturingMediaTarget(event.target.value)}>
                  <option value="heroImage">Hero background image</option><option value="heroVideo">Hero background video</option>
                  {(manufacturingPreview?.stages ?? []).map((stage) => <option key={stage.id} value={`stage:${stage.id}`}>{stage.shortTitle} stage image</option>)}
                </select>
              </label>
              <label className="admin-upload-button"><Upload size={15} /> Upload approved image or video
                <input type="file" accept={manufacturingMediaTarget === "heroVideo" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} disabled={busy} onChange={(event) => { void uploadManufacturingMedia(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
              <small>Images: JPEG, PNG or WebP up to 5 MB. Hero video: MP4 or WebM up to 30 MB. Upload only company-approved media.</small>
            </div>
            <div className="admin-form-actions">
              <button className="button button-outline" type="button" onClick={previewManufacturing} disabled={busy}><Eye size={15} /> Preview draft</button>
              <button className="button button-orange" type="submit" disabled={busy}><Save size={15} /> Save draft</button>
              {session.role === "admin" && <button className="button button-orange" type="button" onClick={() => void publishManufacturingDraft()} disabled={busy}><Send size={15} /> Publish reviewed draft</button>}
            </div>
          </form>
          {manufacturingPreview && <section className="admin-manufacturing-preview" aria-label="Manufacturing draft preview">
            <span className="leadership-kicker">DRAFT PREVIEW · NOT PUBLIC</span>
            <h3>{manufacturingPreview.headline}</h3>
            <p>{manufacturingPreview.introduction}</p>
            <ol>{manufacturingPreview.stages.map((stage) => <li key={stage.id}><span>{stage.shortTitle}</span><strong>{stage.title}</strong></li>)}</ol>
            <small>{Object.keys(manufacturingPreview.media?.stageImages ?? {}).length} stage images · {manufacturingPreview.media?.heroImage ? "Hero image set" : "No hero image"} · {manufacturingPreview.media?.heroVideo ? "Hero video set" : "No hero video"}</small>
          </section>}
        </section>
        <section className="admin-profile-list">
          <div className="admin-section-heading"><div><span className="leadership-kicker">CONTENT REGISTER</span><h2>Leadership profiles</h2></div><button className="button button-orange" type="button" onClick={openNewProfile}><Plus size={16} /> Add profile</button></div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Profile</th><th>Section</th><th>Status</th><th>Order</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
            {profiles.map((profile) => <tr key={profile.id}>
              <td><strong>{profile.name}</strong><small>{profile.title}</small></td>
              <td>{profile.section === "board" ? "Board / Governance" : profile.section === "management" ? "Senior Management" : "Supporting Staff"}</td>
              <td><span className={`admin-status status-${profile.status}`}>{statusLabel(profile.status)}</span></td>
              <td>{profile.sort_order}</td>
              <td>{new Date(profile.updated_at).toLocaleDateString()}</td>
              <td className="admin-row-actions">{(session.role === "admin" || profile.status !== "published") && <button type="button" onClick={() => openProfile(profile)}>Edit</button>}<button type="button" onClick={() => setPreview(profile)} aria-label={`Preview ${profile.name}`}><Eye size={14} /> Preview</button>{session.role === "admin" && <button type="button" className="delete-action" onClick={() => void deleteProfile(profile)} aria-label={`Delete ${profile.name}`}><Trash2 size={14} /></button>}</td>
            </tr>)}
          </tbody></table></div>
        </section>
        <section className="admin-editor" id="profile-editor">
          <div className="admin-section-heading"><div><span className="leadership-kicker">{editingId ? "EDIT PROFILE" : "NEW PROFILE"}</span><h2>{editingId ? "Update profile" : "Add a leadership profile"}</h2></div>{editingId && <button className="admin-quiet-button" type="button" onClick={openNewProfile}><X size={15} /> Clear form</button>}</div>
          <form onSubmit={saveProfile}>
            <div className="admin-form-grid">
              <label>Section<select value={form.section} onChange={(event) => setField("section", event.target.value as ProfileInput["section"])}><option value="board">Board of Directors</option><option value="management">Senior Management Team</option><option value="support">Supporting Staff</option></select></label>
              {form.section === "board" && <label>Governance placement<select value={form.placement} onChange={(event) => setField("placement", event.target.value as ProfileInput["placement"])}><option value="board">Board of Directors</option><option value="governance">Governance / Legal Leadership</option></select></label>}
              <label>Full name / category<input value={form.name} onChange={(event) => setField("name", event.target.value)} required maxLength={160} /></label>
              <label>Official position<input value={form.title} onChange={(event) => setField("title", event.target.value)} required maxLength={200} /></label>
              <label>Publication status<select value={form.status} onChange={(event) => setField("status", event.target.value as ProfileStatus)}><option value="draft">Draft</option><option value="pending_approval">Pending Approval</option>{session.role === "admin" && <><option value="published">Published</option><option value="archived">Archived</option></>}</select></label>
              <label>Display order<input type="number" min="0" max="100000" step="1" value={form.sort_order} onChange={(event) => setField("sort_order", Number(event.target.value))} required /></label>
            </div>
            <label>Professional biography<textarea rows={4} value={form.biography} onChange={(event) => setField("biography", event.target.value)} maxLength={10000} placeholder="Enter company-approved information only." /></label>
            <div className="admin-form-grid admin-form-grid-text">
              <label>Professional background<textarea rows={4} value={form.background} onChange={(event) => setField("background", event.target.value)} maxLength={10000} /></label>
              <label>Qualifications & experience<textarea rows={4} value={form.qualifications} onChange={(event) => setField("qualifications", event.target.value)} maxLength={10000} /></label>
              <label>Areas of responsibility<textarea rows={4} value={form.responsibilities} onChange={(event) => setField("responsibilities", event.target.value)} maxLength={10000} /></label>
            </div>
            <div className="admin-photo-controls">
              <label className="admin-upload-button"><Upload size={15} /> Upload approved portrait<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || form.is_vacant} onChange={(event) => { void uploadPortrait(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
              {form.photo_url && <button className="admin-quiet-button" type="button" onClick={() => setField("photo_url", "")}>Remove portrait</button>}
              <label className="admin-checkbox"><input type="checkbox" checked={form.is_vacant} onChange={(event) => setForm((current) => ({ ...current, is_vacant: event.target.checked, photo_url: event.target.checked ? "" : current.photo_url }))} /> Mark position as vacant</label>
              <small>JPEG, PNG or WebP · 5 MB maximum. Do not upload a portrait without company approval.</small>
            </div>
            <div className="admin-form-actions"><button className="button button-orange" type="submit" disabled={busy}><Save size={15} /> {busy ? "Saving…" : "Save profile"}</button>{editingId && <button className="button button-outline" type="button" onClick={() => { const profile = profiles.find((item) => item.id === editingId); if (profile) setPreview({ ...profile, ...form }); }}><Eye size={15} /> Preview</button>}</div>
          </form>
        </section>
        <section className="admin-audit">
          <div className="admin-section-heading"><div><span className="leadership-kicker">ACCOUNTABILITY RECORD</span><h2>Profile change history</h2></div></div>
          {audit.length ? <div className="admin-audit-list">{audit.map((entry) => <details key={entry.id}><summary><span>{new Date(entry.created_at).toLocaleString()}</span><strong>{entry.action}</strong><span>{auditEntryLabel(entry)}</span><small>{entry.admin_email}</small></summary><pre>{JSON.stringify({ before: auditSnapshot(entry.before), after: auditSnapshot(entry.after) }, null, 2)}</pre></details>)}</div> : <p>No changes have been recorded yet.</p>}
        </section>
      </>}
      {preview && <ProfileDetails key={preview.id} profile={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}
