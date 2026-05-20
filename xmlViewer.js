/* ============================================================
   xmlViewer.js — ECG XML Viewer
   Supports GE MUSE XML and Biocare/generic ECG XML formats
   Renders directly on canvas, shows real μV/mV values on hover
   ============================================================ */

(function () {

    const LEAD_NAMES = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];

    // Parsed ECG data
    let xmlEcg = null;
    /*
      xmlEcg = {
        leads: [ { name, samples: Float32Array (μV) }, ... ],
        sampleRate: 500,       // Hz
        ampPerBit: 4.88,       // μV per bit (from file)
        durationMs: 10000,
      }
    */

    document.addEventListener("DOMContentLoaded", function () {

        /* ── Inject Upload XML button next to existing upload ── */
        const uploadInput = document.getElementById("upload");
        if (!uploadInput) return;

        const xmlInput = document.createElement("input");
        xmlInput.type = "file";
        xmlInput.id = "uploadXml";
        xmlInput.accept = ".xml";
        xmlInput.style.cssText = "margin-left:8px;";

        const xmlLabel = document.createElement("label");
        xmlLabel.htmlFor = "uploadXml";
        xmlLabel.textContent = "📂 Upload XML";
        xmlLabel.style.cssText = [
            "display:inline-block",
            xmlLabel.className = "xml-upload-label",
            "padding:8px 12px",
            "border-radius:6px",
            "cursor:pointer",
            "margin-left:8px",
            "font-family:Arial",
            "font-size:14px",
            "background: #28a745",
            "color: white",
        ].join(";");

        // Hide the raw file input, show styled label
        xmlInput.style.display = "none";
        uploadInput.parentElement.appendChild(xmlInput);
        uploadInput.parentElement.appendChild(xmlLabel);

        // Status badge
        const xmlStatus = document.createElement("span");
        xmlStatus.id = "xmlStatus";
        xmlStatus.style.cssText = "margin-left:10px;font-size:13px;color:#666;font-family:Arial;";
        uploadInput.parentElement.appendChild(xmlStatus);

        xmlInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (!file) return;
            xmlStatus.textContent = "⏳ Parsing...";
            const reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    parseXml(ev.target.result);
                    xmlStatus.textContent = "✅ " + file.name + " (" + xmlEcg.leads.length + " leads, " + xmlEcg.sampleRate + " Hz)";
                    // Store rendered ECG as image so script.js zoom/select works
                    renderXmlEcg();
                    const tempCanvas = document.createElement("canvas");
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    tempCanvas.getContext("2d").drawImage(canvas, 0, 0);
                    const ecgImg = window._ecg.img;
                    ecgImg.onload = function() {
                        window._ecg.view.x = 0;
                        window._ecg.view.y = 0;
                        window._ecg.view.w = ecgImg.width;
                        window._ecg.view.h = ecgImg.height;
                        if (window._ecgScanImage) window._ecgScanImage();
                    };
                    ecgImg.src = tempCanvas.toDataURL("image/png");
                } catch (err) {
                    xmlStatus.textContent = "❌ Error: " + err.message;
                    console.error(err);
                }
            };
            reader.readAsText(file);
        });

        /* ── CANVAS hover — show real mV values ── */
        const canvas = document.getElementById("canvas");
        canvas.addEventListener("mousemove", function (e) {
            if (!xmlEcg) return;
            // Блокирај го script.js crosshair
            window._xmlMode = true;
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
            drawXmlCrosshair(cx, cy);
        });

        canvas.addEventListener("mouseleave", function () {
            if (!xmlEcg) return;
            renderXmlEcg();
            document.getElementById("coordinates").innerText = "";
        });

    });

    /* ── XML PARSER ── */
    function parseXml(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");

        // Detect format
        const isMuseV8 = doc.querySelector("RestingECG") !== null;
        const isBiocare = doc.querySelector("ECGData") !== null || doc.querySelector("Waveform") !== null;

        if (isMuseV8) {
            parseMuseXml(doc);
        } else if (isBiocare) {
            parseBiocareXml(doc);
        } else {
            // Try generic — look for any element with Base64 data
            parseGenericXml(doc);
        }
    }

    /* ── GE MUSE XML parser ── */
    function parseMuseXml(doc) {
        console.log("--- XML Extraction Started ---");

        try {
            // 1. Функција која бара вредност без разлика на тагови
            const findInXml = (tags) => {
                for (let tag of tags) {
                    let el = doc.getElementsByTagName(tag)[0];
                    if (el && el.textContent.trim() !== "") {
                        let val = el.textContent.trim();
                        // Ако е бројка, ја заокружуваме, ако не - ја враќаме како што е
                        return isNaN(val) ? val : Math.round(parseFloat(val));
                    }
                }
                return "—";
            };

            // 2. Листа на резултати за твоите правоаголници
            const results = {
                'resHR':  findInXml(["VentricularRate", "HeartRate", "HR", "VentricleRate", "Rate"]),
                'resPR':  findInXml(["PRInterval", "PR", "PRI", "PRInt", "P-RInterval"]),
                'resQRS': findInXml(["QRSDuration", "QRS", "QRSDur", "QRS_Duration", "QRS-Duration"]),
                'resQT':  findInXml(["QTcInterval", "QTc", "QTcB", "QTcF", "QTc_Interval"])
            };

            console.log("Found Values:", results);

            // 3. ПОПОЛНУВАЊЕ СО ТАЈМЕР (за да бидеме сигурни дека е последна измена)
            setTimeout(() => {
                for (let id in results) {
                    let element = document.getElementById(id);
                    if (element) {
                        element.innerHTML = results[id];
                        // Ја боиме во темно сина за да бидеме сигурни дека се вчитало
                        element.style.color = "#0a66c2";
                        console.log(`Injected ${results[id]} into ${id}`);
                    }
                }

                const statusLabel = document.getElementById('resStatus');
                if (statusLabel) {
                    statusLabel.innerText = "Status: XML Data Applied Successfully";
                    statusLabel.style.color = "#28a745";
                }
            }, 500); // 500ms пауза за сигурност

        } catch (e) {
            console.error("Extraction error:", e);
        }

        // --- ОД ТУКА НАДОЛУ НЕ ГИБНИ НИШТО (твојот постоечки код за графикот) ---
        const waveforms = doc.querySelectorAll("Waveform");
        let rhythmWaveform = null;
        // ... продолжи со твојот оригинален код за waveforms ...
        waveforms.forEach(wf => {
            const type = wf.querySelector("WaveformType");
            if (type && type.textContent.trim() === "Rhythm") rhythmWaveform = wf;
        });
        if (!rhythmWaveform && waveforms.length > 0) rhythmWaveform = waveforms[waveforms.length - 1];
        if (!rhythmWaveform) throw new Error("No Waveform element found");

        const srEl = rhythmWaveform.querySelector("SampleBase");
        const sampleRate = srEl ? parseInt(srEl.textContent) : 500;
        const leadEls = rhythmWaveform.querySelectorAll("LeadData");
        const leads = [];
        leadEls.forEach(leadEl => {
            const nameEl = leadEl.querySelector("LeadID");
            const name = nameEl ? nameEl.textContent.trim() : "?";
            const ampEl = leadEl.querySelector("LeadAmplitudeUnitsPerBit");
            const ampPerBit = ampEl ? parseFloat(ampEl.textContent) : 4.88;
            const countEl = leadEl.querySelector("LeadSampleCountTotal");
            const count = countEl ? parseInt(countEl.textContent) : 0;
            const wfdEl = leadEl.querySelector("WaveFormData");
            if (wfdEl) {
                const samples = decodeBase64Samples(wfdEl.textContent.trim(), count, ampPerBit);
                leads.push({ name, samples });
            }
        });
        xmlEcg = { leads, sampleRate, durationMs: (leads[0].samples.length / sampleRate) * 1000 };
        window._xmlEcgData = xmlEcg;
    }

    /* ── Biocare / generic XML parser ── */
    function parseBiocareXml(doc) {
        // Biocare uses <LeadData> or <channel> elements
        // Try multiple selectors
        let leadEls = doc.querySelectorAll("LeadData");
        if (leadEls.length === 0) leadEls = doc.querySelectorAll("channel");
        if (leadEls.length === 0) leadEls = doc.querySelectorAll("lead");

        const srEl = doc.querySelector("SampleRate") || doc.querySelector("samplerate") || doc.querySelector("SampleBase");
        const sampleRate = srEl ? parseInt(srEl.textContent) : 500;

        const leads = [];

        if (leadEls.length > 0) {
            leadEls.forEach((leadEl, idx) => {
                const nameEl = leadEl.querySelector("LeadID") || leadEl.querySelector("name") || leadEl.querySelector("Name");
                const name = nameEl ? nameEl.textContent.trim() : (LEAD_NAMES[idx] || "Lead " + (idx + 1));

                const ampEl = leadEl.querySelector("LeadAmplitudeUnitsPerBit") || leadEl.querySelector("gain");
                const ampPerBit = ampEl ? parseFloat(ampEl.textContent) : 4.88;

                const wfdEl = leadEl.querySelector("WaveFormData") || leadEl.querySelector("data") || leadEl.querySelector("Data");
                if (!wfdEl) return;

                const countEl = leadEl.querySelector("LeadSampleCountTotal") || leadEl.querySelector("count");
                const count = countEl ? parseInt(countEl.textContent) : 0;

                const samples = decodeBase64Samples(wfdEl.textContent.trim(), count, ampPerBit);
                if (samples.length > 0) leads.push({ name, samples });
            });
        }

        if (leads.length === 0) {
            // Last resort: parse any element with long Base64 content
            parseGenericXml(doc);
            return;
        }

        xmlEcg = {
            leads,
            sampleRate,
            durationMs: (leads[0].samples.length / sampleRate) * 1000,
        };
        window._xmlEcgData = xmlEcg;
    }

    /* ── Generic fallback parser ── */
    function parseGenericXml(doc) {
        const allEls = doc.querySelectorAll("*");
        const leads = [];
        let idx = 0;

        allEls.forEach(el => {
            const text = el.textContent.trim();
            // Base64 strings are long and alphanumeric+/+=
            if (text.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(text) && el.children.length === 0) {
                try {
                    const samples = decodeBase64Samples(text, 0, 4.88);
                    if (samples.length > 100) {
                        const name = LEAD_NAMES[idx] || "Lead " + (idx + 1);
                        leads.push({ name, samples });
                        idx++;
                    }
                } catch (e) { /* skip */ }
            }
        });

        if (leads.length === 0) throw new Error("Could not find ECG waveform data in XML");

        xmlEcg = {
            leads,
            sampleRate: 500,
            durationMs: (leads[0].samples.length / 500) * 1000,
        };
        window._xmlEcgData = xmlEcg;
    }

    /* ── Decode Base64 → Int16 → Float32 (μV) ── */
    function decodeBase64Samples(b64, expectedCount, ampPerBit) {
        // Clean whitespace
        const clean = b64.replace(/\s/g, "");
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const count = expectedCount > 0 ? expectedCount : Math.floor(bytes.length / 2);
        const samples = new Float32Array(count);
        const view = new DataView(bytes.buffer);

        for (let i = 0; i < count; i++) {
            if (i * 2 + 1 >= bytes.length) break;
            const raw = view.getInt16(i * 2, true); // little-endian
            samples[i] = raw * ampPerBit; // μV
        }
        return samples;
    }

    /* ── RENDER XML ECG on canvas ── */
    function renderXmlEcg() {
        if (!xmlEcg) return;

        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // Hook into script.js view system
        if (window._ecg && window._ecg.img && window._ecg.img.naturalWidth) return;

        // Draw pink grid background
        drawGrid(ctx, W, H);

        const leads = xmlEcg.leads;
        const nLeads = leads.length;

        // Layout: max 3 rows, 4 columns (standard 12-lead) or single column
        let cols, rows;
        if (nLeads <= 3) { cols = 1; rows = nLeads; }
        else if (nLeads <= 6) { cols = 2; rows = Math.ceil(nLeads / 2); }
        else { cols = 4; rows = Math.ceil(nLeads / 4); }

        // Plus rhythm strip at bottom if 12 leads
        const hasRhythm = nLeads >= 12;
        const mainRows = hasRhythm ? rows : rows;
        const rhythmH = hasRhythm ? H * 0.12 : 0;
        const mainH = H - rhythmH;

        const cellW = W / cols;
        const cellH = mainH / mainRows;

        // Store lead layout for crosshair
        xmlEcg._layout = { cols, rows, cellW, cellH, mainH, rhythmH, W, H };

        leads.forEach((lead, i) => {
            if (i >= cols * rows) return;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x0 = col * cellW;
            const y0 = row * cellH;
            drawLeadTrace(ctx, lead, x0, y0, cellW, cellH, true);
        });

        // Rhythm strip — use lead II (index 1) or last lead
        if (hasRhythm) {
            const rhythmLead = leads[1] || leads[0];
            drawLeadTrace(ctx, rhythmLead, 0, mainH, W, rhythmH, false);

            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.font = "bold 11px Arial";
            ctx.fillText("II (rhythm)", 6, mainH + 14);
        }
    }

    function drawGrid(ctx, W, H) {
        // Light pink background
        ctx.fillStyle = "#fff5f5";
        ctx.fillRect(0, 0, W, H);

        // Small squares: 1mm = ~3.78px at 96dpi, standard ECG paper
        const smallSq = W / 200; // ~5px
        const largeSq = smallSq * 5;

        ctx.lineWidth = 0.3;
        ctx.strokeStyle = "rgba(255,100,100,0.25)";
        for (let x = 0; x <= W; x += smallSq) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y <= H; y += smallSq) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        ctx.lineWidth = 0.6;
        ctx.strokeStyle = "rgba(220,60,60,0.35)";
        for (let x = 0; x <= W; x += largeSq) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y <= H; y += largeSq) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
    }

    function drawLeadTrace(ctx, lead, x0, y0, cellW, cellH, showLabel) {
        const samples = lead.samples;
        const n = samples.length;
        if (n === 0) return;

        // Find min/max for scaling
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < n; i++) {
            if (samples[i] < min) min = samples[i];
            if (samples[i] > max) max = samples[i];
        }
        const range = max - min || 1;

        // Padding
        const padX = cellW * 0.02;
        const padY = cellH * 0.12;
        const drawW = cellW - padX * 2;
        const drawH = cellH - padY * 2;
        const midY = y0 + padY + drawH / 2;

        // Scale: standard ECG 10mm/mV = ~1mV per large square
        // Use fixed scale: 1000μV = 1mV = cellH * 0.35 pixels
        const mvScale = (cellH * 0.35) / 1000; // px per μV

        ctx.save();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1.2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();

        for (let i = 0; i < n; i++) {
            const px = x0 + padX + (i / (n - 1)) * drawW;
            const py = midY - samples[i] * mvScale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Label
        if (showLabel) {
            ctx.fillStyle = "rgba(80,80,80,0.85)";
            ctx.font = "bold 11px Arial";
            ctx.fillText(lead.name, x0 + padX + 2, y0 + padY + 12);
        }

        // Baseline
        ctx.strokeStyle = "rgba(150,150,150,0.3)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x0, midY);
        ctx.lineTo(x0 + cellW, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();

        // Store render info for crosshair
        lead._render = { x0, y0, cellW, cellH, midY, mvScale, padX, padY, n };
    }

    /* ── XML CROSSHAIR ── */
    function drawXmlCrosshair(cx, cy) {
        if (!xmlEcg) return;

        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;

        // Redraw base
        renderXmlEcg();

        // Vertical line
        ctx.save();
        ctx.strokeStyle = "rgba(30,30,30,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        const leads = xmlEcg.leads;
        const layout = xmlEcg._layout;
        if (!layout) return;

        // Find which lead the mouse is over
        let hoveredLead = null;
        let hoveredIdx = -1;

        leads.forEach((lead, i) => {
            if (!lead._render) return;
            const r = lead._render;
            if (cx >= r.x0 && cx <= r.x0 + r.cellW &&
                cy >= r.y0 && cy <= r.y0 + r.cellH) {
                hoveredLead = lead;
                hoveredIdx = i;
            }
        });

        if (!hoveredLead || !hoveredLead._render) {
            document.getElementById("coordinates").innerText = "";
            return;
        }

        const r = hoveredLead._render;
        const samples = hoveredLead.samples;

        // Sample index from X position
        const relX = cx - r.x0 - r.padX;
        const drawW = r.cellW - r.padX * 2;
        const sampleIdx = Math.round((relX / drawW) * (r.n - 1));
        const clampedIdx = Math.max(0, Math.min(r.n - 1, sampleIdx));

        const uV = samples[clampedIdx];
        const mV = uV / 1000;
        const timeSec = (clampedIdx / xmlEcg.sampleRate).toFixed(3);

        // Canvas Y of the actual ECG point
        const ecgCanvasY = r.midY - uV * r.mvScale;

        // Clamp to cell bounds
        const clampedY = Math.max(r.y0, Math.min(r.y0 + r.cellH, ecgCanvasY));

        // Draw dot
        ctx.save();
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.arc(cx, clampedY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label — format: (sample, μV) trace N
        const traceN = hoveredIdx + 1;
        const label = "(" + clampedIdx + ", " + uV.toFixed(1) + " μV)  trace " + traceN;
        ctx.font = "bold 12px Arial";
        const tw = ctx.measureText(label).width;
        let lx = cx + 8;
        if (lx + tw + 10 > W) lx = cx - tw - 12;
        const ly = Math.max(clampedY - 6, 16);
        ctx.fillStyle = "rgba(20,20,20,0.88)";
        ctx.fillRect(lx - 4, ly - 14, tw + 8, 20);
        ctx.fillStyle = "white";
        ctx.fillText(label, lx, ly);
        ctx.restore();

        // Update coordinates div
        document.getElementById("coordinates").innerText =
            hoveredLead.name + " — " + mV.toFixed(3) + " mV  |  t: " + timeSec + "s  |  trace " + traceN;
    }

})();