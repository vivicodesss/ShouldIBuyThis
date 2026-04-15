function scrollToForm() {
    const formSection =
        document.getElementById('form-section') ||
        document.getElementById('main-page') ||
        document.getElementById('main-form') ||
        document.getElementById('analyze-section');

    if (!formSection) return;

    formSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function resetButton() {
    const btnText = document.querySelector('.btn-text');
    const btnIcon = document.querySelector('.btn-icon');
    const btnLoading = document.querySelector('.btn-loading');
    const btn = document.getElementById('btn-analyze');

    if (btnText) btnText.style.display = 'inline';
    if (btnIcon) btnIcon.style.display = 'inline-flex';
    if (btnLoading) btnLoading.style.display = 'none';
    if (btn) btn.disabled = false;
}

function showError(message) {
    const resultSection = document.getElementById('result-section');
    if (resultSection) resultSection.style.display = 'block';

    const icon = document.getElementById('verdict-icon');
    const label = document.getElementById('verdict-label');
    const tagline = document.getElementById('verdict-tagline');

    if (icon) icon.textContent = "⚠️";
    if (label) label.textContent = "ERROR";
    if (tagline) tagline.textContent = message;
}

function convertAIToUIFormat(data) {
    return {
        verdict: data.verdict || "WAIT",
        verdict_reason: data.verdict_reason || "No reason provided.",
        bias_flags: data.bias_flags || [],
        cheaper_alternative: data.cheaper_alternative || "No cheaper alternative suggested.",
        better_timing: data.better_timing || "No better timing suggested.",
        financial_impact: data.financial_impact || "No financial impact provided.",
        confidence: data.confidence || "medium"
    };
}

function renderResult(result) {
    const verdictIcon = document.getElementById('verdict-icon');
    const verdictLabel = document.getElementById('verdict-label');
    const verdictTagline = document.getElementById('verdict-tagline');

    if (verdictIcon) {
        if (result.verdict === "BUY") verdictIcon.textContent = "✅";
        else if (result.verdict === "DON'T BUY") verdictIcon.textContent = "❌";
        else verdictIcon.textContent = "⏳";
    }

    if (verdictLabel) verdictLabel.textContent = result.verdict;
    if (verdictTagline) verdictTagline.textContent = result.verdict_reason;

    const analysisBody = document.getElementById('analysis-body');
    const financialBody = document.getElementById('financial-body');
    const biasesBody = document.getElementById('biases-body');
    const explanationBody = document.getElementById('explanation-body');

    if (analysisBody) {
        analysisBody.innerHTML = `
            <p><strong>Cheaper Alternative:</strong> ${result.cheaper_alternative}</p>
            <p><strong>Better Timing:</strong> ${result.better_timing}</p>
        `;
    }

    if (financialBody) {
        financialBody.innerHTML = `
            <p>${result.financial_impact}</p>
            <p><strong>Confidence:</strong> ${result.confidence}</p>
        `;
    }

    if (biasesBody) {
        biasesBody.innerHTML = result.bias_flags.length
            ? `<ul>${result.bias_flags.map(f => `<li>${f}</li>`).join('')}</ul>`
            : '<p>No major bias detected.</p>';
    }

    if (explanationBody) {
        explanationBody.innerHTML = `<p>${result.verdict_reason}</p>`;
    }
}

function resetForm() {
    const form = document.getElementById('purchase-form');
    if (form) form.reset();

    const resultSection = document.getElementById('result-section');
    if (resultSection) resultSection.style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shareResult() {
    const label = document.getElementById('verdict-label');
    const tagline = document.getElementById('verdict-tagline');

    const labelText = label ? label.textContent : '';
    const taglineText = tagline ? tagline.textContent : '';
    const text = `ShouldIBuyThis? AI says: ${labelText} — ${taglineText}`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Result copied to clipboard!');
        }).catch(() => {
            alert('Could not copy. Please copy manually.');
        });
    } else {
        alert(text);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log("FORM SUBMITTED ✅");

    const btnText = document.querySelector('.btn-text');
    const btnIcon = document.querySelector('.btn-icon');
    const btnLoading = document.querySelector('.btn-loading');
    const btnAnalyze = document.getElementById('btn-analyze');

    if (btnText) btnText.style.display = 'none';
    if (btnIcon) btnIcon.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';
    if (btnAnalyze) btnAnalyze.disabled = true;

    const productEl = document.getElementById("product-name");
    const priceEl = document.getElementById("product-price");
    const incomeEl = document.getElementById("monthly-income");
    const reasonEl = document.getElementById("purchase-reason");

    const product = productEl ? productEl.value.trim() : '';
    const price = priceEl ? Number(priceEl.value) : NaN;
    const income = incomeEl ? Number(incomeEl.value) : NaN;
    const reason = reasonEl ? reasonEl.value.trim() : '';

    if (!product || isNaN(price) || isNaN(income) || price <= 0 || income <= 0) {
        showError("⚠️ Fill all required fields properly");
        resetButton();
        return;
    }

    const payload = { product, price, income, reason };
    console.log("Payload:", payload);

    const resultSection = document.getElementById('result-section');
    if (resultSection) resultSection.style.display = 'block';

    const icon = document.getElementById('verdict-icon');
    const label = document.getElementById('verdict-label');
    const tagline = document.getElementById('verdict-tagline');

    if (icon) icon.textContent = "🧠";
    if (label) label.textContent = "THINKING...";
    if (tagline) tagline.textContent = "Analyzing your purchase...";

    try {
        const res = await fetch("http://localhost:5000/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Server error");
        }

        const data = await res.json();

        if (!data.verdict) {
            throw new Error("Invalid response from server");
        }

        const result = convertAIToUIFormat(data);
        renderResult(result);

        if (resultSection) {
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (err) {
        console.error(err);
        showError("⚠️ " + err.message);
    }

    resetButton();
}

// Attach form listener
const form = document.getElementById('purchase-form');
if (form) {
    console.log("Form listener attached ✅");
    form.addEventListener('submit', handleFormSubmit);
}