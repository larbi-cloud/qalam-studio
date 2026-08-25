const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CONTENT_TYPES = {
  mixed: "أنشئ 3 قطع مختلفة فعلاً: إعلان قصير، Caption للسوشيال ميديا، وCTA/زاوية تواصل قصيرة. كل قطعة تستعمل زاوية نفسية مختلفة ولا تعيد نفس الفكرة بصياغة أخرى.",
  caption: "أنشئ 3 Captions مختلفة وقابلة للنشر مباشرة. افتح كل Caption بجملة تشد الانتباه، أعطِ قيمة أو صورة ذهنية واضحة، واختم CTA طبيعي. تجنب المقدمات العامة والحشو.",
  reel: "أنشئ 3 سكريبتات قصيرة لـReel أو TikTok. كل نتيجة يجب أن تتبع بنية HOOK → RETENTION → PAYOFF → CTA وأن تكون قصيرة ومصممة للاحتفاظ بالمشاهد.",
  ad: "أنشئ 3 إعلانات قصيرة مختلفة ومقنعة. كل إعلان يبدأ بفائدة أو مشكلة واضحة مرتبطة بالنشاط، ثم قيمة مختصرة، ثم CTA طبيعي. بدون ادعاءات أو عروض أو أرقام غير مؤكدة.",
  product: "أنشئ 3 صيغ مختلفة لوصف المنتج أو الخدمة. ركز على الفائدة وتجربة الزبون ولماذا قد يهتم بها شخص في هذا السوق، بدون اختراع مواصفات أو مميزات غير معطاة.",
};

const TONES = {
  professional: "نبرة احترافية، واضحة وموثوقة، بدون لغة جامدة أو رسمية أكثر من اللازم.",
  friendly: "نبرة ودية، قريبة وإنسانية، كأن البراند كيهضر مباشرة مع الزبون.",
  luxury: "نبرة فاخرة، هادئة وراقية، بجمل نظيفة وقليلة المبالغة.",
  direct: "نبرة مباشرة، مختصرة وبيعية، بجمل قوية وواضحة بدون ضغط أو ادعاءات.",
  playful: "نبرة خفيفة، إبداعية وذكية، فيها شخصية ولكن بدون ابتذال أو نكات مصطنعة.",
};

const LANGUAGES = {
  darija: [
    "اكتب بالدارجة المغربية الطبيعية اللي كتتقال فعلاً فالمغرب، بجمل بسيطة ومسموعة بحال كلام إنسان ماشي ترجمة آلية.",
    "تجنب الفصحى الثقيلة واللهجات المصرية والخليجية والشامية، وتجنب التراكيب المترجمة حرفياً من الإنجليزية أو الفرنسية.",
    "ما تستعملش كلمات لاتينية أو فرنسية وسط النص إلا إذا كانت موجودة أصلاً فمعطيات المستخدم أو كانت ضرورية جداً.",
    "إلا كانت الجملة ما غاديش تبان طبيعية إلا تقرات بصوت عالي لمغربي، عاود صيغها بكلام أبسط.",
  ].join(" "),
  ar: "اكتب بالعربية الفصحى المعاصرة والواضحة، بأسلوب تسويقي طبيعي وليس إنشائياً.",
  fr: "Écris en français naturel, fluide et commercial, adapté au public marocain. Évite les tournures génériques et le français artificiel.",
  en: "Write in natural, concise marketing English suitable for a Moroccan business audience. Avoid generic AI-sounding copy.",
};

const CLAIM_GROUPS = [
  { label: "السبت", terms: ["السبت"] },
  { label: "الأحد", terms: ["الأحد", "الاحد"] },
  { label: "الاثنين", terms: ["الاثنين", "الإثنين"] },
  { label: "الثلاثاء", terms: ["الثلاثاء"] },
  { label: "الأربعاء", terms: ["الأربعاء", "الاربعاء"] },
  { label: "الخميس", terms: ["الخميس"] },
  { label: "الجمعة", terms: ["الجمعة"] },
  { label: "الطاجين", terms: ["طاجين", "الطاجين"] },
  { label: "الكسكس", terms: ["كسكس", "الكسكس"] },
  { label: "الحريرة", terms: ["حريرة", "الحريرة"] },
  { label: "البسطيلة", terms: ["بسطيلة", "البيسطيلة", "البسطيلة"] },
  { label: "اللحم", terms: ["لحم", "اللحم", "لحمة"] },
  { label: "الدجاج", terms: ["دجاج", "الدجاج"] },
  { label: "السمك", terms: ["سمك", "الحوت", "حوت"] },
  { label: "التوصيل", terms: ["توصيل", "دليفري", "livraison", "delivery"] },
  { label: "الحجز", terms: ["حجز", "reservation", "réservation"] },
  { label: "الإطلالة", terms: ["إطلالة", "اطلالة", "إطلالات", "اطلالات", "vue"] },
  { label: "التراس", terms: ["تراس", "terrasse"] },
  { label: "الباركينغ", terms: ["باركينغ", "parking", "موقف السيارات"] },
  { label: "الواي فاي", terms: ["واي فاي", "wifi", "wi-fi"] },
  { label: "العائلات", terms: ["عائلي", "عائلية", "العائلة", "العائلات", "familial", "famille"] },
  { label: "الطزاجة", terms: ["طازج", "طازجة", "طري", "طرية", "fresh", "frais", "fraîche"] },
];

const DARIJA_RED_FLAGS = ["إزاي", "ازاي", "عايز", "عاوز", "كتير", "شو", "ليش", "هلق", "مو"];

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

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultilineText(value, maxLength) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n")
    .trim()
    .slice(0, maxLength);
}

function sanitizeGeneratedText(value, maxLength) {
  return cleanMultilineText(value, maxLength)
    .replace(/(?:\+?212|0)[5-7](?:[\s.-]*\d){7,8}/g, "")
    .replace(/0[5-7](?:[\s.-]*[Xx*•]){4,}/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeChoice(value, allowed, fallback) {
  const key = cleanText(value, 30);
  return Object.prototype.hasOwnProperty.call(allowed, key) ? key : fallback;
}

function normalizeForScan(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
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

function parseReelText(value) {
  const raw = cleanMultilineText(value, 1200);
  if (!raw) return null;
  const parts = { hook: "", retention: "", payoff: "", cta: "" };
  const pattern = /^(HOOK|RETENTION|PAYOFF|CTA)\s*[:：-]\s*(.*)$/i;
  let active = "";
  for (const line of raw.split("\n")) {
    const match = line.match(pattern);
    if (match) {
      active = match[1].toLowerCase();
      parts[active] = match[2].trim();
    } else if (active) {
      parts[active] = `${parts[active]} ${line}`.trim();
    }
  }
  return parts.hook || parts.retention || parts.payoff || parts.cta ? parts : null;
}

function normalizeReelItem(item, index) {
  const fromText = parseReelText(item?.text || item?.content || "") || {};
  return {
    title: cleanText(item?.title || `فكرة Reel ${index + 1}`, 80),
    hook: sanitizeGeneratedText(item?.hook || fromText.hook || "", 180),
    retention: sanitizeGeneratedText(item?.retention || fromText.retention || "", 280),
    payoff: sanitizeGeneratedText(item?.payoff || fromText.payoff || "", 450),
    cta: sanitizeGeneratedText(item?.cta || fromText.cta || "", 220),
  };
}

function parseGeneratedItems(text, contentType) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    const source = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(source)) throw new Error("Missing items array");
    if (contentType === "reel") return source.slice(0, 3).map(normalizeReelItem);
    return source
      .slice(0, 3)
      .map((item, index) => ({
        title: cleanText(item?.title || `فكرة ${index + 1}`, 80),
        text: sanitizeGeneratedText(item?.text || item?.content || "", 900),
      }))
      .filter((item) => item.text);
  } catch (_) {
    if (contentType === "reel") {
      const single = normalizeReelItem({ text }, 0);
      return single.hook || single.retention || single.payoff || single.cta ? [single] : [];
    }
    const fallbackText = sanitizeGeneratedText(text, 2000);
    return fallbackText ? [{ title: "نتيجة الذكاء الاصطناعي", text: fallbackText }] : [];
  }
}

function structurallyUsable(text, items, contentType) {
  const normalized = cleanText(text, 300).toLowerCase();
  if (!normalized || /user safety|\bsafety:\s*safe\b|^safe$/i.test(normalized)) return false;
  if (!Array.isArray(items) || !items.length) return false;
  if (contentType === "reel") {
    if (items.length < 3) return false;
    return !items.some((item) => !item?.hook || !item?.retention || !item?.payoff || !item?.cta);
  }
  return items.some((item) => cleanText(item?.text, 200).length >= 12);
}

function itemText(item, contentType) {
  return contentType === "reel"
    ? [item?.title, item?.hook, item?.retention, item?.payoff, item?.cta].filter(Boolean).join(" ")
    : [item?.title, item?.text].filter(Boolean).join(" ");
}

function qualityIssues(items, context) {
  const sourceRaw = [context.business, context.market, context.details].filter(Boolean).join(" ");
  const source = normalizeForScan(sourceRaw);
  const outputRaw = items.map((item) => itemText(item, context.contentType)).join(" ");
  const output = normalizeForScan(outputRaw);
  const issues = [];

  for (const group of CLAIM_GROUPS) {
    const terms = group.terms.map(normalizeForScan);
    const used = terms.some((term) => output.includes(term));
    const grounded = terms.some((term) => source.includes(term));
    if (used && !grounded) issues.push(`تفصيل غير مؤكد: ${group.label}`);
  }

  if (context.language === "darija") {
    const dialectFlags = DARIJA_RED_FLAGS.filter((term) => output.includes(normalizeForScan(term)));
    if (dialectFlags.length) issues.push("تعبير غير مغربي");

    const sourceLatin = new Set((sourceRaw.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) || []).map((x) => x.toLowerCase()));
    const allowedLatin = new Set([...sourceLatin, "reel", "tiktok", "instagram", "facebook", "whatsapp"]);
    const foreign = (outputRaw.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g) || [])
      .map((x) => x.toLowerCase())
      .filter((x) => !allowedLatin.has(x));
    if (foreign.length) issues.push("كلمات أجنبية غير مبررة");
  }

  const market = normalizeForScan(context.market);
  if (market && !source.includes("وسط") && output.includes(`وسط ${market}`)) issues.push("موقع أدق غير مؤكد: وسط المدينة");
  if (market && !source.includes("قلب") && output.includes(`قلب ${market}`)) issues.push("موقع أدق غير مؤكد: قلب المدينة");

  return [...new Set(issues)];
}

function modelCandidates(env) {
  return [
    env.OPENROUTER_MODEL || "minimax/minimax-m3:free",
    "dots-studio/dots-3-note-preview:free",
    "nvidia/nemotron-3.5-lightning:free",
    "openrouter/free",
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

async function callModel(model, env, systemPrompt, userPrompt, temperature, contentType) {
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
        max_tokens: 1000,
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
    return { ok: false, detail: cleanText(data?.error?.message || `Provider error ${upstream.status}`, 300), model };
  }

  const assistantText = extractAssistantText(data?.choices?.[0]?.message?.content);
  const items = parseGeneratedItems(assistantText, contentType);
  if (!structurallyUsable(assistantText, items, contentType)) {
    return { ok: false, detail: "Model returned an unusable response", model: data?.model || model };
  }

  return { ok: true, model: data?.model || model, items };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "qalam-studio-ai", models: modelCandidates(env), qualityGate: "soft" }, 200, origin, env);
    }
    if (url.pathname !== "/api/generate") return jsonResponse({ error: "Not found" }, 404, origin, env);

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin, env)) return jsonResponse({ error: "Origin not allowed" }, 403, origin, env);
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin, env);
    if (!isAllowedOrigin(origin, env)) return jsonResponse({ error: "Origin not allowed" }, 403, origin, env);
    if (!env.OPENROUTER_API_KEY) return jsonResponse({ error: "Server is missing OPENROUTER_API_KEY" }, 500, origin, env);

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
    const verifiedFacts = details
      ? `تفاصيل إضافية موثوقة أعطاها المستخدم: ${details}`
      : "لا توجد تفاصيل إضافية موثوقة. لا تفترض أي منتج، طبق، خدمة، ميزة، مكوّن، سعر، عرض، جمهور فرعي أو خاصية غير مذكورة.";

    const reelRules = contentType === "reel"
      ? [
          "قواعد Reel/TikTok إلزامية:",
          "- كل نتيجة قصيرة ومناسبة لفيديو قصير.",
          "- HOOK بين 3 و12 كلمة ويشد الانتباه بسرعة.",
          "- RETENTION جملة واحدة تفتح loop أو تعطي سبباً للاستمرار.",
          "- PAYOFF جملة أو جملتان مبنية حصراً على facts المتوفرة.",
          "- CTA جملة قصيرة وطبيعية.",
          "- كل جزء عنده field خاص به في JSON؛ ما تكتبش labels داخل النصوص.",
        ].join("\n")
      : "حافظ على النص مختصراً وقابلاً للنشر مباشرة بدون حشو.";

    const outputSchema = contentType === "reel"
      ? '{"items":[{"title":"...","hook":"...","retention":"...","payoff":"...","cta":"..."},{"title":"...","hook":"...","retention":"...","payoff":"...","cta":"..."},{"title":"...","hook":"...","retention":"...","payoff":"...","cta":"..."}]}'
      : '{"items":[{"title":"...","text":"..."},{"title":"...","text":"..."},{"title":"...","text":"..."}]}';

    const systemPrompt = [
      "أنت Senior Direct-Response Copywriter وContent Strategist داخل Qalam Studio، متخصص في السوق المغربي وTikTok وInstagram Reels والمحتوى التجاري القصير.",
      LANGUAGES[language],
      TONES[tone],
      CONTENT_TYPES[contentType],
      `السياق المؤكد: النشاط هو ${business}، والسوق/المدينة هي ${market}.`,
      verifiedFacts,
      "الحقائق الوحيدة المسموح تقديمها كحقائق هي النشاط، المدينة/السوق، والتفاصيل الإضافية التي كتبها المستخدم.",
      "ممنوع تضيف من راسك أطباقاً أو منتجات أو أياماً أو إطلالات أو تراساً أو توصيلاً أو حجزاً أو مكونات أو مزايا أو أسعاراً أو عروضاً أو أجواء خاصة أو موقعاً أدق داخل المدينة.",
      "إذا كانت التفاصيل قليلة، استعمل الفضول والمشكلة والرغبة والسلوك بدل اختراع facts جديدة.",
      "النتائج الثلاثة لازم تختلف في الزاوية، وليس فقط في الكلمات.",
      reelRules,
      "ممنوع اختراع أرقام هاتف أو واتساب أو روابط أو عناوين أو أثمنة أو خصومات أو ساعات عمل أو تقييمات أو أعداد زبائن.",
      "إذا احتجت CTA استعمل صياغة عامة مثل: تواصل معنا، راسلنا، شارك رأيك، احفظ الفيديو، أو زورنا.",
      "أرجع JSON صالح فقط بدون Markdown وبدون أي نص خارج JSON.",
      `الصيغة المطلوبة بالضبط: ${outputSchema}`,
    ].join("\n");

    const userPrompt = [
      `النشاط: ${business}`,
      `المدينة/السوق: ${market}`,
      `تفاصيل النشاط الموثوقة: ${details || "غير متوفرة"}`,
      `نوع المحتوى: ${contentType}`,
      `النبرة: ${tone}`,
      `اللغة: ${language}`,
      "أنشئ 3 اقتراحات مختلفة جذرياً، جاهزة للنشر، ومبنية حصراً على المعلومات أعلاه.",
    ].join("\n");

    const context = { business, market, details, contentType, language };
    const errors = [];
    let best = null;

    for (const model of modelCandidates(env)) {
      const result = await callModel(
        model,
        env,
        systemPrompt,
        userPrompt,
        contentType === "reel" || tone === "playful" ? 0.68 : 0.60,
        contentType,
      );

      if (!result.ok) {
        errors.push(`${model}: ${result.detail}`);
        continue;
      }

      const issues = qualityIssues(result.items, context);
      const candidate = { ...result, issues };
      if (!best || candidate.issues.length < best.issues.length) best = candidate;

      if (issues.length === 0) {
        return jsonResponse({
          ok: true,
          model: result.model,
          quality: "passed",
          request: { contentType, tone, language, hasDetails: Boolean(details) },
          items: result.items,
        }, 200, origin, env);
      }
    }

    if (best) {
      return jsonResponse({
        ok: true,
        model: best.model,
        quality: "best_available",
        qualityFlags: best.issues,
        request: { contentType, tone, language, hasDetails: Boolean(details) },
        items: best.items,
      }, 200, origin, env);
    }

    return jsonResponse({
      error: "All OpenRouter models failed",
      detail: cleanText(errors.join(" | "), 700),
    }, 502, origin, env);
  },
};
