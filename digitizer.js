/* ============================================================
   digitizer.js  —  ECG Image Digitizer
   ============================================================ */

(function () {

    const state = {
        mode: "idle",
        calibStep: 0,
        baseline: null,
        refPoint: null,
        mvPerPixel: null,
        msPerPixel: null,
        signalMap: null,
        scanRegion: null,
    };

    document.addEventListener("DOMContentLoaded", function () {

        const panel     = document.getElementById("digitizerPanel");
        const status    = document.getElementById("digiStatus");
        const readout   = document.getElementById("digiReadout");
        const calibInfo = document.getElementById("digiCalibInfo");
        const calibBtn  = document.getElementById("digiCalibBtn");
        const scanBtn   = document.getElementById("digiScanBtn");
        const clearBtn  = document.getElementById("digiClearBtn");

        document.getElementById("upload").addEventListener("change", function () {
            setTimeout(function () {
                panel.style.display = "block";
                setStatus("Image loaded. Click 📏 Set Calibration to begin.", "blue");
            }, 800);
        });

        calibBtn.addEventListener("click", function () {
            if (!getEcg().img.naturalWidth) { setStatus("Please upload an image first.", "red"); return; }
            state.mode = "calibrating";
            state.calibStep = 0;
            state.baseline = null;
            state.refPoint = null;
            state.mvPerPixel = null;
            state.signalMap = null;
            setStatus("STEP 1/2 — Click on the BASELINE (flat isoelectric line).", "orange");
            calibInfo.innerText = "";
            readout.innerText = "Click on the flat baseline...";
        });

        scanBtn.addEventListener("click", function () {
            if (!getEcg().img.naturalWidth) { setStatus("Please upload an image first.", "red"); return; }
            if (!state.mvPerPixel) { setStatus("Please calibrate first.", "red"); return; }
            state.mode = "scanning";
            setStatus("Drag to select the ECG lead region to scan.", "orange");
            readout.innerText = "Draw a box around one ECG lead...";
        });

        clearBtn.addEventListener("click", function () {
            state.mode = "idle";
            state.calibStep = 0;
            state.baseline = null;
            state.refPoint = null;
            state.mvPerPixel = null;
            state.signalMap = null;
            state.scanRegion = null;
            setStatus("Cleared.", "blue");
            readout.innerText = "Hover over ECG to read values";
            calibInfo.innerText = "";
        });

        getCanvas().addEventListener("mousedown", function (e) {
            if (state.mode !== "calibrating") return;
            e.stopImmediatePropagation();
            const ip = getImagePoint(e);
            if (state.calibStep === 0) {
                state.baseline = ip;
                state.calibStep = 1;
                setStatus("STEP 2/2 — Click 1 mV ABOVE the baseline (top of 1 large square).", "orange");
                drawCalibMarker(ip, "#0a66c2", "Baseline");
            } else if (state.calibStep === 1) {
                state.refPoint = ip;
                const pixelDiff = Math.abs(state.baseline.imgY - state.refPoint.imgY);
                if (pixelDiff < 2) { setStatus("Too close — click further above.", "red"); return; }
                state.mvPerPixel = 1.0 / pixelDiff;
                state.mode = "ready";
                setStatus("✅ Calibrated! 1 mV = " + pixelDiff.toFixed(1) + " px. Now click 🔍 Scan.", "green");
                calibInfo.innerText = "1 mV = " + pixelDiff.toFixed(1) + " px";
                drawCalibMarker(ip, "#28a745", "1 mV");
            }
        }, true);

        getCanvas().addEventListener("mousemove", function (e) {
            if (state.mode !== "ready") return;
            if (!state.mvPerPixel || !state.baseline) return;
            const ip = getImagePoint(e);
            if (state.signalMap && state.scanRegion) {
                const col = Math.floor(ip.imgX - state.scanRegion.x);
                if (col >= 0 && col < state.signalMap.length) {
                    const mv = state.signalMap[col];
                    readout.innerText = "⚡ " + mv.toFixed(3) + " mV  |  col: " + col;
                }
            } else {
                const diffY = state.baseline.imgY - ip.imgY;
                const mv = diffY * state.mvPerPixel;
                readout.innerText = "⚡ " + mv.toFixed(3) + " mV";
            }
        });

        getCanvas().addEventListener("mouseup", function () {
            if (state.mode !== "scanning") return;
            setTimeout(function () {
                const ecg = getEcg();
                state.scanRegion = { ...ecg.view };
                runScan();
            }, 50);
        });

        function runScan() {
            const ecg = getEcg();
            const img = ecg.img;
            if (!img.naturalWidth) return;
            const region = state.scanRegion;
            setStatus("🔍 Scanning pixels...", "orange");

            const off = document.createElement("canvas");
            off.width  = Math.round(region.w);
            off.height = Math.round(region.h);
            const offCtx = off.getContext("2d");
            offCtx.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);

            const imageData = offCtx.getImageData(0, 0, off.width, off.height);
            const data = imageData.data;
            const W = off.width;
            const H = off.height;
            const signalMap = new Float32Array(W);

            for (let x = 0; x < W; x++) {
                let minBrightness = 255;
                let bestY = H / 2;
                for (let y = 0; y < H; y++) {
                    const idx = (y * W + x) * 4;
                    const r = data[idx], g = data[idx+1], b = data[idx+2];
                    if (r > 150 && g < 120 && b < 120) continue; // skip red grid
                    if (r > 220 && g > 220 && b > 220) continue; // skip white bg
                    const brightness = (r + g + b) / 3;
                    if (brightness < minBrightness) { minBrightness = brightness; bestY = y; }
                }
                const imgY = region.y + bestY;
                signalMap[x] = (state.baseline.imgY - imgY) * state.mvPerPixel;
            }

            state.signalMap = signalMap;
            state.mode = "ready";
            setStatus("✅ Done! Hover over the lead to read mV values.", "green");
            readout.innerText = "Hover over scanned region...";
        }

        function drawCalibMarker(ip, color, label) {
            const ecg = getEcg();
            const cx = ecg.ox + (ip.imgX - ecg.view.x) * ecg.s;
            const cy = ecg.oy + (ip.imgY - ecg.view.y) * ecg.s;
            ecg.ctx.save();
            ecg.ctx.strokeStyle = color;
            ecg.ctx.fillStyle = color;
            ecg.ctx.lineWidth = 2;
            ecg.ctx.beginPath();
            ecg.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ecg.ctx.stroke();
            ecg.ctx.font = "bold 13px Arial";
            ecg.ctx.fillText(label, cx + 9, cy + 4);
            ecg.ctx.restore();
        }

        function getEcg()    { return window._ecg; }
        function getCanvas() { return window._ecg.canvas; }

        function getImagePoint(e) {
            const ecg = getEcg();
            const rect = ecg.canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * (ecg.canvas.width  / rect.width);
            const cy = (e.clientY - rect.top)  * (ecg.canvas.height / rect.height);
            return {
                imgX: ecg.view.x + (cx - ecg.ox) / ecg.s,
                imgY: ecg.view.y + (cy - ecg.oy) / ecg.s
            };
        }

        function setStatus(msg, color) {
            const colors = { blue: "#0a66c2", green: "#28a745", orange: "#e67e00", red: "#dc3545" };
            status.innerText = msg;
            status.style.color = colors[color] || "#333";
        }

    });

})();