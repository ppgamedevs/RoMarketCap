import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  beforeSend(event) {
    // Don't log secrets
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["x-api-key"];
        delete event.request.headers["x-cron-secret"];
      }
      if (event.request?.cookies) {
        Object.keys(event.request.cookies).forEach((key) => {
          if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) {
            if (event.request?.cookies) {
              delete event.request.cookies[key];
            }
          }
        });
      }
    }
    return event;
  },
});

