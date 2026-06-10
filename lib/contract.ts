/**
 * Contrato de servicio firmable por la clienta (firma electrónica simple).
 *
 * Flujo:
 *  - La coach sube UNA plantilla de contrato en PDF (la misma para todas), que
 *    se guarda en la tabla `contract_template` (fila única) y en el bucket
 *    `contratos`.
 *  - Cada clienta la firma desde su perfil dibujando su firma + nombre. Se
 *    registra en `contract_signatures` (nombre, fecha, IP, navegador) y se genera
 *    un PDF firmado final (plantilla + página de firma) que la coach descarga.
 *
 * La firma es electrónica SIMPLE (eIDAS): válida y admisible para un contrato de
 * servicios. La prueba la dan el registro (nombre, fecha/hora, IP, user-agent) y
 * el trazo de la firma incrustado en el PDF.
 */

/** Bucket de Storage (privado) para plantilla, firmas y PDFs firmados. */
export const CONTRACT_BUCKET = "contratos";

/** Plantilla de contrato vigente (fila única, id = 1). */
export type ContractTemplate = {
  id: number;
  title: string | null;
  file_path: string;
  version: number;
  updated_at: string;
};

/** Firma de una clienta para una versión concreta de la plantilla. */
export type ContractSignature = {
  id: string;
  member_email: string;
  version: number;
  signer_name: string;
  signature_path: string | null;
  signed_pdf_path: string | null;
  ip: string | null;
  user_agent: string | null;
  signed_at: string;
};
