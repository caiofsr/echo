import { useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { settingsQueryOptions } from "../../queries/settings";
import {
  companyNameSchema,
  paymentLabelSchema,
  paymentInstructionsSchema,
} from "../../lib/settings-input";
import {
  createPaymentMethod,
  createCompany,
  updateCompany,
  setPaymentMethodArchived,
  updatePaymentMethod,
} from "../../server/functions/settings";
import type {
  Company,
  CompanyInput,
  SavedCompany,
} from "../../types/settings/company";
import type {
  PaymentMethodInput,
  SavedPaymentMethod,
} from "../../types/settings/payment-method";

function companyValues(company: Company | null): CompanyInput {
  return {
    name: company?.name ?? "",
    taxId: company?.taxId ?? "",
    address: company?.address ?? "",
    phone: company?.phone ?? "",
  };
}

export function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQueryOptions);
  const queryClient = useQueryClient();
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<
    number | null
  >(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const focusTarget = useRef<number | "add" | "archived" | null>(null);
  const activeMethods = data.paymentMethods.filter(
    (method) => !method.archived,
  );
  const archivedMethods = data.paymentMethods.filter(
    (method) => method.archived,
  );
  const archiveMutation = useMutation({
    mutationFn: (data: { id: number; archived: boolean }) =>
      setPaymentMethodArchived({ data }),
    onSuccess: (saved) => {
      focusTarget.current = saved.archived ? "archived" : saved.id;
      queryClient.setQueryData(
        settingsQueryOptions.queryKey,
        (current) =>
          current && {
            ...current,
            paymentMethods: current.paymentMethods.map((item) =>
              item.id === saved.id ? saved : item,
            ),
          },
      );
      setPaymentStatus(
        saved.archived
          ? "Forma de recebimento arquivada."
          : "Forma de recebimento restaurada.",
      );
    },
  });

  function restoreFocus(
    target: number | "add" | "archived",
    element: HTMLElement | null,
  ) {
    if (element && focusTarget.current === target) {
      focusTarget.current = null;
      element.focus();
    }
  }

  return (
    <section className="page-content settings-page">
      <h1>Configurações</h1>
      <p className="settings-intro">
        Cadastre as informações que poderão aparecer nas suas faturas.
      </p>
      <CompanySettings companies={data.companies} />
      <section className="settings-section" aria-labelledby="payment-heading">
        <div className="settings-section-heading">
          <div>
            <h2 id="payment-heading">Formas de recebimento</h2>
            <p>
              Cadastre instruções de recebimento para escolher ao emitir uma
              fatura.
            </p>
          </div>
          {!addingPaymentMethod && (
            <Button
              type="button"
              variant="outline"
              disabled={
                editingPaymentMethod !== null || archiveMutation.isPending
              }
              ref={(element) => restoreFocus("add", element)}
              onClick={() => {
                setPaymentStatus("");
                setEditingPaymentMethod(null);
                setAddingPaymentMethod(true);
              }}
            >
              Adicionar forma de recebimento
            </Button>
          )}
        </div>
        <p role="status" className="settings-success">
          {paymentStatus}
        </p>
        {(addingPaymentMethod || editingPaymentMethod !== null) && (
          <p className="settings-section-description">
            Salve ou cancele antes de alterar outra forma de recebimento.
          </p>
        )}
        {archiveMutation.isError && (
          <p role="alert" className="settings-error">
            Não foi possível atualizar a forma de recebimento. Tente novamente.
          </p>
        )}
        {addingPaymentMethod && (
          <PaymentMethodForm
            key="new"
            onCancel={() => {
              focusTarget.current = "add";
              setAddingPaymentMethod(false);
            }}
            onSaved={(saved) => {
              focusTarget.current = saved.id;
              setPaymentStatus("Forma de recebimento salva.");
              setAddingPaymentMethod(false);
            }}
          />
        )}
        {activeMethods.length === 0 && !addingPaymentMethod ? (
          <div className="settings-empty">
            <h3>Nenhuma forma de recebimento ativa</h3>
            <p>
              {archivedMethods.length > 0
                ? "Adicione uma forma de recebimento ou restaure uma arquivada."
                : "Adicione instruções de recebimento, como PIX ou transferência."}
            </p>
          </div>
        ) : (
          <div className="payment-method-list">
            {activeMethods.map((method) =>
              editingPaymentMethod === method.id ? (
                <PaymentMethodForm
                  key={method.id}
                  paymentMethod={method}
                  onCancel={() => {
                    focusTarget.current = method.id;
                    setEditingPaymentMethod(null);
                  }}
                  onSaved={(saved) => {
                    focusTarget.current = saved.id;
                    setPaymentStatus("Forma de recebimento salva.");
                    setEditingPaymentMethod(null);
                  }}
                />
              ) : (
                <article className="payment-method" key={method.id}>
                  <div className="payment-method-copy">
                    <h3>{method.label}</h3>
                    <p>{method.instructions}</p>
                  </div>
                  <div className="form-actions">
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Editar ${method.label}`}
                      disabled={
                        addingPaymentMethod ||
                        editingPaymentMethod !== null ||
                        archiveMutation.isPending
                      }
                      ref={(element) => restoreFocus(method.id, element)}
                      onClick={() => {
                        setPaymentStatus("");
                        setAddingPaymentMethod(false);
                        setEditingPaymentMethod(method.id);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Arquivar ${method.label}`}
                      disabled={
                        addingPaymentMethod ||
                        editingPaymentMethod !== null ||
                        archiveMutation.isPending
                      }
                      onClick={() => {
                        setPaymentStatus("");
                        archiveMutation.mutate({
                          id: method.id,
                          archived: true,
                        });
                      }}
                    >
                      Arquivar
                    </Button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
        {archivedMethods.length > 0 && (
          <details>
            <summary ref={(element) => restoreFocus("archived", element)}>
              Arquivadas ({archivedMethods.length})
            </summary>
            {archivedMethods.map((method) => (
              <article className="payment-method" key={method.id}>
                <div className="payment-method-copy">
                  <h3>{method.label}</h3>
                  <p>{method.instructions}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Restaurar ${method.label}`}
                  disabled={
                    addingPaymentMethod ||
                    editingPaymentMethod !== null ||
                    archiveMutation.isPending
                  }
                  onClick={() => {
                    setPaymentStatus("");
                    archiveMutation.mutate({ id: method.id, archived: false });
                  }}
                >
                  Restaurar
                </Button>
              </article>
            ))}
          </details>
        )}
      </section>
    </section>
  );
}

function CompanySettings({ companies }: { companies: SavedCompany[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [status, setStatus] = useState("");
  const focusTarget = useRef<string | null>(null);
  function focusWhenReady(id: string, element: HTMLElement | null) {
    if (element && focusTarget.current === id) {
      focusTarget.current = null;
      element.focus();
    }
  }
  const selected = companies.find((company) => company.id === editing);
  return (
    <section className="settings-section" aria-labelledby="company-heading">
      <div className="settings-section-heading">
        <div>
          <h2 id="company-heading">Empresas</h2>
          <p>Cadastre as empresas que podem emitir suas faturas.</p>
        </div>
        {editing !== "new" && (
          <Button
            type="button"
            variant="outline"
            disabled={editing !== null}
            ref={(element) => focusWhenReady("add", element)}
            onClick={() => {
              setStatus("");
              setEditing("new");
            }}
          >
            Adicionar empresa
          </Button>
        )}
      </div>
      <p role="status" className="settings-success">
        {status}
      </p>
      {editing !== null && companies.length > 0 && (
        <p className="settings-section-description">
          Salve ou cancele antes de alterar outra empresa.
        </p>
      )}
      {editing !== null && (
        <CompanyForm
          key={editing}
          company={selected ?? null}
          onCancel={() => {
            focusTarget.current = editing === "new" ? "add" : editing;
            setEditing(null);
          }}
          onSaved={(saved) => {
            focusTarget.current = saved.id;
            setStatus("Empresa salva.");
            setEditing(null);
          }}
        />
      )}
      {companies.length === 0 && editing === null && (
        <div className="settings-empty">
          <h3>Nenhuma empresa cadastrada</h3>
          <p>Adicione uma empresa para usá-la em futuras faturas.</p>
        </div>
      )}
      {companies.map((company) =>
        editing === company.id ? null : (
          <article className="company-row" key={company.id}>
            <div className="company-row-copy">
              <h3>{company.name}</h3>
              {company.taxId && <p>{company.taxId}</p>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="company-row-edit"
              aria-label={`Editar empresa ${company.name}`}
              disabled={editing !== null}
              ref={(element) => focusWhenReady(company.id, element)}
              onClick={() => {
                setStatus("");
                setEditing(company.id);
              }}
            >
              Editar
            </Button>
          </article>
        ),
      )}
    </section>
  );
}

function CompanyForm({
  company,
  onCancel,
  onSaved,
}: {
  company: SavedCompany | null;
  onCancel: () => void;
  onSaved: (saved: SavedCompany) => void;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (data: CompanyInput) =>
      company
        ? updateCompany({ data: { id: company.id, ...data } })
        : createCompany({ data }),
    onSuccess: (saved) =>
      queryClient.setQueryData(settingsQueryOptions.queryKey, (current) =>
        current
          ? {
              ...current,
              companies: company
                ? current.companies.map((item) =>
                    item.id === saved.id ? saved : item,
                  )
                : [...current.companies, saved],
            }
          : current,
      ),
  });
  const form = useForm({
    defaultValues: companyValues(company),
    onSubmit: async ({ value }) => {
      try {
        const saved = await save.mutateAsync(value);
        onSaved(saved);
      } catch {
        // The mutation state below gives a visible, recoverable error.
      }
    },
  });
  const dirty = useSelector(form.store, (state) => state.isDirty);
  const draftRef = useUnsavedChanges(dirty);

  function requestClose() {
    if (save.isPending) return;
    if (
      company &&
      dirty &&
      !window.confirm("Descartar as alterações não salvas?")
    )
      return;
    onCancel();
  }

  const content = (
    <div className={company ? undefined : "payment-method-editor"}>
      <form
        className="settings-form"
        aria-label={company ? `Editar empresa ${company.name}` : "Nova empresa"}
        ref={draftRef}
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="settings-form-grid">
          <form.Field name="name" validators={{ onSubmit: companyNameSchema }}>
            {(field) => (
              <Field
                label="Nome ou razão social"
                fieldId="company-name"
                required
                error={field.state.meta.errors
                  .map((issue) => issue?.message)
                  .join(" ")}
              >
                <Input
                  id="company-name"
                  name={field.name}
                  autoFocus
                  autoComplete="organization"
                  required
                  aria-invalid={field.state.meta.errors.length > 0}
                  aria-describedby={
                    field.state.meta.errors.length
                      ? "company-name-error"
                      : undefined
                  }
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="taxId">
            {(field) => (
              <Field
                label="Identificação fiscal (opcional)"
                fieldId="company-tax-id"
              >
                <Input
                  id="company-tax-id"
                  name={field.name}
                  autoComplete="off"
                  placeholder="Ex.: CNPJ"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="phone">
            {(field) => (
              <Field label="Telefone" fieldId="company-phone">
                <Input
                  id="company-phone"
                  name={field.name}
                  autoComplete="tel"
                  type="tel"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="address">
            {(field) => (
              <Field
                label="Endereço"
                fieldId="company-address"
                className="settings-form-wide"
              >
                <textarea
                  id="company-address"
                  name={field.name}
                  autoComplete="street-address"
                  rows={3}
                  className="input settings-textarea"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
        </div>
        {save.isError && (
          <p className="settings-error" role="alert">
            {save.error instanceof Error
              ? save.error.message
              : "Não foi possível salvar. Confira sua conexão e tente novamente."}
          </p>
        )}
        <div className="form-actions">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <Button type="submit" disabled={submitting || save.isPending}>
                {submitting || save.isPending ? "Salvando…" : "Salvar empresa"}
              </Button>
            )}
          </form.Subscribe>
          <Button
            type="button"
            variant="ghost"
            disabled={save.isPending}
            onClick={requestClose}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
  return company ? (
    <EditDialog
      title="Editar empresa"
      description="Atualize os dados da empresa para futuras faturas."
      onClose={requestClose}
    >
      {content}
    </EditDialog>
  ) : (
    content
  );
}

function PaymentMethodForm({
  paymentMethod,
  onCancel,
  onSaved,
}: {
  paymentMethod?: SavedPaymentMethod;
  onCancel: () => void;
  onSaved: (saved: SavedPaymentMethod) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: PaymentMethodInput) =>
      paymentMethod
        ? updatePaymentMethod({ data: { id: paymentMethod.id, ...data } })
        : createPaymentMethod({ data }),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsQueryOptions.queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          paymentMethods: paymentMethod
            ? current.paymentMethods.map((item) =>
                item.id === saved.id ? saved : item,
              )
            : [...current.paymentMethods, saved],
        };
      });
      onSaved(saved);
    },
  });
  const form = useForm({
    defaultValues: {
      label: paymentMethod?.label ?? "",
      instructions: paymentMethod?.instructions ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync(value);
      } catch {
        // The mutation state below gives a visible, recoverable error.
      }
    },
  });
  const dirty = useSelector(form.store, (state) => state.isDirty);
  const draftRef = useUnsavedChanges(dirty);
  const formId = paymentMethod
    ? `payment-method-${paymentMethod.id}`
    : "payment-method-new";

  function requestClose() {
    if (mutation.isPending) return;
    if (
      paymentMethod &&
      dirty &&
      !window.confirm("Descartar as alterações não salvas?")
    )
      return;
    onCancel();
  }

  const content = (
    <form
      className={
        paymentMethod ? "settings-dialog-form" : "payment-method-editor"
      }
      ref={draftRef}
      aria-label={
        paymentMethod
          ? `Editar ${paymentMethod.label}`
          : "Nova forma de recebimento"
      }
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="label" validators={{ onSubmit: paymentLabelSchema }}>
        {(field) => (
          <Field
            label="Rótulo"
            fieldId={`${formId}-label`}
            required
            error={field.state.meta.errors
              .map((issue) => issue?.message)
              .join(" ")}
          >
            <Input
              id={`${formId}-label`}
              name={field.name}
              autoFocus
              required
              aria-invalid={field.state.meta.errors.length > 0}
              aria-describedby={
                field.state.meta.errors.length
                  ? `${formId}-label-error`
                  : undefined
              }
              autoComplete="off"
              placeholder="Ex.: Transferência bancária"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.Field>
      <form.Field
        name="instructions"
        validators={{ onSubmit: paymentInstructionsSchema }}
      >
        {(field) => (
          <Field
            label="Instruções de recebimento"
            fieldId={`${formId}-instructions`}
            required
            error={field.state.meta.errors
              .map((issue) => issue?.message)
              .join(" ")}
          >
            <textarea
              id={`${formId}-instructions`}
              name={field.name}
              required
              rows={4}
              aria-invalid={field.state.meta.errors.length > 0}
              aria-describedby={
                field.state.meta.errors.length
                  ? `${formId}-instructions-error`
                  : undefined
              }
              className="input settings-textarea"
              placeholder="Informe os dados que devem aparecer na fatura."
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.Field>
      {mutation.isError && (
        <p className="settings-error" role="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Não foi possível salvar. Confira sua conexão e tente novamente."}
        </p>
      )}
      <div className="form-actions">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={submitting || mutation.isPending}>
              {submitting || mutation.isPending
                ? "Salvando…"
                : "Salvar forma de recebimento"}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={requestClose}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
  return paymentMethod ? (
    <EditDialog
      title="Editar forma de recebimento"
      description="Atualize as instruções usadas em futuras faturas."
      onClose={requestClose}
    >
      {content}
    </EditDialog>
  ) : (
    content
  );
}

function EditDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent finalFocus={false}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  fieldId,
  required = false,
  error,
  className,
  children,
}: {
  label: string;
  fieldId: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required-mark"> (obrigatório)</span>}
      </label>
      {children}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
