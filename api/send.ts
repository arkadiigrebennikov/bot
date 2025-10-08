// api/send.ts
// Обычная серверная функция на Node (НЕ edge)

type TgResponse = { ok: boolean; [k: string]: any };

function hashInt(str: string) {
  // простенький детерминированный хэш → не нужен стейт/БД
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function parseList(input?: string): string[] {
  if (!input) return [];
  const trimmed = input.trim();
  if (!trimmed) return [];
  // пробуем как JSON-массив
  try {
    const arr = JSON.parse(trimmed);
    if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
  } catch {}
  // иначе — по переводу строки/запятым/точке с запятой
  return trimmed
    .split(/\r?\n|,|;/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function validTimes(times: string[]): string[] {
  return times
    .map((t) => t.replace(/\s+/g, ""))
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => {
      let [h, m] = t.split(":").map((n) => parseInt(n, 10));
      if (h < 0 || h > 23 || m < 0 || m > 59) return "";
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      return `${hh}:${mm}`;
    })
    .filter(Boolean);
}

function getMadridTimeParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);

  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value!;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  return { year, month, day, hour, minute, isoDate: `${year}-${month}-${day}`, hhmm: `${hour}:${minute}` };
}

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;

  // источники: ENV MESSAGES/TIMES; есть дефолты на всякий
  const messages = parseList(process.env.MESSAGES);
  const timesRaw = parseList(process.env.TIMES);
  const times = validTimes(timesRaw);

  const defaultMessages = ["Доброе утро 🌞", "Пора двигаться 🚀", "Пей воду 💧", "Не забудь про цели 💡"];
  const defaultTimes = ["09:00"];

  const msgs = messages.length ? messages : defaultMessages;
  const tms = times.length ? times : defaultTimes;

  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "Missing BOT_TOKEN or CHAT_ID" });
  }

  const nowParts = getMadridTimeParts(new Date());
  const { isoDate, hhmm } = nowParts;

  // детерминированный выбор пары (сообщение + время) на день
  const baseSeed = hashInt(`${isoDate}|${process.env.SEED ?? ""}|${msgs.join("|")}|${tms.join("|")}`);
  const msgIndex = baseSeed % msgs.length;
  const timeIndex = ((baseSeed * 2654435761) >>> 0) % tms.length; // второе «независимое» распределение

  const todaysMessage = msgs[msgIndex];
  const todaysTime = tms[timeIndex]; // формат "HH:MM" по Europe/Madrid

  const url = new URL(req.url, `http://${req.headers.host}`);
  const force = url.searchParams.get("force");

  // отправляем либо когда наступила выбранная минута, либо если ?force=1
  if (force !== "1" && hhmm !== todaysTime) {
    return res.status(204).json({
      ok: true,
      skipped: true,
      reason: "Not scheduled minute",
      nowMadrid: hhmm,
      todaysTime,
    });
  }

  const api = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text: todaysMessage };

  const r = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await r.json()) as TgResponse;
  const status = data?.ok ? 200 : 500;
  return res.status(status).json({ ...data, meta: { isoDate, hhmm, todaysTime, msgIndex, timeIndex } });
}
