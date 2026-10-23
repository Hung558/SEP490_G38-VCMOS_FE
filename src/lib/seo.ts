export const sharedMetadata = (urlLogo: { src: string }) => ({
  title: 'BHS - Bkav Hardware Solution',
  description:
    "BHS - Bkav Hardware Solution was spun off from Bkav Technology Group, with 20 years of experience in high-tech electronics. Now part of the Bkav Ecosystem, BHS promotes the 'Make in Vietnam' electronics industry.",
  robots: 'index, follow',
  openGraph: {
    title: 'BHS - Bkav Hardware Solution',
    description:
      'ODM services and high-tech products like SOM, AI Box. BHS accelerates product development with full-stack electronic design and manufacturing.',
    url: process.env.NEXT_PUBLIC_REACT_APP_SITE_URL,
    siteName: 'Bkav Hardware Solution',
    images: [
      {
        url: urlLogo.src, // 👉 Cập nhật URL ảnh đại diện phù hợp
        width: 1200,
        height: 630,
        alt: 'BHS - Bkav Hardware Solution',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: urlLogo.src,
    shortcut: urlLogo.src,
    apple: urlLogo.src,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_REACT_APP_SITE_URL || ''),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_REACT_APP_SITE_URL,
  },
});
