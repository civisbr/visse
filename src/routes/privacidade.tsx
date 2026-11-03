import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/ProjectPage";

export const Route = createFileRoute("/privacidade")({
  head: () =>
    meta(
      "Privacidade e contestação — Visse?",
      "Que dados o Visse? usa, de onde vêm, e como contestar ou pedir a correção de um alerta.",
    ),
  component: Page,
});

const CONTESTAR = "https://github.com/civisbr/visse/issues/new?title=Contesta%C3%A7%C3%A3o";

function Page() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-4xl font-black">Privacidade e contestação</h1>
      <div className="mt-8 space-y-8 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold">Quem somos</h2>
          <p className="mt-2">
            O Visse? é um projeto aberto do CivisBR, voluntário e sem partido. O código está em{" "}
            <a
              className="underline"
              href="https://github.com/civisbr/visse"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/civisbr/visse<span className="sr-only"> (abre em nova aba)</span>
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold">O que guardamos de quem visita</h2>
          <p className="mt-2">
            Nada. O site não usa cookies, não tem ferramenta de análise de visitas e não envia dados
            seus para servidores nossos. A hospedagem do site pode registrar, nos logs de acesso, o
            endereço IP e o navegador de quem acessa; esses registros ficam com o provedor e não são
            usados por nós. Quando você prepara uma denúncia, nome e cidade ficam só no seu
            navegador e vão apenas para o PDF que você baixa.
          </p>
          <p className="mt-2">
            No mapa de gastos, o botão de localização é opcional: o navegador pede a sua permissão,
            e a posição é usada só para calcular a distância no seu aparelho. Ela não é enviada nem
            guardada.
          </p>
          <p className="mt-2">
            Ao tocar num link para o site de um Ministério Público ou para o WhatsApp, o endereço de
            destino passa a saber o seu IP e o seu navegador, como em qualquer link. O Visse? não
            envia nenhum dado seu nessas visitas.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold">De onde vêm os dados dos alertas</h2>
          <p className="mt-2">
            Os contratos vêm do Portal Nacional de Contratações Públicas (PNCP), a idade do CNPJ vem
            da BrasilAPI, as obras vêm do cadastro federal ObrasGov, os gastos municipais vêm do
            SICONFI (Tesouro Nacional) e o contorno do mapa vem do IBGE. São dados que o próprio
            poder público já divulga. Nós os usamos para transparência e controle social (Lei de
            Acesso à Informação, Lei nº 12.527/2011, e LGPD, art. 7º, §§ 3º e 4º).
          </p>
          <p className="mt-2">
            Não publicamos MEI nem empresário individual, e retiramos contratos cujo texto traga
            CPF. Mesmo assim, o nome de uma empresa pode aparecer.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold">O que um alerta significa</h2>
          <p className="mt-2">
            Um alerta é um indicador estatístico automático. Ele não afirma que houve irregularidade
            nem culpa. Pode errar: por exemplo, uma empresa nova pode ser sucessora de outra antiga,
            e um aumento de valor pode ser legal. Nos gastos, os valores são informados pelas
            próprias prefeituras ao Tesouro e podem ser retificados depois. Sempre confira na fonte
            oficial antes de tomar qualquer atitude.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Contestar, corrigir ou remover</h2>
          <p className="mt-2">
            Se você é a empresa, o órgão ou a pessoa citada e quer contestar um alerta, pedir
            correção ou a retirada do seu nome, abra uma solicitação:{" "}
            <a
              className="font-bold underline"
              href={CONTESTAR}
              target="_blank"
              rel="noopener noreferrer"
            >
              abrir contestação<span className="sr-only"> (abre em nova aba)</span>
            </a>
            . Explique o que está errado e indique o contrato ou a obra. Não coloque documentos
            pessoais na solicitação, porque ela é pública.
          </p>
        </section>
      </div>
    </main>
  );
}
