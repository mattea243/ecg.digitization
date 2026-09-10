document.addEventListener("DOMContentLoaded", function () {

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1200;
    canvas.height = 700;

    let s = 1;
    let ox = 0;
    let oy = 0;

    // Expose globals for digitizer.js
    let isSelecting = false;
    let startX = 0, startY = 0, endX = 0, endY = 0;

    function drawSelection() {

        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);

        ctx.save();
        window._ecgSegmentsPerLead = segmentsPerLead;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;

        ctx.strokeRect(
            ox + x * s,
            oy + y * s,
            w * s,
            h * s
        );

        ctx.restore();
    }

    let img = new Image();
    img.crossOrigin = "anonymous";
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    let view = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };

    let history = [];
    let panMode = false;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let panImgStart = { x: 0, y: 0 };
    // Hover state for crosshair + mV reading
    let hoverCanvasX = null, hoverCanvasY = null;
    let signalMap = null; // per-column detected ECG Y in image coords

    // Scan the image and build signalMap after upload
    function scanImage() {
        let traceCounter = 0;
        window._ecgTraceStartIndex = [];
        if (!img.naturalWidth) return;
        const off = document.createElement("canvas");
        off.width = img.width;
        off.height = img.height;
        const offCtx = off.getContext("2d");
        offCtx.drawImage(img, 0, 0);
        const data = offCtx.getImageData(0, 0, off.width, off.height).data;
        const W = off.width, H = off.height;
        window._ecgPixelData = { data, W, H };

        // Детектирај lead редови — скенирај секоја хоризонтална линија
        // и брои темни пиксели. Lead ред = лента со многу темни пиксели
        const rowDarkness = new Float32Array(H);
        for (let y = 0; y < H; y++) {
            let dark = 0;
            for (let x = Math.floor(W * 0.20); x < Math.floor(W * 0.85); x++) {
                const i = (y * W + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2];
                if (r > 150 && g < 120 && b < 120) continue; // прескокни grid
                const br = (r + g + b) / 3;
                if (br < 160) dark++;
            }
            rowDarkness[y] = dark;
        }

        // Смути ги вредностите за да ги групира блиските редови
        const smoothed = new Float32Array(H);
        const smoothR = 15;
        for (let y = 0; y < H; y++) {
            let sum = 0;
            for (let dy = -smoothR; dy <= smoothR; dy++) {
                const yy = Math.max(0, Math.min(H-1, y + dy));
                sum += rowDarkness[yy];
            }
            smoothed[y] = sum / (smoothR * 2 + 1);
        }

        // Најди врвови = центри на lead редови
        const threshold = Math.max(...smoothed) * 0.05;
        const leads = [];
        let inLead = false, leadStart = 0;

        for (let y = 0; y < H; y++) {
            if (!inLead && smoothed[y] > threshold) {
                inLead = true;
                leadStart = y;
            } else if (inLead && (smoothed[y] <= threshold || y === H - 1)) {
                inLead = false;
                const leadEnd = y;
                const midY = Math.floor((leadStart + leadEnd) / 2);
                leads.push({ topY: leadStart, botY: leadEnd, midY });
            }
        }

        window._ecgLeads = leads;

        // ==== AUTO SEGMENTS PER LEAD (HARD-LOCK MULTI-TRACE) ====
        const segmentsPerLead = [];

        for (let li = 0; li < leads.length; li++) {
            const lead = leads[li];
            const colActivity = new Float32Array(W);

            // 1. Скенирај колони
            for (let x = 0; x < W; x++) {
                let dark = 0;
                for (let y = lead.topY; y < lead.botY; y++) {
                    const i = (y * W + x) * 4;
                    const br = (data[i] + data[i+1] + data[i+2]) / 3;
                    if (br < 160) dark++; // Гледај само навистина темни пиксели
                }
                colActivity[x] = dark;
            }

            // 2. Најди зони на "тишина" (Gap Detection)
            const localSeps = [];
            // Користи ги овие константи внатре во scanImage
            const gridFilter = 130;  // Сè што е посветло од ова е мрежа, сè потемно е сигнал
            const minGapWidth = 10;  // Колку пиксели минимум мора да е празно за да признае прекин
            const minTracePct = 0.12; // 12% од ширината е минимум за еден Trace
            let gapCount = 0;
            let potentialGapX = 0;
            const minTraceWidth = W * 0.12; // Минимум ширина на еден Trace (12%)
            let lastBreakX = 0;

            for (let x = 1; x < W - 1; x++) {
                // Ако колоната е речиси празна (малку темни пиксели)
                if (colActivity[x] <= 1) {
                    gapCount++;
                } else {
                    // Ако имавме серија празни колони и сме поминале барем 12% од сликата
                    if (gapCount > 5 && (x - lastBreakX) > minTraceWidth) {
                        localSeps.push(x - Math.floor(gapCount/2));
                        lastBreakX = x;
                    }
                    gapCount = 0;
                }
            }

            // 3. Формирај сегменти
            let leadSegs = [];
            let startX = 0;
            localSeps.forEach(sepX => {
                leadSegs.push({ startX: startX, endX: sepX });
                startX = sepX;
            });
            leadSegs.push({ startX: startX, endX: W - 1 });

            segmentsPerLead.push(leadSegs);
        }

        window._ecgSegmentsPerLead = segmentsPerLead;

        // 4. Глобален индекс (Trace 1, 2, 3...)
        let currentTraceIdx = 0;
        window._ecgTraceStartIndex = leads.map((_, idx) => {
            const start = currentTraceIdx;
            currentTraceIdx += segmentsPerLead[idx].length;
            return start;
        });

    }
    window._ecgScanImage = scanImage;

    function getLeadRowAt(imgY) {
        // Find which lead row the mouse is in by scanning vertically
        // Returns { topY, bottomY, midY } in image coords
        if (!window._ecgPixelData) return null;
        const { data, W, H } = window._ecgPixelData;

        // Scan upward to find top of this lead's band
        let topY = imgY;
        for (let y = imgY; y >= 0; y--) {
            let darkCount = 0;
            for (let x = Math.floor(W * 0.1); x < Math.floor(W * 0.9); x++) {
                const i = (y * W + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2];
                const brightness = (r + g + b) / 3;
                if (brightness < 180) darkCount++;
            }
            if (darkCount > W * 0.3) { topY = y; break; }
        }

        // Scan downward to find bottom
        let bottomY = imgY;
        for (let y = imgY; y < H; y++) {
            let darkCount = 0;
            for (let x = Math.floor(W * 0.1); x < Math.floor(W * 0.9); x++) {
                const i = (y * W + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2];
                const brightness = (r + g + b) / 3;
                if (brightness < 180) darkCount++;
            }
            if (darkCount > W * 0.3) { bottomY = y; break; }
        }

        return { topY, bottomY, midY: (topY + bottomY) / 2 };
    }

    function drawCrosshair(cx, cy) {
        if (!window._ecgPixelData || !window._ecgLeads) return;

        const { data, W, H } = window._ecgPixelData;
        const leads = window._ecgLeads;

        const imgPos = toImage(cx, cy);
        const imgX = Math.floor(imgPos.x);
        const imgY = Math.floor(imgPos.y);

        if (imgX < 0 || imgX >= W || imgY < 0 || imgY >= H) return;

        ctx.save();
        ctx.strokeStyle = "rgba(30,30,30,0.55)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, oy);
        ctx.lineTo(cx, oy + view.h * s);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        const leadIndex = leads.findIndex(l => imgY >= l.topY && imgY <= l.botY);
        if (leadIndex === -1) {
            document.getElementById("coordinates").innerText = "";
            return;
        }

        const lead = leads[leadIndex];

        console.log("leadIndex:", leadIndex);
        console.log("segments:", window._ecgSegmentsPerLead?.[leadIndex]?.length);
        // Кога зумирано, скенирај го целиот видлив дел
        const visibleTopY = Math.floor(view.y);
        const visibleBotY = Math.ceil(view.y + view.h);
        const yMin = Math.max(0, lead.topY);
        const yMax = Math.min(H - 1, lead.botY + 100);

        // Пребарувај само во близина на маусот по Y (±60px)
        const mouseImgY = Math.floor(view.y + (cy - oy) / s);
        const searchMin = Math.max(yMin, mouseImgY - 60);
        const searchMax = Math.min(yMax, mouseImgY + 60);

        let minBr = 999, bestY = lead.midY;
        for (let y = searchMin; y <= searchMax; y++) {
            const i = (y * W + imgX) * 4;
            const r = data[i], g = data[i+1], b = data[i+2];
            if (r > 210 && g > 210 && b > 210) continue;
            if (r > 150 && g < 120 && b < 120) continue;
            const br = r * 0.299 + g * 0.587 + b * 0.114;
            if (br < minBr) { minBr = br; bestY = y; }
        }

        if (minBr > 200) {
            document.getElementById("coordinates").innerText = "";
            return;
        }

        const ecgCanvasY = oy + (bestY - view.y) * s;
        if (ecgCanvasY < oy || ecgCanvasY > oy + view.h * s) return;

        ctx.save();
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.arc(cx, ecgCanvasY, 4, 0, Math.PI * 2);
        ctx.fill();

        const segs = window._ecgSegmentsPerLead?.[leadIndex] || [];

        let segIndex = segs.findIndex(s => imgX >= s.startX && imgX < s.endX);

// ако ништо не најде → најблискиот сегмент (ВАЖНО!)
        if (segIndex === -1 && segs.length > 0) {
            segIndex = 0;
        }
        console.log("imgX:", imgX, "segIndex:", segIndex, segs);

        const base = window._ecgTraceStartIndex?.[leadIndex] || 0;
        const traceN = base + segIndex + 1;

        const pxPer1mV = (yMax - yMin) / 4;
        const mv = Math.abs((lead.midY - bestY) / pxPer1mV).toFixed(3);
        const label = "(" + imgX + ", " + mv + " mV)  trace " + traceN;
        ctx.font = "bold 12px Arial";
        const tw = ctx.measureText(label).width;
        let lx = cx + 8;
        if (lx + tw + 8 > canvas.width) lx = cx - tw - 12;
        const ly = Math.max(ecgCanvasY - 6, 16);
        ctx.fillStyle = "rgba(20,20,20,0.88)";
        ctx.fillRect(lx - 4, ly - 14, tw + 8, 20);
        ctx.fillStyle = "white";
        ctx.fillText(label, lx, ly);
        ctx.restore();

        document.getElementById("coordinates").innerText =
            "(" + imgX + ", " + mv + " mV)  trace " + traceN;
    }
    window._ecg = { get s(){ return s; }, get ox(){ return ox; }, get oy(){ return oy; }, get view(){ return view; }, get img(){ return img; }, get canvas(){ return canvas; }, get ctx(){ return ctx; } };
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = Math.min(container.clientWidth, 1200);
        canvas.height = 700;
    }

    function draw() {
        if (!img || !img.complete || !img.naturalWidth) return;
        if (canvas.width === 0 || canvas.height === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (view.w <= 0 || view.h <= 0) {
            view.x = 0; view.y = 0;
            view.w = img.width; view.h = img.height;
        }

        const scaleX = canvas.width / view.w;
        const scaleY = canvas.height / view.h;
        s = Math.min(scaleX, scaleY);

        const drawW = view.w * s;
        const drawH = view.h * s;
        ox = (canvas.width - drawW) / 2;
        oy = (canvas.height - drawH) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, view.x, view.y, view.w, view.h, ox, oy, drawW, drawH);

        // Draw crosshair if we have a hover position
        if (hoverCanvasX !== null) {
            drawCrosshair(hoverCanvasX, hoverCanvasY);
        }
    }

    /* INTRO POPUP - FINAL VERSION */
    const modal = document.getElementById("introModal");
    const startBtn = document.getElementById("startBtn");

// Функција која гарантирано го покажува/крие модалот
    function handleIntro() {
        modal.style.display = "flex";
    }

// Повикај ја функцијата
    handleIntro();

    if (startBtn) {
        startBtn.onclick = function (e) {
            e.preventDefault();
            localStorage.setItem("introSeen", "true");
            modal.style.display = "none";
        };
    }
    /* UPLOAD */
    document.getElementById("upload").addEventListener("change", function (e) {
        window._xmlMode = false;
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    window.addEventListener("resize", function () {
        resizeCanvas();
        draw();
    });
    resizeCanvas();
    img.onload = function () {
        resizeCanvas();
        view.x = 0;
        view.y = 0;
        view.w = img.width;
        view.h = img.height;
        signalMap = null;
        scanImage();
        draw();
    };

    /* ZOOM */
    document.getElementById("zoomIn").onclick = function () {

        const factor = 0.8;

        const cx = view.x + view.w / 2;
        const cy = view.y + view.h / 2;

        view.w *= factor;
        view.h *= factor;

        view.x = cx - view.w / 2;
        view.y = cy - view.h / 2;

        draw();
    };
    document.getElementById("zoomOut").onclick = function () {

        const factor = 1.25;

        const cx = view.x + view.w / 2;
        const cy = view.y + view.h / 2;

        view.w *= factor;
        view.h *= factor;

        view.x = cx - view.w / 2;
        view.y = cy - view.h / 2;

        // clamp да не излезе надвор од сликата
        if (view.w > img.width) {
            view.w = img.width;
            view.x = 0;
        }
        if (view.h > img.height) {
            view.h = img.height;
            view.y = 0;
        }

        // optional safety clamp
        view.x = Math.max(0, Math.min(view.x, img.width - view.w));
        view.y = Math.max(0, Math.min(view.y, img.height - view.h));

        draw();
    };

    document.getElementById("panBtn").onclick = function () {

        panMode = !panMode;

        this.innerText = panMode ? "✥ Pan: ON" : "✥ Pan: OFF";

        this.style.background = panMode ? "#0a66c2" : "#28a745";

        // cursor feedback
        if (panMode) {
            canvas.classList.add("pan-mode");
        } else {
            canvas.classList.remove("pan-mode");
        }
    };




    function updateBackBtn() {
        const btn = document.getElementById("backBtn");
        if (btn) btn.style.display = history.length > 0 ? "inline-block" : "none";
    }

    document.getElementById("reset").onclick = function () {
        if (!img.naturalWidth) return;
        history = [];
        view = { x: 0, y: 0, w: img.width, h: img.height };
        updateBackBtn();
        draw();
    };

    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
        backBtn.style.display = "none";
        backBtn.onclick = function () {
            if (!history.length) return;
            view = history.pop();
            updateBackBtn();
            draw();
        };
    }

    /* COORDINATES */


    /* FAQ */
    const questions = document.querySelectorAll(".faq-question");

    questions.forEach(function (q) {
        q.addEventListener("click", function () {
            const answer = this.nextElementSibling;

            if (answer.style.display === "block") {
                answer.style.display = "none";
            } else {
                answer.style.display = "block";
            }
        });
    });

    /* CHATBOT TOGGLE */
    const chatButton = document.getElementById("chatButton");
    const chatWindow = document.getElementById("chatWindow");

    chatButton.onclick = function () {
        if (chatWindow.style.display === "flex") {
            chatWindow.style.display = "none";
        } else {
            chatWindow.style.display = "flex";
        }
    };

    /* SEND MESSAGE */
    window.sendMessage = function () {

        const input = document.getElementById("chatInput");
        const messages = document.getElementById("chatMessages");

        let text = input.value.trim();
        if (text === "") return;
        input.value = "";

        // user message
        const userDiv = document.createElement("div");
        userDiv.className = "user";
        userDiv.innerText = text;
        messages.appendChild(userDiv);

        /* BOT TYPING EFFECT */
        const typingDiv = document.createElement("div");
        typingDiv.className = "bot typing";
        typingDiv.innerText = "ECG Assistant is typing...";
        messages.appendChild(typingDiv);

        messages.scrollTop = messages.scrollHeight;

        setTimeout(() => {

            typingDiv.remove();

            const botDiv = document.createElement("div");
            botDiv.className = "bot";
            botDiv.innerText = getReply(text.toLowerCase());

            messages.appendChild(botDiv);

            messages.scrollTop = messages.scrollHeight;

        }, 700);
    };
    /* ENTER KEY SUPPORT */
    const chatInput = document.getElementById("chatInput");
    chatInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault(); // Спречува нов ред во полето
            window.sendMessage(); // Ја повикува функцијата за праќање
        }
    });

    /* BOT LOGIC */
    /* VERSATILE BOT LOGIC - ENGLISH CARDIOLOGY EXPERT */
    function getReply(msg) {
        msg = msg.toLowerCase();

        // 1. EXTENSIVE MEDICAL KNOWLEDGE BASE
        const medicalKnowledge = {
            conditions: {
                "infarction": "Myocardial infarction (heart attack) occurs when blood flow to the heart is blocked. It is considered one of the most critical conditions because it can cause permanent damage to the heart muscle.",
                "heart attack": "A heart attack occurs when an artery supplying the heart with blood and oxygen becomes blocked. Immediate medical attention is required.",
                "arrhythmia": "Arrhythmia refers to any disorder of your heart rate or rhythm. It means your heart beats too quickly (tachycardia), too slowly (bradycardia), or irregularly.",
                "angina": "Angina is chest pain or discomfort caused when your heart muscle doesn't get enough oxygen-rich blood. It may feel like pressure or squeezing in your chest.",
                "fibrillation": "Atrial fibrillation (AFib) is an irregular and often very rapid heart rhythm that can lead to blood clots in the heart, increasing the risk of stroke and heart failure.",
                "heart failure": "Heart failure means the heart isn't pumping blood as well as it should. It needs consistent medical management."
            },
            symptoms: {
                "pain": "Chest pain is a primary indicator of heart issues. If it radiates to the arms, neck, or jaw, or is accompanied by sweating, it could be a medical emergency.",
                "shortness of breath": "Dyspnea (shortness of breath) can indicate that the heart is struggling to pump blood efficiently through the lungs.",
                "fatigue": "Unusual or extreme fatigue can sometimes be a subtle sign of heart distress, especially if it occurs with minimal physical activity.",
                "dizziness": "Dizziness or lightheadedness can be caused by heart rhythm problems or sudden changes in blood pressure.",
                "palpitations": "Heart palpitations are feelings of having a fast-beating, fluttering, or pounding heart. They can be triggered by stress, exercise, or a medical condition."
            },
            lifestyle: {
                "diet": "A heart-healthy diet includes high-fiber foods (oats, beans), healthy fats (omega-3, olive oil), and plenty of fruits and vegetables while limiting salt and sugar.",
                "medication": "Common cardiac medications include Beta-blockers (rhythm/BP), Statins (cholesterol), ACE inhibitors, and Blood Thinners (anticoagulants).",
                "blood pressure": "Normal blood pressure is typically around 120/80 mmHg. Consistent readings above 140/90 are usually classified as hypertension.",
                "salt": "Reducing sodium (salt) intake is crucial for managing blood pressure and reducing the workload on your heart."
            }
        };

        // 2. INTERACTION LOGIC

        // Greetings & Politeness
        if (/(hi|hello|hey|greetings)/.test(msg)) {
            return "Hello! I am your AI Cardiology Assistant. How can I help you with your ECG analysis or heart-health questions today?";
        }

        if (/(thanks|thank you|thx|thank)/.test(msg)) {
            return "You're very welcome! I'm happy to help. Do you have any other questions about your ECG or heart health?";
        }

        // High-risk/Emergency questions
        if (/(dangerous|risk|worst|emergency|deadly|serious)/.test(msg)) {
            return "The most high-risk conditions include Acute Myocardial Infarction and Ventricular Fibrillation. Symptoms like severe chest pain or fainting are medical emergencies. ECG monitoring is vital for detecting these risks early.";
        }

        // Dynamic Search: Symptoms
        for (let key in medicalKnowledge.symptoms) {
            if (msg.includes(key)) return medicalKnowledge.symptoms[key] + " Are you experiencing these symptoms right now?";
        }

        // Dynamic Search: Conditions
        for (let key in medicalKnowledge.conditions) {
            if (msg.includes(key)) return medicalKnowledge.conditions[key];
        }

        // Diet, Lifestyle & Meds
        if (/(diet|food|eat|nutrition|salt|sugar)/.test(msg)) return medicalKnowledge.lifestyle.diet;
        if (/(medication|medicine|pill|treatment|drug|statins|blockers)/.test(msg)) return medicalKnowledge.lifestyle.medication;
        if (/(pressure|bp|hypertension)/.test(msg)) return medicalKnowledge.lifestyle["blood pressure"];

        // ECG Specific Knowledge
        if (/(value|mv|milivolt|p wave|qrs|t wave|interval|segment)/.test(msg)) {
            return "Standard ECG parameters: P-wave represents atrial depolarization, the QRS complex (0.08-0.10s) represents ventricular depolarization, and the T-wave shows repolarization. You can use the crosshair tool on the canvas to measure these values.";
        }

        // Tool Help
        if (/(how to|help|instructions|zoom|reset|upload|measure)/.test(msg)) {
            return "You can upload an ECG image using the 'Upload' button, use Zoom to see details, and move your mouse over the signal to see real-time mV measurements.";
        }

        // Fallback
        if (msg.length < 4) return "Could you please provide more details so I can assist you better?";

        return "That's an interesting point. While I specialize in heart health and ECG analysis, I need a bit more context to give you a precise answer. Are you asking about a specific symptom or condition?";
    }

    /* ===== SMART REGION SELECT (ECGVIEWER STYLE) ===== */


    function canvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width  / rect.width),
            y: (e.clientY - rect.top)  * (canvas.height / rect.height)
        };
    }

    function toImage(cx, cy) {
        return {
            x: view.x + (cx - ox) / s,
            y: view.y + (cy - oy) / s
        };
    }

    canvas.addEventListener("mousedown", function (e) {
        if (!img.src || !img.naturalWidth) return;
        e.preventDefault();

        const cp = canvasPos(e);
        const ip = toImage(cp.x, cp.y);

// 👉 PAN MODE
        if (panMode) {
            isPanning = true;
            panStart = { x: cp.x, y: cp.y };
            panImgStart = { x: view.x, y: view.y };
            return;
        }

        startX = ip.x;
        startY = ip.y;
        endX = ip.x;
        endY = ip.y;
        isSelecting = true;
    });

    canvas.addEventListener("mousemove", function (e) {
        const cp = canvasPos(e);
        const ip = toImage(cp.x, cp.y);

        hoverCanvasX = cp.x;
        hoverCanvasY = cp.y;

        // 👉 PAN MOVE
        if (isPanning) {
            const dx = (cp.x - panStart.x) / s;
            const dy = (cp.y - panStart.y) / s;

            view.x = panImgStart.x - dx;
            view.y = panImgStart.y - dy;

            draw();
            return;
        }

        if (!isSelecting) {
            draw();
            return;
        }
        endX = ip.x; endY = ip.y;
        draw();

        const x1 = ox + (startX - view.x) * s;
        const y1 = oy + (startY - view.y) * s;
        const x2 = ox + (endX   - view.x) * s;
        const y2 = oy + (endY   - view.y) * s;
        ctx.save();
        ctx.strokeStyle = "#0a66c2";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
        ctx.fillStyle = "rgba(10,102,194,0.10)";
        ctx.fillRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
        ctx.restore();
    });

    canvas.addEventListener("mouseup", function () {

        // 👉 STOP PAN FIRST
        if (isPanning) {
            isPanning = false;
            return;
        }
        if (!isSelecting) return;
        isSelecting = false;

        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);
        if (w < 8 || h < 8) { draw(); return; }

        history.push({ ...view });
        view.x = Math.min(startX, endX);
        view.y = Math.min(startY, endY);
        view.w = w;
        view.h = h;
        updateBackBtn();
        draw();
    });

    canvas.addEventListener("mouseleave", function () {
        hoverCanvasX = null;
        hoverCanvasY = null;
        if (isSelecting) isSelecting = false;
        draw();
    });



    /* DASHED BLACK RECTANGLE */


    /* SAVE CURRENT IMAGE */
    document.getElementById("saveRegion").onclick = function () {
        if (!img.naturalWidth) return;
        const off = document.createElement("canvas");
        off.width  = Math.round(view.w);
        off.height = Math.round(view.h);
        off.getContext("2d").drawImage(img, view.x, view.y, view.w, view.h, 0, 0, view.w, view.h);
        const link = document.createElement("a");
        link.download = "ecg_region.png";
        link.href = off.toDataURL("image/png");
        link.click();
    };
    /* ===== REQUIRED DRAW FUNCTIONS ===== */
    /* PATIENT PANEL */
    window.togglePatientPanel = function() {
        const fields = document.getElementById("patientFields");
        const btn = document.getElementById("patientToggleBtn");
        if (fields.style.display === "none") {
            fields.style.display = "block";
            btn.textContent = "▲ Collapse";
        } else {
            fields.style.display = "none";
            btn.textContent = "▼ Expand";
        }
    };

    window.savePatient = function() {
        const msg = document.getElementById("patSaveMsg");
        msg.style.display = "block";
        setTimeout(() => { msg.style.display = "none"; }, 3000);
    };

    window.clearPatient = function() {
        ["patFirstName","patLastName","patDOB","patGender","patAge","patID","patMeds","patNotes"]
            .forEach(id => { document.getElementById(id).value = ""; });
        document.querySelectorAll("#patientFields input[type=checkbox]")
            .forEach(cb => { cb.checked = false; });
    };

    // --- 1. DARK MODE LOGIC ---
    const darkModeBtn = document.getElementById('darkModeToggle');
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');

        if (isDark) {
            darkModeBtn.innerHTML = "☀️ Light Mode";
            darkModeBtn.style.background = "#444";
            darkModeBtn.style.color = "#eee";
        } else {
            darkModeBtn.innerHTML = "🌙 Dark Mode";
            darkModeBtn.style.background = "#e0e0e0";
            darkModeBtn.style.color = "#333";
        }
    });

// --- 5. SUMMARY PANEL TOGGLE ---
    function toggleSummaryPanel() {
        const fields = document.getElementById("summaryFields");
        const btn = document.getElementById("summaryToggleBtn");
        if (fields.style.display === "none") {
            fields.style.display = "block";
            btn.innerText = "▲ Collapse";
        } else {
            fields.style.display = "none";
            btn.innerText = "▼ Expand";
        }
    }

// --- 6. PDF EXPORT LOGIC ---
    document.getElementById('exportPDF').addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Земање на податоци
        const name = document.getElementById('patFirstName').value || "N/A";
        const lastName = document.getElementById('patLastName').value || "N/A";
        const age = document.getElementById('patAge').value || "N/A";

        // Наслов и Податоци
        doc.setFontSize(22);
        doc.setTextColor(10, 102, 194);
        doc.text("ECG Examination Report", 20, 20);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Patient: ${name} ${lastName}`, 20, 40);
        doc.text(`Age: ${age}`, 20, 50);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);

        // Слика од ECG Canvas
        const canvas = document.getElementById('canvas');
        const imgData = canvas.toDataURL("image/png");
        doc.addImage(imgData, 'PNG', 15, 70, 180, 100); // Прилагоди големина

        doc.text("Findings:", 20, 180);
        doc.text(`- Heart Rate: ${document.getElementById('resHR').innerText} bpm`, 20, 190);
        doc.text(`- Clinical Notes: ${document.getElementById('patNotes').value || "No notes."}`, 20, 200);

        doc.save(`ECG_Report_${lastName}.pdf`);
    });



    /* =========================================================
   EXPORT PNG/JPG IMAGE AS XML
   ========================================================= */

    const exportImageXMLButton = document.getElementById("exportImageXML");

    if (exportImageXMLButton) {

        exportImageXMLButton.addEventListener("click", function () {

            const uploadInput = document.getElementById("upload");

            // Проверка дали има избрана слика
            if (!uploadInput.files || uploadInput.files.length === 0) {
                alert("Please upload a PNG or JPG image first.");
                return;
            }

            const file = uploadInput.files[0];

            // Проверка дали е слика
            if (!file.type.startsWith("image/")) {
                alert("Please select a PNG or JPG image.");
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {

                // Оригиналната слика како Base64
                const base64Image = event.target.result;

                // Име на датотеката
                const fileName = file.name;

                // Тип на сликата
                const fileType = file.type;

                // Големина на сликата
                const fileSize = file.size;

                // Креирање XML
                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ECGImage>
    <FileName>${escapeXML(fileName)}</FileName>
    <Format>${escapeXML(fileType)}</Format>
    <FileSize>${fileSize}</FileSize>
    <ImageData>${base64Image}</ImageData>
</ECGImage>`;

                // XML како Blob
                const blob = new Blob(
                    [xml],
                    {
                        type: "application/xml;charset=utf-8"
                    }
                );

                // Направи download link
                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");

                link.href = url;

                // Името на XML
                const dotIndex = fileName.lastIndexOf(".");

                const nameWithoutExtension =
                    dotIndex !== -1
                        ? fileName.substring(0, dotIndex)
                        : fileName;

                link.download = nameWithoutExtension + ".xml";

                // Download
                document.body.appendChild(link);

                link.click();

                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                alert("ECG image successfully exported as XML!");
            };

            reader.onerror = function () {
                alert("Error reading the image.");
            };

            reader.readAsDataURL(file);
        });
    }


    /* =========================================================
       XML ESCAPE
       ========================================================= */

    function escapeXML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }


});
