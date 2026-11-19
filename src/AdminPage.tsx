import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Eye, Factory, FileText, Image, LayoutDashboard, LogOut, Newspaper, Plus, Redo2, Save, Send, ShieldCheck, Trash2, Undo2, Upload, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileDetails } from "./LeadershipPage";
import type { LeadershipProfile, ProfileInput, ProfileStatus } from "./leadershipTypes";
import { availablePageLayouts, createDefaultSiteConfig, mergeSiteConfig, siteConfigPathIsSafe } from "./siteConfig";
import type { SiteConfig, SiteGroup } from "./siteConfig";
import type { NewsMediaContent, NewsMediaItem, VisualGalleryContent, VisualMediaItem } from "./VisualGallery";

type AdminSession = { authenticated: boolean; email: string | null; role: "admin" | "editor" | null; configured: boolean; passwordChangeRequired?: boolean };
type AuditEntry = { id: number; profile_id: string; admin_email: string; action: string; before: unknown; after: unknown; created_at: string };
type AdminUser = { id: string; email: string; role: "admin" | "editor"; created_at: string };
type ManufacturingContent = {
  headline: string;
  introduction: string;
  stages: { id: string; title: string; shortTitle: string }[];
  media?: { heroImage?: string; heroVideo?: string; stageImages?: Record<string, string> };
  [key: string]: unknown;
};
type ManufacturingAdminData = { published: ManufacturingContent; draft: ManufacturingContent; updated_by: string; updated_at: string };
type VisualGalleryAdminData = { published: VisualGalleryContent; draft: VisualGalleryContent; updated_by: string; updated_at: string };
type VisualGalleryItemForm = Omit<VisualMediaItem, "id" | "sortOrder">;
type NewsMediaAdminData = { published: NewsMediaContent; draft: NewsMediaContent; updated_by: string; updated_at: string };
type NewsMediaItemForm = Omit<NewsMediaItem, "id" | "sortOrder">;
type HistoryStatus = { canUndo: boolean; canRedo: boolean; undoLabel: string | null; redoLabel: string | null };
type CorporateDocument = { id: string; label: string; stored: boolean; size_bytes: number | null; updated_at: string | null };

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

const emptyGalleryItem = (): VisualGalleryItemForm => ({
  title: "",
  category: "",
  description: "",
  alt: "",
  mediaType: "image",
  mediaUrl: "",
});

const emptyNewsMediaItem = (): NewsMediaItemForm => ({
  title: "",
  category: "",
  publishedAt: "",
  description: "",
  mediaType: "",
  mediaUrl: "",
  alt: "",
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

function SiteGroupEditor({ groups, onChange }: { groups: SiteGroup[]; onChange: (groups: SiteGroup[]) => void }) {
  return <div className="site-group-editor">
    {groups.map((group, groupIndex) => <fieldset className="site-group-card" key={`${group.label}-${groupIndex}`}>
      <div className="site-group-heading"><label>Group label<input value={group.label} onChange={(event) => onChange(groups.map((item, index) => index === groupIndex ? { ...item, label: event.target.value } : item))} /></label><button className="admin-quiet-button" type="button" onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}>Remove group</button></div>
      {group.links.map((link, linkIndex) => <div className="site-link-row" key={`${link.label}-${linkIndex}`}>
        <label>Link label<input value={link.label} onChange={(event) => onChange(groups.map((item, index) => index === groupIndex ? { ...item, links: item.links.map((entry, entryIndex) => entryIndex === linkIndex ? { ...entry, label: event.target.value } : entry) } : item))} /></label>
        <label>Path or HTTPS URL<input value={link.path} onChange={(event) => onChange(groups.map((item, index) => index === groupIndex ? { ...item, links: item.links.map((entry, entryIndex) => entryIndex === linkIndex ? { ...entry, path: event.target.value } : entry) } : item))} aria-invalid={!siteConfigPathIsSafe(link.path)} /></label>
        <button className="admin-quiet-button" type="button" aria-label="Remove link" onClick={() => onChange(groups.map((item, index) => index === groupIndex ? { ...item, links: item.links.filter((_, entryIndex) => entryIndex !== linkIndex) } : item))}><X size={15} /></button>
      </div>)}
      <button className="admin-quiet-button" type="button" onClick={() => onChange(groups.map((item, index) => index === groupIndex ? { ...item, links: [...item.links, { label: "", path: "/" }] } : item))}><Plus size={14} /> Add link</button>
    </fieldset>)}
    <button className="button button-outline" type="button" onClick={() => onChange([...groups, { label: "", links: [{ label: "", path: "/" }] }])}><Plus size={15} /> Add group</button>
  </div>;
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
  const [visualGallery, setVisualGallery] = useState<VisualGalleryAdminData | null>(null);
  const [galleryItemForm, setGalleryItemForm] = useState<VisualGalleryItemForm>(emptyGalleryItem);
  const [galleryEditingId, setGalleryEditingId] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState("");
  const [galleryNotice, setGalleryNotice] = useState("");
  const [newsMedia, setNewsMedia] = useState<NewsMediaAdminData | null>(null);
  const [newsMediaItemForm, setNewsMediaItemForm] = useState<NewsMediaItemForm>(emptyNewsMediaItem);
  const [newsMediaEditingId, setNewsMediaEditingId] = useState<string | null>(null);
  const [newsMediaError, setNewsMediaError] = useState("");
  const [newsMediaNotice, setNewsMediaNotice] = useState("");
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(createDefaultSiteConfig);
  const [siteConfigError, setSiteConfigError] = useState("");
  const [siteConfigNotice, setSiteConfigNotice] = useState("");
  const [siteConfigTab, setSiteConfigTab] = useState<"home" | "pages" | "navigation" | "design">("home");
  const [selectedPagePath, setSelectedPagePath] = useState("/company");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null });
  const [corporateDocuments, setCorporateDocuments] = useState<CorporateDocument[]>([]);
  const [selectedCorporateDocument, setSelectedCorporateDocument] = useState("");
  const [corporateDocumentsError, setCorporateDocumentsError] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "editor">("editor");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("admin@chalinze.co.tz");
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileInput>(emptyProfile());
  const [preview, setPreview] = useState<LeadershipProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshAdminData = async () => {
    const [nextProfiles, nextAudit, nextManufacturing, nextSiteConfig, nextHistory, nextVisualGallery, nextNewsMedia] = await Promise.all([
      apiRequest<LeadershipProfile[]>("/api/admin/profiles"),
      apiRequest<AuditEntry[]>("/api/admin/audit"),
      apiRequest<ManufacturingAdminData>("/api/admin/manufacturing"),
      apiRequest<{ draft: Partial<SiteConfig> }>("/api/admin/site-config"),
      apiRequest<HistoryStatus>("/api/admin/history"),
      apiRequest<VisualGalleryAdminData>("/api/admin/visual-gallery"),
      apiRequest<NewsMediaAdminData>("/api/admin/news-media"),
    ]);
    setProfiles(nextProfiles);
    setAudit(nextAudit);
    setManufacturingJson(JSON.stringify(nextManufacturing.draft, null, 2));
    setManufacturingMeta({ updated_by: nextManufacturing.updated_by, updated_at: nextManufacturing.updated_at });
    setSiteConfig(mergeSiteConfig(nextSiteConfig.draft));
    setHistoryStatus(nextHistory);
    setVisualGallery(nextVisualGallery);
    setNewsMedia(nextNewsMedia);
  };

  const refreshCorporateDocuments = async () => {
    const documents = await apiRequest<CorporateDocument[]>("/api/admin/corporate-documents");
    setCorporateDocuments(documents);
  };

  const refreshAdminUsers = async () => setAdminUsers(await apiRequest<AdminUser[]>("/api/admin/users"));

  useEffect(() => {
    let active = true;
    apiRequest<AdminSession>("/api/admin/session")
      .then(async (value) => {
        if (!active) return;
        setSession(value);
        if (value.authenticated) {
          if (value.passwordChangeRequired) return;
          await refreshAdminData();
          if (value.role === "admin") {
            await refreshAdminUsers().catch((cause: unknown) => {
              if (active) setAccountError(cause instanceof Error ? cause.message : "Administrator accounts could not be loaded.");
            });
            await refreshCorporateDocuments().catch((cause: unknown) => {
              if (active) setCorporateDocumentsError(cause instanceof Error ? cause.message : "Private certificates could not be loaded.");
            });
          }
        }
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
      const signedIn = await apiRequest<{ authenticated: boolean; email: string; role: "admin" | "editor"; passwordChangeRequired?: boolean }>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setSession({ authenticated: true, email: signedIn.email, role: signedIn.role, configured: true, passwordChangeRequired: signedIn.passwordChangeRequired });
      setPassword("");
      if (signedIn.passwordChangeRequired) return;
      await refreshAdminData();
      if (signedIn.role === "admin") {
        await Promise.all([refreshAdminUsers(), refreshCorporateDocuments()]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    if (nextPassword.length < 14 || nextPassword.length > 200) {
      setError("Choose a password between 14 and 200 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nextPassword }),
      });
      setNextPassword("");
      setConfirmPassword("");
      setSession((current) => current ? { ...current, passwordChangeRequired: false } : current);
      setNotice("Password updated. Your temporary password is no longer valid.");
      await refreshAdminData();
      if (session?.role === "admin") await Promise.all([refreshAdminUsers(), refreshCorporateDocuments()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  const createAdminUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError("");
    setAccountNotice("");
    setTemporaryPassword("");
    setBusy(true);
    try {
      const created = await apiRequest<AdminUser & { temporaryPassword: string }>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, role: newUserRole }),
      });
      setAdminUsers((current) => [...current, created].sort((left, right) => left.created_at.localeCompare(right.created_at)));
      setNewUserEmail("");
      setTemporaryPassword(created.temporaryPassword);
      setAccountNotice(`Account created for ${created.email}. Copy the temporary password and share it through a trusted channel.`);
    } catch (cause) {
      setAccountError(cause instanceof Error ? cause.message : "Account could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const checkAdminSetup = async () => {
    clearFeedback();
    setBusy(true);
    try {
      const current = await apiRequest<AdminSession>("/api/admin/session");
      setSession(current);
      setNotice(current.configured
        ? "Administrator setup is complete. Sign in with the configured administrator email and password."
        : "The password secret is not configured yet. Add it with Wrangler, then check again.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check administrator setup.");
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
      setCorporateDocuments([]);
      setSelectedCorporateDocument("");
      setAdminUsers([]);
      setTemporaryPassword("");
      setEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-out failed.");
    }
  };

  const uploadCorporateDocument = async (id: string, file?: File) => {
    if (!file) return;
    setCorporateDocumentsError("");
    setBusy(true);
    try {
      await apiRequest(`/api/admin/corporate-documents/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      await refreshCorporateDocuments();
      setSelectedCorporateDocument(id);
    } catch (cause) {
      setCorporateDocumentsError(cause instanceof Error ? cause.message : "Certificate upload failed.");
    } finally {
      setBusy(false);
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

  const updateSiteConfig = (update: (current: SiteConfig) => SiteConfig) => setSiteConfig((current) => update(current));

  const saveSiteConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSiteConfigError("");
    setSiteConfigNotice("");
    setBusy(true);
    try {
      await apiRequest("/api/admin/site-config", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(siteConfig),
      });
      await refreshAdminData();
      setSiteConfigNotice("Site-wide content draft saved. Public content remains unchanged until an administrator publishes it.");
    } catch (cause) {
      setSiteConfigError(cause instanceof Error ? cause.message : "Site-wide content could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const publishSiteConfig = async () => {
    if (!window.confirm("Publish the saved site-wide content, navigation and design changes? Review all page copy and links first.")) return;
    setSiteConfigError("");
    setSiteConfigNotice("");
    setBusy(true);
    try {
      await apiRequest("/api/admin/site-config/publish", { method: "POST" });
      await refreshAdminData();
      window.dispatchEvent(new Event("site-config-updated"));
      setSiteConfigNotice("Site-wide content published and visible on the public website.");
    } catch (cause) {
      setSiteConfigError(cause instanceof Error ? cause.message : "Site-wide changes could not be published.");
    } finally {
      setBusy(false);
    }
  };

  const applyUndoRedo = async (direction: "undo" | "redo") => {
    setBusy(true);
    clearFeedback();
    setSiteConfigError("");
    try {
      const result = await apiRequest<{ applied: string; action: string }>(`/api/admin/${direction}`, { method: "POST" });
      await refreshAdminData();
      window.dispatchEvent(new Event("site-config-updated"));
      setNotice(`${direction === "undo" ? "Undid" : "Redid"}: ${result.action}. Reversal is recorded in the audit history.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${direction} the recent change.`);
    } finally {
      setBusy(false);
    }
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

  const uploadVisualGalleryMedia = async (file?: File) => {
    if (!file) return;
    setGalleryError("");
    setGalleryNotice("");
    if (file.size > 1_800_000) {
      setGalleryError("Visual gallery media files must be 1.8 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("media", file);
      const result = await apiRequest<{ media_url: string; media_type: "image" | "video" }>("/api/admin/visual-gallery/media", { method: "POST", body });
      setGalleryItemForm((current) => ({ ...current, mediaType: result.media_type, mediaUrl: result.media_url }));
      setGalleryNotice("Media uploaded. Complete its details and add it to the saved gallery draft.");
    } catch (cause) {
      setGalleryError(cause instanceof Error ? cause.message : "Gallery media upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveVisualGalleryDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGalleryError("");
    setGalleryNotice("");
    if (!visualGallery) return;
    setBusy(true);
    try {
      await apiRequest("/api/admin/visual-gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visualGallery.draft),
      });
      await refreshAdminData();
      setGalleryNotice("Gallery draft saved. Public media remains unchanged until an administrator publishes it.");
    } catch (cause) {
      setGalleryError(cause instanceof Error ? cause.message : "Gallery draft could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const publishVisualGallery = async () => {
    if (!visualGallery || !window.confirm("Publish the saved company media gallery? Review every media item and its description first.")) return;
    setGalleryError("");
    setGalleryNotice("");
    setBusy(true);
    try {
      await apiRequest("/api/admin/visual-gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visualGallery.draft),
      });
      await apiRequest("/api/admin/visual-gallery/publish", { method: "POST" });
      await refreshAdminData();
      setGalleryNotice("Company media gallery published and visible on the public website.");
    } catch (cause) {
      setGalleryError(cause instanceof Error ? cause.message : "Gallery could not be published.");
    } finally {
      setBusy(false);
    }
  };

  const addGalleryItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGalleryError("");
    if (!visualGallery) return;
    if (visualGallery.draft.items.length >= 24 && !galleryEditingId) {
      setGalleryError("The gallery can contain up to 24 media items.");
      return;
    }
    const updatedItem: VisualMediaItem = {
      ...galleryItemForm,
      id: galleryEditingId ?? crypto.randomUUID(),
      sortOrder: galleryEditingId
        ? visualGallery.draft.items.find((item) => item.id === galleryEditingId)?.sortOrder ?? 0
        : (visualGallery.draft.items.reduce((max, item) => Math.max(max, item.sortOrder), -10) + 10),
    };
    const items = galleryEditingId
      ? visualGallery.draft.items.map((item) => item.id === galleryEditingId ? updatedItem : item)
      : [...visualGallery.draft.items, updatedItem];
    setVisualGallery((current) => current ? { ...current, draft: { ...current.draft, items } } : current);
    setGalleryItemForm(emptyGalleryItem());
    setGalleryEditingId(null);
    setGalleryNotice("Item added to the unsaved draft. Save the gallery draft to record the change.");
  };

  const editGalleryItem = (item: VisualMediaItem) => {
    setGalleryEditingId(item.id);
    setGalleryItemForm({
      title: item.title,
      category: item.category,
      description: item.description,
      alt: item.alt,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
    });
    document.getElementById("gallery-item-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const moveGalleryItem = (id: string, direction: -1 | 1) => {
    if (!visualGallery) return;
    const items = [...visualGallery.draft.items].sort((left, right) => left.sortOrder - right.sortOrder);
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    const ordered = items.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex * 10 }));
    setVisualGallery((current) => current ? { ...current, draft: { ...current.draft, items: ordered } } : current);
  };

  const removeGalleryItem = (item: VisualMediaItem) => {
    if (!visualGallery || !window.confirm(`Remove "${item.title}" from the gallery draft? The uploaded file remains stored.`)) return;
    setVisualGallery((current) => current ? {
      ...current,
      draft: { ...current.draft, items: current.draft.items.filter((entry) => entry.id !== item.id) },
    } : current);
    if (galleryEditingId === item.id) {
      setGalleryEditingId(null);
      setGalleryItemForm(emptyGalleryItem());
    }
    setGalleryNotice("Item removed from the unsaved draft. Save the gallery draft to record the change.");
  };

  const uploadNewsMedia = async (file?: File) => {
    if (!file) return;
    setNewsMediaError("");
    setNewsMediaNotice("");
    if (file.size > 1_800_000) {
      setNewsMediaError("News & Media files must be 1.8 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("media", file);
      const result = await apiRequest<{ media_url: string; media_type: "image" | "video" }>("/api/admin/news-media/media", { method: "POST", body });
      setNewsMediaItemForm((current) => ({ ...current, mediaType: result.media_type, mediaUrl: result.media_url }));
      setNewsMediaNotice("Media uploaded. Complete the item details and add it to the saved draft.");
    } catch (cause) {
      setNewsMediaError(cause instanceof Error ? cause.message : "News media upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveNewsMediaDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsMediaError("");
    setNewsMediaNotice("");
    if (!newsMedia) return;
    setBusy(true);
    try {
      await apiRequest("/api/admin/news-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newsMedia.draft),
      });
      await refreshAdminData();
      setNewsMediaNotice("News & Media draft saved. Public content remains unchanged until an administrator publishes it.");
    } catch (cause) {
      setNewsMediaError(cause instanceof Error ? cause.message : "News & Media draft could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const publishNewsMedia = async () => {
    if (!newsMedia || !window.confirm("Publish the saved News & Media content? Review every title, date, and media description first.")) return;
    setNewsMediaError("");
    setNewsMediaNotice("");
    setBusy(true);
    try {
      await apiRequest("/api/admin/news-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newsMedia.draft),
      });
      await apiRequest("/api/admin/news-media/publish", { method: "POST" });
      await refreshAdminData();
      setNewsMediaNotice("News & Media content published on the public website.");
    } catch (cause) {
      setNewsMediaError(cause instanceof Error ? cause.message : "News & Media content could not be published.");
    } finally {
      setBusy(false);
    }
  };

  const addNewsMediaItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsMediaError("");
    if (!newsMedia) return;
    if (newsMedia.draft.items.length >= 30 && !newsMediaEditingId) {
      setNewsMediaError("News & Media can contain up to 30 items.");
      return;
    }
    const updatedItem: NewsMediaItem = {
      ...newsMediaItemForm,
      id: newsMediaEditingId ?? crypto.randomUUID(),
      sortOrder: newsMediaEditingId
        ? newsMedia.draft.items.find((item) => item.id === newsMediaEditingId)?.sortOrder ?? 0
        : newsMedia.draft.items.reduce((max, item) => Math.max(max, item.sortOrder), -10) + 10,
    };
    const items = newsMediaEditingId
      ? newsMedia.draft.items.map((item) => item.id === newsMediaEditingId ? updatedItem : item)
      : [...newsMedia.draft.items, updatedItem];
    setNewsMedia((current) => current ? { ...current, draft: { ...current.draft, items } } : current);
    setNewsMediaItemForm(emptyNewsMediaItem());
    setNewsMediaEditingId(null);
    setNewsMediaNotice("Item added to the unsaved draft. Save News & Media to record the change.");
  };

  const editNewsMediaItem = (item: NewsMediaItem) => {
    setNewsMediaEditingId(item.id);
    setNewsMediaItemForm({
      title: item.title,
      category: item.category,
      publishedAt: item.publishedAt,
      description: item.description,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      alt: item.alt,
    });
    document.getElementById("news-media-item-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const moveNewsMediaItem = (id: string, direction: -1 | 1) => {
    if (!newsMedia) return;
    const items = [...newsMedia.draft.items].sort((left, right) => left.sortOrder - right.sortOrder);
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    const ordered = items.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex * 10 }));
    setNewsMedia((current) => current ? { ...current, draft: { ...current.draft, items: ordered } } : current);
  };

  const removeNewsMediaItem = (item: NewsMediaItem) => {
    if (!newsMedia || !window.confirm(`Remove "${item.title}" from the News & Media draft? The uploaded file remains stored.`)) return;
    setNewsMedia((current) => current ? {
      ...current,
      draft: { ...current.draft, items: current.draft.items.filter((entry) => entry.id !== item.id) },
    } : current);
    if (newsMediaEditingId === item.id) {
      setNewsMediaEditingId(null);
      setNewsMediaItemForm(emptyNewsMediaItem());
    }
    setNewsMediaNotice("Item removed from the unsaved draft. Save News & Media to record the change.");
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><span className="leadership-kicker">CHALINZE STEEL MILLS LTD · SECURE WORKSPACE</span><h1>Website<br /><em>control room.</em></h1><p>Manage public content, media, leadership and access from one place.</p></div>
        <Link className="button button-outline" to="/leadership"><ArrowLeft size={15} /> Public leadership page</Link>
      </header>
      {!session && !error && <p className="leadership-load-state" role="status">Connecting to the administration service…</p>}
      {error && <p className="admin-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="admin-feedback" role="status">{notice}</p>}
      {session && !session.authenticated && (
        <section className="admin-login">
          <span className="leadership-kicker">AUTHORIZED ADMINISTRATORS ONLY</span>
          <h2>Sign in to manage leadership information.</h2>
          <form onSubmit={signIn}>
            <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="button button-orange" type="submit" disabled={busy || !session.configured}>Sign in <ArrowUpRight size={15} /></button>
          </form>
          {!session.configured && <div className="admin-setup-guide">
            <p>The first administrator is created automatically after you add a password secret. This secure setup prevents visitors from claiming the admin account.</p>
            <p>From the project folder, run this command in PowerShell and enter a strong password of at least 14 characters at Wrangler's prompt:</p>
            <pre><code>npx wrangler secret put ADMIN_PASSWORD</code></pre>
            <p>The administrator email is <strong>admin@chalinze.co.tz</strong>. The password is stored as a Cloudflare secret, not in this page or the website code.</p>
            <button className="button button-outline" type="button" onClick={() => void checkAdminSetup()} disabled={busy}>
              {busy ? "Checking…" : "Check setup"}
            </button>
          </div>}
        </section>
      )}
      {session?.authenticated && (session.passwordChangeRequired ? <section className="admin-login admin-password-rotation">
        <span className="leadership-kicker">SECURE YOUR ACCOUNT</span>
        <h2>Choose a new password to continue.</h2>
        <p>Your administrator gave you a one-time temporary password. Replace it now before accessing any dashboard features.</p>
        <form onSubmit={changePassword}>
          <label>New password<input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} minLength={14} maxLength={200} required /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={14} maxLength={200} required /></label>
          <small>Use 14–200 characters. Your new password is never shown to administrators.</small>
          <button className="button button-orange" type="submit" disabled={busy}><ShieldCheck size={15} /> {busy ? "Updating…" : "Set new password"}</button>
          <button className="admin-quiet-button" type="button" onClick={() => void signOut()} disabled={busy}><LogOut size={15} /> Sign out</button>
        </form>
      </section> : <>
        <div className="admin-toolbar"><p>Signed in as <strong>{session.email}</strong> · {session.role === "admin" ? "Administrator" : "Content editor"}. Changes are recorded.</p><div className="admin-toolbar-actions"><button className="admin-quiet-button" type="button" disabled={busy || session.role !== "admin" || !historyStatus.canUndo} title={historyStatus.undoLabel ?? "No recent changes to undo"} onClick={() => void applyUndoRedo("undo")}><Undo2 size={15} /> Undo</button><button className="admin-quiet-button" type="button" disabled={busy || session.role !== "admin" || !historyStatus.canRedo} title={historyStatus.redoLabel ?? "No changes to redo"} onClick={() => void applyUndoRedo("redo")}><Redo2 size={15} /> Redo</button><button className="admin-quiet-button" type="button" onClick={signOut}><LogOut size={15} /> Sign out</button></div></div>
        <section className="admin-dashboard-overview" id="dashboard-overview">
          <div className="admin-dashboard-intro"><div><span className="leadership-kicker">OPERATIONS OVERVIEW</span><h2>Everything in one view.</h2><p>Jump directly to a control area. Drafts are reviewed before administrators publish them live.</p></div><LayoutDashboard size={28} aria-hidden="true" /></div>
          <div className="admin-dashboard-metrics">
            <a href="#site-content"><span>Website content</span><strong>{Object.keys(siteConfig.pages).length} <small>pages</small></strong><small>Copy · navigation · design</small></a>
            <a href="#manufacturing-content"><span>Production story</span><strong>{manufacturingPreview?.stages.length ?? 6} <small>stages</small></strong><small>Technical content · media</small></a>
            <a href="#visual-gallery"><span>Media gallery</span><strong>{visualGallery?.draft.items.length ?? 0} <small>items</small></strong><small>Images · video · ordering</small></a>
            <a href="#news-media"><span>News & Media</span><strong>{newsMedia?.draft.items.length ?? 0} <small>items</small></strong><small>Updates · publishing</small></a>
            <a href="#leadership"><span>Leadership register</span><strong>{profiles.length} <small>profiles</small></strong><small>{profiles.filter((profile) => profile.status === "published").length} published</small></a>
            {session.role === "admin" && <a href="#user-management"><span>Access management</span><strong>{adminUsers.length} <small>{adminUsers.length === 1 ? "account" : "accounts"}</small></strong><small>Admins · content editors</small></a>}
          </div>
        </section>
        <nav className="admin-dashboard-nav" aria-label="Dashboard sections">
          <a href="#site-content">Website content</a><a href="#manufacturing-content">Manufacturing</a><a href="#visual-gallery">Media gallery</a><a href="#news-media">News & Media</a><a href="#leadership">Leadership</a>
          {session.role === "admin" && <><a href="#private-records">Private records</a><a href="#user-management">User access</a></>}
          <a href="#audit-history">Audit history</a>
        </nav>
        <section className="admin-review-callout"><strong>Publication review</strong><span>Profiles in Draft, Pending Approval or Archived are not visible publicly. Set a profile to Published only after the company has approved its name, position, portrait and biography.</span></section>
        {session.role === "admin" && <section className="admin-corporate-documents" id="private-records">
          <div className="admin-section-heading"><div><span className="leadership-kicker">RESTRICTED CORPORATE RECORDS</span><h2><ShieldCheck size={22} /> Private certificates</h2></div></div>
          <div className="admin-review-callout"><strong>Administrator-only</strong><span>Unredacted PDF files are stored in the private database and served only to signed-in administrators. Views and uploads are audited. This restricts server access but cannot prevent an authorized viewer from saving, photographing, or capturing the displayed document.</span></div>
          {corporateDocumentsError && <p className="admin-feedback is-error" role="alert">{corporateDocumentsError}</p>}
          <div className="corporate-document-admin-list">{corporateDocuments.map((document) => <article key={document.id}>
            <div><FileText size={18} /><div><strong>{document.label}</strong><small>{document.stored ? `Stored · ${Math.ceil((document.size_bytes ?? 0) / 1024)} KB` : "Not uploaded"}</small></div></div>
            <label className="admin-upload-button"><Upload size={15} /> {document.stored ? "Replace PDF" : "Upload PDF"}<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => { void uploadCorporateDocument(document.id, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
            {document.stored && <button className="button button-outline" type="button" disabled={busy} onClick={() => setSelectedCorporateDocument(document.id)}><Eye size={15} /> View securely</button>}
          </article>)}</div>
          {selectedCorporateDocument && corporateDocuments.some((document) => document.id === selectedCorporateDocument && document.stored) && <div className="corporate-document-viewer">
            <div><strong>{corporateDocuments.find((document) => document.id === selectedCorporateDocument)?.label}</strong><button className="admin-quiet-button" type="button" onClick={() => setSelectedCorporateDocument("")}>Close viewer</button></div>
            <iframe title="Private corporate certificate viewer" src={`/api/admin/corporate-documents/${encodeURIComponent(selectedCorporateDocument)}`} referrerPolicy="no-referrer" />
          </div>}
          <p className="corporate-document-security-note">PDFs can be viewed at their original resolution and zoomed in the browser. Do not share screenshots or copies outside approved company channels.</p>
        </section>}
        <section className="admin-site-editor" id="site-content">
          <div className="admin-section-heading"><div><span className="leadership-kicker">SITE-WIDE CONTENT MANAGEMENT</span><h2>Website content & design</h2></div></div>
          <div className="admin-review-callout"><strong>Draft & publish</strong><span>Edit home-page messaging, page copy, navigation, footer and visual presets here. Text is displayed as plain text; links accept internal paths or HTTPS URLs. Only administrators can publish changes. Undo/redo tracks site, manufacturing and leadership edits across the change history.</span></div>
          {siteConfigError && <p className="admin-feedback is-error" role="alert">{siteConfigError}</p>}
          {siteConfigNotice && <p className="admin-feedback" role="status">{siteConfigNotice}</p>}
          <div className="site-editor-tabs" role="tablist" aria-label="Site editor sections">
            {(["home", "pages", "navigation", "design"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={siteConfigTab === tab} className={siteConfigTab === tab ? "is-selected" : ""} onClick={() => setSiteConfigTab(tab)}>{({ home: "Home page", pages: "Pages", navigation: "Navigation & footer", design: "Global design" })[tab]}</button>)}
          </div>
          <form onSubmit={saveSiteConfig}>
            {siteConfigTab === "home" && <div className="site-editor-fields">
              <h3>Home-page introduction</h3>
              <label>Hero eyebrow<input value={siteConfig.home.heroEyebrow} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, heroEyebrow: event.target.value } }))} /></label>
              <label>Hero headline <small>Use a new line to control line breaks; the final line is accented.</small><textarea rows={3} value={siteConfig.home.heroHeadline} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, heroHeadline: event.target.value } }))} /></label>
              <label>Hero description<textarea rows={3} value={siteConfig.home.heroDescription} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, heroDescription: event.target.value } }))} /></label>
              <div className="site-editor-pair"><label>Primary action<input value={siteConfig.home.primaryAction} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, primaryAction: event.target.value } }))} /></label><label>Primary action path<input value={siteConfig.home.primaryPath} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, primaryPath: event.target.value } }))} /></label></div>
              <div className="site-editor-pair"><label>Secondary action<input value={siteConfig.home.secondaryAction} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, secondaryAction: event.target.value } }))} /></label><label>Secondary action path<input value={siteConfig.home.secondaryPath} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, secondaryPath: event.target.value } }))} /></label></div>
              <h3>Opportunity introduction</h3>
              <label>Section label<input value={siteConfig.home.introEyebrow} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, introEyebrow: event.target.value } }))} /></label>
              <label>Heading<textarea rows={2} value={siteConfig.home.introHeadline} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, introHeadline: event.target.value } }))} /></label>
              <label>Primary copy<textarea rows={3} value={siteConfig.home.introPrimary} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, introPrimary: event.target.value } }))} /></label>
              <label>Secondary copy<textarea rows={3} value={siteConfig.home.introSecondary} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, introSecondary: event.target.value } }))} /></label>
              <div className="site-editor-pair"><label>Company link label<input value={siteConfig.home.introAction} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, introAction: event.target.value } }))} /></label><label>Company link path<input value={siteConfig.home.introPath} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, introPath: event.target.value } }))} /></label></div>
              <h3>Brand story</h3>
              <label>Section label<input value={siteConfig.home.brandEyebrow} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandEyebrow: event.target.value } }))} /></label>
              <label>Brand marker<input value={siteConfig.home.brandLabel} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandLabel: event.target.value } }))} /></label>
              <label>Heading<textarea rows={2} value={siteConfig.home.brandHeadline} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandHeadline: event.target.value } }))} /></label>
              <label>Brand story copy<textarea rows={3} value={siteConfig.home.brandDescription} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandDescription: event.target.value } }))} /></label>
              <label>Brand caveat<textarea rows={3} value={siteConfig.home.brandCaveat} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandCaveat: event.target.value } }))} /></label>
              <div className="site-editor-pair"><label>Brand story link label<input value={siteConfig.home.brandAction} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandAction: event.target.value } }))} /></label><label>Brand story link path<input value={siteConfig.home.brandPath} onChange={(event) => updateSiteConfig((current) => ({ ...current, home: { ...current.home, brandPath: event.target.value } }))} /></label></div>
            </div>}
            {siteConfigTab === "pages" && <div className="site-editor-fields">
              <label>Select a page<select value={selectedPagePath} onChange={(event) => setSelectedPagePath(event.target.value)}>{Object.entries(siteConfig.pages).map(([pathname, page]) => <option key={pathname} value={pathname}>{page.eyebrow} · {pathname}</option>)}</select></label>
              {siteConfig.pages[selectedPagePath] && <div className="site-page-editor">
                <div className="site-editor-pair"><label>Page title<input value={siteConfig.pages[selectedPagePath].title} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], title: event.target.value } } }))} /></label><label>Eyebrow<input value={siteConfig.pages[selectedPagePath].eyebrow} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], eyebrow: event.target.value } } }))} /></label></div>
                <label>Page summary<textarea rows={3} value={siteConfig.pages[selectedPagePath].summary} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], summary: event.target.value } } }))} /></label>
                <label>Content layout preset<select value={siteConfig.pages[selectedPagePath].layout ?? siteConfig.layout} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], layout: event.target.value as SiteConfig["layout"] } } }))}>{availablePageLayouts.map((layout) => <option key={layout} value={layout}>{layout}</option>)}</select></label>
                <h3>Content sections</h3>
                {siteConfig.pages[selectedPagePath].sections.map((section, index) => <fieldset className="site-page-section" key={`${section.title}-${index}`}>
                  <div className="site-group-heading"><strong>Section {index + 1}</strong><button className="admin-quiet-button" type="button" onClick={() => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], sections: current.pages[selectedPagePath].sections.filter((_, sectionIndex) => sectionIndex !== index) } } }))}>Remove</button></div>
                  <label>Section heading<input value={section.title} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], sections: current.pages[selectedPagePath].sections.map((item, sectionIndex) => sectionIndex === index ? { ...item, title: event.target.value } : item) } } }))} /></label>
                  <label>Section copy<textarea rows={4} value={section.body} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], sections: current.pages[selectedPagePath].sections.map((item, sectionIndex) => sectionIndex === index ? { ...item, body: event.target.value } : item) } } }))} /></label>
                  <label>Optional source/status tag<input value={section.tag ?? ""} onChange={(event) => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], sections: current.pages[selectedPagePath].sections.map((item, sectionIndex) => sectionIndex === index ? { ...item, tag: event.target.value } : item) } } }))} /></label>
                </fieldset>)}
                <button className="button button-outline" type="button" onClick={() => updateSiteConfig((current) => ({ ...current, pages: { ...current.pages, [selectedPagePath]: { ...current.pages[selectedPagePath], sections: [...current.pages[selectedPagePath].sections, { title: "New section", body: "Add approved page content.", tag: "" }] } } }))}><Plus size={15} /> Add content section</button>
              </div>}
            </div>}
            {siteConfigTab === "navigation" && <div className="site-editor-fields">
              <h3>Header action</h3>
              <div className="site-editor-pair"><label>Action label<input value={siteConfig.headerAction.label} onChange={(event) => updateSiteConfig((current) => ({ ...current, headerAction: { ...current.headerAction, label: event.target.value } }))} /></label><label>Action path<input value={siteConfig.headerAction.path} onChange={(event) => updateSiteConfig((current) => ({ ...current, headerAction: { ...current.headerAction, path: event.target.value } }))} /></label></div>
              <h3>Main navigation groups</h3>
              <SiteGroupEditor groups={siteConfig.navigation} onChange={(navigation) => updateSiteConfig((current) => ({ ...current, navigation }))} />
              <h3>Footer</h3>
              <label>Footer description<textarea rows={2} value={siteConfig.footer.tagline} onChange={(event) => updateSiteConfig((current) => ({ ...current, footer: { ...current.footer, tagline: event.target.value } }))} /></label>
              <div className="site-editor-pair"><label>Contact email<input type="email" value={siteConfig.footer.email} onChange={(event) => updateSiteConfig((current) => ({ ...current, footer: { ...current.footer, email: event.target.value } }))} /></label><label>Contact phone<input value={siteConfig.footer.phone} onChange={(event) => updateSiteConfig((current) => ({ ...current, footer: { ...current.footer, phone: event.target.value } }))} /></label></div>
              <label>Footer note<input value={siteConfig.footer.copyrightNote} onChange={(event) => updateSiteConfig((current) => ({ ...current, footer: { ...current.footer, copyrightNote: event.target.value } }))} /></label>
              <h3>Footer link groups</h3>
              <SiteGroupEditor groups={siteConfig.footer.groups} onChange={(groups) => updateSiteConfig((current) => ({ ...current, footer: { ...current.footer, groups } }))} />
            </div>}
            {siteConfigTab === "design" && <div className="site-editor-fields site-design-fields">
              <label>Brand accent<input type="color" value={siteConfig.theme.accent} onChange={(event) => updateSiteConfig((current) => ({ ...current, theme: { ...current.theme, accent: event.target.value } }))} /></label>
              <label>Page background<input type="color" value={siteConfig.theme.background} onChange={(event) => updateSiteConfig((current) => ({ ...current, theme: { ...current.theme, background: event.target.value } }))} /></label>
              <label>Surface / card background<input type="color" value={siteConfig.theme.panel} onChange={(event) => updateSiteConfig((current) => ({ ...current, theme: { ...current.theme, panel: event.target.value } }))} /></label>
              <label>Heading typography<select value={siteConfig.theme.headingFont} onChange={(event) => updateSiteConfig((current) => ({ ...current, theme: { ...current.theme, headingFont: event.target.value } }))}>{["Manrope", "Inter", "Arial", "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "system-ui"].map((font) => <option key={font}>{font}</option>)}</select></label>
              <label>Body typography<select value={siteConfig.theme.bodyFont} onChange={(event) => updateSiteConfig((current) => ({ ...current, theme: { ...current.theme, bodyFont: event.target.value } }))}>{["Inter", "Manrope", "Arial", "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "system-ui"].map((font) => <option key={font}>{font}</option>)}</select></label>
              <label>Base body text size<select value={siteConfig.theme.bodyFontSize} onChange={(event) => updateSiteConfig((current) => ({ ...current, theme: { ...current.theme, bodyFontSize: Number(event.target.value) } }))}>{[14, 15, 16, 17, 18, 19, 20].map((size) => <option key={size} value={size}>{size}px{size === 15 ? " · default" : ""}</option>)}</select></label>
              <label>Default page layout<select value={siteConfig.layout} onChange={(event) => updateSiteConfig((current) => { const layout = event.target.value as SiteConfig["layout"]; return { ...current, layout, pages: Object.fromEntries(Object.entries(current.pages).map(([pathname, page]) => [pathname, { ...page, layout }])) }; })}>{availablePageLayouts.map((layout) => <option key={layout}>{layout}</option>)}</select></label>
            </div>}
            <div className="admin-form-actions"><button className="button button-orange" type="submit" disabled={busy}><Save size={15} /> Save site draft</button>{session.role === "admin" && <button className="button button-orange" type="button" disabled={busy} onClick={() => void publishSiteConfig()}><Send size={15} /> Publish site changes</button>}</div>
          </form>
        </section>
        <section className="admin-manufacturing" id="manufacturing-content">
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
              <small>JPEG, PNG, WebP, MP4 or WebM up to 1.8 MB. Upload only company-approved media.</small>
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
        <section className="admin-visual-gallery" id="visual-gallery">
          <div className="admin-section-heading"><div><span className="leadership-kicker">PUBLIC MEDIA LIBRARY</span><h2><Image size={22} /> Visual gallery</h2></div></div>
          <div className="admin-review-callout"><strong>Draft & approval</strong><span>Upload company-approved stills or short videos, add accessible descriptions and arrange their display order. Editors can prepare drafts; only administrators can publish them. Concept artwork on the gallery page is separately labeled and is not a facility photograph.</span></div>
          {galleryError && <p className="admin-feedback is-error" role="alert">{galleryError}</p>}
          {galleryNotice && <p className="admin-feedback" role="status">{galleryNotice}</p>}
          {!visualGallery ? <p className="leadership-load-state" role="status">Loading gallery draft…</p> : <>
            <div className="visual-gallery-admin-status"><span>Draft items <strong>{visualGallery.draft.items.length}</strong></span><span>Published items <strong>{visualGallery.published.items.length}</strong></span><span>Last updated by <strong>{visualGallery.updated_by}</strong></span></div>
            <form className="visual-gallery-item-form" id="gallery-item-editor" onSubmit={addGalleryItem}>
              <h3>{galleryEditingId ? "Edit gallery item" : "Add media item"}</h3>
              <label className="admin-upload-button"><Upload size={15} /> {galleryItemForm.mediaUrl ? "Replace uploaded media" : "Upload image or video"}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={(event) => { void uploadVisualGalleryMedia(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
              <small>JPEG, PNG, WebP, MP4 or WebM · 1.8 MB maximum. Upload company-approved media only.</small>
              {galleryItemForm.mediaUrl && <div className="visual-gallery-upload-preview">
                {galleryItemForm.mediaType === "image" ? <img src={galleryItemForm.mediaUrl} alt="Preview of uploaded gallery media" /> : <video src={galleryItemForm.mediaUrl} controls playsInline preload="metadata" aria-label="Uploaded gallery video preview" />}
                <span>{galleryItemForm.mediaType === "video" ? "VIDEO" : "IMAGE"} · {galleryItemForm.mediaUrl}</span>
              </div>}
              <div className="visual-gallery-item-fields">
                <label>Title<input value={galleryItemForm.title} onChange={(event) => setGalleryItemForm((current) => ({ ...current, title: event.target.value }))} maxLength={120} required /></label>
                <label>Category<input value={galleryItemForm.category} onChange={(event) => setGalleryItemForm((current) => ({ ...current, category: event.target.value }))} maxLength={80} placeholder="e.g. People, materials, project" required /></label>
                <label className="visual-gallery-item-description">Description<textarea rows={3} value={galleryItemForm.description} onChange={(event) => setGalleryItemForm((current) => ({ ...current, description: event.target.value }))} maxLength={1200} required /></label>
                <label>Accessible description<input value={galleryItemForm.alt} onChange={(event) => setGalleryItemForm((current) => ({ ...current, alt: event.target.value }))} maxLength={300} required /></label>
              </div>
              <div className="admin-form-actions"><button className="button button-outline" type="submit" disabled={busy || !galleryItemForm.mediaUrl}><Plus size={15} /> {galleryEditingId ? "Update draft item" : "Add to draft"}</button>{galleryEditingId && <button className="admin-quiet-button" type="button" onClick={() => { setGalleryEditingId(null); setGalleryItemForm(emptyGalleryItem()); }}>Cancel edit</button>}</div>
            </form>
            <div className="visual-gallery-admin-list">
              {[...visualGallery.draft.items].sort((left, right) => left.sortOrder - right.sortOrder).map((item, index, items) => <article className="visual-gallery-admin-card" key={item.id}>
                <div className="visual-gallery-admin-thumb">{item.mediaType === "image" ? <img src={item.mediaUrl} alt="" /> : <video src={item.mediaUrl} muted playsInline preload="metadata" aria-hidden="true" />}</div>
                <div className="visual-gallery-admin-copy"><span>{String(index + 1).padStart(2, "0")} · {item.category} · {item.mediaType}</span><strong>{item.title}</strong><p>{item.description}</p></div>
                <div className="visual-gallery-admin-actions">
                  <button className="admin-quiet-button" type="button" aria-label={`Move ${item.title} up`} title="Move up" disabled={index === 0} onClick={() => moveGalleryItem(item.id, -1)}><ArrowUp size={15} /></button>
                  <button className="admin-quiet-button" type="button" aria-label={`Move ${item.title} down`} title="Move down" disabled={index === items.length - 1} onClick={() => moveGalleryItem(item.id, 1)}><ArrowDown size={15} /></button>
                  <button className="admin-quiet-button" type="button" onClick={() => editGalleryItem(item)}>Edit</button>
                  <button className="admin-quiet-button delete-action" type="button" onClick={() => removeGalleryItem(item)}>Remove</button>
                </div>
              </article>)}
              {!visualGallery.draft.items.length && <p className="visual-gallery-admin-empty">No media in this draft yet. Upload approved company imagery or video to begin.</p>}
            </div>
            <form onSubmit={saveVisualGalleryDraft}>
              <div className="admin-form-actions"><button className="button button-orange" type="submit" disabled={busy}><Save size={15} /> Save gallery draft</button>{session.role === "admin" && <button className="button button-orange" type="button" onClick={() => void publishVisualGallery()} disabled={busy}><Send size={15} /> Publish gallery</button>}<Link className="button button-outline" to="/news#media" target="_blank"><Eye size={15} /> Preview News & media</Link></div>
            </form>
          </>}
        </section>
        <section className="admin-news-media" id="news-media">
          <div className="admin-section-heading"><div><span className="leadership-kicker">PUBLIC NEWSROOM</span><h2><Newspaper size={22} /> News & Media</h2></div></div>
          <div className="admin-review-callout"><strong>Editorial review</strong><span>Manage company updates and their optional images or videos. Dates are optional; leave them blank when no verified publication date is available. Editors save drafts; only administrators publish.</span></div>
          {newsMediaError && <p className="admin-feedback is-error" role="alert">{newsMediaError}</p>}
          {newsMediaNotice && <p className="admin-feedback" role="status">{newsMediaNotice}</p>}
          {!newsMedia ? <p className="leadership-load-state" role="status">Loading News & Media draft…</p> : <>
            <div className="visual-gallery-admin-status"><span>Draft items <strong>{newsMedia.draft.items.length}</strong></span><span>Published items <strong>{newsMedia.published.items.length}</strong></span><span>Last updated by <strong>{newsMedia.updated_by}</strong></span></div>
            <form className="visual-gallery-item-form news-media-item-form" id="news-media-item-editor" onSubmit={addNewsMediaItem}>
              <h3>{newsMediaEditingId ? "Edit newsroom item" : "Add newsroom item"}</h3>
              <label className="admin-upload-button"><Upload size={15} /> {newsMediaItemForm.mediaUrl ? "Replace uploaded media" : "Upload optional image or video"}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={(event) => { void uploadNewsMedia(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
              <small>JPEG, PNG, WebP, MP4 or WebM · 1.8 MB maximum. Only publish approved, accurately described content.</small>
              {newsMediaItemForm.mediaUrl && <div className="visual-gallery-upload-preview">
                {newsMediaItemForm.mediaType === "image" ? <img src={newsMediaItemForm.mediaUrl} alt="Preview of uploaded newsroom media" /> : <video src={newsMediaItemForm.mediaUrl} controls playsInline preload="metadata" aria-label="Uploaded newsroom video preview" />}
                <span>{newsMediaItemForm.mediaType === "video" ? "VIDEO" : "IMAGE"} · {newsMediaItemForm.mediaUrl}</span>
              </div>}
              <div className="visual-gallery-item-fields">
                <label>Title<input value={newsMediaItemForm.title} onChange={(event) => setNewsMediaItemForm((current) => ({ ...current, title: event.target.value }))} maxLength={160} required /></label>
                <label>Category<input value={newsMediaItemForm.category} onChange={(event) => setNewsMediaItemForm((current) => ({ ...current, category: event.target.value }))} maxLength={80} placeholder="e.g. Company update" required /></label>
                <label>Publication date (optional)<input type="date" value={newsMediaItemForm.publishedAt} onChange={(event) => setNewsMediaItemForm((current) => ({ ...current, publishedAt: event.target.value }))} /></label>
                <label className="visual-gallery-item-description">Update copy<textarea rows={4} value={newsMediaItemForm.description} onChange={(event) => setNewsMediaItemForm((current) => ({ ...current, description: event.target.value }))} maxLength={3000} required /></label>
                {newsMediaItemForm.mediaUrl && <label className="visual-gallery-item-description">Accessible media description<input value={newsMediaItemForm.alt} onChange={(event) => setNewsMediaItemForm((current) => ({ ...current, alt: event.target.value }))} maxLength={300} required /></label>}
              </div>
              <div className="admin-form-actions"><button className="button button-outline" type="submit" disabled={busy}><Plus size={15} /> {newsMediaEditingId ? "Update draft item" : "Add to draft"}</button>{newsMediaEditingId && <button className="admin-quiet-button" type="button" onClick={() => { setNewsMediaEditingId(null); setNewsMediaItemForm(emptyNewsMediaItem()); }}>Cancel edit</button>}</div>
            </form>
            <div className="visual-gallery-admin-list news-media-admin-list">
              {[...newsMedia.draft.items].sort((left, right) => left.sortOrder - right.sortOrder).map((item, index, items) => <article className="visual-gallery-admin-card" key={item.id}>
                <div className={`visual-gallery-admin-thumb${item.mediaUrl ? "" : " is-empty"}`}>{item.mediaUrl && (item.mediaType === "image" ? <img src={item.mediaUrl} alt="" /> : <video src={item.mediaUrl} muted playsInline preload="metadata" aria-hidden="true" />)}</div>
                <div className="visual-gallery-admin-copy"><span>{String(index + 1).padStart(2, "0")} · {item.category}{item.publishedAt ? ` · ${item.publishedAt}` : ""}</span><strong>{item.title}</strong><p>{item.description}</p></div>
                <div className="visual-gallery-admin-actions">
                  <button className="admin-quiet-button" type="button" aria-label={`Move ${item.title} up`} title="Move up" disabled={index === 0} onClick={() => moveNewsMediaItem(item.id, -1)}><ArrowUp size={15} /></button>
                  <button className="admin-quiet-button" type="button" aria-label={`Move ${item.title} down`} title="Move down" disabled={index === items.length - 1} onClick={() => moveNewsMediaItem(item.id, 1)}><ArrowDown size={15} /></button>
                  <button className="admin-quiet-button" type="button" onClick={() => editNewsMediaItem(item)}>Edit</button>
                  <button className="admin-quiet-button delete-action" type="button" onClick={() => removeNewsMediaItem(item)}>Remove</button>
                </div>
              </article>)}
              {!newsMedia.draft.items.length && <p className="visual-gallery-admin-empty">No newsroom items in this draft. Add a verified company update when ready.</p>}
            </div>
            <form onSubmit={saveNewsMediaDraft}>
              <div className="admin-form-actions"><button className="button button-orange" type="submit" disabled={busy}><Save size={15} /> Save News & Media draft</button>{session.role === "admin" && <button className="button button-orange" type="button" onClick={() => void publishNewsMedia()} disabled={busy}><Send size={15} /> Publish News & Media</button>}<Link className="button button-outline" to="/news" target="_blank"><Eye size={15} /> Preview News & Media</Link></div>
            </form>
          </>}
        </section>
        <section className="admin-profile-list" id="leadership">
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
              {form.photo_url && <img className="admin-portrait-preview" src={form.photo_url} alt={`Portrait preview for ${form.name || "this profile"}`} />}
              {form.photo_url && <button className="admin-quiet-button" type="button" onClick={() => setField("photo_url", "")}>Remove portrait</button>}
              <label className="admin-checkbox"><input type="checkbox" checked={form.is_vacant} onChange={(event) => setForm((current) => ({ ...current, is_vacant: event.target.checked, photo_url: event.target.checked ? "" : current.photo_url }))} /> Mark position as vacant</label>
              <small>JPEG, PNG or WebP · 1.8 MB maximum. Do not upload a portrait without company approval.</small>
            </div>
            <div className="admin-form-actions"><button className="button button-orange" type="submit" disabled={busy}><Save size={15} /> {busy ? "Saving…" : "Save profile"}</button>{editingId && <button className="button button-outline" type="button" onClick={() => { const profile = profiles.find((item) => item.id === editingId); if (profile) setPreview({ ...profile, ...form }); }}><Eye size={15} /> Preview</button>}</div>
          </form>
        </section>
        {session.role === "admin" && <section className="admin-user-management" id="user-management">
          <div className="admin-section-heading"><div><span className="leadership-kicker">ROLE-BASED ACCESS</span><h2><Users size={21} /> User management</h2></div></div>
          <p className="admin-user-intro">Create administrator or content editor accounts. New users must replace their one-time password before opening the dashboard. Share it through a trusted channel; it is shown only in this screen and is never retrievable later.</p>
          {accountError && <p className="admin-feedback is-error" role="alert">{accountError}</p>}
          {accountNotice && <p className="admin-feedback" role="status">{accountNotice}</p>}
          {temporaryPassword && <div className="admin-temporary-password"><strong>One-time password</strong><code>{temporaryPassword}</code><button className="admin-quiet-button" type="button" onClick={() => setTemporaryPassword("")}>Hide password</button></div>}
          <form className="admin-user-create" onSubmit={createAdminUser}>
            <label>New user email<input type="email" autoComplete="off" maxLength={254} value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} required /></label>
            <label>Account role<select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as "admin" | "editor")}><option value="editor">Content editor — prepare drafts</option><option value="admin">Administrator — full publishing and account access</option></select></label>
            <button className="button button-orange" type="submit" disabled={busy}><Plus size={15} /> Create account</button>
          </form>
          <div className="admin-user-list" aria-label="Existing accounts">
            {adminUsers.map((user) => <article key={user.id}><div><strong>{user.email}</strong><small>Added {new Date(user.created_at).toLocaleDateString()}</small></div><span className={`admin-role-badge role-${user.role}`}>{user.role === "admin" ? "Administrator" : "Content editor"}</span></article>)}
          </div>
        </section>}
        <section className="admin-audit" id="audit-history">
          <div className="admin-section-heading"><div><span className="leadership-kicker">ACCOUNTABILITY RECORD</span><h2>Profile change history</h2></div></div>
          {audit.length ? <div className="admin-audit-list">{audit.map((entry) => <details key={entry.id}><summary><span>{new Date(entry.created_at).toLocaleString()}</span><strong>{entry.action}</strong><span>{auditEntryLabel(entry)}</span><small>{entry.admin_email}</small></summary><pre>{JSON.stringify({ before: auditSnapshot(entry.before), after: auditSnapshot(entry.after) }, null, 2)}</pre></details>)}</div> : <p>No changes have been recorded yet.</p>}
        </section>
      </>)}
      {preview && <ProfileDetails key={preview.id} profile={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}
