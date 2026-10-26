import { effectiveValue, isVariable, summarize } from "./calc";
import { fmtBRL } from "./format";
import { monthKeyLabel, monthKeyShort } from "./months";

const tagName = (tags, id) => tags.find((t) => t.id === id)?.name ?? "sem responsável";

const valueText = (b) => {
  if (!isVariable(b)) return b.value === null || b.value === undefined ? "a definir" : fmtBRL(Number(b.value));
  const { valueMin: lo, valueMax: hi } = b;
  if (lo !== null && hi !== null) return `${fmtBRL(Number(lo))} a ${fmtBRL(Number(hi))}`;
  return fmtBRL(Number(lo ?? hi));
};

const statusText = (b) => (b.status === "pago" ? "Pago" : "Pendente");

// Números no padrão brasileiro (vírgula) para o Excel/Planilhas em português abrirem certo.
const csvNumber = (n) => Number(n).toFixed(2).replace(".", ",");

// Evita que uma descrição como "=1+1" vire fórmula ao abrir a planilha.
const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// sections: [{ label, bills, tags }] do mês selecionado · history: [{ key, pessoal, empresa }]
export function exportCSV(fileName, monthKey, sections, history) {
  const lines = [];
  lines.push(`Contas do mês;${monthKeyLabel(monthKey)}`);
  lines.push("");
  lines.push(["Aba", "Descrição", "Quem paga", "Status", "Valor", "Valor considerado", "Parcelas restantes", "Observações"].join(";"));
  sections.forEach(({ label, bills, tags }) => {
    bills.forEach((b) => {
      const cols = [label, b.description, tagName(tags, b.tagId), statusText(b), valueText(b), csvNumber(effectiveValue(b)), b.installmentsLeft ?? "", b.notes ?? ""];
      lines.push(cols.map(csvCell).join(";"));
    });
  });

  lines.push("");
  lines.push(["Resumo do mês", "Total considerado", "Pago", "Pendente", "Média por conta", "Contas"].join(";"));
  sections.forEach(({ label, bills }) => {
    const s = summarize(bills);
    lines.push([label, csvNumber(s.total), csvNumber(s.paid), csvNumber(s.pending), csvNumber(s.average), s.count].join(";"));
  });

  if (history?.length) {
    lines.push("");
    lines.push(["Histórico mensal", "Total Pessoal", "Total Empresa"].join(";"));
    history.forEach((h) => lines.push([monthKeyShort(h.key), csvNumber(h.pessoal), csvNumber(h.empresa)].join(";")));
  }

  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), fileName);
}

// jsPDF é pesado: só é baixado quando o usuário pede o PDF.
export async function exportPDF(fileName, monthKey, sections, history) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Contas do mês", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(monthKeyLabel(monthKey), 14, 24);

  let y = 32;
  sections.forEach(({ label, bills, tags }) => {
    const s = summarize(bills);
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`${label}: total ${fmtBRL(s.total)} · pago ${fmtBRL(s.paid)} · pendente ${fmtBRL(s.pending)}`, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Descrição", "Quem paga", "Status", "Valor", "Parcelas", "Observações"]],
      body: bills.map((b) => [b.description || "sem nome", tagName(tags, b.tagId), statusText(b), valueText(b), b.installmentsLeft ?? "", b.notes || ""]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 22, 35] },
      theme: "striped",
    });
    y = doc.lastAutoTable.finalY + 12;
  });

  if (history?.length > 1) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Histórico mensal", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Mês", "Total Pessoal", "Total Empresa"]],
      body: history.map((h) => [monthKeyShort(h.key), fmtBRL(h.pessoal), fmtBRL(h.empresa)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 22, 35] },
      theme: "striped",
    });
  }

  doc.save(fileName);
}
