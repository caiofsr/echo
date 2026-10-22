import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { EchoIcon, type IconName } from "./icons";
import { Button } from "./ui/button";
import { useSession } from "./session-boundary";

const links = [
  { to: "/", label: "Quadro", icon: "quadro" },
  { to: "/horas", label: "Horas", icon: "horas" },
  { to: "/faturas", label: "Faturas", icon: "faturas" },
  { to: "/cadastros", label: "Cadastros", icon: "cadastros" },
] as const;
export function AppShell() {
  const { logout } = useSession();
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="app-header">
        <Link className="brand" to="/" aria-label="Echo, início">
          echo<span>.</span>
        </Link>
        <nav aria-label="Principal">
          {links.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${pathname === to ? "selected" : ""}`}
              aria-current={pathname === to ? "page" : undefined}
            >
              <EchoIcon name={icon} size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Button asChild variant="ghost">
            <Link
              to="/configuracoes"
              aria-label="Configurações"
              aria-current={pathname === "/configuracoes" ? "page" : undefined}
            >
              <EchoIcon name="configuracoes" size={19} />
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            <EchoIcon name="sair" size={17} />
            <span>Sair</span>
          </Button>
        </div>
      </header>
      <main id="conteudo" className="workspace" tabIndex={-1}>
        <div className="timer-placeholder">
          <EchoIcon name="cronometro" size={21} />
          <div>
            <strong>Cronômetro global</strong>
            <p>Disponível em uma próxima entrega.</p>
          </div>
          <span className="timer-digits" aria-label="Cronômetro indisponível">
            —:—:—
          </span>
        </div>
        <Outlet />
      </main>
    </>
  );
}
export function Unavailable({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: IconName;
}) {
  return (
    <section className="page-content">
      <h1>{title}</h1>
      <div className="empty-state">
        <EchoIcon name={icon} size={32} />
        <h2>Este espaço está sendo preparado</h2>
        <p>{description}</p>
        <span className="availability">Disponível em uma próxima entrega</span>
      </div>
    </section>
  );
}
