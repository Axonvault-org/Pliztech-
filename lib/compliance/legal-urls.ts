import * as WebBrowser from 'expo-web-browser';

import { getContactInfo } from '@/lib/api/contact';

export type LegalDocumentKind = 'terms' | 'privacy' | 'guidelines';

/** Fallback URLs when GET /api/contact is unavailable. */
export const DEFAULT_LEGAL_URLS: Record<LegalDocumentKind, string> = {
  terms: 'https://plz.ng/terms/',
  privacy: 'https://plz.ng/privacy/',
  guidelines: 'https://plz.ng/guidelines',
};

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentKind, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  guidelines: 'Community Guidelines',
};

let cachedLegalUrls: Partial<Record<LegalDocumentKind, string>> | null = null;

export async function resolveLegalUrl(kind: LegalDocumentKind): Promise<string> {
  if (!cachedLegalUrls) {
    try {
      const contact = await getContactInfo();
      cachedLegalUrls = {
        terms: contact.legal.termsOfService,
        privacy: contact.legal.privacyPolicy,
        guidelines: contact.legal.communityGuidelines,
      };
    } catch {
      cachedLegalUrls = {};
    }
  }
  return cachedLegalUrls[kind]?.trim() || DEFAULT_LEGAL_URLS[kind];
}

export async function openLegalDocument(kind: LegalDocumentKind): Promise<void> {
  const url = await resolveLegalUrl(kind);
  await WebBrowser.openBrowserAsync(url);
}
