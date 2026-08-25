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

  function renderCards(out, items) {
    out.innerHTML = "";
    items.slice(0, 3).forEach((item) => {
      const card = document.createElement("div");
      card.className = "gen-card";
      card.innerHTML = `<b>${escapeHtml(item.title || "نتيجة")}</b>${escapeHtml(item.text || "")}`;
      out.appendChild(card);
    });
  }

  function renderMessage(out, title, message) {
    out.innerHTML = "";
    const card = document.createElement("div");
    card.className = "gen-card";
    card.innerHTML = `<b>${escapeHtml(title)}</b>${escapeHtml(message)}`;
    out.appendChild(card);
  }

  function init() {
    const oldButton = document.getElementById("go");
    const bizInput = document.getElementById("biz");
    const cityInput = document.getElementById("city");
    const out = document.getElementById("out");

    if (!oldButton || !bizInput || !cityInput || !out) return;

    // Replace the button node to remove the old template-based click listener.
    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);

    button.addEventListener("click", async () => {
      const business = (bizInput.value || "").trim();
      const city = (cityInput.value || "الرباط").trim();

      if (!business) {
        renderMessage(out, "خاصنا نوع النشاط", "كتب مثلاً: مقهى، صالون حلاقة، متجر ملابس...");
        bizInput.focus();
        return;
      }

      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "كنولّدو النصوص...";
      button.setAttribute("aria-busy", "true");
      renderMessage(out, "الذكاء الاصطناعي خدام", "ثواني قليلة وغادي تظهر ليك 3 اقتراحات مخصّصة لنشاطك.");

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business, city }),
        });

        let data = null;
        try {
          data = await response.json();
        } catch (_) {
          throw new Error("الجواب ديال السيرفر ماكانش صالح.");
        }

        if (!response.ok || !data?.ok) {
          throw new Error(data?.detail || data?.error || "وقع مشكل فالخدمة.");
        }

        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
          throw new Error("الموديل ما رجّع حتى نتيجة.");
        }

        renderCards(out, items);
      } catch (error) {
        console.error("Qalam Studio AI generator error:", error);
        renderMessage(
          out,
          "تعذّر توليد النصوص",
          "جرّب من جديد بعد شوية. إلا بقا المشكل، تواصل معنا على واتساب."
        );
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
