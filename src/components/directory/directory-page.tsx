import { useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { directoryQueryOptions } from "../../queries/directory";
import { formatHourlyRate } from "../../lib/directory-input";
import { ClientForm, ProjectForm } from "./directory-forms";

type Editor = { kind: "client" | "project"; id?: number } | null;

export function DirectoryPage() {
  const { data } = useSuspenseQuery(directoryQueryOptions);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [notice, setNotice] = useState("");
  const clientNames = new Map(
    data.clients.map((client) => [client.id, client.name]),
  );
  function saved(kind: string) {
    setEditor(null);
    setNotice(`${kind} salvo.`);
  }
  return (
    <section className="page-content settings-page directory-page">
      <h1>Clientes</h1>
      <p className="settings-intro">
        Organize seus clientes e os projetos de cada um.
      </p>
      <p className="settings-success" role="status">
        {notice}
      </p>
      <section className="settings-section" aria-labelledby="clients-heading">
        <div className="settings-section-heading">
          <div>
            <h2 id="clients-heading">Clientes</h2>
            <p>Dados do destinatário para suas futuras faturas.</p>
          </div>
          <Button
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setEditor({ kind: "client" });
            }}
          >
            Novo cliente
          </Button>
        </div>
        {data.clients.length === 0 ? (
          <div className="settings-empty">
            <h3>Nenhum cliente cadastrado</h3>
            <p>
              Comece pelo cliente. Depois, adicione os projetos vinculados a
              ele.
            </p>
          </div>
        ) : (
          <ul className="directory-list" aria-label="Clientes cadastrados">
            {data.clients.map((client) => (
              <li key={client.id}>
                <div className="directory-copy">
                  <h3>{client.name}</h3>
                  {client.legalName && <p>{client.legalName}</p>}
                </div>
                <Button
                  variant="ghost"
                  aria-label={`Editar cliente ${client.name}`}
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setEditor({ kind: "client", id: client.id });
                  }}
                >
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="settings-section" aria-labelledby="projects-heading">
        <div className="settings-section-heading">
          <div>
            <h2 id="projects-heading">Projetos</h2>
            <p>
              Cada projeto pertence a um cliente e tem seu próprio valor de
              hora.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={data.clients.length === 0}
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setEditor({ kind: "project" });
            }}
          >
            Novo projeto
          </Button>
        </div>
        {data.projects.length === 0 ? (
          <div className="settings-empty">
            <h3>Nenhum projeto cadastrado</h3>
            <p>
              {data.clients.length
                ? "Adicione um projeto e informe o cliente, o valor de hora e a moeda."
                : "Cadastre um cliente para criar seu primeiro projeto."}
            </p>
          </div>
        ) : (
          <ul className="directory-list" aria-label="Projetos cadastrados">
            {data.projects.map((project) => (
              <li key={project.id}>
                <div className="directory-copy">
                  <h3>{project.name}</h3>
                  <p>{clientNames.get(project.clientId)}</p>
                </div>
                <span className="directory-rate">
                  {formatHourlyRate(project.hourlyRateCents, project.currency)}{" "}
                  <span>/ hora · {project.currency}</span>
                </span>
                <Button
                  variant="ghost"
                  aria-label={`Editar projeto ${project.name}`}
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setEditor({ kind: "project", id: project.id });
                  }}
                >
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editor?.kind === "client" && (
        <ClientForm
          returnFocus={returnFocus}
          client={data.clients.find((client) => client.id === editor.id)}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Cliente")}
        />
      )}
      {editor?.kind === "project" && (
        <ProjectForm
          returnFocus={returnFocus}
          clients={data.clients}
          project={data.projects.find((project) => project.id === editor.id)}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Projeto")}
        />
      )}
    </section>
  );
}
