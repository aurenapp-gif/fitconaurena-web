/** Configuración central del sitio. Evita URLs hardcodeadas dispersas. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitconaurena.com";
export const ADMIN_PANEL_URL = `${SITE_URL}/miembros/admin`;
export const MEMBER_AREA_URL = `${SITE_URL}/miembros`;
