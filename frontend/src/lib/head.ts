import { useEffect } from 'react';

export interface HeadOptions {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'product.item';
  jsonLd?: object | object[] | null;
  robots?: string;
}

const DEFAULT_TITLE = 'Azim Realty — Find Your Perfect Place to Call Home';

function upsertMeta(sel: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data: object | object[] | null | undefined) {
  document
    .head
    .querySelectorAll('script[data-seo-jsonld="true"]')
    .forEach((n) => n.remove());
  if (!data) return;
  const items = Array.isArray(data) ? data : [data];
  for (const d of items) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-seo-jsonld', 'true');
    s.textContent = JSON.stringify(d);
    document.head.appendChild(s);
  }
}

export function useHead(opts: HeadOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    const title = opts.title ? `${opts.title} · Azim Realty` : DEFAULT_TITLE;
    document.title = title;

    if (opts.description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: opts.description });
    }
    upsertMeta('meta[name="robots"]', {
      name: 'robots', content: opts.robots ?? 'index,follow',
    });

    const url = opts.canonical ?? window.location.href;
    upsertLink('canonical', url);

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    if (opts.description) {
      upsertMeta('meta[property="og:description"]', {
        property: 'og:description', content: opts.description,
      });
    }
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: opts.type ?? 'website' });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    if (opts.image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: opts.image });
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: opts.image });
    } else {
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
    }
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    if (opts.description) {
      upsertMeta('meta[name="twitter:description"]', {
        name: 'twitter:description', content: opts.description,
      });
    }

    setJsonLd(opts.jsonLd ?? null);

    return () => {
      document.title = previousTitle;
      setJsonLd(null);
    };
    // Rebuild head whenever the inputs change. JSON-compare to avoid every-render churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(opts)]);
}
