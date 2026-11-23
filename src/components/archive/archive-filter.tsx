import { Select } from "../ui/select";

export function ArchiveFilter({
  id,
  label,
  archived,
  activeLabel = "Ativos",
  archivedLabel = "Arquivados",
  onChange,
}: {
  id: string;
  label: string;
  archived: boolean;
  activeLabel?: string;
  archivedLabel?: string;
  onChange: (archived: boolean) => void;
}) {
  return (
    <div>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Select
        id={id}
        value={archived ? "archived" : "active"}
        options={[
          { value: "active", label: activeLabel },
          { value: "archived", label: archivedLabel },
        ]}
        onValueChange={(value) => onChange(value === "archived")}
      />
    </div>
  );
}
