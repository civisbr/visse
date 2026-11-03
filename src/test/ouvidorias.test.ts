import { describe, expect, it } from "vitest";
import { ESTADOS } from "@/routes/onde-denunciar";
import { CONFERIDO_EM, ouvidorias, ouvidoriasMP, type CanalMP } from "@/lib/ouvidorias";

const canais = Object.entries(ouvidoriasMP) as [string, CanalMP][];

describe("canais dos Ministérios Públicos", () => {
  it("cobre os 9 estados do Nordeste e o MPF", () => {
    expect(Object.keys(ouvidoriasMP).sort()).toEqual(
      ["AL", "BA", "CE", "MA", "MPF", "PB", "PE", "PI", "RN", "SE"].sort(),
    );
  });
  it("só usa https e domínios oficiais do Ministério Público", () => {
    for (const [uf, c] of canais) {
      for (const u of [c.pagina, c.formulario].filter(Boolean) as string[]) {
        const url = new URL(u);
        expect(url.protocol, `${uf} ${u}`).toBe("https:");
        expect(url.hostname, `${uf} ${u}`).toMatch(/(^|\.)mp\.br$/);
      }
    }
  });
  it("e-mail termina no domínio do próprio MP e telefones têm só dígitos", () => {
    for (const [uf, c] of canais) {
      expect(c.email, uf).toMatch(/^[a-z.]+@([a-z0-9-]+\.)*mp\.br$/);
      for (const t of c.telefones) expect(t.tel, `${uf} ${t.exibido}`).toMatch(/^\d{3,11}$/);
      if (c.whatsapp) expect(c.whatsapp.numero, uf).toMatch(/^55\d{10,11}$/);
    }
  });
  it("registra a data da conferência e a forma curta aponta para o formulário quando há", () => {
    expect(CONFERIDO_EM).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ouvidorias.BA.url).toBe("https://tag.sistemas.mpba.mp.br/");
    expect(ouvidorias.AL.url).toBe("https://www.mpal.mp.br/ouvidoria");
  });
  it("o seletor de estados cobre todos os estados dos dados, sem o MPF", () => {
    expect(ESTADOS.map((e) => e.uf).sort()).toEqual(
      Object.keys(ouvidoriasMP)
        .filter((k) => k !== "MPF")
        .sort(),
    );
  });
  // Trocar um contato exige mudar esta lista no mesmo PR, o que deixa a troca visível na revisão.
  it("mantém exatamente os contatos conferidos nos sites oficiais", () => {
    const atual = Object.fromEntries(
      canais.map(([uf, c]) => [
        uf,
        {
          host: new URL(c.pagina).hostname,
          email: c.email,
          tel: c.telefones.map((t) => t.tel),
          zap: c.whatsapp?.numero ?? null,
        },
      ]),
    );
    expect(atual).toEqual(ESPERADO);
  });
  it("cada e-mail e página pertencem ao domínio do próprio órgão", () => {
    for (const [uf, e] of Object.entries(ESPERADO)) {
      const raiz = e.host.split(".").slice(-3).join(".");
      expect(e.email.endsWith(`@${raiz}`) || e.email.endsWith(`.${raiz}`), uf).toBe(true);
    }
  });
});

const ESPERADO: Record<string, { host: string; email: string; tel: string[]; zap: string | null }> =
  {
    MPF: {
      host: "www.mpf.mp.br",
      email: "ouvidoria@mpf.mp.br",
      tel: ["08000005640", "6131057070"],
      zap: null,
    },
    BA: {
      host: "atendimento.mpba.mp.br",
      email: "ouvidoria@mpba.mp.br",
      tel: ["08002846803", "7131030490"],
      zap: null,
    },
    PE: {
      host: "portal.mppe.mp.br",
      email: "ouvidoria@mppe.mp.br",
      tel: ["81993193350", "127"],
      zap: "5581996790221",
    },
    CE: {
      host: "mpce.mp.br",
      email: "ouvidoria@mpce.mp.br",
      tel: ["8531065352", "8531065351"],
      zap: null,
    },
    PB: {
      host: "www.mppb.mp.br",
      email: "ouvidoria@mppb.mp.br",
      tel: ["8321076150"],
      zap: "5583991817355",
    },
    RN: {
      host: "www.mprn.mp.br",
      email: "ouvidoria@mprn.mp.br",
      tel: [],
      zap: "5584999946057",
    },
    AL: {
      host: "www.mpal.mp.br",
      email: "ouvidoria@mpal.mp.br",
      tel: ["8221223512"],
      zap: null,
    },
    SE: {
      host: "www.mpse.mp.br",
      email: "ouvidoria@mpse.mp.br",
      tel: ["7932092400"],
      zap: null,
    },
    PI: {
      host: "www.mppi.mp.br",
      email: "ouvidoria@mppi.mp.br",
      tel: ["8622228131", "127"],
      zap: "5586981349773",
    },
    MA: {
      host: "www.mpma.mp.br",
      email: "ouvidoria@mpma.mp.br",
      tel: ["9832191738", "127"],
      zap: "5598991371298",
    },
  };
