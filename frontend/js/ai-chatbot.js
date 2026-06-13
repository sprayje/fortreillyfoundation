const AI_CHAT_ENDPOINT = window.FRF_AI_CHAT_ENDPOINT || "https://fort-reilly-chat.thefrontporch606.workers.dev";

const form = document.getElementById("aiChatForm");
const promptInput = document.getElementById("aiPrompt");
const messages = document.getElementById("aiMessages");
const statusLine = document.getElementById("aiStatus");
const chatHistory = [];

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function addMessage(role, body) {
  const article = document.createElement("article");
  article.className = `ai-message ${role}`;
  article.innerHTML = `<strong>${role === "user" ? "You" : "Fort Reilly AI"}</strong><p>${escapeHTML(body)}</p>`;
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
}

async function sendPrompt(message) {
  chatHistory.push({ role: "user", content: message });

  const response = await fetch(AI_CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chatHistory })
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : { reply: await response.text() };

  if (!response.ok) {
    chatHistory.pop();
    throw new Error(data.error || data.message || "The AI chatbot is not responding yet.");
  }

  const reply = data.reply || data.response || data.message || data.content || "I received that, but the response was empty.";
  chatHistory.push({ role: "assistant", content: reply });
  return reply;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = promptInput.value.trim();
  if (!message) return;

  addMessage("user", message);
  promptInput.value = "";
  statusLine.textContent = "Thinking...";
  form.querySelector("button").disabled = true;

  try {
    const reply = await sendPrompt(message);
    addMessage("assistant", reply);
    statusLine.textContent = "";
  } catch (error) {
    statusLine.textContent = error.message;
  } finally {
    form.querySelector("button").disabled = false;
    promptInput.focus();
  }
});
