// Change this to your deployed backend URL, for example:
// const API_BASE = "https://fort-reilly-chat.onrender.com";
const API_BASE = "http://localhost:4000";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");
const tabs = document.querySelectorAll("[data-auth-tab]");

if (localStorage.getItem("frfToken")) {
  window.location.href = "chat.html";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const mode = tab.dataset.authTab;
    tabs.forEach((button) => button.classList.toggle("active", button === tab));
    loginForm.classList.toggle("hidden", mode !== "login");
    registerForm.classList.toggle("hidden", mode !== "register");
    authMessage.textContent = "";
  });
});

async function submitAuth(path, form) {
  authMessage.textContent = "Working...";
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch(`${API_BASE}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Authentication failed.");

    localStorage.setItem("frfToken", data.token);
    localStorage.setItem("frfUser", JSON.stringify(data.user));
    window.location.href = "chat.html";
  } catch (error) {
    authMessage.textContent = error.message;
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("login", loginForm);
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("register", registerForm);
});
