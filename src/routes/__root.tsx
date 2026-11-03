import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { projects } from "../lib/projects";
import { Logo } from "../components/Logo";
import { Home, Flag, HardHat, MessageSquare, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const navIcons = [Flag, HardHat, MessageSquare, Megaphone];

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-black">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada.</p>
        <Link to="/" className="btn mt-6 bg-sun text-ink">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Esta página não carregou</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn mt-6 bg-sun text-ink"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#FAF4EA" },
      { title: "Visse? — Veja e cobre o que acontece na sua cidade" },
      {
        name: "description",
        content: "Ferramentas abertas para o cidadão do Nordeste fiscalizar o dinheiro público.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const linkBase =
  "relative rounded-md px-4 py-2.5 transition-colors hover:text-primary after:absolute after:inset-x-4 after:-bottom-px after:h-[3px] after:scale-x-0 after:bg-sun after:transition-transform";
const linkAtivo = { className: "text-primary after:scale-x-100" };

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <Link to="/" aria-label="Visse? — início">
            <Logo />
          </Link>
          <nav
            className="hidden items-center gap-2 text-lg font-bold lg:flex"
            aria-label="Principal"
          >
            <Link
              to="/"
              className={linkBase}
              activeOptions={{ exact: true }}
              activeProps={linkAtivo}
            >
              Início
            </Link>
            {projects
              .filter((p) => p.to !== "/gerador")
              .map((p) => (
                <Link key={p.to} to={p.to} className={linkBase} activeProps={linkAtivo}>
                  {p.curto}
                </Link>
              ))}
          </nav>
          <Button
            asChild
            size="lg"
            className="h-10 px-4 text-sm sm:h-12 sm:px-6 sm:text-base [&_svg]:size-5"
          >
            <Link to="/gerador">
              <Megaphone aria-hidden="true" />
              Denunciar
            </Link>
          </Button>
        </div>
      </header>
      <nav
        aria-label="Navegação no celular"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <Link
          to="/"
          className="flex flex-1 flex-col items-center py-2 text-xs font-bold text-muted-foreground"
          activeOptions={{ exact: true }}
          activeProps={{ className: "text-primary font-extrabold" }}
        >
          <Home className="mb-1 size-5" aria-hidden="true" />
          Início
        </Link>
        {projects.slice(0, 4).map((p, i) => {
          const Icon = navIcons[i];
          return (
            <Link
              key={p.to}
              to={p.to}
              className="flex flex-1 flex-col items-center py-2 text-xs font-bold text-muted-foreground"
              activeProps={{ className: "text-primary font-extrabold" }}
            >
              {Icon && <Icon className="mb-1 size-5" aria-hidden="true" />}
              {p.curto}
            </Link>
          );
        })}
      </nav>
      <Outlet />
      <footer className="relative mt-20 overflow-hidden bg-noite px-5 pb-24 pt-12 text-sm text-areia/70 lg:pb-12">
        <div
          className="hachura pointer-events-none absolute inset-0 text-sun opacity-40"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Logo tone="light" />
            <p className="mt-3 max-w-xs leading-relaxed">
              Um projeto CivisBR para o Nordeste. Código e dados abertos.
            </p>
          </div>
          <div className="md:text-right">
            <p>
              Sem partido.
              <br />
              Do lado de quem paga a conta.
            </p>
            <Link to="/privacidade" className="mt-3 inline-block underline">
              Privacidade e contestação
            </Link>
          </div>
        </div>
      </footer>
    </QueryClientProvider>
  );
}
