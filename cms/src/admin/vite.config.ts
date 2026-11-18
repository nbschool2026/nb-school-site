import { mergeConfig, type Plugin, type UserConfig } from 'vite';

// Browser translation rewrites text nodes in the Slate blocks editor and breaks
// its mapping between the document and the DOM.
const preventBrowserTranslation: Plugin = {
  name: 'school-admin-prevent-browser-translation',
  enforce: 'post',
  transformIndexHtml(html) {
    return markAdminAsNotranslate(html);
  },
  generateBundle(_options, bundle) {
    // Strapi 5.56 can emit index.html late in generateBundle, after Vite's
    // transformIndexHtml hook has run.
    const page = bundle['index.html'];
    if (page?.type === 'asset' && typeof page.source === 'string') {
      page.source = markAdminAsNotranslate(page.source);
    }
  },
};

function markAdminAsNotranslate(html: string): string {
  if (!/<html\b/i.test(html) || !/<head\b/i.test(html)) return html;

  const withAttribute = html.replace(/<html\b([^>]*)>/i, (tag, attributes: string) =>
    /\btranslate\s*=/i.test(attributes) ? tag : `<html${attributes} translate="no">`
  );

  return /<meta\s+name=["']google["']\s+content=["']notranslate["']/i.test(withAttribute)
    ? withAttribute
    : withAttribute.replace(/<head\b([^>]*)>/i, '<head$1>\n<meta name="google" content="notranslate" />');
}

export default (config: UserConfig) => mergeConfig(config, {
  plugins: [preventBrowserTranslation],
});
