import type { Lang } from '@/src/lib/i18n';

type TeamMember = {
  id: string;
  name: string;
  role: string;
  linkedIn?: string | null;
  photo?: string | null;
  verifiedAt?: Date | null;
};

type TeamSectionProps = {
  members: TeamMember[];
  lang: Lang;
  isClaimed: boolean;
};

export function TeamSection({ members, lang, isClaimed }: TeamSectionProps) {
  if (!members || members.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h3 className="text-sm font-medium">
          {lang === 'ro' ? 'Echipă & Management' : 'Team & Management'}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {isClaimed
            ? lang === 'ro'
              ? 'Adaugă membri ai echipei pentru a-ți îmbunătăți profilul'
              : 'Add team members to enhance your profile'
            : lang === 'ro'
            ? 'Revendică această companie pentru a adăuga informații despre echipă'
            : 'Claim this company to add team information'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Echipă & Management' : 'Team & Management'}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {member.photo ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{member.name}</p>
                {member.verifiedAt && (
                  <span className="text-xs text-primary" title={lang === 'ro' ? 'Verificat' : 'Verified'}>
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
              {member.linkedIn && (
                <a
                  href={member.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <span>💼</span>
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
