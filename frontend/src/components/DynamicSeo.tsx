'use client';

import React, { useEffect, useState } from 'react';
import { fetchPublicSeo, type PageSeoSettings } from '@/lib/api';

interface DynamicSeoProps {
  pageSlug: string;
}

export default function DynamicSeo({ pageSlug }: DynamicSeoProps) {
  const [seo, setSeo] = useState<PageSeoSettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchPublicSeo(pageSlug)
      .then((data) => {
        if (isMounted && data) {
          setSeo(data);

          // Update Document Title
          if (data.meta_title) {
            document.title = data.meta_title;
          }

          // Update or inject Meta tags
          const updateOrCreateMeta = (name: string, content: string, isProperty = false) => {
            if (!content) return;
            const attr = isProperty ? 'property' : 'name';
            let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute(attr, name);
              document.head.appendChild(el);
            }
            el.setAttribute('content', content);
          };

          if (data.meta_description) updateOrCreateMeta('description', data.meta_description);
          if (data.keywords) updateOrCreateMeta('keywords', data.keywords);
          if (data.robots_index) updateOrCreateMeta('robots', data.robots_index);
          if (data.google_verification) updateOrCreateMeta('google-site-verification', data.google_verification);
          if (data.bing_verification) updateOrCreateMeta('msvalidate.01', data.bing_verification);

          // Social OpenGraph
          if (data.og_title || data.meta_title) updateOrCreateMeta('og:title', data.og_title || data.meta_title, true);
          if (data.og_description || data.meta_description) updateOrCreateMeta('og:description', data.og_description || data.meta_description, true);
          if (data.og_image) updateOrCreateMeta('og:image', data.og_image, true);
          if (data.og_type) updateOrCreateMeta('og:type', data.og_type, true);

          // Twitter
          if (data.twitter_card) updateOrCreateMeta('twitter:card', data.twitter_card);
          if (data.twitter_site) updateOrCreateMeta('twitter:site', data.twitter_site);

          // Canonical Link
          if (data.canonical_url) {
            let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
            if (!canonical) {
              canonical = document.createElement('link');
              canonical.setAttribute('rel', 'canonical');
              document.head.appendChild(canonical);
            }
            canonical.setAttribute('href', data.canonical_url);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully without breaking UI
      });

    return () => {
      isMounted = false;
    };
  }, [pageSlug]);

  if (!seo || !seo.schema_json) return null;

  return (
    <script
      id={`json-ld-schema-${pageSlug}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: seo.schema_json }}
    />
  );
}
