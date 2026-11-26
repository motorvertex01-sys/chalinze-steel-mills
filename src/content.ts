export type SitePage = {
  path: string;
  title: string;
  eyebrow: string;
  summary: string;
  layout?: "cards" | "editorial" | "split";
  sections: Array<{ title: string; body: string; tag?: string }>;
};

export const processStages = [
  {
    title: "Iron ore mining",
    status: "Planned upstream stage",
    description: "Extraction of iron-bearing minerals through open-pit or underground mining, including drilling, blasting, excavation, loading and haulage of run-of-mine (ROM) ore. Mine ownership, permits, reserves and supply are not confirmed.",
    input: "Natural iron-ore deposits (planned feed)",
    output: "Run-of-mine (ROM) iron ore",
    equipment: "Drilling rigs, excavators, loaders and haul trucks are the typical equipment class; mine and equipment details are not specified.",
    kind: "ore" as const,
  },
  {
    title: "Crushing & screening",
    status: "Planned upstream stage",
    description: "Reduction of the extracted ore into controlled particle sizes through primary, secondary and tertiary crushing, followed by screening and classification to produce a consistent feed for the selected processing route.",
    input: "ROM iron ore",
    output: "Crushed and screened iron ore of controlled size",
    equipment: "Jaw, gyratory and cone crushers with vibrating screens and classifiers; final selection is not confirmed.",
    kind: "process" as const,
  },
  {
    title: "Beneficiation & concentration",
    status: "Route to confirm",
    description: "Physical processing to improve iron content and reduce gangue and impurities through grinding, magnetic separation, gravity separation, flotation and other suitable technologies. The route depends on ore mineralogy.",
    input: "Crushed and screened iron ore",
    output: "Beneficiated iron ore concentrate",
    equipment: "SAG/ball mills and HPGR; magnetic, gravity and flotation separators. Technology selection is not finalised.",
    kind: "process" as const,
  },
  {
    title: "Dewatering & material handling",
    status: "Planned upstream stage",
    description: "Thickening, filtration, moisture control, stockpiling and blending to achieve consistent concentrate quality and prepare materials for subsequent processing.",
    input: "Wet beneficiated concentrate",
    output: "Dewatered, moisture-controlled concentrate",
    equipment: "Thickeners, filter presses and vacuum filters, with conveyors, stackers, reclaimers and feeders; capacities are not confirmed.",
    kind: "process" as const,
  },
  {
    title: "Agglomeration & pelletizing",
    status: "Route-dependent",
    description: "Conversion of fine iron ore concentrates into stronger, uniformly sized agglomerates through pelletising and induration, or sintering where the selected ironmaking route requires it. Not every ore or route requires agglomeration.",
    input: "Fine iron ore concentrate",
    output: "Iron ore pellets or sinter feed",
    equipment: "Disc/drum pelletisers and induration furnaces, or sintering machines where required; final configuration is not selected.",
    kind: "process" as const,
  },
  {
    title: "Stockpiling, blending & dispatch",
    status: "Planned upstream output",
    description: "Quality-controlled storage, blending, sampling and dispatch of prepared iron-bearing materials to downstream ironmaking facilities, which are not yet in operation. This marks the boundary where upstream ends and downstream begins.",
    input: "Prepared iron-bearing materials (lump ore, concentrate, sinter feed or pellets)",
    output: "Quality-controlled feedstock dispatched to downstream ironmaking",
    equipment: "Conveyors, stackers, reclaimers and feeders, with sampling systems, laboratories and analysers; capacities are representative only.",
    kind: "process" as const,
  },
] as const;

export const departments = [
  {
    name: "Manufacturing",
    links: [
      ["Integrated manufacturing overview", "/manufacturing"],
      ["Six-stage production journey", "/technology"],
      ["Plant infrastructure & utilities", "/infrastructure"],
      ["Quality & product inspection", "/manufacturing#quality"],
      ["Manufacturing FAQs", "/faqs"],
    ],
  },
  {
    name: "Company & project",
    links: [["Company overview", "/company"], ["Project overview", "/project"], ["Development roadmap", "/development"]],
  },
  {
    name: "Products & markets",
    links: [["Steel billets", "/products"], ["Markets & applications", "/markets"], ["Customer FAQs", "/faqs"]],
  },
  {
    name: "Responsible development",
    links: [["Sustainability & HSEC", "/sustainability"], ["Careers & skills", "/careers"]],
  },
  {
    name: "Corporate engagement",
    links: [["Investment & partnerships", "/investment"], ["News & media", "/news"], ["Contact & office", "/contact"]],
  },
] as const;

export const contactDetails = {
  companyName: "Chalinze Steel Mills Ltd",
  officeAddress: [
    "Morocco Square, Exchange Tower",
    "Mwai Kibaki Road / New Bagamoyo Road",
    "P.O. Box 5497",
    "Dar es Salaam, Tanzania",
  ],
  addressVariant: "The company should confirm the exact office address before visitors travel.",
  phones: ["+255 735 283 711", "+255 735 283 712", "+255 713 283 711"],
  whatsapp: "+255 752 283 711",
  email: "ceo@chalinzesteelmills.co.tz",
  website: "https://chalinze-steel-mills.motorvertex01.workers.dev",
  officeMap: "https://maps.app.goo.gl/3wb3PRXCqLbRXgo3A",
  siteAddress: "Vigwaza area / Vigwaza Dry Port, Chalinze District, Pwani Region, Tanzania (planned manufacturing project location; exact site address not supplied).",
  siteMap: "https://maps.app.goo.gl/mUPLZc5SQGWxgd46A?g_st=aw",
  officeHours: "Monday–Friday, 8:00 a.m.–5:00 p.m. East Africa Time. Weekends and public holidays: closed. Meetings by prior appointment.",
  sourceNote: "For meetings and deliveries, please confirm the current contact and address details with the company.",
} as const;

export const enquiryTypes = [
  { label: "Product & billet enquiries", subject: "Steel billet product enquiry" },
  { label: "Technical & quality information", subject: "Technical and quality information request" },
  { label: "Engineering & technology partnership", subject: "Engineering and technology partnership" },
  { label: "Investment & finance", subject: "Investment and finance enquiry" },
  { label: "EPC & supplier registration", subject: "EPC and supplier enquiry" },
  { label: "Careers & recruitment", subject: "Careers and recruitment enquiry" },
  { label: "Media & corporate communications", subject: "Media and corporate communications" },
  { label: "General enquiries", subject: "General enquiry" },
] as const;

export const faqs = [
  {
    question: "What does Chalinze Steel Mills Ltd plan to produce?",
    answer: "The proposed upstream foundation is iron ore mining, preparation and quality-controlled dispatch of iron-bearing feedstock. The broader integrated project also describes downstream ironmaking, steelmaking and billet casting; none of these project facilities is presented as currently operating. Finished rebar and other rolled products are potential applications at separate downstream facilities.",
  },
  {
    question: "What is a steel billet?",
    answer: "A steel billet is a semi-finished steel product intended as feedstock for downstream steel processing, including rolling and other manufacturing. Finished reinforcement bars, coils and structural sections are not represented here as products made by Chalinze Steel Mills Ltd.",
  },
  {
    question: "What is the difference between ROM iron ore and a steel billet?",
    answer: "ROM iron ore is the unprocessed mineral feed identified at the start of the proposed value chain. A steel billet is a semi-finished steel product formed after the planned ironmaking, steelmaking and casting stages.",
  },
  {
    question: "Which billet cross-sections are planned?",
    answer: "The document lists planned square cross-sections of 130 × 130 mm and 150 × 150 mm. Confirm these against the latest approved product specifications before treating them as definitive sale specifications. Billet length, grade, chemistry, tolerances and mechanical properties were not supplied.",
  },
  {
    question: "Who may use the planned billets?",
    answer: "The document identifies downstream steel processors, including rolling mills and manufacturers serving construction, infrastructure, engineering and industrial applications, as target customer segments. These are intended markets, not confirmed buyers.",
  },
  {
    question: "How do I request product or technical information?",
    answer: "Use the product enquiry or email links on the Contact page. They open your email application; this website does not collect or store enquiry form submissions.",
  },
  {
    question: "How can a supplier or EPC company contact Chalinze Steel Mills?",
    answer: "Supplier, engineering, equipment and EPC enquiries are welcome through the partnership email action or listed telephone numbers. A procurement registration portal is not currently available.",
  },
  {
    question: "How can an investor request information?",
    answer: "Investor and financing enquiries can be directed to the corporate email and telephone contacts listed on this site. No private investor documents or investor account system are available through this public website.",
  },
  {
    question: "Where is the corporate contact office?",
    answer: "The document's contact section lists Morocco Square, Exchange Tower, Mwai Kibaki Road / New Bagamoyo Road, P.O. Box 5497, Dar es Salaam. Another headquarters paragraph gives a different floor and street spelling; verify the address variant shown on the Contact page before relying on it.",
  },
  {
    question: "Where is the planned manufacturing project?",
    answer: "The planned manufacturing project is identified in the Vigwaza area near Vigwaza Dry Port, Chalinze District, Pwani Region. It is separate from the Dar es Salaam corporate contact office; an exact site address was not supplied.",
  },
  {
    question: "What is the approved production capacity?",
    answer: "Current planning material lists a proposed Phase 1 capacity of 1,000,000 tonnes per annum (1.0 MTPA), while an earlier project diagram states 1.2 million TPA. The approved capacity basis remains unresolved.",
  },
  {
    question: "Which ironmaking technology will the project use?",
    answer: "Project descriptions differ: one describes natural-gas-based DRI, while another refers to electric ironmaking. The selected route remains unresolved and requires technical confirmation.",
  },
] as const;

export const pages: SitePage[] = [
  {
    path: "/company",
    title: "The company behind the steel.",
    eyebrow: "Company",
    summary: "Chalinze Steel Mills Ltd is a Tanzanian registered company developing the upstream foundation of a proposed integrated iron-and-steel project: mining, preparing and quality-controlling iron-bearing materials for later ironmaking and steel production.",
    sections: [
      { title: "Who we are", body: "Chalinze Steel Mills Ltd is a Tanzanian registered company developing an integrated iron-and-steel project. Its foundational upstream focus is iron ore mining, preparation and quality-controlled iron-bearing feedstock; downstream ironmaking and steelmaking are planned parts of the wider value chain, not current operations.", tag: "Upstream foundation · integrated project" },
      { title: "Ownership & group relationship", body: "Chalinze Steel Mills Ltd is a wholly owned subsidiary of GYPSUM Plus Mines Ltd.", tag: "Group structure" },
      { title: "Our vision", body: "To establish a competitive, efficient and sustainable steel business serving Tanzania and regional markets.", tag: "Vision" },
      { title: "Our mission", body: "To develop an integrated operation through modern technology, skills development, strategic partnership and responsible practice.", tag: "Mission" },
      { title: "Strategic priorities", body: "Local value creation, regional market development, technology transfer, employment and skills development, and responsible industrial growth.", tag: "Corporate priorities" },
      { title: "Business philosophy", body: "Integration across the value chain, technical discipline in design and execution, and commercial competitiveness guide the project approach.", tag: "Integration · discipline · competitiveness" },
      { title: "Strategic cooperation & responsible development", body: "The company’s approach emphasizes cooperation with investors, technology providers, customers and development partners, alongside responsible environmental, social, safety and governance planning.", tag: "Partnership · responsibility" },
      { title: "Governance & leadership", body: "The Board of Directors, Senior Management Team and Supporting Staff are presented in the Leadership & Governance section.", tag: "Company structure" },
    ],
  },
  {
    path: "/project",
    title: "A project built for scale.",
    eyebrow: "Project development",
    summary: "A proposed integrated iron-and-steel development at Vigwaza, with upstream mining and iron-ore preparation as the raw-material foundation for planned downstream ironmaking, steelmaking and billet casting.",
    sections: [
      { title: "Project scope", body: "The integrated project concept connects iron ore mining, handling, preparation and quality-controlled feedstock with downstream ironmaking, steelmaking and continuous casting. Upstream operations establish the mineral-to-feedstock foundation; downstream stages and billet production remain planned elements of the wider project, not current operations.", tag: "Proposed integrated development" },
      { title: "Planned site", body: "The project is identified in Vigwaza, Chalinze District, Pwani Region, near the Vigwaza Dry Port. Road and MGR/SGR rail corridors are discussed as connectivity context; exact site boundaries and a confirmed rail connection are not supplied.", tag: "Planned location · Vigwaza" },
      { title: "Phase 1 & expansion", body: "Current planning material proposes a Phase 1 steel-billet capacity of 1,000,000 tonnes per annum (1.0 MTPA), while an earlier project diagram states 1.2 million TPA. The approved capacity basis remains unresolved. These are planning references, not installed or operating capacity.", tag: "Proposed downstream capacity · basis unresolved" },
      { title: "Raw materials", body: "Tanzanian ROM iron ore is identified as the planned primary input. The company narrative associates the ore resource with GYPSUM Plus Mines Ltd. Specific mine permits, assay data, reserves, supply quantities and commercial agreements are not included.", tag: "Supply evidence not supplied" },
      { title: "Utilities & services", body: "The document’s design-basis table lists national-grid hydropower as primary electricity, natural-gas captive generation as backup/support, recycled process water with make-up supply, an on-site oxygen plant and compressor station, limestone and dolomite fluxes, closed-loop cooling, and heat recovery where feasible. These are planned design-basis items, not verified installed services.", tag: "Proposed utility basis" },
      { title: "Roadmap & readiness", body: "Development areas include engineering, environmental/regulatory approvals, financing, EPC, installation, testing, commissioning and operational readiness. The document does not provide independently verified dates or completed milestones.", tag: "No approved progress dates" },
    ],
  },
  {
    path: "/manufacturing",
    title: "The upstream foundation of steel.",
    eyebrow: "Iron ore & manufacturing",
    summary: "Explore how mining, ore preparation and quality-controlled iron-bearing feedstock form the upstream foundation for the proposed integrated iron-and-steel project. Later ironmaking, steelmaking and billet casting are downstream stages, not current operations.",
    sections: [
      { title: "Upstream process overview", body: "The upstream chain covers mining, crushing and screening, route-dependent beneficiation, dewatering and material handling, optional agglomeration, then stockpiling, blending and dispatch of prepared iron-bearing feedstock.", tag: "Foundational planned scope" },
      { title: "Process status", body: "The manufacturing line is a development concept. The supplied files do not establish that the proposed plant, process lines or equipment are installed or operating.", tag: "Not an operating facility claim" },
      { title: "Design dependencies", body: "Beneficiation depends on mineralogical characterisation and metallurgical testing. Agglomeration is not required for every ore or ironmaking route. The selected downstream ironmaking technology and proposed billet capacity also require confirmation.", tag: "Open engineering decisions" },
    ],
  },
  {
    path: "/technology",
    title: "From mineral to material.",
    eyebrow: "Manufacturing process",
    summary: "Explore six proposed upstream stages from run-of-mine ore to prepared iron-bearing feedstock. Downstream ironmaking, steelmaking and billets are the intended integrated-project impact; route selection, capacity and equipment remain subject to technical confirmation.",
    sections: [
      { title: "Mining, crushing & screening", body: "Run-of-mine ore is extracted, crushed and screened into controlled particle sizes for the selected processing route. Mine details, throughput and product-size targets are not supplied.", tag: "Upstream · planned" },
      { title: "Beneficiation & concentration", body: "Grinding and suitable separation methods may improve iron content and reduce gangue. Mineralogical characterisation and metallurgical testing must determine the route; no recovery or concentrate grade is claimed.", tag: "Route to confirm" },
      { title: "Dewatering & agglomeration", body: "Concentrate may be thickened, filtered and blended. Pelletizing or sintering is conditional: not every deposit or ironmaking technology requires the same agglomeration stage.", tag: "Route-dependent" },
      { title: "Downstream process boundary", body: "Prepared feedstock may supply later ironmaking, steelmaking and continuous casting to produce billets. Project materials describe differing ironmaking routes; technology, configuration and capacity remain unresolved.", tag: "Integrated-project impact · not operating" },
    ],
  },
  {
    path: "/products",
    title: "Upstream feedstock. Downstream steel products.",
    eyebrow: "Products",
    summary: "Upstream iron-bearing feedstock is the project's raw-material foundation. Planned downstream steel billets and examples such as rebar, wire rod and structural sections describe the integrated project's potential impact—not products currently manufactured by Chalinze.",
    sections: [
      { title: "Upstream raw-material outputs", body: "Depending on ore characteristics and the selected route, upstream preparation may produce calibrated lump ore, beneficiated iron-ore concentrate, sinter feed or iron-ore pellets. The project's feedstock specifications and route have not been confirmed.", tag: "Planned upstream output · specifications pending" },
      { title: "Steel billets — integrated-project downstream", body: "Planning materials identify steel billets as a proposed downstream output after ironmaking, steelmaking and continuous casting. Two nominal cross-sections (130 × 130 mm and 150 × 150 mm) appear in project materials; final specifications and the approved capacity basis remain unresolved.", tag: "Planned downstream output · not in production" },
      { title: "Primary downstream products — steel rolling", body: "At separate downstream facilities, billets may be rolled into reinforcement bars, structural steel sections, wire rods, round bars, and flat or square bars. These examples show potential industrial applications of the integrated project; they are not confirmed Chalinze products or facilities.", tag: "Illustrative downstream applications" },
      { title: "Secondary downstream products — further processing", body: "Primary rolled products may be processed further into drawn wire, nails, binding wire, fencing, welded wire mesh and fasteners. These examples illustrate broader downstream value addition; they do not necessarily use billets directly and are not confirmed Chalinze manufacturing commitments.", tag: "Further processing · industry opportunity" },
    ],
  },
  {
    path: "/quality",
    title: "Quality You Can Trust",
    eyebrow: "Quality & technology",
    summary: "The proposed quality approach covers material testing, process monitoring, metallurgical analysis and product inspection.",
    sections: [
      { title: "Raw-material testing", body: "The proposed quality framework starts with verification of iron ore characteristics and composition. No laboratory results, assays or test certificates were supplied.", tag: "Planned quality activity" },
      { title: "Process monitoring", body: "The document describes monitoring operating parameters across iron and steel production. The controls, instrumentation and operating procedures are not documented as commissioned.", tag: "Planned control approach" },
      { title: "Metallurgical analysis", body: "Testing of steel composition and physical properties is identified as a quality activity. No grade limits, results, tolerances or test methods were provided.", tag: "Specifications not supplied" },
      { title: "Final billet inspection", body: "Final inspection is described as a way to check billets against customer requirements and applicable standards. No applicable standard numbers, certifications or verified inspection programme were supplied.", tag: "No certification claim" },
      { title: "Safety & operational excellence", body: "The document includes occupational health and safety, emergency preparedness, risk management, ethical practice and continuous improvement as planned management themes. Approved policies and operational records are still required.", tag: "Policy evidence pending" },
    ],
  },
  {
    path: "/infrastructure",
    title: "Systems that move industry.",
    eyebrow: "Plant & infrastructure",
    summary: "Planned upstream mining and ore preparation depend on materials handling, utilities and logistics at the proposed Vigwaza site; the wider integrated project also includes downstream processing, with connections and services still to be confirmed.",
    sections: [
      { title: "Plant configuration", body: "The proposed configuration starts with ROM-ore reception, crushing, beneficiation, dewatering, stockpiling and feedstock dispatch. These upstream facilities form the material foundation for the planned downstream ironmaking, steelmaking and billet-casting chain. No approved general arrangement or as-built drawing is supplied.", tag: "Proposed integrated configuration" },
      { title: "Utility design basis", body: "The project material cites national-grid electricity and the Julius Nyerere Hydropower Project as power context, with natural-gas generation as backup/support. Recycled process water, make-up supply, oxygen and compressed-air systems, fluxes, closed-loop cooling and heat recovery are also design-basis items; no utility connection or supply agreement is evidenced.", tag: "Planned utility basis · not commissioned" },
      { title: "Automation & digital control", body: "Automation, process monitoring, smart manufacturing, predictive maintenance, digital quality management and information security are identified as proposed development themes.", tag: "Planned digital systems" },
      { title: "Transport & logistics", body: "The planned site is described near Vigwaza Dry Port, with the National Trunk Road Network and MGR/SGR railway corridors discussed as connectivity context. No secured rail connection, port access arrangement or logistics contract is confirmed.", tag: "Connectivity context · not secured" },
      { title: "Environmental management", body: "Environmental management systems, water and resource management, waste, climate and carbon considerations are included in the proposed plant and HSEC planning scope.", tag: "Plans and permits not supplied" },
    ],
  },
  {
    path: "/sustainability",
    title: "Responsible development and energy management.",
    eyebrow: "Sustainability & HSEC",
    summary: "Responsible development applies across the upstream mining and ore-preparation foundation and the proposed downstream steel value chain; plans and performance evidence remain in development.",
    sections: [
      { title: "Low-carbon ambition", body: "Low-carbon steel is a project and brand ambition. Measured emissions intensity, reduction baselines, verified product-footprint results and environmental certification have not been provided.", tag: "Ambition, not measured performance" },
      { title: "Energy management & carbon reduction", body: "Energy efficiency, responsible energy management and CO₂ reduction are integral to the proposed operating strategy. The planned energy system combines Julius Nyerere Hydropower Project (JNHPP) renewable electricity with natural gas, supported by energy-efficient technologies, waste heat recovery and continuous monitoring of energy consumption. The project will establish measurable energy-intensity and greenhouse-gas emissions indicators to guide operational performance, improve efficiency and support long-term carbon-management objectives.", tag: "Proposed strategy · not an operating result" },
      { title: "Environmental & resource management", body: "Environmental assessment and management planning, responsible water use, recycled process water, resource utilisation, waste management, monitoring and regulatory compliance are identified as development topics.", tag: "Planned management framework" },
      { title: "Health & safety", body: "Occupational health, industrial safety culture, emergency preparedness and response are included in the proposed HSEC framework. No safety performance statistics or certifications are supplied.", tag: "No operating metrics supplied" },
      { title: "Community, skills & shared value", body: "The document discusses stakeholder engagement, community development, local employment, training, women and youth inclusion, local enterprise and education as potential CSR/shared-value programmes.", tag: "Programme details require approval" },
      { title: "Governance & ESG", body: "Governance, ethical business, risk management, ESG integration, environmental and social monitoring, and accountability are described as project priorities. No ESG score or completed assessment is claimed.", tag: "Framework under development" },
    ],
  },
  {
    path: "/investment",
    title: "Building partnerships for progress.",
    eyebrow: "Investors & partnerships",
    summary: "The investment case starts with upstream mineral development and feedstock preparation, with integrated downstream steelmaking and wider industrial value addition as potential project impacts—not secured commitments.",
    sections: [
      { title: "Investment rationale", body: "The project rationale begins with local mineral value addition through mining and preparation of iron-bearing feedstock. Planned downstream ironmaking, steelmaking and billet casting could extend this foundation into domestic steel supply and further industrial opportunities; benefits are potential, not achieved results.", tag: "Upstream foundation · downstream impact" },
      { title: "Potential financing approaches", body: "Equity investment, senior debt, export credit and development-finance participation are discussed as potential financing approaches. No financing is represented as secured or approved.", tag: "Options, not commitments" },
      { title: "Technology & EPC partnerships", body: "Potential partners include DRI and steelmaking technology providers, engineering firms, equipment manufacturers and EPC contractors. The unresolved ironmaking route remains a prerequisite for definitive technology selection.", tag: "Potential collaboration" },
      { title: "Industrial & offtake partners", body: "The document invites industrial and commercial collaboration, including potential downstream offtake and distribution relationships. No named investor, customer, supplier or offtake contract is confirmed.", tag: "No partners implied" },
      { title: "Investor information", body: "The public site provides general project information and corporate contacts. Confidential investor materials require a secure server-side access system; none are exposed by this site.", tag: "Private portal not configured" },
    ],
  },
  {
    path: "/markets",
    title: "Connecting regional demand.",
    eyebrow: "Markets & applications",
    summary: "Markets and applications describe how prepared upstream iron-bearing feedstock could support planned downstream billet production and a wider steel industry in Tanzania and regional markets.",
    sections: [
      { title: "Tanzania", body: "Tanzania is the home market and industrial context for the proposed project. Import substitution and domestic supply are strategic rationale, not measured sales or achieved import savings.", tag: "Target market" },
      { title: "Regional markets", body: "The document refers to East and Central African markets and broader opportunities through EAC, SADC and AfCFTA. These are target-market ambitions; no current exports or customer territories are claimed.", tag: "Market ambition" },
      { title: "Steel rolling mills", body: "Rolling mills are potential downstream users of billets that could be produced by the integrated project after feedstock preparation, ironmaking, steelmaking and casting. No named mill, buyer or supply relationship is confirmed.", tag: "Potential downstream segment" },
      { title: "Construction & infrastructure", body: "The document links downstream steel applications to construction and public infrastructure. Reinforcement bars and structural sections are examples of further-processed products, not claimed direct company output.", tag: "Downstream use case" },
      { title: "Energy, mining & industry", body: "Energy projects, mining and mineral processing, manufacturing, industrial fabrication and engineering are potential demand areas.", tag: "Potential applications" },
      { title: "Distribution & commercial approach", body: "The document discusses customer support, distribution and export development as future commercial strategy areas. Pricing, minimum order quantities, current stock, supply terms and delivery commitments are not provided.", tag: "Commercial details pending" },
    ],
  },
  {
    path: "/development",
    title: "A disciplined path to delivery.",
    eyebrow: "Project roadmap",
    summary: "The development roadmap covers upstream resource and processing definition alongside the later integrated downstream project stages; approvals, financing, engineering and readiness remain to be confirmed.",
    sections: [
      { title: "Engineering & technical development", body: "Project definition, process route selection, plant design and technical partnerships are identified as development activities. The capacity and ironmaking route need formal resolution.", tag: "Stage — no completion date supplied" },
      { title: "Environmental & regulatory approvals", body: "The document describes environmental and social assessment, management planning, stakeholder engagement, regulatory compliance and monitoring. No approvals or permits are evidenced here.", tag: "Approval status not supplied" },
      { title: "Financing & investment", body: "Financing discussions and investment structure development are roadmap themes. No funding amount, close, investor commitment or financing date is claimed.", tag: "Status not supplied" },
      { title: "EPC & implementation", body: "EPC delivery, construction planning, site infrastructure, equipment procurement and installation are identified as implementation stages. No construction progress is independently verified.", tag: "Status not supplied" },
      { title: "Testing & operational readiness", body: "Testing, commissioning, workforce readiness, operational systems and commercial operations appear in the roadmap. No commissioning date or current production claim is made.", tag: "Future stage" },
    ],
  },
  {
    path: "/news",
    title: "News & media",
    eyebrow: "Company newsroom",
    summary: "Company announcements, project updates and approved company-owned media in one place. News is published only after verification and authorization.",
    sections: [
      { title: "Corporate news & press releases", body: "Corporate announcements, press releases and executive communications are identified as future publishing categories. No articles, issue dates or quotations have been invented.", tag: "No approved articles supplied" },
      { title: "Project progress", body: "The document calls for project updates but does not provide verified construction percentages, milestones, commissioning dates or operating results.", tag: "Progress evidence required" },
      { title: "Events & media centre", body: "Events, conferences, company-approved photography and video, media requests and corporate publications are identified as communications topics. No press kit or event schedule was supplied.", tag: "Media assets pending" },
      { title: "Editorial governance", body: "Company announcements and events are published only after authorized review against current company information.", tag: "Company communications" },
    ],
  },
  {
    path: "/careers",
    title: "Skills for a stronger future.",
    eyebrow: "Careers & talent",
    summary: "Mining, mineral processing and the wider integrated steel value chain may create future skills needs. This describes project potential, not current operations or approved vacancies.",
    sections: [
      { title: "Potential career areas", body: "The document names engineering, metallurgy, mining, automation, environment, finance, procurement, administration, IT, project management and industrial operations as areas where future opportunities may arise.", tag: "Potential areas, not vacancies" },
      { title: "Graduate & skills development", body: "Graduate programmes, apprenticeships, internships, training, professional development and leadership development are described as potential people-development themes.", tag: "Programme status not supplied" },
      { title: "Inclusion & wellbeing", body: "The document discusses diversity, equity and inclusion, women and youth participation, wellbeing, recognition and career growth as workforce themes.", tag: "Policy approval required" },
      { title: "Current vacancies", body: "No approved job descriptions or live vacancy notices were supplied. No applications or CVs are collected by this website.", tag: "No vacancies published" },
    ],
  },
  {
    path: "/faqs",
    title: "Clear answers for customers.",
    eyebrow: "Customer information",
    summary: "Answers explain the upstream mining and feedstock objective, the planned downstream project impact, and technical details that still require confirmation.",
    sections: [
      { title: "Upstream output & downstream products", body: "The upstream objective is to prepare iron-bearing materials such as calibrated lump ore, concentrate, sinter feed or pellets, depending on ore and process selection. Billets are described in planning material as a later integrated-project output; finished bars and other rolled products are illustrative downstream applications.", tag: "See Products" },
      { title: "Markets & supply", body: "Rolling mills and industries such as construction, infrastructure, energy, mining and manufacturing are potential downstream applications. They are not confirmed customers or active supply territories.", tag: "See Markets" },
      { title: "Contact & office", body: "Telephone, WhatsApp, CEO email, postal address and office hours are listed on the Contact page. Confirm the office address before visiting.", tag: "See Contact" },
      { title: "Technical decisions", body: "The production capacity and ironmaking route are unresolved in the source. The public website identifies both conflicts rather than presenting a single unconfirmed answer.", tag: "See Project" },
    ],
  },
  {
    path: "/contact",
    title: "Talk to the right team.",
    eyebrow: "Contact & corporate office",
    summary: "Contact Chalinze Steel Mills Ltd about its planned upstream mining and iron-ore preparation project, integrated downstream development, partnerships or corporate enquiries.",
    sections: [
      { title: "Corporate office", body: "Morocco Square, Exchange Tower, Mwai Kibaki Road / New Bagamoyo Road, P.O. Box 5497, Dar es Salaam, Tanzania. A different headquarters description elsewhere in the document gives another floor/street spelling; see the contact notice.", tag: "Company document · Section 24.2" },
      { title: "Telephone & WhatsApp", body: "Telephone: +255 735 283 711, +255 735 283 712 and +255 713 283 711. WhatsApp: +255 752 283 711.", tag: "Company document · Section 24.2" },
      { title: "Email & website", body: "CEO/corporate email: ceo@chalinzesteelmills.co.tz. Current website: chalinze-steel-mills.motorvertex01.workers.dev.", tag: "Corporate contact" },
      { title: "Office hours", body: "Monday–Friday, 8:00 a.m.–5:00 p.m. East Africa Time; Saturday, Sunday and public holidays closed. Meetings are by prior appointment.", tag: "Company document · Section 24.10" },
      { title: "Planned project site", body: "The document identifies Vigwaza area / Vigwaza Dry Port, Chalinze District, Pwani Region as the planned manufacturing location. This is not the corporate contact office.", tag: "Project location · confirmation required" },
    ],
  },
];
