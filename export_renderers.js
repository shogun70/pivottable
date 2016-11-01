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
        
callWithJQuery($ =>

    $.pivotUtilities.export_renderers = { ["TSV Export"](pivotData, opts) {
        let defaults =
            {localeStrings: {}};

        opts = $.extend(defaults, opts);

        let rowKeys = pivotData.getRowKeys();
        if (rowKeys.length === 0) { rowKeys.push([]); }
        let colKeys = pivotData.getColKeys();
        if (colKeys.length === 0) { colKeys.push([]); }
        let { rowAttrs } = pivotData;
        let { colAttrs } = pivotData;

        let result = [];

        let row = [];
        for (let rowAttr of rowAttrs) {
            row.push(rowAttr);
        }
        if (colKeys.length === 1 && colKeys[0].length === 0) {
            row.push(pivotData.aggregatorName);
        } else {
            for (var colKey of colKeys) {
                row.push(colKey.join("-"));
            }
        }

        result.push(row);

        for (let rowKey of rowKeys) {
            row = [];
            for (var r of rowKey) {
                row.push(r);
            }

            for (var colKey of colKeys) {
                let agg = pivotData.getAggregator(rowKey, colKey);
                if (agg.value() != null) {
                    row.push(agg.value());
                } else {
                    row.push("");
                }
            }
            result.push(row);
        }
        let text = "";
        for (var r of result) {
            text += r.join("\t")+"\n";
        }
        
        return $("<textarea>").text(text).css({
                width: ($(window).width() / 2) + "px", 
                height: ($(window).height() / 2) + "px"});
    }
}
);
    
