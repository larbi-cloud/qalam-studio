const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CONTENT_TYPES = {
  mixed: "أنشئ 3 قطع مختلفة فعلاً: إعلان قصير، Caption للسوشيال ميديا، وCTA/زاوية تواصل قصيرة. كل قطعة تستعمل زاوية نفسية مختلفة ولا تعيد نفس الفكرة بصياغة أخرى.",
  caption: "أنشئ 3 Captions مختلفة وقابلة للنشر مباشرة. افتح كل Caption بجملة تشد الانتباه، أعطِ قيمة أو صورة ذهنية واضحة، واختم CTA طبيعي. تجنب المقدمات العامة والحشو.",
  reel: "أنشئ 3 أفكار/سكريبتات قصيرة لـReel أو TikTok. كل نتيجة تتبع Hook → Retention → Payoff → CTA. الـHook هو أول 1–3 ثوانٍ ويكون قصيراً وقوياً ومحددًا بالنشاط؛ ثم سبب يخلي المشاهد يكمل؛ ثم payoff واضح؛ ثم CTA خفيف. لا تستعمل clickbait كاذب.",
  ad: "أنشئ 3 إعلانات قصيرة مختلفة ومقنعة. كل إعلان يبدأ بفائدة أو مشكلة واضحة مرتبطة بالنشاط، ثم قيمة مختصرة، ثم CTA طبيعي. بدون ادعاءات أو عروض أو أرقام غير مؤكدة.",
  product: "أنشئ 3 صيغ مختلفة لوصف المنتج أو الخدمة. ركز على الفائدة، تجربة الزبون، ولماذا قد يهتم بها شخص في هذا السوق، بدون اختراع مواصفات أو مميزات غير معطاة.",
};

const TONES = {
  professional: "نبرة احترافية، واضحة وموثوقة، بدون لغة جامدة أو رسمية أكثر من اللازم.",
  friendly: "نبرة ودية، قريبة وإنسانية، كأن البراند كيهضر مباشرة مع الزبون.",
  luxury: "نبرة فاخرة، هادئة وراقية، بجمل نظيفة وقليلة المبالغة.",
  direct: "نبرة مباشرة، مختصرة وبيعية، بجمل قوية وواضحة بدون ضغط أو ادعاءات.",
  playful: "نبرة خفيفة، إبداعية وذكية، فيها شخصية ولكن بدون ابتذال أو نكات مصطنعة.",
};

const LANGUAGES = {
  darija: "اكتب بالدارجة المغربية الطبيعية كما يتكلم بها الناس في المغرب. تجنب الفصحى الثقيلة، وتجنب اللهجات المصرية/الخليجية/الشامية، وتجنب تعابير مترجمة حرفياً من الإنجليزية. استعمل كلمات فرنسية شائعة فقط إذا كانت طبيعية في الدارجة المغربية.",
  ar: "اكتب بالعربية الفصحى المعاصرة والواضحة، بأسلوب تسويقي طبيعي وليس إنشائياً.",
  fr: "Écris en français naturel, fluide et commercial, adapté au public marocain. Évite les tournures génériques et le français artificiel.",
  en: "Write in natural, concise marketing English suitable for a Moroccan business audience. Avoid generic AI-sounding copy.",
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

  const fallbackText = sanitizeGeneratedText(text, 2000);
  return fallbackText
    ? [{ title: "نتيجة الذكاء الاصطناعي", text: fallbackText }]
    : [];
}

function suspiciousResponse(text, items) {
  const normalized = cleanText(text, 300).toLowerCase();
  if (!normalized) return true;
  if (/user safety|\bsafety:\s*safe\b|^safe$/i.test(normalized)) return true;
  if (!Array.isArray(items) || !items.length) return true;
  return items.every((item) => cleanText(item?.text, 200).length < 12);
}

function modelCandidates(env) {
  return [
    env.OPENROUTER_MODEL || "minimax/minimax-m3:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "openrouter/free",
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

async function callModel(model, env, systemPrompt, userPrompt, temperature) {
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
        max_tokens: 900,
      }),
    });
  } catch (_) {
    return { ok: false, detail: "Could not reach OpenRouter", model };
  }

  let data;
  try {
    data = await upstream.json();
  } catch (_) {
    return { ok: false, detail: "Invalid response from OpenRouter", model };
  }

  if (!upstream.ok) {
    return {
      ok: false,
      detail: cleanText(data?.error?.message || `Provider error ${upstream.status}`, 300),
      model,
    };
  }

  const assistantText = extractAssistantText(data?.choices?.[0]?.message?.content);
  const items = parseGeneratedItems(assistantText);

  if (suspiciousResponse(assistantText, items)) {
    return { ok: false, detail: "Model returned an unusable response", model: data?.model || model };
  }

  return {
    ok: true,
    model: data?.model || model,
    items,
  };
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
          models: modelCandidates(env),
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

    const market = city || "المغرب";
    const systemPrompt = [
      "أنت Senior Direct-Response Copywriter وContent Strategist داخل Qalam Studio، متخصص في السوق المغربي وTikTok وInstagram Reels والمحتوى التجاري القصير.",
      LANGUAGES[language],
      TONES[tone],
      CONTENT_TYPES[contentType],
      `السياق الحقيقي الوحيد المتوفر: النشاط هو ${business}، والسوق/المدينة هي ${market}. اربط المحتوى بهما بشكل طبيعي بدل نصوص عامة تصلح لأي مشروع.`,
      "جودة المحتوى: كل نتيجة خاصها فكرة محددة وواضحة، Hook قوي، wording بشري، وفائدة أو فضول حقيقي. تجنب الكلام الفضفاض مثل: الأفضل، تجربة لا تنسى، جودة لا مثيل لها، اكتشف عالم، أو عبارات AI العامة إلا إذا كان عندها معنى محدد في السياق.",
      "التنوع: النتائج الثلاثة لازم تختلف في الزاوية، وليس فقط في الكلمات. مثال للزوايا المسموحة: فضول/سؤال ذكي، مشكلة→حل، رغبة/تجربة حسية، مقارنة أو pattern interrupt بدون ادعاءات غير مؤكدة.",
      "بالنسبة للـReel/TikTok: أول جملة يجب أن توقف السكرول خلال 1–3 ثوانٍ، ويفضل ألا تتجاوز 12 كلمة. بعدها حافظ على فضول المشاهد قبل الـpayoff، ثم CTA قصير وطبيعي.",
      "استعمل المدينة عندما تزيد relevance، لكن لا تحشر اسم المدينة في كل سطر أو كل نتيجة.",
      "المعلومات الوحيدة المسموح استعمالها كحقائق هي النشاط والمدينة/السوق التي يعطيها المستخدم.",
      "ممنوع اختراع أرقام هاتف أو واتساب أو روابط أو عناوين أو أثمنة أو خصومات أو عروض أو ساعات عمل أو مواعيد أو سنوات خبرة أو جوائز أو تقييمات أو أعداد زبائن أو خدمات أو مزايا أو مكونات غير مذكورة.",
      "ممنوع استعمال placeholders مثل 06XX أو XX XX XX XX أو أرقام تجريبية.",
      "إذا احتجت CTA للتواصل استعمل صياغة عامة مثل: تواصل معنا، راسلنا، شارك رأيك، احفظ الفيديو، أو زورنا، حسب نوع المحتوى وبدون بيانات اتصال مخترعة.",
      "لا تشرح استراتيجيتك ولا تكتب ملاحظات للمستخدم. أرجع المحتوى النهائي فقط.",
      "أرجع JSON صالح فقط بدون Markdown وبدون أي نص خارج JSON.",
      "العنوان title يكون اسم الزاوية أو Hook مختصر، والنص text يكون المحتوى الجاهز للنشر.",
      '{"items":[{"title":"...","text":"..."},{"title":"...","text":"..."},{"title":"...","text":"..."}]}',
    ].join("\n");

    const userPrompt = [
      `النشاط: ${business}`,
      `المدينة/السوق: ${market}`,
      `نوع المحتوى: ${contentType}`,
      `النبرة: ${tone}`,
      `اللغة: ${language}`,
      "أنشئ الآن 3 اقتراحات مختلفة جذرياً، جاهزة للنشر، ومبنية على السياق أعلاه.",
    ].join("\n");

    const errors = [];
    for (const model of modelCandidates(env)) {
      const result = await callModel(
        model,
        env,
        systemPrompt,
        userPrompt,
        contentType === "reel" || tone === "playful" ? 0.78 : 0.68,
      );

      if (result.ok) {
        return jsonResponse(
          {
            ok: true,
            model: result.model,
            request: { contentType, tone, language },
            items: result.items,
          },
          200,
          origin,
          env,
        );
      }

      errors.push(`${model}: ${result.detail}`);
    }

    return jsonResponse(
      {
        error: "All OpenRouter models failed",
        detail: cleanText(errors.join(" | "), 700),
      },
      502,
      origin,
      env,
    );
  },
};
