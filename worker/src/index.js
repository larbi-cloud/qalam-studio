const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CONTENT_TYPES = {
  mixed: "أنشئ 3 قطع مختلفة فعلاً: إعلان قصير، Caption للسوشيال ميديا، وCTA/زاوية تواصل قصيرة.",
  caption: "أنشئ 3 Captions مختلفة وقابلة للنشر مباشرة، وكل Caption يبدأ بجملة تشد الانتباه وينتهي CTA طبيعي.",
  reel: "أنشئ 3 سكريبتات قصيرة لـReel أو TikTok ببنية HOOK ثم RETENTION ثم PAYOFF ثم CTA.",
  ad: "أنشئ 3 إعلانات قصيرة مختلفة ومقنعة، بدون ادعاءات أو عروض أو أرقام غير مؤكدة.",
  product: "أنشئ 3 صيغ مختلفة لوصف المنتج أو الخدمة، وركز فقط على الفوائد المدعومة بالمعطيات.",
};

const TONES = {
  professional: "نبرة احترافية، واضحة وموثوقة.",
  friendly: "نبرة ودية، قريبة وإنسانية.",
  luxury: "نبرة فاخرة، هادئة وراقية، بلا مبالغة.",
  direct: "نبرة مباشرة، مختصرة وبيعية بدون ضغط.",
  playful: "نبرة خفيفة، إبداعية وذكية بدون ابتذال.",
};

const LANGUAGES = {
  darija: [
    "اكتب بالدارجة المغربية الطبيعية اللي كتتقال فعلاً فالمغرب.",
    "تجنب الفصحى الثقيلة واللهجات المصرية والخليجية والشامية والترجمة الحرفية.",
    "ما تستعمل حتى كلمة فرنسية أو إنجليزية إلا إذا كانت طبيعية جداً فالسياق المغربي.",
    "راجع الصياغة بصمت قبل الإخراج وخليها سهلة تتقال بصوت عالي.",
  ].join(" "),
  ar: "اكتب بالعربية الفصحى المعاصرة والواضحة، بأسلوب تسويقي طبيعي.",
  fr: "Écris en français naturel, fluide et commercial, adapté au public marocain.",
  en: "Write in natural, concise marketing English suitable for a Moroccan business audience.",
};

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "https://larbi-cloud.github.io,http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin, env) {
  return Boolean(origin) && allowedOrigins(env).includes(origin);
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
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

function normalizeChoice(value, map, fallback) {
  const key = cleanText(value, 30);
  return Object.prototype.hasOwnProperty.call(map, key) ? key : fallback;
}

function sanitizeText(value, maxLength) {
  return cleanText(value, maxLength)
    .replace(/(?:\+?212|0)[5-7](?:[\s.-]*\d){7,8}/g, "")
    .replace(/0[5-7](?:[\s.-]*[Xx*•]){4,}/g, "")
    .trim();
}

function schemaFor(contentType) {
  if (contentType === "reel") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["items"],
      properties: {
        items: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "hook", "retention", "payoff", "cta"],
            properties: {
              title: { type: "string", minLength: 2, maxLength: 80 },
              hook: { type: "string", minLength: 3, maxLength: 180 },
              retention: { type: "string", minLength: 4, maxLength: 280 },
              payoff: { type: "string", minLength: 6, maxLength: 450 },
              cta: { type: "string", minLength: 2, maxLength: 220 },
            },
          },
        },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "text"],
          properties: {
            title: { type: "string", minLength: 2, maxLength: 80 },
            text: { type: "string", minLength: 10, maxLength: 900 },
          },
        },
      },
    },
  };
}

function normalizeItems(payload, contentType) {
  const source = Array.isArray(payload?.items) ? payload.items.slice(0, 3) : [];
  if (source.length !== 3) return [];

  if (contentType === "reel") {
    return source.map((item, index) => ({
      title: sanitizeText(item?.title || `فكرة ${index + 1}`, 80),
      hook: sanitizeText(item?.hook, 180),
      retention: sanitizeText(item?.retention, 280),
      payoff: sanitizeText(item?.payoff, 450),
      cta: sanitizeText(item?.cta, 220),
    }));
  }

  return source.map((item, index) => ({
    title: sanitizeText(item?.title || `فكرة ${index + 1}`, 80),
    text: sanitizeText(item?.text, 900),
  }));
}

function usableItems(items, contentType) {
  if (!Array.isArray(items) || items.length !== 3) return false;
  if (contentType === "reel") {
    return items.every((item) => item.title && item.hook && item.retention && item.payoff && item.cta);
  }
  return items.every((item) => item.title && item.text);
}

function modelCandidates(env) {
  return [
    env.OPENROUTER_MODEL,
    "dots-studio/dots-3-note-preview:free",
    "openrouter/free",
    "minimax/minimax-m3:free",
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

function parseStructuredContent(content) {
  if (content && typeof content === "object" && !Array.isArray(content)) return content;
  if (typeof content !== "string") return null;
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    return null;
  }
}

async function callModel(model, env, systemPrompt, userPrompt, contentType, temperature) {
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
        temperature,
        max_tokens: 1200,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: contentType === "reel" ? "qalam_reels" : "qalam_content",
            strict: true,
            schema: schemaFor(contentType),
          },
        },
        provider: {
          require_parameters: true,
        },
      }),
    });
  } catch (_) {
    return { ok: false, model, detail: "Could not reach OpenRouter" };
  }

  let data;
  try {
    data = await upstream.json();
  } catch (_) {
    return { ok: false, model, detail: `Invalid JSON from provider (${upstream.status})` };
  }

  if (!upstream.ok) {
    return {
      ok: false,
      model,
      detail: cleanText(data?.error?.message || `Provider error ${upstream.status}`, 260),
    };
  }

  const parsed = parseStructuredContent(data?.choices?.[0]?.message?.content);
  const items = normalizeItems(parsed, contentType);
  if (!usableItems(items, contentType)) {
    return { ok: false, model: data?.model || model, detail: "Structured output was missing or incomplete" };
  }

  return { ok: true, model: data?.model || model, items };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (url.pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "qalam-studio-ai",
        structuredOutput: true,
        models: modelCandidates(env),
      }, 200, origin, env);
    }

    if (url.pathname !== "/api/generate") {
      return jsonResponse({ error: "Not found" }, 404, origin, env);
    }

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin, env)) return jsonResponse({ error: "Origin not allowed" }, 403, origin, env);
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin, env);
    if (!isAllowedOrigin(origin, env)) return jsonResponse({ error: "Origin not allowed" }, 403, origin, env);
    if (!env.OPENROUTER_API_KEY) return jsonResponse({ error: "Server configuration error" }, 500, origin, env);

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse({ error: "Invalid JSON body" }, 400, origin, env);
    }

    const business = cleanText(body?.business, 80);
    const city = cleanText(body?.city, 80);
    const details = cleanText(body?.details, 500);
    const contentType = normalizeChoice(body?.contentType, CONTENT_TYPES, "mixed");
    const tone = normalizeChoice(body?.tone, TONES, "professional");
    const language = normalizeChoice(body?.language, LANGUAGES, "darija");

    if (!business) return jsonResponse({ error: "business is required" }, 400, origin, env);

    const market = city || "المغرب";
    const facts = details || "لا توجد تفاصيل إضافية موثوقة";
    const reelRules = contentType === "reel"
      ? [
          "بالنسبة لكل Reel:",
          "HOOK قصير جداً وقوي ومناسب لأول 1–3 ثواني، وما يفوتش 12 كلمة تقريباً.",
          "RETENTION جملة واحدة تفتح الفضول أو تعطي سبباً واضحاً للاستمرار.",
          "PAYOFF جملة أو جوج فقط، مبنية حصراً على المعلومات المؤكدة.",
          "CTA قصير وطبيعي ومناسب للهدف.",
          "النتيجة كاملة خاصها تكون قصيرة وماشي فقرة طويلة.",
        ].join("\n")
      : "خلي كل نتيجة مختصرة، محددة، وجاهزة للنشر مباشرة.";

    const systemPrompt = [
      "أنت Senior Direct-Response Copywriter وContent Strategist داخل Qalam Studio، متخصص في السوق المغربي.",
      LANGUAGES[language],
      TONES[tone],
      CONTENT_TYPES[contentType],
      `النشاط المؤكد: ${business}.`,
      `المدينة/السوق المؤكد: ${market}.`,
      `التفاصيل الإضافية المؤكدة: ${facts}.`,
      "Grounding rule صارم: ممنوع تقدم كحقيقة أي طبق، منتج، خدمة، ميزة، عرض، يوم، مكوّن، موقع أدق، أجواء، سعر، رقم، أو معلومة ما موجوداش صراحة فالمعطيات المؤكدة.",
      "إذا احتجت تكون Specific وما عندكش fact كافي، استعمل مشكلة/رغبة/سؤال مرتبط بالفئة بدل اختراع معلومة.",
      "ممنوع أرقام هاتف، روابط، أثمنة، خصومات، تقييمات أو placeholders مخترعة.",
      "إذا اللغة دارجة، ممنوع كلمات غريبة أو ترجمة حرفية؛ خليه كلام مغربي طبيعي وبسيط.",
      "الاقتراحات الثلاثة خاصها تختلف فعلاً في الزاوية النفسية، ماشي غير تبديل الكلمات.",
      reelRules,
      "أرجع فقط البيانات المطلوبة حسب JSON Schema، بدون Markdown وبدون شرح.",
    ].join("\n");

    const userPrompt = [
      `النشاط: ${business}`,
      `المدينة/السوق: ${market}`,
      `التفاصيل الموثوقة: ${facts}`,
      `نوع المحتوى: ${contentType}`,
      `النبرة: ${tone}`,
      `اللغة: ${language}`,
      "ولّد 3 اقتراحات مختلفة جذرياً وجاهزة للنشر، والتزم فقط بالحقائق أعلاه.",
    ].join("\n");

    const errors = [];
    for (const model of modelCandidates(env)) {
      const result = await callModel(
        model,
        env,
        systemPrompt,
        userPrompt,
        contentType,
        contentType === "reel" || tone === "playful" ? 0.68 : 0.58,
      );

      if (result.ok) {
        return jsonResponse({
          ok: true,
          model: result.model,
          request: { contentType, tone, language, hasDetails: Boolean(details) },
          items: result.items,
        }, 200, origin, env);
      }
      errors.push(`${model}: ${result.detail}`);
    }

    console.error("Qalam OpenRouter generation failed", errors);
    return jsonResponse({
      error: "AI_TEMPORARILY_UNAVAILABLE",
      detail: "تعذر توليد المحتوى حالياً. جرّب مرة أخرى بعد لحظات.",
    }, 502, origin, env);
  },
};
