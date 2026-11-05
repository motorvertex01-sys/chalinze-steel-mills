import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, MapPin, Menu, X } from "lucide-react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { contactDetails, enquiryTypes, faqs, pages, processStages, type SitePage } from "./content";
import { applicationGallery, manufacturingGallery } from "./galleryData";
import { ProcessGallery } from "./ProcessGallery";
import { LeadershipPage } from "./LeadershipPage";
import { AdminPage } from "./AdminPage";
import { ManufacturingExperience } from "./ManufacturingExperience";
import { useSiteConfig } from "./siteConfig";

const IndustrialScene = lazy(() => import("./IndustrialScene").then((module) => ({ default: module.IndustrialScene })));
const homeGallery = manufacturingGallery.filter((item) => item.category !== "Quality assurance");

function Scene({ kind, size }: { kind?: "billet" | "ore" | "process" | "logo"; size?: "130" | "150" }) {
  return <div className={`scene-holder scene-holder-${kind ?? "billet"}`}><Suspense fallback={<div className="scene-loading" role="status">Loading 3D preview…</div>}><IndustrialScene kind={kind} size={size} /></Suspense></div>;
}

function PageMetadata() {
  const { pathname } = useLocation();
  const config = useSiteConfig();
  useEffect(() => {
    const page = config.pages[pathname] ?? pages.find((candidate) => candidate.path === pathname);
    const title = pathname === "/manufacturing" || pathname === "/technology" ? "Integrated Manufacturing | Chalinze Steel Mills Ltd"
      : pathname === "/leadership" ? "Leadership & Governance | Chalinze Steel Mills Ltd"
      : pathname === "/admin" ? "Leadership Administration | Chalinze Steel Mills Ltd"
        : page ? `${page.eyebrow} | Chalinze Steel Mills Ltd` : "Chalinze Steel Mills Ltd | Engineering Tanzania’s Industrial Future";
    document.title = title;
    const description = pathname === "/manufacturing" || pathname === "/technology"
      ? "Explore the proposed integrated steel manufacturing journey from Tanzanian iron ore to quality-inspected steel billets."
      : pathname === "/leadership"
      ? "Meet the Board of Directors, Senior Management Team and Supporting Staff of Chalinze Steel Mills Ltd."
      : page?.summary ?? "Chalinze Steel Mills Ltd — developing an integrated steel manufacturing project in Tanzania.";
    const canonicalPath = pathname === "/technology" ? "/manufacturing" : pathname;
    const canonicalUrl = `https://chalinzesteelmills.co.tz${canonicalPath}`;
    const updateMeta = (selector: string, attributes: Record<string, string>, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
    updateMeta('meta[name="description"]', { name: "description" }, description);
    updateMeta('meta[property="og:title"]', { property: "og:title" }, title);
    updateMeta('meta[property="og:description"]', { property: "og:description" }, description);
    updateMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    updateMeta('meta[name="robots"]', { name: "robots" }, pathname === "/admin" ? "noindex, nofollow" : "index, follow");
  }, [pathname, config.pages]);
  return null;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(), 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState("");
  const location = useLocation();
  const config = useSiteConfig();

  const closeMenus = () => {
    setMobileOpen(false);
    setOpenGroup("");
  };

  const renderMenu = (group: (typeof config.navigation)[number]) => (
    <div className="nav-departments">
      <button type="button" className={`nav-link nav-menu-trigger ${openGroup === group.label ? "active" : ""}`} aria-expanded={openGroup === group.label} onClick={() => setOpenGroup((open) => open === group.label ? "" : group.label)}>
        {group.label} <span aria-hidden="true">⌄</span>
      </button>
      {openGroup === group.label && <div className="department-menu">
        <section>
          <h2>{group.label}</h2>
          {group.links.map(({ label, path }) => path.startsWith("/")
            ? <NavLink key={`${label}-${path}`} to={path} onClick={closeMenus}>{label}<ArrowUpRight size={13} aria-hidden="true" /></NavLink>
            : <a key={`${label}-${path}`} href={path} target="_blank" rel="noreferrer">{label}<ArrowUpRight size={13} aria-hidden="true" /></a>)}
        </section>
      </div>}
    </div>
  );

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" onClick={closeMenus} aria-label="Chalinze Steel Mills Ltd home">
          <img className="brand-emblem" src="/assets/brand/chalinze-emblem-approved.webp" alt="" />
          <span className="brand-copy"><strong>CHALINZE</strong><small>STEEL MILLS LTD</small></span>
        </Link>
        <nav className={`main-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Main navigation">
          {config.navigation.map((group) => group.links.length === 1 && group.links[0].path === "/" ? (
            <Link key={group.label} className={location.pathname === "/" ? "nav-link active" : "nav-link"} to="/" onClick={closeMenus}>{group.links[0].label}</Link>
          ) : group.links.length === 1 ? (
            group.links[0].path.startsWith("/")
              ? <NavLink key={group.label} className="nav-link" to={group.links[0].path} onClick={closeMenus}>{group.links[0].label}</NavLink>
              : <a key={group.label} className="nav-link" href={group.links[0].path} target="_blank" rel="noreferrer">{group.links[0].label}</a>
          ) : renderMenu(group))}
        </nav>
        <ConfigLink className="header-action" path={config.headerAction.path}>{config.headerAction.label} <ArrowUpRight size={14} /></ConfigLink>
        <button type="button" className="mobile-toggle" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  const config = useSiteConfig();
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <img className="footer-approved-logo" src="/assets/brand/chalinze-logo-approved.webp" alt="Approved Chalinze Steel Mills Ltd logo, showing the journey from Tanzanian minerals to low-carbon steel billets." />
        <div className="brand-copy"><strong>CHALINZE</strong><small>STEEL MILLS LTD</small></div>
        <p>{config.footer.tagline}</p>
      </div>
      {config.footer.groups.map((group, index) => <div key={group.label}><h2>{group.label}</h2>{group.links.map(({ label, path }) => <ConfigLink key={`${label}-${path}`} path={path}>{label}</ConfigLink>)}{index === config.footer.groups.length - 1 && <><a href={`mailto:${config.footer.email}`}>{config.footer.email}</a><a href={`tel:${config.footer.phone.replace(/[^\d+]/g, "")}`}>{config.footer.phone}</a></>}</div>)}
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Chalinze Steel Mills Ltd</span><span>{config.footer.copyrightNote}</span></div>
  </footer>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow"><i aria-hidden="true" />{children}</span>;
}

function ConfigLink({ path, className, children }: { path: string; className?: string; children: React.ReactNode }) {
  return path.startsWith("/") ? <Link className={className} to={path}>{children}</Link> : <a className={className} href={path} target="_blank" rel="noreferrer">{children}</a>;
}

const billetSizes = [
  { width: 130, height: 130, label: "130 × 130 mm", size: "130" as const },
  { width: 150, height: 150, label: "150 × 150 mm", size: "150" as const },
];

function BilletDimensions({ size }: { size: number }) {
  const drawingSize = size === 130 ? 104 : 120;
  const center = 155;
  const start = center - drawingSize / 2;
  const end = center + drawingSize / 2;
  const measurement = `${size} mm`;

  return (
    <figure className="billet-dimensions">
      <svg viewBox="0 0 310 310" role="img" aria-labelledby="dimension-title dimension-description">
        <title id="dimension-title">{measurement} by {measurement} billet cross-section</title>
        <desc id="dimension-description">Square billet cross-section with width and height each measuring {measurement}.</desc>
        <defs>
          <linearGradient id="billet-face" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#d0d5d8" />
            <stop offset=".48" stopColor="#727b83" />
            <stop offset="1" stopColor="#c0c5c8" />
          </linearGradient>
          <marker id="dimension-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#f47721" />
          </marker>
        </defs>
        <line x1={start} y1="45" x2={end} y2="45" stroke="#f47721" strokeWidth="1.5" markerStart="url(#dimension-arrow)" markerEnd="url(#dimension-arrow)" />
        <line x1={start} y1="51" x2={start} y2={start - 4} stroke="#f47721" strokeWidth="1" />
        <line x1={end} y1="51" x2={end} y2={start - 4} stroke="#f47721" strokeWidth="1" />
        <text x={center} y="32" textAnchor="middle" className="dimension-svg-label">WIDTH · {measurement}</text>
        <rect x={start} y={start} width={drawingSize} height={drawingSize} rx="3" fill="url(#billet-face)" stroke="#eff1f0" strokeOpacity=".7" />
        <path d={`M ${start + 13} ${start + 18} L ${start + 13} ${end - 18}`} stroke="#ffffff" strokeOpacity=".17" strokeWidth="2" />
        <line x1="254" y1={start} x2="254" y2={end} stroke="#f47721" strokeWidth="1.5" markerStart="url(#dimension-arrow)" markerEnd="url(#dimension-arrow)" />
        <line x1={end + 4} y1={start} x2="249" y2={start} stroke="#f47721" strokeWidth="1" />
        <line x1={end + 4} y1={end} x2="249" y2={end} stroke="#f47721" strokeWidth="1" />
        <text x="273" y={center} textAnchor="middle" transform={`rotate(90 273 ${center})`} className="dimension-svg-label">HEIGHT · {measurement}</text>
      </svg>
      <figcaption>Square cross-section · dimensions shown to scale</figcaption>
    </figure>
  );
}

function Home() {
  const [stage, setStage] = useState(0);
  const { home } = useSiteConfig();
  const process = [
    { name: "Iron ore mining", kind: "ore" as const, label: "01 / MINE", detail: "Tanzanian run-of-mine iron ore is identified as the planned feedstock; mine rights, reserves and supply are not confirmed." },
    { name: "Beneficiation", kind: "process" as const, label: "02 / PREPARE", detail: "Ore processing and feed preparation are planned; equipment, recovery and concentrate grade are not specified." },
    { name: "Ironmaking", kind: "process" as const, label: "03 / PRODUCE IRON", detail: "Ironmaking is part of the project concept, but the source material describes conflicting technology routes." },
    { name: "Steelmaking", kind: "process" as const, label: "04 / MAKE STEEL", detail: "Electric Arc Furnace steelmaking is described as a planned stage; final design and operating status are unconfirmed." },
    { name: "Billet casting", kind: "billet" as const, label: "05 / CAST", detail: "Continuous casting is planned to produce steel billets, the project's principal identified product." },
  ];

  return <main className="home-page">
    <section className="hero">
      <div className="hero-image-grid" aria-hidden="true" />
      <div className="hero-copy">
        <Pill>{home.heroEyebrow}</Pill>
        <h1>{home.heroHeadline.split("\n").map((line, index, lines) => <span key={`${line}-${index}`}>{index === lines.length - 1 ? <em>{line}</em> : line}{index < lines.length - 1 && <br />}</span>)}</h1>
        <p className="hero-lede">{home.heroDescription}</p>
        <div className="hero-actions"><ConfigLink className="button button-orange" path={home.primaryPath}>{home.primaryAction} <ArrowRight size={17} /></ConfigLink><ConfigLink className="text-link" path={home.secondaryPath}>{home.secondaryAction} <ArrowUpRight size={15} /></ConfigLink></div>
        <div className="hero-meta"><span><b>01</b> TANZANIA</span><span><b>02</b> VIGWAZA</span><span><b>03</b> STEEL BILLETS</span></div>
      </div>
      <div className="hero-object"><Scene kind="ore" /><div className="scene-caption"><span>RAW MATERIAL / CONCEPT</span><span>ROTATE TO EXPLORE ↗</span></div></div>
      <a className="scroll-cue" href="#journey"><span>Scroll to discover</span><ArrowDown size={16} /></a>
      <span className="hero-index">DARAJA / 01</span>
    </section>

    <section className="intro-section section-pad">
      <div className="section-index">{home.introEyebrow}</div>
      <div className="intro-grid">
        <h2 className="multiline-heading">{home.introHeadline.split("\n").map((line, index, lines) => <span key={`${line}-${index}`}>{index === lines.length - 1 ? <em>{line}</em> : line}{index < lines.length - 1 && <br />}</span>)}</h2>
        <div><p className="large-copy">{home.introPrimary}</p><p className="muted-copy">{home.introSecondary}</p><ConfigLink className="text-link" path={home.introPath}>{home.introAction} <ArrowUpRight size={15} /></ConfigLink></div>
      </div>
      <div className="facts-strip"><div><span>PROPOSED CAPACITY</span><strong>1.0 MTPA</strong><small>Phase 1 · earlier source figure differs</small></div><div><span>PROJECT LOCATION</span><strong>Vigwaza</strong><small>Chalinze District, Pwani</small></div><div><span>VALUE CHAIN</span><strong>Ore → billets</strong><small>Five planned stages</small></div><div><span>PROJECT STATUS</span><strong>In development</strong><small>Not yet operational</small></div></div>
    </section>

    <section className="brand-story">
      <div className="brand-story-copy">
        <div className="section-index">{home.brandEyebrow}</div>
        <Pill>{home.brandLabel}</Pill>
        <h2 className="multiline-heading">{home.brandHeadline.split("\n").map((line, index, lines) => <span key={`${line}-${index}`}>{index === lines.length - 1 ? <em>{line}</em> : line}{index < lines.length - 1 && <br />}</span>)}</h2>
        <p>{home.brandDescription}</p>
        <p className="brand-caveat">{home.brandCaveat}</p>
        <ConfigLink className="text-link" path={home.brandPath}>{home.brandAction} <ArrowUpRight size={15} /></ConfigLink>
      </div>
      <div className="brand-story-object">
        <Scene kind="logo" />
        <span className="brand-scene-caption">APPROVED ARTWORK / INTERACTIVE 3D PRESENTATION</span>
      </div>
    </section>

    <section className="journey-section section-pad" id="journey">
      <div className="section-index">03 — MATERIAL JOURNEY</div>
      <div className="journey-heading"><div><Pill>From resource to material</Pill><h2>One connected<br /><em>transformation.</em></h2></div><p>Five planned stages connect mineral extraction to steel billets. The ironmaking route and final plant design remain unconfirmed.</p></div>
      <div className="journey-layout">
        <div className="stage-list" role="tablist" aria-label="Material journey stages">
          {process.map((item, index) => <button key={item.name} role="tab" aria-selected={stage === index} className={`stage-item ${stage === index ? "selected" : ""}`} onClick={() => setStage(index)}><span>{item.label}</span><strong>{item.name}</strong><ArrowUpRight size={16} /></button>)}
          <p className="concept-disclaimer">Conceptual visualizations only. They do not depict the actual facility, approved equipment or final production route.</p>
        </div>
        <div className="journey-viewer"><Scene kind={process[stage].kind} /><div className="viewer-label"><span>{process[stage].label}</span><p>{process[stage].detail}</p></div></div>
      </div>
    </section>

    <section className="product-feature">
      <div className="product-copy"><div className="section-index">04 — PLANNED BILLET SIZES</div><Pill>Products / planned</Pill><h2>Designed for<br /><em>what’s ahead.</em></h2><p>Steel billets are the principal planned product. Two cross-section sizes are identified in the development brief; detailed specifications remain to be confirmed.</p><div className="sizes"><span>130 × 130 <small>MM</small></span><span>150 × 150 <small>MM</small></span></div><Link className="button button-outline" to="/products">Explore steel billets <ArrowRight size={16} /></Link><small className="fine-print">No grade, chemistry, tolerance or production availability is claimed.</small></div>
      <div className="product-model"><Scene kind="billet" /><div className="model-dimension dimension-width">130 / 150 mm</div><div className="model-dimension dimension-length">BILLET / CONCEPT</div></div>
    </section>

    <section className="home-gallery-section section-pad">
      <div className="section-index">05 — MATERIALS & PRODUCTS</div>
      <div className="gallery-heading"><div><Pill>Project imagery</Pill><h2>From ore to<br /><em>billet.</em></h2></div><p>Explore raw-material, proposed process and billet visuals. Concept artwork and supplied example photographs are illustrative, not evidence of current Chalinze production.</p></div>
      <ProcessGallery items={homeGallery} title="Illustrative raw materials, manufacturing stages and steel billet gallery" />
    </section>

    <section className="principles-section section-pad">
      <div className="section-index">06 — BUILT FOR THE LONG VIEW</div><div className="principles-heading"><h2>Progress with<br /><em>purpose.</em></h2><p>Growth that lasts is built on considered engineering, responsible development and open communication.</p></div>
      <div className="principle-grid"><article><span>01</span><h3>Engineering ambition</h3><p>Integrated project thinking across materials, process and infrastructure.</p><Link to="/technology" aria-label="Explore engineering ambition">Explore technology <ArrowUpRight size={14} /></Link></article><article><span>02</span><h3>Responsible development</h3><p>Plans and measured performance should be clearly distinguished.</p><Link to="/sustainability" aria-label="Explore responsible development">Our approach <ArrowUpRight size={14} /></Link></article><article><span>03</span><h3>Regional connection</h3><p>Intended markets and partnerships, presented without overstating commitments.</p><Link to="/markets" aria-label="Explore regional connection">Explore markets <ArrowUpRight size={14} /></Link></article></div>
    </section>
    <section className="closing-cta"><div><Pill>Begin a conversation</Pill><h2>Let’s build<br /><em>what’s next.</em></h2></div><Link className="button button-orange" to="/contact">Business enquiries <ArrowUpRight size={16} /></Link><small>Contact details are transcribed from the supplied company document; verify before relying on them.</small></section>
  </main>;
}

function ContactDirectory() {
  const whatsappNumber = contactDetails.whatsapp.replace(/[^\d]/g, "");
  const locations = [
    {
      id: "office",
      label: "DAR ES SALAAM · CORPORATE CONTACT OFFICE",
      title: "Exchange Tower",
      detail: "Corporate contact location. The supplied company document gives differing office address details; confirm the address before an in-person visit.",
      embedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=39.235%2C-6.805%2C39.295%2C-6.755&layer=mapnik&marker=-6.776874%2C39.263274#map=14/-6.776874/39.263274",
      directionsUrl: contactDetails.officeMap,
    },
    {
      id: "project",
      label: "VIGWAZA · PLANNED PROJECT LOCATION",
      title: "Chalinze project site",
      detail: "Planned manufacturing project location, separate from the Dar es Salaam office. This map pin does not imply that the plant is operational.",
      embedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=38.390%2C-6.855%2C38.452%2C-6.795&layer=mapnik&marker=-6.825773%2C38.420857#map=14/-6.825773/38.420857",
      directionsUrl: contactDetails.siteMap,
    },
  ] as const;

  return <section className="contact-directory section-pad">
    <div className="section-index">DIRECT CONTACT DETAILS · COMPANY SOURCE</div>
    <div className="contact-directory-heading"><div><Pill>Chalinze Steel Mills Ltd</Pill><h2>Reach the<br /><em>right team.</em></h2></div><p>{contactDetails.sourceNote}</p></div>
    <div className="contact-directory-grid">
      <article className="contact-card contact-card-main">
        <span className="card-tag">CORPORATE OFFICE · DAR ES SALAAM</span>
        <h3>Office & postal address</h3>
        <address>{contactDetails.officeAddress.map((line) => <span key={line}>{line}</span>)}</address>
        <a className="text-link" href={contactDetails.officeMap} target="_blank" rel="noreferrer">Open office map <ArrowUpRight size={15} /></a>
        <p className="contact-warning">{contactDetails.addressVariant}</p>
        <small>{contactDetails.officeHours}</small>
      </article>
      <article className="contact-card">
        <span className="card-tag">PHONE & MESSAGING</span>
        <h3>Speak with the company</h3>
        <ul className="contact-link-list">{contactDetails.phones.map((phone) => <li key={phone}><a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></li>)}</ul>
        <a className="contact-highlight" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp · {contactDetails.whatsapp} <ArrowUpRight size={15} /></a>
      </article>
      <article className="contact-card">
        <span className="card-tag">EMAIL & WEB</span>
        <h3>Write to us</h3>
        <a className="contact-highlight" href={`mailto:${contactDetails.email}`}>{contactDetails.email} <ArrowUpRight size={15} /></a>
        <a className="contact-highlight" href={contactDetails.website} target="_blank" rel="noreferrer">{contactDetails.website.replace(/^https?:\/\//, "")} <ArrowUpRight size={15} /></a>
        <p>Direct contact opens your email app or phone dialler. This website does not collect or store enquiry form submissions.</p>
      </article>
      <article className="contact-card contact-card-site">
        <span className="card-tag">PLANNED PROJECT LOCATION · NOT THE OFFICE</span>
        <h3>Vigwaza project site</h3>
        <p>{contactDetails.siteAddress}</p>
        <a className="text-link" href={contactDetails.siteMap} target="_blank" rel="noreferrer">Open project map pin <ArrowUpRight size={15} /></a>
        <p className="contact-warning">This is a planned project location, not the corporate office. The exact site address was not supplied.</p>
      </article>
    </div>
    <div className="contact-verification-note"><strong>Contact information</strong><span>Contact details are transcribed from company material. The source lists two office-address variants; the planned project site is shown separately from the Dar es Salaam contact office.</span></div>
    <section className="corporate-documents" aria-labelledby="corporate-documents-title">
      <div className="corporate-documents-heading">
        <div><span className="card-tag">PARENT COMPANY REGISTRATION</span><h2 id="corporate-documents-title">Group credentials.</h2></div>
        <p>Public viewing copies of the supplied Tanzania Revenue Authority certificates issued to Gypsum Plus Mines Limited. Tax identifiers and signatures are redacted.</p>
      </div>
      <div className="corporate-documents-grid">
        <article className="corporate-document-card">
          <span className="card-tag">TAXPAYER REGISTRATION</span>
          <h3>Taxpayer Identification Certificate</h3>
          <p>Issued to Gypsum Plus Mines Limited by the Tanzania Revenue Authority.</p>
          <a className="text-link" href="/assets/corporate/taxpayer-registration-public.pdf" target="_blank" rel="noreferrer">View public certificate <ArrowUpRight size={15} /></a>
        </article>
        <article className="corporate-document-card">
          <span className="card-tag">VALUE ADDED TAX</span>
          <h3>VAT Registration Certificate</h3>
          <p>Issued to Gypsum Plus Mines Limited by the Tanzania Revenue Authority.</p>
          <a className="text-link" href="/assets/corporate/vat-registration-public.pdf" target="_blank" rel="noreferrer">View public certificate <ArrowUpRight size={15} /></a>
        </article>
      </div>
    </section>
    <section className="location-experience" aria-labelledby="location-experience-title">
      <div className="location-experience-intro">
        <figure className="location-art">
          <img src="/assets/company/illustrative-mine-site.webp" alt="Illustrative mine-site scene; not a verified photograph of the Chalinze Steel Mills project site." loading="lazy" />
          <figcaption><span>ILLUSTRATIVE MINING SCENE</span><span>NOT A VERIFIED CHALINZE SITE PHOTOGRAPH</span></figcaption>
        </figure>
        <div className="location-experience-copy">
          <span className="card-tag">TANZANIA · LOCATION GUIDE</span>
          <h2 id="location-experience-title">Two locations.<br /><em>One company.</em></h2>
          <p>Explore the company contact office and the separately identified planned manufacturing location. Each map is interactive and includes directions.</p>
        </div>
      </div>
      <div className="location-map-grid">
        {locations.map((location) => <article className="location-map-card" key={location.id}>
          <div className="location-map-heading"><span className="card-tag">{location.label}</span><h3><MapPin size={16} aria-hidden="true" />{location.title}</h3></div>
          <div className="location-map-stage">
            <iframe src={location.embedUrl} title={`Interactive map: ${location.title}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="location-map-actions"><span>Interactive 3D-style map · OpenStreetMap</span><a className="text-link" href={location.directionsUrl} target="_blank" rel="noreferrer">Open directions <ArrowUpRight size={14} /></a></div>
          <p>{location.detail}</p>
        </article>)}
      </div>
    </section>
    <div className="enquiry-options"><h3>Choose an email enquiry</h3><div>{enquiryTypes.map((enquiry) => <a key={enquiry.subject} href={`mailto:${contactDetails.email}?subject=${encodeURIComponent(enquiry.subject)}`}>{enquiry.label}<ArrowUpRight size={14} /></a>)}</div></div>
  </section>;
}

function FAQList() {
  return <section className="faq-section section-pad">
    <div className="section-index">CUSTOMER & PROJECT QUESTIONS</div>
    <div className="faq-heading"><h2>Answers with<br /><em>context.</em></h2><p>These answers summarize the supplied company document. Where the source is incomplete or conflicting, the uncertainty is stated rather than guessed.</p></div>
    <div className="faq-list">{faqs.map((faq, index) => <details className="faq-item" key={faq.question}><summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{faq.question}</strong><i aria-hidden="true">+</i></summary><p>{faq.answer}</p></details>)}</div>
  </section>;
}

function ContentPage({ page }: { page: SitePage }) {
  const [selected, setSelected] = useState(0);
  const config = useSiteConfig();
  page = config.pages[page.path] ?? page;
  const product = page.path === "/products";
  const technology = page.path === "/technology";
  const company = page.path === "/company";
  const manufacturing = page.path === "/manufacturing";
  const markets = page.path === "/markets";
  const faqsPage = page.path === "/faqs";
  const selectedBillet = billetSizes[selected];
  const sceneKind = company ? "logo" : product ? "billet" : technology ? processStages[selected]?.kind ?? "ore" : manufacturing ? "ore" : "process";

  return <main className={`content-page page-layout-${"layout" in page ? page.layout : config.layout}`}>
    <section className="inner-hero"><div className="inner-hero-copy"><Pill>{page.eyebrow}</Pill><h1>{page.title}</h1><p>{page.summary}</p><div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><span>{page.eyebrow}</span></div></div><div className="inner-hero-visual"><Scene kind={sceneKind} size={product ? selectedBillet.size : undefined} /><span className="concept-stamp">{company ? "APPROVED BRAND / 3D PRESENTATION" : "CONCEPT VISUALIZATION"}</span></div></section>
    {(technology || manufacturing) && <section className="explorer-section section-pad"><div className="section-index">INTERACTIVE PROCESS EXPLORER</div><h2>Follow the <em>transformation.</em></h2><div className="explorer-layout"><div className="explorer-tabs" role="tablist" aria-label="Process stages">{processStages.map((stage, index) => <button role="tab" aria-selected={selected === index} className={selected === index ? "selected" : ""} onClick={() => setSelected(index)} key={stage.title}><span>{String(index + 1).padStart(2, "0")}</span>{stage.title}<ArrowRight size={15} /></button>)}</div><div className="explorer-model"><Scene kind={processStages[selected]?.kind ?? "ore"} /><div className="process-stage-detail" aria-live="polite"><span>{String(selected + 1).padStart(2, "0")} / {processStages[selected].status}</span><h3>{processStages[selected].title}</h3><p>{processStages[selected].description}</p><dl className="process-data"><div><dt>Input</dt><dd>{processStages[selected].input}</dd></div><div><dt>Output</dt><dd>{processStages[selected].output}</dd></div><div><dt>Equipment & status</dt><dd>{processStages[selected].equipment}</dd></div></dl></div><p className="concept-disclaimer">Concept models illustrate process categories only; they are not the approved equipment selection or final plant configuration.</p></div></div></section>}
    {product && <section className="product-select section-pad">
      <div className="product-selector-copy">
        <div className="section-index">PRODUCT SIZE SELECTOR</div>
        <h2>Choose your <em>billet.</em></h2>
        <p>Select one of the two planned cross-sections. The interactive 3D billet updates to match your choice.</p>
        <div className="product-tabs" role="tablist" aria-label="Choose billet cross-section">
          {billetSizes.map((billet, index) => <button key={billet.size} role="tab" aria-selected={selected === index} className={selected === index ? "selected" : ""} onClick={() => setSelected(index)}>
            <span>{billet.label}</span><small>Width {billet.width} mm · Height {billet.height} mm</small>
          </button>)}
        </div>
        <div className="selected-dimensions" aria-live="polite">
          <span>SELECTED CROSS-SECTION</span>
          <strong>{selectedBillet.width} × {selectedBillet.height} <small>mm</small></strong>
          <p>Width: {selectedBillet.width} mm <i /> Height: {selectedBillet.height} mm</p>
        </div>
        <p className="length-disclaimer">Billet length is not specified in the available company information. The 3D model’s length is illustrative and not a product specification.</p>
      </div>
      <div className="product-preview">
        <div className="product-select-view"><Scene kind="billet" size={selectedBillet.size} /><span className="measure-label">INTERACTIVE 3D · DRAG TO ROTATE</span></div>
        <BilletDimensions size={selectedBillet.width} />
      </div>
    </section>}
    <section className="content-cards section-pad"><div className="section-index">DETAILS & STATUS</div><div className={`content-grid layout-${"layout" in page ? page.layout : config.layout}`}>{page.sections.map((section, index) => <article className="content-card" key={`${section.title}-${index}`}><span className="card-number">0{index + 1}</span><span className="card-tag">{section.tag ?? "Company information"}</span><h2>{section.title}</h2><p>{section.body}</p></article>)}</div></section>
    {manufacturing && <section className="gallery-section section-pad"><div className="section-index">PROCESS & PRODUCT VISUALS</div><div className="gallery-heading"><h2>From raw material<br /><em>to billet.</em></h2><p>Explore each planned stage. The supplied document’s billet photographs are included as illustrative source-document images; they are not verified as Chalinze production photographs.</p></div><ProcessGallery items={manufacturingGallery} title="Manufacturing process and billet gallery" /></section>}
    {markets && <section className="gallery-section section-pad"><div className="section-index">APPLICATIONS & CUSTOMER SEGMENTS</div><div className="gallery-heading"><h2>Steel for a<br /><em>growing economy.</em></h2><p>Potential downstream applications from the company document. These examples do not assert existing customer relationships or direct Chalinze production of finished steel items.</p></div><ProcessGallery items={applicationGallery} title="Markets and applications gallery" /></section>}
    {page.path === "/quality" && <section className="gallery-section section-pad"><div className="section-index">PLANNED QUALITY ACTIVITIES</div><ProcessGallery items={manufacturingGallery.filter((item) => item.category === "Quality assurance")} title="Quality assurance illustration" /></section>}
    {faqsPage && <FAQList />}
    {page.path === "/contact" && <ContactDirectory />}
    <section className="page-end-cta"><span>CONTINUE EXPLORING</span><Link to={page.path === "/products" ? "/technology" : "/contact"}>{page.path === "/products" ? "Discover the process" : "Get in touch"}<ArrowUpRight size={17} /></Link></section>
  </main>;
}

function NotFound() {
  return <main className="not-found"><Pill>404 / Not found</Pill><h1>This page is<br /><em>not here.</em></h1><Link className="button button-orange" to="/">Return to overview <ArrowRight size={16} /></Link></main>;
}

function ScrollMotion() {
  const { pathname } = useLocation();
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        progressRef.current?.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, progress))));
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const main = document.querySelector("main");
    if (!main) return;

    const selector = [
      "main > section:not(.hero):not(.inner-hero):not(.leadership-hero):not(.manufacturing-hero)",
      "main .section-pad",
      ".leader-card",
      ".gallery-card",
      ".content-card",
      ".principle-card",
      ".contact-card",
      ".corporate-document-card",
      ".location-map-card",
      ".faq-item",
      ".page-end-cta",
    ].join(",");
    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-scroll-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    const observeTargets = () => {
      main.querySelectorAll<HTMLElement>(selector).forEach((target, index) => {
        if (observed.has(target)) return;
        observed.add(target);
        target.style.setProperty("--scroll-reveal-delay", `${(index % 4) * 70}ms`);
        target.classList.add("scroll-reveal");
        observer.observe(target);
      });
    };

    observeTargets();
    const mutations = new MutationObserver(observeTargets);
    mutations.observe(main, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return <div className="scroll-progress" aria-hidden="true"><span ref={progressRef} /></div>;
}

export default function App() {
  return <><PageMetadata /><ScrollToTop /><ScrollMotion /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/leadership" element={<LeadershipPage />} /><Route path="/admin/*" element={<AdminPage />} /><Route path="/manufacturing" element={<ManufacturingExperience />} /><Route path="/technology" element={<ManufacturingExperience />} /><Route path="/quality" element={<Navigate to="/manufacturing#quality" replace />} />{pages.filter((page) => !["/manufacturing", "/technology", "/quality"].includes(page.path)).map((page) => <Route key={page.path} path={page.path} element={<ContentPage key={page.path} page={page} />} />)}<Route path="*" element={<NotFound />} /></Routes><Footer /></>;
}
