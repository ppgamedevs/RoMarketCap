"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";

type Check = {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

export function ConversionTrackingChecks() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/conversion-tracking/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setChecks(data.checks || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allPass = checks.every((c) => c.status === "pass");
  const hasFailures = checks.some((c) => c.status === "fail");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Tracking Checks</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetch("/api/admin/conversion-tracking/check")
                .then((res) => res.json())
                .then((data) => {
                  if (data.ok) {
                    setChecks(data.checks || []);
                  }
                })
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checks available.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Overall Status:</span>
              {allPass ? (
                <Badge variant="success">All Pass</Badge>
              ) : hasFailures ? (
                <Badge variant="danger">Failures Detected</Badge>
              ) : (
                <Badge variant="warning">Warnings</Badge>
              )}
            </div>
            {checks.map((check, idx) => (
              <div key={idx} className="flex items-start justify-between border-b pb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{check.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{check.message}</div>
                </div>
                <Badge
                  variant={check.status === "pass" ? "success" : check.status === "fail" ? "danger" : "warning"}
                >
                  {check.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

