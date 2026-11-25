import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { auth } from "../../../lib/auth";
import { createInvoiceStore } from "../../../server/invoices";
import { createInvoicePdf } from "../../../server/invoice-pdf";

export const Route = createFileRoute("/api/invoices/$id/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const headers = new Headers({ "Cache-Control": "no-store" });
        const session = await auth.api.getSession({
          headers: request.headers,
          query: { disableRefresh: true },
        });
        if (!session) return new Response(null, { status: 401, headers });

        const id = Number(params.id);
        const invoice =
          /^[1-9][0-9]*$/.test(params.id) && Number.isSafeInteger(id)
            ? await createInvoiceStore(db).find(id)
            : null;
        if (!invoice) return new Response(null, { status: 404, headers });

        const { bytes, filename } = await createInvoicePdf(invoice);
        headers.set("Content-Type", "application/pdf");
        headers.set(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return new Response(Buffer.from(bytes), { headers });
      },
    },
  },
});
