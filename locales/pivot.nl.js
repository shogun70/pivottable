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

    let frFmt =    nf({thousandsSep: " ", decimalSep: ","});
    let frFmtInt = nf({digitsAfterDecimal: 0, thousandsSep: " ", decimalSep: ","});
    let frFmtPct = nf({digitsAfterDecimal: 1, scaler: 100, suffix: "%", thousandsSep: " ", decimalSep: ","});

    return $.pivotUtilities.locales.nl = { 
        localeStrings: {
            renderError: "Er is een fout opgetreden bij het renderen van de kruistabel.",
            computeError: "Er is een fout opgetreden bij het berekenen van de kruistabel.",
            uiRenderError: "Er is een fout opgetreden bij het tekenen van de interface van de kruistabel.",
            selectAll: "Alles selecteren",
            selectNone: "Niets selecteren",
            tooMany: "(te veel waarden om weer te geven)",
            filterResults: "Filter resultaten",
            totals: "Totaal",
            vs: "versus",
            by: "per"
        },

        aggregators: { 
            "Aantal":                              tpl.count(frFmtInt),
            "Aantal unieke waarden":               tpl.countUnique(frFmtInt),
            "Lijst unieke waarden":                tpl.listUnique(", "),
            "Som":                                 tpl.sum(frFmt),
            "Som van gehele getallen":             tpl.sum(frFmtInt),
            "Gemiddelde":                          tpl.average(frFmt),
            "Minimum":                             tpl.min(frFmt),
            "Maximum":                             tpl.max(frFmt),
            "Som over som":                        tpl.sumOverSum(frFmt),
            "80% bovengrens":                      tpl.sumOverSumBound80(true, frFmt),
            "80% ondergrens":        			   tpl.sumOverSumBound80(false, frFmt),
            "Som in verhouding tot het totaal":    tpl.fractionOf(tpl.sum(),   "total", frFmtPct),
            "Som in verhouding tot de rij":        tpl.fractionOf(tpl.sum(),   "row",   frFmtPct),
            "Som in verhouding tot de kolom":      tpl.fractionOf(tpl.sum(),   "col",   frFmtPct),
            "Aantal in verhouding tot het totaal": tpl.fractionOf(tpl.count(), "total", frFmtPct),
            "Aantal in verhouding tot de rij":     tpl.fractionOf(tpl.count(), "row",   frFmtPct),
            "Aantal in verhouding tot de kolom":   tpl.fractionOf(tpl.count(), "col",   frFmtPct)
        },

        renderers: {
            "Tabel":                           $.pivotUtilities.renderers["Table"],
            "Tabel met staafdiagrammen":               $.pivotUtilities.renderers["Table Barchart"],
            "Warmtekaart":                     $.pivotUtilities.renderers["Heatmap"],
            "Warmtekaart per rij":             $.pivotUtilities.renderers["Row Heatmap"],
            "Warmtekaart per kolom":           $.pivotUtilities.renderers["Col Heatmap"]
        }
    };});
