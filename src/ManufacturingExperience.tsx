import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Expand, Minimize, Pause, Play, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import rawContent from "../manufacturing-content.json";
import type { DownstreamModelKind, ManufacturingSceneKind } from "./ManufacturingScene3D";

const ProcessScene = lazy(() => import("./ManufacturingScene3D").then((module) => ({ default: module.ManufacturingScene3D })));

type Hotspot = { label: string; detail: string };
type ManufacturingStage = {
  id: string;
  title: string;
  shortTitle: string;
  status: string;
  description: string;
  input: string;
  output: string;
  machinery: string;
  operations: string[];
  technical: string;
  hotspots: Hotspot[];
  scene: ManufacturingSceneKind;
};
type ManufacturingContent = {
  eyebrow: string;
  headline: string;
  introduction: string;
  valueStatement: string;
  stages: ManufacturingStage[];
  quality: { stageId: string; title: string; detail: string }[];
  billet: {
    name: string;
    description: string;
    dimensions: { label: string; width: number; height: number; status: string }[];
    specificationNote: string;
  };
  downstream: { id: string; name: string; description: string; applications: string; industries: string; model: DownstreamModelKind }[];
  infrastructure: { title: string; detail: string }[];
  sustainability: { title: string; detail: string }[];
  industries: { title: string; detail: string }[];
  approvalNote: string;
  media?: { heroImage?: string; heroVideo?: string; stageImages?: Record<string, string> };
};

const builtInContent = rawContent as ManufacturingContent;

function ProductModel({ model, title }: { model: DownstreamModelKind; title: string }) {
  return <Suspense fallback={<div className="manufacturing-scene-loading" role="status">Preparing product visual…</div>}>
    <div role="img" aria-label={title}><ProcessScene stage="downstream" model={model} animated /></div>
  </Suspense>;
}

function StageScene({ stage, animated, className = "" }: { stage: ManufacturingSceneKind; animated: boolean; className?: string }) {
  return <div className={`manufacturing-scene-stage ${className}`}>
    <Suspense fallback={<div className="manufacturing-scene-loading" role="status">Preparing conceptual process scene…</div>}>
      <ProcessScene stage={stage} animated={animated} />
    </Suspense>
  </div>;
}

function ProjectStatus({ children }: { children: React.ReactNode }) {
  return <span className="manufacturing-status"><i aria-hidden="true" />{children}</span>;
}

function ManufacturingHero({ content }: { content: ManufacturingContent }) {
  const [introActive, setIntroActive] = useState(true);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const markUnavailable = useCallback(() => setSceneUnavailable(true), []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setReducedMotion(reducedMotion.matches);
      if (reducedMotion.matches) setIntroActive(false);
    };
    reducedMotion.addEventListener("change", updateMotionPreference);
    if (reducedMotion.matches) {
      setIntroActive(false);
    } else {
      const timer = window.setTimeout(() => setIntroActive(false), 2600);
      return () => {
        window.clearTimeout(timer);
        reducedMotion.removeEventListener("change", updateMotionPreference);
      };
    }
    return () => reducedMotion.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) heroVideoRef.current?.pause();
  }, [reducedMotion, content.media?.heroVideo]);

  return (
    <section className={`manufacturing-hero${introActive ? " is-entering" : ""}`} aria-labelledby="manufacturing-title">
      <div className="manufacturing-hero-texture" aria-hidden="true" />
      <div className="manufacturing-hero-scene">
        {content.media?.heroVideo && <video ref={heroVideoRef} className="manufacturing-approved-media" src={content.media.heroVideo} muted loop autoPlay={!reducedMotion} playsInline aria-hidden="true" />}
        {!content.media?.heroVideo && content.media?.heroImage && <img className="manufacturing-approved-media" src={content.media.heroImage} alt="" />}
        {!sceneUnavailable && <Suspense fallback={<div className="manufacturing-scene-loading" role="status">Preparing conceptual ore-to-steel scene…</div>}>
          <ProcessScene stage="ore" animated cinematic={introActive} onUnavailable={markUnavailable} />
        </Suspense>}
        {sceneUnavailable && <div className="manufacturing-hero-static" role="img" aria-label="Conceptual iron ore, process and steel billet illustration"><i /><b /><span /></div>}
      </div>
      <div className="manufacturing-hero-content">
        <ProjectStatus>{content.eyebrow}</ProjectStatus>
        <h1 id="manufacturing-title">{content.headline}</h1>
        <p>{content.introduction}</p>
        <div className="manufacturing-hero-actions"><a className="button button-orange" href="#production-journey">Explore upstream operations <ArrowDown size={16} /></a><Link className="text-link" to="/products#product-applications">Downstream impact <ArrowUpRight size={15} /></Link></div>
        <span className="manufacturing-hero-output">PLANNED UPSTREAM OUTPUT <i /> IRON-BEARING RAW MATERIALS</span>
      </div>
      <div className="manufacturing-hero-mark" aria-hidden="true"><span>01</span><i />06</div>
      {introActive && <button className="manufacturing-skip" type="button" onClick={() => setIntroActive(false)}>Skip cinematic introduction</button>}
      <span className="manufacturing-hero-caption">CONCEPTUAL VISUALISATION · NOT AN AS-BUILT FACILITY</span>
    </section>
  );
}

function UpstreamFoundation() {
  const equipment = [
    ["Mining", "Drilling rigs, excavators, loaders and haul trucks"],
    ["Crushing", "Jaw, gyratory and cone crushers"],
    ["Screening & classification", "Vibrating screens and classifiers"],
    ["Grinding", "SAG mills, ball mills and high-pressure grinding rolls (HPGR)"],
    ["Beneficiation", "Magnetic and gravity separators; flotation cells where suitable"],
    ["Dewatering", "Thickeners, filter presses and vacuum filters"],
    ["Pelletizing (if required)", "Disc or drum pelletizers and induration furnaces"],
    ["Material handling", "Conveyors, feeders, stackers and reclaimers"],
    ["Quality control", "Sampling systems, laboratories and analysers"],
  ];
  const outputs = [
    ["Calibrated lump ore", "Sized iron ore, where deposit characteristics and the selected route allow."],
    ["Beneficiated concentrate", "Iron-enriched material after suitable mineral separation and concentration."],
    ["Sinter feed", "Fine iron-bearing material for sintering where the selected ironmaking route requires it."],
    ["Iron ore pellets", "Agglomerated and indurated feed made from suitable fine concentrate when required."],
  ];
  const benefits = [
    ["Raw-material security", "Develops dependable access to iron-bearing resources; resource rights and supply remain to be confirmed."],
    ["Quality assurance", "Enables characterization and control of iron content, impurities, sizing and moisture."],
    ["Operational efficiency", "Aims to provide consistent feedstock for later ironmaking."],
    ["Cost optimization", "Mine-to-plant integration may reduce avoidable handling and transport, subject to engineering and commercial studies."],
    ["Industrial integration", "Creates the material foundation for the proposed mining-to-steel value chain."],
    ["Resource value addition", "Prepares mineral resources into higher-value industrial feedstock."],
  ];

  return <section className="upstream-foundation section-pad" aria-labelledby="upstream-foundation-title">
    <div className="section-index">UPSTREAM FOUNDATION · MINE TO METALLURGICAL-GRADE RAW MATERIALS</div>
    <div className="upstream-foundation-intro">
      <div>
        <span className="manufacturing-label">THE VALUE CHAIN STARTS WITH THE ORE</span>
        <h2 id="upstream-foundation-title">Prepare the<br /><em>raw material.</em></h2>
        <p>The upstream segment is the foundation of the proposed iron-and-steel value chain. It covers extraction, handling, processing and preparation of iron-bearing raw materials for later ironmaking and steel production.</p>
        <p>Run-of-mine (ROM) ore cannot always be charged directly into metallurgical furnaces. Its mineralogy, iron content, impurities and physical characteristics determine which preparation stages are suitable and what feedstock quality can be targeted.</p>
        <p>The objective is a reliable, consistent and quality-controlled supply of prepared iron-bearing material. Specific grades, process yields, supply volumes and metallurgical specifications have not been confirmed.</p>
      </div>
      <figure className="upstream-value-chain-figure">
        <img src="/assets/images/iron-industry-value-chain-illustration.webp" alt="Illustrative mine-to-market iron industry value chain, showing upstream mining and raw-material preparation, steel production, and downstream product examples." width="1152" height="768" loading="lazy" decoding="async" />
        <figcaption>General industry illustration supplied for context; it is not an approved Chalinze plant design or selected process route. Downstream stages and products show potential value-chain impacts, not current company production. Pelletizing, sintering and ironmaking route selection remain subject to testing and engineering. <a href="/assets/images/iron-industry-value-chain-illustration.webp" target="_blank" rel="noreferrer">Open the full-size illustration</a>.</figcaption>
      </figure>
    </div>
    <div className="upstream-reference-grid">
      <section aria-labelledby="upstream-material-outputs-title">
        <span className="manufacturing-label">RAW MATERIALS & PRODUCT OUTPUTS</span>
        <h3 id="upstream-material-outputs-title">Prepared feedstock<br />depends on the ore.</h3>
        <p className="upstream-reference-lede">Potential upstream outputs vary with ore characteristics and the selected processing route:</p>
        <div className="upstream-output-grid">{outputs.map(([title, detail], index) => <article key={title}><span>0{index + 1} / POTENTIAL OUTPUT</span><h4>{title}</h4><p>{detail}</p></article>)}</div>
      </section>
      <section aria-labelledby="upstream-equipment-title">
        <span className="manufacturing-label">TECHNOLOGY & EQUIPMENT REQUIREMENTS</span>
        <h3 id="upstream-equipment-title">Typical equipment<br />by process area.</h3>
        <div className="upstream-equipment-scroll" role="region" aria-label="Typical upstream process equipment" tabIndex={0}>
          <table className="upstream-equipment-table">
            <thead><tr><th scope="col">Process area</th><th scope="col">Typical equipment class</th></tr></thead>
            <tbody>{equipment.map(([area, machines]) => <tr key={area}><th scope="row">{area}</th><td>{machines}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="upstream-equipment-note">Examples are generic industry equipment classes, not Chalinze selections, confirmed specifications or installed assets.</p>
      </section>
    </div>
    <section className="upstream-strategic" aria-labelledby="upstream-strategic-title">
      <div><span className="manufacturing-label">WHY THE UPSTREAM FOUNDATION MATTERS</span><h3 id="upstream-strategic-title">Value begins<br />before the furnace.</h3></div>
      <ol>{benefits.map(([title, detail], index) => <li key={title}><span>0{index + 1}</span><div><strong>{title}</strong><p>{detail}</p></div></li>)}</ol>
    </section>
    <p className="upstream-route-caveat"><strong>Process selection caveat</strong> Beneficiation and agglomeration are distinct decisions. Not every deposit requires the same beneficiation stages, and not every ironmaking technology requires pellets. Mineralogical characterization, metallurgical testing and technology selection must establish the final configuration; no specific route is confirmed here.</p>
  </section>;
}

function ProductionFlow({ stages, selected, onSelect }: { stages: ManufacturingStage[]; selected: number; onSelect: (index: number) => void }) {
  return <nav className="production-timeline" aria-label="Six-stage production journey">
    {stages.map((stage, index) => <button key={stage.id} className={`production-timeline-step${selected === index ? " is-active" : ""}${index < selected ? " is-complete" : ""}`} type="button" aria-current={selected === index ? "step" : undefined} onClick={() => onSelect(index)}>
      <span className="production-timeline-index">{index < selected ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span><span className="production-timeline-title">{stage.shortTitle}</span>
    </button>)}
  </nav>;
}

function ProcessJourney({ stages, stageImages }: { stages: ManufacturingStage[]; stageImages?: Record<string, string> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState(0);
  const [animated, setAnimated] = useState(true);
  const [walkthrough, setWalkthrough] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sceneVersion, setSceneVersion] = useState(0);
  const activeStage = stages[selectedIndex];
  const activeHotspot = activeStage.hotspots[selectedHotspot];

  useEffect(() => {
    setSelectedHotspot(0);
  }, [selectedIndex]);

  useEffect(() => {
    if (!walkthrough) return;
    const timer = window.setTimeout(() => {
      if (selectedIndex >= stages.length - 1) {
        setWalkthrough(false);
        return;
      }
      setSelectedIndex((current) => current + 1);
    }, 4800);
    return () => window.clearTimeout(timer);
  }, [walkthrough, selectedIndex, stages.length]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowRight") setSelectedIndex((current) => Math.min(current + 1, stages.length - 1));
      if (event.key === "ArrowLeft") setSelectedIndex((current) => Math.max(current - 1, 0));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded, stages.length]);

  const moveTo = (direction: -1 | 1) => setSelectedIndex((current) => Math.max(0, Math.min(stages.length - 1, current + direction)));

  return (
    <section className="production-journey section-pad" id="production-journey">
      <div className="section-index">02 / UPSTREAM · MINE TO METALLURGICAL-GRADE RAW MATERIALS</div>
      <div className="manufacturing-section-heading"><div><span className="manufacturing-label">UPSTREAM PRODUCTION · IRON ORE TO PREPARED IRON-BEARING MATERIALS</span><h2>Six stages.<br /><em>One feedstock.</em></h2></div><p>{stages[0]?.description ? "Explore the proposed upstream chain from mineral extraction to quality-controlled iron-bearing feedstock. These prepared materials are the planned upstream output that supplies downstream ironmaking; ironmaking, steelmaking, billets and finished steel products are downstream and are not yet in operation at Chalinze." : ""}</p></div>
      <ProductionFlow stages={stages} selected={selectedIndex} onSelect={setSelectedIndex} />
      <div className={`process-detail-layout${expanded ? " is-fullscreen" : ""}`}>
        <div className="process-scene-column">
          <div className="process-scene-frame">
            <StageScene key={`${activeStage.id}-${sceneVersion}`} stage={activeStage.scene} animated={animated} />
            {stageImages?.[activeStage.id] && <img className="process-approved-image" src={stageImages[activeStage.id]} alt={`Company-approved manufacturing image for ${activeStage.shortTitle}`} loading="lazy" />}
            <div className="process-scene-overlay"><span>STAGE {String(selectedIndex + 1).padStart(2, "0")} / 06</span><ProjectStatus>{activeStage.status}</ProjectStatus></div>
            <div className="process-scene-tools">
              <button type="button" onClick={() => setAnimated((value) => !value)} aria-pressed={!animated} aria-label={animated ? "Pause process scene animation" : "Resume process scene animation"}>{animated ? <Pause size={15} /> : <Play size={15} />}</button>
              <span>DRAG TO ROTATE</span>
              <button type="button" onClick={() => setSceneVersion((version) => version + 1)} aria-label="Reset 3D camera view"><RotateCcw size={15} /></button>
              <button type="button" onClick={() => setWalkthrough((value) => !value)} aria-pressed={walkthrough} aria-label={walkthrough ? "Stop automatic stage walkthrough" : "Start automatic stage walkthrough"}>{walkthrough ? <Pause size={15} /> : <Play size={15} />}</button>
              <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Exit full-screen process view" : "Open full-screen process view"}>{expanded ? <Minimize size={16} /> : <Expand size={16} />}</button>
            </div>
            {expanded && <button className="process-fullscreen-close" type="button" aria-label="Close full-screen view" onClick={() => setExpanded(false)}>×</button>}
            <div className="process-hotspots" aria-label="Process scene hotspots">{activeStage.hotspots.map((hotspot, index) => <button key={hotspot.label} type="button" className={index === selectedHotspot ? "is-selected" : ""} onClick={() => setSelectedHotspot(index)} aria-pressed={index === selectedHotspot}>{String(index + 1).padStart(2, "0")} · {hotspot.label}</button>)}</div>
            {activeHotspot && <div className="process-hotspot-detail" aria-live="polite"><strong>{activeHotspot.label}</strong><p>{activeHotspot.detail}</p></div>}
            <span className="process-concept-label">CONCEPTUAL PROCESS VISUALISATION</span>
          </div>
          <div className="process-stage-navigation"><button type="button" onClick={() => moveTo(-1)} disabled={selectedIndex === 0}><ArrowLeft size={15} /> Previous stage</button><span aria-live="polite">{String(selectedIndex + 1).padStart(2, "0")} <i /> {String(stages.length).padStart(2, "0")}</span><button type="button" onClick={() => moveTo(1)} disabled={selectedIndex === stages.length - 1}>Next stage <ArrowRight size={15} /></button></div>
        </div>
        <article className="process-stage-copy" aria-live="polite">
          <span className="manufacturing-label">STAGE {String(selectedIndex + 1).padStart(2, "0")} · {activeStage.status}</span>
          <h3>{activeStage.title}</h3>
          <p>{activeStage.description}</p>
          <dl className="process-material-flow"><div><dt>INPUT MATERIAL</dt><dd>{activeStage.input}</dd></div><div><dt>OUTPUT MATERIAL</dt><dd>{activeStage.output}</dd></div><div><dt>MACHINERY & DESIGN STATUS</dt><dd>{activeStage.machinery}</dd></div></dl>
          <details className="process-operations"><summary>Key operations <ChevronDown size={15} /></summary><ul>{activeStage.operations.map((operation) => <li key={operation}>{operation}</li>)}</ul></details>
          <div className="process-technical-note"><span>TECHNICAL NOTE</span><p>{activeStage.technical}</p></div>
        </article>
      </div>
    </section>
  );
}

function QualityJourney({ quality, stages }: { quality: ManufacturingContent["quality"]; stages: ManufacturingStage[] }) {
  const [selected, setSelected] = useState(0);
  const active = quality[selected];
  return <section className="quality-journey section-pad" id="quality">
    <div className="section-index">03 / A PROCESS-WIDE SYSTEM</div>
    <div className="manufacturing-section-heading"><div><span className="manufacturing-label">UPSTREAM QUALITY CONTROL</span><h2>Quality follows<br /><em>the feedstock.</em></h2></div><p>Quality planning covers material characterization, particle sizing, beneficiation, moisture management and dispatch traceability. Billet inspection belongs to downstream steelmaking and is not presented as an operating Chalinze capability.</p></div>
    <div className="quality-pathway">{quality.map((item, index) => <button key={item.stageId} type="button" className={`quality-pathway-step${selected === index ? " is-active" : ""}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><i aria-hidden="true" /></button>)}</div>
    <div className="quality-detail">
      <div className="quality-instrument" aria-hidden="true"><div className="quality-instrument-screen"><i /><b /><span /></div><div className="quality-instrument-stand" /><div className="quality-sample" /></div>
      <div><span className="manufacturing-label">{String(selected + 1).padStart(2, "0")} / {stages[selected]?.shortTitle}</span><h3>{active?.title}</h3><p>{active?.detail}</p><small>No product standard, certification, laboratory accreditation or inspection result is asserted.</small></div>
    </div>
  </section>;
}

function BilletShowcase({ billet }: { billet: ManufacturingContent["billet"] }) {
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const dimension = billet.dimensions[dimensionIndex];
  return <section className="billet-showcase" id="steel-billets">
    <div className="billet-showcase-copy"><div className="section-index">04 / DOWNSTREAM PRODUCT · NOT YET PRODUCED</div><ProjectStatus>DOWNSTREAM · NOT YET IN OPERATION</ProjectStatus><h2>Steel<br /><em>billets.</em></h2><p>{billet.description}</p>
      <div className="billet-dimension-selector" aria-label="Project-document billet cross-sections">{billet.dimensions.map((item, index) => <button key={item.label} type="button" className={index === dimensionIndex ? "is-selected" : ""} aria-pressed={index === dimensionIndex} onClick={() => setDimensionIndex(index)}><span>{item.label}</span><small>{item.status}</small></button>)}</div>
      <p className="billet-specification-note">{billet.specificationNote}</p>
      <Link className="button button-orange" to="/contact">Request product information <ArrowUpRight size={15} /></Link>
    </div>
    <div className="billet-model-area"><div className="billet-dimension-badge"><span>PROJECT REFERENCE</span><strong>{dimension.label}</strong><small>ENGINEERING CONFIRMATION REQUIRED</small></div><div className="billet-3d-stage"><StageScene stage="inspection" animated /></div><div className="billet-model-caption"><span>DRAG TO ROTATE</span><span>CONCEPT MODEL · NOT A PRODUCT SAMPLE</span></div></div>
  </section>;
}

const primaryRolledProductIds = new Set([
  "reinforcement-bars",
  "wire-rods",
  "round-bars",
  "flat-square-bars",
  "structural-sections",
  "merchant-bars",
]);

function DownstreamValueChain({ products }: { products: ManufacturingContent["downstream"] }) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const selected = products.find((item) => item.id === selectedId) ?? products[0];
  const primaryProducts = products.filter((item) => primaryRolledProductIds.has(item.id));
  const secondaryProducts = products.filter((item) => !primaryRolledProductIds.has(item.id));
  const productGroups = [
    { id: "primary", title: "A. Primary downstream products — steel rolling (upstream impact)", description: "Potential products rolled directly from billets at separate downstream facilities. These do not form part of Chalinze's planned operation.", products: primaryProducts },
    { id: "secondary", title: "B. Secondary downstream products — further processing (upstream impact)", description: "Products made from primary rolled products; they do not necessarily use billets directly.", products: secondaryProducts },
  ].filter((group) => group.products.length > 0);
  const selectedGroup = primaryRolledProductIds.has(selected?.id ?? "") ? "primary" : "secondary";
  return <section className="downstream-section section-pad" id="downstream">
    <div className="section-index">05 / UPSTREAM IMPACT · DOWNSTREAM OPPORTUNITY</div>
    <div className="manufacturing-section-heading"><div><span className="manufacturing-label">IMPACT OF UPSTREAM · DOWNSTREAM OPPORTUNITY (NOT YET IN OPERATION)</span><h2>From prepared feedstock<br />to <em>finished steel.</em></h2></div><p>Chalinze Steel Mills Ltd is developing the upstream foundation that prepares iron-bearing feedstock. In the proposed integrated value chain, this feedstock could supply later ironmaking, steelmaking and continuous casting, followed by rolling and further processing at downstream facilities. These examples show potential industrial impact; they are not current production or a confirmed commitment to operate every downstream facility.</p></div>
    <div className="value-chain-diagram">
      <div className="value-chain-primary"><span>UPSTREAM · MINE TO METALLURGICAL-GRADE RAW MATERIALS (CHALINZE PLANNED CORE)</span><div className="value-chain-stages">{["Iron ore mining", "Crushing & screening", "Beneficiation", "Dewatering & handling", "Agglomeration", "Stockpiling & dispatch"].map((item, index) => <span key={item}><i>{String(index + 1).padStart(2, "0")}</i>{item}</span>)}</div><strong>PLANNED UPSTREAM OUTPUT · IRON-BEARING RAW MATERIALS</strong></div>
      <div className="value-chain-boundary"><i /><strong>UPSTREAM OUTPUT<br />PREPARED IRON-BEARING FEEDSTOCK</strong><i /></div>
      <div className="value-chain-downstream"><span>IMPACT OF UPSTREAM · DOWNSTREAM (NOT YET IN OPERATION)</span><div><span>IRON-BEARING FEEDSTOCK</span><ArrowRight size={19} /><strong>IRONMAKING · STEELMAKING<br />&amp; CASTING</strong></div><b>BILLETS → ROLLING → FINISHED STEEL</b></div>
    </div>
    <div className="downstream-product-layout">
      <div className="downstream-product-catalog">{productGroups.map((group) => <section key={group.id} aria-labelledby={`downstream-${group.id}-heading`}>
        <h3 id={`downstream-${group.id}-heading`}>{group.title}</h3><p>{group.description}</p>
        <div className="downstream-product-selector" role="tablist" aria-label={group.title}>{group.products.map((item, index) => <button id={`downstream-product-tab-${item.id}`} key={item.id} type="button" role="tab" aria-controls="downstream-product-panel" aria-selected={selectedId === item.id} className={selectedId === item.id ? "is-selected" : ""} onClick={() => setSelectedId(item.id)}><span>{String(index + 1).padStart(2, "0")} · {group.id === "primary" ? "PRIMARY ROLLING" : "SECONDARY PROCESSING"}</span><strong>{item.name}</strong><ArrowUpRight size={15} /></button>)}</div>
      </section>)}</div>
      {selected && <article className="downstream-product-detail" id="downstream-product-panel" role="tabpanel" aria-labelledby={`downstream-product-tab-${selected.id}`}>
        <div className="downstream-model"><ProductModel model={selected.model} title={`Representative conceptual illustration of ${selected.name}`} /><span>ILLUSTRATIVE MODEL · NOT A CHALINZE PRODUCT</span></div>
        <div className="downstream-product-copy"><span className="manufacturing-label">UPSTREAM IMPACT · {selectedGroup === "primary" ? "PRIMARY DOWNSTREAM ROLLED PRODUCT" : "SECONDARY DOWNSTREAM PROCESSED PRODUCT"}</span><h3>{selected.name}</h3><p>{selected.description}</p><dl><div><dt>Typical application</dt><dd>{selected.applications}</dd></div><div><dt>Related industries</dt><dd>{selected.industries}</dd></div></dl><p className="downstream-boundary-note">These are illustrative downstream industry products enabled by the wider iron-and-steel value chain. They are not confirmed Chalinze products or operating capabilities; the upstream feedstock and downstream plant specifications remain subject to project definition.</p></div>
      </article>}
    </div>
  </section>;
}

function SupportingManufacturing({ content }: { content: ManufacturingContent }) {
  return <>
    <section className="manufacturing-infrastructure section-pad" id="infrastructure">
      <div className="section-index">06 / TECHNOLOGY & INFRASTRUCTURE</div><div className="manufacturing-section-heading"><div><span className="manufacturing-label">A CONNECTED INDUSTRIAL PLATFORM</span><h2>Engineered<br /><em>to connect.</em></h2></div><p>Manufacturing relies on coordinated materials handling, utilities, control systems and logistics. These elements remain part of the planned project scope.</p></div>
      <div className="infrastructure-grid">{content.infrastructure.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div className={`infrastructure-glyph glyph-${index + 1}`} aria-hidden="true"><i /><b /><em /></div><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
    </section>
    <section className="responsible-production section-pad" id="responsible-production">
      <div className="section-index">07 / SUSTAINABILITY & RESPONSIBLE PRODUCTION</div><div className="manufacturing-section-heading"><div><span className="manufacturing-label">RESPONSIBLE DEVELOPMENT</span><h2>Progress with<br /><em>purpose.</em></h2></div><p>The ambition is presented with care: development plans are not operating results, and branding language is not a measured environmental claim.</p></div>
      <div className="sustainability-cards">{content.sustainability.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div>
    </section>
    <section className="manufacturing-industries section-pad" id="applications">
      <div className="section-index">08 / POTENTIAL IMPACT OF THE UPSTREAM FOUNDATION</div><div className="manufacturing-section-heading"><div><span className="manufacturing-label">DOWNSTREAM CUSTOMER INDUSTRIES</span><h2>Steel for<br /><em>many sectors.</em></h2></div><p>These are potential industry applications of future downstream steel products that the integrated value chain could support—not named customers, secured supply agreements or existing operating relationships.</p></div>
      <div className="industry-grid">{content.industries.map((item, index) => <article key={item.title}><span>0{index + 1} / INDUSTRY</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
    </section>
  </>;
}

function ManufacturingEnquiry({ note }: { note: string }) {
  return <section className="manufacturing-enquiry section-pad" id="enquiries" tabIndex={-1}><div><span className="manufacturing-label">PROJECT, FEEDSTOCK & PARTNERSHIP ENQUIRIES</span><h2>Start with<br /><em>the right detail.</em></h2><p>Contact the company for project information. Material forms and billet dimensions shown here are planning references, not confirmed sale specifications or availability.</p></div><div className="manufacturing-enquiry-actions"><Link className="button button-orange" to="/contact">Contact Chalinze Steel Mills <ArrowUpRight size={16} /></Link><Link className="text-link" to="/products">Feedstock & downstream applications <ArrowRight size={15} /></Link><Link className="text-link" to="/markets">Markets & potential impacts <ArrowRight size={15} /></Link></div><p className="manufacturing-publication-note">{note}</p></section>;
}

export function ManufacturingExperience() {
  const [content, setContent] = useState<ManufacturingContent>(builtInContent);
  const [contentError, setContentError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/manufacturing")
      .then(async (response) => {
        if (!response.ok) throw new Error("Published manufacturing content could not be loaded.");
        return response.json() as Promise<ManufacturingContent>;
      })
      .then((data) => {
        if (active && Array.isArray(data.stages) && data.stages.length === 6) {
          const publishedProducts = Array.isArray(data.downstream) ? data.downstream : [];
          const downstream = [
            ...builtInContent.downstream.map((product) => publishedProducts.find((item) => item.id === product.id) ?? product),
            ...publishedProducts.filter((item) => !builtInContent.downstream.some((product) => product.id === item.id)),
          ];
          setContent({ ...builtInContent, ...data, downstream, media: { ...builtInContent.media, ...data.media } });
        }
      })
      .catch(() => {
        if (active) setContentError("Showing reviewed reference content. The live manufacturing content service is unavailable.");
      });
    return () => { active = false; };
  }, []);

  const onEnquiryClick = useCallback(() => {
    if (window.location.hash === "#enquiries") document.getElementById("enquiries")?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", onEnquiryClick);
    return () => window.removeEventListener("hashchange", onEnquiryClick);
  }, [onEnquiryClick]);

  return <main className="manufacturing-page">
    <ManufacturingHero content={content} />
    <nav className="manufacturing-subnav" aria-label="Manufacturing sections">
      <a href="#production-journey">Upstream production</a><a href="#quality">Quality assurance</a><a href="#steel-billets">Steel billets (downstream)</a><a href="#downstream">Downstream products</a><a href="#infrastructure">Infrastructure</a>
    </nav>
    {contentError && <p className="manufacturing-content-warning" role="status">{contentError}</p>}
    <section className="manufacturing-overview section-pad">
      <div className="section-index">01 / THE INTEGRATED MANUFACTURING MODEL</div><div className="manufacturing-overview-grid"><h2>Mineral resource.<br />Industrial <em>transformation.</em></h2><p>{content.valueStatement}</p></div>
      <div className="primary-output-statement"><span>PLANNED UPSTREAM OUTPUT</span><strong>IRON-BEARING RAW MATERIALS</strong><i aria-hidden="true" /></div>
    </section>
    <UpstreamFoundation />
    <ProcessJourney stages={content.stages} stageImages={content.media?.stageImages} />
    <QualityJourney quality={content.quality} stages={content.stages} />
    <BilletShowcase billet={content.billet} />
    <DownstreamValueChain products={content.downstream} />
    <SupportingManufacturing content={content} />
    <ManufacturingEnquiry note={content.approvalNote} />
  </main>;
}
