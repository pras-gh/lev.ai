import { Resend } from "resend";

type EmailIntent = "login" | "report" | "gst";

const SUBJECT_BY_INTENT: Record<EmailIntent, string> = {
  login: "Your login code",
  report: "Monthly financial report - Trail",
  gst: "GST reminder",
};

function getIntent(value: unknown): EmailIntent {
  if (value === "report" || value === "gst") {
    return value;
  }

  return "login";
}

function sanitizeCode(value: unknown): string {
  if (typeof value !== "string") {
    return "482193";
  }

  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.length === 6 ? digits : "482193";
}

function transactionalMarkup(code: string) {
  return `<p>Your login code is: <strong>${code}</strong></p><p>If you did not request this, ignore this email.</p>`;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return Response.json({ success: false, error: "RESEND_API_KEY is missing." }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const payload = await request
    .json()
    .catch(() => ({} as { to?: unknown; code?: unknown; intent?: unknown }));
  const to =
    typeof payload.to === "string" && payload.to.trim().length > 0
      ? payload.to.trim()
      : "prasoonpathak527@gmail.com";
  const intent = getIntent(payload.intent);
  const code = sanitizeCode(payload.code);
  const subject = SUBJECT_BY_INTENT[intent];
  const html = transactionalMarkup(code);

  const { data, error } = await resend.emails.send({
    from: "Prasoon from Trail <noreply@usetrailai.com>",
    to,
    subject,
    html,
    text: `Your login code is: ${code}\n\nIf you did not request this, ignore this email.`,
  });

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    id: data?.id ?? null,
    subject,
    to,
  });
}
