import React from 'react';
import { ClientSite } from '../types';

export const CITY_ALIASES: Record<string, string[]> = {
  'כפר סבא': ['כ"ס', 'כס', 'כפר-סבא'],
  'רמת השרון': ['רמה"ש', 'רמהש', 'רמת-השרון'],
  'פתח תקווה': ['פ"ת', 'פת', 'פתח-תקוה', 'פתח תקוה'],
  'תל אביב': ['ת"א', 'תא', 'תל-אביב', 'תל אביב יפו', 'יפו'],
  'ראשון לציון': ['ראשל"צ', 'ראשלצ', 'ראשון-לציון'],
  'הוד השרון': ['הוד"ש', 'הודש', 'הוד-השרון'],
  'הרצליה': ['הרצליה פיתוח'],
  'מודיעין-מכבים-רעות': ['מודיעין', 'מכבים', 'רעות'],
};

export function normalizeHebrewText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/["'״׳`\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchClient(client: ClientSite, rawQuery: string): boolean {
  if (!rawQuery || rawQuery.trim().length < 3) return false;

  const q = rawQuery.trim().toLowerCase();
  const normQ = normalizeHebrewText(q);

  // 1. Comax ID (exact or substring match)
  if (client.comaxId && (client.comaxId.toLowerCase().includes(q) || client.comaxId.includes(normQ))) {
    return true;
  }

  // 2. Client / Site name (including nicknames like אלירן, בוקטוס, שטיכמוס)
  const normName = normalizeHebrewText(client.name);
  if (normName.includes(normQ) || client.name.toLowerCase().includes(q)) {
    return true;
  }

  // 3. Address
  const normAddress = normalizeHebrewText(client.address);
  if (normAddress.includes(normQ) || client.address.toLowerCase().includes(q)) {
    return true;
  }

  // 4. City & Aliases (e.g. כ"ס -> כפר סבא, רמה"ש -> רמת השרון, פ"ת -> פתח תקווה)
  const normCity = normalizeHebrewText(client.city);
  if (normCity.includes(normQ) || client.city.toLowerCase().includes(q)) {
    return true;
  }

  for (const [canonicalCity, aliases] of Object.entries(CITY_ALIASES)) {
    const normCanonical = normalizeHebrewText(canonicalCity);
    const isClientInCity = normCity.includes(normCanonical) || normCanonical.includes(normCity);

    if (isClientInCity) {
      for (const alias of aliases) {
        const normAlias = normalizeHebrewText(alias);
        if (normQ.includes(normAlias) || normAlias.includes(normQ)) {
          return true;
        }
      }
    }
  }

  // 5. Contact info & District
  if (client.contactName && (client.contactName.toLowerCase().includes(q) || normalizeHebrewText(client.contactName).includes(normQ))) {
    return true;
  }
  if (client.district && normalizeHebrewText(client.district).includes(normQ)) {
    return true;
  }

  return false;
}

/**
 * Component to highlight matching substring in search results
 */
export const HighlightSubstring: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = '',
}) => {
  if (!query || query.trim().length < 2 || !text) {
    return <span className={className}>{text}</span>;
  }

  const cleanQuery = query.trim();
  const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === cleanQuery.toLowerCase() ? (
          <mark
            key={i}
            className="bg-sky-100/95 text-sky-700 font-black rounded-xs px-0.5 border-b border-sky-400 inline"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};
