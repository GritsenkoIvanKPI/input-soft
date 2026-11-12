// List of pages and images, published with the site so the admin can read content without GitHub.
export function manifest(pages, images) {
  return `${JSON.stringify({ pages: pages.map((p) => p.file).sort(), images: [...new Set(images)].sort() }, null, 2)}\n`;
}
