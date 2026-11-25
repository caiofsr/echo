import fontkit from "@pdf-lib/fontkit";
import fontUrl from "dejavu-fonts-ttf/ttf/DejaVuSans.ttf?inline";
import { PDFDocument, PageSizes, rgb, type PDFFont } from "pdf-lib";
import { duration } from "../lib/timer-input";
import type { IssuedInvoice } from "./invoices";

const labels = {
  pt: {
    locale: "pt-BR",
    title: "Fatura",
    issued: "Emissão",
    period: "Período",
    client: "Cliente",
    company: "Empresa",
    payment: "Dados de pagamento",
    project: "Projeto e serviço",
    hours: "Horas",
    subtotal: "Subtotal",
    total: "Total",
    exchange: "Cotação",
  },
  en: {
    locale: "en-US",
    title: "Invoice",
    issued: "Issue date",
    period: "Service period",
    client: "Client",
    company: "Company",
    payment: "Payment details",
    project: "Project and service",
    hours: "Hours",
    subtotal: "Subtotal",
    total: "Total",
    exchange: "Exchange rate",
  },
};

function wrap(text: string, font: PDFFont, size: number, width: number) {
  return text.split(/\r\n?|\n/).flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, size) > width && line) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    return [...lines, line];
  });
}

export async function createInvoicePdf(invoice: IssuedInvoice) {
  const copy = labels[invoice.language];
  const title = `${copy.title} ${invoice.number}`;
  const money = new Intl.NumberFormat(copy.locale, {
    style: "currency",
    currency: invoice.currency,
    currencyDisplay: "code",
  });
  const formatAmount = (cents: number) => {
    const value = BigInt(cents);
    const fraction = String(value % 100n).padStart(2, "0");
    return money
      .formatToParts(value / 100n)
      .map((part) => (part.type === "fraction" ? fraction : part.value))
      .join("");
  };
  const date = (value: number | string, timeZone: string) =>
    new Intl.DateTimeFormat(copy.locale, {
      dateStyle: "medium",
      timeZone,
    }).format(new Date(value));
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setLanguage(copy.locale);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(
    Buffer.from(fontUrl.slice(fontUrl.indexOf(",") + 1), "base64"),
    { subset: true },
  );

  const [width, height] = PageSizes.A4;
  const margin = 44;
  const right = width - margin;
  const bodyWidth = right - margin;
  const projectWidth = bodyWidth - 205;
  const hoursRight = right - 127;
  const ink = rgb(0.13, 0.19, 0.16);
  const accent = rgb(0.19, 0.35, 0.27);
  const rule = rgb(0.8, 0.85, 0.82);

  let page = pdf.addPage(PageSizes.A4);
  let y = height - margin;
  const draw = (text: string, x: number, size = 11, color = ink) => {
    page.drawText(text, { font, size, x, y, color });
  };
  const drawRight = (text: string, x: number, size = 11) => {
    draw(text, x - font.widthOfTextAtSize(text, size), size);
  };
  const divider = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: right, y },
      color: rule,
      thickness: 0.65,
    });
  };
  const nextPage = () => {
    page = pdf.addPage(PageSizes.A4);
    y = height - margin;
    draw(title, margin, 14, accent);
    y -= 26;
  };
  const ensureSpace = (points: number) => {
    if (y - points < margin) nextPage();
  };
  const section = (label: string, values: (string | null | undefined)[]) => {
    ensureSpace(41);
    draw(label, margin, 10, accent);
    y -= 19;
    for (const value of values) {
      if (!value) continue;
      for (const line of wrap(value, font, 11, bodyWidth)) {
        ensureSpace(14);
        draw(line, margin);
        y -= 15;
      }
    }
    y -= 13;
  };

  draw(title, margin, 29, accent);
  y -= 25;
  draw(
    `${copy.issued}: ${date(invoice.issuedAt * 1000, invoice.timezone ?? "UTC")}`,
    margin,
    10,
  );
  if (invoice.periodFrom && invoice.periodTo) {
    y -= 17;
    draw(
      `${copy.period}: ${date(invoice.periodFrom, "UTC")} – ${date(invoice.periodTo, "UTC")}`,
      margin,
      10,
    );
  }
  y -= 19;
  divider();
  y -= 25;
  const {
    companySnapshot: company,
    clientSnapshot: client,
    paymentSnapshot: payment,
  } = invoice;
  if (company)
    section(copy.company, [
      company.name,
      company.taxId,
      company.address,
      company.phone,
    ]);
  if (client)
    section(copy.client, [
      client.name,
      client.legalName,
      client.taxId,
      client.address,
    ]);

  const tableHeading = () => {
    draw(copy.project, margin, 10, accent);
    drawRight(copy.hours, hoursRight, 10);
    drawRight(copy.subtotal, right, 10);
    y -= 8;
    divider();
    y -= 18;
  };
  ensureSpace(54);
  tableHeading();
  for (const item of invoice.lines) {
    const text = [
      ...wrap(item.projectName, font, 11, projectWidth),
      ...(item.serviceDescription === item.projectName
        ? []
        : wrap(item.serviceDescription, font, 11, projectWidth)),
    ];
    for (const [index, line] of text.entries()) {
      if (y < margin + 14) {
        nextPage();
        tableHeading();
      }
      draw(line, margin);
      if (index === 0) {
        drawRight(duration(item.hoursSeconds), hoursRight);
        drawRight(formatAmount(item.subtotalCents), right);
      }
      y -= 15;
    }
    y -= 7;
  }
  ensureSpace(48);
  divider();
  y -= 25;
  draw(copy.total, margin, 15);
  drawRight(formatAmount(invoice.totalCents), right, 15);
  y -= 26;
  if (invoice.exchangeRate) {
    ensureSpace(18);
    const rate = invoice.exchangeRate.replace(
      /[,.]/,
      invoice.language === "en" ? "." : ",",
    );
    draw(`${copy.exchange}: 1 USD = ${rate} BRL`, margin, 10);
    y -= 23;
  }
  if (payment) section(copy.payment, [payment.label, payment.instructions]);

  return {
    bytes: await pdf.save(),
    filename: `${copy.title.toLowerCase()}-${invoice.number}.pdf`,
  };
}
