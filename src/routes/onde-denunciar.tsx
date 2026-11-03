import { createFileRoute, redirect } from "@tanstack/react-router";

// A página foi incorporada a "Faça sua denúncia"; o endereço fica para não quebrar links compartilhados.
export const Route = createFileRoute("/onde-denunciar")({
  beforeLoad: () => {
    throw redirect({ to: "/gerador", hash: "onde-enviar", replace: true });
  },
});
