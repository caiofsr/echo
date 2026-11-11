import { GlobalTimer } from "../timer/global-timer";
import { Link, Outlet } from "@tanstack/react-router";
import { EchoIcon } from "../ui/icons";
import { Button, buttonVariants } from "../ui/button";
import { useSignOut } from "../../hooks/use-sign-out";

const links = [
  { to: "/", label: "Quadro", icon: "board" },
  { to: "/hours", label: "Horas", icon: "hours" },
  { to: "/invoices", label: "Faturas", icon: "invoices" },
  { to: "/clients", label: "Clientes", icon: "clients" },
] as const;
export function AppShell() {
  const { signOut, error } = useSignOut();
  return (
    <>
      {error && (
        <p role="alert" className="connection-error">
          Não foi possível sair. Confira sua conexão e tente novamente.
        </p>
      )}
      <a className="skip-link" href="#content">
        Pular para o conteúdo
      </a>
      <header className="app-header">
        <Link
          className="brand"
          to="/"
          aria-label="Echo, início"
          activeOptions={{ exact: true, includeSearch: false }}
        >
          echo<span>.</span>
        </Link>
        <nav aria-label="Principal">
          {links.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className="nav-link"
              activeOptions={{ exact: true, includeSearch: false }}
              activeProps={{ className: "selected" }}
            >
              <EchoIcon name={icon} size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            className={buttonVariants({ variant: "ghost" })}
            to="/settings"
            aria-label="Configurações"
            activeOptions={{ exact: true, includeSearch: false }}
          >
            <EchoIcon name="settings" size={19} />
          </Link>
          <Button variant="ghost" onClick={() => signOut()}>
            <EchoIcon name="logout" size={17} />
            <span>Sair</span>
          </Button>
        </div>
      </header>
      <main id="content" className="workspace" tabIndex={-1}>
        <GlobalTimer />
        <Outlet />
      </main>
    </>
  );
}
