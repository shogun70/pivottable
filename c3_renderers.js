var callWithJQuery = function(pivotModule) {
    if (typeof exports === "object" && typeof module === "object") { // CommonJS
        return pivotModule(require("jquery"), require("c3"));
    } else if (typeof define === "function" && define.amd) { // AMD
        return define(["jquery", "c3"], pivotModule);
    // Plain browser env
    } else {
        return pivotModule(jQuery, c3);
    }
};
        
callWithJQuery(function($, c3) {

    let makeC3Chart = (chartOpts = {}) => function(pivotData, opts) {
        let defaults = {
            localeStrings: {
                vs: "vs",
                by: "by"
            },
            c3: {}
        };

        opts = $.extend(true, defaults, opts);
        if (opts.c3.size == null) { opts.c3.size = {}; }
        if (opts.c3.size.width == null) { opts.c3.size.width = window.innerWidth / 1.4; }
        if (opts.c3.size.height == null) { opts.c3.size.height = (window.innerHeight / 1.4) - 50; }
        if (chartOpts.type == null) { chartOpts.type = "line"; }

        let rowKeys = pivotData.getRowKeys();
        if (rowKeys.length === 0) { rowKeys.push([]); }
        let colKeys = pivotData.getColKeys();
        if (colKeys.length === 0) { colKeys.push([]); }

        let headers = (colKeys.map((h) => h.join("-")));
        let rotationAngle = 0;

        let fullAggName = pivotData.aggregatorName; 
        if (pivotData.valAttrs.length) {
            fullAggName += `(${pivotData.valAttrs.join(", ")})`;
        }

        if (chartOpts.type === "scatter") {
            var scatterData = {x:{}, y:{}, t:{}};
            let attrs = pivotData.rowAttrs.concat(pivotData.colAttrs);
            var vAxisTitle = attrs[0] != null ? attrs[0] : "";
            var hAxisTitle = attrs[1] != null ? attrs[1] : ""; 
            var groupByTitle = attrs.slice(2).join("-");
            var titleText = vAxisTitle;
            if (hAxisTitle !== "") { titleText += ` ${opts.localeStrings.vs} ${hAxisTitle}`; }
            if (groupByTitle !== "") { titleText += ` ${opts.localeStrings.by} ${groupByTitle}`; }
            for (var rowKey of rowKeys) {
                for (var colKey of colKeys) {
                    let agg = pivotData.getAggregator(rowKey, colKey);
                    if (agg.value() != null) {
                        let vals = rowKey.concat(colKey);
                        let series = vals.slice(2).join("-");
                        if (series === "") { series = "series"; }
                        if (scatterData.x[series] == null) { scatterData.x[series] = []; }
                        if (scatterData.y[series] == null) { scatterData.y[series] = []; }
                        if (scatterData.t[series] == null) { scatterData.t[series] = []; }
                        scatterData.y[series].push(vals[0] != null ? vals[0] : 0);
                        scatterData.x[series].push(vals[1] != null ? vals[1] : 0);
                        scatterData.t[series].push(agg.format(agg.value()));
                    }
                }
            }
        } else {
            let numCharsInHAxis = 0;
            for (let x of headers) {
                numCharsInHAxis += x.length;
            }
            if (numCharsInHAxis > 50) {
                rotationAngle = 45;
            }

            var columns = [];
            for (var rowKey of rowKeys) {
                let rowHeader = rowKey.join("-");
                let row = [rowHeader === "" ? pivotData.aggregatorName : rowHeader];
                for (var colKey of colKeys) {
                    let val = parseFloat(pivotData.getAggregator(rowKey, colKey).value());
                    if (isFinite(val)) {
                        if (val < 1) {
                            row.push(val.toPrecision(3));
                        } else {
                            row.push(val.toFixed(3));
                        }
                    } else {
                        row.push(null);
                    }
                }
                columns.push(row);
            }

            var vAxisTitle = pivotData.aggregatorName+ 
                (pivotData.valAttrs.length ? `(${pivotData.valAttrs.join(", ")})` : "");
            var hAxisTitle = pivotData.colAttrs.join("-");

            var titleText = fullAggName;
            if (hAxisTitle !== "") { titleText += ` ${opts.localeStrings.vs} ${hAxisTitle}`; }
            var groupByTitle = pivotData.rowAttrs.join("-");
            if (groupByTitle !== "") { titleText += ` ${opts.localeStrings.by} ${groupByTitle}`; }
        }
            
        let title = $("<p>", {style: "text-align: center; font-weight: bold"});
        title.text(titleText);

        let params = { 
            axis: { 
                y: {
                    label: vAxisTitle
                },
                x: {
                    label: hAxisTitle,
                    tick: {
                        rotate: rotationAngle,
                        multiline: false
                    }
                }
            },
            data: { 
                type: chartOpts.type
            },
            tooltip: {
                grouped: false
            },
            color: { 
                pattern: [ "#3366cc", "#dc3912", "#ff9900", "#109618",
                           "#990099", "#0099c6", "#dd4477", "#66aa00",
                           "#b82e2e", "#316395", "#994499", "#22aa99",
                           "#aaaa11", "#6633cc", "#e67300", "#8b0707",
                           "#651067", "#329262", "#5574a6", "#3b3eac" ]
            }
        };


        $.extend(true, params, opts.c3);

        if (chartOpts.type === "scatter") {
            let xs = {};
            let numSeries = 0;
            let dataColumns = [];
            for (let s in scatterData.x) {
                numSeries += 1;
                xs[s] = s+"_x";
                dataColumns.push([s+"_x"].concat(scatterData.x[s]));
                dataColumns.push([s].concat(scatterData.y[s]));
            }
            params.data.xs = xs;
            params.data.columns = dataColumns;
            params.axis.x.tick = {fit: false};
            if (numSeries === 1) {
                params.legend = {show: false}; 
            }
            params.tooltip.format = {  
                title() { return fullAggName; },
                name() { return ""; },
                value(a,b,c,d) { return scatterData.t[c][d]; }
            };
        } else {
            params.axis.x.type= 'category';
            params.axis.x.categories = headers;
            params.data.columns = columns;
        }


        if (chartOpts.stacked != null) {
            params.data.groups = [rowKeys.map((x) => x.join("-"))];
        }
        let renderArea = $("<div>", {style: "display:none;"}).appendTo($("body"));
        let result = $("<div>").appendTo(renderArea);
        params.bindto = result[0];
        c3.generate(params);
        result.detach();
        renderArea.remove();
        return $("<div>").append(title, result);
    } ;

    return $.pivotUtilities.c3_renderers = { 
        "Line Chart": makeC3Chart(),
        "Bar Chart": makeC3Chart({type: "bar"}),
        "Stacked Bar Chart": makeC3Chart({type: "bar", stacked: true}),
        "Area Chart": makeC3Chart({type: "area", stacked: true}),
        "Scatter Chart": makeC3Chart({type: "scatter"})
    };
});
