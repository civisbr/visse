import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo da página "Denúncia segura"; mantido para não quebrar links já compartilhados.
export const Route = createFileRoute("/minuta-core")({
  beforeLoad: () => {
    throw redirect({ to: "/onde-denunciar", replace: true });
  },
});
