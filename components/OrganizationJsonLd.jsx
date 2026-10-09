import Script from 'next/script';
import { getOrganizationJsonLd } from '@/lib/organizationSchema';

export default function OrganizationJsonLd() {
  const jsonLd = getOrganizationJsonLd();

  return (
    <Script
      id="organization-json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
