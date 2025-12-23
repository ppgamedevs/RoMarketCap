"use client";

import { useState } from "react";

type TemplateType = "test" | "watchlist-alert" | "weekly-digest" | "claim-status" | "submission-status" | "partner-lead";

export function EmailPreviewClient() {
  const [selected, setSelected] = useState<TemplateType>("test");
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const templates: Array<{ type: TemplateType; label: string }> = [
    { type: "test", label: "Test Email" },
    { type: "watchlist-alert", label: "Watchlist Alert" },
    { type: "weekly-digest", label: "Weekly Digest" },
    { type: "claim-status", label: "Claim Status Update" },
    { type: "submission-status", label: "Submission Status Update" },
    { type: "partner-lead", label: "Partner Lead Notification" },
  ];

  const loadPreview = async (type: TemplateType) => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/admin/email-preview?type=${encodeURIComponent(type)}`);
      const data = await res.json();
      if (data.ok) {
        setPreview(data);
      } else {
        alert(`Error: ${data.error || "Failed to load preview"}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Select Template</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                setSelected(t.type);
                loadPreview(t.type);
              }}
              disabled={loading}
              className={`rounded-md border px-3 py-2 text-sm disabled:opacity-50 ${
                selected === t.type ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading preview...</div>}

      {preview && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-medium">Subject</h2>
            <p className="mt-2 text-sm">{preview.subject}</p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-medium">HTML Preview</h2>
            <div className="mt-4 rounded-md border bg-white p-4" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-medium">Plain Text</h2>
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{preview.text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

