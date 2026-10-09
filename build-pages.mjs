// Builds the solution pages from index.html (shared header, icon sprite, contact form, footer, modal)
// plus the page content defined below. Usage: node build-pages.mjs
// The generated *.html files are overwritten on every run — edit page content HERE, shared chrome in index.html.
import { readFile, writeFile } from 'node:fs/promises';

const P = 'assets/img/product/';
const G = 'assets/img/gen/';

const shot = (file, alt, h = 902) => ({ type: 'shot', src: P + file, alt, w: 1600, h });
const phones = (...items) => ({ type: 'phones', items: items.map(([file, alt]) => ({ src: P + file, alt })) });

/* ------------------------------------------------------------------ content */
const pages = [
  {
    key: 'rms',
    file: 'resource-management.html',
    option: 'Resource Management',
    metaTitle: 'Streamline RFP Modeling & Resource Planning | INPUT SOFT RMS',
    metaDesc: 'Streamline RFP modeling and resource planning with INPUT SOFT RMS. Reduce modeling time by 60%, standardize pricing, and boost bid capacity.',
    kind: 'Software suite',
    title: 'Resource Management',
    lead: 'INPUT SOFT RMS is a fully integrated resource management suite that optimizes airport operations through predictive planning, automated rostering, and real-time task execution. Seamlessly connected with airport systems and staff tools, it ensures smooth coordination and on-time performance.',
    hero: shot('rms-shiftplan.jpg', 'Resource Management shift plan: staff shifts and tasks across the day with the workload curve', 901),
    cards: {
      eyebrow: 'Software suite',
      heading: 'How can we help you?',
      items: [
        ['forecast', 'Resource planning', 'Automated planning of staff, equipment, and GSE based on requirements and flight schedules.'],
        ['users', 'Staff rostering', 'Intelligent shift rostering that stays compliant, adjusts for absences or changes, and reduces manual effort.'],
        ['timer', 'Real-time planning', 'Dynamic task updates, reassignments, and mobile notifications for responsive daily execution.'],
      ],
    },
    details: {
      rows: [
        {
          title: 'Gain total visibility over your operations',
          list: [
            ['', 'Visual dashboards turn your daily operational data into clear statistics, so you can track performance trends and evaluate execution quality across all flights.'],
            ['', 'Monitor key performance indicators like turnaround times, delay codes, and service metrics on fully customizable dashboards.'],
            ['', 'Easily sync your recorded data and performance history with external BI systems like Power BI for advanced reporting.'],
          ],
          media: shot('rms-staff-portal.jpg', 'Staff portal dashboard with work hours, overtime and requests'),
        },
        {
          title: 'Keep your team connected in real time',
          list: [
            ['Live rosters:', 'View daily or monthly shifts and tasks in a clear, mobile-friendly format on iOS and Android.'],
            ['Instant updates:', 'Get push notifications for task changes, flight delays, or reassignments as they happen.'],
            ['Task interaction:', 'Accept or decline updates with comments, syncing your response instantly with the platform.'],
          ],
          media: phones(
            ['app-roster.jpg', 'Mobile app: daily roster with tasks and flights'],
            ['app-roster-task.jpg', 'Mobile app: task details with start and stop times'],
            ['app-roster-month.jpg', 'Mobile app: monthly roster with shifts and hours'],
          ),
        },
      ],
    },
    impact: {
      eyebrow: 'Results',
      heading: 'Measurable impact of INPUT SOFT RMS',
      items: [
        { pre: 'Up to', value: '$110K', title: 'Cost recovery', text: 'Save up to $110K per month by identifying resource leakage and optimizing daily allocation.' },
        { value: '20%', title: 'Operational productivity', text: 'Drive a 20% increase in staff utilization through high-precision scheduling and reduced idle time.' },
        { value: '100K+', title: 'Enterprise-scale performance', text: 'Built for major hubs, the system processes 100K+ flights per planning cycle with zero lag.' },
        { value: '250K+', title: 'High-speed calculation', text: 'Automate the assignment of 250K+ individual tasks in a single calculation, turning hours of manual planning into seconds.' },
      ],
    },
    caseStudy: 'foxtrot',
  },
  {
    key: 'dms',
    file: 'data-management.html',
    option: 'Data Management',
    metaTitle: 'Data Management Software Suite | INPUT SOFT',
    metaDesc: 'An integrated platform that optimizes airport ramp operations and contract invoicing: accurate data capture, no revenue leakage, faster invoicing.',
    kind: 'Software suite',
    title: 'Data Management',
    lead: 'INPUT SOFT Data Management Software Suite is an integrated platform that optimizes airport ramp operations and contract invoicing. Connected directly with the field, it ensures accurate data capture, eliminates revenue leakage, and speeds up invoicing.',
    hero: shot('dm-flight-service.jpg', 'Data Management flight services: turnaround timeline with service statuses for every flight', 901),
    cards: {
      eyebrow: 'Software suite',
      heading: 'How can we help you?',
      items: [
        ['plane', 'Flight services', 'Digital tracking of turnaround operations that eliminates paper logs and captures precise timestamps, passenger data, and cargo details.'],
        ['calculator', 'Invoicing', 'Automated invoicing engine that matches completed ramp services against airline contracts and SGHA terms to calculate exact charges.'],
        ['wrench', 'GSE control', 'Centralized management hub that monitors equipment availability, tracks usage metrics, and forecasts technical maintenance based on real-world data.'],
      ],
    },
    details: {
      rows: [
        {
          title: 'Flight Services Module',
          text: [
            'Log precise ground operations timestamps, flight statuses, delay codes, and actual passenger or cargo volumes right at the aircraft using the mobile iOS/Android app.',
            'Compile all verified field data into a centralized web dashboard to replace paper logs with a clear timeline for every flight. All the data and views are fully customizable.',
          ],
          media: phones(
            ['app-flights.jpg', 'Mobile app: list of flights with scheduled times and statuses'],
            ['app-flight-service.jpg', 'Mobile app: arrival details with services to record'],
            ['app-flight-service-gpu.jpg', 'Mobile app: a ground power unit service with start and stop times'],
          ),
        },
        {
          title: 'Invoicing Module',
          text: [
            'Add airline contracts, like SGHA, to the directory. The system automatically matches ramp data with these contracts to calculate rates and generate ready-to-send invoices.',
            'Issue invoices and scan operational records automatically. The system flags missing invoices to stop revenue leakage, allows issuing credit notes, and tracks any work for audit purposes.',
          ],
          media: shot('dm-invoicing-agreement.jpg', 'Invoicing agreement with contract terms, services and billing formulas', 901),
        },
        {
          title: 'GSE Control Module',
          text: [
            'Complete mandatory pre-shift GSE inspections and record engine hours, mileage, fuel levels and any other required information directly via mobile checklists before operating any asset.',
            'Analyze logged equipment data on the web platform to track vehicle availability, automatically predict maintenance needs based on real usage and export the GSE reports.',
          ],
          media: shot('dm-gse.jpg', 'GSE control: equipment list with inspection statuses and usage data'),
        },
        {
          title: 'Mobile app: built for the ramp',
          text: [
            'Eliminates delayed reporting and manual data re-entry by allowing ground staff to input checklists and service logs directly on mobile devices in real time.',
            'Instant updates: get push notifications for task changes, flight delays, or reassignments as they happen.',
          ],
          media: phones(
            ['app-home.jpg', 'Mobile app home screen with Task & Roster, Ground Support Equipment and Flights Services'],
            ['app-gse-list.jpg', 'Mobile app: GSE list with inspection statuses'],
            ['app-gse-check.jpg', 'Mobile app: GSE pre-shift checklist with mileage and engine hours'],
          ),
        },
      ],
    },
    impact: {
      eyebrow: 'Results',
      heading: 'Measurable impact of INPUT SOFT DMS',
      items: [
        { value: '100%', title: 'Eliminate revenue leakage', text: 'Capture 100% of services delivered on the ramp, ensuring that no completed task goes unbilled or unnoticed.' },
        { icon: 'check-circle', title: 'Guarantee compliance tracking', text: 'Achieve full visibility and accurate auditing for all airline contract agreements, SGHA terms, and service levels.' },
        { icon: 'calculator', title: 'Reduce billing errors', text: 'Automate invoice generation directly from verified operational data to eliminate manual calculation mistakes.' },
        { icon: 'wrench', title: 'Prevent costly equipment failures', text: 'Optimize your existing asset investments and maximize fleet readiness through usage intelligence and timely maintenance forecasting.' },
      ],
    },
  },
  {
    key: 'cod',
    file: 'calculations-on-demand.html',
    option: 'Calculations on Demand',
    metaTitle: 'Calculations on Demand | INPUT SOFT',
    metaDesc: 'Precise resource modelling for RFPs, SLA negotiations, budgeting and seasonal changes, with a comprehensive report delivered within 48 hours.',
    kind: 'Service',
    title: 'Calculations on Demand',
    lead: 'Operational planning means tight deadlines and high stakes. We simulate your exact needs for staff, technical assets, and fixed infrastructure (like check-in desks and gates) during critical transitions.',
    hero: shot('calc-analytics.jpg', 'Calculation report with flights, worked hours and paid hours by aircraft type', 1000),
    cards: {
      eyebrow: 'Use cases',
      heading: 'When do you need Calculations on Demand?',
      items: [
        ['forecast', 'Seasonal schedule changes', 'Instantly adapt staff qualifications and equipment fleet size when airline schedules shift or a new season begins.'],
        ['file', 'SLA negotiations & RFPs', 'Cut RFP preparation time by 60%. Enter commercial negotiations with total confidence, backed by precise data.'],
        ['calculator', 'Budgeting & board prep', 'Get real data and precise workload models to justify your operational costs and resource requests to shareholders.'],
      ],
    },
    details: {
      eyebrow: 'Getting started',
      heading: 'What we need to start your calculations',
      lead: 'To build your precise operational model, our team just needs three primary data sets. To make the process as seamless as possible, we provide ready-to-use templates you can easily fill out.',
      numbered: true,
      rows: [
        {
          title: 'Flight Schedule',
          text: ['A complete list of all arrivals and departures. We accept any standard daily or seasonal formats (such as Excel, CSV, or IATA SSIM codes).'],
          media: shot('rms-schedule.jpg', 'Flight schedule overview with movements, passengers and peak hours', 901),
        },
        {
          title: 'Planning Rules & Labor Parameters',
          text: ['Your specific ground handling constraints, including shift types, working hours, rest time rules, and mandatory break times.'],
          media: shot('rms-rules.jpg', 'Planning rules with task timings and qualifications', 899),
        },
        {
          title: 'Employee Information',
          text: ['Current station roles, positions, qualifications, and employment types so the engine factors in actual operational compliance.'],
          media: shot('rms-roster.jpg', 'Roster with employees, contracts and assigned shifts', 900),
        },
      ],
    },
    impact: {
      eyebrow: 'Results',
      heading: 'We don’t just deliver numbers — we drive strategic efficiency that boosts your bottom line',
      items: [
        { pre: 'Up to', value: '100K', title: 'Substantial cost reduction', text: 'Save up to 100K per month in payroll for your new potential stations with our calculations and predictions.' },
        { value: '60%', title: 'Accelerated RFP & SLA preparation', text: 'Cut your contract planning time by 60%. Get all the required data and precise operational modeling within 48 hours to enter commercial negotiations or launch new stations with total confidence.' },
        { icon: 'chart', title: 'Visualized data control', text: 'Receive clear, interactive dashboards highlighting peak flight schedule loads and precise resource workload distribution to eliminate operational bottlenecks.' },
      ],
    },
    caseStudy: 'foxtrot',
  },
  {
    key: 'fp',
    file: 'flightprint.html',
    option: 'FlightPrint',
    metaTitle: 'FlightPrint | INPUT SOFT',
    metaDesc: 'The operational impact of your schedule, before a single aircraft moves: workload peaks and resource demand, 35+ metrics and BI integration.',
    kind: 'Solution',
    title: 'FlightPrint',
    lead: 'The operational impact of your schedule, before a single aircraft moves.',
    hero: shot('rms-flightplan.jpg', 'FlightPrint flight plan: flights on a timeline with the tasks required for each turnaround'),
    cards: {
      eyebrow: 'Overview',
      heading: 'What FlightPrint gives you',
      items: [
        ['chart', 'What we calculate', 'Workload peaks and resource demand for RAMP/PAX processing based on your flight schedule and SLA/engagement standards.'],
        ['globe', 'Usage areas', 'Hub feasibility validation, network planning, seasonal schedule adjustments, and data-driven ground handling negotiations.'],
        ['check-circle', 'What you get', 'Customizable dashboards with 35+ metrics, BI integration, and smart reports that help you identify and fix risks before go-live.'],
      ],
    },
    details: {
      eyebrow: 'Process',
      heading: 'How it works',
      numbered: true,
      rows: [
        {
          title: 'Upload your flight schedule in any format',
          text: ['The platform instantly builds a unified workload model, aligning your network planning and operations teams from the start.'],
          media: shot('rms-schedule.jpg', 'Uploaded flight schedule with movements per airline and peak hours', 901),
        },
        {
          title: 'Apply specific handling rules',
          text: ['Accurately calculate precise staffing and equipment needs for every single turn to avoid under- or over-resourcing.'],
          media: shot('rms-rules.jpg', 'Handling rules with task timings and qualifications', 899),
        },
        {
          title: 'Predict and block delay risks before they hit you',
          text: ['See exactly which flight banks will overload your ground handlers and create operational bottlenecks.'],
          media: shot('rms-shiftplan.jpg', 'Workload curve showing peaks against available staff', 901),
        },
        {
          title: 'Generate clear, data-driven dashboards',
          text: ['For confident, evidence-based negotiations with handlers and hubs or seamlessly sync everything with Power BI.'],
          media: shot('analytics-dashboard.jpg', 'Dashboards with flights, FTE, worked hours and paid hours', 896),
        },
      ],
    },
    impact: {
      eyebrow: 'Results',
      heading: 'Key benefits',
      items: [
        { value: '35+', title: 'Full visibility', text: 'Access 35+ metrics for full visibility across ramp, gate, and pax handling to replace manual estimates.' },
        { icon: 'file', title: 'Accurate contracts', text: 'Align handling agreements with actual needs based on validated, modelled demand to ensure contract accuracy.' },
        { icon: 'forecast', title: 'Validated capacity', text: 'Validate seasonal capacity well before go-live to spot hub pressure points and operational risks early.' },
        { icon: 'layers', title: 'Unified data', text: 'Unify data for airline network planners, ops, and handlers to drive explainable slot planning & leadership decisions.' },
      ],
    },
    caseStudy: 'iag',
  },
];

const caseStudies = {
  foxtrot: {
    href: 'case-study-foxtrot-aviation-services.html',
    title: 'How Foxtrot Aviation Services streamlined RFP modeling and planning with INPUT SOFT RMS',
    img: G + 'case-ramp-agent.jpg',
    alt: 'Ground handling agent checking tasks on a tablet next to an aircraft',
  },
  iag: {
    href: 'case-study-iag-transform.html',
    title: 'How IAG Transform automates hub capacity validation and schedule modeling with FlightPrint',
    img: G + 'case-hub-planning.jpg',
    alt: 'Network planners reviewing hub schedules in an operations room',
  },
};

/* ------------------------------------------------------- case study content */
const casePages = [
  {
    key: 'cod',
    file: 'case-study-foxtrot-aviation-services.html',
    option: 'Calculations on Demand',
    solution: { name: 'Calculations on Demand', href: 'calculations-on-demand.html' },
    metaTitle: 'How Foxtrot Aviation Streamlined RFP Modeling | INPUT SOFT',
    metaDesc: 'How FoxTrot Aviation Services cut RFP modeling time by up to 60% and standardized pricing across 32 airport locations with INPUT SOFT Calculations on Demand.',
    title: 'How Foxtrot Aviation Services streamlined RFP modeling and planning with INPUT SOFT RMS',
    photo: { src: G + 'case-ramp-agent.jpg', alt: 'Ground handling agent checking tasks on a tablet next to an aircraft', pos: 'center 32%' },
    profile: [
      ['Company', 'FoxTrot Aviation Services'],
      ['Industry', 'Aviation ground services (fleet & facility appearance, line service support, janitorial)'],
      ['Region', 'USA (32 airport locations)'],
      ['Client since', 'January 2025 (using our “Calculations on Demand” service based on INPUT SOFT RMS)'],
    ],
    overview: [
      'Since 2010, FoxTrot Aviation has delivered critical support across the U.S. for commercial and private aviation partners.',
      'They specialize in high-stakes fleet and facility services, including on-airport janitorial and line support, ensuring consistent operational execution for airlines and MRO facilities nationwide.',
    ],
    challenge: {
      text: ['With a rapidly expanding footprint across 32 locations, Foxtrot’s operations team faced increasing complexity during RFP cycles — balancing cost precision, staffing needs, and GSE planning across diverse airports.'],
      listTitle: 'Key challenges included:',
      list: [
        'Heavy reliance on spreadsheets and manual formulas',
        'Manual and time-consuming RFP modeling prone to errors',
        'Limited visibility into true resource utilization',
        'Inconsistent labor and equipment planning across regions',
        'Friction between finance and operations during proposal preparation',
      ],
    },
    solutionBlock: {
      text: ['In January 2025, Foxtrot Aviation adopted INPUT SOFT Calculations On Demand service to bring automation, accuracy, and speed to their planning and bidding processes.'],
      listTitle: 'With this service tool, FoxTrot was able to:',
      list: [
        'Reduce RFP modeling time from days to just a few hours',
        'Standardize cost structures and pricing methodology across all regions',
        'Visualize labor and GSE utilization through clear, easy-to-read reports',
        'Simulate multiple planning scenarios (“what-if” simulations) in record time',
        'Empower true data driven decision-making for both finance and operations teams',
      ],
    },
    results: {
      heading: 'Key results',
      table: [
        ['RFP modeling time', 'Several days', 'Hours', 'Up to 60% reduction in time'],
        ['Bid capacity', 'Limited by resources', 'Expanded without new hires', 'Increased number of bids submitted'],
        ['Pricing consistency', 'Varied by location', 'Standardized across 32 sites', 'Improved accuracy and transparency'],
        ['Proposal revisions', 'Frequent manual edits', 'Streamlined with automated updates', 'Minimized errors and rework'],
      ],
      note: 'Beyond time savings, INPUT SOFT RMS helped Foxtrot’s leadership team gain greater confidence in cost accuracy and competitiveness, directly contributing to a higher shortlisting rate in recent bids.',
      winsHeading: 'FoxTrot Aviation Services key wins',
      wins: [
        { value: '60%', text: 'Saved 60% of the time usually spent on RFPs' },
        { icon: 'calculator', text: 'Standardized pricing and resource models' },
        { icon: 'check-circle', text: 'Higher accuracy and more certainty in every bid' },
        { icon: 'globe', text: 'Scalable planning framework for national growth' },
      ],
    },
    quote: {
      text: [
        'Calculations On Demand transformed how we approach RFPs. What used to take days of manual calculation and coordination now takes hours, and we’re more confident in the accuracy of our numbers.',
        'INPUT SOFT RMS tool has become a core part of our bid strategy as we expand nationally.',
      ],
      name: 'Christopher T. Stump',
      role: 'Principal, FoxTrot Aviation Services',
    },
  },
  {
    key: 'fp',
    file: 'case-study-iag-transform.html',
    option: 'FlightPrint',
    solution: { name: 'FlightPrint', href: 'flightprint.html' },
    metaTitle: 'Case Study: IAG Transform | INPUT SOFT',
    metaDesc: 'How IAG Transform automates multi-carrier schedule modelling and hub capacity validation with FlightPrint, cutting data preparation time by up to 80%.',
    title: 'How IAG Transform automates hub capacity validation and schedule modeling with FlightPrint',
    photo: { src: G + 'case-hub-planning.jpg', alt: 'Network planners reviewing hub schedules in an operations room', pos: 'center 38%' },
    profile: [
      ['Company', 'International Airlines Group (IAG) — one of the world’s leading airline groups, operating a diverse portfolio of global carriers including British Airways, Iberia, Vueling, Aer Lingus, and LEVEL.'],
      ['Industry', 'Airline Group'],
      ['Region', 'Global'],
      ['Client since', 'February 2026 (using FlightPrint, part of INPUT SOFT RMS)'],
    ],
    overview: [
      'Managing a global airline network of this scale requires strong strategic planning to drive cost efficiency and optimise resource utilisation.',
      'INPUT SOFT’s relationship with IAG began through the IAGi Accelerator, the Group’s innovation programme designed to accelerate the testing and adoption of new technologies. Following a presentation at the IAGi Innovation Summit, the Airport Analytics Procurement Team recognised the potential to address complex airport planning challenges. This led to a collaboration with IAG Transform, the Group’s dedicated technology, procurement, and innovation division.',
      'The Airport Analytics Procurement Team play a critical role in assessing schedules to identify and maximise cost-saving opportunities across key initiatives, while ensuring alignment with operational and resource requirements.',
    ],
    challenge: {
      text: [
        'Evaluating schedules across multiple resource areas to understand demand versus capacity at global hubs is a core focus for the analysis team. However, the sheer number of outstations, combined with tight planning timelines, has constrained the depth and speed of analysis.',
        'As a result, schedules have often been reviewed separately for each operational company within the Group before being consolidated, limiting the ability to quickly identify efficiencies across different facilities within the airports.',
      ],
      list: [
        'Significant time spent manually compiling and formatting data from multiple external sources within Power BI',
        'Limited ability to overlay schedules dynamically, restricting visibility of resource constraints across key operational areas',
        'Challenges in developing a consolidated, network-wide view of airport resource requirements',
        'Reduced visibility of potential operational risks and cost-saving opportunities without a fully integrated, strategic perspective',
      ],
    },
    solutionBlock: {
      text: ['IAG Transform integrated FlightPrint into its strategic planning processes to automate multi-carrier schedule modelling and validate hub capacity.'],
      listTitle: 'The platform enables the team to:',
      list: [
        ['Automate data integration:', 'Seamlessly combine internal airline schedules with total airport traffic data, removing the need for manual compilation from multiple external sources'],
        ['Assess true hub capacity:', 'Evaluate the physical constraints of each airport by analysing over 35 data points supplied by FlightPrint spanning passenger flow, gate utilisation, and ramp operations'],
        ['Run scenario simulations:', 'Perform rapid capacity modelling to assess the impact of schedule changes, aircraft swaps, or new routes on ground operations well in advance of live operations'],
      ],
    },
    results: {
      heading: 'What the team achieved',
      wins: [
        { pre: 'Up to', value: '80%', text: 'Up to 80% reduction in time spent on data preparation, enabling analysts to begin evaluation immediately without manual formatting' },
        { icon: 'gauge', text: 'Instant traffic modelling and capacity simulations at airports quickly, replacing days of manual spreadsheet analysis' },
        { icon: 'layers', text: 'A more accurate and holistic view of total demand, incorporating the wider airport ecosystem and understanding any resource constraints' },
        { icon: 'chart', text: 'Data-driven, objective insights to better support strategic planning and cost saving initiatives at outstations' },
      ],
    },
    quote: {
      text: ['The biggest impact for us is increased confidence and efficiency. With more reliable data and significantly less time spent on manual tasks, our team can now move away from data preparation and fully focus on value-added analysis to make better-informed decisions.'],
      name: 'Alison Swan',
      role: 'Group Senior Analytics Manager, IAG Transform',
    },
  },
];

// HTML-escape ampersands in all content strings (e.g. "SLA negotiations & RFPs")
const escapeDeep = (v) => {
  if (typeof v === 'string') return v.replace(/&(?!amp;|#)/g, '&amp;');
  if (Array.isArray(v)) return v.map(escapeDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'src' || k === 'file' || k === 'href' || k === 'img' ? x : escapeDeep(x)]));
  return v;
};
pages.forEach((p, i) => { pages[i] = escapeDeep(p); });
casePages.forEach((p, i) => { casePages[i] = escapeDeep(p); });

/* ---------------------------------------------------------------- templates */
const icon = (name) => `<svg class="icon"><use href="#i-${name}"/></svg>`;
const delay = (i) => ['', ' rv-d1', ' rv-d2', ' rv-d3'][i % 4];

const media = (m, key, extra = '') => {
  if (m.type === 'phones') {
    return `<figure class="split__media sol-card sol-card--${key} rv${extra}">
            <div class="phones">
${m.items.map((p) => `              <div class="phone"><img src="${p.src}" alt="${p.alt}" width="750" height="1626" loading="lazy"></div>`).join('\n')}
            </div>
          </figure>`;
  }
  return `<figure class="split__media sol-card sol-card--${key} rv${extra}">
            <div class="sol-card__media"><img src="${m.src}" alt="${m.alt}" width="${m.w}" height="${m.h}" loading="lazy"></div>
          </figure>`;
};

const hero = (p) => `  <!-- ============ Page hero ============ -->
  <section class="hero" aria-labelledby="page-title">
    <div class="hero__panel hero__panel--page hero__panel--${p.key}">
      <div class="hero__content">
        <p class="page-hero__crumb eyebrow load load-1"><a href="index.html#solutions">Solutions</a><span aria-hidden="true">/</span>${p.kind}</p>
        <h1 class="hero__title h-xxl load load-2" id="page-title">${p.title}</h1>
        <p class="page-hero__lead lead load load-3">${p.lead}</p>
        <div class="hero__actions load load-4">
          <button class="btn btn--primary btn--lg" type="button" data-modal-open>
            Request a demo ${icon('arrow-right')}
          </button>
          <a class="btn btn--glass btn--lg" href="#details">See the details</a>
        </div>
      </div>
      <figure class="page-hero__shot load load-5">
        <img src="${p.hero.src}" alt="${p.hero.alt}" width="${p.hero.w}" height="${p.hero.h}">
      </figure>
    </div>
  </section>`;

const cards = (p) => `  <!-- ============ Overview cards ============ -->
  <section class="section" aria-labelledby="overview-title">
    <div class="container">
      <div class="section-head section-head--center rv">
        <span class="eyebrow">${p.cards.eyebrow}</span>
        <h2 class="h-xl" id="overview-title">${p.cards.heading}</h2>
      </div>
      <div class="tiles tiles--3">
${p.cards.items.map(([ic, title, text], i) => `        <article class="feature rv${delay(i)}">
          <span class="icon-tile">${icon(ic)}</span>
          <span class="feature__index">0${i + 1}</span>
          <h3 class="feature__title">${title}</h3>
          <p class="feature__text">${text}</p>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`;

const details = (p) => {
  const d = p.details;
  const H = d.heading ? 'h3' : 'h2';
  const head = d.heading ? `      <div class="section-head rv">
        <span class="eyebrow">${d.eyebrow}</span>
        <h2 class="h-xl" id="details-title">${d.heading}</h2>${d.lead ? `\n        <p class="lead">${d.lead}</p>` : ''}
      </div>\n` : '';
  const rows = d.rows.map((r, i) => {
    const body = r.list
      ? `<ul class="checklist">
${r.list.map(([b, t]) => `              <li>${icon('check')}<span>${b ? `<strong>${b}</strong> ` : ''}${t}</span></li>`).join('\n')}
            </ul>`
      : r.text.map((t) => `<p>${t}</p>`).join('\n            ');
    return `        <article class="split${i % 2 ? ' split--reverse' : ''}">
          <div class="split__body rv">
            ${d.numbered ? `<span class="split__num">${i + 1}</span>\n            ` : ''}<${H} class="h-lg">${r.title}</${H}>
            ${body}
          </div>
          ${media(r.media, p.key, ' rv-d1')}
        </article>`;
  }).join('\n');
  return `  <!-- ============ Detail rows ============ -->
  <section class="section" id="details"${d.heading ? ' aria-labelledby="details-title"' : ' aria-label="Details"'}>
    <div class="container">
${head}      <div class="splits">
${rows}
      </div>
    </div>
  </section>`;
};

const impact = (p) => `  <!-- ============ Impact ============ -->
  <section class="section" aria-labelledby="impact-title">
    <div class="container">
      <div class="section-head rv">
        <span class="eyebrow">${p.impact.eyebrow}</span>
        <h2 class="h-xl" id="impact-title">${p.impact.heading}</h2>
      </div>
      <div class="tiles tiles--${p.impact.items.length === 3 ? 3 : 4}">
${p.impact.items.map((it, i) => `        <div class="benefit rv${delay(i)}">
          <div class="benefit__top">
            ${it.value ? `${it.pre ? `<p class="benefit__pre">${it.pre}</p>\n            ` : ''}<p class="benefit__value">${it.value.replace(/([%+KkMh]+)$/, '<span class="accent">$1</span>')}</p>` : `<span class="icon-tile">${icon(it.icon)}</span>`}
          </div>
          <h3 class="benefit__title">${it.title}</h3>
          <p class="benefit__text">${it.text}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;

const caseStudy = (p) => {
  if (!p.caseStudy) return '';
  const c = caseStudies[p.caseStudy];
  return `  <!-- ============ Case study ============ -->
  <section class="section section--tight" aria-labelledby="case-title">
    <div class="container">
      <div class="case-banner rv">
        <div class="case-banner__media"><img src="${c.img}" alt="${c.alt}" width="896" height="1200" loading="lazy"></div>
        <div class="case-banner__body">
          <span class="eyebrow">Case study</span>
          <h2 class="h-lg" id="case-title">${c.title}</h2>
          <a class="btn btn--secondary" href="${c.href}">Read the case study ${icon('arrow-right')}</a>
        </div>
      </div>
    </div>
  </section>`;
};

/* ------------------------------------------------------ case study templates */
const csHero = (p) => `  <!-- ============ Case study hero ============ -->
  <section class="hero" aria-labelledby="page-title">
    <div class="hero__panel hero__panel--page hero__panel--case hero__panel--${p.key}">
      <div class="hero__content">
        <p class="page-hero__crumb eyebrow load load-1"><span>Case study <span aria-hidden="true">/</span></span><a href="${p.solution.href}">${p.solution.name}</a></p>
        <h1 class="hero__title load load-2" id="page-title">${p.title}</h1>
        <div class="hero__actions load load-3">
          <a class="btn btn--primary btn--lg" href="#results">Discover the results ${icon('arrow-down')}</a>
          <a class="btn btn--glass btn--lg" href="${p.solution.href}">View the solution</a>
        </div>
      </div>
      <figure class="page-hero__shot page-hero__shot--photo load load-4">
        <img src="${p.photo.src}" alt="${p.photo.alt}" width="896" height="1200">
      </figure>
    </div>
  </section>`;

const csProfile = (p) => `  <!-- ============ Client profile ============ -->
  <section class="section" aria-labelledby="profile-title">
    <div class="container cs-profile">
      <div class="cs-profile__facts rv">
        <h2 class="eyebrow" id="profile-title">The client profile</h2>
        <dl class="cs-facts">
${p.profile.map(([k, v]) => `          <div><dt>${k}</dt><dd>${v}</dd></div>`).join('\n')}
        </dl>
      </div>
      <div class="cs-profile__overview rv rv-d1">
        <h2 class="h-lg">Operational overview</h2>
        ${p.overview.map((t) => `<p>${t}</p>`).join('\n        ')}
      </div>
    </div>
  </section>`;

const csList = (items, ic) => `<ul class="checklist">
${items.map((it) => `            <li>${icon(ic)}<span>${Array.isArray(it) ? `<strong>${it[0]}</strong> ${it[1]}` : it}</span></li>`).join('\n')}
          </ul>`;

const csBlock = (label, title, b, ic, mod, d) => `        <article class="cs-block cs-block--${mod} rv${d}">
          <span class="eyebrow">${label}</span>
          <h2 class="h-lg">${title}</h2>
          ${b.text.map((t) => `<p>${t}</p>`).join('\n          ')}
          ${b.listTitle ? `<p class="cs-block__lead">${b.listTitle}</p>\n          ` : ''}${csList(b.list, ic)}
        </article>`;

const csStory = (p) => `  <!-- ============ Challenge & solution ============ -->
  <section class="section section--tight" aria-label="Challenge and solution">
    <div class="container">
      <div class="cs-story">
${csBlock('01', 'Challenge', p.challenge, 'alert', 'challenge', '')}
${csBlock('02', 'Solution', p.solutionBlock, 'check', 'solution', ' rv-d1')}
      </div>
    </div>
  </section>`;

const csResults = (p) => {
  const r = p.results;
  const table = r.table ? `      <div class="cs-table rv" role="table" aria-label="${r.heading}">
        <div class="cs-table__row cs-table__row--head" role="row">
          <span role="columnheader">Metric</span><span role="columnheader">Before</span><span role="columnheader">After</span><span role="columnheader">Impact</span>
        </div>
${r.table.map(([m, b, a, i]) => `        <div class="cs-table__row" role="row">
          <span class="cs-table__metric" role="cell">${m}</span>
          <span role="cell" data-label="Before">${b}</span>
          <span role="cell" data-label="After">${a}</span>
          <span class="cs-table__impact" role="cell" data-label="Impact">${i}</span>
        </div>`).join('\n')}
      </div>
${r.note ? `      <p class="cs-note lead rv">${r.note}</p>\n` : ''}` : '';
  const winsHead = r.table && r.winsHeading ? `      <h3 class="cs-wins-title h-lg rv">${r.winsHeading}</h3>\n` : '';
  return `  <!-- ============ Results ============ -->
  <section class="section" id="results" aria-labelledby="results-title">
    <div class="container">
      <div class="section-head rv">
        <span class="eyebrow">Results</span>
        <h2 class="h-xl" id="results-title">${r.heading}</h2>
      </div>
${table}${winsHead}      <div class="tiles tiles--4">
${r.wins.map((w, i) => `        <div class="benefit rv${delay(i)}">
          <div class="benefit__top">
            ${w.value ? `${w.pre ? `<p class="benefit__pre">${w.pre}</p>\n            ` : ''}<p class="benefit__value">${w.value.replace(/([%+K]+)$/, '<span class="accent">$1</span>')}</p>` : `<span class="icon-tile">${icon(w.icon)}</span>`}
          </div>
          <p class="benefit__text benefit__text--lead">${w.text}</p>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
};

const csQuote = (p) => `  <!-- ============ Client quote ============ -->
  <section class="section section--tight" aria-label="Client quote">
    <div class="container">
      <figure class="cs-quote rv">
        <blockquote>
          ${p.quote.text.map((t) => `<p>${t}</p>`).join('\n          ')}
        </blockquote>
        <figcaption><strong>${p.quote.name}</strong><span>${p.quote.role}</span></figcaption>
      </figure>
    </div>
  </section>`;

/* -------------------------------------------------------------------- build */
const index = await readFile('index.html', 'utf8');
const mainStart = index.indexOf('<main id="main">');
const ctaStart = index.indexOf('  <!-- ============ 9. CTA + contact form');
if (mainStart < 0 || ctaStart < 0) throw new Error('index.html landmarks not found');
const head = index.slice(0, mainStart);
const tail = index.slice(ctaStart);

const must = (html, from, to) => {
  if (!html.includes(from)) throw new Error(`build-pages: expected text not found in index.html: ${from.slice(0, 70)}`);
  return html.replace(from, to);
};

const all = [
  ...pages.map((p) => ({ ...p, ogImage: p.hero.src, current: [`<a class="mega__item" href="${p.file}">`, `<a class="mobile-menu__sub" href="${p.file}">`], body: [hero(p), cards(p), details(p), impact(p), caseStudy(p)] })),
  ...casePages.map((p) => ({ ...p, ogImage: p.photo.src, current: [`<a class="mega__case" href="${p.file}">`], body: [csHero(p), csProfile(p), csStory(p), csResults(p), csQuote(p)] })),
];

for (const p of all) {
  let h = head;
  h = h.replace(/<title>.*?<\/title>/, `<title>${p.metaTitle}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*/, `$1${p.metaDesc}`);
  h = h.replace(/(<meta property="og:title" content=")[^"]*/, `$1${p.metaTitle}`);
  h = h.replace(/(<meta property="og:description" content=")[^"]*/, `$1${p.metaDesc}`);
  h = h.replace(/(<meta property="og:image" content=")[^"]*/, `$1${p.ogImage}`);
  h = h.replace(/\s*<link rel="preload" as="image"[^>]*>/, '');
  h = h.replaceAll('href="#about"', 'href="index.html#about"');
  for (const tag of p.current) h = must(h, tag, tag.replace('>', ' aria-current="page">'));
  h = h.replace('<!doctype html>', `<!doctype html>\n<!-- Generated by build-pages.mjs — edit page content there and shared header/footer/form in index.html, then run: node build-pages.mjs -->`);

  let t = tail;
  t = must(t, 'Simplify your airport ground operations', 'Simplify your ground handling');
  t = must(t, 'Ready to see the difference? Schedule a personalized demo and discover how we can streamline your resource and data management.', 'Contact our team to learn how you can streamline resource and data management for your operations.');
  t = t.replaceAll('href="#about"', 'href="index.html#about"');
  // pre-select this solution in the lead form
  const sel = t.indexOf('id="f-solution"');
  const selEnd = t.indexOf('</select>', sel);
  let block = t.slice(sel, selEnd);
  block = must(block, '<option value="" disabled selected>Choose</option>', '<option value="" disabled>Choose</option>');
  block = must(block, `<option>${p.option}</option>`, `<option selected>${p.option}</option>`);
  t = t.slice(0, sel) + block + t.slice(selEnd);

  await writeFile(p.file, `${h}<main id="main">\n\n${p.body.filter(Boolean).join('\n\n')}\n\n${t}`);
  console.log('built', p.file);
}
