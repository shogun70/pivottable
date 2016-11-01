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

  let frFmt = nf({thousandsSep: ".", decimalSep: ","});
  let frFmtInt = nf({digitsAfterDecimal: 0, thousandsSep: ".", decimalSep: ","});
  let frFmtPct = nf({digitsAfterDecimal: 2, scaler: 100, suffix: "%", thousandsSep: ".", decimalSep: ","});

  $.pivotUtilities.locales.tr = {

    localeStrings: {
      renderError: "PivotTable sonuçlarını oluştuturken hata oluştu",
      computeError: "PivotTable sonuçlarını işlerken hata oluştu",
      uiRenderError: "PivotTable UI sonuçlarını oluştuturken hata oluştu",
      selectAll: "Tümünü Seç",
      selectNone: "Tümünü Bırak",
      tooMany: "(listelemek için fazla)",
      filterResults: "Sonuçları filtrele",
      totals: "Toplam",
      vs: "vs",
      by: "ile"
    },

    aggregators: {
      "Sayı": tpl.count(frFmtInt),
      "Benzersiz değerler sayısı": tpl.countUnique(frFmtInt),
      "Benzersiz değerler listesi": tpl.listUnique(", "),
      "Toplam": tpl.sum(frFmt),
      "Toplam (tam sayı)": tpl.sum(frFmtInt),
      "Ortalama": tpl.average(frFmt),
      "Min": tpl.min(frFmt),
      "Maks": tpl.max(frFmt),
      "Miktarların toplamı": tpl.sumOverSum(frFmt),
      "%80 daha yüksek": tpl.sumOverSumBound80(true, frFmt),
      "%80 daha düşük": tpl.sumOverSumBound80(false, frFmt),
      "Toplam oranı (toplam)": tpl.fractionOf(tpl.sum(), "total", frFmtPct),
      "Satır oranı (toplam)": tpl.fractionOf(tpl.sum(), "row", frFmtPct),
      "Sütunun oranı (toplam)": tpl.fractionOf(tpl.sum(), "col", frFmtPct),
      "Toplam oranı (sayı)": tpl.fractionOf(tpl.count(), "total", frFmtPct),
      "Satır oranı (sayı)": tpl.fractionOf(tpl.count(), "row", frFmtPct),
      "Sütunun oranı (sayı)": tpl.fractionOf(tpl.count(), "col", frFmtPct)
    },

    renderers: {
      "Tablo": r["Table"],
      "Tablo (Çubuklar)": r["Table Barchart"],
      "İlgi haritası": r["Heatmap"],
      "Satır ilgi haritası": r["Row Heatmap"],
      "Sütun ilgi haritası": r["Col Heatmap"]
    }
  };
  if (gcr) {
    $.pivotUtilities.locales.tr.gchart_renderers = {
      "Çizgi Grafiği": gcr["Line Chart"],
      "Bar Grafiği": gcr["Bar Chart"],
      "Yığılmış Çubuk Grafik ": gcr["Stacked Bar Chart"],
      "Alan Grafiği": gcr["Area Chart"]
    };
  }

  if (d3r) {
    $.pivotUtilities.locales.tr.d3_renderers =
      {"Hiyerarşik Alan Grafiği (Treemap)": d3r["Treemap"]};
  }

  if (c3r) {
    $.pivotUtilities.locales.tr.c3_renderers = {
      "Çizgi Grafiği": c3r["Line Chart"],
      "Bar Grafiği": c3r["Bar Chart"],
      "Yığılmış Çubuk Grafik ": c3r["Stacked Bar Chart"],
      "Alan Grafiği": c3r["Area Chart"]
    };
  }

  return $.pivotUtilities.locales.tr;
});

