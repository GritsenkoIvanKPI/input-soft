// What can be edited on each type of page, and how the admin shows it.
// Field types: text, textarea (Enter = line break), rich (text with links), number, toggle, select,
// icon, theme, link, image, tags, list (repeatable items), group (nested fields).
// "key" may be a dotted path ("menu.title"); "." means the object itself.

const heading = (key = 'heading', label = 'Heading') => ({ key, type: 'textarea', label, rows: 2, help: 'Press Enter for a line break.' });
const eyebrow = (key = 'eyebrow') => ({ key, type: 'text', label: 'Small label above the heading' });
const image = (key = 'image', label = 'Image', help) => ({ key, type: 'image', label, help });
const paragraphs = (key = 'paragraphs', label = 'Paragraphs') => ({ key, type: 'list', label, item: { type: 'textarea', label: 'Paragraph' }, addLabel: 'Add paragraph' });
const iconCard = (label, extra = []) => ({ fields: [{ key: 'icon', type: 'icon', label: 'Icon' }, { key: 'title', type: 'text', label: 'Title' }, { key: 'text', type: 'textarea', label: 'Text' }, ...extra], summary: 'title', label });
const logos = (key, label) => ({
  key, type: 'list', label, addLabel: 'Add logo',
  item: { label: 'Logo', summary: 'alt', fields: [{ key: '.', type: 'image', label: 'Logo', noSize: true }, { key: 'tall', type: 'toggle', label: 'Square or stacked logo (shown larger)' }] },
});
const links = (key, label) => ({ key, type: 'list', label, addLabel: 'Add link', item: { label: 'Link', summary: 'text', fields: [{ key: 'text', type: 'text', label: 'Text' }, { key: 'href', type: 'link', label: 'Goes to' }] } });
const checklist = (key = 'checklist', label = 'Checklist') => ({
  key, type: 'list', label, addLabel: 'Add point',
  item: { label: 'Point', summary: (c) => c.bold || c.text, fields: [{ key: 'bold', type: 'text', label: 'Bold start (optional)', placeholder: 'e.g. Fully automated planning:' }, { key: 'text', type: 'textarea', label: 'Text' }] },
});
const seo = [
  { key: 'seo.title', type: 'text', label: 'Browser tab and Google title' },
  { key: 'seo.description', type: 'textarea', label: 'Google description', help: 'About 150 characters. Shown under the title in search results.' },
];
const menuSettings = (what) => [
  { key: 'showInMenu', type: 'toggle', label: 'Show in menu', help: `Lists this ${what} in the Solutions dropdown, the mobile menu${what === 'solution' ? ' and the footer' : ''}.` },
  { key: 'order', type: 'number', label: 'Position in menu', help: '1 = first.' },
  { key: 'menu.title', type: 'text', label: 'Name in menu' },
  { key: 'menu.desc', type: 'text', label: 'Short description in menu' },
];
const benefit = (withTitle) => ({
  label: 'Tile', summary: withTitle ? 'title' : 'text',
  fields: [
    { key: 'pre', type: 'text', label: 'Small text above the number (optional)', placeholder: 'Up to' },
    { key: 'value', type: 'text', label: 'Big number (optional)', placeholder: '60%', help: 'Leave empty to show an icon instead. A trailing %, + or K is highlighted.' },
    { key: 'icon', type: 'icon', label: 'Icon (when there is no number)' },
    ...(withTitle ? [{ key: 'title', type: 'text', label: 'Title' }] : []),
    { key: 'text', type: 'textarea', label: 'Text' },
  ],
});

/* ------------------------------------------------------------------ home */
const home = [
  { id: 'settings', title: 'Page settings', desc: 'Search engine title and descriptions', path: [], fields: [
    ...seo,
    { key: 'seo.ogDescription', type: 'textarea', label: 'Description when shared on social media' },
  ] },
  { id: 'hero', title: 'Hero', desc: 'Main heading, announcement and buttons', path: ['sections', 'hero'], fields: [
    heading('title', 'Main heading'),
    { key: 'lead', type: 'textarea', label: 'Text under the heading' },
    { key: 'announce', type: 'group', label: 'Announcement link', fields: [
      { key: 'show', type: 'toggle', label: 'Show announcement' },
      { key: 'pill', type: 'text', label: 'Badge', placeholder: 'New' },
      { key: 'text', type: 'text', label: 'Text' },
      { key: 'more', type: 'text', label: 'Extra text (hidden on phones)' },
      { key: 'href', type: 'link', label: 'Goes to' },
    ] },
    { key: 'primaryCta', type: 'text', label: 'Yellow button (opens the demo form)' },
    { key: 'secondaryCta', type: 'group', label: 'Second button', fields: [{ key: 'text', type: 'text', label: 'Text' }, { key: 'href', type: 'link', label: 'Goes to' }] },
    { key: 'pill', type: 'group', label: 'Bottom-right link', fields: [
      { key: 'muted', type: 'text', label: 'Grey text' }, { key: 'text', type: 'text', label: 'Text' }, { key: 'href', type: 'link', label: 'Goes to' },
    ] },
    image('image', 'Background image'),
  ] },
  { id: 'featured', title: 'Featured in', desc: 'Scrolling media logos', path: ['sections', 'featured'], fields: [
    { key: 'show', type: 'toggle', label: 'Show this section' },
    { key: 'label', type: 'text', label: 'Label' },
    logos('logos', 'Logos'),
  ] },
  { id: 'features', title: 'Key features', desc: 'Four feature cards', path: ['sections', 'features'], fields: [
    heading(), { key: 'lead', type: 'textarea', label: 'Text under the heading' },
    { key: 'items', type: 'list', label: 'Cards', addLabel: 'Add card', item: iconCard('Card') },
  ] },
  { id: 'solutions', title: 'Solutions', desc: 'Solution list with screenshots', path: ['sections', 'solutions'], fields: [
    eyebrow(), heading(), { key: 'sub', type: 'text', label: 'Text under the heading' },
    { key: 'items', type: 'list', label: 'Solutions', addLabel: 'Add solution', item: { label: 'Solution', summary: 'name', fields: [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'href', type: 'link', label: 'Page' },
      { key: 'text', type: 'textarea', label: 'Description' },
      { key: 'cardText', type: 'textarea', label: 'Shorter description for phones (optional)' },
      { key: 'tags', type: 'tags', label: 'Tags', help: 'Separate with commas.' },
      { key: 'theme', type: 'theme', label: 'Card glow colour' },
      image('image', 'Screenshot'),
    ] } },
    { key: 'note', type: 'textarea', label: 'Note under the list' },
  ] },
  { id: 'innovation', title: 'AI capabilities', desc: 'Blue panel with three cards', path: ['sections', 'innovation'], fields: [
    { key: 'show', type: 'toggle', label: 'Show this section' },
    eyebrow(), heading(), { key: 'lead', type: 'textarea', label: 'Text under the heading' },
    { key: 'items', type: 'list', label: 'Cards', addLabel: 'Add card', item: iconCard('Card', [image('image', 'Screenshot')]) },
  ] },
  { id: 'steps', title: 'How it works', desc: 'Steps with screenshots', path: ['sections', 'steps'], fields: [
    eyebrow(), heading(), { key: 'lead', type: 'textarea', label: 'Text next to the heading' },
    { key: 'items', type: 'list', label: 'Steps', addLabel: 'Add step', item: { label: 'Step', summary: 'title', fields: [
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'text', type: 'textarea', label: 'Text' },
      image('image', 'Screenshot'),
      image('phone', 'Phone screen on top (optional)', 'A tall mobile screenshot shown over the main one.'),
    ] } },
  ] },
  { id: 'specs', title: 'Key specifications', desc: 'Grid of specification tiles', path: ['sections', 'specs'], fields: [
    eyebrow(), heading(),
    { key: 'items', type: 'list', label: 'Tiles', addLabel: 'Add tile', item: iconCard('Tile') },
  ] },
  { id: 'clients', title: 'Trusted by', desc: 'Client logos (hidden until logos are added)', path: ['sections', 'clients'], fields: [
    { key: 'show', type: 'toggle', label: 'Show this section' },
    heading(), { key: 'sub', type: 'text', label: 'Text under the heading' },
    logos('logos', 'Client logos'),
  ] },
  { id: 'impact', title: 'Key metrics', desc: 'Numbers and case study tiles', path: ['sections', 'impact'], fields: [
    eyebrow(), heading(),
    { key: 'metrics', type: 'list', label: 'Number tiles', help: 'The first two appear before the case study photos, the rest after.', addLabel: 'Add number', item: { label: 'Number', summary: 'label', fields: [
      { key: 'pre', type: 'text', label: 'Small text above (optional)', placeholder: 'Up to' },
      { key: 'before', type: 'text', label: 'Before the number', placeholder: '$' },
      { key: 'number', type: 'text', label: 'Number (counts up)', placeholder: '110' },
      { key: 'after', type: 'text', label: 'After the number', placeholder: 'K' },
      { key: 'accent', type: 'text', label: 'Yellow part at the end', placeholder: '%' },
      { key: 'label', type: 'textarea', label: 'Description' },
      { key: 'icon', type: 'icon', label: 'Icon' },
      { key: 'source', type: 'text', label: 'Source label', placeholder: 'Resource Management' },
      { key: 'yellow', type: 'toggle', label: 'Yellow tile' },
    ] } },
    { key: 'cases', type: 'list', label: 'Case study photos', max: 2, addLabel: 'Add case study', item: { label: 'Case study', summary: 'title', fields: [
      { key: 'label', type: 'text', label: 'Label' }, { key: 'title', type: 'text', label: 'Title' }, { key: 'href', type: 'link', label: 'Page' }, image('image', 'Photo'),
    ] } },
  ] },
  { id: 'about', title: 'About us', desc: 'Company story, facts and backers', path: ['sections', 'about'], fields: [
    image('image', 'Photo'),
    { key: 'quoteLabel', type: 'text', label: 'Label on the photo' },
    { key: 'quote', type: 'textarea', label: 'Text on the photo' },
    eyebrow(), heading(),
    paragraphs(),
    { key: 'facts', type: 'list', label: 'Facts', addLabel: 'Add fact', item: { label: 'Fact', summary: 'value', fields: [{ key: 'value', type: 'text', label: 'Value', placeholder: '50+' }, { key: 'label', type: 'text', label: 'Description' }] } },
    { key: 'backersLabel', type: 'text', label: 'Backers label' },
    logos('backers', 'Backer logos'),
  ] },
];

/* -------------------------------------------------------------- solution */
const media = { key: 'media', type: 'group', label: 'Picture', fields: [
  { key: 'type', type: 'select', label: 'Type', options: [['image', 'One screenshot'], ['phones', 'Phone screens']] },
  { key: 'image', type: 'image', label: 'Screenshot', showIf: (m) => m.type !== 'phones' },
  { key: 'phones', type: 'list', label: 'Phone screens', max: 3, addLabel: 'Add phone screen', showIf: (m) => m.type === 'phones',
    item: { label: 'Phone screen', summary: 'alt', fields: [{ key: '.', type: 'image', label: 'Screen', noSize: true }] } },
] };

const solution = [
  { id: 'settings', title: 'Page settings', desc: 'Menu, colour, address and search engines', path: [], fields: [
    ...menuSettings('solution'),
    { key: 'menu.icon', type: 'icon', label: 'Icon in menu' },
    { key: 'theme', type: 'theme', label: 'Colour theme' },
    { key: 'formOption', type: 'formOption', label: 'Pre-selected solution in the contact form' },
    ...seo,
  ] },
  { id: 'hero', title: 'Hero', desc: 'Title, intro and main screenshot', path: ['hero'], fields: [
    { key: 'crumb', type: 'text', label: 'Label next to “Solutions”', placeholder: 'Software suite' },
    heading('title', 'Title'),
    { key: 'lead', type: 'textarea', label: 'Intro text' },
    image('image', 'Main screenshot'),
  ] },
  { id: 'cards', title: 'Overview cards', desc: 'Three cards under the hero', path: ['cards'], fields: [
    eyebrow(), heading(),
    { key: 'items', type: 'list', label: 'Cards', addLabel: 'Add card', item: iconCard('Card') },
  ] },
  { id: 'details', title: 'Details', desc: 'Text and picture rows', path: ['details'], fields: [
    { key: 'eyebrow', type: 'text', label: 'Small label above the heading (optional)' },
    { key: 'heading', type: 'textarea', label: 'Section heading (optional)', rows: 2 },
    { key: 'lead', type: 'textarea', label: 'Text under the heading (optional)' },
    { key: 'numbered', type: 'toggle', label: 'Number the rows (1, 2, 3…)' },
    { key: 'rows', type: 'list', label: 'Rows', addLabel: 'Add row', help: 'Rows alternate: text left, then text right.', item: { label: 'Row', summary: (r) => (r.layout === 'modules' ? `Modules: ${(r.modules || []).map((m) => m.title).join(', ')}` : r.title), fields: [
      { key: 'layout', type: 'select', label: 'Layout', options: [['split', 'Text and picture'], ['modules', 'Modules that switch while scrolling, one picture']] },
      { key: 'title', type: 'text', label: 'Title', showIf: (r) => r.layout !== 'modules' },
      paragraphs(),
      { ...checklist(), help: 'If the checklist has points, it is shown instead of the paragraphs.', showIf: (r) => r.layout !== 'modules' },
      { key: 'modules', type: 'list', label: 'Modules', addLabel: 'Add module', showIf: (r) => r.layout === 'modules', item: { label: 'Module', summary: 'title', fields: [{ key: 'title', type: 'text', label: 'Title' }, paragraphs()] } },
      media,
    ].map((f) => (f.key === 'paragraphs' ? { ...f, showIf: (r) => r.layout !== 'modules' } : f)) } },
  ] },
  { id: 'impact', title: 'Results', desc: 'Blue panel with benefit tiles', path: ['impact'], fields: [
    eyebrow(), heading(),
    { key: 'wide', type: 'toggle', label: 'Wide heading' },
    { key: 'items', type: 'list', label: 'Tiles', addLabel: 'Add tile', item: benefit(true) },
  ] },
  { id: 'caseStudy', title: 'Case study banner', desc: 'Yellow banner linking to a case study', path: ['caseStudy'], fields: [
    { key: 'show', type: 'toggle', label: 'Show the banner' },
    { key: 'page', type: 'casePage', label: 'Case study' },
    { key: 'title', type: 'textarea', label: 'Banner title (optional)', help: 'Leave empty to use the case study’s own title.' },
  ] },
];

/* ------------------------------------------------------------ case study */
const story = (key, label) => ({ key, type: 'group', label, fields: [
  paragraphs(),
  { key: 'listTitle', type: 'text', label: 'Text above the list (optional)' },
  checklist('list', 'List'),
] });

const caseStudy = [
  { id: 'settings', title: 'Page settings', desc: 'Menu, colour, address and search engines', path: [], fields: [
    ...menuSettings('case study'),
    { key: 'theme', type: 'theme', label: 'Colour theme' },
    { key: 'formOption', type: 'formOption', label: 'Pre-selected solution in the contact form' },
    ...seo,
  ] },
  { id: 'hero', title: 'Hero', desc: 'Title, solution link and photo', path: [], fields: [
    heading('title', 'Title'),
    { key: 'solution.name', type: 'text', label: 'Solution name' },
    { key: 'solution.href', type: 'link', label: 'Solution page' },
    { key: 'photo', type: 'image', label: 'Photo' },
  ] },
  { id: 'profile', title: 'Client profile', desc: 'Company facts and overview', path: [], fields: [
    { key: 'profile.company', type: 'text', label: 'Company' },
    { key: 'profile.about', type: 'textarea', label: 'About the company (optional)' },
    { key: 'profile.industry', type: 'text', label: 'Industry' },
    { key: 'profile.region', type: 'text', label: 'Region' },
    { key: 'profile.clientSince', type: 'text', label: 'Client since' },
    paragraphs('overview', 'Operational overview'),
  ] },
  { id: 'story', title: 'Challenge and solution', desc: 'Two side-by-side blocks', path: [], fields: [
    story('challenge', 'Challenge'),
    story('solutionBlock', 'Solution'),
  ] },
  { id: 'results', title: 'Results', desc: 'Before and after table and key wins', path: ['results'], fields: [
    heading(),
    { key: 'table', type: 'list', label: 'Before and after table (optional)', addLabel: 'Add row', item: { label: 'Row', summary: 'metric', fields: [
      { key: 'metric', type: 'text', label: 'Metric' }, { key: 'before', type: 'text', label: 'Before' }, { key: 'after', type: 'text', label: 'After' }, { key: 'impact', type: 'text', label: 'Impact' },
    ] } },
    { key: 'note', type: 'textarea', label: 'Text under the table (optional)' },
    { key: 'winsHeading', type: 'text', label: 'Heading above the tiles (only with a table)' },
    { key: 'wins', type: 'list', label: 'Key wins', addLabel: 'Add tile', item: benefit(false) },
  ] },
  { id: 'quote', title: 'Client quote', desc: 'Yellow quote block', path: ['quote'], fields: [
    { key: 'show', type: 'toggle', label: 'Show the quote' },
    paragraphs('paragraphs', 'Quote'),
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'role', type: 'text', label: 'Role and company' },
  ] },
];

/* ----------------------------------------------------------------- legal */
const legal = [
  { id: 'settings', title: 'Page settings', desc: 'Search engines', path: [], fields: seo },
  { id: 'hero', title: 'Header', desc: 'Title and intro', path: [], fields: [
    { key: 'crumb', type: 'text', label: 'Small label above the title' },
    heading('title', 'Title'),
    { key: 'lead', type: 'textarea', label: 'Intro text' },
  ] },
  { id: 'body', title: 'Sections', desc: 'Numbered sections with a contents list', path: [], fields: [
    { key: 'sections', type: 'list', label: 'Sections', addLabel: 'Add section', item: { label: 'Section', summary: 'title', fields: [
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'blocks', type: 'list', label: 'Content', addLabel: 'Add block', item: { label: 'Block', summary: (b) => (b.type === 'paragraph' ? b.text : `${b.type === 'list' ? 'Bullet list' : 'Principle cards'} (${(b.items || []).length})`), fields: [
        { key: 'type', type: 'select', label: 'Type', options: [['paragraph', 'Paragraph'], ['list', 'Bullet list'], ['principles', 'Numbered cards']] },
        { key: 'text', type: 'rich', label: 'Text', showIf: (b) => b.type === 'paragraph' },
        { key: 'items', type: 'list', label: 'Items', addLabel: 'Add item', showIf: (b) => b.type !== 'paragraph', item: { type: 'rich', label: 'Item' } },
      ] } },
    ] } },
  ] },
];

/* -------------------------------------------------------------- site-wide */
export const SITE_PARTS = [
  { id: 'nav', title: 'Header and menu', desc: 'Top menu on every page', path: ['nav'], previewSection: 'top', fields: [
    { key: 'solutionsLabel', type: 'text', label: 'Dropdown button' },
    { key: 'solutionsColumn', type: 'text', label: 'Solutions column label' },
    { key: 'casesColumn', type: 'text', label: 'Case studies column label' },
    links('links', 'Other menu links'),
    { key: 'cta', type: 'text', label: 'Yellow button' },
  ], note: 'Solution pages and case studies are added to the menu automatically when their “Show in menu” switch is on.' },
  { id: 'contact', title: 'Contact block and form', desc: 'Shown at the bottom of every page', path: ['contact'], previewSection: 'contact', fields: [
    eyebrow(),
    { key: 'email', type: 'text', label: 'Email address' },
    { key: 'home', type: 'group', label: 'On the home page', fields: [heading('title', 'Heading'), { key: 'lead', type: 'textarea', label: 'Text' }] },
    { key: 'inner', type: 'group', label: 'On all other pages', fields: [heading('title', 'Heading'), { key: 'lead', type: 'textarea', label: 'Text' }] },
    { key: 'form', type: 'group', label: 'Form', fields: [
      { key: 'title', type: 'text', label: 'Form title' },
      { key: 'text', type: 'textarea', label: 'Form text' },
      { key: 'options', type: 'list', label: 'Solutions to choose from', addLabel: 'Add option', item: { type: 'text', label: 'Option' } },
      { key: 'consent', type: 'rich', label: 'Consent text' },
      { key: 'submit', type: 'text', label: 'Button' },
      { key: 'ok', type: 'text', label: 'Success message' },
      { key: 'error', type: 'text', label: 'Error message' },
    ] },
  ] },
  { id: 'footer', title: 'Footer', desc: 'Links, offices and socials', path: ['footer'], previewSection: 'footer', fields: [
    { key: 'tagline', type: 'textarea', label: 'Text under the logo' },
    { key: 'socials', type: 'list', label: 'Social links', addLabel: 'Add social link', item: { label: 'Social link', summary: 'network', fields: [
      { key: 'network', type: 'select', label: 'Network', options: [['linkedin', 'LinkedIn'], ['x', 'X (Twitter)'], ['instagram', 'Instagram']] },
      { key: 'href', type: 'text', label: 'Address', placeholder: 'https://' },
    ] } },
    { key: 'solutionsTitle', type: 'text', label: 'Solutions column title' },
    { key: 'companyTitle', type: 'text', label: 'Company column title' },
    links('companyLinks', 'Company links'),
    { key: 'officesTitle', type: 'text', label: 'Offices column title' },
    { key: 'offices', type: 'list', label: 'Offices', addLabel: 'Add office', item: { label: 'Office', summary: 'country', fields: [{ key: 'country', type: 'text', label: 'Country' }, { key: 'address', type: 'textarea', label: 'Address' }] } },
    { key: 'securityTitle', type: 'text', label: 'Security column title' },
    { key: 'copyright', type: 'text', label: 'Copyright' },
    links('legalLinks', 'Bottom links'),
  ] },
];

export const PAGE_SCHEMAS = { home, solution, case: caseStudy, legal };

// Empty values used when an editor adds a new item to a list.
export function emptyItem(item) {
  if (item.type) return '';
  const o = {};
  for (const f of item.fields) {
    if (f.key === '.') Object.assign(o, { src: '', alt: '' });
    else setPath(o, f.key, emptyValue(f));
  }
  return o;
}

function emptyValue(f) {
  if (f.type === 'list') return [];
  if (f.type === 'toggle') return false;
  if (f.type === 'image') return { src: '', alt: '' };
  if (f.type === 'tags') return [];
  if (f.type === 'group') return emptyItem(f);
  if (f.type === 'select') return f.options[0][0];
  if (f.type === 'theme') return 'rms';
  if (f.type === 'number') return 1;
  return '';
}

export function getPath(obj, key) {
  if (key === '.') return obj;
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, key, value) {
  if (key === '.') return Object.assign(obj, value);
  const ks = key.split('.');
  let o = obj;
  ks.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[ks[ks.length - 1]] = value;
  return obj;
}
