const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("csvFile");
const dropZone = document.getElementById("dropZone");
const fileName = document.getElementById("fileName");
const statusMessage = document.getElementById("statusMessage");
const resultsDashboard = document.getElementById("resultsDashboard");
const emptyState = document.getElementById("emptyState");
const resultGrid = document.getElementById("resultGrid");
const summaryModel = document.getElementById("summaryModel");
const summarySamples = document.getElementById("summarySamples");
const summaryCoverage = document.getElementById("summaryCoverage");
const predictButton = uploadForm.querySelector(".predict-button");
const demoButtons = document.querySelectorAll("[data-demo]");
const exportPdfButton = document.getElementById("exportPdfButton");
const analysisOverlay = document.getElementById("analysisOverlay");
const loadingPhase = document.getElementById("loadingPhase");
const insightsEmpty = document.getElementById("insightsEmpty");
const insightCard = document.getElementById("insightCard");
const insightTitle = document.getElementById("insightTitle");
const insightText = document.getElementById("insightText");
const validationAlert = document.getElementById("validationAlert");
const alertTitle = document.getElementById("alertTitle");
const alertMessage = document.getElementById("alertMessage");
const alertDetails = document.getElementById("alertDetails");
const explainabilityEmpty = document.getElementById("explainabilityEmpty");
const explainabilityDashboard = document.getElementById("explainabilityDashboard");
const globalGeneChips = document.getElementById("globalGeneChips");
const explainabilityClassName = document.getElementById("explainabilityClassName");
const summaryPlotTitle = document.getElementById("summaryPlotTitle");
const shapSummaryImage = document.getElementById("shapSummaryImage");
const geneBars = document.getElementById("geneBars");
let latestPayload = null;
let loadingTimer = null;

const loadingPhases = [
    "Scanning expression matrix...",
    "Aligning trained gene biomarkers...",
    "Simulating neural diagnostic pathways...",
    "Computing disease probability vectors...",
    "Preparing explainable AI report...",
];

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status-message";
    if (type) {
        statusMessage.classList.add(`is-${type}`);
    }
}

function hideValidationAlert() {
    validationAlert.hidden = true;
    alertTitle.textContent = "";
    alertMessage.textContent = "";
    alertDetails.innerHTML = "";
}

function showValidationAlert(error) {
    const details = Array.isArray(error.details) ? error.details : [];
    alertTitle.textContent = error.title || "Invalid gene expression file";
    alertMessage.textContent = error.message || String(error);
    alertDetails.innerHTML = "";
    details.forEach((detail) => {
        const item = document.createElement("li");
        item.textContent = detail;
        alertDetails.appendChild(item);
    });
    validationAlert.hidden = false;
}

function setLoading(isLoading) {
    predictButton.disabled = isLoading;
    predictButton.classList.toggle("is-loading", isLoading);
    predictButton.lastChild.textContent = isLoading ? "Analyzing..." : "Analyze Expression Profile";
}

function showAnalysisOverlay() {
    let phaseIndex = 0;
    loadingPhase.textContent = loadingPhases[phaseIndex];
    analysisOverlay.hidden = false;
    loadingTimer = window.setInterval(() => {
        phaseIndex = (phaseIndex + 1) % loadingPhases.length;
        loadingPhase.textContent = loadingPhases[phaseIndex];
    }, 900);
}

function hideAnalysisOverlay() {
    analysisOverlay.hidden = true;
    if (loadingTimer) {
        window.clearInterval(loadingTimer);
        loadingTimer = null;
    }
}

function updateFileName() {
    const file = fileInput.files[0];
    fileName.textContent = file ? file.name : "Drop CSV file here or browse";
    hideValidationAlert();
    setStatus(file ? "File ready for AI analysis." : "", file ? "success" : "");
}

function renderGlobalGenes(genes) {
    globalGeneChips.innerHTML = "";
    genes.slice(0, 10).forEach((gene) => {
        const chip = document.createElement("span");
        chip.textContent = gene.gene;
        globalGeneChips.appendChild(chip);
    });
}

function renderGeneBars(genes) {
    geneBars.innerHTML = "";
    const maxImportance = Math.max(...genes.map((gene) => gene.importance), 0.000001);

    genes.slice(0, 10).forEach((gene, index) => {
        const width = Math.max((gene.importance / maxImportance) * 100, 4);
        const row = document.createElement("div");
        row.className = "gene-bar-row";
        row.innerHTML = `
            <div class="gene-rank">${String(index + 1).padStart(2, "0")}</div>
            <div class="gene-bar-main">
                <div class="gene-name">${gene.gene}</div>
                <div class="gene-track"><span style="width: ${width}%"></span></div>
            </div>
            <div class="gene-score">${gene.importance.toFixed(6)}</div>
        `;
        geneBars.appendChild(row);
    });
}

function renderHistogram(histogram) {
    const counts = histogram?.counts || [];
    const maxCount = Math.max(...counts, 1);
    return counts
        .map((count, index) => {
            const height = Math.max((count / maxCount) * 100, 5);
            const label = histogram.bins?.[index] || "";
            return `<span title="${label}: ${count}" style="height: ${height}%"></span>`;
        })
        .join("");
}

function renderPieChart(probabilities) {
    const values = Object.values(probabilities);
    let cursor = 0;
    const colors = ["#42e8a3", "#ff7db8", "#ffd166"];
    const segments = values.map((item, index) => {
        const start = cursor;
        cursor += item.percent;
        return `${colors[index]} ${start}% ${cursor}%`;
    });
    return `<div class="pie-chart" style="background: conic-gradient(${segments.join(", ")});"></div>`;
}

function renderInsight(result) {
    insightsEmpty.hidden = true;
    insightCard.hidden = false;
    insightTitle.textContent = `${result.prediction} | ${result.confidence}% confidence`;
    insightText.textContent = result.insight;
}

function renderExplainability(result, payload) {
    explainabilityEmpty.hidden = true;
    explainabilityDashboard.hidden = false;

    const explanation = result.explainability || {};
    const topGenes = explanation.top_genes || [];
    renderGlobalGenes(payload.explainability?.global_top_genes || []);
    renderGeneBars(topGenes);

    explainabilityClassName.textContent = result.prediction;
    summaryPlotTitle.textContent = `${result.prediction} biomarker map`;

    if (explanation.summary_image) {
        shapSummaryImage.hidden = false;
        shapSummaryImage.src = explanation.summary_image;
        shapSummaryImage.alt = `SHAP summary plot for ${result.prediction}`;
    } else {
        shapSummaryImage.hidden = true;
    }
}

function renderResults(payload) {
    latestPayload = payload;
    emptyState.hidden = true;
    resultsDashboard.hidden = false;
    resultGrid.innerHTML = "";
    explainabilityEmpty.hidden = true;
    explainabilityDashboard.hidden = false;

    summaryModel.textContent = payload.model_name;
    summarySamples.textContent = payload.sample_count;
    summaryCoverage.textContent = `${payload.gene_coverage}%`;
    renderGlobalGenes(payload.explainability?.global_top_genes || []);

    payload.results.forEach((result, index) => {
        const card = document.createElement("article");
        card.className = `result-card ${result.tone}`;
        card.style.animationDelay = `${index * 80}ms`;

        const probabilityRows = Object.values(result.probabilities)
            .map((item) => `
                <div class="probability-row">
                    <span>${item.name}</span>
                    <div class="bar" aria-hidden="true"><span style="width: ${item.percent}%"></span></div>
                    <strong>${item.percent}%</strong>
                </div>
            `)
            .join("");

        const topGeneTags = (result.explainability?.top_genes || [])
            .slice(0, 5)
            .map((gene) => `<span>${gene.gene}</span>`)
            .join("");

        card.innerHTML = `
            <div class="sample-id">Sample: ${result.sample_id}</div>
            <div class="prediction-label">${result.prediction}</div>
            <div class="result-visuals">
                <div class="confidence-dial" style="--confidence: ${result.confidence * 3.6}deg">
                    <strong>${result.confidence}%</strong>
                    <span>confidence</span>
                </div>
                ${renderPieChart(result.probabilities)}
            </div>
            <p>${result.summary}</p>
            <div class="probabilities">${probabilityRows}</div>
            <div class="histogram-card">
                <strong>Expression histogram</strong>
                <div class="histogram">${renderHistogram(result.histogram)}</div>
            </div>
            <div class="mini-explainability">
                <strong>Influential genes</strong>
                <div>${topGeneTags}</div>
            </div>
            <button class="explain-button" type="button">View SHAP explanation</button>
        `;

        card.querySelector(".explain-button").addEventListener("click", () => {
            renderExplainability(result, payload);
            document.getElementById("explainability").scrollIntoView({ behavior: "smooth", block: "start" });
        });

        resultGrid.appendChild(card);
    });

    if (payload.results.length > 0) {
        renderExplainability(payload.results[0], payload);
        renderInsight(payload.results[0]);
    }

    document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runPredictionRequest(requestPromise, successMessage) {
    setLoading(true);
    hideValidationAlert();
    showAnalysisOverlay();
    setStatus("AI genomic analysis running...");

    try {
        const startedAt = Date.now();
        const response = await requestPromise;
        const payload = await response.json();
        const elapsed = Date.now() - startedAt;
        if (elapsed < 1400) {
            await new Promise((resolve) => window.setTimeout(resolve, 1400 - elapsed));
        }

        if (!response.ok) {
            const error = payload.error || {
                title: "Invalid gene expression file",
                message: "Prediction failed.",
                details: ["Verify the CSV structure and try again."],
            };
            showValidationAlert(typeof error === "string" ? { message: error } : error);
            throw new Error(typeof error === "string" ? error : error.message);
        }

        renderResults(payload);
        setStatus(successMessage, "success");
    } catch (error) {
        setStatus(error.message, "error");
    } finally {
        hideAnalysisOverlay();
        setLoading(false);
    }
}

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("is-dragover");
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragover");

    const file = event.dataTransfer.files[0];
    if (file) {
        fileInput.files = event.dataTransfer.files;
        updateFileName();
    }
});

fileInput.addEventListener("change", updateFileName);

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
        showValidationAlert({
            title: "Invalid gene expression file",
            message: "Please choose a CSV file first.",
            details: ["Select a gene expression matrix before running the AI model."],
        });
        setStatus("Please choose a CSV file first.", "error");
        return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
        showValidationAlert({
            title: "Unsupported format",
            message: "Only CSV files are supported.",
            details: ["Upload a file ending in .csv."],
        });
        setStatus("Only CSV files are supported.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    await runPredictionRequest(
        fetch("/predict", {
            method: "POST",
            body: formData,
        }),
        "Prediction completed successfully."
    );
});

demoButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        const demo = button.dataset.demo;
        fileName.textContent = `Built-in demo: ${button.textContent}`;
        await runPredictionRequest(
            fetch(`/demo/${demo}`, { method: "POST" }),
            `${button.textContent} completed successfully.`
        );
    });
});

exportPdfButton.addEventListener("click", async () => {
    if (!latestPayload) {
        showValidationAlert({
            title: "Report unavailable",
            message: "Run a prediction before exporting a PDF report.",
            details: ["Upload a CSV or launch a built-in demo first."],
        });
        return;
    }

    setStatus("Generating clinical AI PDF report...");
    const response = await fetch("/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latestPayload),
    });

    if (!response.ok) {
        const payload = await response.json();
        showValidationAlert(payload.error || { message: "PDF export failed." });
        setStatus("PDF export failed.", "error");
        return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "autoimmune_ai_report.pdf";
    link.click();
    window.URL.revokeObjectURL(url);
    setStatus("PDF report exported successfully.", "success");
});
