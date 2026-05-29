/**
 * Lead storage abstraction.
 *
 * This is intentionally a thin, pluggable layer. Today it logs to the server
 * console (so the flow is fully functional with no infrastructure). Replace the
 * bodies with a real store (Vercel KV/Postgres, a CRM, an ESP audience, etc.)
 * without touching the API routes or UI.
 */

export type LeadStatus = "pending" | "verified";

export interface Lead {
  email: string;
  status: LeadStatus;
  at: string; // ISO timestamp
  source?: string;
}

/** Called when an email is submitted and a verification mail is sent. */
export async function recordPendingLead(email: string, source = "lead-magnet"): Promise<void> {
  const lead: Lead = { email, status: "pending", at: new Date().toISOString(), source };
  console.info(`[leads] pending: ${JSON.stringify(lead)}`);
}

/** Called when a lead clicks the verification link and the token checks out. */
export async function markLeadVerified(email: string, source = "lead-magnet"): Promise<void> {
  const lead: Lead = { email, status: "verified", at: new Date().toISOString(), source };
  console.info(`[leads] verified: ${JSON.stringify(lead)}`);
}
