import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatDateRange } from "./date";
import {
  buildItemTransactionNote,
  formatAmount,
  formatShiftLabel,
  formatTransactionType,
} from "./formatting";
import type {
  CombinedRecordRow,
  LedgerCycleDetailData,
  RecordsSummary,
} from "./types";

function buildFilename(prefix: string, startDate: string, endDate: string) {
  return `${prefix}-${startDate}-to-${endDate}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function getAutoTableFinalY(doc: jsPDF, fallback: number) {
  return (
    (
      doc as jsPDF & {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable?.finalY ?? fallback
  );
}

export function exportRecordsToCsv(
  records: CombinedRecordRow[],
  summary: RecordsSummary,
  startDate: string,
  endDate: string,
) {
  const rows = [
    ["Date Range", formatDateRange(startDate, endDate)],
    ["Total Milk Amount", formatAmount(summary.totalMilkAmount)],
    ["Total Credit", formatAmount(summary.totalCredit)],
    ["Total Debit", formatAmount(summary.totalDebit)],
    ["Remaining Balance", formatAmount(summary.remainingBalance)],
    [],
    ["Date", "Created By", "Type", "Shift", "Amount", "Note"],
    ...records.map((record) => [
      record.date,
      record.created_by_email,
      formatTransactionType(record.type),
      formatShiftLabel(record.shift),
      formatAmount(record.amount),
      record.note,
    ]),
  ];

  const content = rows
    .map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(","))
    .join("\n");

  triggerDownload(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
    `${buildFilename("dairy-records", startDate, endDate)}.csv`,
  );
}

export function exportRecordsToPdf(
  records: CombinedRecordRow[],
  summary: RecordsSummary,
  startDate: string,
  endDate: string,
) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "landscape",
  });

  doc.setFontSize(18);
  doc.text("Dairy Records Report", 40, 48);

  doc.setFontSize(11);
  doc.text(`Date Range: ${formatDateRange(startDate, endDate)}`, 40, 74);
  doc.text(`Total Milk Amount: ${formatAmount(summary.totalMilkAmount)}`, 40, 94);
  doc.text(`Total Credit: ${formatAmount(summary.totalCredit)}`, 40, 112);
  doc.text(`Total Debit: ${formatAmount(summary.totalDebit)}`, 40, 130);
  doc.text(`Remaining Balance: ${formatAmount(summary.remainingBalance)}`, 40, 148);

  autoTable(doc, {
    startY: 174,
    head: [["Date", "Created By", "Type", "Shift", "Amount", "Note"]],
    body: records.map((record) => [
      record.date,
      record.created_by_email,
      formatTransactionType(record.type),
      formatShiftLabel(record.shift),
      formatAmount(record.amount),
      record.note,
    ]),
    headStyles: {
      fillColor: [47, 111, 67],
    },
    styles: {
      fontSize: 10,
      cellPadding: 7,
    },
    alternateRowStyles: {
      fillColor: [246, 244, 238],
    },
  });

  const finalY = getAutoTableFinalY(doc, 174);

  doc.setFontSize(12);
  doc.text(
    `Final Remaining Amount: ${formatAmount(summary.remainingBalance)}`,
    40,
    finalY + 28,
  );

  doc.save(`${buildFilename("dairy-records", startDate, endDate)}.pdf`);
}

export function exportLedgerCycleToPdf(detail: LedgerCycleDetailData) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  doc.setFontSize(18);
  doc.text("Ledger Cycle Report", 40, 48);

  doc.setFontSize(11);
  doc.text(`Cycle: ${detail.cycle.label}`, 40, 74);
  doc.text(
    `Total Milk Amount: ${formatAmount(detail.cycle.total_milk_amount)}`,
    40,
    94,
  );
  doc.text(`Total Credit: ${formatAmount(detail.cycle.total_credit)}`, 40, 112);
  doc.text(`Total Debit: ${formatAmount(detail.cycle.total_debit)}`, 40, 130);
  doc.text(
    `Carry Forward: ${formatAmount(detail.cycle.carry_forward)}`,
    40,
    148,
  );
  doc.text(`Net Balance: ${formatAmount(detail.cycle.net_balance)}`, 40, 166);
  doc.text(
    `Final Balance: ${formatAmount(detail.cycle.final_balance)}`,
    40,
    184,
  );

  autoTable(doc, {
    startY: 208,
    head: [["Milk Entries", "Date", "Shift", "Amount"]],
    body: detail.milkEntries.length
      ? detail.milkEntries.map((entry) => [
          "Milk",
          entry.date,
          formatShiftLabel(entry.shift),
          formatAmount(entry.total_amount),
        ])
      : [["No milk entries", "-", "-", "-"]],
    headStyles: {
      fillColor: [47, 111, 67],
    },
    styles: {
      fontSize: 10,
      cellPadding: 7,
    },
    alternateRowStyles: {
      fillColor: [246, 244, 238],
    },
  });

  let nextY = getAutoTableFinalY(doc, 208) + 24;

  autoTable(doc, {
    startY: nextY,
    head: [["Item Transactions", "Date", "Shift", "Type", "Amount", "Note"]],
    body: detail.itemTransactions.length
      ? detail.itemTransactions.map((item) => [
          item.item_name,
          item.date,
          formatShiftLabel(item.shift),
          formatTransactionType(item.type),
          formatAmount(item.amount),
          buildItemTransactionNote(item.item_name, item.note),
        ])
      : [["No item transactions", "-", "-", "-", "-", "-"]],
    headStyles: {
      fillColor: [47, 111, 67],
    },
    styles: {
      fontSize: 10,
      cellPadding: 7,
    },
    alternateRowStyles: {
      fillColor: [246, 244, 238],
    },
  });

  nextY = getAutoTableFinalY(doc, nextY) + 24;

  autoTable(doc, {
    startY: nextY,
    head: [["Payments", "Date", "Type", "Amount", "Note"]],
    body: detail.payments.length
      ? detail.payments.map((payment) => [
          "Payment",
          payment.date,
          formatTransactionType(payment.type),
          formatAmount(payment.amount),
          payment.note ?? "-",
        ])
      : [["No payments", "-", "-", "-", "-"]],
    headStyles: {
      fillColor: [47, 111, 67],
    },
    styles: {
      fontSize: 10,
      cellPadding: 7,
    },
    alternateRowStyles: {
      fillColor: [246, 244, 238],
    },
  });

  const finalY = getAutoTableFinalY(doc, nextY);

  doc.setFontSize(12);
  doc.text(
    `Final Balance: ${formatAmount(detail.cycle.final_balance)}`,
    40,
    finalY + 28,
  );

  doc.save(
    `${buildFilename("ledger-cycle", detail.cycle.start_date, detail.cycle.end_date)}.pdf`,
  );
}
