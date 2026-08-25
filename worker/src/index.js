const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CONTENT_TYPES = {
  mixed: "أنشئ 3 قطع مختلفة: إعلان قصير، Caption للسوشيال ميديا، وCTA قصير للتواصل.",
  caption: "أنشئ 3 Captions مختلفة للسوشيال ميديا، كل واحدة قابلة للنشر مباشرة.",
  reel: "أنشئ 3 Hooks/أفكار قصيرة لفيديو Reel أو TikTok، كل واحدة تبدأ بجملة توقف السكرول ثم payoff مختصر.",
  ad: "أنشئ 3 إعلانات قصيرة مختلفة ومقنعة، بدون ادعاءات أو عروض غير مؤكدة.",
  product: "أنشئ 3 صيغ مختلفة لوصف المنتج أو الخدمة، واضحة ومقنعة بدون اختراع مواصفات غير معطاة.",
};

const TONES = {
  professional: "نبرة احترافية، واضحة وموثوقة.",
  friendly: "نبرة ودية، قريبة وإنسانية.",
  luxury: "نبرة فاخرة، هادئة وراقية بدون مبالغة.",
  direct: "نبرة مباشرة، مختصرة وبيعية بدون ضغط أو ادعاءات.",
  playful: "نبرة خفيفة، إبداعية وذكية بدون ابتذال.",
};

const LANGUAGES = {
  darija: "اكتب بالدارجة المغربية الطبيعية والواضحة.",
  ar: "اكتب بالعربية الفصحى المعاصرة والواضحة.",
  fr: "Écris en français naturel, clair et adapté au marché marocain.",
  en: "Write in natural, clear English suitable for a Moroccan business audience.",
};

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "https://larbi-cloud.github.io,http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  return allowedOrigins(env).includes(origin);
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (isAllowedOrigin(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(payload, status, origin, env) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin, env),
    },
  });
}

function cleanText(value, maxLength) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function sanitizeGeneratedText(value, maxLength) {
  return cleanText(value, maxLength)
    .replace(/(?:\+?212|0)[5-7](?:[\s.-]*\d){7,8}/g, "")
    .replace(/0[5-7](?:[\s.-]*[Xx*•]){4,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeChoice(value, allowed, fallback) {
  const key = cleanText(value, 30);
  return Object.prototype.hasOwnProperty.call(allowed, key) ? key : fallback;
}

function extractAssistantText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part && (part.type === "text" || typeof part.text === "string"))
      .map((part) => part.text || "")
      .join("\n")
      .trim();
  }
  return "";
}

function parseGeneratedItems(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed = JSON.parse(cleaned);
    const source = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(source)) throw new Error("Missing items array");

    const items = source
      .slice(0, 3)
      .map((item, index) => ({
        title: cleanText(item?.title || `فكرة ${index + 1}`, 80),
        text: sanitizeGeneratedText(item?.text || item?.content || "", 850),
      }))
      .filter((item) => item.text);

    if (items.length) return items;
  } catch (_) {
    // Some free models may wrap or ignore the requested JSON format.
  }

  return [
    {
      title: "نتيجة الذكاء الاصطناعي",
      text: sanitizeGeneratedText(text, 2000),
    },
  ];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          service: "qalam-studio-ai",
          model: env.OPENROUTER_MODEL || "openrouter/free",
        },
        200,
        origin,
        env,
      );
    }

    if (url.pathname !== "/api/generate") {
      return jsonResponse({ error: "Not found" }, 404, origin, env);
    }

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin, env)) {
        return jsonResponse({ error: "Origin not allowed" }, 403, origin, env);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin, env);
    }

    if (!isAllowedOrigin(origin, env)) {
      return jsonResponse({ error: "Origin not allowed" }, 403, origin, env);
    }

    if (!env.OPENROUTER_API_KEY) {
      return jsonResponse({ error: "Server is missing OPENROUTER_API_KEY" }, 500, origin, env);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse({ error: "Invalid JSON body" }, 400, origin, env);
    }

    const business = cleanText(body?.business, 80);
    const city = cleanText(body?.city, 80);
    const contentType = normalizeChoice(body?.contentType, CONTENT_TYPES, "mixed");
    const tone = normalizeChoice(body?.tone, TONES, "professional");
    const language = normalizeChoice(body?.language, LANGUAGES, "darija");

    if (!business) {
      return jsonResponse({ error: "business is required" }, 400, origin, env);
    }

    const model = env.OPENROUTER_MODEL || "openrouter/free";
    const market = city || "المغرب";

    const systemPrompt = [
      "أنت Senior Copywriter داخل Qalam Studio ومتخصص في السوق المغربي وصناعة المحتوى التجاري.",
      LANGUAGES[language],
      TONES[tone],
      CONTENT_TYPES[contentType],
      "المعلومات الوحيدة المسموح استعمالها كحقائق هي نوع النشاط والمدينة/السوق التي يعطيها المستخدم.",
      "ممنوع اختراع أرقام هاتف أو واتساب أو روابط أو عناوين أو أثمنة أو خصومات أو عروض أو ساعات عمل أو مواعيد أو سنوات خبرة أو جوائز أو خدمات أو مزايا غير مذكورة.",
      "ممنوع استعمال placeholders مثل 06XX أو XX XX XX XX أو أرقام تجريبية.",
      "إذا احتجت دعوة للتواصل استعمل صياغة عامة مثل: تواصل معنا، راسلنا، أو زورنا، بدون أي بيانات اتصال مخترعة.",
      "كل نتيجة يجب أن تكون مختلفة بوضوح عن الأخرى ومفيدة وقابلة للنشر مباشرة.",
      "أرجع JSON صالح فقط بدون Markdown وبدون أي نص خارج JSON.",
      'الصيغة المطلوبة: {"items":[{"title":"...","text":"..."},{"title":"...","text":"..."},{"title":"...","text":"..."}]}',
    ].join("\n");

    const userPrompt = [
      `النشاط: ${business}`,
      `المدينة/السوق: ${market}`,
      `نوع المحتوى: ${contentType}`,
      `النبرة: ${tone}`,
      `اللغة: ${language}`,
      "أنشئ 3 اقتراحات الآن.",
    ].join("\n");

    let upstream;
    try {
      upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": env.SITE_URL || "https://larbi-cloud.github.io/qalam-studio/",
          "X-Title": env.SITE_NAME || "Qalam Studio",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: tone === "playful" ? 0.8 : 0.65,
          max_tokens: 900,
        }),
      });
    } catch (_) {
      return jsonResponse({ error: "Could not reach OpenRouter" }, 502, origin, env);
    }

    let data;
    try {
      data = await upstream.json();
    } catch (_) {
      return jsonResponse({ error: "Invalid response from OpenRouter" }, 502, origin, env);
    }

    if (!upstream.ok) {
      return jsonResponse(
        {
          error: "OpenRouter request failed",
          detail: cleanText(data?.error?.message || "Unknown provider error", 300),
        },
        502,
        origin,
        env,
      );
    }

    const assistantText = extractAssistantText(data?.choices?.[0]?.message?.content);
    if (!assistantText) {
      return jsonResponse({ error: "Model returned an empty response" }, 502, origin, env);
    }

    return jsonResponse(
      {
        ok: true,
        model: data?.model || model,
        request: { contentType, tone, language },
        items: parseGeneratedItems(assistantText),
      },
      200,
      origin,
      env,
    );
  },
};
