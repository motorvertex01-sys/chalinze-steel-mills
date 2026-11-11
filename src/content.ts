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
    title: "ROM iron ore",
    status: "Planned project stage",
    description: "The company document describes Tanzanian run-of-mine iron ore as the starting material for the proposed integrated value chain. The document associates the mineral resource with GYPSUM Plus Mines Ltd; mine permits, assays, reserves and supply agreements are not provided.",
    input: "Tanzanian ROM iron ore (planned feed)",
    output: "ROM ore for preparation",
    equipment: "Mining, reception and handling systems are in the project concept; mine and equipment details are not specified.",
    kind: "ore" as const,
  },
  {
    title: "Beneficiation & feed preparation",
    status: "Planned project stage",
    description: "The document includes iron-ore processing and beneficiation, followed by preparation of iron feedstock. Agglomeration is identified as design-dependent. No process recovery, concentrate grade or operating conditions are published.",
    input: "ROM ore",
    output: "Prepared iron feedstock / concentrate (design details pending)",
    equipment: "Beneficiation plant and feed preparation systems are planned; specific machinery is not confirmed.",
    kind: "process" as const,
  },
  {
    title: "Ironmaking",
    status: "Technology route to confirm",
    description: "Natural-gas-based Direct Reduced Iron (DRI) is described in the main project narrative. Other process material describes electric ironmaking. These are conflicting route descriptions and cannot be combined into one approved design.",
    input: "Prepared iron feed; natural gas is cited in the DRI option",
    output: "Iron units for steelmaking (route-dependent)",
    equipment: "DRI equipment is discussed as a technology collaboration area; the final route and equipment are unconfirmed.",
    kind: "process" as const,
  },
  {
    title: "Steelmaking",
    status: "Planned project stage",
    description: "The company document describes Electric Arc Furnace steelmaking and molten-steel refining in the proposed route. Furnace selection, refining configuration, operating data and capacity require approved engineering confirmation.",
    input: "Iron units; the utility basis also lists oxygen and fluxes",
    output: "Liquid steel for casting",
    equipment: "Electric Arc Furnace is the described steelmaking concept; installation or operation is not claimed.",
    kind: "process" as const,
  },
  {
    title: "Continuous casting",
    status: "Planned project stage",
    description: "Continuous casting is the proposed way to form steel into billet sections. The brief identifies planned billet cross-sections of 130 × 130 mm and 150 × 150 mm. Machine design and casting performance are not provided.",
    input: "Liquid steel",
    output: "Cast steel billets",
    equipment: "Continuous casting systems are planned; no installed equipment is represented.",
    kind: "billet" as const,
  },
  {
    title: "Billets, inspection & dispatch",
    status: "Planned product",
    description: "Billets are the principal planned product and intermediate feedstock for downstream steel manufacturers. The document discusses inspection, storage, logistics and dispatch but supplies no grades, chemistry, tolerances, lengths, certifications, current stock or delivery commitments.",
    input: "Cast billet sections",
    output: "Billets for potential downstream rolling and manufacturing",
    equipment: "Cooling, inspection, storage and handling systems are in the proposed scope; operating status is not supplied.",
    kind: "billet" as const,
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
  addressVariant: "A separate headquarters paragraph in the source gives another variant: “8th Floor, Morocco Squire, Mwaki Road, Kinondoni District.” The two address descriptions differ.",
  phones: ["+255 735 283 711", "+255 735 283 712", "+255 713 283 711"],
  whatsapp: "+255 752 283 711",
  email: "ceo@chalinzesteelmills.co.tz",
  website: "https://chalinzesteelmills.co.tz",
  officeMap: "https://maps.app.goo.gl/3wb3PRXCqLbRXgo3A",
  siteAddress: "Vigwaza area / Vigwaza Dry Port, Chalinze District, Pwani Region, Tanzania (planned manufacturing project location; exact site address not supplied).",
  siteMap: "https://maps.app.goo.gl/mUPLZc5SQGWxgd46A?g_st=aw",
  officeHours: "Monday–Friday, 8:00 a.m.–5:00 p.m. East Africa Time. Weekends and public holidays: closed. Meetings by prior appointment.",
  sourceNote: "Corporate contact details transcribed from Sections 24.1–24.10 of the supplied Chalinze company document.",
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
    question: "What does Chalinze Steel Mills Ltd plan to manufacture?",
    answer: "The supplied company document identifies steel billets as the principal planned product of a proposed integrated ROM iron ore-to-steel project. It does not establish that the plant is currently operating.",
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
    question: "Which billet cross-sections are listed in the company document?",
    answer: "The document lists planned square cross-sections of 130 × 130 mm and 150 × 150 mm. Confirm these against the latest approved product specifications before treating them as definitive sale specifications. Billet length, grade, chemistry, tolerances and mechanical properties were not supplied.",
  },
  {
    question: "Who may use the planned billets?",
    answer: "The document identifies downstream steel processors, including rolling mills and manufacturers serving construction, infrastructure, engineering and industrial applications, as target customer segments. These are intended markets, not confirmed buyers.",
  },
  {
    question: "How do I request product or technical information?",
    answer: "Use the product enquiry or email links on the Contact page. They open your email application addressed to the contact email published in the supplied company document. No website form submission is claimed.",
  },
  {
    question: "How can a supplier or EPC company contact Chalinze Steel Mills?",
    answer: "The company document invites supplier, engineering, equipment and EPC enquiries. Use the supplier/partnership email action or the listed telephone numbers. No procurement registration portal is currently configured.",
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
    answer: "The main project narrative describes natural-gas-based DRI, while other material refers to electric ironmaking. The selected route is not resolved in the source documents and requires technical confirmation.",
  },
] as const;

export const pages: SitePage[] = [
  {
    path: "/company",
    title: "The company behind the name.",
    eyebrow: "Company",
    summary: "Chalinze Steel Mills Ltd is a Tanzanian company focused on developing an integrated iron ore mining and steel manufacturing operation, from run-of-mine iron ore to high-quality steel billets.",
    sections: [
      { title: "WHO WE ARE — The Company Behind the Steel.", body: "Chalinze Steel Mills Ltd is a Tanzanian company focused on developing an integrated iron ore mining and steel manufacturing operation, from run-of-mine iron ore to high-quality steel billets.", tag: "Company overview" },
      { title: "Ownership & group relationship", body: "The supplied company document states that Chalinze Steel Mills Ltd is a wholly owned subsidiary of GYPSUM Plus Mines Ltd.", tag: "Ownership statement · source-reported" },
      { title: "Vision & mission", body: "The company’s stated vision is to establish a competitive, efficient and sustainable steel manufacturing business serving Tanzania and regional markets. Its mission emphasizes modern technology, skills development, partnership and responsible practices.", tag: "Company document · Section 4.2" },
      { title: "Corporate objectives", body: "The company document identifies local value creation, regional market development, technology transfer, employment and skills development, and sustainable industrial growth among the company’s objectives.", tag: "Company document · Sections 2 and 7" },
      { title: "Governance & leadership", body: "The Board of Directors, Senior Management Team and Supporting Staff are presented in the Leadership & Governance section.", tag: "Company structure" },
    ],
  },
  {
    path: "/project",
    title: "A project built for scale.",
    eyebrow: "Project development",
    summary: "A proposed, fully integrated industrial development linking Tanzania’s iron ore resources with primary steel billet manufacturing at Vigwaza Dry Port Area, Chalinze District, Pwani Region.",
    sections: [
      { title: "Project scope", body: "Designed as a single, fully integrated industrial development, the project is planned to encompass iron ore mining, raw-material handling, processing and primary steel billet manufacturing, together with utilities, automation and environmental management. The project remains in development and is not yet operational.", tag: "Planned development" },
      { title: "Planned site", body: "The project is identified in Vigwaza, Chalinze District, Pwani Region, near the Vigwaza Dry Port. Road and MGR/SGR rail corridors are discussed as connectivity context; exact site boundaries and a confirmed rail connection are not supplied.", tag: "Planned location · Vigwaza" },
      { title: "Phase 1 & expansion", body: "Current planning material proposes a Phase 1 production capacity of 1,000,000 tonnes per annum (1.0 MTPA), with a possible later expansion. An earlier project diagram states 1.2 million TPA, so the approved capacity basis remains unresolved. No installed or operational production capacity is claimed.", tag: "Proposed capacity · source discrepancy" },
      { title: "Raw materials", body: "Tanzanian ROM iron ore is identified as the planned primary input. The company narrative associates the ore resource with GYPSUM Plus Mines Ltd. Specific mine permits, assay data, reserves, supply quantities and commercial agreements are not included.", tag: "Supply evidence not supplied" },
      { title: "Utilities & services", body: "The document’s design-basis table lists national-grid hydropower as primary electricity, natural-gas captive generation as backup/support, recycled process water with make-up supply, an on-site oxygen plant and compressor station, limestone and dolomite fluxes, closed-loop cooling, and heat recovery where feasible. These are planned design-basis items, not verified installed services.", tag: "Proposed utility basis" },
      { title: "Roadmap & readiness", body: "Development areas include engineering, environmental/regulatory approvals, financing, EPC, installation, testing, commissioning and operational readiness. The document does not provide independently verified dates or completed milestones.", tag: "No approved progress dates" },
    ],
  },
  {
    path: "/manufacturing",
    title: "A connected manufacturing journey.",
    eyebrow: "Manufacturing",
    summary: "Explore the proposed ROM iron ore-to-steel billet value chain, with each stage labelled by its documented project status.",
    sections: [
      { title: "Integrated process overview", body: "The company document sets out ROM iron ore reception and handling, beneficiation, prepared feedstock, iron production, steelmaking, continuous casting, product quality, and downstream billet applications.", tag: "Proposed process" },
      { title: "Process status", body: "The manufacturing line is a development concept. The supplied files do not establish that the proposed plant, process lines or equipment are installed or operating.", tag: "Not an operating facility claim" },
      { title: "Design dependencies", body: "Agglomeration depends on the selected process. The ironmaking route is disputed in the source material, and capacity is stated both as 1,000,000 and 1,200,000 tonnes per annum.", tag: "Open engineering decisions" },
    ],
  },
  {
    path: "/technology",
    title: "From mineral to material.",
    eyebrow: "Manufacturing process",
    summary: "Explore six proposed stages from ROM iron ore to billets. Technical route, capacity and equipment details remain subject to approved engineering confirmation.",
    sections: [
      { title: "ROM ore & beneficiation", body: "The project begins with Tanzanian ROM iron ore, followed by processing, beneficiation and iron feedstock preparation. No ore assays, recovery yields or equipment performance data were supplied.", tag: "Planned stages" },
      { title: "Ironmaking route", body: "The main project narrative describes natural-gas-based DRI; an alternate process diagram describes electric ironmaking. These descriptions conflict and the selected route remains unconfirmed.", tag: "Open engineering decision" },
      { title: "Steelmaking & casting", body: "Electric Arc Furnace steelmaking and continuous casting are described as planned stages. Furnace specifications, operating parameters, casting throughput and commissioning status are not provided.", tag: "Planned stages" },
      { title: "Process control & digital systems", body: "The document discusses automation, industrial control, smart manufacturing, data-driven decisions, predictive maintenance, digital quality management and information security as planned technology themes.", tag: "Technology vision, not operational claims" },
    ],
  },
  {
    path: "/products",
    title: "Steel, shaped with intent.",
    eyebrow: "Products",
    summary: "Steel billets are the principal planned product. Explore the two cross-sections listed in the company document.",
    sections: [
      { title: "130 × 130 mm billet", body: "Listed as a planned billet cross-section in the project product portfolio. The supplied document does not specify billet length, steel grade, chemistry, tolerances or mechanical properties.", tag: "Planned nominal cross-section" },
      { title: "150 × 150 mm billet", body: "Listed as a second planned billet cross-section. Confirm both dimensions against the latest approved product specification before commercial publication.", tag: "Planned nominal cross-section" },
      { title: "Downstream uses", body: "The document describes billets as semi-finished feedstock that may be processed by downstream steel industries into reinforcement bars, structural products and other engineering materials. Those downstream products are not claimed as direct Chalinze output.", tag: "Downstream application only" },
      { title: "Technical data & availability", body: "No approved grade, chemical composition, mechanical properties, tolerance, billet length, price, minimum order, stock, supply lead time, product certificate or specification sheet was supplied.", tag: "Contact for approved information" },
      { title: "Quality intent", body: "The document discusses raw-material testing, process monitoring, metallurgical analysis and final inspection as planned quality activities. It does not establish that tests are currently being performed at an operating facility.", tag: "Planned quality framework" },
    ],
  },
  {
    path: "/quality",
    title: "Quality through the process.",
    eyebrow: "Quality & technology",
    summary: "The company document describes a planned approach to material testing, process monitoring, metallurgical analysis and product inspection.",
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
    summary: "The proposed plant concept references Vigwaza Dry Port, rail and national road corridors, national-grid electricity, natural gas and water systems; connections and utilities are not confirmed.",
    sections: [
      { title: "Plant configuration", body: "The proposed configuration includes raw-material handling, beneficiation, iron production, steelmaking, continuous casting and billet storage/dispatch. No approved general arrangement or as-built drawing is supplied.", tag: "Proposed configuration" },
      { title: "Utility design basis", body: "The project material cites national-grid electricity and the Julius Nyerere Hydropower Project as power context, with natural-gas generation as backup/support. Recycled process water, make-up supply, oxygen and compressed-air systems, fluxes, closed-loop cooling and heat recovery are also design-basis items; no utility connection or supply agreement is evidenced.", tag: "Planned utility basis · not commissioned" },
      { title: "Automation & digital control", body: "Automation, process monitoring, smart manufacturing, predictive maintenance, digital quality management and information security are identified as proposed development themes.", tag: "Planned digital systems" },
      { title: "Transport & logistics", body: "The planned site is described near Vigwaza Dry Port, with the National Trunk Road Network and MGR/SGR railway corridors discussed as connectivity context. No secured rail connection, port access arrangement or logistics contract is confirmed.", tag: "Connectivity context · not secured" },
      { title: "Environmental management", body: "Environmental management systems, water and resource management, waste, climate and carbon considerations are included in the proposed plant and HSEC planning scope.", tag: "Plans and permits not supplied" },
    ],
  },
  {
    path: "/sustainability",
    title: "Progress, responsibly made.",
    eyebrow: "Sustainability & HSEC",
    summary: "The company document sets out low-carbon manufacturing ambition alongside energy, carbon, resource, environmental, safety and community-management themes.",
    sections: [
      { title: "Low-carbon ambition", body: "Low-carbon steel is a stated project and brand ambition. The supplied documents do not provide measured emissions intensity, reduction baselines, verified product-footprint results or environmental certification.", tag: "Ambition, not measured performance" },
      { title: "Energy & carbon", body: "Energy efficiency, responsible energy management, CO₂ awareness and carbon-management planning appear in the document. No renewable-energy percentage, energy intensity or emissions metric is reported as achieved.", tag: "No measured figures supplied" },
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
    summary: "Potential investment, financing and industrial collaboration approaches described in the company document, without implying secured commitments.",
    sections: [
      { title: "Investment rationale", body: "The document presents mineral value addition, import substitution, domestic manufacturing, regional demand, industrial development and skills/technology transfer as strategic investment themes.", tag: "Project rationale" },
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
    summary: "The company document describes intended steel billet markets in Tanzania and regional African markets, with downstream industrial use cases.",
    sections: [
      { title: "Tanzania", body: "The company document presents Tanzania as the home market and industrial context for the proposed project. It discusses import substitution and domestic supply as strategic rationale, not as measured sales or achieved import savings.", tag: "Target market" },
      { title: "Regional markets", body: "The document refers to East and Central African markets and broader opportunities through EAC, SADC and AfCFTA. These are target-market ambitions; no current exports or customer territories are claimed.", tag: "Market ambition" },
      { title: "Steel rolling mills", body: "Rolling mills are identified as potential downstream users of steel billets for further processing. No named mill or supply relationship is confirmed.", tag: "Potential customer segment" },
      { title: "Construction & infrastructure", body: "The document links downstream steel applications to construction and public infrastructure. Reinforcement bars and structural sections are examples of further-processed products, not claimed direct company output.", tag: "Downstream use case" },
      { title: "Energy, mining & industry", body: "Energy projects, mining and mineral processing, manufacturing, industrial fabrication and engineering are identified as potential demand areas in the company material.", tag: "Potential applications" },
      { title: "Distribution & commercial approach", body: "The document discusses customer support, distribution and export development as future commercial strategy areas. Pricing, minimum order quantities, current stock, supply terms and delivery commitments are not provided.", tag: "Commercial details pending" },
    ],
  },
  {
    path: "/development",
    title: "A disciplined path to delivery.",
    eyebrow: "Project roadmap",
    summary: "The source document outlines engineering, approvals, financing, EPC, commissioning and future operational development as project stages.",
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
    title: "Updates, when verified.",
    eyebrow: "News & insights",
    summary: "The company document defines a proposed communications programme; current announcements and media assets require authorized company publication.",
    sections: [
      { title: "Corporate news & press releases", body: "Corporate announcements, press releases and executive communications are identified as future publishing categories. No articles, issue dates or quotations have been invented.", tag: "No approved articles supplied" },
      { title: "Project progress", body: "The document calls for project updates but does not provide verified construction percentages, milestones, commissioning dates or operating results.", tag: "Progress evidence required" },
      { title: "Events & media centre", body: "Events, conferences, approved photography/video, media requests and corporate publications are identified as communications topics. No press kit or event schedule was supplied.", tag: "Media assets pending" },
      { title: "Editorial governance", body: "Company announcements and events are published only after authorized review against current company information.", tag: "Company communications" },
    ],
  },
  {
    path: "/careers",
    title: "Skills for a stronger future.",
    eyebrow: "Careers & talent",
    summary: "The company document identifies talent, training and local skills development as part of the long-term project vision, but supplies no approved vacancies.",
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
    summary: "Answers to common product, process, market, location and enquiry questions based on the supplied Chalinze company document.",
    sections: [
      { title: "Product information", body: "The planned product is steel billets in the two cross-sections listed in the document. Grades, chemistry, tolerances, billet length and supply conditions were not provided.", tag: "See Products" },
      { title: "Markets & supply", body: "Rolling mills, construction, infrastructure, energy, mining and manufacturing are discussed as target segments. They are not confirmed customers or active supply territories.", tag: "See Markets" },
      { title: "Contact & office", body: "Telephone, WhatsApp, CEO email, postal address and office hours are listed on the Contact page, transcribed from the company document. One office-address variant needs resolution.", tag: "See Contact" },
      { title: "Technical decisions", body: "The production capacity and ironmaking route are unresolved in the source. The public website identifies both conflicts rather than presenting a single unconfirmed answer.", tag: "See Project" },
    ],
  },
  {
    path: "/contact",
    title: "Talk to the right team.",
    eyebrow: "Contact & corporate office",
    summary: "Telephone, WhatsApp, email, office address, office hours and separate corporate-office and planned-project map links transcribed from the supplied company website document.",
    sections: [
      { title: "Corporate office", body: "Morocco Square, Exchange Tower, Mwai Kibaki Road / New Bagamoyo Road, P.O. Box 5497, Dar es Salaam, Tanzania. A different headquarters description elsewhere in the document gives another floor/street spelling; see the contact notice.", tag: "Company document · Section 24.2" },
      { title: "Telephone & WhatsApp", body: "Telephone: +255 735 283 711, +255 735 283 712 and +255 713 283 711. WhatsApp: +255 752 283 711.", tag: "Company document · Section 24.2" },
      { title: "Email & website", body: "CEO/corporate email: ceo@chalinzesteelmills.co.tz. Company website: https://chalinzesteelmills.co.tz.", tag: "Company document · Section 24.2" },
      { title: "Office hours", body: "Monday–Friday, 8:00 a.m.–5:00 p.m. East Africa Time; Saturday, Sunday and public holidays closed. Meetings are by prior appointment.", tag: "Company document · Section 24.10" },
      { title: "Planned project site", body: "The document identifies Vigwaza area / Vigwaza Dry Port, Chalinze District, Pwani Region as the planned manufacturing location. This is not the corporate contact office.", tag: "Project location · confirmation required" },
    ],
  },
];
