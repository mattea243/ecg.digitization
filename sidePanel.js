/* ============================================================
      sidePanel.js — Overlay panels for side tool buttons
      More Leads | Single Beat | VCG | Rings | Measurements | Intervals
      ============================================================ */

(function () {

    const style = document.createElement("style");
    style.textContent = `
        #sidePanelOverlay {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(255,255,255,0.97);
            border: 2px solid #0a66c2;
            border-radius: 6px;
            z-index: 100;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        }
        #sidePanelOverlay.visible { display: flex; }
 
        #sidePanelHeader {
            background: #0a66c2; color: white;
            padding: 10px 16px; display: flex;
            align-items: center; justify-content: space-between;
            font-size: 15px; font-weight: bold; flex-shrink: 0;
        }
        #sidePanelClose {
            background: none; border: none; color: white;
            font-size: 20px; cursor: pointer; padding: 0 4px;
        }
        #sidePanelClose:hover { opacity: 0.75; }
        #sidePanelBody { flex: 1; overflow-y: auto; padding: 14px; }
 
        .sp-title {
            font-size: 11px; font-weight: bold; color: #0a66c2;
            border-bottom: 1px solid #dce3ec;
            padding-bottom: 3px; margin: 12px 0 7px;
            text-transform: uppercase; letter-spacing: 0.5px;
        }
        .sp-info { font-size: 11px; color: #666; margin: 0 0 10px; }
        .sp-disclaimer { font-size: 10px; color: #bbb; margin-top: 10px; }
        .sp-hint { font-size: 10px; color: #999; margin-bottom: 6px; }
 
        .sp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .sp-grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }
 
        .sp-card {
            background: #f4f8fb; border: 1px solid #c8dff0;
            border-radius: 7px; padding: 8px;
        }
        .sp-lead-name { font-size: 11px; font-weight: bold; color: #0a66c2; margin-bottom: 3px; }
        .sp-card canvas { display: block; width: 100%; height: auto; border: none; }
 
        .sp-meas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
        .sp-meas-card {
            background: #f4f8fb; border: 1px solid #c8dff0;
            border-radius: 8px; padding: 10px 12px; text-align: center;
        }
        .sp-meas-label { font-size: 10px; color: #888; margin-bottom: 2px; }
        .sp-meas-val   { font-size: 24px; font-weight: bold; color: #0a66c2; line-height: 1.1; }
        .sp-meas-unit  { font-size: 10px; color: #888; }
        .sp-ok   { color: #28a745; font-size: 10px; font-weight: bold; }
        .sp-warn { color: #dc3545; font-size: 10px; font-weight: bold; }
 
        .sp-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        .sp-table th { background: #0a66c2; color: white; padding: 7px 9px; text-align: left; font-size: 11px; }
        .sp-table td { padding: 7px 9px; border-bottom: 1px solid #eee; }
        .sp-table tr:nth-child(even) td { background: #f4f8fb; }
        .sp-table-green th { background: #28a745; }
 
        .sp-no-data { text-align: center; color: #aaa; padding: 40px 16px; font-size: 13px; }
        .sp-no-data span { font-size: 36px; display: block; margin-bottom: 10px; }
 
        .sp-beat-canvas-wrap { margin-bottom: 10px; }
        .sp-beat-canvas-wrap canvas { display: block; width: 100%; height: auto; border: 1px solid #dce3ec; border-radius: 6px; }
 
        /* Ова ќе спречи картичките да се шират бесконечно */
.sp-vcg-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
    gap: 12px; 
    justify-content: center; /* Центрирање ако има премногу простор */
}
 
.sp-vcg-card { 
    background: #f4f8fb; 
    border: 1px solid #c8dff0; 
    border-radius: 7px; 
    padding: 12px; 
    max-width: 450px; /* Ова е клучот - спречува претерано растегнување */
    margin: 0 auto;  /* Ги држи центрирани во нивната колона */
}
 
.sp-vcg-card canvas { 
    display: block; 
    width: 100%; 
    height: auto; 
    border: none; 
}
.sp-vcg-card-title { font-size: 10px; font-weight: bold; color: #0a66c2; margin-bottom: 4px; text-align: center; }
 
       .sp-rings-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    overflow: auto;
}
      /* Променете го овој дел во style.textContent */
.sp-rings-wrap canvas {
    display: block;
    width: 100%;       /* Го користи целиот достапен простор */
    height: auto;      /* Ја одржува пропорцијата */
    max-width: 650px;  /* Можете да ја зголемите оваа вредност по желба */
    max-height: 70vh;  /* Спречува да биде преголемо за екранот */
    object-fit: contain;
}
        .sp-rings-legend { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; font-size: 11px; }
        .sp-rings-legend-item { display: flex; align-items: center; gap: 4px; }
        .sp-rings-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
 
       /* Додадете го ова во делот со стилови (CSS) */
.sp-tacho-wrap { 
    margin: 15px 0; 
    background: #fdfdfd;
    border: 1px solid #dce3ec; 
    border-radius: 6px;
    padding: 10px;
}
 
.sp-tacho-wrap canvas { 
    display: block; 
    width: 100%; 
    height: 180px; /* Фиксна висина за да не изгледа растегнато */
    object-fit: contain; 
}
    `;
    document.head.appendChild(style);

    /* ── BUILD OVERLAY ── */
    document.addEventListener("DOMContentLoaded", function () {
        const wrapper = document.querySelector(".canvas-wrapper");
        if (!wrapper) { console.warn("sidePanel: .canvas-wrapper not found"); return; }

        const overlay = document.createElement("div");
        overlay.id = "sidePanelOverlay";
        overlay.innerHTML = `
            <div id="sidePanelHeader">
                <span id="sidePanelTitle">Panel</span>
                <button id="sidePanelClose">✕</button>
            </div>
            <div id="sidePanelBody"></div>`;
        wrapper.appendChild(overlay);

        document.getElementById("sidePanelClose").onclick = closePanel;
        document.querySelectorAll(".tool-btn").forEach(btn => {
            btn.addEventListener("click", () => openPanel(btn.textContent.trim()));
        });
    });

    function openPanel(label) {
        document.getElementById("sidePanelTitle").textContent = label;
        const body = document.getElementById("sidePanelBody");
        body.innerHTML = "";
        switch (label) {
            case "More Leads":   renderMoreLeads(body);   break;
            case "Single Beat":  renderSingleBeat(body);  break;
            case "VCG":          renderVCG(body);         break;
            case "Rings":        renderRings(body);       break;
            case "Measurements": renderMeasurements(body);break;
            case "Intervals":    renderIntervals(body);   break;
            default: body.innerHTML = `<div class="sp-no-data"><span>🔧</span>${label} coming soon.</div>`;
        }
        document.getElementById("sidePanelOverlay").classList.add("visible");
    }

    function closePanel() {
        document.getElementById("sidePanelOverlay").classList.remove("visible");
    }

    /* ── DATA ── */
    function getData()     { return window._xmlEcgData || null; }
    /* Оваа функција во sidePanel.js е клучот за универзалност */
    function getSR() {
        const d = getData();
        // Ако во XML-от пишува 250, ќе врати 250. Ако пишува 1000, ќе врати 1000.
        return d ? (d.sampleRate || 500) : 500;
    }

    function getLeads()    { const d = getData(); return d ? d.leads : null; }
    function getSR()       { const d = getData(); return d ? (d.sampleRate || 500) : 500; }
    function getLead(name) { const l = getLeads(); return l ? (l.find(x => x.name === name) || null) : null; }

    function noData(body) {
        body.innerHTML = `<div class="sp-no-data"><span>📂</span>Upload an ECG XML file to use this feature.</div>`;
    }
    function secTitle(body, t) {
        const e = document.createElement("div");
        e.className = "sp-title";
        e.textContent = t;
        body.appendChild(e);
    }

    /* ════════════════════════════════
       CANVAS HELPER — NO devicePixelRatio tricks
       Just set width/height directly, CSS does width:100%
    ════════════════════════════════ */
    function mkCanvas(w, h) {
        const cv = document.createElement("canvas");
        cv.width  = w;
        cv.height = h;
        return cv;
    }

    function isDark() {
        return document.body.classList.contains("dark-mode");
    }

    /* Draw ECG trace — uses cv.width/cv.height directly */
    function traceOnCanvas(cv, samples, color, grid) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        const n = samples.length;
        if (!n) return;

        const dark = isDark();
        const bgColor    = dark ? "#1a1a1b" : "#fff5f5";
        const gridLight  = dark ? "rgba(180,60,60,0.12)" : "rgba(220,60,60,0.15)";
        const gridHeavy  = dark ? "rgba(180,40,40,0.22)" : "rgba(200,40,40,0.25)";
        const traceColor = dark ? "#ffffff" : (color || "#0a66c2");

        if (grid) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, W, H);
            const sq = W / 50;
            ctx.strokeStyle = gridLight; ctx.lineWidth = 0.5;
            for (let x = 0; x <= W; x += sq) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
            for (let y = 0; y <= H; y += sq) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
            ctx.strokeStyle = gridHeavy; ctx.lineWidth = 0.8;
            for (let x = 0; x <= W; x += sq*5) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
            for (let y = 0; y <= H; y += sq*5) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
        } else {
            ctx.fillStyle = dark ? "#1e1e1e" : "#f8fbff";
            ctx.fillRect(0, 0, W, H);
        }

        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i < n; i++) {
            if (samples[i] < mn) mn = samples[i];
            if (samples[i] > mx) mx = samples[i];
        }
        const range = mx - mn || 1;
        const padY = H * 0.12;
        const midY = H / 2;
        const mvScale = (H - padY * 2) / range;

        ctx.strokeStyle = traceColor;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        const step = Math.max(1, Math.floor(n / W));
        for (let i = 0; i < n; i += step) {
            const px = (i / (n - 1)) * W;
            const py = midY - (samples[i] - (mx + mn) / 2) * mvScale;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
    }


    function markR(cv, samples, rIdx) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height, n = samples.length;
        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i < n; i++) { if (samples[i]<mn) mn=samples[i]; if (samples[i]>mx) mx=samples[i]; }
        const range = mx - mn || 1;
        const padY = H * 0.12;
        const px = (rIdx / (n - 1)) * W;
        const py = padY + ((mx - samples[rIdx]) / range) * (H - padY * 2);
        ctx.fillStyle = "#e63946";
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.font = "bold 12px Arial";
        ctx.fillText("R", px + 7, py - 5);
    }

    /* ════════════════════════
       MORE LEADS
    ════════════════════════ */
    function renderMoreLeads(body) {
        const leads = getLeads();
        if (!leads || leads.length < 4) { noData(body); return; }

        const lm = {};
        leads.forEach(l => { lm[l.name] = l.samples; });

        const derived = [];
        ["V3","V4","V5","V6"].forEach(n => {
            if (lm[n]) derived.push({ name: n+"R", samples: scaleArr(lm[n], -1), group: "right" });
        });
        if (lm["V5"] && lm["V6"])
            derived.push({ name:"V7", samples: mixArr(lm["V5"],lm["V6"],0.5,0.5), group:"posterior" });
        if (lm["V6"] && lm["aVF"])
            derived.push({ name:"V8", samples: mixArr(lm["V6"],lm["aVF"],0.6,0.4), group:"posterior" });
        if (lm["aVF"])
            derived.push({ name:"V9", samples: scaleArr(lm["aVF"],-0.9), group:"posterior" });
        if (lm["V1"] && lm["V2"]) {
            derived.push({ name:"V1+1", samples: mixArr(lm["V1"],lm["V2"],0.7,0.3), group:"elevated" });
            derived.push({ name:"V2+1", samples: mixArr(lm["V2"],lm["V1"],0.7,0.3), group:"elevated" });
        }

        if (!derived.length) { noData(body); return; }

        body.innerHTML = `<p class="sp-info">Additional leads derived from the standard 12-lead ECG using mathematical transformations.</p>`;

        [
            { key:"right",     title:"Right-Sided Leads (V3R – V6R)" },
            { key:"posterior", title:"Posterior Leads (V7 – V9)" },
            { key:"elevated",  title:"Elevated Leads" },
        ].forEach(g => {
            const items = derived.filter(d => d.group === g.key);
            if (!items.length) return;
            secTitle(body, g.title);
            const grid = document.createElement("div");
            grid.className = "sp-grid2";
            items.forEach(lead => {
                const card = document.createElement("div");
                card.className = "sp-card";
                card.innerHTML = `<div class="sp-lead-name">${lead.name}</div>`;
                const cv = mkCanvas(400, 80);
                traceOnCanvas(cv, lead.samples, "#0a66c2", true);
                card.appendChild(cv);
                grid.appendChild(card);
            });
            body.appendChild(grid);
        });
    }

    function normalizeLeadName(name) {

        if (!name) return "";

        name = name.trim().toUpperCase();

        // remove common prefixes
        name = name.replace("LEAD ", "");
        name = name.replace("ECG ", "");

        // normalize augmented leads
        if (name === "AVR") return "aVR";
        if (name === "AVL") return "aVL";
        if (name === "AVF") return "aVF";

        // normalize chest leads
        if (name === "V01") return "V1";
        if (name === "V02") return "V2";
        if (name === "V03") return "V3";
        if (name === "V04") return "V4";
        if (name === "V05") return "V5";
        if (name === "V06") return "V6";

        return name;
    }


    /* ════════════════════════
       SINGLE BEAT
    ════════════════════════ */
    function renderSingleBeat(body) {
        const leads = getLeads();
        if (!leads || leads.length < 2) { noData(body); return; }

        const sr = getSR();
        const leadII = getLead("II") || leads[1] || leads[0];
        const samples = leadII.samples;
        const rPeaks = findRPeaks(samples, sr);

        body.innerHTML = "";

        const beatWrap = document.createElement("div");
        beatWrap.className = "sp-beat-canvas-wrap";
        const beatCv = mkCanvas(600, 180);
        beatWrap.appendChild(beatCv);
        body.appendChild(beatWrap);

        // DRAW IMMEDIATELY after appending to DOM
        if (rPeaks.length < 2) {
            traceOnCanvas(beatCv, samples.slice(0, Math.min(samples.length, sr*5)), "#0a66c2", true);
            body.innerHTML += `<div class="sp-no-data" style="padding:14px">⚠ Could not detect clear QRS complexes.</div>`;
            return;
        }

        const pre   = Math.round(sr * 0.35);  // беше 0.20
        const post  = Math.round(sr * 0.65);  // беше 0.55
        const rIdx  = rPeaks[Math.floor(rPeaks.length / 2)];
        const slice = samples.slice(Math.max(0, rIdx - pre), Math.min(samples.length, rIdx + post));

        traceOnCanvas(beatCv, slice, "#0a66c2", true);
        markR(beatCv, slice, Math.min(pre, rIdx));

        const avgRR = calcAvgRR(rPeaks, sr);
        const hrBpm = avgRR ? Math.round(60000 / avgRR) : null;
        const prMs  = calcPR(samples, sr, rPeaks);
        const qrsMs = calcQRS(samples, sr, rPeaks);
        const qtMs  = calcQT(samples, sr, rPeaks);
        const qtcMs = avgRR && qtMs ? Math.round(qtMs / Math.sqrt(avgRR / 1000)) : null;

        const info = document.createElement("p");
        info.className = "sp-info";
        info.style.textAlign = "center";
        info.innerHTML = `Representative beat — Lead <b>${leadII.name}</b> &nbsp;|&nbsp; HR: <b>${hrBpm || "—"} bpm</b> &nbsp;|&nbsp; Beats detected: <b>${rPeaks.length}</b>`;
        body.appendChild(info);

        const mg = document.createElement("div");
        mg.className = "sp-meas-grid";
        [
            { label:"P Duration",   val: prMs ? Math.round(prMs*0.28) : null, unit:"ms", lo:60,  hi:120, sfx: v => v<=120?"Normal":"Prolonged" },
            { label:"PR Interval",  val: prMs,  unit:"ms", lo:120, hi:200, sfx: v => v<120?"Short":v<=200?"Normal":"Long" },
            { label:"QRS Duration", val: qrsMs, unit:"ms", lo:0,   hi:120, sfx: v => v<=120?"Normal":"Wide" },
            { label:"QTc Interval", val: qtcMs, unit:"ms", lo:0,   hi:450, sfx: v => v<=450?"Normal":"Prolonged" },
        ].forEach(m => {
            const ok = m.val !== null && m.val >= m.lo && m.val <= m.hi;
            const card = document.createElement("div");
            card.className = "sp-meas-card";
            card.innerHTML = `
            <div class="sp-meas-label">${m.label}</div>
            <div class="sp-meas-val">${m.val !== null ? m.val : "—"}</div>
            <div class="sp-meas-unit">${m.unit}&nbsp;<span class="${ok?'sp-ok':'sp-warn'}">${m.val!==null?m.sfx(m.val):""}</span></div>`;
            mg.appendChild(card);
        });
        body.appendChild(mg);

        // All leads - append card to DOM FIRST, then draw

        // All leads in STANDARD ECG layout

        // --- ЗАМЕНА ЗАПОЧНУВА ТУКА ---
        // --- СТАРТ НА ЗАМЕНА (Линија 370 - 443) ---
        if (leads && leads.length > 0) {
            secTitle(body, "All Leads — Full Signal");

            const ag = document.createElement("div");
            ag.className = "sp-grid4";
            body.appendChild(ag);

            // Листа на одводи по стандарден медицински редослед
            const targetNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

            targetNames.forEach(tName => {
                // Бараме во оригиналните податоци за да го најдеме точниот сигнал
                const foundLead = leads.find(l => {
                    const lName = String(l.name || l.label || l.id || "").toUpperCase();
                    const cleanLName = lName.replace(/^MDC_ECG_LEAD_/i, "").replace(/^LEAD\s*/i, "").trim();

                    if (tName.toUpperCase() === cleanLName) return true;
                    // Специјални случаи за aVR, aVL, aVF
                    if (tName.toLowerCase() === cleanLName.toLowerCase()) return true;
                    return false;
                });

                const card = document.createElement("div");
                card.className = "sp-card";
                card.innerHTML = `<div class="sp-lead-name">${tName}</div>`;

                const cv = mkCanvas(240, 90);
                card.appendChild(cv);
                ag.appendChild(card);

                if (foundLead && foundLead.samples) {
                    // Цртање на специфичните samples за пронајдениот одвод
                    const ctx = cv.getContext("2d");
                    // Го користиме traceOnCanvas но со експлицитни податоци
                    traceOnCanvas(cv, foundLead.samples, "#0a66c2", true);
                } else {
                    // Ако одводот не е пронајден во XML-от
                    const ctx = cv.getContext("2d");
                    ctx.fillStyle = "#fff5f5";
                    ctx.fillRect(0, 0, cv.width, cv.height);
                    ctx.fillStyle = "#bbb";
                    ctx.textAlign = "center";
                    ctx.font = "10px Arial";
                    ctx.fillText("N/A", cv.width / 2, cv.height / 2);
                }
            });
        }
        // --- КРАЈ НА ЗАМЕНА ---
        // --- ЗАМЕНА ЗАВРШУВА ТУКА ---

        const disc = document.createElement("p");
        disc.className = "sp-disclaimer";
        disc.textContent = "⚠ Automated measurements — clinical interpretation required.";
        body.appendChild(disc);
    }

    /* ════════════════════════
       VCG
    ════════════════════════ */
    function renderVCG(body) {
        const leads = getLeads();
        console.log("LEADS:", leads);

        leads.forEach((l, i) => {
            console.log(
                "INDEX:", i,
                "NAME:", l.name,
                "LABEL:", l.label,
                "ID:", l.id,
                "LEADNAME:", l.leadName,
                l
            );
        });
        if (!leads || leads.length < 6) { noData(body); return; }

        const lm = {};
        leads.forEach(l => { lm[l.name] = l.samples; });

        if (!lm["I"] || !lm["II"] || !lm["V1"]) {
            body.innerHTML = `<div class="sp-no-data"><span>⚠</span>VCG requires leads I, II, V1–V6.</div>`;
            return;
        }

        const n = leads[0].samples.length;
        const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
        const g = name => lm[name] || new Float32Array(n);

        for (let i = 0; i < n; i++) {
            X[i] = -0.172*g("V1")[i] - 0.074*g("V2")[i] + 0.122*g("V4")[i]
                + 0.231*g("V5")[i] + 0.239*g("V6")[i] + 0.194*g("I")[i] + 0.156*g("II")[i];
            Y[i] =  0.057*g("V1")[i] - 0.019*g("V2")[i] - 0.106*g("V4")[i]
                - 0.022*g("V5")[i] + 0.041*g("V6")[i] - 0.227*g("I")[i] + 0.887*g("aVF")[i];
            Z[i] =  0.229*g("V1")[i] + 0.310*g("V2")[i] - 0.246*g("V4")[i]
                - 0.063*g("V5")[i] + 0.055*g("V6")[i] + 0.022*g("I")[i] + 0.102*g("II")[i];
        }

        body.innerHTML = `<p class="sp-info">Vectorcardiogram derived via Kors transform from the 12-lead ECG.</p>`;
        const vg = document.createElement("div");
        vg.className = "sp-vcg-grid";

        [
            { title:"Frontal Loop (X vs Y)",    xd:X, yd:Y, xl:"X", yl:"Y" },
            { title:"Transverse Loop (X vs Z)", xd:X, yd:Z, xl:"X", yl:"Z" },
            { title:"Sagittal Loop (Y vs Z)",   xd:Y, yd:Z, xl:"Y", yl:"Z" },
        ].forEach(loop => {
            const card = document.createElement("div");
            card.className = "sp-vcg-card";
            card.innerHTML = `<div class="sp-vcg-card-title">${loop.title}</div>`;
            // Во функцијата renderVCG, променете ги димензиите тука:
            const cv = mkCanvas(400, 400); // Поголема и поквадратна резолуција за подобар приказ
            drawLoop(cv, loop.xd, loop.yd, loop.xl, loop.yl);
            card.appendChild(cv);
            vg.appendChild(card);
        });

        const lc = document.createElement("div");
        lc.className = "sp-vcg-card";
        lc.innerHTML = `<div class="sp-vcg-card-title">Vector Leads (X, Y, Z)</div>`;
        const lcv = mkCanvas(280, 200);
        drawXYZ(lcv, X, Y, Z);
        lc.appendChild(lcv);
        vg.appendChild(lc);
        body.appendChild(vg);
    }

    function drawLoop(cv, xData, yData, lx, ly) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height, pad = 24;
        ctx.fillStyle = isDark() ? "#1a1a1b" : "#f8fbff"; ctx.fillRect(0,0,W,H);

        ctx.strokeStyle = isDark() ? "rgba(100,160,255,0.25)" : "rgba(10,102,194,0.08)"; ctx.lineWidth = 0.5;
        for (let i = 1; i < 4; i++) {
            const gx = pad+(W-pad*2)*i/4, gy = pad+(H-pad*2)*i/4;
            ctx.beginPath(); ctx.moveTo(gx,pad); ctx.lineTo(gx,H-pad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad,gy); ctx.lineTo(W-pad,gy); ctx.stroke();
        }
        ctx.strokeStyle = isDark() ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad,H/2); ctx.lineTo(W-pad,H/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W/2,pad); ctx.lineTo(W/2,H-pad); ctx.stroke();

        let maxV = 0;
        for (let i = 0; i < xData.length; i++) maxV = Math.max(maxV, Math.abs(xData[i]), Math.abs(yData[i]));
        maxV = maxV || 1;
        const sx = (W/2-pad)/maxV, sy = (H/2-pad)/maxV;

        const step = Math.max(1, Math.floor(xData.length / 1000));
        ctx.beginPath();
        for (let i = 0; i < xData.length; i += step) {
            const px = W/2 + xData[i]*sx, py = H/2 - yData[i]*sy;
            i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
        }
        const grad = ctx.createLinearGradient(0,0,W,H);
        grad.addColorStop(0,"#e63946"); grad.addColorStop(0.5,"#0a66c2"); grad.addColorStop(1,"#28a745");
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();

        const ex = W/2+xData[xData.length-1]*sx, ey = H/2-yData[yData.length-1]*sy;
        ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.arc(ex,ey,3,0,Math.PI*2); ctx.fill();

        ctx.fillStyle = isDark() ? "#aaa" : "#888"; ctx.font = "11px Arial";
        ctx.fillText(lx, W-pad-20, H/2-4);
        ctx.fillText(ly, W/2+4, pad+11);
    }

    function drawXYZ(cv, X, Y, Z) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        ctx.fillStyle = isDark() ? "#1a1a1b" : "#f8fbff"; ctx.fillRect(0,0,W,H);
        [{d:X,c:"#e63946",l:"X"},{d:Y,c:"#0a66c2",l:"Y"},{d:Z,c:"#28a745",l:"Z"}].forEach((t,i) => {
            const rH = H/3, y0 = i*rH, n = t.d.length;
            let mn=Infinity,mx=-Infinity;
            for (let j=0;j<n;j++){if(t.d[j]<mn)mn=t.d[j];if(t.d[j]>mx)mx=t.d[j];}
            const range=mx-mn||1, pad=rH*0.1;
            ctx.strokeStyle=t.c; ctx.lineWidth=1.3; ctx.beginPath();
            const step=Math.max(1,Math.floor(n/W));
            for (let j=0;j<n;j+=step){
                const px=(j/(n-1))*W, py=y0+pad+((mx-t.d[j])/range)*(rH-pad*2);
                j===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
            }
            ctx.stroke();
            ctx.fillStyle=t.c; ctx.font="bold 11px Arial"; ctx.fillText(t.l,5,y0+13);
            if(i<2){
                ctx.strokeStyle="rgba(0,0,0,0.07)"; ctx.lineWidth=0.5;
                ctx.beginPath(); ctx.moveTo(0,(i+1)*rH); ctx.lineTo(W,(i+1)*rH); ctx.stroke();
            }
        });
    }

    /* ════════════════════════
       RINGS
    ════════════════════════ */
    function renderRings(body) {
        const leads = getLeads();
        if (!leads || leads.length < 2) { noData(body); return; }

        body.innerHTML = `<p class="sp-info">Polar ring visualization — each ring arc represents the RMS amplitude of a lead.</p>`;
        const wrap = document.createElement("div");
        wrap.className = "sp-rings-wrap";

        // Зголемена резолуција за цртање (пр. 800x800 пиксели)
        const renderSize = 800;
        const cv = mkCanvas(renderSize, renderSize);

        wrap.appendChild(cv);
        // ... остатокот од кодот останува ист
        const leg = document.createElement("div");
        leg.className = "sp-rings-legend";
        wrap.appendChild(leg);
        body.appendChild(wrap);

        const colors = ["#e63946","#0a66c2","#28a745","#f4a261","#9b59b6","#1abc9c",
            "#e67e22","#3498db","#e91e63","#00bcd4","#8bc34a","#ff5722"];
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height, cxc = W/2, cyc = H/2;
        const maxR = Math.min(cxc, cyc) - 24;

        ctx.fillStyle = isDark() ? "#1a1a1b" : "#f8fbff"; ctx.fillRect(0,0,W,H);

        const nLeads = Math.min(leads.length, 12);
        const rmsArr = leads.slice(0, nLeads).map(lead => {
            let s = 0;
            for (let i = 0; i < lead.samples.length; i++) s += lead.samples[i] ** 2;
            return Math.sqrt(s / lead.samples.length);
        });
        const maxRMS = Math.max(...rmsArr) || 1;
        const aStep = (Math.PI * 2) / nLeads;

        ctx.strokeStyle = isDark() ? "rgba(100,160,255,0.3)" : "rgba(10,102,194,0.08)"; ctx.lineWidth = 1;
        [0.25,0.5,0.75,1.0].forEach(r => {
            ctx.beginPath(); ctx.arc(cxc,cyc,maxR*r,0,Math.PI*2); ctx.stroke();
        });

        leads.slice(0, nLeads).forEach((lead, i) => {
            const color = colors[i % colors.length];
            const angle = i * aStep - Math.PI / 2;
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.globalAlpha = 0.72;
            ctx.beginPath();
            ctx.arc(cxc, cyc, 14 + i*(maxR-14)/nLeads, angle - aStep*0.36, angle + aStep*0.36);
            ctx.stroke();
            ctx.globalAlpha = 1;
            const lr = 14 + i*(maxR-14)/nLeads + 16;
            ctx.fillStyle = color; ctx.font = "bold 10px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(lead.name, cxc + Math.cos(angle)*lr, cyc + Math.sin(angle)*lr);
            ctx.restore();

            const item = document.createElement("div");
            item.className = "sp-rings-legend-item";
            item.innerHTML = `<div class="sp-rings-dot" style="background:${color}"></div><span>${lead.name}: ${(rmsArr[i]/1000).toFixed(2)} mV</span>`;
            leg.appendChild(item);
        });

        ctx.fillStyle = "#0a66c2";
        ctx.beginPath(); ctx.arc(cxc,cyc,4,0,Math.PI*2); ctx.fill();
    }

    /* ════════════════════════
       MEASUREMENTS
    ════════════════════════ */
    function renderMeasurements(body) {
        const leads = getLeads();
        if (!leads || leads.length < 2) { noData(body); return; }

        const sr = getSR();
        const leadII = getLead("II") || leads[1] || leads[0];
        const samples = leadII.samples;
        const rPeaks = findRPeaks(samples, sr);

        const avgRR = calcAvgRR(rPeaks, sr);
        const hrBpm = avgRR ? Math.round(60000 / avgRR) : null;
        const prMs  = calcPR(samples, sr, rPeaks);
        const qrsMs = calcQRS(samples, sr, rPeaks);
        const qtMs  = calcQT(samples, sr, rPeaks);
        const qtcMs = avgRR && qtMs ? Math.round(qtMs / Math.sqrt(avgRR / 1000)) : null;

        const rrArr = [];
        for (let i = 1; i < rPeaks.length; i++) rrArr.push((rPeaks[i]-rPeaks[i-1])/sr*1000);
        const sdnn  = rrArr.length > 1 ? Math.round(stdDev(rrArr))  : null;
        const rmssd = rrArr.length > 1 ? Math.round(rmssdFn(rrArr)) : null;

        const leadI   = getLead("I");
        const leadAVF = getLead("aVF");
        let axisVal = null, axisStr = "—";
        if (leadI && leadAVF) {
            axisVal = Math.round(Math.atan2(netAmp(leadAVF.samples), netAmp(leadI.samples)) * 180 / Math.PI);
            const aLabel = axisVal>=-30&&axisVal<=90?"Normal":axisVal>90?"Right deviation":"Left deviation";
            axisStr = `${axisVal}° (${aLabel})`;
        }

        const rhythm = hrBpm
            ? (hrBpm<60?"⚠ Bradycardia":hrBpm>100?"⚠ Tachycardia":"✓ Normal sinus rhythm")
            : "—";

        body.innerHTML = `<p class="sp-info">Automated measurements from lead <b>${leadII.name}</b> — <b>${rPeaks.length}</b> beats detected.</p>`;

        const tbl = document.createElement("table");
        tbl.className = "sp-table";
        tbl.innerHTML = `<thead><tr><th>Parameter</th><th>Value</th><th>Normal Range</th><th>Status</th></tr></thead>`;
        const tb = document.createElement("tbody");

        [
            { p:"Heart Rate",   v:hrBpm ?`${hrBpm} bpm`           :"—", n:"60–100 bpm",  ok:hrBpm!==null&&hrBpm>=60&&hrBpm<=100 },
            { p:"Rhythm",       v:rhythm,                               n:"Normal sinus",  ok:rhythm.includes("✓") },
            { p:"RR Interval",  v:avgRR ?`${Math.round(avgRR)} ms` :"—", n:"600–1000 ms", ok:avgRR!==null&&avgRR>=600&&avgRR<=1000 },
            { p:"PR Interval",  v:prMs  ?`${prMs} ms`              :"—", n:"120–200 ms",  ok:prMs!==null&&prMs>=120&&prMs<=200 },
            { p:"QRS Duration", v:qrsMs ?`${qrsMs} ms`             :"—", n:"< 120 ms",    ok:qrsMs!==null&&qrsMs<120 },
            { p:"QT Interval",  v:qtMs  ?`${qtMs} ms`              :"—", n:"350–440 ms",  ok:qtMs!==null&&qtMs>=350&&qtMs<=440 },
            { p:"QTc (Bazett)", v:qtcMs ?`${qtcMs} ms`             :"—", n:"< 450 ms",    ok:qtcMs!==null&&qtcMs<450 },
            { p:"Cardiac Axis", v:axisStr,                              n:"-30° to +90°",  ok:axisVal!==null&&axisVal>=-30&&axisVal<=90 },
            { p:"SDNN (HRV)",   v:sdnn  ?`${sdnn} ms`              :"—", n:"> 50 ms",     ok:sdnn!==null&&sdnn>50 },
            { p:"RMSSD (HRV)",  v:rmssd ?`${rmssd} ms`             :"—", n:"> 20 ms",     ok:rmssd!==null&&rmssd>20 },
        ].forEach(r => {
            const tr = document.createElement("tr");
            const st = r.v !== "—"
                ? `<span class="${r.ok?'sp-ok':'sp-warn'}">${r.ok?"✓ Normal":"⚠ Abnormal"}</span>`
                : "—";
            tr.innerHTML = `<td><b>${r.p}</b></td><td style="font-weight:bold;color:#0a66c2">${r.v}</td><td>${r.n}</td><td>${st}</td>`;
            tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        body.appendChild(tbl);
        body.innerHTML += `<p class="sp-disclaimer">⚠ Automated measurements — clinical interpretation required.</p>`;
    }

    /* ════════════════════════
       INTERVALS (CLINICALLY ACCURATE)
    ════════════════════════ */
    function renderIntervals(body) {
        const leads = getLeads();
        if (!leads || leads.length < 1) { noData(body); return; }

        const sr = getSR(); // Влече SampleBase директно од XML (пр. 500)
        const leadII = getLead("II") || leads[0];
        const rPeaks = findRPeaks(leadII.samples, sr);

        if (rPeaks.length < 3) {
            body.innerHTML = `<div class="sp-no-data"><span>⚠</span>Not enough beats detected for clinical analysis.</div>`;
            return;
        }

        // Пресметка на RR интервали со висока прецизност
        const rrIntervals = [];
        for (let i = 1; i < rPeaks.length; i++) {
            const diffInSamples = rPeaks[i] - rPeaks[i-1];
            const ms = (diffInSamples / sr) * 1000;
            rrIntervals.push({
                ms: ms,
                samples: diffInSamples,
                bpm: 60000 / ms
            });
        }

        body.innerHTML = `<p class="sp-info">Clinical RR Intervals — Based on <b>${sr} Hz</b> sampling from Lead <b>${leadII.name}</b>.</p>`;

        // Креирање на канвас
        const tachoWrap = document.createElement("div");
        tachoWrap.className = "sp-tacho-wrap";
        const cv = mkCanvas(600, 180);
        tachoWrap.appendChild(cv);
        body.appendChild(tachoWrap);

        // Повик до функцијата за цртање (дефинирана подолу)
        drawIntervalBars(cv, rrIntervals.map(d => d.ms));

        // ТАБЕЛА СО ТОЧНИ ПРЕСМЕТКИ
        secTitle(body, "Beat-to-Beat Measurements");
        const tbl = document.createElement("table");
        tbl.className = "sp-table";
        tbl.innerHTML = `
            <thead>
                <tr>
                    <th>Interval</th>
                    <th>Samples (Δ)</th>
                    <th>Time (ms)</th>
                    <th>Inst. HR</th>
                </tr>
            </thead>`;

        const tb = document.createElement("tbody");
        rrIntervals.forEach((item, i) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>Beat ${i+1}-${i+2}</td>
                <td>${item.samples}</td>
                <td><b>${item.ms.toFixed(1)} ms</b></td>
                <td>${Math.round(item.bpm)} BPM</td>`;
            tb.appendChild(row);
        });
        tbl.appendChild(tb);
        body.appendChild(tbl);
    }

    // Помошна функција за цртање столбови
    function drawIntervalBars(cv, data) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        const padL = 60; // Поголем лев простор за бројките на оската
        const padR = 20;
        const padT = 30;
        const padB = 40;

        ctx.fillStyle = isDark() ? "#1a1a1b" : "#ffffff";
        ctx.fillRect(0, 0, W, H);

        // Пресметка на опсег за Y-оска
        const maxVal = Math.max(...data, 1000);
        const minVal = Math.min(...data, 600);
        const yMax = Math.ceil(maxVal / 200) * 200 + 100; // Округла горна граница
        const yMin = Math.floor(minVal / 200) * 200 - 100; // Округла долна граница
        const yRange = yMax - yMin;

        // --- ЦРТАЊЕ НА GRID И Y-ОСКА ---
        ctx.strokeStyle = isDark() ? "#333" : "#e0e0e0";
        ctx.lineWidth = 1;
        ctx.font = "10px Arial";
        ctx.fillStyle = isDark() ? "#aaa" : "#888";
        ctx.textAlign = "right";

        const steps = 5; // Колку линии на мрежата
        for (let i = 0; i <= steps; i++) {
            const val = yMin + (yRange / steps) * i;
            const y = H - padB - ((val - yMin) / yRange) * (H - padB - padT);

            // Хоризонтална линија
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();

            // Текст на оската
            ctx.fillText(Math.round(val) + " ms", padL - 10, y + 4);
        }

        // --- ЦРТАЊЕ НА СТОЛБОВИТЕ ---
        const n = data.length;
        const spacing = (W - padL - padR) / n;
        const barWidth = Math.min(35, spacing * 0.7);

        data.forEach((val, i) => {
            const h = ((val - yMin) / yRange) * (H - padB - padT);
            const x = padL + i * spacing + (spacing - barWidth) / 2;
            const y = H - padB - h;

            // Сенка за столбовите
            ctx.shadowColor = "rgba(0,0,0,0.05)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;

            // Боја (Медицински стандард: сина за ок, црвена за аларм)
            ctx.fillStyle = (val < 600 || val > 1200) ? "#e63946" : "#0a66c2";
            ctx.fillRect(x, y, barWidth, h);

            // Ресетирање сенка за текстот
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Вредност над секој столб
            ctx.fillStyle = isDark() ? "#ddd" : "#333";
            ctx.font = "bold 11px Arial";
            ctx.textAlign = "center";
            ctx.fillText(Math.round(val), x + barWidth / 2, y - 8);

            // Ознака под столбот
            ctx.fillStyle = isDark() ? "#888" : "#999";
            ctx.font = "10px Arial";
            ctx.fillText("B" + (i+1), x + barWidth / 2, H - padB + 15);
        });

        // Главни оски (L-shape)
        ctx.strokeStyle = isDark() ? "#888" : "#555";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padL, padT);
        ctx.lineTo(padL, H - padB); // Вертикална
        ctx.lineTo(W - padR, H - padB); // Хоризонтална
        ctx.stroke();
    }

    function drawTachogram(cv, rrIntervals) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        const pad = 40;

        ctx.fillStyle = "#f8fbff";
        ctx.fillRect(0, 0, W, H);

        const n = rrIntervals.length;
        const maxRR = Math.max(...rrIntervals) + 100;
        const minRR = Math.min(...rrIntervals) - 100;
        const range = maxRR - minRR || 1;

        // Grid линии за ms
        ctx.strokeStyle = "#eef2f6";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad + (i * (H - pad * 2) / 4);
            ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
            ctx.fillStyle = "#aaa"; ctx.font = "10px Arial";
            ctx.fillText(Math.round(maxRR - (i * range / 4)) + "ms", 5, y + 3);
        }

        // Цртање на линијата
        ctx.strokeStyle = "#0a66c2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        rrIntervals.forEach((rr, i) => {
            const x = pad + (i / (n - 1)) * (W - pad * 2);
            const y = pad + (maxRR - rr) / range * (H - pad * 2);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Точки за секој бит
        rrIntervals.forEach((rr, i) => {
            const x = pad + (i / (n - 1)) * (W - pad * 2);
            const y = pad + (maxRR - rr) / range * (H - pad * 2);
            ctx.fillStyle = "#e63946";
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        });
    }

    function drawTacho(cv, rrMs) {
        const ctx = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        const pad = { t:12, r:12, b:24, l:48 };
        const dW = W - pad.l - pad.r;
        const dH = H - pad.t - pad.b;

        ctx.fillStyle = "#f8fbff"; ctx.fillRect(0,0,W,H);

        const maxRR = Math.max(...rrMs) + 80;
        const minRR = Math.max(0, Math.min(...rrMs) - 80);
        const range = maxRR - minRR || 1;
        const bW    = Math.max(2, (dW / rrMs.length) - 1);

        rrMs.forEach((rr, i) => {
            const x  = pad.l + i * (dW / rrMs.length);
            const bH = ((rr - minRR) / range) * dH;
            const y  = pad.t + dH - bH;
            ctx.fillStyle  = (rr >= 600 && rr <= 1100) ? "#0a66c2" : "#e63946";
            ctx.globalAlpha = 0.82;
            ctx.fillRect(x, y, bW, bH);
        });
        ctx.globalAlpha = 1;

        // Y axis labels
        ctx.fillStyle = "#888"; ctx.font = "11px Arial"; ctx.textAlign = "right";
        ctx.fillText(maxRR + " ms", pad.l - 4, pad.t + 10);
        ctx.fillText(minRR + " ms", pad.l - 4, pad.t + dH);

        // X axis line
        ctx.strokeStyle = "#ccc"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.l, pad.t + dH);
        ctx.lineTo(W - pad.r, pad.t + dH);
        ctx.stroke();

        // X label
        ctx.fillStyle = "#888"; ctx.textAlign = "center";
        ctx.fillText("Beats (" + rrMs.length + " total)", W / 2, H - 4);
    }

    /* ════════════════════════
       SIGNAL PROCESSING
    ════════════════════════ */
    function findRPeaks(samples, sr) {
        const peaks = [];
        const refractory = Math.round(sr * 0.25);
        const win = Math.round(sr * 0.15);
        let maxVal = 0;
        for (let i = 0; i < samples.length; i++) maxVal = Math.max(maxVal, samples[i]);
        const thresh = maxVal * 0.40;
        let lastPeak = -refractory;

        for (let i = win; i < samples.length - win; i++) {
            if (samples[i] > thresh && i - lastPeak > refractory) {
                let isMax = true;
                for (let j = i - win; j <= i + win; j++) {
                    if (j !== i && samples[j] >= samples[i]) { isMax = false; break; }
                }
                if (isMax) { peaks.push(i); lastPeak = i; }
            }
        }
        return peaks;
    }

    function calcAvgRR(peaks, sr) {
        if (peaks.length < 2) return null;
        return ((peaks[peaks.length-1] - peaks[0]) / (peaks.length-1)) / sr * 1000;
    }

    function calcPR(samples, sr, rPeaks) {
        if (!rPeaks || !rPeaks.length) return null;
        const rIdx = rPeaks[Math.floor(rPeaks.length / 2)];
        const back  = Math.round(sr * 0.24);
        const start = Math.max(0, rIdx - back);
        const bLen  = Math.round(sr * 0.05);
        let bSum = 0;
        for (let i = 0; i < bLen && i < samples.length; i++) bSum += samples[i];
        const baseline = bSum / bLen;
        const thresh   = baseline + (samples[rIdx] - baseline) * 0.08;
        let onset = start;
        for (let i = rIdx; i >= start; i--) {
            if (samples[i] < thresh) { onset = i; break; }
        }
        const ms = Math.round((rIdx - onset) / sr * 1000);
        return ms > 60 && ms < 320 ? ms : null;
    }

    function calcQRS(samples, sr, rPeaks) {
        if (!rPeaks || !rPeaks.length) return null;
        const rIdx = rPeaks[Math.floor(rPeaks.length / 2)];
        const win   = Math.round(sr * 0.09);
        const bLen  = Math.round(sr * 0.05);
        let bSum = 0;
        for (let i = 0; i < bLen && i < samples.length; i++) bSum += samples[i];
        const baseline = bSum / bLen;
        const thresh   = baseline + (samples[rIdx] - baseline) * 0.15;
        let onset = rIdx, offset = rIdx;
        for (let i = rIdx; i >= Math.max(0, rIdx-win); i--) {
            if (samples[i] <= thresh) { onset = i; break; }
        }
        for (let i = rIdx; i <= Math.min(samples.length-1, rIdx+win); i++) {
            if (samples[i] <= thresh) { offset = i; break; }
        }
        const ms = Math.round((offset - onset) / sr * 1000);
        return ms > 20 && ms < 250 ? ms : null;
    }

    function calcQT(samples, sr, rPeaks) {
        if (!rPeaks || !rPeaks.length) return null;
        const rIdx     = rPeaks[Math.floor(rPeaks.length / 2)];
        const qrsWin   = Math.round(sr * 0.09);
        const searchEnd= Math.min(samples.length-1, rIdx + Math.round(sr*0.60));
        const bLen     = Math.round(sr * 0.05);
        let bSum = 0;
        for (let i = 0; i < bLen && i < samples.length; i++) bSum += samples[i];
        const baseline  = bSum / bLen;
        const qrsThresh = baseline + (samples[rIdx] - baseline) * 0.15;
        let qrsOnset = rIdx;
        for (let i = rIdx; i >= Math.max(0, rIdx-qrsWin); i--) {
            if (samples[i] <= qrsThresh) { qrsOnset = i; break; }
        }
        const tStart = rIdx + Math.round(sr * 0.15);
        let tPeakIdx = tStart, tPeakVal = -Infinity;
        for (let i = tStart; i < Math.min(samples.length, rIdx + Math.round(sr*0.45)); i++) {
            if (samples[i] > tPeakVal) { tPeakVal = samples[i]; tPeakIdx = i; }
        }
        let tEnd = tPeakIdx;
        const tEndThresh = baseline + (tPeakVal - baseline) * 0.08;
        for (let i = tPeakIdx; i <= searchEnd; i++) {
            if (samples[i] <= tEndThresh) { tEnd = i; break; }
        }
        const ms = Math.round((tEnd - qrsOnset) / sr * 1000);
        return ms > 200 && ms < 700 ? ms : null;
    }

    function netAmp(samples) {
        let s = 0; const n = Math.min(samples.length, 2500);
        for (let i = 0; i < n; i++) s += samples[i];
        return s / n;
    }

    function stdDev(arr) {
        const m = arr.reduce((a,b)=>a+b,0) / arr.length;
        return Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0) / arr.length);
    }

    function rmssdFn(arr) {
        let s = 0;
        for (let i = 1; i < arr.length; i++) s += (arr[i]-arr[i-1])**2;
        return Math.sqrt(s / (arr.length-1));
    }

    function scaleArr(src, factor) {
        const out = new Float32Array(src.length);
        for (let i = 0; i < src.length; i++) out[i] = src[i] * factor;
        return out;
    }

    function mixArr(a, b, wa, wb) {
        const n = Math.min(a.length, b.length);
        const out = new Float32Array(n);
        for (let i = 0; i < n; i++) out[i] = a[i]*wa + b[i]*wb;
        return out;
    }

})();