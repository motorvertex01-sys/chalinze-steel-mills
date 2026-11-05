import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { contactDetails, departments, pages, type SitePage } from "./content";

export type SiteLink = { label: string; path: string };
export type SiteGroup = { label: string; links: SiteLink[] };
export type SiteConfig = {
  version: 1;
  theme: { accent: string; background: string; panel: string; headingFont: string; bodyFont: string };
  layout: "cards" | "editorial" | "split";
  home: {
    heroEyebrow: string; heroHeadline: string; heroDescription: string; primaryAction: string;
    primaryPath: string; secondaryAction: string; secondaryPath: string; introEyebrow: string;
    introHeadline: string; introPrimary: string; introSecondary: string; introAction: string; introPath: string;
    brandEyebrow: string; brandLabel: string; brandHeadline: string; brandDescription: string;
    brandCaveat: string; brandAction: string; brandPath: string;
  };
  headerAction: SiteLink;
  navigation: SiteGroup[];
  footer: { tagline: string; groups: SiteGroup[]; email: string; phone: string; copyrightNote: string };
  pages: Record<string, SitePage & { layout: "cards" | "editorial" | "split" }>;
};

const pageLayouts = ["cards", "editorial", "split"] as const;
const pageFromStatic = (page: SitePage): SiteConfig["pages"][string] => ({ ...page, sections: page.sections.map((section) => ({ ...section })), layout: "cards" });

export function createDefaultSiteConfig(): SiteConfig {
  return {
    version: 1,
    theme: { accent: "#f47721", background: "#090a0c", panel: "#111418", headingFont: "Manrope", bodyFont: "Arial" },
    layout: "cards",
    home: {
      heroEyebrow: "Planned integrated steel project · Vigwaza, Tanzania",
      heroHeadline: "A Tanzanian\nsteel future.",
      heroDescription: "Chalinze Steel Mills Ltd, a subsidiary of GYPSUM Plus Mines Ltd, is developing a proposed integrated iron ore-to-steel billet project.",
      primaryAction: "Explore the project", primaryPath: "/project",
      secondaryAction: "Investment & partnerships", secondaryPath: "/investment",
      introEyebrow: "01 — THE OPPORTUNITY",
      introHeadline: "From Tanzanian ore\nto planned steel billets.",
      introPrimary: "A proposed integrated project aims to connect iron-ore resources with billet manufacturing in Vigwaza, Chalinze District, Pwani Region.",
      introSecondary: "A proposed Phase 1 capacity of 1.0 MTPA appears in current planning material; an earlier project diagram states 1.2 MTPA. The approved capacity basis remains unresolved.",
      introAction: "Meet the company", introPath: "/company",
      brandEyebrow: "02 — THE APPROVED COMPANY MARK",
      brandLabel: "From Tanzanian minerals to steel billets",
      brandHeadline: "A mark of\ntransformation.",
      brandDescription: "The approved Chalinze Steel Mills Ltd artwork brings together Tanzanian mineral resources, beneficiation, steelmaking and billet production. Explore the official mark as a three-dimensional presentation.",
      brandCaveat: "The “low-carbon” wording is part of the approved brand artwork. It is not a measured emissions result or an independently verified product claim.",
      brandAction: "Explore the company", brandPath: "/company",
    },
    headerAction: { label: "Investor relations", path: "/investment" },
    navigation: [
      { label: "Overview", links: [{ label: "Overview", path: "/" }] },
      { label: "Company & project", links: [{ label: "Company", path: "/company" }, { label: "Leadership & Governance", path: "/leadership" }, { label: "Project overview", path: "/project" }, { label: "Development roadmap", path: "/development" }] },
      { label: "Manufacturing", links: departments[0].links.map(([label, path]) => ({ label, path })) },
      { label: "Products & markets", links: [{ label: "Products", path: "/products" }, { label: "Markets", path: "/markets" }] },
      { label: "Explore", links: departments.slice(1).flatMap((department) => department.links.map(([label, path]) => ({ label, path }))).filter((link) => !["/company", "/project", "/development", "/products", "/markets", "/contact"].includes(link.path)) },
      { label: "Contact", links: [{ label: "Contact", path: "/contact" }] },
    ],
    footer: {
      tagline: "A Tanzanian steel manufacturing company wholly owned by GYPSUM Plus Mines Ltd.",
      groups: [
        { label: "Explore", links: [{ label: "Company", path: "/company" }, { label: "Project", path: "/project" }, { label: "Technology", path: "/technology" }, { label: "Leadership & Governance", path: "/leadership" }, { label: "Administration", path: "/admin" }] },
        { label: "Discover", links: [{ label: "Products", path: "/products" }, { label: "Sustainability", path: "/sustainability" }, { label: "Markets", path: "/markets" }] },
        { label: "Connect", links: [{ label: "Partnerships", path: "/investment" }, { label: "Careers", path: "/careers" }, { label: "Contact", path: "/contact" }] },
      ],
      email: contactDetails.email, phone: contactDetails.phones[0], copyrightNote: "Tanzanian steel manufacturing company",
    },
    pages: Object.fromEntries(pages.filter((page) => !["/manufacturing", "/technology", "/quality"].includes(page.path)).map((page) => [page.path, pageFromStatic(page)])),
  };
}

export function mergeSiteConfig(value: Partial<SiteConfig> | null | undefined): SiteConfig {
  const defaults = createDefaultSiteConfig();
  if (!value) return defaults;
  return {
    ...defaults, ...value,
    theme: { ...defaults.theme, ...value.theme },
    home: { ...defaults.home, ...value.home },
    headerAction: { ...defaults.headerAction, ...value.headerAction },
    navigation: Array.isArray(value.navigation) && value.navigation.length ? value.navigation : defaults.navigation,
    footer: {
      ...defaults.footer, ...value.footer,
      tagline: value.footer?.tagline?.trim() ? value.footer.tagline : defaults.footer.tagline,
      groups: value.footer?.groups?.length ? value.footer.groups : defaults.footer.groups,
      email: value.footer?.email?.trim() ? value.footer.email : defaults.footer.email,
      phone: value.footer?.phone?.trim() ? value.footer.phone : defaults.footer.phone,
      copyrightNote: value.footer?.copyrightNote?.trim() ? value.footer.copyrightNote : defaults.footer.copyrightNote,
    },
    pages: Object.fromEntries(Object.entries(defaults.pages).map(([path, page]) => {
      const override = value.pages?.[path];
      return [path, override ? { ...page, ...override, sections: Array.isArray(override.sections) ? override.sections : page.sections } : page];
    })),
  } as SiteConfig;
}

export function siteConfigPathIsSafe(path: string) {
  if (path.startsWith("/") && !path.startsWith("//") && /^\/[a-zA-Z0-9_./#?=&%-]*$/.test(path)) {
    try {
      const decoded = decodeURIComponent(path);
      return !decoded.startsWith("//") && !decoded.includes("\\") && !/[\u0000-\u001f]/.test(decoded);
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(path);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const SiteConfigContext = createContext<SiteConfig>(createDefaultSiteConfig());

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState(createDefaultSiteConfig);
  useEffect(() => {
    let active = true;
    const refresh = () => fetch("/api/site-config").then((response) => response.ok ? response.json() : null)
      .then((value: Partial<SiteConfig> | null) => { if (active && value) setConfig(mergeSiteConfig(value)); })
      .catch(() => undefined);
    void refresh();
    window.addEventListener("site-config-updated", refresh);
    return () => { active = false; window.removeEventListener("site-config-updated", refresh); };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--orange", config.theme.accent);
    root.style.setProperty("--black", config.theme.background);
    root.style.setProperty("--panel", config.theme.panel);
    root.style.setProperty("--display", `"${config.theme.headingFont}", sans-serif`);
    root.style.setProperty("--body-font", `"${config.theme.bodyFont}", sans-serif`);
  }, [config.theme]);
  const value = useMemo(() => config, [config]);
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

export const availablePageLayouts = pageLayouts;
