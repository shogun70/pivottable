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

    let makeGoogleChart = (chartType, extraOptions) => function(pivotData, opts) {
        let defaults = {
            localeStrings: {
                vs: "vs",
                by: "by"
            },
            gchart: {}
        };

        opts = $.extend(true, defaults, opts);
        if (opts.gchart.width == null) { opts.gchart.width = window.innerWidth / 1.4; }
        if (opts.gchart.height == null) { opts.gchart.height = window.innerHeight / 1.4; }

        let rowKeys = pivotData.getRowKeys();
        if (rowKeys.length === 0) { rowKeys.push([]); }
        let colKeys = pivotData.getColKeys();
        if (colKeys.length === 0) { colKeys.push([]); }
        let fullAggName = pivotData.aggregatorName; 
        if (pivotData.valAttrs.length) {
            fullAggName += `(${pivotData.valAttrs.join(", ")})`;
        }
        let headers = (rowKeys.map((h) => h.join("-")));
        headers.unshift("");

        let numCharsInHAxis = 0;
        if (chartType === "ScatterChart") {
            var dataArray = [];
            for (let y in pivotData.tree) {
                let tree2 = pivotData.tree[y];
                for (let x in tree2) {
                    var agg = tree2[x];
                     dataArray.push([
                        parseFloat(x),
                        parseFloat(y),
                        fullAggName+": \n"+agg.format(agg.value())
                        ]);
                }
            }
            var dataTable = new google.visualization.DataTable();
            dataTable.addColumn('number', pivotData.colAttrs.join("-"));
            dataTable.addColumn('number', pivotData.rowAttrs.join("-")); 
            dataTable.addColumn({type: "string", role: "tooltip"});
            dataTable.addRows(dataArray);
            var hAxisTitle = pivotData.colAttrs.join("-");
            var vAxisTitle = pivotData.rowAttrs.join("-");
            var title = "";
        } else {
            var vAxisTitle;
            var dataArray = [headers];
            for (let colKey of colKeys) {
                let row = [colKey.join("-")];
                numCharsInHAxis += row[0].length;
                for (let rowKey of rowKeys) {
                    var agg = pivotData.getAggregator(rowKey, colKey);
                    if (agg.value() != null) {
                        let val = agg.value();
                        if ($.isNumeric(val)) {
                            if (val < 1) {
                                row.push(parseFloat(val.toPrecision(3)));
                            } else {
                                row.push(parseFloat(val.toFixed(3)));
                            }
                        } else {
                            row.push(val);
                        }
                    } else { row.push(null); }
                }
                dataArray.push(row);
            }

            var dataTable = google.visualization.arrayToDataTable(dataArray);

            var title = vAxisTitle = fullAggName;
            var hAxisTitle = pivotData.colAttrs.join("-");
            if (hAxisTitle !== "") { title += ` ${opts.localeStrings.vs} ${hAxisTitle}`; }
            let groupByTitle = pivotData.rowAttrs.join("-");
            if (groupByTitle !== "") { title += ` ${opts.localeStrings.by} ${groupByTitle}`; }
        }

        let options = { 
            title,
            hAxis: {title: hAxisTitle, slantedText: numCharsInHAxis > 50},
            vAxis: {title: vAxisTitle},
            tooltip: { textStyle: { fontName: 'Arial', fontSize: 12 } }
        };

        if (chartType === "ColumnChart") {
            options.vAxis.minValue = 0;
        }

        if (chartType === "ScatterChart") {
            options.legend = {position: "none"};
            options.chartArea = {'width': '80%', 'height': '80%'};

        } else if (dataArray[0].length === 2 && dataArray[0][1] ===  "") {
            options.legend = {position: "none"};
        }
        
        $.extend(options, opts.gchart, extraOptions);

        let result = $("<div>").css({width: "100%", height: "100%"});
        let wrapper = new google.visualization.ChartWrapper({dataTable, chartType, options});
        wrapper.draw(result[0]);    
        result.bind("dblclick", function() { 
            let editor = new google.visualization.ChartEditor();
            google.visualization.events.addListener(editor, 'ok', () => editor.getChartWrapper().draw(result[0]));
            return editor.openDialog(wrapper);
        });
        return result;
    } ;

    return $.pivotUtilities.gchart_renderers = { 
        "Line Chart": makeGoogleChart("LineChart"),
        "Bar Chart": makeGoogleChart("ColumnChart"),
        "Stacked Bar Chart": makeGoogleChart("ColumnChart", {isStacked: true}),
        "Area Chart": makeGoogleChart("AreaChart", {isStacked: true}),
        "Scatter Chart": makeGoogleChart("ScatterChart")
    };
});
