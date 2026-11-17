import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowUpRight, Image, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { SitePage } from "./content";

export type VisualMediaItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  alt: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  sortOrder: number;
};

export type VisualGalleryContent = { items: VisualMediaItem[] };
type GalleryResponse = VisualGalleryContent;
type NewsMediaPageProps = { page: SitePage };

const industryVideos = [
  {
    id: "1YS53kRjFAE",
    title: "Steelmaking at Koverhar, 1982",
    category: "Historic steelmaking · Finland",
    description: "Historical steel production footage from the Koverhar steelworks. It is an independent industry reference and does not depict Chalinze Steel Mills.",
    creator: "Kauko Helavuo",
    source: "https://commons.wikimedia.org/wiki/File:HISTORIAA_%E2%80%A2_OVAKON_Koverharin_ter%C3%A4stehdas_1982_-_ter%C3%A4ksen_valmistus.webm",
    license: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    id: "I4r4mslT_lI",
    title: "Annealing furnace",
    category: "Furnace operations · Slovenia",
    description: "A short industry recording of gas-fired burners heating an ingot for further processing at Metal Ravne. This reference does not indicate the selected route for the Chalinze project.",
    creator: "Technical Museum of Slovenia · video by Barbara Grilc",
    source: "https://commons.wikimedia.org/wiki/File:CER_annealing_furnace.webm",
    license: "https://creativecommons.org/licenses/by/4.0/",
  },
];

function AbstractSteelScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setUnavailable(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(0, 0, 11);
    scene.add(new THREE.HemisphereLight(0xdce9ee, 0x17100b, 2.2));
    const keyLight = new THREE.PointLight(0xf47721, 95, 24);
    keyLight.position.set(-4, 3, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x75a1b5, 65, 24);
    rimLight.position.set(4, -2, -3);
    scene.add(rimLight);

    const sculpture = new THREE.Group();
    scene.add(sculpture);
    const steel = new THREE.MeshStandardMaterial({ color: 0x9ca9ad, metalness: 0.9, roughness: 0.2 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x36434a, metalness: 0.88, roughness: 0.27 });
    const copper = new THREE.MeshStandardMaterial({ color: 0xd17a38, metalness: 0.78, roughness: 0.22, emissive: 0x4a1903 });
    const core = new THREE.Mesh(new THREE.TorusKnotGeometry(1.42, 0.31, 170, 18, 2, 5), steel);
    sculpture.add(core);
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.035, 8, 120), copper);
    ringA.rotation.set(0.55, 0.2, 0.25);
    sculpture.add(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.022, 8, 120), darkSteel);
    ringB.rotation.set(1.15, -0.5, 0.1);
    sculpture.add(ringB);
    for (let index = 0; index < 18; index += 1) {
      const angle = index * Math.PI * 2 / 18;
      const particle = new THREE.Mesh(new THREE.IcosahedronGeometry(index % 3 === 0 ? 0.095 : 0.055, 1), index % 4 === 0 ? copper : steel);
      particle.position.set(Math.cos(angle) * 3.05, Math.sin(angle) * 1.95, Math.sin(angle * 2) * 0.75);
      sculpture.add(particle);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = 0;
    let height = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let targetX = -0.12;
    let targetY = 0.18;
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 500 ? 13 : 11;
      camera.updateProjectionMatrix();
    };
    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      targetY += (event.clientX - lastX) * 0.008;
      targetX += (event.clientY - lastY) * 0.008;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = () => { dragging = false; };
    const keyDown = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      targetY += event.key === "ArrowLeft" ? -0.18 : event.key === "ArrowRight" ? 0.18 : 0;
      targetX += event.key === "ArrowUp" ? -0.18 : event.key === "ArrowDown" ? 0.18 : 0;
      if (reducedMotion.matches) {
        sculpture.rotation.set(targetX, targetY, 0);
        renderer.render(scene, camera);
      }
    };
    const animate = (time: number) => {
      frame = 0;
      if (!dragging && !reducedMotion.matches) targetY += 0.0015;
      sculpture.rotation.x += (targetX - sculpture.rotation.x) * 0.055;
      sculpture.rotation.y += (targetY - sculpture.rotation.y) * 0.055;
      sculpture.rotation.z = reducedMotion.matches ? 0 : Math.sin(time * 0.00022) * 0.055;
      renderer.render(scene, camera);
      if (!reducedMotion.matches || dragging) frame = requestAnimationFrame(animate);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    host.addEventListener("keydown", keyDown);
    resize();
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", pointerUp);
      host.removeEventListener("keydown", keyDown);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      steel.dispose();
      darkSteel.dispose();
      copper.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="visual-gallery-scene" ref={hostRef} role="img" tabIndex={0} aria-label="Animated abstract 3D sculpture of interwoven steel forms. Drag to rotate or use the arrow keys.">
    {unavailable && <div className="visual-scene-fallback" aria-hidden="true"><span>CSM</span><i /><b /></div>}
  </div>;
}

export function NewsMediaPage({ page }: NewsMediaPageProps) {
  const [items, setItems] = useState<VisualMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/visual-gallery", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Published visual media could not be loaded.");
        const content = await response.json() as GalleryResponse;
        if (!Array.isArray(content.items)) throw new Error("The published visual gallery has an invalid format.");
        setItems(content.items);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Published visual media could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return <main className="visual-gallery-page news-media-page">
    <section className="visual-gallery-hero newsroom-hero">
      <div className="visual-gallery-copy">
        <span className="gallery-kicker"><Image size={15} /> {page.eyebrow.toUpperCase()} · STEEL INDUSTRY · COMPANY MEDIA</span>
        <h1>News &<br /><em>media.</em></h1>
        <p>{page.summary}</p>
        <div className="visual-gallery-cues"><a href="#news-updates"><ArrowUpRight size={14} /> Company updates</a><a href="#industry-videos"><Play size={14} /> Industry videos</a><a href="#media"><Image size={14} /> Photo gallery</a></div>
      </div>
      <div className="visual-gallery-art"><AbstractSteelScene /><span className="visual-gallery-art-caption">DIGITAL STUDY / ABSTRACT STEEL FORM</span></div>
      <div className="visual-gallery-gridlines" aria-hidden="true" />
    </section>
    <section className="newsroom-updates section-pad" id="news-updates" aria-labelledby="newsroom-updates-title">
      <div className="section-index">CHALINZE STEEL MILLS · OFFICIAL UPDATES</div>
      <div className="gallery-heading"><h2 id="newsroom-updates-title">Company news,<br /><em>carefully verified.</em></h2><p>Company announcements and project updates appear here after authorized review. Independent industry videos and company-approved photos are grouped below.</p></div>
      <div className="newsroom-update-grid">{page.sections.map((section, index) => <article className="newsroom-update-card" key={`${section.title}-${index}`}>
        <span>{section.tag ?? "Company newsroom"} · {String(index + 1).padStart(2, "0")}</span>
        <h3>{section.title}</h3>
        <p>{section.body}</p>
      </article>)}</div>
      <p className="newsroom-status"><strong>Editorial status</strong> No unverified announcements, project milestones or operating results are presented as company news.</p>
    </section>
    <section className="industry-video-section section-pad" id="industry-videos" aria-labelledby="industry-video-title">
      <div className="section-index">INDEPENDENT INDUSTRY REFERENCES</div>
      <div className="gallery-heading"><h2 id="industry-video-title">Steel in<br /><em>motion.</em></h2><p>Educational and historical footage from other steel industry sources. These videos do not depict Chalinze Steel Mills or imply that its proposed project is operating.</p></div>
      <div className="industry-video-grid">{industryVideos.map((video) => <article className="industry-video-card" key={video.id}>
        <div className="industry-video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
        <div className="industry-video-copy"><span>{video.category}</span><h3>{video.title}</h3><p>{video.description}</p><small>Credit: {video.creator}</small><div><a href={video.source} target="_blank" rel="noreferrer">Source & media details <ArrowUpRight size={13} /></a><a href={video.license} target="_blank" rel="noreferrer">CC BY license <ArrowUpRight size={13} /></a></div></div>
      </article>)}</div>
    </section>
    <section className="visual-media-section section-pad" id="media" aria-labelledby="visual-media-title">
      <div className="section-index">COMPANY PHOTO & VIDEO LIBRARY</div>
      <div className="gallery-heading"><h2 id="visual-media-title">Our selected<br /><em>media.</em></h2><p>Company-approved images and videos are published by administrators. Conceptual artworks are identified as such and do not represent installed or operating facilities.</p></div>
      {loading && <p className="visual-gallery-state" role="status">Loading published media…</p>}
      {error && <p className="visual-gallery-state is-error" role="alert">{error}</p>}
      {!loading && !error && !items.length && <div className="visual-gallery-empty"><Image size={22} /><strong>Company media is being curated.</strong><p>Approved images and videos will appear here when published by the company.</p><Link className="text-link" to="/contact">Contact the company <ArrowUpRight size={15} /></Link></div>}
      {!!items.length && <div className="visual-media-grid">{items.map((item, index) => <article className={`visual-media-card visual-media-card-${index % 4}`} key={item.id}>
        <div className="visual-media-frame">
          {item.mediaType === "image" ? <img src={item.mediaUrl} alt={item.alt} loading="lazy" /> : <video src={item.mediaUrl} controls playsInline preload="metadata" aria-label={item.alt} />}
          <span className="visual-media-index">{String(index + 1).padStart(2, "0")} / {item.mediaType === "video" ? "MOTION" : "STILL"}</span>
        </div>
        <div className="visual-media-copy"><span>{item.category}</span><h3>{item.title}</h3><p>{item.description}</p></div>
      </article>)}</div>}
      <p className="visual-gallery-note">This animated 3D artwork is an abstract digital study. It is not a plant model, engineering design or depiction of the Vigwaza site.</p>
    </section>
  </main>;
}
