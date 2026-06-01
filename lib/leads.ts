// CRM de leads (personas que rellenan el cuestionario de /aplicar).

export type LeadStatus = "nuevo" | "contactada" | "agendada" | "cliente" | "descartada";

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactada", label: "Contactada" },
  { value: "agendada", label: "Llamada agendada" },
  { value: "cliente", label: "Cliente" },
  { value: "descartada", label: "Descartada" },
];

export const LEAD_STATUS_VALUES: LeadStatus[] = LEAD_STATUSES.map((s) => s.value);

export type Lead = {
  id: number | string;
  created_at: string;
  name: string | null;
  email: string;
  phone: string | null;
  qualified: boolean | null;
  answers: Record<string, string> | null;
  motivacion: string | null;
  status: LeadStatus | null;
  call_at: string | null;
  notes: string | null;
};
