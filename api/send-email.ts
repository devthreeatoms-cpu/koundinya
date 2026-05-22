import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

type SendEmailBody = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
  }

  const body = (req.body ?? {}) as SendEmailBody;
  const to = body.to;
  const subject = body.subject?.trim();
  const html = body.html?.trim();
  const text = body.text?.trim();
  const from = (body.from ?? process.env.RESEND_FROM_EMAIL ?? "noreply@workspace.koundinyaintegratedservices.com").trim();

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      error: "Missing required fields: to, subject, and one of html/text",
    });
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });
    return res.status(200).json({ ok: true, id: result.data?.id ?? null });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Failed to send email",
    });
  }
}
