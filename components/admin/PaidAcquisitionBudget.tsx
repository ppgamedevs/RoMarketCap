"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";

export function PaidAcquisitionBudget() {
  const [dailyBudget, setDailyBudget] = useState(0);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/paid-acquisition/budget")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setDailyBudget(data.dailyBudget || 0);
          setMonthlyBudget(data.monthlyBudget || 0);
          setTotalSpent(data.totalSpent || 0);
          setKillSwitchEnabled(data.killSwitchEnabled || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/paid-acquisition/budget", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dailyBudget,
          monthlyBudget,
          killSwitch: killSwitchEnabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Settings saved");
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card><CardBody><p className="text-sm text-muted-foreground">Loading...</p></CardBody></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">Budget Settings</h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Daily Budget (EUR)</label>
            <input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">Maximum daily spending for paid acquisition</p>
          </div>

          <div>
            <label className="text-sm font-medium">Monthly Budget (EUR)</label>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">Maximum monthly spending for paid acquisition</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={killSwitchEnabled}
                onChange={(e) => setKillSwitchEnabled(e.target.checked)}
              />
              Kill Switch Enabled
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              When enabled, all paid acquisition is immediately stopped
            </p>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Spent:</span>
              <span className="font-medium">€{totalSpent.toFixed(2)}</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

