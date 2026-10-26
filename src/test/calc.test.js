import { describe, it, expect } from "vitest";
import { billRangeCents, effectiveValue, isVariable, summarize, totalsByTag, compare, installmentsOutlook, historyStats } from "../lib/calc";
import { cloneBillsForMonth } from "../data/factories";
import { currentMonthKey, shiftMonthKey, monthDiff, findPreviousExistingMonth } from "../lib/months";

const bill = (o = {}) => ({ id: Math.random().toString(), value: null, valueMin: null, valueMax: null, installmentsLeft: null, tagId: null, status: "pendente", description: "", notes: "", ...o });

describe("valor da conta", () => {
  it("fixo vale o próprio valor", () => expect(effectiveValue(bill({ value: 129.9 }))).toBe(129.9));
  it("variável vale a média da faixa", () => expect(effectiveValue(bill({ valueMin: 100, valueMax: 200 }))).toBe(150));
  it("faixa invertida é normalizada", () => expect(billRangeCents(bill({ valueMin: 200, valueMax: 100 }))).toEqual({ min: 10000, max: 20000 }));
  it("só máximo preenchido vale o máximo (antes virava 0)", () => expect(effectiveValue(bill({ valueMax: 900 }))).toBe(900));
  it("só mínimo preenchido vale o mínimo", () => expect(effectiveValue(bill({ valueMin: 80 }))).toBe(80));
  it("sem valor nenhum vale 0 e não é 'variável'", () => {
    expect(effectiveValue(bill())).toBe(0);
    expect(isVariable(bill())).toBe(false);
  });
  it("valor 0 é fixo, não variável", () => expect(isVariable(bill({ value: 0 }))).toBe(false));
});

describe("resumo", () => {
  it("soma em centavos, sem erro de ponto flutuante", () => {
    const s = summarize([bill({ value: 0.1 }), bill({ value: 0.2 }), bill({ value: 129.9 }), bill({ value: 119.9 })]);
    expect(s.total).toBe(250.1);
  });
  it("separa pago e pendente e calcula a porcentagem", () => {
    const s = summarize([bill({ value: 300, status: "pago" }), bill({ value: 100 })]);
    expect(s).toMatchObject({ total: 400, paid: 300, pending: 100, paidCount: 1, pendingCount: 1, pctPaid: 75 });
  });
  it("faixa estimada soma mínimos e máximos", () => {
    const s = summarize([bill({ value: 100 }), bill({ valueMin: 50, valueMax: 150 })]);
    expect(s).toMatchObject({ min: 150, max: 250, total: 200, hasRange: true });
  });
  it("mês vazio não gera NaN", () => {
    const s = summarize([]);
    expect(s).toMatchObject({ total: 0, average: 0, pctPaid: 0, biggest: null });
  });
  it("conta o que está sem valor e sem categoria", () => {
    const s = summarize([bill(), bill({ value: 10, tagId: "x" })]);
    expect(s).toMatchObject({ noValueCount: 1, noTagCount: 1 });
  });
});

describe("por categoria", () => {
  it("agrupa e inclui as sem categoria (ou com categoria apagada)", () => {
    const tags = [{ id: "a", name: "A", color: "blue" }];
    const rows = totalsByTag([bill({ value: 60, tagId: "a" }), bill({ value: 40, tagId: "apagada" }), bill({ value: 0 })], tags);
    expect(rows[0]).toMatchObject({ total: 60, share: 60 });
    expect(rows[1]).toMatchObject({ tag: null, count: 2, total: 40 });
  });
});

describe("comparação", () => {
  it("variação em valor e %", () => expect(compare(1100, 1000)).toMatchObject({ delta: 100, pct: 10 }));
  it("sem mês anterior devolve null", () => expect(compare(10, null)).toBeNull());
  it("anterior zero não divide por zero", () => expect(compare(10, 0).pct).toBeNull());
});

describe("parcelas", () => {
  it("projeta os próximos meses a partir do mês atual", () => {
    const o = installmentsOutlook([bill({ value: 100, installmentsLeft: 3 }), bill({ value: 50, installmentsLeft: 1 })], "2026-11");
    expect(o.months.map((m) => m.total)).toEqual([150, 100, 100]);
    expect(o.afterThisMonth).toBe(200);
    expect(o.lastMonthKey).toBe("2027-01");
    expect(o.count).toBe(2);
  });
  it("sem parcelas devolve vazio", () => expect(installmentsOutlook([bill({ value: 1 })], "2026-11")).toMatchObject({ count: 0, months: [], lastMonthKey: null }));
});

describe("copiar mês", () => {
  const src = [bill({ value: 100, installmentsLeft: 3, description: "A" }), bill({ value: 50, installmentsLeft: 1, description: "B" }), bill({ value: 10, description: "C", status: "pago" })];
  it("desconta uma parcela por mês e descarta as quitadas", () => {
    const { bills, finished } = cloneBillsForMonth(src, "pessoal", "2026-10", "2026-11");
    expect(bills.map((b) => [b.description, b.installmentsLeft])).toEqual([["A", 2], ["C", null]]);
    expect(finished).toBe(1);
  });
  it("copia tudo como pendente e com ids novos", () => {
    const { bills } = cloneBillsForMonth(src, "pessoal", "2026-10", "2026-11");
    expect(bills.every((b) => b.status === "pendente" && b.monthKey === "2026-11")).toBe(true);
    expect(bills[0].id).not.toBe(src[0].id);
  });
  it("pulando meses desconta mais parcelas", () => {
    const { bills } = cloneBillsForMonth(src, "pessoal", "2026-10", "2027-01");
    expect(bills.map((b) => b.description)).toEqual(["C"]);
  });
  it("copiar 'para trás' não aumenta parcelas", () => {
    const { bills } = cloneBillsForMonth(src, "pessoal", "2026-10", "2026-08");
    expect(bills[0].installmentsLeft).toBe(3);
  });
});

describe("histórico", () => {
  it("ignora meses vazios na média", () => {
    const s = historyStats([{ key: "a", total: 100 }, { key: "b", total: 0 }, { key: "c", total: 300 }]);
    expect(s.average).toBe(200);
    expect(s.max.key).toBe("c");
    expect(s.min.key).toBe("a");
  });
  it("sem dados devolve null", () => expect(historyStats([{ key: "a", total: 0 }])).toBeNull());
});

describe("meses", () => {
  it("mês atual", () => expect(currentMonthKey(new Date(2026, 9, 26))).toBe("2026-10"));
  it("virada de ano", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });
  it("distância", () => expect(monthDiff("2026-10", "2027-02")).toBe(4));
  it("mês anterior existente", () => expect(findPreviousExistingMonth(["2026-01", "2026-05", "2026-09"], "2026-07")).toBe("2026-05"));
});

import { translateAuthError } from "../lib/authErrors";
import { makeEmptyBill, makeTag } from "../data/factories";

describe("mensagens de login", () => {
  it("login inválido em português, sem dizer se o e-mail existe", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });
  it("cadastro com e-mail já existente NÃO confirma que a conta existe", () => {
    const msg = translateAuthError("User already registered");
    expect(msg).not.toMatch(/já tem conta|já existe|já está cadastrado/i);
    expect(msg).toMatch(/Não foi possível criar a conta/);
  });
  it("mensagem desconhecida é repassada e vazia vira texto genérico", () => {
    expect(translateAuthError("algo novo")).toBe("algo novo");
    expect(translateAuthError("")).toMatch(/Algo deu errado/);
  });
});

describe("dados por usuário", () => {
  it("contas e categorias novas carregam o dono", () => {
    expect(makeEmptyBill("pessoal", "2026-10", "user-1").ownerId).toBe("user-1");
    expect(makeTag("pessoal", "Casa", "blue", "user-1").ownerId).toBe("user-1");
  });
  it("copiar um mês mantém o dono nas contas copiadas", () => {
    const src = [{ ...makeEmptyBill("pessoal", "2026-10", "user-1"), value: 10, description: "A" }];
    const { bills } = cloneBillsForMonth(src, "pessoal", "2026-10", "2026-11", "user-1");
    expect(bills[0].ownerId).toBe("user-1");
  });
});
