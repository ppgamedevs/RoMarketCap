type CriticalEvent = {
  route: string;
  message: string;
  details?: Record<string, unknown>;
};

export async function notifyCritical(event: CriticalEvent) {
  // Always log locally.
  console.error("[critical]", { route: event.route, message: event.message, details: event.details ?? null });

  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) return;

  const payload = {
    text: `RoMarketCap critical: ${event.route}\n${event.message}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*RoMarketCap critical*\n*Route:* ${event.route}\n*Message:* ${event.message}` } },
      event.details
        ? { type: "section", text: { type: "mrkdwn", text: "```" + JSON.stringify(event.details, null, 2).slice(0, 2500) + "```" } }
        : undefined,
    ].filter(Boolean),
  };

  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
}


