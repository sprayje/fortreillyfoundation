const SYSTEM_PROMPT = `You are a helpful assistant for the Fort Reilly Foundation, a veteran-serving nonprofit organization founded in memory of a soldier killed in action in Iraq. Our tagline is "Never Fight Alone."

The Fort Reilly Foundation supports veterans by connecting them with resources, community, and assistance.

When answering:
- Be warm, respectful, and supportive - many visitors may be veterans or their families
- Answer questions about the Fort Reilly Foundation and what we do
- Help point veterans to resources (VA benefits, mental health, housing, employment, etc.)
- Explain how people can donate or get involved
- If you don't know a specific detail about the org, say so honestly and suggest they contact us directly at fortreillyfoundation.org
- Keep responses concise and easy to read
- Never give medical or legal advice - always refer to professionals`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

export async function onRequestOptions() {
  return jsonResponse({});
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "Claude API token is not configured in Cloudflare." }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Send a message to the chatbot." }, 400);
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter((message) => ["user", "assistant"].includes(message.role))
        .map((message) => ({
          role: message.role,
          content: String(message.content || "").slice(0, 2000)
        }))
        .filter((message) => message.content.trim())
        .slice(-12)
    : [
        {
          role: "user",
          content: String(payload.message || "").trim().slice(0, 2000)
        }
      ];

  if (!messages.length || !messages[messages.length - 1].content.trim()) {
    return jsonResponse({ error: "Type a message first." }, 400);
  }

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages
    })
  });

  const data = await anthropicResponse.json();
  if (!anthropicResponse.ok) {
    return jsonResponse({
      error: data.error?.message || "Claude did not return a response."
    }, anthropicResponse.status);
  }

  const reply = (data.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return jsonResponse({ reply: reply || "I am here, but I do not have a response for that yet." });
}
