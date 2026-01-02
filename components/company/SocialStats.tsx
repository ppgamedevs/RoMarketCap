import type { Lang } from '@/src/lib/i18n';

type SocialStatsProps = {
  socials?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  } | null;
  website?: string | null;
  lang: Lang;
};

export function SocialStats({ socials, website, lang }: SocialStatsProps) {
  const socialLinks = [];

  if (website) {
    socialLinks.push({
      name: 'Website',
      url: website.startsWith('http') ? website : `https://${website}`,
      icon: '🌐',
    });
  }

  if (socials) {
    if (socials.linkedin) {
      socialLinks.push({
        name: 'LinkedIn',
        url: socials.linkedin,
        icon: '💼',
      });
    }
    if (socials.facebook) {
      socialLinks.push({
        name: 'Facebook',
        url: socials.facebook,
        icon: '📘',
      });
    }
    if (socials.twitter) {
      socialLinks.push({
        name: 'Twitter',
        url: socials.twitter,
        icon: '🐦',
      });
    }
    if (socials.instagram) {
      socialLinks.push({
        name: 'Instagram',
        url: socials.instagram,
        icon: '📸',
      });
    }
  }

  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Legături sociale' : 'Social Links'}
      </h3>
      <div className="mt-3 space-y-2">
        {socialLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors group"
          >
            <span className="text-lg" aria-hidden="true">{link.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                {link.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {link.url.replace(/^https?:\/\/(www\.)?/, '')}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
