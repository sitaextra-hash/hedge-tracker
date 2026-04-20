import { Resend } from "resend";
import type { Alert } from "./alerts";

const resend = new Resend(process.env.RESEND_API_KEY);

const SEVERITY_COLOR: Record<Alert["severity"], string> = {
  red:    "#ef4444",
  yellow: "#eab308",
  blue:   "#3b82f6",
  green:  "#22c55e",
  gray:   "#6b7280",
};

const TYPE_LABEL: Record<Alert["type"], string> = {
  "drift":          "Drift",
  "drawdown":       "Drawdown Opportunity",
  "hedge-fund":     "Hedge Fund Move",
  "conviction":     "Conviction Signal",
  "major-drawdown": "Major Drawdown",
  "ai-thesis":      "AI Thesis Alert",
  "cash-deploy":    "Cash Deployment",
};

function renderAlert(a: Alert): string {
  const color = SEVERITY_COLOR[a.severity];
  return `
    <div style="border-left:3px solid ${color};padding:12px 16px;margin-bottom:16px;background:#1f2937;border-radius:4px">
      <div style="margin-bottom:6px">
        <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">
          ${TYPE_LABEL[a.type]}
        </span>
        <span style="color:#6b7280;font-size:11px;margin-left:8px">${a.timestamp}</span>
      </div>
      <p style="color:#f3f4f6;font-weight:600;margin:4px 0">${a.title}</p>
      <p style="color:#9ca3af;font-size:13px;margin:4px 0">${a.body}</p>
      <div style="background:#111827;border-radius:4px;padding:8px;margin-top:8px">
        <p style="color:#34d399;font-size:12px;margin:0">→ ${a.action}</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0 0">${a.impact}</p>
      </div>
    </div>
  `;
}

export async function sendWeeklyDigest(
  alerts: Alert[],
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (alerts.length === 0) return { success: true }; // never send empty emails

  const date = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
  const redAlerts = alerts.filter((a) => a.severity === "red");
  const subject = redAlerts.length > 0
    ? `⚠️ Hedge Tracker — ${redAlerts.length} urgent alert${redAlerts.length > 1 ? "s" : ""} · ${date}`
    : `📊 Hedge Tracker weekly digest · ${date} · ${alerts.length} alert${alerts.length !== 1 ? "s" : ""}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px">
    <h1 style="color:#f9fafb;font-size:22px;margin:0 0 4px">Hedge Tracker</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">Weekly digest · ${date} · ${alerts.length} alert${alerts.length !== 1 ? "s" : ""}</p>

    ${alerts.map(renderAlert).join("")}

    <div style="border-top:1px solid #1f2937;margin-top:24px;padding-top:16px">
      <p style="color:#374151;font-size:11px;margin:0">
        Not investment advice. Educational tool. Verify all data independently.<br>
        Prices via Stooq (~15 min delay). 13F filings via SEC EDGAR (45-day lag).
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: "Hedge Tracker <onboarding@resend.dev>",
      to: toEmail,
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
