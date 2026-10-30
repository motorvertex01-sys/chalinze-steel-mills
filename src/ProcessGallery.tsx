import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { Link } from "react-router-dom";

export type GalleryItem = {
  title: string;
  category: string;
  description: string;
  technical: string;
  status: string;
  image?: string;
  alt: string;
  illustration?: "ore" | "beneficiation" | "ironmaking" | "steelmaking" | "casting" | "billet" | "quality" | "rolling" | "infrastructure";
  relatedLabel: string;
  relatedPath: string;
};

function ManufacturingIllustration({ kind, alt }: { kind: NonNullable<GalleryItem["illustration"]>; alt: string }) {
  return (
    <svg className={`manufacturing-illustration illustration-${kind}`} viewBox="0 0 640 380" role="img" aria-label={alt}>
      <defs>
        <linearGradient id={`metal-${kind}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#d2d7d9" />
          <stop offset=".48" stopColor="#626b72" />
          <stop offset="1" stopColor="#b2b8bb" />
        </linearGradient>
        <linearGradient id={`heat-${kind}`} x1="0" x2="0" y1="1" y2="0">
          <stop stopColor="#e74710" />
          <stop offset="1" stopColor="#ffba52" />
        </linearGradient>
        <pattern id={`grid-${kind}`} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#a9b0b3" strokeOpacity=".13" />
        </pattern>
      </defs>
      <rect width="640" height="380" fill="#121619" />
      <rect width="640" height="380" fill={`url(#grid-${kind})`} />
      <path d="M35 314H605" stroke="#d7dddf" strokeOpacity=".22" />
      {kind === "ore" && <>
        <path d="m122 280 14-50 47-31 50 12 31 44-14 40-69 19-43-13z" fill="#76513a" stroke="#d9a25d" strokeWidth="3" />
        <path d="m202 282 30-58 45-23 42 17 20 48-30 47-67 3z" fill="#4d382b" stroke="#bc8244" strokeWidth="3" />
        <path d="m340 278 22-41 40-20 38 25 8 44-42 31-48-8z" fill="#8b613d" stroke="#e0b876" strokeWidth="3" />
        <path d="m155 256 26-40 20 7-14 35m55 19 24-41 18 9-17 42m95-9 24-38 16 11-16 36" fill="none" stroke="#f0c883" strokeOpacity=".78" strokeWidth="7" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">RAW MATERIAL / CONCEPT</text>
      </>}
      {kind === "beneficiation" && <>
        <path d="M92 235h392l-35 47H128z" fill="#414b50" stroke="#9fa8ab" strokeWidth="3" />
        <path d="m140 226 110-77 108 77" fill="none" stroke="#c5cbcd" strokeWidth="14" />
        <circle cx="153" cy="248" r="13" fill="#a96b38" /><circle cx="205" cy="248" r="13" fill="#805535" /><circle cx="259" cy="248" r="13" fill="#bb874d" /><circle cx="313" cy="248" r="13" fill="#9e6841" />
        <path d="m410 150 56 60h-86z" fill="#737e83" stroke="#d3d8d9" strokeWidth="4" />
        <rect x="443" y="210" width="82" height="33" fill="#343d41" stroke="#aeb6b8" strokeWidth="3" />
        <circle cx="170" cy="290" r="12" fill="#60696d" /><circle cx="450" cy="290" r="12" fill="#60696d" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">ORE PREPARATION / CONCEPT</text>
      </>}
      {kind === "ironmaking" && <>
        <path d="M245 100h150l-18 37v148H263V137z" fill="#3c4448" stroke="#c1c8ca" strokeWidth="4" />
        <path d="M262 145h116v75H262z" fill="#262b2e" stroke="#929da1" strokeWidth="2" />
        <path d="M292 214h58v70h-58z" fill={`url(#heat-${kind})`} opacity=".9" />
        <path d="M218 126h-42v78h42m203-78h42v78h-42" fill="none" stroke="#899499" strokeWidth="10" />
        <path d="M282 91h78m-111 210h140" stroke="#d0d5d7" strokeWidth="5" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">IRONMAKING ROUTE / UNCONFIRMED</text>
      </>}
      {kind === "steelmaking" && <>
        <path d="m235 96 48-34h79l47 34-22 158q-65 54-130 0z" fill="#424a4e" stroke="#c9d0d2" strokeWidth="4" />
        <ellipse cx="322" cy="105" rx="50" ry="19" fill="#191d1f" stroke="#9aa3a6" strokeWidth="5" />
        <ellipse cx="322" cy="109" rx="34" ry="10" fill={`url(#heat-${kind})`} />
        <path d="M303 150q-10 34 19 49 29-15 19-49z" fill={`url(#heat-${kind})`} />
        <path d="M284 267h77m-56-20v37m34-37v37" stroke="#b5bdc0" strokeWidth="5" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">STEELMAKING / PROPOSED</text>
      </>}
      {kind === "casting" && <>
        <path d="M122 126h79v57h-79z" fill="#454d51" stroke="#c3cacc" strokeWidth="4" />
        <path d="M159 183v53q0 17 16 17h101v-45h-76v-25" fill="none" stroke="#c3cacc" strokeWidth="15" />
        <path d="M274 244h217" stroke="#737e83" strokeWidth="25" />
        {[308,362,416,470].map((x) => <g key={x}><circle cx={x} cy="276" r="19" fill="#30373a" stroke="#aab2b5" strokeWidth="4" /><circle cx={x} cy="276" r="7" fill="#141719" /></g>)}
        <path d="M292 190h188m-174 0v28m58-28v28m58-28v28m58-28v28" stroke="#f47721" strokeOpacity=".75" strokeWidth="5" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">CONTINUOUS CASTING / CONCEPT</text>
      </>}
      {kind === "billet" && <>
        <path d="m154 213 222-76 112 39-224 83z" fill="#aeb6ba" stroke="#e4e7e8" strokeWidth="3" />
        <path d="m154 213 110 46v42l-110-48z" fill="#555f65" stroke="#b4bdc0" strokeWidth="3" />
        <path d="m264 259 224-83v41l-224 84z" fill="#747e84" stroke="#cbd0d2" strokeWidth="3" />
        <path d="m194 160 222-75 112 38-224 79z" fill="#818b91" stroke="#d2d7d9" strokeWidth="3" />
        <path d="m194 160 110 42v42l-110-46z" fill="#4b555b" stroke="#bbc2c5" strokeWidth="3" />
        <path d="m304 202 224-79v41l-224 80z" fill="#687278" stroke="#c2c9cb" strokeWidth="3" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">STEEL BILLETS / PLANNED PRODUCT</text>
      </>}
      {kind === "quality" && <>
        <path d="M180 110h86l-12 78h-62z" fill="#343c40" stroke="#c6ccce" strokeWidth="4" />
        <path d="M190 188h66v95h-66z" fill="#171b1d" stroke="#9ba5a8" strokeWidth="3" />
        <path d="M204 250h40v27h-40z" fill="#b8c0c2" />
        <path d="M337 120h110v158H337z" fill="#343d41" stroke="#b7c0c2" strokeWidth="4" />
        <path d="M355 149h73m-73 28h55m-55 28h67m-67 28h49" stroke="#e1e4e5" strokeWidth="5" />
        <circle cx="469" cy="124" r="30" fill="#202527" stroke="#f47721" strokeWidth="4" />
        <path d="m490 145 38 39" stroke="#f47721" strokeWidth="8" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">QUALITY ACTIVITIES / PLANNED</text>
      </>}
      {kind === "rolling" && <>
        <path d="M108 268h420" stroke="#abb3b6" strokeWidth="10" />
        {[175,286,397,492].map((x) => <g key={x}><circle cx={x} cy="201" r="35" fill="#454e52" stroke="#d5dadd" strokeWidth="5" /><circle cx={x} cy="201" r="13" fill="#161a1c" stroke="#f47721" strokeWidth="3" /><path d={`M${x} 166v-48`} stroke="#9da7aa" strokeWidth="8" /></g>)}
        <path d="M126 249h370" stroke="#f47721" strokeWidth="4" strokeDasharray="16 14" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">DOWNSTREAM ROLLING / ILLUSTRATION</text>
      </>}
      {kind === "infrastructure" && <>
        <path d="M113 260h418" stroke="#8f9a9e" strokeWidth="5" />
        {[156,234,312,390,468].map((x) => <g key={x}><path d={`M${x} 260v-116h48v116m-48-87h48m-48 38h48`} fill="none" stroke="#aeb7ba" strokeWidth="6" /><path d={`M${x-13} 144h73`} stroke="#f47721" strokeWidth="4" /></g>)}
        <path d="m130 116 156-52 155 52M130 112v-22m311 22V90" fill="none" stroke="#697479" strokeWidth="8" />
        <text x="54" y="58" fill="#f3a34e" fontSize="16" letterSpacing="3">PLANT SYSTEMS / CONCEPT</text>
      </>}
      <text x="54" y="348" fill="#b9c0c2" fontSize="12" letterSpacing="2">CONCEPTUAL ILLUSTRATION · NOT AN AS-BUILT FACILITY</text>
    </svg>
  );
}

function GalleryImage({ item }: { item: GalleryItem }) {
  if (item.image) return <img src={item.image} alt={item.alt} loading="lazy" />;
  if (item.illustration) return <ManufacturingIllustration kind={item.illustration} alt={item.alt} />;
  return null;
}

export function ProcessGallery({ items, title = "Explore the imagery" }: { items: readonly GalleryItem[]; title?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeItem = activeIndex === null ? null : items[activeIndex];
  const close = () => setActiveIndex(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeItem) {
      if (!dialog.open) {
        dialog.showModal();
        closeRef.current?.focus();
      }
      document.body.classList.add("dialog-open");
    } else {
      if (dialog.open) dialog.close();
      document.body.classList.remove("dialog-open");
      triggerRef.current?.focus();
    }
    return () => document.body.classList.remove("dialog-open");
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "ArrowRight") setActiveIndex((index) => index === null ? 0 : (index + 1) % items.length);
      if (event.key === "ArrowLeft") setActiveIndex((index) => index === null ? 0 : (index - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, items.length]);

  return (
    <section className="image-gallery" aria-label={title}>
      <div className="gallery-grid">
        {items.map((item, index) => (
          <article className="gallery-card" key={item.title}>
            <button
              className="gallery-image-button"
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setActiveIndex(index);
              }}
              aria-label={`View image and details: ${item.title}`}
            >
              <span className="gallery-image"><GalleryImage item={item} /></span>
              <span className="gallery-open-label">View details <ArrowUpRight size={14} /></span>
            </button>
            <div className="gallery-card-copy">
              <span>{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.status}</p>
            </div>
          </article>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="gallery-dialog"
        aria-labelledby="gallery-dialog-title"
        onClose={() => setActiveIndex(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        {activeItem && <>
          <button ref={closeRef} type="button" className="dialog-close" onClick={close} aria-label="Close image details"><X size={20} /></button>
          <div className="dialog-image"><GalleryImage item={activeItem} /></div>
          <div className="dialog-copy">
            <span className="gallery-kicker">{activeItem.category} · {activeItem.status}</span>
            <h2 id="gallery-dialog-title">{activeItem.title}</h2>
            <p>{activeItem.description}</p>
            <p className="dialog-technical">{activeItem.technical}</p>
            <Link to={activeItem.relatedPath} onClick={close} className="text-link">{activeItem.relatedLabel} <ArrowUpRight size={15} /></Link>
            <div className="dialog-gallery-controls">
              <button type="button" onClick={() => setActiveIndex((index) => index === null ? 0 : (index - 1 + items.length) % items.length)} aria-label="Previous image"><ArrowLeft size={17} /> Previous</button>
              <span>{(activeIndex ?? 0) + 1} / {items.length}</span>
              <button type="button" onClick={() => setActiveIndex((index) => index === null ? 0 : (index + 1) % items.length)} aria-label="Next image">Next <ArrowRight size={17} /></button>
            </div>
          </div>
        </>}
      </dialog>
    </section>
  );
}
