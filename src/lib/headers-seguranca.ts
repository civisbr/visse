// CSP e frame-ancestors ficam de fora: o hidratador do TanStack injeta script inline e o preview do Lovable roda em iframe.
export const HEADERS_SEGURANCA: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export function comHeadersDeSeguranca(response: Response): Response {
  // Upgrade de WebSocket não pode ser recriado com new Response.
  if (response.status === 101) return response;
  const nova = new Response(response.body, response);
  for (const [k, v] of Object.entries(HEADERS_SEGURANCA))
    if (!nova.headers.has(k)) nova.headers.set(k, v);
  return nova;
}
