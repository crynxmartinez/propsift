export function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PropSift',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Smart CRM for real estate wholesalers. Organize leads, automate follow-ups, track analytics & close more deals.',
    url: 'https://propsift.com',
    logo: 'https://storage.googleapis.com/msgsndr/xzA6eU8kOYmBuwFdr3CF/media/6972f53c15885e29eeb6832e.jpg',
    screenshot: 'https://storage.googleapis.com/msgsndr/xzA6eU8kOYmBuwFdr3CF/media/6972f53c15885e29eeb6832e.jpg',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free trial available',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
      bestRating: '5',
      worstRating: '1',
    },
    author: {
      '@type': 'Organization',
      name: 'PropSift',
      url: 'https://propsift.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PropSift',
      url: 'https://propsift.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://storage.googleapis.com/msgsndr/xzA6eU8kOYmBuwFdr3CF/media/6972f53c15885e29eeb6832e.jpg',
      },
    },
    featureList: [
      'Lead Management',
      'Smart Lead Scoring',
      'Automated Follow-up Cadence',
      'Real-time Analytics',
      'Temperature-based Prioritization',
      'Custom Statuses & Call Results',
      'Team Collaboration',
      'DockInsight Calling Dashboard',
    ],
    keywords: [
      'real estate CRM',
      'wholesaler CRM',
      'real estate lead management',
      'property lead analytics',
      'lead scoring software',
    ],
  }

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PropSift',
    url: 'https://propsift.com',
    logo: 'https://storage.googleapis.com/msgsndr/xzA6eU8kOYmBuwFdr3CF/media/6972f53c15885e29eeb6832e.jpg',
    description: 'Smart CRM for real estate wholesalers and investors.',
    sameAs: [
      'https://twitter.com/propsift',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@propsift.com',
    },
  }

  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PropSift',
    url: 'https://propsift.com',
    description: 'Smart CRM for real estate wholesalers. Organize leads, automate follow-ups, track analytics & close more deals.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://propsift.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
    </>
  )
}
