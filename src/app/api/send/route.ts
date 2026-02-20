import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  await resend.emails.send({
    from: "Trail <noreply@usetrailai.com>",
    to: "prasoonpathak527@gmail.com",
    subject: "Trail Test Email",
    html: "<strong>It works 🚀</strong>",
  });

  return Response.json({ success: true });
}
