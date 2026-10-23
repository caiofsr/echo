import { EchoIcon, type IconName } from "./icons";

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
