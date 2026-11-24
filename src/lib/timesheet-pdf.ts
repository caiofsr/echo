import { PDFDocument, PageSizes, StandardFonts, rgb } from "pdf-lib";
import {
  formatTimesheetDate,
  formatTimesheetEnd,
  formatTimesheetRowDuration,
  type TimesheetRow,
} from "./timesheet";

function wrapText(
  text: string,
  width: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words.length ? words : [""]) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      const next = line + character;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = character;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createTimesheetPdf(
  rows: readonly TimesheetRow[],
  timezone: string,
  serverNow: number,
  includeTask: boolean,
) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [PageSizes.A4[1], PageSizes.A4[0]];
  const margin = 36;
  const gap = 8;
  const labels = [
    "Início",
    "Fim",
    "Cliente",
    "Projeto",
    ...(includeTask ? ["Tarefa"] : []),
    "Horas trabalhadas",
  ];
  const weights = includeTask
    ? [1.1, 1.1, 1.2, 1.35, 1.15, 0.95]
    : [1.15, 1.15, 1.4, 1.55, 1.1];
  const availableWidth = pageSize[0] - margin * 2 - gap * (labels.length - 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map(
    (weight) => (availableWidth * weight) / totalWeight,
  );
  const rowValues = (row: TimesheetRow) => [
    formatTimesheetDate(row.startedAt, timezone),
    formatTimesheetEnd(row, timezone),
    row.clientName,
    row.projectName,
    ...(includeTask ? [row.taskName ?? "Sem tarefa"] : []),
    formatTimesheetRowDuration(row, serverNow),
  ];

  let page = document.addPage(pageSize);
  let y = 0;
  const drawTableHeading = () => {
    page.drawText("Timesheet", {
      x: margin,
      y: pageSize[1] - 44,
      size: 18,
      font: bold,
      color: rgb(0.14, 0.22, 0.17),
    });
    page.drawText(`Fuso horário: ${timezone} · ${rows.length} períodos`, {
      x: margin,
      y: pageSize[1] - 62,
      size: 9,
      font: regular,
      color: rgb(0.36, 0.4, 0.37),
    });
    y = pageSize[1] - 82;
    const headerHeight = 30;
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: pageSize[0] - margin * 2,
      height: headerHeight,
      color: rgb(0.92, 0.95, 0.92),
    });
    let x = margin;
    labels.forEach((label, index) => {
      const lines = wrapText(label, widths[index] - 10, bold, 8);
      lines.forEach((line, lineIndex) =>
        page.drawText(line, {
          x: x + 5,
          y: y - 12 - lineIndex * 10,
          size: 8,
          font: bold,
          color: rgb(0.14, 0.22, 0.17),
        }),
      );
      x += widths[index] + gap;
    });
    y -= headerHeight;
  };
  drawTableHeading();

  for (const row of rows) {
    const values = rowValues(row);
    const wrapped = values.map((value, index) =>
      wrapText(value, widths[index] - 10, regular, 8),
    );
    const lineCount = Math.max(...wrapped.map((cell) => cell.length));
    let lineOffset = 0;
    while (lineOffset < lineCount) {
      const availableHeight = y - (margin + 26);
      if (availableHeight < 34) {
        page = document.addPage(pageSize);
        drawTableHeading();
        continue;
      }
      const linesOnPage = Math.min(
        lineCount - lineOffset,
        Math.floor((availableHeight - 12) / 11),
      );
      const rowHeight = Math.max(34, linesOnPage * 11 + 12);
      let x = margin;
      wrapped.forEach((lines, index) => {
        lines
          .slice(lineOffset, lineOffset + linesOnPage)
          .forEach((line, lineIndex) =>
            page.drawText(line, {
              x: x + 5,
              y: y - 15 - lineIndex * 11,
              size: 8,
              font: regular,
              color: rgb(0.2, 0.23, 0.21),
            }),
          );
        x += widths[index] + gap;
      });
      page.drawLine({
        start: { x: margin, y: y - rowHeight },
        end: { x: pageSize[0] - margin, y: y - rowHeight },
        thickness: 0.5,
        color: rgb(0.86, 0.88, 0.86),
      });
      y -= rowHeight;
      lineOffset += linesOnPage;
      if (lineOffset < lineCount) {
        page = document.addPage(pageSize);
        drawTableHeading();
      }
    }
  }

  document.getPages().forEach((currentPage, index) => {
    currentPage.drawText(`${index + 1} / ${document.getPageCount()}`, {
      x: pageSize[0] - margin - 42,
      y: 18,
      size: 8,
      font: regular,
      color: rgb(0.45, 0.48, 0.45),
    });
  });
  return document.save();
}
