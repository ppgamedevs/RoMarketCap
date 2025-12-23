"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Lang } from "@/src/lib/i18n";

type LeaderboardEntry = {
  userId: string;
  conversions: number;
  ltv: number;
  rank: number;
};

type ReferralLeaderboardProps = {
  lang: Lang;
  userId: string;
};

export function ReferralLeaderboard({ lang, userId }: ReferralLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setLeaderboard(data.entries || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const userRank = leaderboard.findIndex((e) => e.userId === userId) + 1;

  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="text-sm font-medium">{lang === "ro" ? "Clasament" : "Leaderboard"}</h2>
        {userRank > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "ro" ? `Poziția ta: #${userRank}` : `Your rank: #${userRank}`}
          </p>
        )}
      </CardHeader>
      <CardBody>
        {loading ? (
          <p className="text-sm text-muted-foreground">{lang === "ro" ? "Se încarcă..." : "Loading..."}</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "ro" ? "Niciun clasament disponibil." : "No leaderboard available."}
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between border-b pb-2 ${entry.userId === userId ? "bg-primary/5 rounded p-2" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">#{entry.rank}</span>
                  <div>
                    <div className="font-medium">
                      {entry.userId === userId
                        ? lang === "ro"
                          ? "Tu"
                          : "You"
                        : lang === "ro"
                          ? "Utilizator"
                          : "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.conversions} {lang === "ro" ? "conversii" : "conversions"}
                    </div>
                  </div>
                </div>
                <Badge variant={entry.userId === userId ? "success" : "neutral"}>€{entry.ltv.toFixed(2)}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

