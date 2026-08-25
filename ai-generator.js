(() => {
  const API_URL = "https://qalam-studio-ai.arabi-hbouregreg.workers.dev/api/generate";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addGeneratorStyles() {
    if (document.getElementById("qalam-ai-options-style")) return;
    const style = document.createElement("style");
    style.id = "qalam-ai-options-style";
    style.textContent = `
      .gen-details{flex:1 1 100%;display:grid;gap:7px}
      .gen-details label,.gen-option label{font-family:var(--util);font-size:.72rem;color:var(--muted)}
      .gen-details textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:82px;background:var(--night);border:1px solid var(--line);color:var(--paper);font-family:var(--body);font-size:.94rem;line-height:1.7;padding:13px 14px;border-radius:2px}
      .gen-details textarea::placeholder{color:var(--muted);opacity:.85}
      .gen-details textarea:focus-visible,.gen-option select:focus-visible{outline:2px solid var(--saffron);outline-offset:2px}
      .gen-options{flex:1 1 100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .gen-option{display:grid;gap:7px}
      .gen-option select{width:100%;background:var(--night);border:1px solid var(--line);color:var(--paper);font-family:var(--body);font-size:.94rem;padding:13px 14px;border-radius:2px;cursor:pointer}
      .gen-card-text{white-space:pre-line}
      .reel-parts{display:grid;gap:9px;margin-top:12px}
      .reel-part{display:grid;grid-template-columns:minmax(86px,auto) 1fr;gap:10px;align-items:start;padding:9px 10px;background:rgba(255,255,255,.025);border:1px solid var(--line)}
      .reel-part-label{font-family:var(--util);font-size:.68rem;font-weight:700;letter-spacing:.04em;color:var(--saffron);direction:ltr;text-align:left}
      .reel-part-text{font-family:var(--body);line-height:1.75;color:var(--paper)}
      @media(max-width:720px){.gen-options{grid-template-columns:1fr}.reel-part{grid-template-columns:1fr;gap:4px}.reel-part-label{text-align:right}}
    `;
    document.head.appendChild(style);
  }

  function makeSelect(id, label, options) {
    const wrap = document.createElement("div");
    wrap.className = "gen-option";

    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const select = document.createElement("select");
    select.id = id;
    select.setAttribute("aria-label", label);

    options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });

    wrap.append(labelEl, select);
    return { wrap, select };
  }

  function makeDetailsField() {
    const wrap = document.createElement("div");
    wrap.id = "qalam-ai-details";
    wrap.className = "gen-details";

    const label = document.createElement("label");
    label.htmlFor = "details";
    label.textContent = "تفاصيل النشاط / نقاط القوة (اختياري)";

    const textarea = document.createElement("textarea");
    textarea.id = "details";
    textarea.rows = 3;
    textarea.maxLength = 500;
    textarea.setAttribute("aria-label", label.textContent);
    textarea.placeholder = "مثال: أكل مغربي تقليدي، كسكس الجمعة، مناسب للعائلات، توصيل داخل الرباط... كتب غير المعلومات الحقيقية.";

    wrap.append(label, textarea);
    return { wrap, textarea };
  }

  function installOptions(form, button) {
    let details = document.getElementById("details");
    let optionsWrap = document.getElementById("qalam-ai-options");

    if (!details) {
      const detailsField = makeDetailsField();
      details = detailsField.textarea;
      form.insertBefore(detailsField.wrap, button);
    }

    if (optionsWrap) {
      return {
        details,
        contentType: document.getElementById("contentType"),
        tone: document.getElementById("tone"),
        language: document.getElementById("language"),
      };
    }

    optionsWrap = document.createElement("div");
    optionsWrap.id = "qalam-ai-options";
    optionsWrap.className = "gen-options";

    const content = makeSelect("contentType", "نوع المحتوى", [
      ["mixed", "3 اقتراحات متنوعة"],
      ["caption", "Caption للسوشيال ميديا"],
      ["reel", "Hook / Reel قصير"],
      ["ad", "إعلان قصير"],
      ["product", "وصف منتج أو خدمة"],
    ]);

    const tone = makeSelect("tone", "النبرة", [
      ["professional", "احترافية"],
      ["friendly", "ودّية وقريبة"],
      ["luxury", "فاخرة وراقية"],
      ["direct", "مباشرة وبيعية"],
      ["playful", "خفيفة وإبداعية"],
    ]);

    const language = makeSelect("language", "اللغة", [
      ["darija", "الدارجة المغربية"],
      ["ar", "العربية"],
      ["fr", "Français"],
      ["en", "English"],
    ]);

    optionsWrap.append(content.wrap, tone.wrap, language.wrap);
    form.insertBefore(optionsWrap, button);

    return {
      details,
      contentType: content.select,
      tone: tone.select,
      language: language.select,
    };
  }

  function reelPart(label, value) {
    if (!value) return "";
    return `<div class="reel-part"><span class="reel-part-label">${escapeHtml(label)}</span><span class="reel-part-text">${escapeHtml(value)}</span></div>`;
  }

  function renderCards(out, items) {
    out.innerHTML = "";
    items.slice(0, 3).forEach((item) => {
      const card = document.createElement("div");
      card.className = "gen-card";

      const hasReelParts = item && (item.hook || item.retention || item.payoff || item.cta);
      if (hasReelParts) {
        card.innerHTML = `
          <b>${escapeHtml(item.title || "فكرة Reel")}</b>
          <div class="reel-parts">
            ${reelPart("HOOK", item.hook)}
            ${reelPart("RETENTION", item.retention)}
            ${reelPart("PAYOFF", item.payoff)}
            ${reelPart("CTA", item.cta)}
          </div>`;
      } else {
        card.innerHTML = `<b>${escapeHtml(item.title || "نتيجة")}</b><div class="gen-card-text">${escapeHtml(item.text || "")}</div>`;
      }
      out.appendChild(card);
    });
  }

  function renderMessage(out, title, message) {
    out.innerHTML = "";
    const card = document.createElement("div");
    card.className = "gen-card";
    card.innerHTML = `<b>${escapeHtml(title)}</b><div class="gen-card-text">${escapeHtml(message)}</div>`;
    out.appendChild(card);
  }

  function init() {
    const oldButton = document.getElementById("go");
    const bizInput = document.getElementById("biz");
    const cityInput = document.getElementById("city");
    const out = document.getElementById("out");
    const form = oldButton?.closest(".gen-form");

    if (!oldButton || !bizInput || !cityInput || !out || !form) return;

    addGeneratorStyles();

    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.textContent = "ولّد المحتوى";

    const controls = installOptions(form, button);

    button.addEventListener("click", async () => {
      const business = (bizInput.value || "").trim();
      const city = (cityInput.value || "الرباط").trim();
      const details = (controls.details?.value || "").trim().slice(0, 500);
      const contentType = controls.contentType?.value || "mixed";
      const tone = controls.tone?.value || "professional";
      const language = controls.language?.value || "darija";

      if (!business) {
        renderMessage(out, "خاصنا نوع النشاط", "كتب مثلاً: مقهى، صالون حلاقة، متجر ملابس...");
        bizInput.focus();
        return;
      }

      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "كنولّدو المحتوى...";
      button.setAttribute("aria-busy", "true");
      renderMessage(out, "الذكاء الاصطناعي خدام", "ثواني قليلة وغادي تظهر ليك 3 اقتراحات مبنية غير على المعلومات اللي عطيتينا.");

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business, city, details, contentType, tone, language }),
        });

        let data = null;
        try {
          data = await response.json();
        } catch (_) {
          throw new Error("الجواب ديال السيرفر ماكانش صالح.");
        }

        if (!response.ok || !data?.ok) {
          throw new Error(data?.detail || data?.error || `HTTP ${response.status}`);
        }

        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
          throw new Error("الموديل ما رجّع حتى نتيجة.");
        }

        renderCards(out, items);
      } catch (error) {
        console.error("Qalam Studio AI generator error:", error);
        const detail = String(error?.message || "خطأ غير معروف").slice(0, 700);
        renderMessage(out, "تعذّر توليد المحتوى — تفاصيل تقنية", detail);
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
        button.removeAttribute("aria-busy");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
