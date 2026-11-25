import fontkit from "@pdf-lib/fontkit";
import boldFontUrl from "dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?inline";
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
    page: "Página",
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
    page: "Page",
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
  const embed = (url: string) =>
    pdf.embedFont(Buffer.from(url.slice(url.indexOf(",") + 1), "base64"), {
      subset: true,
    });
  const [regular, bold] = await Promise.all([
    embed(fontUrl),
    embed(boldFontUrl),
  ]);

  const [width, height] = PageSizes.A4;
  const margin = 48;
  const right = width - margin;
  const bodyWidth = right - margin;
  const hoursRight = right - 153;
  const projectWidth = hoursRight - margin - 78;
  const ink = rgb(0.145, 0.173, 0.161); // #252c29
  const green = rgb(0.212, 0.357, 0.243); // #365b3e
  const muted = rgb(0.349, 0.4, 0.357); // #59665b
  const border = rgb(0.839, 0.863, 0.827); // #d6dcd3
  const selected = rgb(0.902, 0.929, 0.875); // #e6eddf

  let page = pdf.addPage(PageSizes.A4);
  let y = height - margin;
  const draw = (
    text: string,
    x: number,
    size = 11,
    color = ink,
    font = regular,
  ) => {
    page.drawText(text, { font, size, x, y, color });
  };
  const drawRight = (
    text: string,
    x: number,
    size = 11,
    color = ink,
    font = regular,
  ) => {
    draw(text, x - font.widthOfTextAtSize(text, size), size, color, font);
  };
  const divider = (color = border, thickness = 0.65) => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: right, y },
      color,
      thickness,
    });
  };
  const nextPage = () => {
    page = pdf.addPage(PageSizes.A4);
    y = height - margin;
    draw(title, margin, 14, green, bold);
    y -= 27;
  };
  const ensureSpace = (points: number) => {
    if (y - points < margin) nextPage();
  };
  const paymentDetails = (label: string, instructions: string) => {
    ensureSpace(46);
    draw(copy.payment, margin, 10, green, bold);
    y -= 19;
    for (const line of wrap(label, bold, 12, bodyWidth)) {
      ensureSpace(14);
      draw(line, margin, 12, ink, bold);
      y -= 17;
    }
    for (const line of wrap(instructions, regular, 11, bodyWidth)) {
      ensureSpace(14);
      draw(line, margin);
      y -= 15;
    }
  };

  divider(green, 2);
  y -= 47;
  const titleSize = Math.min(
    36,
    (bodyWidth * 28) / bold.widthOfTextAtSize(title, 28),
  );
  draw(title, margin, titleSize, ink, bold);
  y -= 24;
  draw(
    `${copy.issued}: ${date(invoice.issuedAt * 1000, invoice.timezone ?? "UTC")}`,
    margin,
    10,
    muted,
  );
  if (invoice.periodFrom && invoice.periodTo) {
    y -= 17;
    draw(
      `${copy.period}: ${date(invoice.periodFrom, "UTC")} – ${date(invoice.periodTo, "UTC")}`,
      margin,
      10,
      muted,
    );
  }
  y -= 34;
  const {
    companySnapshot: company,
    clientSnapshot: client,
    paymentSnapshot: payment,
  } = invoice;
  const parties = [
    ...(company
      ? [
          {
            label: copy.company,
            name: company.name,
            details: [company.taxId, company.address, company.phone],
          },
        ]
      : []),
    ...(client
      ? [
          {
            label: copy.client,
            name: client.name,
            details: [client.legalName, client.taxId, client.address],
          },
        ]
      : []),
  ];
  if (parties.length) {
    const gutter = 32;
    const columnWidth =
      (bodyWidth - gutter * (parties.length - 1)) / parties.length;
    const columns = parties.map(({ name, details }, index) => {
      const x = margin + index * (columnWidth + gutter);
      return {
        x,
        lines: [
          ...wrap(name, bold, 13, columnWidth).map((line) => ({
            line,
            isName: true,
          })),
          ...details.flatMap((detail) =>
            detail
              ? wrap(detail, regular, 10, columnWidth).map((line) => ({
                  line,
                  isName: false,
                }))
              : [],
          ),
        ],
      };
    });
    parties.forEach(({ label }, index) =>
      draw(label, columns[index].x, 10, green, bold),
    );
    y -= 21;
    const lineCount = Math.max(...columns.map(({ lines }) => lines.length));
    for (let index = 0; index < lineCount; index++) {
      ensureSpace(16);
      for (const { x, lines } of columns) {
        const entry = lines[index];
        if (entry)
          draw(
            entry.line,
            x,
            entry.isName ? 13 : 10,
            ink,
            entry.isName ? bold : regular,
          );
      }
      y -= 17;
    }
    y -= 22;
  }

  const tableHeading = () => {
    draw(copy.project, margin, 10, green, bold);
    drawRight(copy.hours, hoursRight, 10, green, bold);
    drawRight(copy.subtotal, right, 10, green, bold);
    y -= 10;
    divider(green);
    y -= 21;
  };
  let needsTableHeading = true;
  for (const item of invoice.lines) {
    const project = wrap(item.projectName, bold, 11, projectWidth);
    const description =
      item.serviceDescription === item.projectName
        ? []
        : wrap(item.serviceDescription, regular, 10, projectWidth);
    const rowHeight = (project.length + description.length) * 15 + 14;
    const headingHeight = needsTableHeading ? 31 : 0;
    const availableOnNewPage = height - margin * 2 - 58;
    const spaceNeeded = rowHeight <= availableOnNewPage ? rowHeight : 30;
    if (y - headingHeight - spaceNeeded < margin) {
      nextPage();
      needsTableHeading = true;
    }
    if (needsTableHeading) {
      tableHeading();
      needsTableHeading = false;
    }
    for (const [index, line] of [...project, ...description].entries()) {
      if (y < margin + 14) {
        nextPage();
        tableHeading();
      }
      const isProject = index < project.length;
      draw(
        line,
        margin,
        isProject ? 11 : 10,
        isProject ? ink : muted,
        isProject ? bold : regular,
      );
      if (index === 0) {
        drawRight(duration(item.hoursSeconds), hoursRight, 10);
        drawRight(formatAmount(item.subtotalCents), right, 11, ink, bold);
      }
      y -= 15;
    }
    y += 2;
    divider();
    y -= 16;
  }
  const total = formatAmount(invoice.totalCents);
  const totalWidth = bold.widthOfTextAtSize(total, 23);
  const labelWidth = bold.widthOfTextAtSize(copy.total, 12);
  const totalBlockWidth = labelWidth + totalWidth + 48;
  const totalBlockLeft = right - totalBlockWidth;
  ensureSpace(invoice.exchangeRate ? 90 : 64);
  page.drawRectangle({
    x: totalBlockLeft,
    y: y - 31,
    width: totalBlockWidth,
    height: 37,
    color: selected,
  });
  y -= 16;
  draw(copy.total, totalBlockLeft + 14, 12, green, bold);
  drawRight(total, right - 14, 23, green, bold);
  y -= 34;
  if (invoice.exchangeRate) {
    const rate = invoice.exchangeRate.replace(
      /[,.]/,
      invoice.language === "en" ? "." : ",",
    );
    draw(`${copy.exchange}: 1 USD = ${rate} BRL`, margin, 10, muted);
    y -= 26;
  }
  if (payment) paymentDetails(payment.label, payment.instructions);

  const pages = pdf.getPages();
  if (pages.length > 1) {
    pages.forEach((current, index) => {
      page = current;
      y = 28;
      drawRight(`${copy.page} ${index + 1} / ${pages.length}`, right, 9, muted);
    });
  }

  return {
    bytes: await pdf.save(),
    filename: `${copy.title.toLowerCase()}-${invoice.number}.pdf`,
  };
}
