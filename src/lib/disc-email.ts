const RESEND_API_URL = "https://api.resend.com/emails";

function getFromEmail() {
  return process.env.DISC_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "no-reply@example.com";
}

export async function sendDiscEmail(params: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY for DISC email delivery.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Email delivery failed with status ${response.status}: ${errorBody.slice(0, 200)}`);
  }
}
