"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";

type MergeCandidate = {
  id: string;
  sourceCompany: {
    id: string;
    name: string;
    legalName: string;
    cui: string | null;
    domain: string | null;
    county: string | null;
    industry: string | null;
  };
  targetCompany: {
    id: string;
    name: string;
    legalName: string;
    cui: string | null;
    domain: string | null;
    county: string | null;
    industry: string | null;
  };
  confidence: number;
  matchReasons: string[];
  status: string;
  diffJson: {
    source: Record<string, unknown>;
    target: Record<string, unknown>;
  };
  createdAt: string;
  reviewedBy: { name: string; email: string } | null;
  reviewNote: string | null;
};

export function MergeCandidatesClient() {
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [minConfidence, setMinConfidence] = useState(50);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        confidence: minConfidence.toString(),
        limit: "50",
      });
      const res = await fetch(`/api/admin/merges/candidates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [statusFilter, minConfidence]);

  const handleApprove = async (candidateId: string) => {
    if (!confirm("Are you sure you want to approve this merge? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/merges/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Approve failed");
      }

      alert("Merge approved successfully");
      fetchCandidates();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleReject = async (candidateId: string) => {
    const note = prompt("Rejection reason (optional):");
    if (note === null) return; // User cancelled

    try {
      const res = await fetch("/api/admin/merges/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, reviewNote: note || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reject failed");
      }

      alert("Merge rejected");
      fetchCandidates();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Confidence</label>
              <input
                type="number"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseInt(e.target.value) || 50)}
                min={0}
                max={100}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchCandidates}>Refresh</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Candidates List */}
      <Card>
        <CardHeader>
          <CardTitle>Merge Candidates ({candidates.length})</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates found</p>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          candidate.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                          candidate.status === "APPROVED" ? "bg-green-100 text-green-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {candidate.status}
                        </span>
                        <span className="text-sm font-medium">
                          Confidence: {candidate.confidence}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {candidate.matchReasons.join(", ")}
                        </span>
                      </div>

                      {/* Side-by-side diff */}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Source Company</h4>
                          <div className="text-sm space-y-1">
                            <div><strong>Name:</strong> {candidate.sourceCompany.name}</div>
                            {candidate.sourceCompany.cui && (
                              <div><strong>CUI:</strong> {candidate.sourceCompany.cui}</div>
                            )}
                            {candidate.sourceCompany.domain && (
                              <div><strong>Domain:</strong> {candidate.sourceCompany.domain}</div>
                            )}
                            {candidate.sourceCompany.county && (
                              <div><strong>County:</strong> {candidate.sourceCompany.county}</div>
                            )}
                            {candidate.sourceCompany.industry && (
                              <div><strong>Industry:</strong> {candidate.sourceCompany.industry}</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Target Company</h4>
                          <div className="text-sm space-y-1">
                            <div><strong>Name:</strong> {candidate.targetCompany.name}</div>
                            {candidate.targetCompany.cui && (
                              <div><strong>CUI:</strong> {candidate.targetCompany.cui}</div>
                            )}
                            {candidate.targetCompany.domain && (
                              <div><strong>Domain:</strong> {candidate.targetCompany.domain}</div>
                            )}
                            {candidate.targetCompany.county && (
                              <div><strong>County:</strong> {candidate.targetCompany.county}</div>
                            )}
                            {candidate.targetCompany.industry && (
                              <div><strong>Industry:</strong> {candidate.targetCompany.industry}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {candidate.reviewedBy && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reviewed by {candidate.reviewedBy.name} on{" "}
                          {new Date(candidate.createdAt).toLocaleDateString()}
                          {candidate.reviewNote && ` - ${candidate.reviewNote}`}
                        </div>
                      )}
                    </div>

                    {candidate.status === "PENDING" && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(candidate.id)}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(candidate.id)}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

