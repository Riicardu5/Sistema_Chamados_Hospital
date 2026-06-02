const AUTH_KEY = "hospital-ti-auth";
const REFRESH_INTERVAL_MS = 15000;

const form = document.querySelector("#ticket-form");
const formMessage = document.querySelector("#form-message");
const loginSection = document.querySelector("#login-section");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const registerForm = document.querySelector("#register-form");
const registerMessage = document.querySelector("#register-message");
const showRegisterButton = document.querySelector("#show-register");
const showLoginButton = document.querySelector("#show-login");
const showForgotButton = document.querySelector("#show-forgot");
const forgotForm = document.querySelector("#forgot-form");
const forgotMessage = document.querySelector("#forgot-message");
const forgotBackLoginButton = document.querySelector("#forgot-back-login");
const forcePasswordSection = document.querySelector("#force-password-section");
const forcePasswordForm = document.querySelector("#force-password-form");
const forcePasswordMessage = document.querySelector("#force-password-message");
const profileForm = document.querySelector("#profile-form");
const profileMessage = document.querySelector("#profile-message");
const profileToggle = document.querySelector("#profile-toggle");
const profilePanel = document.querySelector("#profile-panel");
const createUserForm = document.querySelector("#create-user-form");
const createUserMessage = document.querySelector("#create-user-message");
const appArea = document.querySelector(".app-area");
const currentUserLabel = document.querySelector("#current-user");
const logoutButton = document.querySelector("#logout-button");
const openList = document.querySelector("#open-list");
const doneList = document.querySelector("#done-list");
const myTicketList = document.querySelector("#my-ticket-list");
const template = document.querySelector("#ticket-template");
const dateFilter = document.querySelector("#date-filter");
const todayFilter = document.querySelector("#today-filter");
const clearFilter = document.querySelector("#clear-filter");
const ticketSearch = document.querySelector("#ticket-search");
const userSearch = document.querySelector("#user-search");
const openCount = document.querySelector("#open-count");
const doneCount = document.querySelector("#done-count");
const urgentCount = document.querySelector("#urgent-count");
const doneFilterLabel = document.querySelector("#done-filter-label");
const userList = document.querySelector("#user-list");
const resetRequestList = document.querySelector("#reset-request-list");
const resetBadge = document.querySelector("#reset-badge");
const panelToggles = document.querySelectorAll(".panel-toggle");
const employeeTotal = document.querySelector("#employee-total");
const employeeTypePie = document.querySelector("#employee-type-pie");
const employeeTypeList = document.querySelector("#employee-type-list");
const employeeUserPie = document.querySelector("#employee-user-pie");
const employeeUserList = document.querySelector("#employee-user-list");
const tiTotal = document.querySelector("#ti-total");
const tiPersonPie = document.querySelector("#ti-person-pie");
const tiPersonList = document.querySelector("#ti-person-list");
const tiPersonTypeList = document.querySelector("#ti-person-type-list");
const tiStatusPie = document.querySelector("#ti-status-pie");
const tiStatusList = document.querySelector("#ti-status-list");

const STATUS_LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  no_immediate_solution: "Sem resolucao imediata",
  waiting_responsible: "Aberto para responsaveis",
  done: "Concluido",
};

const STATUS_ACTIONS = [
  { status: "open", label: "Aberto" },
  { status: "in_progress", label: "Em andamento" },
  { status: "no_immediate_solution", label: "Sem resolucao imediata" },
  { status: "waiting_responsible", label: "Responsaveis" },
  { status: "done", label: "Concluir" },
];

const CHART_COLORS = ["#146c94", "#198754", "#b7791f", "#7654a6", "#c24135", "#375a9e", "#0f526f"];

let tickets = [];
let users = [];
let resetRequests = [];
let auth = loadAuth();

profileToggle?.addEventListener("click", () => {
  profilePanel?.classList.toggle("hidden");
});

panelToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`#${button.dataset.panelTarget}`);
    target?.classList.toggle("hidden");
    button.classList.toggle("active", target && !target.classList.contains("hidden"));
  });
});

showRegisterButton?.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  forgotForm?.classList.add("hidden");
  loginMessage.textContent = "";
});

showLoginButton?.addEventListener("click", () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  registerMessage.textContent = "";
});

showForgotButton?.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm?.classList.add("hidden");
  forgotForm.classList.remove("hidden");
  loginMessage.textContent = "";
});

forgotBackLoginButton?.addEventListener("click", () => {
  forgotForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  forgotMessage.textContent = "";
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: data.get("username"),
        password: data.get("password"),
      }),
    });

    if (!response.ok) throw new Error("Login invalido");
    auth = await response.json();
    saveAuth();
    loginForm.reset();
    if (auth.user.mustChangePassword) {
      showForcePassword();
      return;
    }
    await startApp();
  } catch {
    loginMessage.textContent = "Usuario ou senha invalidos.";
  }
});

forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(forgotForm);

  try {
    const response = await fetch("/api/password-reset-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: data.get("username") }),
    });

    if (!response.ok) throw new Error("Nao foi possivel enviar o pedido.");
    forgotForm.reset();
    forgotMessage.textContent = "Pedido enviado. Aguarde o TI liberar uma senha padrao.";
  } catch (error) {
    forgotMessage.textContent = error.message || "Nao foi possivel enviar o pedido.";
  }
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(registerForm);

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        username: data.get("username"),
        password: data.get("password"),
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    registerForm.reset();
    registerMessage.textContent = "Conta criada. Agora entre com seu usuario e senha.";
  } catch (error) {
    registerMessage.textContent = error.message || "Nao foi possivel criar a conta.";
  }
});

logoutButton?.addEventListener("click", () => {
  localStorage.removeItem(AUTH_KEY);
  auth = null;
  tickets = [];
  showLogin();
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(profileForm);

  try {
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    auth.user = result;
    saveAuth();
    fillProfile();
    updateCurrentUserLabel();
    profileMessage.textContent = "Dados atualizados.";
    setTimeout(() => {
      profileMessage.textContent = "";
    }, 4000);
  } catch (error) {
    profileMessage.textContent = error.message || "Nao foi possivel salvar.";
  }
});

forcePasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(forcePasswordForm);

  try {
    const response = await fetch("/api/me/password", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ newPassword: data.get("newPassword") }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    auth.user = result;
    saveAuth();
    forcePasswordForm.reset();
    forcePasswordSection?.classList.add("hidden");
    await startApp();
  } catch (error) {
    forcePasswordMessage.textContent = error.message || "Nao foi possivel salvar a senha.";
  }
});

createUserForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(createUserForm);

  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        username: data.get("username"),
        password: data.get("password"),
        role: data.get("role"),
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    users = result;
    createUserForm.reset();
    createUserForm.elements.password.value = "Hospital@123";
    createUserMessage.textContent = "Usuario criado. Ele deve trocar a senha no primeiro login.";
    renderUsers();
  } catch (error) {
    createUserMessage.textContent = error.message || "Nao foi possivel criar usuario.";
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);

  try {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        department: data.get("department"),
        priority: data.get("priority"),
        category: data.get("category"),
        description: data.get("description"),
      }),
    });

    if (!response.ok) throw new Error("Erro ao salvar chamado");
    const ticket = await response.json();
    form.reset();
    formMessage.textContent = `Chamado ${ticket.ticketNumber} enviado com sucesso.`;
    setTimeout(() => {
      formMessage.textContent = "";
    }, 5000);
    await loadMyTickets();
  } catch {
    formMessage.textContent = "Nao foi possivel enviar. Confira o login e tente novamente.";
  }
});

dateFilter?.addEventListener("change", renderDashboard);
ticketSearch?.addEventListener("input", renderDashboard);
userSearch?.addEventListener("input", renderUsers);

todayFilter?.addEventListener("click", () => {
  dateFilter.value = formatDateInput(new Date());
  renderDashboard();
});

clearFilter?.addEventListener("click", () => {
  dateFilter.value = "";
  renderDashboard();
});

function loadAuth() {
  const saved = localStorage.getItem(AUTH_KEY);
  return saved ? JSON.parse(saved) : null;
}

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  };
}

async function init() {
  if (!location.protocol.startsWith("http")) {
    showLogin("Abra pelo servidor: http://localhost:8765/index.html");
    return;
  }

  if (!auth?.token) {
    showLogin();
    return;
  }

  try {
    const response = await fetch("/api/me", { headers: authHeaders() });
    if (!response.ok) throw new Error("Sessao expirada");
    auth.user = await response.json();
    saveAuth();
    if (auth.user.mustChangePassword) {
      showForcePassword();
      return;
    }
    await startApp();
  } catch {
    localStorage.removeItem(AUTH_KEY);
    auth = null;
    showLogin("Entre novamente.");
  }
}

async function startApp() {
  loginSection?.classList.add("hidden");
  forcePasswordSection?.classList.add("hidden");
  appArea?.classList.remove("hidden");
  updateCurrentUserLabel();
  fillProfile();

  if (openList || doneList) {
    if (auth.user.role !== "ti") {
      appArea.innerHTML = `<section class="auth-card"><h2>Acesso restrito</h2><p>Este painel e somente para usuarios do TI.</p></section>`;
      return;
    }
    await loadDashboard();
    await loadUsers();
    await loadResetRequests();
    setInterval(loadDashboard, REFRESH_INTERVAL_MS);
    setInterval(loadResetRequests, REFRESH_INTERVAL_MS);
    setInterval(loadUsers, REFRESH_INTERVAL_MS * 4);
  }

  if (myTicketList) {
    await loadMyTickets();
    setInterval(loadMyTickets, REFRESH_INTERVAL_MS);
  }
}

function updateCurrentUserLabel() {
  if (!currentUserLabel || !auth?.user) return;
  const role = auth.user.role === "ti" ? "TI" : "Usuario";
  currentUserLabel.textContent = `${auth.user.name} (${role})`;
}

function fillProfile() {
  if (!profileForm || !auth?.user) return;
  profileForm.elements.name.value = auth.user.name || "";
  profileForm.elements.email.value = auth.user.email || "";
  profileForm.elements.phone.value = auth.user.phone || "";
}

function showLogin(message = "") {
  loginSection?.classList.remove("hidden");
  forcePasswordSection?.classList.add("hidden");
  appArea?.classList.add("hidden");
  if (loginMessage) loginMessage.textContent = message;
}

function showForcePassword() {
  loginSection?.classList.add("hidden");
  appArea?.classList.add("hidden");
  forcePasswordSection?.classList.remove("hidden");
  if (forcePasswordMessage) forcePasswordMessage.textContent = "";
}

async function loadDashboard() {
  const response = await fetch("/api/tickets", { headers: authHeaders() });
  if (!response.ok) return;
  tickets = await response.json();
  renderDashboard();
  renderAnalytics();
}

async function loadMyTickets() {
  const response = await fetch("/api/my-tickets", { headers: authHeaders() });
  if (!response.ok) return;
  tickets = await response.json();
  renderMyTickets();
}

async function loadUsers() {
  if (!userList) return;
  const response = await fetch("/api/users", { headers: authHeaders() });
  if (!response.ok) return;
  users = await response.json();
  renderUsers();
}

async function loadResetRequests() {
  if (!resetRequestList) return;
  const response = await fetch("/api/password-reset-requests", { headers: authHeaders() });
  if (!response.ok) return;
  resetRequests = await response.json();
  renderResetRequests();
}

function renderDashboard() {
  if (!openList || !doneList) return;

  const search = ticketSearch?.value.trim().toLowerCase() || "";
  const searchedTickets = tickets.filter((ticket) => {
    if (!search) return true;
    return [
      ticket.ticketNumber,
      ticket.requester,
      ticket.requesterEmail,
      ticket.requesterPhone,
      ticket.openedBy?.username,
      ticket.openedBy?.email,
      ticket.openedBy?.phone,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });

  const openTickets = searchedTickets
    .filter((ticket) => ticket.status === "open")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const filteredDoneTickets = searchedTickets
    .filter((ticket) => ticket.status !== "open")
    .filter((ticket) => {
      if (search) return true;
      if (!dateFilter.value) return true;
      return formatDateInput(new Date(ticket.completedAt || ticket.statusUpdatedAt || ticket.createdAt)) === dateFilter.value;
    })
    .sort((a, b) => new Date(b.completedAt || b.statusUpdatedAt || b.createdAt) - new Date(a.completedAt || a.statusUpdatedAt || a.createdAt));

  openCount.textContent = openTickets.length;
  doneCount.textContent = filteredDoneTickets.length;
  urgentCount.textContent = openTickets.filter((ticket) => ticket.priority === "Urgente").length;
  doneFilterLabel.textContent = dateFilter.value ? formatDateText(dateFilter.value) : "Todos";

  renderList(openList, openTickets, "Nenhum chamado aberto no momento.", true);
  renderList(doneList, filteredDoneTickets, "Nenhum chamado movimentado para este filtro.", true);
}

function renderAnalytics() {
  if (!employeeTotal) return;

  const totalTickets = tickets.length;
  const completedTickets = tickets.filter((ticket) => ticket.status === "done");
  const movedTickets = tickets.filter((ticket) => ticket.status !== "open");
  const typeCounts = countBy(tickets, (ticket) => ticket.category || "Outro");
  const requesterCounts = countBy(tickets, (ticket) => ticket.requester || ticket.openedBy?.username || "Sem nome");
  const tiCounts = countBy(movedTickets, getTicketResponsibleName);
  const movedStatusCounts = countBy(movedTickets, (ticket) => STATUS_LABELS[ticket.status] || ticket.status);

  employeeTotal.textContent = totalTickets;
  tiTotal.textContent = movedTickets.length;

  renderPie(employeeTypePie, typeCounts);
  renderRankList(employeeTypeList, typeCounts, totalTickets);
  renderPie(employeeUserPie, requesterCounts);
  renderRankList(employeeUserList, requesterCounts, totalTickets);
  renderPie(tiPersonPie, tiCounts);
  renderRankList(tiPersonList, tiCounts, movedTickets.length);
  renderTiPersonTypes(tiPersonTypeList, movedTickets);
  renderPie(tiStatusPie, movedStatusCounts);
  renderRankList(tiStatusList, movedStatusCounts, movedTickets.length);
}

function getTicketResponsibleName(ticket) {
  return ticket.completedBy?.name || ticket.statusUpdatedBy?.name || "Sem responsavel";
}

function countBy(list, getKey) {
  return list.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortedEntries(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderPie(container, counts) {
  if (!container) return;

  const entries = sortedEntries(counts);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (!total) {
    container.innerHTML = `<p class="empty-mini">Sem dados</p>`;
    return;
  }

  let cumulative = 0;
  const slices = entries.map(([label, value], index) => {
    const start = cumulative / total;
    cumulative += value;
    const end = cumulative / total;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    return `<path d="${describeArc(50, 50, 42, start, end)}" fill="${color}"><title>${escapeHtml(label)}: ${value}</title></path>`;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 100 100" role="img" aria-label="Grafico pizza">
      ${slices}
      <circle cx="50" cy="50" r="20" fill="white"></circle>
      <text x="50" y="54" text-anchor="middle">${total}</text>
    </svg>
  `;
}

function describeArc(cx, cy, radius, startRatio, endRatio) {
  const start = polarToCartesian(cx, cy, radius, endRatio * 360);
  const end = polarToCartesian(cx, cy, radius, startRatio * 360);
  const largeArcFlag = endRatio - startRatio <= 0.5 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx, cy, radius, angleDegrees) {
  const angleRadians = (angleDegrees - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

function renderRankList(container, counts, total) {
  if (!container) return;

  const entries = sortedEntries(counts);
  if (!entries.length) {
    container.innerHTML = `<p class="empty-mini">Sem dados</p>`;
    return;
  }

  container.innerHTML = entries.slice(0, 8).map(([label, value], index) => {
    const percent = total ? Math.round((value / total) * 100) : 0;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    return `
      <div class="rank-row">
        <span class="dot" style="background:${color}"></span>
        <strong>${escapeHtml(label)}</strong>
        <span>${value} (${percent}%)</span>
      </div>
    `;
  }).join("");
}

function renderTiPersonTypes(container, movedTickets) {
  if (!container) return;

  const grouped = movedTickets.reduce((acc, ticket) => {
    const person = getTicketResponsibleName(ticket);
    const type = ticket.category || "Outro";
    const status = STATUS_LABELS[ticket.status] || ticket.status;
    acc[person] ||= { types: {}, statuses: {} };
    acc[person].types[type] = (acc[person].types[type] || 0) + 1;
    acc[person].statuses[status] = (acc[person].statuses[status] || 0) + 1;
    return acc;
  }, {});

  const people = sortedEntries(countBy(movedTickets, getTicketResponsibleName));
  if (!people.length) {
    container.innerHTML = `<p class="empty-mini">Sem dados</p>`;
    return;
  }

  container.innerHTML = people.map(([person, total]) => {
    const types = sortedEntries(grouped[person].types)
      .map(([type, value]) => `<span>${escapeHtml(type)}: ${value}</span>`)
      .join("");
    const statuses = sortedEntries(grouped[person].statuses)
      .map(([status, value]) => `<span>${escapeHtml(status)}: ${value}</span>`)
      .join("");

    return `
      <div class="person-type-row">
        <strong>${escapeHtml(person)} <em>${total} atendidos</em></strong>
        <p>Status desses atendimentos</p>
        <div>${statuses}</div>
        <p>Tipos desses atendimentos</p>
        <div>${types}</div>
      </div>
    `;
  }).join("");
}

function renderUsers() {
  userList.innerHTML = "";

  const search = userSearch?.value.trim().toLowerCase() || "";
  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    return [
      user.name,
      user.username,
      user.email,
      user.phone,
      user.role,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });

  if (!filteredUsers.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum usuario encontrado.";
    userList.append(empty);
    return;
  }

  filteredUsers.forEach((user) => {
    const card = document.createElement("article");
    card.className = "user-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(user.name)} (${escapeHtml(user.role)})</strong>
        <p>usuario: ${escapeHtml(user.username)} | email: ${escapeHtml(user.email || "-")} | celular: ${escapeHtml(user.phone || "-")}</p>
        <p>${user.mustChangePassword ? "Precisa trocar a senha no proximo login." : "Senha definitiva definida."}</p>
      </div>
      <button class="danger-button" type="button">Deletar usuario</button>
    `;

    card.querySelector("button").addEventListener("click", async () => {
      if (user.id === auth.user.id) {
        alert("Voce nao pode deletar o proprio usuario logado.");
        return;
      }

      const confirmed = confirm(`Deletar o usuario ${user.name}? Essa acao nao apaga chamados antigos, mas remove o acesso dele.`);
      if (!confirmed) return;

      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result.error || "Nao foi possivel deletar o usuario.");
        return;
      }

      users = result;
      renderUsers();
      await loadResetRequests();
    });

    userList.append(card);
  });
}

function renderResetRequests() {
  updateResetBadge();
  resetRequestList.innerHTML = "";

  if (!resetRequests.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum pedido de nova senha no momento.";
    resetRequestList.append(empty);
    return;
  }

  resetRequests.forEach((request) => {
    const card = document.createElement("article");
    card.className = "user-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(request.name)}</strong>
        <p>usuario: ${escapeHtml(request.username)} | email: ${escapeHtml(request.email || "-")} | celular: ${escapeHtml(request.phone || "-")}</p>
        <p>pedido em ${formatDateTime(request.createdAt)}</p>
      </div>
      <button class="reset-direct-button" type="button">Liberar senha padrao</button>
    `;

    card.querySelector("button").addEventListener("click", async () => {
      const response = await fetch(`/api/password-reset-requests/${request.id}/resolve`, {
        method: "PATCH",
        headers: authHeaders(),
      });

      if (!response.ok) return;
      const result = await response.json();
      resetRequests = result.requests;
      users = result.users;
      renderResetRequests();
      renderUsers();
      alert(`Senha padrao liberada: ${result.defaultPassword}`);
    });

    resetRequestList.append(card);
  });
}

function updateResetBadge() {
  if (!resetBadge) return;

  resetBadge.textContent = resetRequests.length;
  resetBadge.classList.toggle("hidden", resetRequests.length === 0);
}

function renderMyTickets() {
  if (!myTicketList) return;
  const sorted = [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  renderList(myTicketList, sorted, "Voce ainda nao abriu nenhum chamado.", false);
}

function renderList(container, list, emptyMessage, showActions) {
  container.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }

  list.forEach((ticket) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.classList.toggle("done", ticket.status === "done");
    card.querySelector(".ticket-title").textContent = `#${ticket.ticketNumber} - ${ticket.category} - ${ticket.department}`;
    card.querySelector(".ticket-meta").textContent = buildMeta(ticket);
    card.querySelector(".ticket-description").textContent = ticket.description;
    const contact = document.createElement("div");
    contact.className = "contact-lines";
    contact.innerHTML = `
      <span>Email: ${escapeHtml(ticket.requesterEmail || ticket.openedBy?.email || "-")}</span>
      <span>Celular: ${escapeHtml(ticket.requesterPhone || ticket.openedBy?.phone || "-")}</span>
    `;
    card.querySelector(".ticket-description").after(contact);

    const priority = card.querySelector(".priority");
    priority.textContent = ticket.priority;
    priority.classList.toggle("alta", ticket.priority === "Alta");
    priority.classList.toggle("urgente", ticket.priority === "Urgente");

    const statusBadge = card.querySelector(".status-badge");
    statusBadge.textContent = STATUS_LABELS[ticket.status] || "Aberto";
    statusBadge.dataset.status = ticket.status;

    const time = card.querySelector(".ticket-time");
    time.textContent = buildTicketTime(ticket);

    const actions = card.querySelector(".ticket-actions");
    if (showActions) {
      renderActions(actions, ticket);
    } else {
      actions.remove();
    }

    container.append(card);
  });
}

function buildTicketTime(ticket) {
  if (ticket.status === "open") {
    return `Aberto ha ${timeSince(ticket.createdAt)}`;
  }

  if (ticket.status === "done") {
    return `Concluido em ${formatDateTime(ticket.completedAt)}`;
  }

  return `Movimentado em ${formatDateTime(ticket.statusUpdatedAt || ticket.createdAt)} | aberto ha ${timeSince(ticket.createdAt)}`;
}

function buildMeta(ticket) {
  const parts = [
    `${ticket.requester} | Aberto em ${formatDateTime(ticket.createdAt)}`,
  ];

  if (ticket.openedBy?.username) {
    parts.push(`usuario: ${ticket.openedBy.username}`);
  }

  if (ticket.completedBy?.name) {
    parts.push(`concluido por: ${ticket.completedBy.name}`);
  }

  return parts.join(" | ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderActions(container, ticket) {
  container.innerHTML = "";

  const actions = ticket.status === "done"
    ? [{ status: "open", label: "Reabrir" }]
    : STATUS_ACTIONS.filter((action) => action.status !== ticket.status);

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-button";
    button.dataset.status = action.status;
    button.textContent = action.label;
    button.addEventListener("click", () => updateTicketStatus(ticket.id, action.status));
    container.append(button);
  });
}

async function updateTicketStatus(id, status) {
  const response = await fetch(`/api/tickets/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) return;
  tickets = await response.json();
  renderDashboard();
  renderAnalytics();
}

function timeSince(dateText) {
  const diffMs = Date.now() - new Date(dateText).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function formatDateTime(dateText) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateText));
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateText(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

init();
