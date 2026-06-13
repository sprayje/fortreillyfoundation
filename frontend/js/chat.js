// Change this to your deployed backend URL, for example:
// const API_BASE = "https://fort-reilly-chat.onrender.com";
const API_BASE = "http://localhost:4000";

const token = localStorage.getItem("frfToken");
const user = JSON.parse(localStorage.getItem("frfUser") || "null");

if (!token || !user) window.location.href = "index.html";

const roomList = document.getElementById("roomList");
const messages = document.getElementById("messages");
const roomName = document.getElementById("roomName");
const roomTopic = document.getElementById("roomTopic");
const roomStatus = document.getElementById("roomStatus");
const onlineList = document.getElementById("onlineList");
const typingNotice = document.getElementById("typingNotice");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const gifInput = document.getElementById("gifInput");
const fileInput = document.getElementById("fileInput");
const emojiBtn = document.getElementById("emojiBtn");
const dmForm = document.getElementById("dmForm");
const dmUser = document.getElementById("dmUser");
const dmBody = document.getElementById("dmBody");
const dmList = document.getElementById("dmList");
const adminLink = document.getElementById("adminLink");
let activeRoom = null;
let typingTimer = null;

if (["admin", "moderator"].includes(user.role)) adminLink.classList.remove("hidden");

const socket = io(API_BASE, {
  auth: { token }
});

document.getElementById("logoutBtn").addEventListener("click", logout);

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function logout() {
  localStorage.removeItem("frfToken");
  localStorage.removeItem("frfUser");
  window.location.href = "index.html";
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderMessage(message) {
  const row = document.createElement("article");
  row.className = `message ${message.deleted ? "deleted" : ""}`;
  const author = message.user ? message.user.name : "Unknown";
  const body = message.deleted ? "<em>Message deleted</em>" : escapeHTML(message.body);
  const attachment = message.attachment
    ? `<a class="attachment" href="${API_BASE}${message.attachment.url}" target="_blank" rel="noopener">${escapeHTML(message.attachment.originalName)}</a>`
    : "";
  const gif = message.gifUrl
    ? `<img class="gif-preview" src="${escapeHTML(message.gifUrl)}" alt="Posted GIF">`
    : "";

  row.innerHTML = `
    <header><strong>${escapeHTML(author)}</strong><span>${formatTime(message.createdAt)}</span></header>
    <p>${body}</p>
    ${attachment}
    ${gif}
  `;
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

async function loadRooms() {
  const data = await api("/api/rooms");
  roomList.innerHTML = "";
  data.rooms.forEach((room) => {
    const button = document.createElement("button");
    button.className = "room-button";
    button.type = "button";
    button.innerHTML = `<strong>${escapeHTML(room.name)}</strong><span>${escapeHTML(room.topic || room.description || "")}</span>`;
    button.addEventListener("click", () => selectRoom(room));
    roomList.appendChild(button);
  });

  if (data.rooms[0]) selectRoom(data.rooms[0]);
}

async function selectRoom(room) {
  activeRoom = room;
  roomName.textContent = room.name;
  roomTopic.textContent = room.description || room.topic || "";
  roomStatus.textContent = `${room.isPrivate ? "Private" : "Public"}${room.locked ? " / Locked" : ""}`;
  messages.innerHTML = "";
  typingNotice.textContent = "";
  socket.emit("room:join", { roomId: room.id });

  const data = await api(`/api/rooms/${room.id}/messages`);
  data.messages.forEach(renderMessage);
}

messageInput.addEventListener("input", () => {
  if (!activeRoom) return;
  socket.emit("typing:start", { roomId: activeRoom.id });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit("typing:stop", { roomId: activeRoom.id }), 900);
});

emojiBtn.addEventListener("click", () => {
  messageInput.value += " ";
  messageInput.focus();
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeRoom) return;
  let attachment = null;

  if (fileInput.files[0]) {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    const uploaded = await api("/api/uploads", {
      method: "POST",
      body: formData
    });
    attachment = uploaded.attachment;
  }

  socket.emit("message:send", {
    roomId: activeRoom.id,
    body: messageInput.value,
    gifUrl: gifInput.value,
    attachment
  });

  messageInput.value = "";
  gifInput.value = "";
  fileInput.value = "";
  socket.emit("typing:stop", { roomId: activeRoom.id });
});

dmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!dmUser.value || !dmBody.value.trim()) return;
  socket.emit("dm:send", { toUserId: dmUser.value, body: dmBody.value });
  dmBody.value = "";
});

socket.on("message:new", renderMessage);

socket.on("presence:update", (users) => {
  onlineList.innerHTML = "";
  dmUser.innerHTML = '<option value="">Choose online user</option>';
  users.forEach((onlineUser) => {
    const row = document.createElement("div");
    row.className = "user-row";
    row.textContent = `${onlineUser.name} (${onlineUser.role})`;
    onlineList.appendChild(row);

    if (onlineUser.id !== user.id) {
      const option = document.createElement("option");
      option.value = onlineUser.id;
      option.textContent = onlineUser.name;
      dmUser.appendChild(option);
    }
  });
});

socket.on("typing:update", ({ user: typingUser, typing }) => {
  typingNotice.textContent = typing ? `${typingUser.name} is typing...` : "";
});

socket.on("dm:new", (message) => {
  const row = document.createElement("div");
  row.className = "dm-message";
  row.innerHTML = `<strong>${escapeHTML(message.from.name)} to ${escapeHTML(message.to.name)}</strong><p>${escapeHTML(message.body)}</p>`;
  dmList.prepend(row);
});

socket.on("error:message", (message) => {
  alert(message);
});

socket.on("connect_error", (error) => {
  alert(error.message);
});

loadRooms().catch((error) => alert(error.message));
