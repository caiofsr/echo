import { createServerFn } from "@tanstack/react-start";
import { requireSessionMiddleware } from "../middleware/auth";
import { db } from "../../db";
import { invoicePreviewSchema } from "../../lib/invoice-input";
import { createInvoiceStore } from "../invoices";

// The preview is read-only; POST only carries the structured selection.
export const previewInvoice = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(invoicePreviewSchema)
  .handler(({ data }) => createInvoiceStore(db).preview(data));
