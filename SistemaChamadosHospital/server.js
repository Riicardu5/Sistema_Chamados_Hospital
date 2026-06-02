const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 8765;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RESET_REQUESTS_FILE = path.join(DATA_DIR, "reset-requests.json");
const DEFAULT_RESET_PASSWORD = "Hospital@123";

const sessions = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const VALID_STATUSES = new Set([
  "open",
  "in_progress",
  "no_immediate_solution",
  "waiting_responsible",
  "done",
]);

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, "[]", "utf8");
  if (!fs.existsSync(RESET_REQUESTS_FILE)) fs.writeFileSync(RESET_REQUESTS_FILE, "[]", "utf8");
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers(), null, 2), "utf8");
  }
}

function seedUsers() {
  return [
    {
      id: "u-funcionario",
      username: "funcionario",
      password: "1234",
      name: "Usuario Teste",
      email: "funcionario@hospital.local",
      phone: "(00) 00000-0000",
      role: "user",
      mustChangePassword: false,
    },
    {
      id: "u-ti",
      username: "ti",
      password: "1234",
      name: "Equipe TI",
      email: "ti@hospital.local",
      phone: "(00) 00000-0000",
      role: "ti",
      mustChangePassword: false,
    },
  ];
}

function readJson(file) {
  ensureDataFiles();
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  ensureDataFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readTickets() {
  return readJson(TICKETS_FILE);
}

function writeTickets(tickets) {
  writeJson(TICKETS_FILE, tickets);
}

function readUsers() {
  return readJson(USERS_FILE);
}

function readResetRequests() {
  return readJson(RESET_REQUESTS_FILE);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Corpo muito grande"));
      }
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function getSessionUser(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = sessions.get(token);
  if (!session) return null;

  const user = readUsers().find((item) => item.id === session.userId);
  return user || null;
}

function requireAuth(request, response) {
  const user = getSessionUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Login necessario" });
    return null;
  }
  return user;
}

function requireTi(request, response) {
  const user = requireAuth(request, response);
  if (!user) return null;
  if (user.role !== "ti") {
    sendJson(response, 403, { error: "Acesso permitido somente para TI" });
    return null;
  }
  return user;
}

function nextTicketNumber(tickets) {
  const max = tickets.reduce((highest, ticket) => {
    const number = Number(ticket.ticketNumber || 0);
    return Number.isFinite(number) && number > highest ? number : highest;
  }, 1000);
  return String(max + 1);
}

async function handleApi(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/password-reset-requests") {
    const body = await readBody(request);
    const username = String(body.username || "").trim().toLowerCase();
    const users = readUsers();
    const user = users.find((item) => item.username.toLowerCase() === username);

    if (!username) {
      sendJson(response, 400, { error: "Informe o usuario" });
      return;
    }

    if (user) {
      const requests = readResetRequests();
      const alreadyPending = requests.some((item) => item.userId === user.id && item.status === "pending");
      if (!alreadyPending) {
        requests.unshift({
          id: crypto.randomUUID(),
          userId: user.id,
          username: user.username,
          name: user.name,
          email: user.email || "",
          phone: user.phone || "",
          status: "pending",
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
        });
        writeJson(RESET_REQUESTS_FILE, requests);
      }
    }

    sendJson(response, 200, { message: "Se o usuario existir, o TI recebera o pedido." });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/register") {
    const body = await readBody(request);
    const users = readUsers();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = {
      id: crypto.randomUUID(),
      username,
      password,
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      role: "user",
      mustChangePassword: false,
    };

    if (!user.username || !user.password || !user.name || !user.email || !user.phone) {
      sendJson(response, 400, { error: "Preencha todos os dados obrigatorios" });
      return;
    }

    if (users.some((item) => item.username.toLowerCase() === user.username)) {
      sendJson(response, 409, { error: "Usuario ja existe" });
      return;
    }

    users.push(user);
    writeJson(USERS_FILE, users);
    sendJson(response, 201, publicUser(user));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(request);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = readUsers().find((item) => item.username.toLowerCase() === username && item.password === password);

    if (!user) {
      sendJson(response, 401, { error: "Usuario ou senha invalidos" });
      return;
    }

    const token = crypto.randomUUID();
    sessions.set(token, { userId: user.id, createdAt: new Date().toISOString() });
    sendJson(response, 200, { token, user: publicUser(user) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = requireAuth(request, response);
    if (!user) return;
    sendJson(response, 200, publicUser(user));
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/me") {
    const user = requireAuth(request, response);
    if (!user) return;

    const body = await readBody(request);
    const users = readUsers();
    const currentUser = users.find((item) => item.id === user.id);

    const updatedUsers = users.map((item) => {
      if (item.id !== user.id) return item;
      const updated = {
        ...item,
        name: String(body.name || item.name).trim(),
        email: String(body.email || item.email || "").trim(),
        phone: String(body.phone || item.phone || "").trim(),
      };

      return updated;
    });

    writeJson(USERS_FILE, updatedUsers);
    const updatedUser = updatedUsers.find((item) => item.id === user.id);
    sendJson(response, 200, publicUser(updatedUser));
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/me/password") {
    const user = requireAuth(request, response);
    if (!user) return;

    const body = await readBody(request);
    const newPassword = String(body.newPassword || "").trim();
    if (!newPassword) {
      sendJson(response, 400, { error: "Informe a nova senha" });
      return;
    }

    const users = readUsers().map((item) => {
      if (item.id !== user.id) return item;
      return {
        ...item,
        password: newPassword,
        mustChangePassword: false,
      };
    });

    writeJson(USERS_FILE, users);
    const updatedUser = users.find((item) => item.id === user.id);
    sendJson(response, 200, publicUser(updatedUser));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/users") {
    if (!requireTi(request, response)) return;
    sendJson(response, 200, readUsers().map(publicUser));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/users") {
    if (!requireTi(request, response)) return;
    const body = await readBody(request);
    const users = readUsers();
    const role = String(body.role || "user");
    const username = String(body.username || "").trim().toLowerCase();
    const user = {
      id: crypto.randomUUID(),
      username,
      password: String(body.password || DEFAULT_RESET_PASSWORD),
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      role: role === "ti" ? "ti" : "user",
      mustChangePassword: true,
    };

    if (!user.username || !user.password || !user.name || !user.email || !user.phone) {
      sendJson(response, 400, { error: "Preencha todos os dados obrigatorios" });
      return;
    }

    if (users.some((item) => item.username.toLowerCase() === user.username)) {
      sendJson(response, 409, { error: "Usuario ja existe" });
      return;
    }

    users.push(user);
    writeJson(USERS_FILE, users);
    sendJson(response, 201, users.map(publicUser));
    return;
  }

  const deleteUserMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (request.method === "DELETE" && deleteUserMatch) {
    const tiUser = requireTi(request, response);
    if (!tiUser) return;

    const userId = deleteUserMatch[1];
    const users = readUsers();
    const target = users.find((item) => item.id === userId);

    if (!target) {
      sendJson(response, 404, { error: "Usuario nao encontrado" });
      return;
    }

    if (target.id === tiUser.id) {
      sendJson(response, 400, { error: "Voce nao pode deletar o proprio usuario logado" });
      return;
    }

    const remainingTi = users.filter((item) => item.role === "ti" && item.id !== userId);
    if (target.role === "ti" && remainingTi.length === 0) {
      sendJson(response, 400, { error: "Nao e permitido apagar o ultimo usuario TI" });
      return;
    }

    const updatedUsers = users.filter((item) => item.id !== userId);
    const updatedRequests = readResetRequests().filter((item) => item.userId !== userId);
    writeJson(USERS_FILE, updatedUsers);
    writeJson(RESET_REQUESTS_FILE, updatedRequests);
    sendJson(response, 200, updatedUsers.map(publicUser));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/password-reset-requests") {
    if (!requireTi(request, response)) return;
    sendJson(response, 200, readResetRequests().filter((item) => item.status === "pending"));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/tickets") {
    if (!requireTi(request, response)) return;
    sendJson(response, 200, readTickets());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/my-tickets") {
    const user = requireAuth(request, response);
    if (!user) return;
    const tickets = readTickets().filter((ticket) => ticket.openedBy?.id === user.id);
    sendJson(response, 200, tickets);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/tickets") {
    const user = requireAuth(request, response);
    if (!user) return;

    const body = await readBody(request);
    const tickets = readTickets();
    const now = new Date().toISOString();
    const ticket = {
      id: crypto.randomUUID(),
      ticketNumber: nextTicketNumber(tickets),
      requester: user.name,
      requesterEmail: user.email || "",
      requesterPhone: user.phone || "",
      department: String(body.department || "").trim(),
      priority: String(body.priority || "Normal"),
      category: String(body.category || "Outro"),
      description: String(body.description || "").trim(),
      status: "open",
      openedBy: publicUser(user),
      completedBy: null,
      createdAt: now,
      statusUpdatedAt: now,
      completedAt: null,
    };

    if (!ticket.department || !ticket.description) {
      sendJson(response, 400, { error: "Dados obrigatorios ausentes" });
      return;
    }

    tickets.unshift(ticket);
    writeTickets(tickets);
    sendJson(response, 201, ticket);
    return;
  }

  const match = url.pathname.match(/^\/api\/tickets\/([^/]+)$/);
  if (request.method === "PATCH" && match) {
    const user = requireTi(request, response);
    if (!user) return;

    const body = await readBody(request);
    const status = String(body.status || "");
    if (!VALID_STATUSES.has(status)) {
      sendJson(response, 400, { error: "Status invalido" });
      return;
    }

    const now = new Date().toISOString();
    const tickets = readTickets().map((ticket) => {
      if (ticket.id !== match[1]) return ticket;
      return {
        ...ticket,
        status,
        statusUpdatedAt: now,
        statusUpdatedBy: publicUser(user),
        completedBy: status === "done" ? publicUser(user) : null,
        completedAt: status === "done" ? now : null,
      };
    });

    writeTickets(tickets);
    sendJson(response, 200, tickets);
    return;
  }

  const resetMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/password$/);
  if (request.method === "PATCH" && resetMatch) {
    if (!requireTi(request, response)) return;

    const users = readUsers().map((item) => {
      if (item.id !== resetMatch[1]) return item;
      return { ...item, password: DEFAULT_RESET_PASSWORD, mustChangePassword: true };
    });

    writeJson(USERS_FILE, users);
    sendJson(response, 200, users.map(publicUser));
    return;
  }

  const resolveResetMatch = url.pathname.match(/^\/api\/password-reset-requests\/([^/]+)\/resolve$/);
  if (request.method === "PATCH" && resolveResetMatch) {
    const tiUser = requireTi(request, response);
    if (!tiUser) return;

    const requests = readResetRequests();
    const requestItem = requests.find((item) => item.id === resolveResetMatch[1]);
    if (!requestItem) {
      sendJson(response, 404, { error: "Pedido nao encontrado" });
      return;
    }

    const users = readUsers().map((item) => {
      if (item.id !== requestItem.userId) return item;
      return { ...item, password: DEFAULT_RESET_PASSWORD, mustChangePassword: true };
    });

    const updatedRequests = requests.map((item) => {
      if (item.id !== requestItem.id) return item;
      return {
        ...item,
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolvedBy: publicUser(tiUser),
      };
    });

    writeJson(USERS_FILE, users);
    writeJson(RESET_REQUESTS_FILE, updatedRequests);
    sendJson(response, 200, {
      defaultPassword: DEFAULT_RESET_PASSWORD,
      requests: updatedRequests.filter((item) => item.status === "pending"),
      users: users.map(publicUser),
    });
    return;
  }

  sendJson(response, 404, { error: "API nao encontrada" });
}

function serveStatic(response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Acesso negado");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Arquivo nao encontrado");
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(response, decodeURIComponent(url.pathname));
  } catch (error) {
    sendJson(response, 500, { error: "Erro interno", detail: error.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  ensureDataFiles();
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log("Usuarios de teste: funcionario/1234 e ti/1234");
  console.log("Na rede local, use o IP deste computador seguido da porta 8765.");
});
