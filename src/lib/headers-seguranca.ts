// A CSP é parcial: sem script-src/default-src ela não mitiga XSS, só bloqueia plugins, <base> e formulários externos.
// script-src fica de fora porque o hidratador do TanStack injeta script inline e o preview do Lovable injeta scripts de terceiros.
// Se default-src entrar um dia, declare connect-src explicitamente: ele passaria a ser restringido.
// frame-ancestors libera o preview e o editor do Lovable e bloqueia o resto.
export const CSP =
  "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.lovable.app https://*.lovableproject.com https://lovable.dev";

export const HEADERS_SEGURANCA: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "strict-transport-security": "max-age=31536000",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "content-security-policy": CSP,
};

export function comHeadersDeSeguranca(response: Response): Response {
  // Upgrade de WebSocket não pode ser recriado com new Response.
  if (response.status === 101) return response;
  const nova = new Response(response.body, response);
  for (const [k, v] of Object.entries(HEADERS_SEGURANCA))
    if (!nova.headers.has(k)) nova.headers.set(k, v);
  return nova;
}
