import { useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArchiveDialog, type ArchiveTarget } from "../archive/archive-dialog";
import { ArchiveFilter } from "../archive/archive-filter";
import { Button } from "../ui/button";
import { directoryQueryOptions } from "../../queries/directory";
import { formatHourlyRate } from "../../lib/directory-input";
import { ClientForm, ProjectForm } from "./directory-forms";

type Editor = { kind: "client" | "project"; id?: number } | null;

export function DirectoryPage() {
  const { data } = useSuspenseQuery(directoryQueryOptions);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(
    null,
  );
  const [showArchived, setShowArchived] = useState(false);
  const activeClients = data.clients.filter(
    (client) => client.archiveBatch === null,
  );
  const clients = showArchived
    ? data.clients.filter((client) => client.archiveBatch !== null)
    : activeClients;
  const projects = data.projects.filter(
    (project) => (project.archiveBatch !== null) === showArchived,
  );
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
      <div className="settings-section-heading">
        <h1>Clientes</h1>
        <ArchiveFilter
          id="directory-status"
          label="Filtrar cadastros"
          archived={showArchived}
          onChange={setShowArchived}
        />
      </div>
      <p className="settings-success" role="status">
        {notice}
      </p>
      <section className="settings-section" aria-labelledby="clients-heading">
        <div className="settings-section-heading">
          <div>
            <h2 id="clients-heading">Clientes</h2>
          </div>
          <Button
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setShowArchived(false);
              setEditor({ kind: "client" });
            }}
          >
            Novo cliente
          </Button>
        </div>
        {clients.length === 0 ? (
          <div className="settings-empty">
            <h3>
              {showArchived
                ? "Nenhum cliente arquivado"
                : "Nenhum cliente cadastrado"}
            </h3>
            {!showArchived && (
              <p>
                Comece pelo cliente. Depois, adicione os projetos vinculados a
                ele.
              </p>
            )}
          </div>
        ) : (
          <ul className="directory-list" aria-label="Clientes cadastrados">
            {clients.map((client) => (
              <li key={client.id}>
                <div className="directory-copy">
                  <h3>{client.name}</h3>
                  {client.legalName && <p>{client.legalName}</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {!showArchived && (
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
                  )}
                  <Button
                    variant="ghost"
                    aria-label={`${showArchived ? "Restaurar" : "Arquivar"} cliente ${client.name}`}
                    onClick={(event) => {
                      returnFocus.current = event.currentTarget;
                      setArchiveTarget({
                        kind: "client",
                        id: client.id,
                        version: client.version,
                        name: client.name,
                        action: showArchived ? "restore" : "archive",
                      });
                    }}
                  >
                    {showArchived ? "Restaurar" : "Arquivar"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="settings-section" aria-labelledby="projects-heading">
        <div className="settings-section-heading">
          <div>
            <h2 id="projects-heading">Projetos</h2>
          </div>
          <Button
            variant="outline"
            disabled={activeClients.length === 0}
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setShowArchived(false);
              setEditor({ kind: "project" });
            }}
          >
            Novo projeto
          </Button>
        </div>
        {projects.length === 0 ? (
          <div className="settings-empty">
            <h3>
              {showArchived
                ? "Nenhum projeto arquivado"
                : "Nenhum projeto cadastrado"}
            </h3>
            {!showArchived && (
              <p>
                {activeClients.length
                  ? "Adicione um projeto e informe o cliente, o valor de hora e a moeda."
                  : "Cadastre um cliente para criar seu primeiro projeto."}
              </p>
            )}
          </div>
        ) : (
          <ul className="directory-list" aria-label="Projetos cadastrados">
            {projects.map((project) => (
              <li key={project.id}>
                <div className="directory-copy">
                  <h3>{project.name}</h3>
                  <p>{clientNames.get(project.clientId)}</p>
                </div>
                <span className="directory-rate">
                  {formatHourlyRate(project.hourlyRateCents, project.currency)}{" "}
                  <span>/ hora · {project.currency}</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {!showArchived && (
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
                  )}
                  <Button
                    variant="ghost"
                    aria-label={`${showArchived ? "Restaurar" : "Arquivar"} projeto ${project.name}`}
                    onClick={(event) => {
                      returnFocus.current = event.currentTarget;
                      setArchiveTarget({
                        kind: "project",
                        id: project.id,
                        version: project.version,
                        name: project.name,
                        action: showArchived ? "restore" : "archive",
                      });
                    }}
                  >
                    {showArchived ? "Restaurar" : "Arquivar"}
                  </Button>
                </div>
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
          clients={activeClients}
          project={data.projects.find((project) => project.id === editor.id)}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Projeto")}
        />
      )}
      {archiveTarget && (
        <ArchiveDialog
          target={archiveTarget}
          returnFocus={returnFocus}
          onClose={() => setArchiveTarget(null)}
        />
      )}
    </section>
  );
}
