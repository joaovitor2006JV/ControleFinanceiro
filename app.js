// ===============================
// CONFIG SUPABASE preencha aqui
// ===============================
const SUPABASE_URL = "COLE_SUA_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "COLE_SUA_SUPABASE_ANON_KEY_AQUI";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// ELEMENTOS
// ===============================
const el = (id) => document.getElementById(id);

const mesRef = el("mesRef");
const btnCarregar = el("btnCarregar");

const salario = el("salario");
const extra = el("extra");
const btnSalvarEntradas = el("btnSalvarEntradas");
const btnZerarEntradas = el("btnZerarEntradas");

const kpiEntradas = el("kpiEntradas");
const kpiDespesas = el("kpiDespesas");
const kpiSaldo = el("kpiSaldo");

const despId = el("despId");
const data = el("data");
const categoria = el("categoria");
const descricao = el("descricao");
const valor = el("valor");
const btnSalvarDespesa = el("btnSalvarDespesa");
const btnCancelarEdicao = el("btnCancelarEdicao");

const fDe = el("fDe");
const fAte = el("fAte");
const fCat = el("fCat");
const fBusca = el("fBusca");
const fMin = el("fMin");
const fMax = el("fMax");
const btnAplicarFiltros = el("btnAplicarFiltros");
const btnLimparFiltros = el("btnLimparFiltros");

const lista = el("lista");
const toast = el("toast");

const repEntradas = el("repEntradas");
const repDespesas = el("repDespesas");
const repSaldo = el("repSaldo");
const repCats = el("repCats");
const btnExportCSV = el("btnExportCSV");
const btnPrint = el("btnPrint");


// ===============================
// HELPERS
// ===============================
function hojeISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function mesAtualYYYYMM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
}

function brl(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function dateRangeForMonth(yyyyMM) {
  const [y, m] = yyyyMM.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // último dia do mês
  const pad = (n) => String(n).padStart(2, "0");
  const s = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
  const e = `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`;
  return { s, e };
}

// estado
let MES = mesAtualYYYYMM();
let entradasMes = { salario: 0, ganho_extra: 0 };

// ===============================
// SUPABASE - LOAD CONFIG MENSAL
// ===============================
async function loadEntradasMes() {
  const { data: row, error } = await sb
    .from("config_mensal")
    .select("*")
    .eq("mes", MES)
    .maybeSingle();

  if (error) {
    console.error(error);
    showToast("Erro ao carregar entradas do mês.");
    entradasMes = { salario: 0, ganho_extra: 0 };
    salario.value = "";
    extra.value = "";
    return;
  }

  entradasMes = row || { salario: 0, ganho_extra: 0 };
  salario.value = entradasMes.salario ?? 0;
  extra.value = entradasMes.ganho_extra ?? 0;
}

// ===============================
// SUPABASE - SAVE CONFIG MENSAL
// ===============================
async function saveEntradasMes() {
  const payload = {
    mes: MES,
    salario: num(salario.value),
    ganho_extra: num(extra.value),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("config_mensal")
    .upsert(payload, { onConflict: "mes" });

  if (error) {
    console.error(error);
    showToast("Erro ao salvar entradas.");
    return;
  }

  entradasMes = { salario: payload.salario, ganho_extra: payload.ganho_extra };
  showToast("Entradas salvas.");
}

// ===============================
// SUPABASE - DESPESAS (QUERY)
// ===============================
async function fetchDespesas() {
  // filtro padrão: mês atual
  const { s: mesDe, e: mesAte } = dateRangeForMonth(MES);

  const de = fDe.value || mesDe;
  const ate = fAte.value || mesAte;

  let q = sb
    .from("despesas")
    .select("*")
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: false })
    .order("id", { ascending: false });

  const cat = (fCat.value || "").trim();
  const busca = (fBusca.value || "").trim();
  const min = fMin.value !== "" ? num(fMin.value) : null;
  const max = fMax.value !== "" ? num(fMax.value) : null;

  if (cat) q = q.ilike("categoria", `%${cat}%`);
  if (busca) q = q.ilike("descricao", `%${busca}%`);
  if (min !== null) q = q.gte("valor", min);
  if (max !== null) q = q.lte("valor", max);

  const { data, error } = await q;
  if (error) {
    console.error(error);
    showToast("Erro ao carregar despesas.");
    return [];
  }
  return data || [];
}

// ===============================
// SUPABASE - DESPESAS (CRUD)
// ===============================
async function insertDespesa(payload) {
  const { error } = await sb.from("despesas").insert(payload);
  if (error) throw error;
}

async function updateDespesa(id, payload) {
  const { error } = await sb.from("despesas").update(payload).eq("id", id);
  if (error) throw error;
}

async function deleteDespesa(id) {
  const { error } = await sb.from("despesas").delete().eq("id", id);
  if (error) throw error;
}

// ===============================
// UI - RENDER
// ===============================
function setKPIs(totalDespesas) {
  const entradas = num(entradasMes.salario) + num(entradasMes.ganho_extra);

  // KPIs do card principal
  kpiEntradas.textContent = brl(entradas);
  kpiDespesas.textContent = brl(totalDespesas);

  const saldo = entradas - totalDespesas;
  kpiSaldo.textContent = brl(saldo);
  kpiSaldo.style.color = saldo >= 0 ? "var(--ok)" : "var(--danger)";

  // KPIs do relatório
  if (repEntradas) repEntradas.textContent = brl(entradas);
  if (repDespesas) repDespesas.textContent = brl(totalDespesas);

  if (repSaldo) {
    repSaldo.textContent = brl(saldo);
    repSaldo.style.color = saldo >= 0 ? "var(--ok)" : "var(--danger)";
  }
}


function renderRows(rows) {
  if (!rows.length) {
    lista.innerHTML = `<tr><td colspan="5" style="color:rgba(255,255,255,0.7); padding:16px;">Nenhuma despesa nesse filtro.</td></tr>`;
    return;
  }

  lista.innerHTML = rows.map(r => `
    <tr>
      <td>${r.data}</td>
      <td>${escapeHtml(r.categoria)}</td>
      <td>${escapeHtml(r.descricao)}</td>
      <td class="right">${brl(r.valor)}</td>
      <td class="right">
        <div class="row-actions">
          <button class="icon-btn" data-action="edit" data-id="${r.id}">Editar</button>
          <button class="icon-btn danger" data-action="del" data-id="${r.id}">Apagar</button>
        </div>
      </td>
    </tr>
  `).join("");

  lista.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      if (!Number.isFinite(id)) return;

      if (action === "edit") {
        const row = rows.find(x => x.id === id);
        if (!row) return;
        startEdit(row);
      }

      if (action === "del") {
        // sem pop-up: apaga e avisa no toast (simples)
        try {
          await deleteDespesa(id);
          showToast("Despesa apagada.");
          await refresh();
        } catch (e) {
          console.error(e);
          showToast("Erro ao apagar.");
        }
      }
    });
  });
}

function startEdit(row) {
  despId.value = row.id;
  data.value = row.data;
  categoria.value = row.categoria;
  descricao.value = row.descricao;
  valor.value = row.valor;

  btnCancelarEdicao.classList.remove("hidden");
  btnSalvarDespesa.textContent = "Atualizar";
  showToast("Editando despesa...");
}

function cancelEdit() {
  despId.value = "";
  data.value = hojeISO();
  categoria.value = "";
  descricao.value = "";
  valor.value = "";

  btnCancelarEdicao.classList.add("hidden");
  btnSalvarDespesa.textContent = "Salvar";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===============================
// REFRESH GERAL
// ===============================
async function refresh() {
  await loadEntradasMes();
  const rows = await fetchDespesas();

  const total = rows.reduce((acc, r) => acc + num(r.valor), 0);
  setKPIs(total);
  renderRows(rows);

  // relatório por categoria (filtro atual)
  renderCategorias(rows);
}


// ===============================
// EVENTOS
// ===============================
btnCarregar.addEventListener("click", async () => {
  MES = mesRef.value || mesAtualYYYYMM();
  showToast(`Carregado: ${MES}`);
  await refresh();
});

btnSalvarEntradas.addEventListener("click", async () => {
  await saveEntradasMes();
  await refresh();
});

btnZerarEntradas.addEventListener("click", async () => {
  salario.value = 0;
  extra.value = 0;
  await saveEntradasMes();
  await refresh();
});

btnSalvarDespesa.addEventListener("click", async () => {
  const payload = {
    data: data.value,
    categoria: (categoria.value || "").trim(),
    descricao: (descricao.value || "").trim(),
    valor: num(valor.value),
  };

  if (!payload.data || !payload.categoria || !payload.descricao || payload.valor <= 0) {
    showToast("Preencha data, categoria, descrição e valor > 0.");
    return;
  }

  try {
    const id = despId.value ? Number(despId.value) : null;
    if (id) {
      await updateDespesa(id, payload);
      showToast("Despesa atualizada.");
    } else {
      await insertDespesa(payload);
      showToast("Despesa salva.");
    }
    cancelEdit();
    await refresh();
  } catch (e) {
    console.error(e);
    showToast("Erro ao salvar despesa.");
  }
});

btnCancelarEdicao.addEventListener("click", () => cancelEdit());

btnAplicarFiltros.addEventListener("click", async () => {
  await refresh();
  showToast("Filtros aplicados.");
});

if (btnExportCSV) {
  btnExportCSV.addEventListener("click", async () => {
    const rows = await fetchDespesas(); // exporta o filtro atual
    const file = `despesas_${MES}.csv`;
    downloadCSV(file, rows);
    showToast("CSV gerado.");
  });
}

if (btnPrint) {
  btnPrint.addEventListener("click", () => {
    window.print();
  });
}


btnLimparFiltros.addEventListener("click", async () => {
  fDe.value = "";
  fAte.value = "";
  fCat.value = "";
  fBusca.value = "";
  fMin.value = "";
  fMax.value = "";
  await refresh();
  showToast("Filtros limpos.");
});

function renderCategorias(rows){
  if (!repCats) return;

  const map = new Map();
  for (const r of rows) {
    const cat = (r.categoria || "Sem categoria").trim() || "Sem categoria";
    map.set(cat, (map.get(cat) || 0) + num(r.valor));
  }

  const items = Array.from(map.entries())
    .sort((a,b) => b[1] - a[1]);

  if (!items.length) {
    repCats.innerHTML = `<tr><td colspan="2" style="padding:16px; color:rgba(255,255,255,0.7)">Sem dados no filtro.</td></tr>`;
    return;
  }

  repCats.innerHTML = items.map(([cat,total]) => `
    <tr>
      <td>${escapeHtml(cat)}</td>
      <td class="right">${brl(total)}</td>
    </tr>
  `).join("");
}

function downloadCSV(filename, rows){
  const header = ["data","categoria","descricao","valor"];
  const lines = [header.join(",")];

  for (const r of rows) {
    const line = [
      r.data,
      `"${String(r.categoria||"").replaceAll('"','""')}"`,
      `"${String(r.descricao||"").replaceAll('"','""')}"`,
      String(num(r.valor)).replace(".", ",")
    ];
    lines.push(line.join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


// ===============================
// INIT
// ===============================
(function init() {
  MES = mesAtualYYYYMM();
  mesRef.value = MES;
  data.value = hojeISO();
  refresh();
})();
