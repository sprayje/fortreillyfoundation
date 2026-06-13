// Change this to your deployed backend URL, for example:
// const API_BASE = "https://fort-reilly-chat.onrender.com";
const API_BASE = "http://localhost:4000";

const token = localStorage.getItem("frfToken");
const user = JSON.parse(localStorage.getItem("frfUser") || "null");

if (!token || !user || !["admin", "moderator"].includes(user.role)) {
  window.location.href = "chat.html";
}

const roomForm = document.getElementById("roomForm");
const adminRooms = document.getElementById("adminRooms");
const adminUsers = document.getElementById("adminUsers");
const adminMessages = document.getElementById("adminMessages");

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("frfToken");
  localStorage.removeItem("frfUser");
  window.location.href = "index.html";
});

document.getElementById("resetRoomForm").addEventListener("click", () => roomForm.reset());

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
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

async function loadAdmin() {
  const data = await api("/api/admin/overview");
  renderRooms(data.rooms);
  renderUsers(data.users);
  renderMessages(data.recentMessages);
}

function renderRooms(rooms) {
  adminRooms.innerHTML = "";
  rooms.forEach((room) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div><strong>${escapeHTML(room.name)}</strong><span>${escapeHTML(room.topic || room.description || "")}</span></div>
      <div class="row-actions">
        <button type="button" data-edit="${room._id}">Edit</button>
        <button type="button" data-delete="${room._id}">Delete</button>
      </div>
    `;
    row.querySelector("[data-edit]").addEventListener("click", () => {
      roomForm.roomId.value = room._id;
      roomForm.name.value = room.name;
      roomForm.slug.value = room.slug;
      roomForm.topic.value = room.topic || "";
      roomForm.description.value = room.description || "";
      roomForm.isPrivate.checked = room.isPrivate;
      roomForm.locked.checked = room.locked;
    });
    row.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm(`Delete ${room.name}?`)) return;
      await api(`/api/admin/rooms/${room._id}`, { method: "DELETE" });
      loadAdmin();
    });
    adminRooms.appendChild(row);
  });
}

function renderUsers(users) {
  adminUsers.innerHTML = "";
  users.forEach((member) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div><strong>${escapeHTML(member.name)}</strong><span>${escapeHTML(member.email)} / ${member.role}${member.banned ? " / banned" : ""}</span></div>
      <div class="row-actions">
        <select data-role="${member._id}">
          <option value="user">user</option>
          <option value="moderator">moderator</option>
          <option value="admin">admin</option>
        </select>
        <button type="button" data-ban="${member._id}">${member.banned ? "Unban" : "Ban"}</button>
      </div>
    `;
    row.querySelector("select").value = member.role;
    row.querySelector("select").addEventListener("change", async (event) => {
      await api(`/api/admin/users/${member._id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: event.target.value })
      });
      loadAdmin();
    });
    row.querySelector("[data-ban]").addEventListener("click", async () => {
      await api(`/api/admin/users/${member._id}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ banned: !member.banned, banReason: "Moderated by admin panel" })
      });
      loadAdmin();
    });
    adminUsers.appendChild(row);
  });
}

function renderMessages(recentMessages) {
  adminMessages.innerHTML = "";
  recentMessages.forEach((message) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div><strong>${escapeHTML(message.user ? message.user.name : "Unknown")}</strong><span>${escapeHTML(message.room ? message.room.name : "Room")} - ${escapeHTML(message.body || "[attachment/gif/deleted]")}</span></div>
      <button type="button" data-message="${message._id}">Delete</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      await api(`/api/admin/messages/${message._id}`, { method: "DELETE" });
      loadAdmin();
    });
    adminMessages.appendChild(row);
  });
}

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(roomForm).entries());
  const payload = {
    name: form.name,
    slug: form.slug,
    topic: form.topic,
    description: form.description,
    isPrivate: roomForm.isPrivate.checked,
    locked: roomForm.locked.checked
  };
  const roomId = roomForm.roomId.value;

  await api(roomId ? `/api/admin/rooms/${roomId}` : "/api/admin/rooms", {
    method: roomId ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });

  roomForm.reset();
  loadAdmin();
});

loadAdmin().catch((error) => alert(error.message));
