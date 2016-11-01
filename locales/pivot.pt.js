var callWithJQuery = function(pivotModule) {
    if (typeof exports === "object" && typeof module === "object") { // CommonJS
        return pivotModule(require("jquery"));
    } else if (typeof define === "function" && define.amd) { // AMD
        return define(["jquery"], pivotModule);
    // Plain browser env
    } else {
        return pivotModule(jQuery);
    }
};
        
callWithJQuery(function($) {
    let nf = $.pivotUtilities.numberFormat;
    let tpl = $.pivotUtilities.aggregatorTemplates;
    let r = $.pivotUtilities.renderers;
    let gcr = $.pivotUtilities.gchart_renderers;
    let d3r = $.pivotUtilities.d3_renderers;
    let c3r = $.pivotUtilities.c3_renderers;

    let frFmt =    nf({thousandsSep: ".", decimalSep: ","});
    let frFmtInt = nf({digitsAfterDecimal: 0, thousandsSep: ".", decimalSep: ","});
    let frFmtPct = nf({digitsAfterDecimal: 2, scaler: 100, suffix: "%", thousandsSep: ".", decimalSep: ","});

    $.pivotUtilities.locales.pt = { 

        localeStrings: {
            renderError: "Ocorreu um error ao renderizar os resultados da Tabela Dinãmica.",
            computeError: "Ocorreu um error ao computar os resultados da Tabela Dinãmica.",
            uiRenderError: "Ocorreu um error ao renderizar a interface da Tabela Dinãmica.",
            selectAll: "Selecionar Tudo",
            selectNone: "Selecionar Nenhum",
            tooMany: "(demais para listar)",
            filterResults: "Filtrar resultados",
            totals: "Totais",
            vs: "vs",
            by: "por"
        },

        aggregators: {
            "Contagem":                                     tpl.count(frFmtInt),
            "Contagem de Valores únicos":            tpl.countUnique(frFmtInt),
            "Lista de Valores únicos":               tpl.listUnique(", "),
            "Soma":                                         tpl.sum(frFmt),
            "Soma de Inteiros":                             tpl.sum(frFmtInt),
            "Média":                                        tpl.average(frFmt),
            "Mínimo":                                       tpl.min(frFmt),
            "Máximo":                                       tpl.max(frFmt),
            "Soma sobre Soma":                              tpl.sumOverSum(frFmt),
            "Limite Superior a 80%":                        tpl.sumOverSumBound80(true, frFmt),
            "Limite Inferior a 80%":                        tpl.sumOverSumBound80(false, frFmt),
            "Soma como Fração do Total":      tpl.fractionOf(tpl.sum(),   "total", frFmtPct),
            "Soma como Fração da Linha":      tpl.fractionOf(tpl.sum(),   "row",   frFmtPct),
            "Soma como Fração da Coluna":     tpl.fractionOf(tpl.sum(),   "col",   frFmtPct),
            "Contagem como Fração do Total":  tpl.fractionOf(tpl.count(), "total", frFmtPct),
            "Contagem como Fração da Linha":  tpl.fractionOf(tpl.count(), "row",   frFmtPct),
            "Contagem como Fração da Coluna": tpl.fractionOf(tpl.count(), "col",   frFmtPct)
        },

        renderers: {
            "Tabela":                    r["Table"],
            "Tabela com Barras":         r["Table Barchart"],
            "Mapa de Calor":             r["Heatmap"],
            "Mapa de Calor por Linhas":  r["Row Heatmap"],
            "Mapa de Calor por Colunas": r["Col Heatmap"]
        }
    };

    if (gcr) {
        $.pivotUtilities.locales.pt.gchart_renderers = {
            "Gráfico de Linhas":            gcr["Line Chart"],
            "Gráfico de Barras":            gcr["Bar Chart"],
            "Gráfico de Barras Empilhadas": gcr["Stacked Bar Chart"],
            "Gráfico de Área":       gcr["Area Chart"]
        };
    }

    if (d3r) {
        $.pivotUtilities.locales.pt.d3_renderers =
            {"Mapa de Árvore": d3r["Treemap"]};
    }

    if (c3r) {
      $.pivotUtilities.locales.pt.c3_renderers = {
        "Gráfico de Linhas": c3r["Line Chart"],
        "Gráfico de Barras": c3r["Bar Chart"],
        "Gráfico de Barras Empilhadas": c3r["Stacked Bar Chart"],
        "Gráfico de Área":       c3r["Area Chart"]
    };
  }

    return $.pivotUtilities.locales.pt;
});
