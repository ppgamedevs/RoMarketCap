"use client";

import { useState } from "react";
import { track } from "@/src/lib/analytics";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/Alert";

export function PartnersLeadForm({ lang }: { lang: "ro" | "en" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("api");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, company, useCase, message, hp }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setOk(true);
      track("PartnerLeadSubmit", { useCase });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">{lang === "ro" ? "Contact" : "Contact"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ro" ? "Trimite-ne un mesaj și revenim cu detalii." : "Send a message and we will follow up."}
        </p>
      </CardHeader>
      <CardBody>
        <div className="hidden">
          <label>Do not fill</label>
          <input value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>

        {ok ? (
          <Alert variant="success">
            <p className="text-sm">{lang === "ro" ? "Trimis. Verifică emailul." : "Sent. Check your email."}</p>
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Input
              placeholder={lang === "ro" ? "Nume" : "Name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              placeholder={lang === "ro" ? "Companie" : "Company"}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Select value={useCase} onChange={(e) => setUseCase(e.target.value)}>
              <option value="api">{lang === "ro" ? "API access" : "API access"}</option>
              <option value="exports">{lang === "ro" ? "Data exports" : "Data exports"}</option>
              <option value="reports">{lang === "ro" ? "Custom reports" : "Custom reports"}</option>
              <option value="media">{lang === "ro" ? "Media licensing" : "Media licensing"}</option>
              <option value="sponsorship">{lang === "ro" ? "Sponsorship placements" : "Sponsorship placements"}</option>
            </Select>
            <Textarea
              placeholder={lang === "ro" ? "Mesaj" : "Message"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : lang === "ro" ? "Trimite" : "Submit"}
            </Button>
            {error && (
              <Alert variant="error">
                <p className="text-sm">{error}</p>
              </Alert>
            )}
          </form>
        )}
      </CardBody>
    </Card>
  );
}


