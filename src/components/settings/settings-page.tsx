import { useState } from "react";
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
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { settingsQueryOptions } from "../../queries/settings";
import {
  createPaymentMethod,
  saveCompanySettings,
  updatePaymentMethod,
} from "../../server/functions/settings";
import type {
  CompanyInput,
  PaymentMethodInput,
  SavedPaymentMethod,
} from "../../lib/settings-types";

function companyValues(
  company: {
    name: string;
    taxId: string | null;
    address: string | null;
    phone: string | null;
  } | null,
): CompanyInput {
  return {
    name: company?.name ?? "",
    taxId: company?.taxId ?? "",
    address: company?.address ?? "",
    phone: company?.phone ?? "",
  };
}

export function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQueryOptions);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<
    number | null
  >(null);

  return (
    <section className="page-content settings-page">
      <h1>Configurações</h1>
      <p className="settings-intro">
        Cadastre as informações que poderão aparecer nas suas faturas.
      </p>
      <CompanyForm company={data.company} />
      <section className="settings-section" aria-labelledby="payment-heading">
        <div className="settings-section-heading">
          <div>
            <h2 id="payment-heading">Dados de pagamento</h2>
            <p>Crie conjuntos diferentes para escolher ao emitir uma fatura.</p>
          </div>
          {!addingPaymentMethod && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingPaymentMethod(null);
                setAddingPaymentMethod(true);
              }}
            >
              Adicionar conjunto
            </Button>
          )}
        </div>
        {addingPaymentMethod && (
          <PaymentMethodForm
            key="new"
            onCancel={() => setAddingPaymentMethod(false)}
            onSaved={() => setAddingPaymentMethod(false)}
          />
        )}
        {data.paymentMethods.length === 0 && !addingPaymentMethod ? (
          <div className="settings-empty">
            <h3>Nenhum conjunto cadastrado</h3>
            <p>
              Adicione instruções de recebimento, como transferência ou PIX.
              Elas só serão usadas quando você escolher uma para a fatura.
            </p>
          </div>
        ) : (
          <div className="payment-method-list">
            {data.paymentMethods.map((method) =>
              editingPaymentMethod === method.id ? (
                <PaymentMethodForm
                  key={method.id}
                  paymentMethod={method}
                  onCancel={() => setEditingPaymentMethod(null)}
                  onSaved={() => setEditingPaymentMethod(null)}
                />
              ) : (
                <article className="payment-method" key={method.id}>
                  <div className="payment-method-copy">
                    <h3>{method.label}</h3>
                    <p>{method.instructions}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Editar ${method.label}`}
                    onClick={() => {
                      setAddingPaymentMethod(false);
                      setEditingPaymentMethod(method.id);
                    }}
                  >
                    Editar
                  </Button>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </section>
  );
}

function CompanyForm({
  company,
}: {
  company: {
    name: string;
    taxId: string | null;
    address: string | null;
    phone: string | null;
  } | null;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (data: CompanyInput) => saveCompanySettings({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
  const form = useForm({
    defaultValues: companyValues(company),
    onSubmit: async ({ value }) => {
      try {
        const saved = await save.mutateAsync(value);
        form.reset({
          name: saved.name,
          taxId: saved.taxId ?? "",
          address: saved.address ?? "",
          phone: saved.phone ?? "",
        });
      } catch {
        // The mutation state below gives a visible, recoverable error.
      }
    },
  });
  const dirty = useSelector(form.store, (state) => state.isDirty);
  const draftRef = useUnsavedChanges(dirty);

  return (
    <section className="settings-section" aria-labelledby="company-heading">
      <h2 id="company-heading">Empresa</h2>
      <p className="settings-section-description">
        Use o nome que deve aparecer como emissor nas faturas.
      </p>
      <form
        className="settings-form"
        ref={draftRef}
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="settings-form-grid">
          <form.Field
            name="name"
            validators={{
              onSubmit: ({ value }) =>
                value.trim() ? undefined : "Informe o nome ou a razão social.",
            }}
          >
            {(field) => (
              <Field
                label="Nome ou razão social"
                fieldId="company-name"
                required
                error={field.state.meta.errors.join(" ")}
              >
                <Input
                  id="company-name"
                  name={field.name}
                  autoComplete="organization"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="taxId">
            {(field) => (
              <Field label="Identificação fiscal" fieldId="company-tax-id">
                <Input
                  id="company-tax-id"
                  name={field.name}
                  autoComplete="off"
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
        {save.isSuccess && !dirty && (
          <p className="settings-success" role="status">
            Dados da empresa salvos.
          </p>
        )}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={submitting || save.isPending}>
              {submitting || save.isPending ? "Salvando…" : "Salvar empresa"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </section>
  );
}

function PaymentMethodForm({
  paymentMethod,
  onCancel,
  onSaved,
}: {
  paymentMethod?: SavedPaymentMethod;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: PaymentMethodInput) =>
      paymentMethod
        ? updatePaymentMethod({ data: { id: paymentMethod.id, ...data } })
        : createPaymentMethod({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      onSaved();
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

  return (
    <form
      className="payment-method-editor"
      ref={draftRef}
      aria-label={
        paymentMethod
          ? `Editar ${paymentMethod.label}`
          : "Novo conjunto de dados de pagamento"
      }
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="label"
        validators={{
          onSubmit: ({ value }) =>
            value.trim() ? undefined : "Informe um rótulo.",
        }}
      >
        {(field) => (
          <Field
            label="Rótulo"
            fieldId={`${formId}-label`}
            required
            error={field.state.meta.errors.join(" ")}
          >
            <Input
              id={`${formId}-label`}
              name={field.name}
              required
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
        validators={{
          onSubmit: ({ value }) =>
            value.trim() ? undefined : "Informe as instruções de recebimento.",
        }}
      >
        {(field) => (
          <Field
            label="Instruções de recebimento"
            fieldId={`${formId}-instructions`}
            required
            error={field.state.meta.errors.join(" ")}
          >
            <textarea
              id={`${formId}-instructions`}
              name={field.name}
              required
              rows={4}
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
      {mutation.isSuccess && (
        <p className="settings-success" role="status">
          Dados de pagamento salvos.
        </p>
      )}
      <div className="form-actions">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={submitting || mutation.isPending}>
              {submitting || mutation.isPending
                ? "Salvando…"
                : "Salvar conjunto"}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
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
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
