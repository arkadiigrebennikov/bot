
export default async function handler(req: Request) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;
  const text = process.env.MESSAGE ?? "Пинг из бота 👋";

  if (!token || !chatId) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing BOT_TOKEN or CHAT_ID" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const data = await r.json();
  const status = data?.ok ? 200 : 500;

  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
