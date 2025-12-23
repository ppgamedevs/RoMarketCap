"use client";

import { useState } from "react";
import type { Lang } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";
import { useRouter } from "next/navigation";

type DeleteAccountButtonProps = {
  lang: Lang;
  isPremium: boolean;
};

export function DeleteAccountButton({ lang }: DeleteAccountButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const requiredText = lang === "ro" ? "ȘTERGE" : "DELETE";

  const handleDelete = async () => {
    if (confirmText !== requiredText) return;

    setDeleting(true);
    try {
      track("DeleteAccountClick");
      const res = await fetch("/api/settings/delete", { method: "POST" });
      if (res.ok) {
        track("DeleteAccountSuccess");
        router.push("/");
        // User will be logged out automatically
      } else {
        const data = await res.json();
        alert(data.error || (lang === "ro" ? "Eroare la ștergere" : "Delete error"));
      }
    } catch (e) {
      console.error("Failed to delete account:", e);
      alert(lang === "ro" ? "Eroare la ștergere" : "Delete error");
    } finally {
      setDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        {lang === "ro" ? "Șterge cont" : "Delete Account"}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-red-600">
          {lang === "ro" ? "Atenție: Această acțiune este permanentă!" : "Warning: This action is permanent!"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? `Tastează "${requiredText}" pentru a confirma ștergerea contului.`
            : `Type "${requiredText}" to confirm account deletion.`}
        </p>
      </div>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={requiredText}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={confirmText !== requiredText || deleting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? (lang === "ro" ? "Ștergere..." : "Deleting...") : lang === "ro" ? "Confirmă ștergerea" : "Confirm deletion"}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false);
            setConfirmText("");
          }}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {lang === "ro" ? "Anulează" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

