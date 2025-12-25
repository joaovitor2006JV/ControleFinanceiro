// ===============================
// CONFIG SUPABASE
// ===============================
const SUPABASE_URL = "https://zdvlzgjzfobquuylkosw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkdmx6Z2p6Zm9icXV1eWxrb3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTIwNzMsImV4cCI6MjA4MjE4ODA3M30.2N6OFFczJflCQcptPnja9lgOV_qk0xxNpaQBTNFjVDY";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// HELPERS
// ===============================
const el = (id) => document.getElementById(id);

function hojeISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mesAtualYYYYMM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function brl(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateRangeForMonth(yyyyMM) {
  const [y, m] = yyyyMM.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const pad = (n) => String(n).padStart(2, "0");
  const s = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const e = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  return { s, e };
}

// ===============================
// TOAST (sem popup chato)
// ===============================
const toast = el("toast");
let toastTimer = null;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

// ===============================
// ESTADO
// ===============================
let MES = mesAtualYYYYMM();

// ===============================
// ELEMENTOS (MÊS)
// ===============================
const mesRef = el("mesRef");
const btnCarregar = el("btnCarregar");

// ===============================
// ELEMENTOS (KPIs / RELATÓRIO)
// ===============================
const kpiEntradas = el("kpiEntradas");
const kpiDespesas = el("kpiDespesas");
const kpiSaldo = el("kpiSaldo");

const repEntradas = el("repEntradas");
const repDespesas = el("repDespesas");
const repSaldo = el("repSaldo");
const repCats = el("repCats");
const btnExportCSV = el("btnExportCSV");
const btnPrint = el("btnPrint");

// ===============================
// ENTRADAS (LANÇAMENTOS)
// ===============================
const entData = el("entData");
const entTipo = el("entTipo");
const entDesc = el("entDesc");
const entValor = el("entValor");
const btnSalvarEntrada = el("btnSalvarEntrada");
const btnCancelarEdicaoEntrada = el("btnCancelarEdicaoEntrada");
const listaEntradas = el("listaEntradas");
let entradaEditId = null;

// ===============================
// DESPESAS
// ===============================
const despId = el("despId");
const data = el("data");
const categoria = el("categoria");
const descricao = el("descricao");
const valor = el("valor");
const btnSalvarDespesa = el("btnSalvarDespesa");
const btnCancelarEdicao = el("btnCancelarEdicao");
const lista = el("lista");

// filtros despesas
const fDe = el("fDe");
const fAte = el("fAte");
const fCat = el("fCat");
const fBusca = el("fBusca");
const fMin = el("fMin");
const fMax = el("fMax");
const btnAplicarFiltros = el("btnAplicarFiltros");
const btnLimparFiltros = el("btnLimparFiltros");

// ===============================
// SUPABASE - ENTRADAS (QUERY)
// ===============================
async function fetchEntradas() {
  const { s: mesDe, e: mesAte } = dateRangeForMonth(MES);

  const { data, error } = await sb
    .from("entradas")
    .select("*")
    .gte("data", mesDe)
    .lte("data", mesAte)
    .order("data", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Erro ao carregar entradas.");
    return [];
  }
  return data || [];
}

// ===============================
// SUPABASE - ENTRADAS (CRUD)
// ===============================
async function insertEntrada(payload) {
  const { error } = await sb.from("entradas").insert(payload);
  if (error) throw error;
}
async function updateEntrada(id, payload) {
  const { error } = await sb.from("entradas").update(payload).eq("id", id);
  if (error) throw error;
}
async function deleteEntrada(id) {
  const { error } = await sb.from("entradas").delete().eq("id", id);
  if (error) throw error;
}

// ===============================
// UI - ENTRADAS (RENDER)
// ===============================
function renderEntradas(rows) {
  if (!listaEntradas) return;

  if (!rows.length) {
    listaEntradas.innerHTML =
      `<tr><td colspan="5" style="color:rgba(255,255,255,0.7); padding:16px;">Nenhuma entrada neste mês.</td></tr>`;
    return;
  }

  listaEntradas.innerHTML = rows.map(r => `
    <tr>
      <td>${r.data}</td>
      <td>${escapeHtml(r.tipo)}</td>
      <td>${escapeHtml(r.descricao)}</td>
      <td class="right">${brl(r.valor)}</td>
      <td class="right">
        <div class="row-actions">
          <button class="icon-btn" data-action="edit-ent" data-id="${r.id}">Editar</button>
          <button class="icon-btn danger" data-action="del-ent" data-id="${r.id}">Apagar</button>
        </div>
      </td>
    </tr>
  `).join("");

  listaEntradas.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      const row = rows.find(x => x.id === id);
      if (!row) return;

      if (action === "edit-ent") {
        entradaEditId = row.id;
        if (entData) entData.value = row.data;
        if (entTipo) entTipo.value = row.tipo;
        if (entDesc) entDesc.value = row.descricao;
        if (entValor) entValor.value = row.valor;

        if (btnCancelarEdicaoEntrada) btnCancelarEdicaoEntrada.classList.remove("hidden");
        if (btnSalvarEntrada) btnSalvarEntrada.textContent = "Atualizar entrada";
        showToast("Editando entrada...");
      }

      if (action === "del-ent") {
        try {
          await deleteEntrada(id);
          showToast("Entrada apagada.");
          await refresh();
        } catch (e) {
          console.error(e);
          showToast("Erro ao apagar entrada.");
        }
      }
    });
  });
}

function resetEntradaForm() {
  entradaEditId = null;
  if (entData) entData.value = hojeISO();
  if (entTipo) entTipo.value = "salario";
  if (entDesc) entDesc.value = "";
  if (entValor) entValor.value = "";
  if (btnCancelarEdicaoEntrada) btnCancelarEdicaoEntrada.classList.add("hidden");
  if (btnSalvarEntrada) btnSalvarEntrada.textContent = "Salvar entrada";
}

// ===============================
// SUPABASE - DESPESAS (QUERY)
// ===============================
async function fetchDespesas() {
  const { s: mesDe, e: mesAte } = dateRangeForMonth(MES);

  const de = (fDe && fDe.value) ? fDe.value : mesDe;
  const ate = (fAte && fAte.value) ? fAte.value : mesAte;

  let q = sb
    .from("despesas")
    .select("*")
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: false })
    .order("id", { ascending: false });

  const cat = (fCat?.value || "").trim();
  const busca = (fBusca?.value || "").trim();
  const min = (fMin && fMin.value !== "") ? num(fMin.value) : null;
  const max = (fMax && fMax.value !== "") ? num(fMax.value) : null;

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
// UI - DESPESAS (RENDER)
// ===============================
function renderRows(rows) {
  if (!lista) return;

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
  if (despId) despId.value = row.id;
  if (data) data.value = row.data;
  if (categoria) categoria.value = row.categoria;
  if (descricao) descricao.value = row.descricao;
  if (valor) valor.value = row.valor;

  if (btnCancelarEdicao) btnCancelarEdicao.classList.remove("hidden");
  if (btnSalvarDespesa) btnSalvarDespesa.textContent = "Atualizar";
  showToast("Editando despesa...");
}

function cancelEdit() {
  if (despId) despId.value = "";
  if (data) data.value = hojeISO();
  if (categoria) categoria.value = "";
  if (descricao) descricao.value = "";
  if (valor) valor.value = "";

  if (btnCancelarEdicao) btnCancelarEdicao.classList.add("hidden");
  if (btnSalvarDespesa) btnSalvarDespesa.textContent = "Salvar";
}

// ===============================
// RELATÓRIO POR CATEGORIA (DESPESAS DO FILTRO)
// ===============================
function renderCategorias(rows) {
  if (!repCats) return;

  const map = new Map();
  for (const r of rows) {
    const cat = (r.categoria || "Sem categoria").trim() || "Sem categoria";
    map.set(cat, (map.get(cat) || 0) + num(r.valor));
  }

  const items = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

  if (!items.length) {
    repCats.innerHTML =
      `<tr><td colspan="2" style="padding:16px; color:rgba(255,255,255,0.7)">Sem dados no filtro.</td></tr>`;
    return;
  }

  repCats.innerHTML = items.map(([cat, total]) => `
    <tr>
      <td>${escapeHtml(cat)}</td>
      <td class="right">${brl(total)}</td>
    </tr>
  `).join("");
}

// ===============================
// CSV (EXPORTA DESPESAS DO FILTRO ATUAL)
// ===============================
function downloadCSV(filename, rows) {
  const header = ["data", "categoria", "descricao", "valor"];
  const lines = [header.join(",")];

  for (const r of rows) {
    const line = [
      r.data,
      `"${String(r.categoria || "").replaceAll('"', '""')}"`,
      `"${String(r.descricao || "").replaceAll('"', '""')}"`,
      String(num(r.valor)).replace(".", ","),
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
// REFRESH GERAL (ENTRADAS + DESPESAS)
// ===============================
async function refresh() {
  const entradas = await fetchEntradas();
  const despesas = await fetchDespesas();

  const totalEntradas = entradas.reduce((a, r) => a + num(r.valor), 0);
  const totalDespesas = despesas.reduce((a, r) => a + num(r.valor), 0);
  const saldo = totalEntradas - totalDespesas;

  // KPIs (se existirem)
  if (kpiEntradas) kpiEntradas.textContent = brl(totalEntradas);
  if (kpiDespesas) kpiDespesas.textContent = brl(totalDespesas);
  if (kpiSaldo) {
    kpiSaldo.textContent = brl(saldo);
    kpiSaldo.style.color = saldo >= 0 ? "var(--ok)" : "var(--danger)";
  }

  // Relatório (se existirem)
  if (repEntradas) repEntradas.textContent = brl(totalEntradas);
  if (repDespesas) repDespesas.textContent = brl(totalDespesas);
  if (repSaldo) {
    repSaldo.textContent = brl(saldo);
    repSaldo.style.color = saldo >= 0 ? "var(--ok)" : "var(--danger)";
  }

  // Render
  renderEntradas(entradas);
  renderRows(despesas);
  renderCategorias(despesas);
}

// ===============================
// EVENTOS
// ===============================
if (btnCarregar) {
  btnCarregar.addEventListener("click", async () => {
    MES = (mesRef && mesRef.value) ? mesRef.value : mesAtualYYYYMM();
    showToast(`Carregado: ${MES}`);
    await refresh();
  });
}

// ENTRADAS: salvar / atualizar
if (btnSalvarEntrada) {
  btnSalvarEntrada.addEventListener("click", async () => {
    const payload = {
      data: entData ? entData.value : "",
      tipo: entTipo ? entTipo.value : "salario",
      descricao: (entDesc?.value || "").trim(),
      valor: num(entValor?.value),
    };

    if (!payload.data || !payload.tipo || !payload.descricao || payload.valor <= 0) {
      showToast("Preencha data, tipo, descrição e valor > 0.");
      return;
    }

    try {
      if (entradaEditId) {
        await updateEntrada(entradaEditId, payload);
        showToast("Entrada atualizada.");
      } else {
        await insertEntrada(payload);
        showToast("Entrada salva.");
      }
      resetEntradaForm();
      await refresh();
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar entrada.");
    }
  });
}

if (btnCancelarEdicaoEntrada) {
  btnCancelarEdicaoEntrada.addEventListener("click", () => resetEntradaForm());
}

// DESPESAS: salvar / atualizar
if (btnSalvarDespesa) {
  btnSalvarDespesa.addEventListener("click", async () => {
    const payload = {
      data: data ? data.value : "",
      categoria: (categoria?.value || "").trim(),
      descricao: (descricao?.value || "").trim(),
      valor: num(valor?.value),
    };

    if (!payload.data || !payload.categoria || !payload.descricao || payload.valor <= 0) {
      showToast("Preencha data, categoria, descrição e valor > 0.");
      return;
    }

    try {
      const id = (despId && despId.value) ? Number(despId.value) : null;
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
}

if (btnCancelarEdicao) {
  btnCancelarEdicao.addEventListener("click", () => cancelEdit());
}

// filtros
if (btnAplicarFiltros) {
  btnAplicarFiltros.addEventListener("click", async () => {
    await refresh();
    showToast("Filtros aplicados.");
  });
}

if (btnLimparFiltros) {
  btnLimparFiltros.addEventListener("click", async () => {
    if (fDe) fDe.value = "";
    if (fAte) fAte.value = "";
    if (fCat) fCat.value = "";
    if (fBusca) fBusca.value = "";
    if (fMin) fMin.value = "";
    if (fMax) fMax.value = "";
    await refresh();
    showToast("Filtros limpos.");
  });
}

// CSV
if (btnExportCSV) {
  btnExportCSV.addEventListener("click", async () => {
    const rows = await fetchDespesas();
    downloadCSV(`despesas_${MES}.csv`, rows);
    showToast("CSV gerado.");
  });
}

// Print / PDF
if (btnPrint) {
  btnPrint.addEventListener("click", () => window.print());
}

// ===============================
// INIT
// ===============================
(function init() {
  MES = mesAtualYYYYMM();
  if (mesRef) mesRef.value = MES;

  if (data) data.value = hojeISO();
  if (entData) entData.value = hojeISO();

  refresh();
})();
