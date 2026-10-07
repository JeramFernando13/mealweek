/* Schiscetta — menu settimanale, lista spesa, ricette e feedback.
   Dati statici in /data, stato personale (spunte e feedback) nel localStorage del browser. */
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const USER = (params.get("u") || "jerry").replace(/[^a-z0-9_-]/gi, "");
  const view = document.getElementById("view");
  const weekSelect = document.getElementById("week-select");

  const state = { profile: null, recipes: {}, index: null, week: null, weekId: null };

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage non disponibile */ } }
  };
  const key = (name) => `schiscetta:${USER}:${state.weekId}:${name}`;

  // ---------- utils ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = async (path) => {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${path} → ${r.status}`);
    return r.json();
  };
  const R = (id) => state.recipes[id];

  function todayIndex() {
    // weekId è la data della domenica di inizio (YYYY-MM-DD)
    const start = new Date(state.weekId + "T00:00:00");
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.round((now - start) / 86400000);
    return diff >= 0 && diff < 7 ? diff : -1;
  }

  function weekRecipeIds() {
    const w = state.week, ids = [];
    const add = (id) => { if (id && R(id) && !ids.includes(id)) ids.push(id); };
    w.days.forEach((d) => { add(d.lunch?.recipe); add(d.dinner?.recipe); });
    w.breakfasts.forEach((b) => add(b.recipe));
    w.snacks.recipes.forEach(add);
    return ids;
  }

  // ---------- views ----------
  function mealHTML(label, m) {
    if (!m || m.free) return `<div class="meal"><span class="meal-label">${label}</span><span class="free">Libero</span></div>`;
    const r = R(m.recipe);
    const pills = [];
    if (m.where) pills.push(`<span class="pill grey">${esc(m.where)}</span>`);
    if (m.leftover) pills.push(`<span class="pill left">avanzo di ieri</span>`);
    if (m.optional) pills.push(`<span class="pill grey">facoltativa</span>`);
    if (r && r.portions > 1 && !m.leftover) pills.push(`<span class="pill">${r.portions} porzioni</span>`);
    return `<div class="meal"><span class="meal-label">${label}</span><div>
      <a href="#ricetta/${esc(m.recipe)}">${esc(r ? r.name : m.recipe)}</a>
      ${pills.length ? `<div class="sub">${pills.join("")}</div>` : ""}
      ${m.note ? `<p class="hint">${esc(m.note)}</p>` : ""}
    </div></div>`;
  }

  function renderMenu() {
    const w = state.week, t = todayIndex();
    view.innerHTML = `
      <section>
        <h2>Menu della settimana</h2>
        <p class="lead">${esc(w.intro || "")}</p>
        ${w.season ? `<p class="note">${esc(w.season)}</p>` : ""}
      </section>
      <section class="days">
        ${w.days.map((d, i) => `
          <article class="day${i === t ? " today" : ""}">
            <div class="day-head"><h3>${esc(d.day)}</h3>${i === t ? `<span class="badge">Oggi</span>` : ""}</div>
            ${mealHTML("Pranzo", d.lunch)}
            ${mealHTML("Cena", d.dinner)}
          </article>`).join("")}
      </section>
      <section>
        <h2>Colazioni</h2>
        <div class="list">${w.breakfasts.map((b) => `
          <a class="row-link" href="#ricetta/${esc(b.recipe)}"><span>${esc(R(b.recipe)?.name)}</span><small>${esc(b.days)}</small></a>`).join("")}
        </div>
      </section>
      <section>
        <h2>Snack e merende</h2>
        <p class="lead">${esc(w.snacks.note)}</p>
        <div class="list">${w.snacks.recipes.map((id) => `
          <a class="row-link" href="#ricetta/${esc(id)}"><span>${esc(R(id)?.name)}</span><small>${R(id)?.protein ?? "–"} g prot.</small></a>`).join("")}
        </div>
      </section>
      <section>
        <h2>Organizzazione</h2>
        <ul class="plain">${w.prep.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
      </section>`;
  }

  function renderShopping(msg = "") {
    const w = state.week;
    const checked = store.get(key("spesa"), {});
    let total = 0, done = 0;
    w.shopping.forEach((g) => g.items.forEach(([n]) => { total++; if (checked[g.group + "|" + n]) done++; }));
    view.innerHTML = `
      <section>
        <h2>Lista della spesa</h2>
        <div class="progress"><div class="bar"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div><span class="count">${done}/${total}</span></div>
        <div class="actions">
          <button class="btn" type="button" id="copy-list">Copia come testo</button>
          <button class="btn" type="button" id="reset-list">Azzera spunte</button>
        </div>
        ${msg ? `<p class="toast" role="status">${esc(msg)}</p>` : ""}
      </section>
      ${w.shopping.map((g) => `
        <section class="group">
          <h3>${esc(g.group)}</h3>
          <div>${g.items.map(([n, q], i) => {
            const k = g.group + "|" + n, on = !!checked[k];
            const id = `chk-${w.shopping.indexOf(g)}-${i}`;
            return `<label class="check${on ? " done" : ""}" for="${id}">
              <input type="checkbox" id="${id}" data-k="${esc(k)}"${on ? " checked" : ""}>
              <span class="name">${esc(n)}</span>${q ? `<span class="qty">${esc(q)}</span>` : ""}
            </label>`;
          }).join("")}</div>
        </section>`).join("")}`;

    view.querySelectorAll("input[data-k]").forEach((el) => el.addEventListener("change", () => {
      const c = store.get(key("spesa"), {});
      el.checked ? (c[el.dataset.k] = 1) : delete c[el.dataset.k];
      store.set(key("spesa"), c);
      const y = window.scrollY; renderShopping(); window.scrollTo(0, y);
    }));
    view.querySelector("#reset-list").addEventListener("click", () => { store.set(key("spesa"), {}); renderShopping("Spunte azzerate."); });
    view.querySelector("#copy-list").addEventListener("click", () => {
      const text = `SPESA ${w.label.toUpperCase()}\n\n` + w.shopping.map((g) =>
        g.group.toUpperCase() + "\n" + g.items.map(([n, q]) => `${n}${q ? " " + q : ""}`).join("\n")).join("\n\n");
      copy(text, () => renderShopping("Lista copiata: incollala in Note o Keep."));
    });
  }

  function renderRecipes() {
    const ids = weekRecipeIds();
    const groups = [["pranzo", "Pranzi"], ["cena", "Cene"], ["colazione", "Colazioni"], ["snack", "Snack"]];
    view.innerHTML = `<section><h2>Ricette della settimana</h2><p class="lead">${ids.length} ricette. Tocca per ingredienti e passaggi.</p></section>` +
      groups.map(([cat, title]) => {
        const list = ids.filter((id) => R(id).category === cat);
        if (!list.length) return "";
        return `<section><h3>${title}</h3><div class="list">${list.map((id) => {
          const r = R(id);
          return `<a class="row-link" href="#ricetta/${esc(id)}"><span>${esc(r.name)}</span><small>${esc(r.time)} · ${r.protein} g prot.</small></a>`;
        }).join("")}</div></section>`;
      }).join("");
  }

  function renderRecipe(id) {
    const r = R(id);
    if (!r) { view.innerHTML = `<p class="error">Ricetta non trovata.</p>`; return; }
    view.innerHTML = `
      <a class="back" href="#ricette">← Tutte le ricette</a>
      <section>
        <h2>${esc(r.name)}</h2>
        <div class="sub chips">${r.tags.map((t) => `<span class="pill">${esc(t)}</span>`).join("")}</div>
        <div class="facts">
          <div class="fact"><b>${esc(r.time)}</b><span>Tempo</span></div>
          <div class="fact"><b>${r.portions}</b><span>Porzioni</span></div>
          <div class="fact"><b>~${r.kcal}</b><span>kcal / porz.</span></div>
          <div class="fact"><b>~${r.protein} g</b><span>Proteine / porz.</span></div>
        </div>
      </section>
      <section>
        <h3>Ingredienti${r.portions > 1 ? ` (per ${r.portions} porzioni)` : ""}</h3>
        <div class="ing">${r.ingredients.map(([q, n]) => `<div><b>${esc(q)}</b><span>${esc(n)}</span></div>`).join("")}</div>
      </section>
      <section>
        <h3>Preparazione</h3>
        <ol class="steps">${r.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join("")}</ol>
      </section>
      ${r.tips ? `<p class="note warm"><b>Consiglio:</b> ${esc(r.tips)}</p>` : ""}
      ${r.keeps ? `<p class="note"><b>Conservazione:</b> ${esc(r.keeps)}</p>` : ""}
      <a class="btn" href="#feedback" style="justify-self:start;text-decoration:none">Lascia un feedback su questa ricetta</a>`;
  }

  function renderFeedback(msg = "") {
    const fb = store.get(key("feedback"), { recipes: {}, week: {} });
    const ids = weekRecipeIds().filter((id) => ["pranzo", "cena"].includes(R(id).category));
    const extra = weekRecipeIds().filter((id) => !["pranzo", "cena"].includes(R(id).category));
    const card = (id) => {
      const f = fb.recipes[id] || {};
      return `<article class="fb" data-id="${esc(id)}">
        <div class="fb-head"><h3>${esc(R(id).name)}</h3>
          <div class="stars" role="group" aria-label="Voto">${[1, 2, 3, 4, 5].map((n) =>
            `<button type="button" data-star="${n}" class="${(f.stars || 0) >= n ? "on" : ""}" aria-label="${n} stelle">★</button>`).join("")}</div>
        </div>
        <div class="chips">${["Lo rifarei", "Così così", "Da togliere", "Non fatta"].map((c) =>
          `<button type="button" class="chip" data-again="${c}" aria-pressed="${f.again === c}">${c}</button>`).join("")}</div>
        <textarea id="note-${esc(id)}" rows="2" placeholder="Note: troppo salato, porzione piccola, difficile…">${esc(f.note || "")}</textarea>
      </article>`;
    };
    const wk = fb.week || {};
    view.innerHTML = `
      <section>
        <h2>Feedback della settimana</h2>
        <p class="lead">Vota le ricette e scrivi come è andata. A fine settimana tocca «Copia per Claude» e incolla il testo in chat: la settimana dopo terrà conto dei tuoi gusti.</p>
      </section>
      <section>
        <h3>Come stai</h3>
        <div class="grid2">
          <label class="field"><span>Peso (kg, la mattina)</span><input id="w-peso" inputmode="decimal" value="${esc(wk.peso || "")}" placeholder="es. 88,5"></label>
          <label class="field"><span>Energia (1-5)</span><input id="w-energia" inputmode="numeric" value="${esc(wk.energia || "")}" placeholder="es. 4"></label>
          <label class="field"><span>Fame tra i pasti (1-5)</span><input id="w-fame" inputmode="numeric" value="${esc(wk.fame || "")}" placeholder="es. 2"></label>
          <label class="field"><span>Allenamenti fatti</span><input id="w-allenamenti" inputmode="numeric" value="${esc(wk.allenamenti || "")}" placeholder="es. 3"></label>
        </div>
        <label class="field"><span>Note generali / richieste per la prossima settimana</span>
          <textarea id="w-note" rows="3" placeholder="es. più piatti di pesce, meno riso, voglio provare qualcosa di messicano…">${esc(wk.note || "")}</textarea></label>
      </section>
      <section><h3>Pranzi e cene</h3>${ids.map(card).join("")}</section>
      <section><h3>Colazioni e snack</h3>${extra.map(card).join("")}</section>
      <section>
        <div class="actions">
          <button class="btn primary" type="button" id="export">Copia per Claude</button>
        </div>
        ${msg ? `<p class="toast" role="status">${esc(msg)}</p>` : ""}
        <pre class="export" id="export-box" hidden></pre>
      </section>`;

    const save = (mut) => { const cur = store.get(key("feedback"), { recipes: {}, week: {} }); mut(cur); store.set(key("feedback"), cur); };

    view.querySelectorAll(".fb").forEach((el) => {
      const id = el.dataset.id;
      el.querySelectorAll("[data-star]").forEach((b) => b.addEventListener("click", () => {
        const n = +b.dataset.star;
        save((c) => { c.recipes[id] = { ...(c.recipes[id] || {}), stars: n }; });
        el.querySelectorAll("[data-star]").forEach((x) => x.classList.toggle("on", +x.dataset.star <= n));
      }));
      el.querySelectorAll("[data-again]").forEach((b) => b.addEventListener("click", () => {
        const v = b.dataset.again;
        save((c) => { c.recipes[id] = { ...(c.recipes[id] || {}), again: v }; });
        el.querySelectorAll("[data-again]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      }));
      el.querySelector("textarea").addEventListener("input", (e) => save((c) => { c.recipes[id] = { ...(c.recipes[id] || {}), note: e.target.value }; }));
    });
    ["peso", "energia", "fame", "allenamenti", "note"].forEach((f) => {
      view.querySelector("#w-" + f).addEventListener("input", (e) => save((c) => { c.week = { ...(c.week || {}), [f]: e.target.value }; }));
    });
    view.querySelector("#export").addEventListener("click", () => {
      const text = exportText();
      const box = view.querySelector("#export-box");
      box.textContent = text; box.hidden = false;
      copy(text, () => { const t = document.createElement("p"); t.className = "toast"; t.textContent = "Copiato. Incollalo nella chat con Claude."; box.before(t); },
        () => { const t = document.createElement("p"); t.className = "toast"; t.textContent = "Seleziona il testo qui sotto e copialo a mano."; box.before(t); });
    });
  }

  function exportText() {
    const fb = store.get(key("feedback"), { recipes: {}, week: {} });
    const w = fb.week || {};
    const lines = [`FEEDBACK SCHISCETTA · ${state.profile?.name || USER} · settimana ${state.week.label}`, ""];
    lines.push(`Peso: ${w.peso || "-"} kg · Energia: ${w.energia || "-"}/5 · Fame: ${w.fame || "-"}/5 · Allenamenti: ${w.allenamenti || "-"}`);
    if (w.note) lines.push(`Note generali: ${w.note}`);
    lines.push("", "Ricette:");
    weekRecipeIds().forEach((id) => {
      const f = fb.recipes[id];
      if (!f) return;
      lines.push(`- ${R(id).name}: ${f.stars ? f.stars + "/5" : "senza voto"}${f.again ? " · " + f.again : ""}${f.note ? " · " + f.note : ""}`);
    });
    return lines.join("\n");
  }

  function copy(text, ok, fail) {
    const fallback = () => { if (fail) fail(); else alertBox(text); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }
  function alertBox(text) {
    const pre = document.createElement("pre"); pre.className = "export"; pre.textContent = text;
    view.appendChild(pre);
  }

  // ---------- routing ----------
  function route() {
    if (!state.week) return;
    const h = location.hash.slice(1) || "menu";
    const [tab, arg] = h.split("/");
    const active = tab === "ricetta" ? "ricette" : tab;
    document.querySelectorAll(".tabs a").forEach((a) => { if (a.dataset.tab === active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    ({ menu: renderMenu, spesa: renderShopping, ricette: renderRecipes, feedback: renderFeedback }[tab] || (tab === "ricetta" ? () => renderRecipe(arg) : renderMenu))();
    window.scrollTo(0, 0);
  }

  async function loadWeek(id) {
    state.weekId = id;
    state.week = await getJSON(`data/users/${USER}/weeks/${id}.json`);
    route();
  }

  async function init() {
    try {
      const [profile, recipes, index] = await Promise.all([
        getJSON(`data/users/${USER}/profile.json`),
        getJSON("data/recipes.json"),
        getJSON(`data/users/${USER}/weeks/index.json`)
      ]);
      state.profile = profile; state.index = index;
      recipes.forEach((r) => { state.recipes[r.id] = r; });
      document.getElementById("who").textContent = `Menu di ${profile.name}`;

      weekSelect.innerHTML = index.weeks.map((w) => `<option value="${esc(w.id)}">${esc(w.label)}</option>`).join("");
      const start = index.current;
      weekSelect.value = start;
      weekSelect.addEventListener("change", () => loadWeek(weekSelect.value));
      window.addEventListener("hashchange", route);
      await loadWeek(start);
    } catch (e) {
      view.innerHTML = `<div class="error"><b>Impossibile caricare i dati.</b><br>
        Se hai aperto il file direttamente dal computer, avvia un server locale (vedi README) oppure usa la versione su GitHub Pages.<br><small>${esc(e.message)}</small></div>`;
    }
  }

  init();
})();
