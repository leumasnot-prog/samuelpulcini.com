from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

# Parâmetros de referência fixos do TCC (Pradópolis-SP - Ano-Base 2024)
R_RISCO = 24655746.26       # ISSQN_dest + ICMS_dest sob risco de evasão
R_ATUAL = 40025514.89       # Receita total agregada ISSQN + ICMS (2024)
IVT_FIXO = 61.60            # (R_risco / R_atual) * 100

# Parâmetros de base da Massa Salarial e Benefícios Sociais
MASSA_SALARIAL_BASE = 513712915.20
BENEFICIOS_BASE = 107536530.07

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.json or {}
        
        # Leitura dos inputs (com valores padrão do TCC)
        t_ibs = float(data.get('t_ibs', 17.7))                      # Alíquota padrão do IBS (em %)
        c = float(data.get('c', 65.0))                              # Propensão marginal ao consumo tributável (em %)
        theta_ret = float(data.get('theta_ret', 30.0))              # Índice de retenção comercial local (em %)
        
        # Parâmetros base da simulação recebidos dinamicamente (padrão Pradópolis)
        r_risco = float(data.get('r_risco', 24655746.26))
        r_atual = float(data.get('r_atual', 40025514.89))
        massa_salarial_base = float(data.get('massa_salarial', 513712915.20))
        beneficios_base = float(data.get('beneficios', 107536530.07))
        
        renda_disponivel = float(data.get('renda_disponivel', massa_salarial_base + beneficios_base))
        
        # Conversão de percentuais para valores unitários
        t_ibs_val = t_ibs / 100.0
        c_val = c / 100.0
        theta_ret_val = theta_ret / 100.0
        
        # 1. Cálculo de k (Coeficiente de Retenção de Consumo Local)
        k = c_val * theta_ret_val
        
        # 2. Cálculo do Fator de Consumo Local (Delta C_local)
        delta_c_local = renda_disponivel * k * t_ibs_val
        
        # 3. Estimativa de Perda Líquida (EPL) - FÓRMULA CORRIGIDA
        epl = r_risco - delta_c_local
        classification = "Déficit" if epl >= 0 else "Superávit"
        
        # 4. Curva de Sensibilidade 1: EPL vs. Retenção Local (theta_ret de 10% a 100%)
        retention_curve = []
        for tr in range(10, 101, 10):
            tr_val = tr / 100.0
            k_temp = c_val * tr_val
            dcl_temp = renda_disponivel * k_temp * t_ibs_val
            epl_temp = r_risco - dcl_temp
            retention_curve.append({
                "theta_ret": tr,
                "k": round(k_temp, 4),
                "delta_c_local": round(dcl_temp, 2),
                "epl": round(epl_temp, 2)
            })
            
        # 5. Curva de Sensibilidade 2: EPL vs. Alíquota IBS (t_ibs de 10% a 35%)
        aliquot_curve = []
        for a_step in range(100, 351, 25): # 10.0% a 35.0% com passo de 2.5%
            a_val = a_step / 1000.0
            dcl_temp = renda_disponivel * k * a_val
            epl_temp = r_risco - dcl_temp
            aliquot_curve.append({
                "t_ibs": a_val * 100.0,
                "delta_c_local": round(dcl_temp, 2),
                "epl": round(epl_temp, 2)
            })
            
        # 6. Simulação Estocástica de Monte Carlo (10.000 iterações) - DINÂMICA
        n_simulations = 10000
        np.random.seed(42) # reprodutibilidade
        
        # Definir modas triangulares baseadas no estado atual dos sliders
        mode_t_ibs = np.clip(t_ibs_val, 0.1401, 0.2649)
        mode_k = np.clip(k, 0.1501, 0.2999)
        
        # Gerar distribuições aleatórias
        t_ibs_mc = np.random.triangular(0.14, mode_t_ibs, 0.265, n_simulations)
        k_mc = np.random.triangular(0.15, mode_k, 0.30, n_simulations)
        r_risco_mc = np.random.uniform(0.90 * r_risco, 1.10 * r_risco, n_simulations)
        
        # Massa salarial (crescimento -2% a +3%) e Benefícios (crescimento 0% a +4%)
        massa_salarial_mc = massa_salarial_base * (1 + np.random.uniform(-0.02, 0.03, n_simulations))
        beneficios_mc = beneficios_base * (1 + np.random.uniform(0.00, 0.04, n_simulations))
        
        renda_disponivel_mc = massa_salarial_mc + beneficios_mc
        delta_c_local_mc = renda_disponivel_mc * k_mc * t_ibs_mc
        
        epl_mc = r_risco_mc - delta_c_local_mc
        
        # Métricas de Monte Carlo
        mc_mean = float(np.mean(epl_mc))
        mc_median = float(np.median(epl_mc))
        mc_p5 = float(np.percentile(epl_mc, 5))
        mc_p95 = float(np.percentile(epl_mc, 95))
        mc_prob_deficit = float(np.mean(epl_mc > 0) * 100)
        mc_prob_surplus = float(np.mean(epl_mc <= 0) * 100)
        
        # Histograma para plotar a distribuição
        counts, bin_edges = np.histogram(epl_mc, bins=25)
        bin_centers = [(float(bin_edges[i]) + float(bin_edges[i+1])) / 2.0 for i in range(len(counts))]
        
        return jsonify({
            "success": True,
            "k": round(k, 4),
            "delta_c_local": round(delta_c_local, 2),
            "epl": round(epl, 2),
            "classification": classification,
            "r_risco": r_risco,
            "r_atual": r_atual,
            "ivt": round((r_risco / r_atual) * 100.0, 2),
            "retention_curve": retention_curve,
            "aliquot_curve": aliquot_curve,
            "monte_carlo": {
                "mean": round(mc_mean, 2),
                "median": round(mc_median, 2),
                "p5": round(mc_p5, 2),
                "p95": round(mc_p95, 2),
                "prob_deficit": round(mc_prob_deficit, 2),
                "prob_surplus": round(mc_prob_surplus, 2),
                "histogram": {
                    "counts": counts.tolist(),
                    "bin_centers": [round(c, 2) for c in bin_centers]
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True, port=5001)
