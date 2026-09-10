import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { effectiveValue, tagLabel, fmtBRL, isVariable } from "./utils";
import { monthKeyLabel } from "./monthUtils";

function rowsFor(bills, tags) {
  return bills.map((b) => [
    b.description || "sem nome",
    tagLabel(tags, b.tagId),
    isVariable(b)
      ? b.valueMin && b.valueMax
        ? `${fmtBRL(Number(b.valueMin))} a ${fmtBRL(Number(b.valueMax))}`
        : "a definir"
      : fmtBRL(Number(b.value)),
    b.installmentsLeft ?? "nenhuma",
    b.notes || "",
  ]);
}

// sections: [{ label, bills, tags }] referentes ao mês selecionado
// monthlyTotals: [{ label, pessoal, empresa }] com todos os meses criados
export function exportCSV(fileName, sections, monthlyTotals) {
  const lines = [];
  lines.push(["Aba", "Descrição", "Quem paga", "Valor", "Parcelas restantes", "Observações"].join(";"));
  sections.forEach(({ label, bills, tags }) => {
    bills.forEach((b) => {
      const valor = isVariable(b)
        ? b.valueMin && b.valueMax
          ? `${b.valueMin} a ${b.valueMax}`
          : "a definir"
        : String(b.value);
      const cols = [label, b.description, tagLabel(tags, b.tagId), valor, b.installmentsLeft ?? "nenhuma", b.notes ?? ""];
      lines.push(cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"));
    });
  });

  lines.push("");
  lines.push(["Resumo do mês", "Total considerado", "Média por conta", "Quantidade de contas"].join(";"));
  sections.forEach(({ label, bills }) => {
    const total = bills.reduce((s, b) => s + effectiveValue(b), 0);
    const media = bills.length ? total / bills.length : 0;
    lines.push([label, total.toFixed(2), media.toFixed(2), bills.length].join(";"));
  });

  if (monthlyTotals && monthlyTotals.length) {
    lines.push("");
    lines.push(["Histórico mensal", "Total Pessoal", "Total Empresa"].join(";"));
    monthlyTotals.forEach((h) => lines.push([h.label, h.pessoal.toFixed(2), h.empresa.toFixed(2)].join(";")));
  }

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(fileName, title, monthKey, sections, monthlyTotals) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(monthKeyLabel(monthKey), 14, 24);

  let cursorY = 30;
  sections.forEach(({ label, bills, tags }) => {
    const total = bills.reduce((sum, b) => sum + effectiveValue(b), 0);
    const media = bills.length ? total / bills.length : 0;
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`${label}: total considerado ${fmtBRL(total)}, media ${fmtBRL(media)} por conta`, 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Descrição", "Quem paga", "Valor", "Parcelas restantes", "Observações"]],
      body: rowsFor(bills, tags),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 30, 50] },
      theme: "striped",
    });
    cursorY = doc.lastAutoTable.finalY + 12;
  });

  if (monthlyTotals && monthlyTotals.length > 1) {
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Histórico mensal", 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Mês", "Total Pessoal", "Total Empresa"]],
      body: monthlyTotals.map((h) => [h.label, fmtBRL(h.pessoal), fmtBRL(h.empresa)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 30, 50] },
      theme: "striped",
    });
  }

  doc.save(fileName);
}
