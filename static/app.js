// Interface web do Registo de Candidaturas.
// Toda a comunicacao com o servidor passa pela API que ja existe
// (as mesmas rotas que testaste com curl e no Thunder Client).

const form = document.getElementById("form-candidatura");
const formTitulo = document.getElementById("form-titulo");
const btnGuardar = document.getElementById("btn-guardar");
const btnCancelar = document.getElementById("btn-cancelar");
const mensagem = document.getElementById("mensagem");
const lista = document.getElementById("lista");
const vazio = document.getElementById("vazio");
const filtroEstado = document.getElementById("filtro-estado");
const estatisticasEl = document.getElementById("estatisticas");

// Guarda o id da candidatura que esta a ser editada.
// null = o formulario esta em modo "criar".
let idEmEdicao = null;


// ---------- Falar com a API ----------

// Funcao unica para todos os pedidos: envia JSON, recebe JSON,
// e transforma respostas de erro (400, 404) numa excecao com a
// mensagem que a API devolveu em {"erro": "..."}.
async function pedido(metodo, url, corpo) {
  const opcoes = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(url, opcoes);

  // 204 (DELETE) nao tem corpo, por isso nao ha JSON para ler
  if (resposta.status === 204) return null;

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro || `erro ${resposta.status}`);
  }
  return dados;
}


// ---------- Mostrar dados na pagina ----------

async function carregarCandidaturas() {
  const estado = filtroEstado.value;
  const url = estado
    ? `/candidaturas?estado=${encodeURIComponent(estado)}`
    : "/candidaturas";

  const candidaturas = await pedido("GET", url);

  lista.innerHTML = "";
  vazio.hidden = candidaturas.length > 0;

  for (const c of candidaturas) {
    lista.appendChild(criarLinha(c));
  }
}

// Cria uma linha <tr> da tabela para uma candidatura.
// Usa textContent (e nao innerHTML) para o texto vindo da base de dados:
// assim, se alguem escrever HTML nas notas, aparece como texto e nao e executado.
function criarLinha(c) {
  const tr = document.createElement("tr");

  for (const campo of ["empresa", "cargo", "data_candidatura"]) {
    const td = document.createElement("td");
    td.textContent = c[campo];
    tr.appendChild(td);
  }

  const tdEstado = document.createElement("td");
  const etiqueta = document.createElement("span");
  etiqueta.className = "etiqueta";
  etiqueta.dataset.estado = c.estado;
  etiqueta.textContent = c.estado;
  tdEstado.appendChild(etiqueta);
  tr.appendChild(tdEstado);

  const tdLink = document.createElement("td");
  if (c.link && /^https?:\/\//.test(c.link)) {
    const a = document.createElement("a");
    a.href = c.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "abrir";
    tdLink.appendChild(a);
  }
  tr.appendChild(tdLink);

  const tdNotas = document.createElement("td");
  tdNotas.className = "notas";
  tdNotas.textContent = c.notas || "";
  tr.appendChild(tdNotas);

  const tdAcoes = document.createElement("td");
  tdAcoes.className = "acoes-linha";

  const btnEditar = document.createElement("button");
  btnEditar.textContent = "Editar";
  btnEditar.className = "secundario";
  btnEditar.addEventListener("click", () => comecarEdicao(c));

  const btnApagar = document.createElement("button");
  btnApagar.textContent = "Apagar";
  btnApagar.className = "perigo";
  btnApagar.addEventListener("click", () => apagar(c));

  tdAcoes.append(btnEditar, btnApagar);
  tr.appendChild(tdAcoes);

  return tr;
}

async function carregarEstatisticas() {
  const stats = await pedido("GET", "/estatisticas");

  estatisticasEl.innerHTML = "";
  estatisticasEl.appendChild(criarCaixa("total", stats.total));
  for (const [estado, n] of Object.entries(stats.por_estado)) {
    estatisticasEl.appendChild(criarCaixa(estado, n));
  }
}

function criarCaixa(rotulo, numero) {
  const div = document.createElement("div");
  div.className = "stat";
  const num = document.createElement("strong");
  num.textContent = numero;
  const txt = document.createElement("span");
  txt.textContent = rotulo;
  div.append(num, txt);
  return div;
}

// Recarrega a lista e as estatisticas (depois de criar, editar ou apagar).
async function atualizarTudo() {
  try {
    await Promise.all([carregarCandidaturas(), carregarEstatisticas()]);
  } catch (erro) {
    mostrarMensagem(`Não foi possível carregar os dados: ${erro.message}`, "erro");
  }
}


// ---------- Criar e editar ----------

form.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // impede o browser de recarregar a pagina

  // Le os campos do formulario para um objeto { empresa: "...", ... }
  const dados = Object.fromEntries(new FormData(form));
  // Campos opcionais vazios vao como null, para ficarem NULL na base de dados
  for (const campo of ["link", "notas"]) {
    if (dados[campo] === "") dados[campo] = null;
  }

  try {
    if (idEmEdicao === null) {
      await pedido("POST", "/candidaturas", dados);
      mostrarMensagem("Candidatura adicionada.", "ok");
    } else {
      await pedido("PUT", `/candidaturas/${idEmEdicao}`, dados);
      mostrarMensagem("Alterações guardadas.", "ok");
    }
    sairDeEdicao();
    await atualizarTudo();
  } catch (erro) {
    // Aqui aparece, por exemplo, "campos em falta: empresa, cargo"
    mostrarMensagem(erro.message, "erro");
  }
});

function comecarEdicao(c) {
  idEmEdicao = c.id;
  for (const campo of ["empresa", "cargo", "data_candidatura", "link", "notas"]) {
    form.elements[campo].value = c[campo] || "";
  }
  garantirOpcaoEstado(c.estado);
  form.elements.estado.value = c.estado;

  formTitulo.textContent = `Editar: ${c.empresa}`;
  btnGuardar.textContent = "Guardar alterações";
  btnCancelar.hidden = false;
  mostrarMensagem("", "");
  form.scrollIntoView({ behavior: "smooth" });
}

function sairDeEdicao() {
  idEmEdicao = null;
  form.reset();
  formTitulo.textContent = "Nova candidatura";
  btnGuardar.textContent = "Adicionar";
  btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", () => {
  sairDeEdicao();
  mostrarMensagem("", "");
});

// A API aceita qualquer texto como estado. Se uma candidatura antiga tiver
// um estado que nao esta na lista, junta-o ao select para nao se perder.
function garantirOpcaoEstado(estado) {
  const select = form.elements.estado;
  const existe = [...select.options].some((o) => o.value === estado);
  if (!existe) {
    select.add(new Option(estado, estado));
  }
}


// ---------- Apagar ----------

async function apagar(c) {
  if (!confirm(`Apagar a candidatura a ${c.empresa} (${c.cargo})?`)) return;
  try {
    await pedido("DELETE", `/candidaturas/${c.id}`);
    if (idEmEdicao === c.id) sairDeEdicao();
    mostrarMensagem("Candidatura apagada.", "ok");
    await atualizarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}


// ---------- Utilitarios ----------

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
}

filtroEstado.addEventListener("change", atualizarTudo);

// Arranque: carrega tudo assim que a pagina abre
atualizarTudo();
