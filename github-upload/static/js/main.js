// Referências aos elementos do DOM - Sliders
const sliderBaseRec = document.getElementById('slider-base-rec');
const sliderTIbs = document.getElementById('slider-t-ibs');
const sliderThetaRet = document.getElementById('slider-theta-ret');
const sliderRenda = document.getElementById('slider-renda');
const sliderEob = document.getElementById('slider-eob');

const valBaseRec = document.getElementById('val-base-rec');
const valTIbs = document.getElementById('val-t-ibs');
const valThetaRet = document.getElementById('val-theta-ret');
const valRenda = document.getElementById('val-renda');
const valEob = document.getElementById('val-eob');

// Referências - KPIs Originais (Estáticos)
const kpiK = document.getElementById('kpi-k');
const kpiDeltaC = document.getElementById('kpi-delta-c');
const kpiRRisco = document.getElementById('kpi-r-risco');
const kpiEpl = document.getElementById('kpi-epl');
const eplCard = document.getElementById('epl-card');
const eplBadge = document.getElementById('epl-badge');

// Referências - KPIs da Linha do Tempo
const valTimelineEq = document.getElementById('val-timeline-eq');
const valTimelinePerda = document.getElementById('val-timeline-perda');
const valTimelineReceita = document.getElementById('val-timeline-receita');
const timelineKpiEq = document.getElementById('timeline-kpi-eq');
const timelineKpiReceita = document.getElementById('timeline-kpi-receita');
const timelineKpiPerda = document.getElementById('timeline-kpi-perda');

// Referências - Insights e Tabs
const timelineInsight = document.getElementById('timeline-insight');
const mcInsight = document.getElementById('mc-insight');
const tabRetention = document.getElementById('tab-retention');
const tabAliquot = document.getElementById('tab-aliquot');

// Presets
const btnPresetAtual = document.getElementById('preset-atual');
const btnPresetFomento = document.getElementById('preset-fomento');
const btnPresetMax = document.getElementById('preset-max');

// Banco de dados de municípios pre-configurados (Caso Base + Vizinhos/Regionais)
const MUNICIPALITIES = {
    pradopolis: {
        name: "Pradópolis - SP",
        r_risco: 24655746.26,
        r_atual: 40025514.89,
        massa_salarial: 513712915.20,
        beneficios: 107536530.07,
        tooltip: "Polo agroindustrial sucroenergético de pequeno porte. Altíssima dependência do VAF industrial (IVT de 61,6%)."
    },
    barrinha: {
        name: "Barrinha - SP",
        r_risco: 18200000.00,
        r_atual: 32500000.00,
        massa_salarial: 420000000.00,
        beneficios: 95000000.00,
        tooltip: "Município vizinho caracterizado por forte atividade industrial metalomecânica e cerâmica, com alta vulnerabilidade tributária (IVT de 56,0%)."
    },
    dumont: {
        name: "Dumont - SP",
        r_risco: 2800000.00,
        r_atual: 15000000.00,
        massa_salarial: 280000000.00,
        beneficios: 65000000.00,
        tooltip: "Município residencial com baixa arrecadação industrial e alta evasão de consumo para Ribeirão Preto (baixo risco na transição - IVT de 18,7%)."
    },
    ribeirao_preto: {
        name: "Ribeirão Preto - SP",
        r_risco: 150000000.00,
        r_atual: 780000000.00,
        massa_salarial: 9800000000.00,
        beneficios: 1900000000.00,
        tooltip: "Metrópole regional, centro financeiro e comercial de grande porte. Altíssimo faturamento comercial no destino (IVT de 19,2%)."
    }
};

// Estado da Aplicação
let currentMunicipalityKey = 'pradopolis';
let activeTab = 'retention'; // 'retention' ou 'aliquot'
let staticChartInstance = null;
let timelineChartInstance = null;
let tooltipEl = null; // Custom HTML Tooltip element

// Presets definidos no prompt (serão dinamicamente ajustados conforme o município ativo)
const presets = {
    atual: { theta_ret: 30, t_ibs: 17.7, renda: 621, base: 40 },
    fomento: { theta_ret: 46, t_ibs: 17.7, renda: 621, base: 40 },
    max: { theta_ret: 100, t_ibs: 17.7, renda: 621, base: 40 }
};

// Formatação Monetária
function formatCurrencyM(value) {
    const valInM = value / 1000000.0;
    return `R$ ${valInM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
}

// Slider fill: set CSS variable --fill-pct based on current value
function updateSliderFill(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--fill-pct', pct.toFixed(2) + '%');
}

// Flash animation for KPI value elements when they update
function flashValue(element) {
    if (!element) return;
    element.classList.remove('value-flash');
    void element.offsetWidth; // force reflow to restart animation
    element.classList.add('value-flash');
    element.addEventListener('animationend', () => element.classList.remove('value-flash'), { once: true });
}

// Helper de Cores de Tema
function getThemeColors() {
    const isLight = document.body.classList.contains('light-theme');
    return {
        gridColor: isLight ? 'rgba(0, 31, 63, 0.06)' : 'rgba(255, 255, 255, 0.04)',
        textColor: isLight ? '#475569' : '#94a3b8',
        tooltipBg: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(2, 16, 31, 0.98)',
        tooltipBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)',
        tooltipText: isLight ? '#0f172a' : '#F6F7ED',
        tooltipTitle: isLight ? '#00804C' : '#DBE64C',
        mcBarSurplus: isLight ? 'rgba(0, 128, 76, 0.5)' : 'rgba(116, 195, 101, 0.5)',
        mcBarDeficit: isLight ? 'rgba(216, 69, 58, 0.5)' : 'rgba(255, 110, 97, 0.5)',
        mcBorderSurplus: isLight ? '#00804C' : '#74C365',
        mcBorderDeficit: isLight ? '#d8453a' : '#FF6E61'
    };
}

// Aplicação de Preset
function applyPreset(presetName) {
    const config = presets[presetName];
    if (!config) return;

    sliderThetaRet.value = config.theta_ret;
    sliderTIbs.value = config.t_ibs;
    sliderRenda.value = config.renda;
    sliderBaseRec.value = config.base;

    // Update fills for all sliders
    [sliderBaseRec, sliderTIbs, sliderThetaRet, sliderRenda, sliderEob].forEach(updateSliderFill);

    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`preset-${presetName}`).classList.add('active');

    fetchSimulation();
}

// Handler de eventos de sliders
function onSliderInput(e) {
    if (e && e.target) updateSliderFill(e.target);
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    fetchSimulation();
}

// Bind de listeners para sliders e presets
[sliderBaseRec, sliderTIbs, sliderThetaRet, sliderRenda].forEach(slider => {
    slider.addEventListener('input', onSliderInput);
});

// EOB slider listener
if (sliderEob) {
    sliderEob.addEventListener('input', onSliderInput);
}

// Ações dos Presets
btnPresetAtual.addEventListener('click', () => applyPreset('atual'));
btnPresetFomento.addEventListener('click', () => applyPreset('fomento'));
btnPresetMax.addEventListener('click', () => applyPreset('max'));

// Tabs para o Gráfico de Sensibilidade Estático
tabRetention.addEventListener('click', () => {
    tabAliquot.classList.remove('active');
    tabRetention.classList.add('active');
    activeTab = 'retention';
    fetchSimulation();
});

tabAliquot.addEventListener('click', () => {
    tabRetention.classList.remove('active');
    tabAliquot.classList.add('active');
    activeTab = 'aliquot';
    fetchSimulation();
});

// Principal função para buscar e reconstruir os gráficos
async function fetchSimulation() {
    // Atualizar displays numéricos dos sliders
    valBaseRec.textContent = `R$ ${sliderBaseRec.value}M`;
    valTIbs.textContent = `${parseFloat(sliderTIbs.value).toFixed(1)}%`;
    valThetaRet.textContent = `${sliderThetaRet.value}%`;
    valRenda.textContent = `R$ ${sliderRenda.value}M`;

    const eobPct = sliderEob ? parseFloat(sliderEob.value) : 0;
    if (valEob) valEob.textContent = `+${eobPct}%`;

    // Update all slider fills
    [sliderBaseRec, sliderTIbs, sliderThetaRet, sliderRenda, sliderEob].forEach(updateSliderFill);

    const baseRecVal = parseFloat(sliderBaseRec.value) * 1000000.0;
    const tIbsVal = parseFloat(sliderTIbs.value);
    const thetaRetVal = parseFloat(sliderThetaRet.value);
    const rendaVal = parseFloat(sliderRenda.value) * 1000000.0;

    // Apply EOB expansion to income base
    const rendaWithEob = rendaVal * (1 + eobPct / 100.0);

    const mData = MUNICIPALITIES[currentMunicipalityKey];

    // Escalonar proporcionalmente massa salarial e benefícios baseado na rendaVal
    const totalBaseRenda = mData.massa_salarial + mData.beneficios;
    const ratio = totalBaseRenda > 0 ? (rendaVal / totalBaseRenda) : 1;

    // Payload para o cálculo dinâmico no backend
    const payload = {
        t_ibs: tIbsVal,
        c: 65.0,
        theta_ret: thetaRetVal,
        r_risco: mData.r_risco,
        r_atual: mData.r_atual,
        massa_salarial: mData.massa_salarial * ratio,
        beneficios: mData.beneficios * ratio,
        renda_disponivel: rendaWithEob
    };
    
    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.success) {
            updateStaticDOM(data);
            updateStaticChart(data);
            calculateAndRenderTimeline(baseRecVal, tIbsVal, thetaRetVal, rendaVal, mData.r_risco);
            updateMonteCarlo(data);
        }
    } catch (err) {
        console.error('Erro na simulação:', err);
    }
}

// 1. Atualizar KPIs do Bloco Estático
function updateStaticDOM(data) {
    if (kpiK) kpiK.textContent = data.k.toFixed(4);
    if (kpiDeltaC) kpiDeltaC.textContent = formatCurrencyM(data.delta_c_local);
    if (kpiRRisco) kpiRRisco.textContent = formatCurrencyM(data.r_risco);
    
    // Atualizar displays de IVT nos KPIs e banners de texto
    const valTimelineIvt = document.getElementById('val-timeline-ivt');
    const valTimelineIvtSubtext = document.getElementById('val-timeline-ivt-subtext');
    const valInfoIvt = document.getElementById('val-info-ivt');
    
    if (valTimelineIvt) valTimelineIvt.textContent = `${data.ivt.toFixed(1).replace('.', ',')}%`;
    if (valInfoIvt) valInfoIvt.textContent = data.ivt.toFixed(2).replace('.', ',');
    
    if (valTimelineIvtSubtext) {
        if (data.ivt >= 50) {
            valTimelineIvtSubtext.textContent = "Polo produtor — alto risco";
            valTimelineIvtSubtext.style.color = "#FF8A7A"; // Vermelho
        } else if (data.ivt >= 30) {
            valTimelineIvtSubtext.textContent = "Diversificado — médio risco";
            valTimelineIvtSubtext.style.color = "#DBE64C"; // Amarelo
        } else {
            valTimelineIvtSubtext.textContent = "Polo consumidor — baixo risco";
            valTimelineIvtSubtext.style.color = "#74C365"; // Verde
        }
    }
    
    if (kpiEpl) {
        const prefix = data.epl >= 0 ? '+' : '';
        kpiEpl.textContent = `${prefix}${formatCurrencyM(data.epl)}`;
        kpiEpl.style.color = data.epl >= 0 ? '#FF8A7A' : '#74C365';
        flashValue(kpiEpl);
    }
    
    if (eplCard) {
        if (data.epl >= 0) {
            eplCard.className = 'kpi-card glass-card deficit';
            if (eplBadge) eplBadge.textContent = 'Déficit';
        } else {
            eplCard.className = 'kpi-card glass-card surplus';
            if (eplBadge) eplBadge.textContent = 'Superávit';
        }
    }
}

// 2. Renderizar Gráfico de Sensibilidade Estático (Chart.js)
function updateStaticChart(data) {
    const ctx = document.getElementById('simulationChart').getContext('2d');
    
    let labels = [];
    let deltaCData = [];
    let rRiscoData = [];
    let activeIndex = -1;
    let xAxisLabel = '';
    
    if (activeTab === 'retention') {
        xAxisLabel = 'Índice de Retenção Local (θret %)';
        labels = data.retention_curve.map(item => `${item.theta_ret}%`);
        deltaCData = data.retention_curve.map(item => item.delta_c_local / 1000000.0);
        rRiscoData = data.retention_curve.map(() => data.r_risco / 1000000.0);
        
        const currentTheta = parseInt(sliderThetaRet.value);
        activeIndex = Math.min(Math.floor(currentTheta / 10) - 1, 9);
    } else {
        xAxisLabel = 'Alíquota do IBS (t_ibs %)';
        labels = data.aliquot_curve.map(item => `${item.t_ibs.toFixed(1)}%`);
        deltaCData = data.aliquot_curve.map(item => item.delta_c_local / 1000000.0);
        rRiscoData = data.aliquot_curve.map(() => data.r_risco / 1000000.0);
        
        const currentAliquot = parseFloat(sliderTIbs.value);
        let minDiff = Infinity;
        data.aliquot_curve.forEach((item, idx) => {
            const diff = Math.abs(item.t_ibs - currentAliquot);
            if (diff < minDiff) {
                minDiff = diff;
                activeIndex = idx;
            }
        });
    }
    
    if (staticChartInstance) {
        staticChartInstance.destroy();
    }

    // Find break-even index: where ΔC_local >= r_risco
    let breakEvenLabel = null;
    for (let i = 0; i < deltaCData.length; i++) {
        if (deltaCData[i] >= rRiscoData[i]) {
            breakEvenLabel = labels[i];
            break;
        }
    }

    const sensitivityAnnotations = {};
    if (breakEvenLabel) {
        sensitivityAnnotations.breakEvenLine = {
            type: 'line',
            xMin: breakEvenLabel,
            xMax: breakEvenLabel,
            borderColor: 'rgba(116, 195, 101, 0.6)',
            borderWidth: 1.5,
            borderDash: [5, 3],
            label: {
                content: '✓ Break-even',
                display: true,
                position: 'start',
                yAdjust: -10,
                color: '#74C365',
                backgroundColor: 'rgba(3, 24, 46, 0.9)',
                font: { size: 9, weight: 'bold', family: 'Plus Jakarta Sans' },
                padding: { x: 5, y: 3 },
                borderRadius: 4
            }
        };
    }

    staticChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Consumo Local Estimado (ΔC_local em Milhões R$)',
                    data: deltaCData,
                    borderColor: '#DBE64C',
                    borderWidth: 3,
                    backgroundColor: 'rgba(219, 230, 76, 0.12)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: labels.map((_, idx) => idx === activeIndex ? '#F6F7ED' : '#DBE64C'),
                    pointBorderColor: '#DBE64C',
                    pointRadius: labels.map((_, idx) => idx === activeIndex ? 6 : 3),
                    pointHoverRadius: 7
                },
                {
                    label: 'Receita sob Risco (R_risco em Milhões R$)',
                    data: rRiscoData,
                    borderColor: '#FF8A7A',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    backgroundColor: 'transparent',
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                annotation: { annotations: sensitivityAnnotations }
            },
            scales: {
                x: {
                    title: { display: true, text: xAxisLabel, color: getThemeColors().textColor, font: { family: 'Plus Jakarta Sans' } },
                    grid: { color: getThemeColors().gridColor },
                    ticks: { color: getThemeColors().textColor }
                },
                y: {
                    title: { display: true, text: 'Valores (Milhões R$)', color: getThemeColors().textColor, font: { family: 'Plus Jakarta Sans' } },
                    grid: { color: getThemeColors().gridColor },
                    ticks: { color: getThemeColors().textColor }
                }
            }
        }
    });
}

// 3. Cálculos e Renderização da Linha do Tempo Fiscal (2029-2078)
function calculateAndRenderTimeline(baseRec, tIbs, thetaRet, renda, rRisco) {
    const c = 0.65;
    const k = c * (thetaRet / 100.0);
    
    const valKRealtime = document.getElementById('val-k-realtime');
    if (valKRealtime) {
        valKRealtime.textContent = k.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    
    const ibsDestino = renda * k * (tIbs / 100.0);
    
    const anos = [];
    const seguroData = [];
    const ibsData = [];
    const totalData = [];
    
    // KPIs a calcular
    let eqYear = null;
    let perdaAcumulada = 0;
    let perdaAteCruzamento = 0;
    
    for (let ano = 2029; ano <= 2078; ano++) {
        anos.push(ano.toString());
        
        let seguro = 0;
        let ibs = 0;
        
        if (ano <= 2032) {
            // Fase de Calibração (100% garantido)
            seguro = baseRec;
            ibs = 0;
        } else {
            // Fase de Convergência gradual
            seguro = baseRec * Math.max(0, 1 - (ano - 2032) / 45.0);
            ibs = ibsDestino * Math.min(1, (ano - 2032) / 45.0);
        }
        
        const total = seguro + ibs;
        
        seguroData.push(seguro);
        ibsData.push(ibs);
        totalData.push(total);
        
        // Mapear Equilíbrio Fiscal
        if (ano > 2032 && eqYear === null && ibs >= seguro) {
            eqYear = ano;
        }
        
        // Mapear Perda Acumulada
        if (ano > 2032) {
            if (seguro > ibs) {
                const perdaAno = seguro - ibs;
                perdaAcumulada += perdaAno;
                if (eqYear === null) {
                    perdaAteCruzamento += perdaAno;
                }
            }
        }
    }
    
    // Atualizar KPIs da Linha do Tempo
    valTimelineEq.textContent = eqYear ? eqYear.toString() : 'Não atingido';
    valTimelineEq.style.color = eqYear ? '#DBE64C' : '#FF6E61';
    if (timelineKpiEq) {
        timelineKpiEq.className = eqYear ? 'kpi-card glass-card equilibrium' : 'kpi-card glass-card deficit';
        timelineKpiEq.style.borderColor = '';
    }
    
    valTimelinePerda.textContent = formatCurrencyM(perdaAcumulada);
    valTimelinePerda.style.color = '#FF6E61';
    if (timelineKpiPerda) {
        timelineKpiPerda.className = 'kpi-card glass-card deficit';
        timelineKpiPerda.style.borderColor = '';
    }
    
    const ibs2078 = ibsData[ibsData.length - 1];
    valTimelineReceita.textContent = formatCurrencyM(ibs2078);
    
    // Atualizar Tooltip dinâmico da Receita em 2078 (comparando diretamente com baseRec)
    if (timelineKpiReceita) {
        const diff = ibs2078 - baseRec;
        const pct = (diff / baseRec) * 100;
        const signal = diff >= 0 ? '+' : '';
        const pctStr = pct.toFixed(1).replace('.', ',');
        const diffStr = formatCurrencyM(Math.abs(diff));
        const baseFormatted = formatCurrencyM(baseRec);
        
        let tooltipText = `Receita estimada vinda do IBS Destino em 2078 (último ano da transição). `;
        if (diff >= 0) {
            tooltipText += `Comparada à receita base de ${baseFormatted}, representa um ganho real de <strong>${signal}${pctStr}%</strong> (+${diffStr}).`;
        } else {
            tooltipText += `Comparada à receita base de ${baseFormatted}, representa uma perda estrutural de <strong>${pctStr}%</strong> (-${diffStr}).`;
        }
        timelineKpiReceita.setAttribute('data-tooltip', tooltipText);
    }
    
    if (ibs2078 >= baseRec) {
        valTimelineReceita.style.color = '#74C365';
        if (timelineKpiReceita) {
            timelineKpiReceita.className = 'kpi-card glass-card surplus';
            timelineKpiReceita.style.borderColor = '';
        }
    } else {
        valTimelineReceita.style.color = '#FF6E61';
        if (timelineKpiReceita) {
            timelineKpiReceita.className = 'kpi-card glass-card deficit';
            timelineKpiReceita.style.borderColor = '';
        }
    }
    
    // Calcular a taxa de retenção necessária para anular a perda estrutural
    const thetaRequiredForNoLoss = Math.min(100, Math.max(0, (baseRec / (renda * c * (tIbs / 100.0))) * 100.0));
    
    // Atualizar Insight Text
    const mNameSimple = MUNICIPALITIES[currentMunicipalityKey].name.split(' - ')[0];
    if (eqYear) {
        const anosAposConv = eqYear - 2032;
        const formattedPerda = formatCurrencyM(perdaAteCruzamento);
        timelineInsight.innerHTML = `Em <strong>${mNameSimple}</strong>, com retenção local de <strong>${thetaRet}%</strong> e alíquota IBS de <strong>${tIbs.toFixed(1).replace('.', ',')}%</strong>, o IBS Destino supera o Seguro-Receita em <strong>${eqYear}</strong> — <strong>${anosAposConv} anos</strong> após o início da convergência. A perda acumulada até esse cruzamento é de <strong>${formattedPerda}</strong>. Para evitar qualquer perda de longo prazo (receita ≥ base), a taxa de retenção precisaria ser de pelo menos <strong>${thetaRequiredForNoLoss.toFixed(1).replace('.', ',')}%</strong>.`;
    } else {
        timelineInsight.innerHTML = `Com os parâmetros atuais, o IBS Destino de <strong>${mNameSimple}</strong> não supera o Seguro-Receita até 2078. Para anular a perda estrutural de longo prazo, o município precisaria elevar a taxa de retenção local (θ<sub>ret</sub>) para pelo menos <strong>${thetaRequiredForNoLoss.toFixed(1).replace('.', ',')}%</strong>.`;
    }
    
    // Renderizar Gráfico de Linha do Tempo (Chart.js)
    const ctx = document.getElementById('timelineChart').getContext('2d');
    
    if (timelineChartInstance) {
        timelineChartInstance.destroy();
    }
    
    // Build chart annotations
    const timelineAnnotations = {};

    // Horizontal reference line at base revenue level
    timelineAnnotations.baseRevLine = {
        type: 'line',
        yMin: baseRec / 1000000,
        yMax: baseRec / 1000000,
        borderColor: 'rgba(169, 186, 203, 0.18)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: {
            content: 'Base: ' + (baseRec / 1000000).toFixed(0) + 'M',
            display: true,
            position: 'end',
            xAdjust: -4,
            color: 'rgba(169, 186, 203, 0.55)',
            backgroundColor: 'transparent',
            font: { size: 9, family: 'Plus Jakarta Sans' },
            padding: 0
        }
    };

    // Vertical line at equilibrium year (if reached)
    if (eqYear) {
        timelineAnnotations.eqYearLine = {
            type: 'line',
            xMin: eqYear.toString(),
            xMax: eqYear.toString(),
            borderColor: 'rgba(219, 230, 76, 0.65)',
            borderWidth: 1.5,
            borderDash: [6, 3],
            label: {
                content: '⚖ ' + eqYear,
                display: true,
                position: 'start',
                yAdjust: -12,
                color: '#DBE64C',
                backgroundColor: 'rgba(3, 24, 46, 0.9)',
                font: { size: 10, weight: 'bold', family: 'Plus Jakarta Sans' },
                padding: { x: 6, y: 3 },
                borderRadius: 4
            }
        };
    }

    timelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: anos,
            datasets: [
                {
                    label: 'Seguro-Receita',
                    data: seguroData.map(val => val / 1000000.0),
                    borderColor: '#1E488F',
                    borderWidth: 3,
                    backgroundColor: 'rgba(30, 72, 143, 0.18)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'IBS Destino',
                    data: ibsData.map(val => val / 1000000.0),
                    borderColor: '#74C365',
                    borderWidth: 2,
                    borderDash: [5, 3],
                    backgroundColor: 'rgba(116, 195, 101, 0.07)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Receita Total',
                    data: totalData.map(val => val / 1000000.0),
                    borderColor: '#DBE64C',
                    borderWidth: 2.5,
                    borderDash: [2, 2],
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: function(context) {
                        updateCustomTooltip(context);
                    }
                },
                annotation: {
                    annotations: timelineAnnotations
                }
            },
            scales: {
                x: {
                    grid: { color: getThemeColors().gridColor },
                    ticks: {
                        color: getThemeColors().textColor,
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        autoSkip: false,
                        callback: function(val, index) {
                            const year = this.getLabelForValue(val);
                            const showYears = ['2029', '2033', '2040', '2050', '2060', '2070', '2078'];
                            return showYears.includes(year) ? year : '';
                        }
                    }
                },
                y: {
                    grid: { color: getThemeColors().gridColor },
                    ticks: {
                        color: getThemeColors().textColor,
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        callback: function(value) {
                            return 'R$' + value.toFixed(0) + 'M';
                        }
                    }
                }
            }
        }
    });
}

// 4. Implementação do Tooltip Customizado em HTML Absoluto
function updateCustomTooltip(context) {
    const tColors = getThemeColors();
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chartjs-tooltip';
        tooltipEl.style.background = tColors.tooltipBg;
        tooltipEl.style.border = `1px solid ${tColors.tooltipBorder}`;
        tooltipEl.style.color = tColors.tooltipText;
        tooltipEl.style.borderRadius = '10px';
        tooltipEl.style.padding = '10px 14px';
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.transition = 'all 0.1s ease';
        tooltipEl.style.fontSize = '0.8rem';
        tooltipEl.style.fontFamily = '"Plus Jakarta Sans", sans-serif';
        tooltipEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
        tooltipEl.style.zIndex = '9999';
        document.body.appendChild(tooltipEl);
    } else {
        tooltipEl.style.background = tColors.tooltipBg;
        tooltipEl.style.border = `1px solid ${tColors.tooltipBorder}`;
        tooltipEl.style.color = tColors.tooltipText;
    }

    const tooltipModel = context.tooltip;
    if (tooltipModel.opacity === 0) {
        tooltipEl.style.opacity = 0;
        return;
    }

    if (tooltipModel.body) {
        const titleLines = tooltipModel.title || [];
        const bodyLines = tooltipModel.body.map(bodyItem => bodyItem.lines);

        let innerHtml = `<div style="font-weight: 700; margin-bottom: 6px; color: ${tColors.tooltipTitle}; font-size: 0.85rem;">Ano ${titleLines[0]}</div>`;

        bodyLines.forEach(function(body, i) {
            const colors = tooltipModel.labelColors[i];
            let style = `background:${colors.borderColor}`;
            style += `; border-color:${colors.borderColor}`;
            style += '; border-width: 2px';
            const span = `<span style="display:inline-block; width:10px; height:10px; margin-right:8px; border-radius: 50%; ${style}"></span>`;
            
            // Separando label e valor para estilizar
            const parts = body[0].split(':');
            const labelText = parts[0];
            const valueText = parts[1];
            const formattedVal = parseFloat(valueText).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            innerHtml += `<div style="display:flex; align-items:center; margin-bottom: 4px; justify-content: space-between; gap: 2rem;">
                            <span style="display:flex; align-items:center; color: #94a3b8;">${span}${labelText}</span>
                            <span style="font-weight: 700; font-family: monospace;">R$ ${formattedVal}M</span>
                          </div>`;
        });

        tooltipEl.innerHTML = innerHtml;
    }

    const position = context.chart.canvas.getBoundingClientRect();
    tooltipEl.style.opacity = 1;
    
    // Calculando posições absolutas na tela
    let leftPos = position.left + window.pageXOffset + tooltipModel.caretX;
    let topPos = position.top + window.pageYOffset + tooltipModel.caretY;
    const bodyWidth = document.body.clientWidth;

    // Impedir que o tooltip estoure a tela para a direita
    if (leftPos + 220 > bodyWidth) {
        leftPos = leftPos - 230;
    }
    
    tooltipEl.style.left = `${leftPos}px`;
    tooltipEl.style.top = `${topPos - 85}px`;
}

// 5. Implementação de Dicas explicativas (Tooltips) para os Cartões de KPI
let kpiTooltipEl = null;

function showKpiTooltip(e, text) {
    if (!text) return;
    const tColors = getThemeColors();
    if (!kpiTooltipEl) {
        kpiTooltipEl = document.createElement('div');
        kpiTooltipEl.id = 'kpi-tooltip';
        kpiTooltipEl.style.background = tColors.tooltipBg;
        kpiTooltipEl.style.border = `1px solid ${tColors.tooltipBorder}`;
        kpiTooltipEl.style.color = tColors.tooltipText;
        kpiTooltipEl.style.borderRadius = '8px';
        kpiTooltipEl.style.padding = '10px 14px';
        kpiTooltipEl.style.position = 'absolute';
        kpiTooltipEl.style.pointerEvents = 'none';
        kpiTooltipEl.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        kpiTooltipEl.style.fontSize = '0.78rem';
        kpiTooltipEl.style.fontFamily = '"Plus Jakarta Sans", sans-serif';
        kpiTooltipEl.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        kpiTooltipEl.style.zIndex = '10000';
        kpiTooltipEl.style.width = '280px';
        kpiTooltipEl.style.lineHeight = '1.45';
        kpiTooltipEl.style.transform = 'translate(-50%, -100%) scale(0.95)';
        kpiTooltipEl.style.opacity = '0';
        document.body.appendChild(kpiTooltipEl);
    } else {
        kpiTooltipEl.style.background = tColors.tooltipBg;
        kpiTooltipEl.style.border = `1px solid ${tColors.tooltipBorder}`;
        kpiTooltipEl.style.color = tColors.tooltipText;
    }
    
    kpiTooltipEl.innerHTML = text;
    kpiTooltipEl.style.opacity = '1';
    kpiTooltipEl.style.transform = 'translate(-50%, -115%) scale(1)';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + window.pageXOffset;
    const y = rect.top + window.pageYOffset;
    
    kpiTooltipEl.style.left = `${x}px`;
    kpiTooltipEl.style.top = `${y}px`;
}

function hideKpiTooltip() {
    if (kpiTooltipEl) {
        kpiTooltipEl.style.opacity = '0';
        kpiTooltipEl.style.transform = 'translate(-50%, -100%) scale(0.95)';
    }
}

let mcChartInstance = null;

function updateMonteCarlo(data) {
    const mc = data.monte_carlo;
    if (!mc) return;

    const valMcProbDeficit = document.getElementById('val-mc-prob-deficit');
    const valMcProbSurplus = document.getElementById('val-mc-prob-surplus');
    const valMcMean = document.getElementById('val-mc-mean');
    const valMcMedian = document.getElementById('val-mc-median');
    const valMcInterval = document.getElementById('val-mc-interval');

    if (valMcProbDeficit) {
        valMcProbDeficit.textContent = `${mc.prob_deficit.toFixed(1).replace('.', ',')}%`;
        flashValue(valMcProbDeficit);
    }
    if (valMcProbSurplus) valMcProbSurplus.textContent = `Superávit: ${mc.prob_surplus.toFixed(1).replace('.', ',')}%`;
    
    if (valMcMean) {
        const valueM = mc.mean / 1000000.0;
        const prefix = valueM >= 0 ? '+' : '';
        valMcMean.textContent = `${prefix}R$ ${valueM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
        valMcMean.style.color = valueM >= 0 ? '#FF8A7A' : '#74C365';
    }

    if (valMcMedian) {
        const valueM = mc.median / 1000000.0;
        const prefix = valueM >= 0 ? '+' : '';
        valMcMedian.textContent = `Mediana: ${prefix}R$ ${valueM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    }

    if (valMcInterval) {
        const p5M = mc.p5 / 1000000.0;
        const p95M = mc.p95 / 1000000.0;
        const p5Prefix = p5M >= 0 ? '+' : '';
        const p95Prefix = p95M >= 0 ? '+' : '';
        valMcInterval.innerHTML = `<span style="font-size:0.75rem; color:#94a3b8;">P5:</span> ${p5Prefix}${p5M.toFixed(1).replace('.', ',')}M <span style="font-size:0.75rem; color:#94a3b8; margin-left:0.3rem;">a</span> <span style="font-size:0.75rem; color:#94a3b8;">P95:</span> ${p95Prefix}${p95M.toFixed(1).replace('.', ',')}M`;
    }

    const ctx = document.getElementById('monteCarloChart').getContext('2d');
    if (mcChartInstance) {
        mcChartInstance.destroy();
    }

    const labels = mc.histogram.bin_centers.map(val => {
        const valM = val / 1000000.0;
        const prefix = valM >= 0 ? '+' : '';
        return `${prefix}${valM.toFixed(1).replace('.', ',')}M`;
    });
    
    const tColors = getThemeColors();
    const colors = mc.histogram.bin_centers.map(val => {
        return val >= 0 ? tColors.mcBarDeficit : tColors.mcBarSurplus;
    });

    const borderColors = mc.histogram.bin_centers.map(val => {
        return val >= 0 ? tColors.mcBorderDeficit : tColors.mcBorderSurplus;
    });

    mcChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequência de Ocorrência',
                data: mc.histogram.counts,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Ocorrências: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Intervalo de EPL (Perda (+) / Ganho (-))', color: tColors.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } },
                    grid: { display: false },
                    ticks: { color: tColors.textColor, font: { size: 9 }, maxRotation: 45, minRotation: 0 }
                },
                y: {
                    title: { display: true, text: 'Simulações', color: tColors.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } },
                    grid: { color: tColors.gridColor },
                    ticks: { color: tColors.textColor, font: { size: 9 } }
                }
            }
        }
    });

    // Atualizar Explicação/Interpretação do Monte Carlo
    if (mcInsight) {
        const mNameSimple = MUNICIPALITIES[currentMunicipalityKey].name.split(' - ')[0];
        const meanM = mc.mean / 1000000.0;
        const p5M = mc.p5 / 1000000.0;
        const p95M = mc.p95 / 1000000.0;
        
        const p5Abs = Math.abs(p5M).toFixed(1).replace('.', ',');
        const p95Abs = Math.abs(p95M).toFixed(1).replace('.', ',');
        const p5Label = p5M < 0 ? `um superávit de <strong>R$ ${p5Abs}M</strong>` : `um déficit de <strong>R$ ${p5Abs}M</strong>`;
        const p95Label = p95M < 0 ? `um superávit de <strong>R$ ${p95Abs}M</strong>` : `um déficit de <strong>R$ ${p95Abs}M</strong>`;
        const meanWord = meanM >= 0 ? 'perda (déficit) média' : 'ganho (superávit) médio';
        
        let explanationText = `<strong>Interpretação da Simulação:</strong> O gráfico apresenta a distribuição de frequências da EPL (Estimativa de Perda Líquida) após 10.000 iterações de Monte Carlo. Cada barra vertical representa um possível cenário de resultado fiscal simulado para <strong>${mNameSimple}</strong>.`;
        
        explanationText += `<br><br>• <strong>Análise de Cores:</strong> As barras em <span style="color: #74C365; font-weight: bold;">verde (EPL < 0)</span> representam cenários de <strong>superávit fiscal</strong> (ganho de receita pelo IBS Destino). As barras em <span style="color: #FF8A7A; font-weight: bold;">vermelho (EPL &ge; 0)</span> representam cenários de <strong>déficit orçamentário</strong> (perda líquida de arrecadação após a transição).`;
        
        explanationText += `<br>• <strong>Risco de Déficit (${mc.prob_deficit.toFixed(1).replace('.', ',')}%):</strong> Indica que, em ${mc.prob_deficit.toFixed(1).replace('.', ',')}% das simulações estocásticas, a receita própria sob risco superou o ganho de consumo local gerado pelo IBS. O município possui uma probabilidade de <strong>${mc.prob_surplus.toFixed(1).replace('.', ',')}%</strong> de alcançar superávit fiscal ex-post.`;
        
        explanationText += `<br>• <strong>Valor Esperado e Dispersão:</strong> O resultado esperado (médio) aponta para um ${meanWord} de <strong>R$ ${Math.abs(meanM).toFixed(2).replace('.', ',')}M</strong>. Entretanto, devido à volatilidade das variáveis, a faixa provável de oscilação com 90% de confiança (do percentil 5% ao 95%) indica que a EPL municipal pode variar desde ${p5Label} (cenário otimista) até ${p95Label} (cenário pessimista).`;
        
        mcInsight.innerHTML = explanationText;
    }
}

// Inicializar na carga da página
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar elementos da seleção de município e modal
    const selectMunicipalityEl = document.getElementById('select-municipality');
    const btnAddMunicipality = document.getElementById('btn-add-municipality');
    const modalMunicipality = document.getElementById('modal-municipality');
    const modalClose = document.getElementById('modal-close');
    const formMunicipality = document.getElementById('form-municipality');

    if (selectMunicipalityEl) {
        selectMunicipalityEl.addEventListener('change', (e) => {
            onMunicipalityChange(e.target.value);
        });
    }

    if (btnAddMunicipality && modalMunicipality) {
        btnAddMunicipality.addEventListener('click', () => {
            modalMunicipality.style.display = 'flex';
        });
    }

    if (modalClose && modalMunicipality) {
        modalClose.addEventListener('click', () => {
            modalMunicipality.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modalMunicipality) {
                modalMunicipality.style.display = 'none';
            }
        });
    }

    if (formMunicipality) {
        formMunicipality.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('m-nome').value.trim();
            const rRisco = parseFloat(document.getElementById('m-r-risco').value) * 1000000.0;
            const rAtual = parseFloat(document.getElementById('m-r-atual').value) * 1000000.0;
            const massa = parseFloat(document.getElementById('m-massa').value) * 1000000.0;
            const beneficios = parseFloat(document.getElementById('m-beneficios').value) * 1000000.0;
            const tIbs = parseFloat(document.getElementById('m-t-ibs').value);
            const thetaRet = parseFloat(document.getElementById('m-theta-ret').value);
            
            const key = "custom_" + Date.now();
            
            MUNICIPALITIES[key] = {
                name: nome,
                r_risco: rRisco,
                r_atual: rAtual,
                massa_salarial: massa,
                beneficios: beneficios,
                t_ibs: tIbs,
                theta_ret: thetaRet,
                tooltip: `Município cadastrado pelo usuário: ${nome}.`
            };
            
            // Adicionar nova opção ao select
            const option = document.createElement('option');
            option.value = key;
            option.textContent = nome + " (Customizado)";
            selectMunicipalityEl.appendChild(option);
            
            // Selecionar o novo município
            selectMunicipalityEl.value = key;
            
            // Fechar modal e resetar formulário
            modalMunicipality.style.display = 'none';
            formMunicipality.reset();
            
            // Chamar mudança de município
            onMunicipalityChange(key);
        });
    }

    const btnComingSoonBack = document.getElementById('btn-coming-soon-back');
    const btnComingSoonCustom = document.getElementById('btn-coming-soon-custom');

    if (btnComingSoonBack) {
        btnComingSoonBack.addEventListener('click', () => {
            if (selectMunicipalityEl) {
                selectMunicipalityEl.value = 'pradopolis';
                onMunicipalityChange('pradopolis');
            }
        });
    }

    if (btnComingSoonCustom) {
        btnComingSoonCustom.addEventListener('click', () => {
            if (modalMunicipality) {
                modalMunicipality.style.display = 'flex';
            }
        });
    }

    function onMunicipalityChange(key) {
        currentMunicipalityKey = key;
        const data = MUNICIPALITIES[key];
        if (!data) return;
        
        // Atualizar displays de nome
        document.getElementById('header-municipality-name').textContent = data.name;
        document.getElementById('info-municipality-name').textContent = data.name.split(' - ')[0];
        
        // Verificar se é uma das cidades pré-cadastradas que não devem carregar informações
        const overlay = document.getElementById('coming-soon-overlay');
        const isComingSoon = ['barrinha', 'dumont', 'ribeirao_preto'].includes(key);
        
        if (isComingSoon) {
            if (overlay) {
                document.getElementById('coming-soon-city-name').textContent = data.name;
                overlay.style.display = 'flex';
            }
            return; // Bloqueia a execução da simulação e exibição de dados
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
        
        const baseRecValue = Math.round(data.r_atual / 1000000.0);
        sliderBaseRec.min = Math.max(1, Math.round(baseRecValue * 0.4));
        sliderBaseRec.max = Math.round(baseRecValue * 1.6);
        sliderBaseRec.value = baseRecValue;
        
        const rendaValue = Math.round((data.massa_salarial + data.beneficios) / 1000000.0);
        sliderRenda.min = Math.max(1, Math.round(rendaValue * 0.4));
        sliderRenda.max = Math.round(rendaValue * 1.6);
        sliderRenda.value = rendaValue;

        if (data.t_ibs !== undefined) {
            sliderTIbs.value = data.t_ibs;
        }
        if (data.theta_ret !== undefined) {
            sliderThetaRet.value = data.theta_ret;
        }
        
        // Configurar os presets baseados na escala deste município
        presets.atual.renda = rendaValue;
        presets.atual.base = baseRecValue;

        presets.fomento.renda = rendaValue;
        presets.fomento.base = baseRecValue;

        presets.max.renda = rendaValue;
        presets.max.base = baseRecValue;

        // Re-initialize slider fills after municipality change
        [sliderBaseRec, sliderTIbs, sliderThetaRet, sliderRenda, sliderEob].forEach(updateSliderFill);

        fetchSimulation();
    }

    // Inicializar o Caso Base (Pradópolis)
    onMunicipalityChange('pradopolis');

    // Initialize slider fills on page load
    [sliderBaseRec, sliderTIbs, sliderThetaRet, sliderRenda, sliderEob].forEach(updateSliderFill);

    // Configurar listeners de tooltip para os cartões de KPI
    document.querySelectorAll('.kpi-card[data-tooltip]').forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            const text = card.getAttribute('data-tooltip');
            showKpiTooltip(e, text);
        });
        card.addEventListener('mouseleave', () => {
            hideKpiTooltip();
        });
    });

    // Event listener do botão de alternância de tema (modo noturno / claro)
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            const sunIcon = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
            const moonIcon = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
            themeToggleBtn.innerHTML = isLight ? moonIcon : sunIcon;
            fetchSimulation();
        });
    }

    // Gerenciador do Pop-up de Termo de Responsabilidade e Isenção Acadêmica
    const modalDisclaimer = document.getElementById('modal-disclaimer');
    const btnDisclaimerAccept = document.getElementById('btn-disclaimer-accept');
    
    if (modalDisclaimer && btnDisclaimerAccept) {
        if (localStorage.getItem('disclaimer-accepted') === 'true') {
            modalDisclaimer.style.display = 'none';
        } else {
            modalDisclaimer.style.display = 'flex';
        }
        
        btnDisclaimerAccept.addEventListener('click', () => {
            localStorage.setItem('disclaimer-accepted', 'true');
            modalDisclaimer.style.display = 'none';
        });
    }
});

// Spotlight: brilho radial que segue o cursor nos cards (somente desktop)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointermove', (e) => {
        const card = e.target.closest && e.target.closest('.glass-card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
}
