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

    /*
    Utilities
    */

    let addSeparators = function(nStr, thousandsSep, decimalSep) {
        nStr += '';
        let x = nStr.split('.');
        let x1 = x[0];
        let x2 = x.length > 1 ?  decimalSep + x[1] : '';
        let rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) { x1 = x1.replace(rgx, `$1${thousandsSep}$2`); }
        return x1 + x2;
    };

    let numberFormat = function(opts) {
        let defaults = { 
            digitsAfterDecimal: 2, scaler: 1, 
            thousandsSep: ",", decimalSep: ".",
            prefix: "", suffix: "",
            showZero: false
        };
        opts = $.extend(defaults, opts);
        return function(x) {
            if (isNaN(x) || !isFinite(x)) { return ""; }
            if (x === 0 && !opts.showZero) { return ""; }
            let result = addSeparators((opts.scaler*x).toFixed(opts.digitsAfterDecimal), opts.thousandsSep, opts.decimalSep);
            return `${opts.prefix}${result}${opts.suffix}`;
        };
    };

    //aggregator templates default to US number formatting but this is overrideable
    let usFmt = numberFormat();
    let usFmtInt = numberFormat({digitsAfterDecimal: 0});
    let usFmtPct = numberFormat({digitsAfterDecimal:1, scaler: 100, suffix: "%"});

    let aggregatorTemplates = {
        count(formatter=usFmtInt) { return () => (data, rowKey, colKey) =>
            ({
                count: 0,
                push() { return this.count++; },
                value() { return this.count; },
                format: formatter
            })
         ; },

        countUnique(formatter=usFmtInt) { return ([attr]) => (data, rowKey, colKey) =>
            ({
                uniq: [],
                push(record) { if (!this.uniq.includes(record[attr])) { return this.uniq.push(record[attr]); } },
                value() { return this.uniq.length; },
                format: formatter,
                numInputs: (attr != null) ? 0 : 1
            })
         ; },

        listUnique(sep) { return ([attr]) => (data, rowKey, colKey)  =>
            ({
                uniq: [],
                push(record) { if (!this.uniq.includes(record[attr])) { return this.uniq.push(record[attr]); } },
                value() { return this.uniq.join(sep); },
                format(x) { return x; },
                numInputs: (attr != null) ? 0 : 1
            })
         ; },

        sum(formatter=usFmt) { return ([attr]) => (data, rowKey, colKey) =>
            ({
                sum: 0,
                push(record) { if (!isNaN(parseFloat(record[attr]))) { return this.sum += parseFloat(record[attr]); } },
                value() { return this.sum; },
                format: formatter,
                numInputs: (attr != null) ? 0 : 1
            })
         ; },

        min(formatter=usFmt) { return ([attr]) => (data, rowKey, colKey) =>
            ({
                val: null,
                push(record) {
                    let x = parseFloat(record[attr]);
                    if (!isNaN(x)) { return this.val = Math.min(x, this.val != null ? this.val : x); }
                },
                value() { return this.val; },
                format: formatter,
                numInputs: (attr != null) ? 0 : 1
            })
         ; },

        max(formatter=usFmt) { return ([attr]) => (data, rowKey, colKey) =>
            ({
                val: null,
                push(record) { 
                    let x = parseFloat(record[attr]);
                    if (!isNaN(x)) { return this.val = Math.max(x, this.val != null ? this.val : x); }
                },
                value() { return this.val; },
                format: formatter,
                numInputs: (attr != null) ? 0 : 1
            })
         ; },

        average(formatter=usFmt) { return ([attr]) => (data, rowKey, colKey) =>
            ({
                sum: 0,
                len: 0,
                push(record) {
                    if (!isNaN(parseFloat(record[attr]))) {
                        this.sum += parseFloat(record[attr]);
                        return this.len++;
                    }
                },
                value() { return this.sum/this.len; },
                format: formatter,
                numInputs: (attr != null) ? 0 : 1
            })
         ; },

        sumOverSum(formatter=usFmt) { return ([num, denom]) => (data, rowKey, colKey) =>
            ({
                sumNum: 0,
                sumDenom: 0,
                push(record) {
                    if (!isNaN(parseFloat(record[num]))) { this.sumNum   += parseFloat(record[num]); }
                    if (!isNaN(parseFloat(record[denom]))) { return this.sumDenom += parseFloat(record[denom]); }
                },
                value() { return this.sumNum/this.sumDenom; },
                format: formatter,
                numInputs: (num != null) && (denom != null) ? 0 : 2
            })
         ; },

        sumOverSumBound80(upper=true, formatter=usFmt) { return ([num, denom]) => (data, rowKey, colKey) =>
            ({
                sumNum: 0,
                sumDenom: 0,
                push(record) {
                    if (!isNaN(parseFloat(record[num]))) { this.sumNum   += parseFloat(record[num]); }
                    if (!isNaN(parseFloat(record[denom]))) { return this.sumDenom += parseFloat(record[denom]); }
                },
                value() {
                    let sign = upper ? 1 : -1;
                    return ((0.821187207574908/this.sumDenom) + (this.sumNum/this.sumDenom) + (1.2815515655446004*sign*
                        Math.sqrt((0.410593603787454/ (this.sumDenom*this.sumDenom)) + ((this.sumNum*(1 - (this.sumNum/ this.sumDenom)))/ (this.sumDenom*this.sumDenom)))))/
                        (1 + (1.642374415149816/this.sumDenom));
                },
                format: formatter,
                numInputs: (num != null) && (denom != null) ? 0 : 2
            })
         ; },

        fractionOf(wrapped, type="total", formatter=usFmtPct) { return (...x) => (data, rowKey, colKey) =>
            ({
                selector: {total:[[],[]],row:[rowKey,[]],col:[[],colKey]}[type],
                inner: wrapped(...x)(data, rowKey, colKey),
                push(record) { return this.inner.push(record); },
                format: formatter,
                value() { return this.inner.value() / data.getAggregator(...this.selector).inner.value(); },
                numInputs: wrapped(...x)().numInputs
            })
         ; }
    };

    //default aggregators & renderers use US naming and number formatting
    let aggregators = (tpl => 
        ({
            "Count":                tpl.count(usFmtInt),
            "Count Unique Values":  tpl.countUnique(usFmtInt),
            "List Unique Values":   tpl.listUnique(", "),
            "Sum":                  tpl.sum(usFmt),
            "Integer Sum":          tpl.sum(usFmtInt),
            "Average":              tpl.average(usFmt),
            "Minimum":              tpl.min(usFmt),
            "Maximum":              tpl.max(usFmt),
            "Sum over Sum":         tpl.sumOverSum(usFmt),
            "80% Upper Bound":      tpl.sumOverSumBound80(true, usFmt),
            "80% Lower Bound":      tpl.sumOverSumBound80(false, usFmt),
            "Sum as Fraction of Total":     tpl.fractionOf(tpl.sum(),   "total", usFmtPct),
            "Sum as Fraction of Rows":      tpl.fractionOf(tpl.sum(),   "row",   usFmtPct),
            "Sum as Fraction of Columns":   tpl.fractionOf(tpl.sum(),   "col",   usFmtPct),
            "Count as Fraction of Total":   tpl.fractionOf(tpl.count(), "total", usFmtPct),
            "Count as Fraction of Rows":    tpl.fractionOf(tpl.count(), "row",   usFmtPct),
            "Count as Fraction of Columns": tpl.fractionOf(tpl.count(), "col",   usFmtPct)
        })
    )(aggregatorTemplates);

    let renderers = {
        ["Table"](data, opts) {   return pivotTableRenderer(data, opts); },
        ["Table Barchart"](data, opts) { return $(pivotTableRenderer(data, opts)).barchart(); },
        ["Heatmap"](data, opts) { return $(pivotTableRenderer(data, opts)).heatmap("heatmap",    opts); },
        ["Row Heatmap"](data, opts) { return $(pivotTableRenderer(data, opts)).heatmap("rowheatmap", opts); },
        ["Col Heatmap"](data, opts) { return $(pivotTableRenderer(data, opts)).heatmap("colheatmap", opts); }
    };

    let locales = { 
        en: { 
            aggregators,
            renderers,
            localeStrings: { 
                renderError: "An error occurred rendering the PivotTable results.",
                computeError: "An error occurred computing the PivotTable results.",
                uiRenderError: "An error occurred rendering the PivotTable UI.",
                selectAll: "Select All",
                selectNone: "Select None",
                tooMany: "(too many to list)",
                filterResults: "Filter results",
                totals: "Totals", //for table renderer
                vs: "vs", //for gchart renderer
                by: "by" //for gchart renderer
            }
        }
    };

    //dateFormat deriver l10n requires month and day names to be passed in directly
    let mthNamesEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let dayNamesEn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    let zeroPad = number => (`0${number}`).substr(-2,2);

    let derivers = {
        bin(col, binWidth) { return record => record[col] - (record[col] % binWidth); },
        dateFormat(col, formatString, utcOutput=false, mthNames=mthNamesEn, dayNames=dayNamesEn) {
            let utc = utcOutput ? "UTC" : "";
            return function(record) { //thanks http://stackoverflow.com/a/12213072/112871
                let date = new Date(Date.parse(record[col]));
                if (isNaN(date)) { return ""; }
                return formatString.replace(/%(.)/g, function(m, p) {
                    switch (p) {
                        case "y": return date[`get${utc}FullYear`]();
                        case "m": return zeroPad(date[`get${utc}Month`]()+1);
                        case "n": return mthNames[date[`get${utc}Month`]()];
                        case "d": return zeroPad(date[`get${utc}Date`]());
                        case "w": return dayNames[date[`get${utc}Day`]()];
                        case "x": return date[`get${utc}Day`]();
                        case "H": return zeroPad(date[`get${utc}Hours`]());
                        case "M": return zeroPad(date[`get${utc}Minutes`]());
                        case "S": return zeroPad(date[`get${utc}Seconds`]());
                        default: return `%${p}`;
                    }
                });
            };
        }
    };

    let naturalSort = (as, bs) => { //thanks http://stackoverflow.com/a/4373421/112871
        let rx = /(\d+)|(\D+)/g;
        let rd = /\d/;
        let rz = /^0/;
        if (typeof as === "number" || typeof bs === "number") {
            if (isNaN(as)) { return 1; }
            if (isNaN(bs)) { return -1; }
            return as - bs;
        }
        let a = String(as).toLowerCase();
        let b = String(bs).toLowerCase();
        if (a === b) { return 0; }
        if (!rd.test(a) || !rd.test(b)) { return (a > b ? 1 : -1); }
        a = a.match(rx);
        b = b.match(rx);
        while (a.length && b.length) {
            let a1 = a.shift();
            let b1 = b.shift();
            if (a1 !== b1) {
                if (rd.test(a1) && rd.test(b1)) {
                    return a1.replace(rz, ".0") - b1.replace(rz, ".0");
                } else {
                    return (a1 > b1 ? 1 : -1);
                }
            }
        }
        return a.length - b.length;
    };

    let sortAs = function(order) { 
        let mapping = {};
        for (let i in order) {
            let x = order[i];
            mapping[x] = i;
        }
        return function(a, b) {
            if ((mapping[a] != null) && (mapping[b] != null)) {
                return mapping[a] - mapping[b];
            } else if (mapping[a] != null) {
                return -1;
            } else if (mapping[b] != null) {
                return 1;
            } else {
                return naturalSort(a,b);
            }
        };
    };

    let getSort = function(sorters, attr) {
        let sort = sorters(attr);
        if ($.isFunction(sort)) {
            return sort; 
        } else {
            return naturalSort;
        }
    };

    /*
    Data Model class
    */

    class PivotData {
        constructor(input, opts) {
            this.arrSort = this.arrSort.bind(this);
            this.sortKeys = this.sortKeys.bind(this);
            this.getColKeys = this.getColKeys.bind(this);
            this.getRowKeys = this.getRowKeys.bind(this);
            this.getAggregator = this.getAggregator.bind(this);
            this.aggregator = opts.aggregator;
            this.aggregatorName = opts.aggregatorName;
            this.colAttrs = opts.cols;
            this.rowAttrs = opts.rows;
            this.valAttrs = opts.vals;
            this.sorters = opts.sorters;
            this.tree = {};
            this.rowKeys = [];
            this.colKeys = [];
            this.rowTotals = {};
            this.colTotals = {};
            this.allTotal = this.aggregator(this, [], []);
            this.sorted = false;

            // iterate through input, accumulating data for cells
            PivotData.forEachRecord(input, opts.derivedAttributes, record => {
                if (opts.filter(record)) { return this.processRecord(record); }
            }
            );
        }

        //can handle arrays or jQuery selections of tables
        static forEachRecord(input, derivedAttributes, f) {
            if ($.isEmptyObject(derivedAttributes)) {
                var addRecord = f;
            } else {
                var addRecord = function(record) { 
                    for (let k in derivedAttributes) { let left;
                    let v = derivedAttributes[k]; record[k] = (left = v(record)) != null ? left : record[k]; }
                    return f(record);
                };
            }

            //if it's a function, have it call us back
            if ($.isFunction(input)) {
                return input(addRecord);
            } else if ($.isArray(input)) {
                if ($.isArray(input[0])) { //array of arrays
                    return (() => {
                        let result = [];
                        for (let i of Object.keys(input)) {
                            let compactRecord = input[i];
                            if (i > 0) {
                                let record = {};
                                for (let j of Object.keys(input[0])) { let k = input[0][j]; record[k] = compactRecord[j]; }
                                result.push(addRecord(record));
                            }
                        }
                        return result;
                    })();
                } else { //array of objects
                    return input.map((record) => addRecord(record));
                }
            } else if (input instanceof jQuery) {
                let tblCols = [];
                $("thead > tr > th", input).each(function(i) { return tblCols.push($(this).text()); });
                return $("tbody > tr", input).each(function(i) {
                    let record = {};
                    $("td", this).each(function(j) { return record[tblCols[j]] = $(this).text(); });
                    return addRecord(record);
                });
            } else {
                throw new Error("unknown input format");
            }
        }

        //converts to [{attr:val, attr:val},{attr:val, attr:val}] using method above
        static convertToArray(input) {
            let result = [];
            PivotData.forEachRecord(input, {}, record => result.push(record));
            return result;
        }

        arrSort(attrs) { 
            let sortersArr = (attrs.map((a) => getSort(this.sorters, a)));
            return function(a,b) { 
                for (let i of Object.keys(sortersArr)) {
                    let sorter = sortersArr[i];
                    let comparison = sorter(a[i], b[i]);
                    if (comparison !== 0) { return comparison; }
                }
                return 0;
            };
        }

        sortKeys() {
            if (!this.sorted) {
                this.sorted = true;
                this.rowKeys.sort(this.arrSort(this.rowAttrs));
                return this.colKeys.sort(this.arrSort(this.colAttrs));
            }
        }

        getColKeys() {
            this.sortKeys();
            return this.colKeys;
        }

        getRowKeys() {
            this.sortKeys();
            return this.rowKeys;
        }

        processRecord(record) { //this code is called in a tight loop
            let colKey = [];
            let rowKey = [];
            for (var x of this.colAttrs) { colKey.push(record[x] != null ? record[x] : "null"); } 
            for (x of this.rowAttrs) { rowKey.push(record[x] != null ? record[x] : "null"); }
            let flatRowKey = rowKey.join(String.fromCharCode(0));
            let flatColKey = colKey.join(String.fromCharCode(0));

            this.allTotal.push(record);

            if (rowKey.length !== 0) {
                if (!this.rowTotals[flatRowKey]) {
                    this.rowKeys.push(rowKey);
                    this.rowTotals[flatRowKey] = this.aggregator(this, rowKey, []);
                }
                this.rowTotals[flatRowKey].push(record);
            }

            if (colKey.length !== 0) {
                if (!this.colTotals[flatColKey]) {
                    this.colKeys.push(colKey);
                    this.colTotals[flatColKey] = this.aggregator(this, [], colKey);
                }
                this.colTotals[flatColKey].push(record);
            }

            if (colKey.length !== 0 && rowKey.length !== 0) {
                if (!this.tree[flatRowKey]) {
                    this.tree[flatRowKey] = {};
                }
                if (!this.tree[flatRowKey][flatColKey]) {
                    this.tree[flatRowKey][flatColKey] = this.aggregator(this, rowKey, colKey);
                }
                return this.tree[flatRowKey][flatColKey].push(record);
            }
        }

        getAggregator(rowKey, colKey) {
            let flatRowKey = rowKey.join(String.fromCharCode(0));
            let flatColKey = colKey.join(String.fromCharCode(0));
            if (rowKey.length === 0 && colKey.length === 0) {
                var agg = this.allTotal;
            } else if (rowKey.length === 0) {
                var agg = this.colTotals[flatColKey];
            } else if (colKey.length === 0) {
                var agg = this.rowTotals[flatRowKey];
            } else {
                var agg = this.tree[flatRowKey][flatColKey];
            }
            return agg != null ? agg : {
                    value() { return null; },
                    format() { return ""; }
                };
        }
    }

    //expose these to the outside world
    $.pivotUtilities = {aggregatorTemplates, aggregators, renderers, derivers, locales,
        naturalSort, numberFormat, sortAs, PivotData};

    /*
    Default Renderer for hierarchical table layout
    */

    var pivotTableRenderer = function(pivotData, opts) {

        let defaults = {
            localeStrings: {
                totals: "Totals"
            }
        };

        opts = $.extend(defaults, opts);

        let { colAttrs } = pivotData;
        let { rowAttrs } = pivotData;
        let rowKeys = pivotData.getRowKeys();
        let colKeys = pivotData.getColKeys();

        //now actually build the output
        let result = document.createElement("table");
        result.className = "pvtTable";

        //helper function for setting row/col-span in pivotTableRenderer
        let spanSize = function(arr, i, j) {
            if (i !== 0) {
                let noDraw = true;
                for (var x of __range__(0, j, true)) {
                    if (arr[i-1][x] !== arr[i][x]) {
                        noDraw = false;
                    }
                }
                if (noDraw) {
                  return -1; //do not draw cell
              }
            }
            let len = 0;
            while (i+len < arr.length) {
                let stop = false;
                for (var x of __range__(0, j, true)) {
                    if (arr[i][x] !== arr[i+len][x]) { stop = true; }
                }
                if (stop) { break; }
                len++;
            }
            return len;
        };

        //the first few rows are for col headers
        let thead = document.createElement("thead");
        for (var j of Object.keys(colAttrs)) {
            let c = colAttrs[j];
            var tr = document.createElement("tr");
            if (parseInt(j) === 0 && rowAttrs.length !== 0) {
                var th = document.createElement("th");
                th.setAttribute("colspan", rowAttrs.length);
                th.setAttribute("rowspan", colAttrs.length);
                tr.appendChild(th);
            }
            var th = document.createElement("th");
            th.className = "pvtAxisLabel";
            th.textContent = c;
            tr.appendChild(th);
            for (var i of Object.keys(colKeys)) {
                var colKey = colKeys[i];
                var x = spanSize(colKeys, parseInt(i), parseInt(j));
                if (x !== -1) {
                    th = document.createElement("th");
                    th.className = "pvtColLabel";
                    th.textContent = colKey[j];
                    th.setAttribute("colspan", x);
                    if (parseInt(j) === colAttrs.length-1 && rowAttrs.length !== 0) {
                        th.setAttribute("rowspan", 2);
                    }
                    tr.appendChild(th);
                }
            }
            if (parseInt(j) === 0) {
                th = document.createElement("th");
                th.className = "pvtTotalLabel";
                th.innerHTML = opts.localeStrings.totals;
                th.setAttribute("rowspan", colAttrs.length + (rowAttrs.length ===0 ? 0 : 1));
                tr.appendChild(th);
            }
            thead.appendChild(tr);
        }

        //then a row for row header headers
        if (rowAttrs.length !==0) {
            var tr = document.createElement("tr");
            for (var i of Object.keys(rowAttrs)) {
                let r = rowAttrs[i];
                var th = document.createElement("th");
                th.className = "pvtAxisLabel";
                th.textContent = r;
                tr.appendChild(th);
            } 
            var th = document.createElement("th");
            if (colAttrs.length ===0) {
                th.className = "pvtTotalLabel";
                th.innerHTML = opts.localeStrings.totals;
            }
            tr.appendChild(th);
            thead.appendChild(tr);
        }
        result.appendChild(thead);

        //now the actual data rows, with their row headers and totals
        let tbody = document.createElement("tbody");
        for (var i of Object.keys(rowKeys)) {
            let rowKey = rowKeys[i];
            var tr = document.createElement("tr");
            for (j of Object.keys(rowKey)) {
                let txt = rowKey[j];
                var x = spanSize(rowKeys, parseInt(i), parseInt(j));
                if (x !== -1) {
                    var th = document.createElement("th");
                    th.className = "pvtRowLabel";
                    th.textContent = txt;
                    th.setAttribute("rowspan", x);
                    if (parseInt(j) === rowAttrs.length-1 && colAttrs.length !==0) {
                        th.setAttribute("colspan",2);
                    }
                    tr.appendChild(th);
                }
            }
            for (j of Object.keys(colKeys)) { //this is the tight loop
                var colKey = colKeys[j];
                let aggregator = pivotData.getAggregator(rowKey, colKey);
                var val = aggregator.value();
                var td = document.createElement("td");
                td.className = `pvtVal row${i} col${j}`;
                td.textContent = aggregator.format(val);
                td.setAttribute("data-value", val);
                tr.appendChild(td);
            }

            var totalAggregator = pivotData.getAggregator(rowKey, []);
            var val = totalAggregator.value();
            var td = document.createElement("td");
            td.className = "pvtTotal rowTotal";
            td.textContent = totalAggregator.format(val);
            td.setAttribute("data-value", val);
            td.setAttribute("data-for", `row${i}`);
            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        //finally, the row for col totals, and a grand total
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.className = "pvtTotalLabel";
        th.innerHTML = opts.localeStrings.totals;
        th.setAttribute("colspan", rowAttrs.length + (colAttrs.length === 0 ? 0 : 1));
        tr.appendChild(th);
        for (j of Object.keys(colKeys)) {
            var colKey = colKeys[j];
            var totalAggregator = pivotData.getAggregator([], colKey);
            var val = totalAggregator.value();
            var td = document.createElement("td");
            td.className = "pvtTotal colTotal";
            td.textContent = totalAggregator.format(val);
            td.setAttribute("data-value", val);
            td.setAttribute("data-for", `col${j}`);
            tr.appendChild(td);
        }
        var totalAggregator = pivotData.getAggregator([], []);
        var val = totalAggregator.value();
        var td = document.createElement("td");
        td.className = "pvtGrandTotal";
        td.textContent = totalAggregator.format(val);
        td.setAttribute("data-value", val);
        tr.appendChild(td);
        tbody.appendChild(tr);
        result.appendChild(tbody);

        //squirrel this away for later
        result.setAttribute("data-numrows", rowKeys.length);
        result.setAttribute("data-numcols", colKeys.length);

        return result;
    };

    /*
    Pivot Table core: create PivotData object and call Renderer on it
    */

    $.fn.pivot = function(input, opts) {
        let defaults = {
            cols : [],
            rows: [],
            vals: [],
            dataClass: PivotData,
            filter() { return true; },
            aggregator: aggregatorTemplates.count()(),
            aggregatorName: "Count",
            sorters() {}, 
            derivedAttributes: {},
            renderer: pivotTableRenderer,
            rendererOptions: null,
            localeStrings: locales.en.localeStrings
        };

        opts = $.extend(defaults, opts);

        let result = null;
        try {
            let pivotData = new opts.dataClass(input, opts);
            try {
                result = opts.renderer(pivotData, opts.rendererOptions);
            } catch (e) {
                if (typeof console !== 'undefined' && console !== null) { console.error(e.stack); }
                result = $("<span>").html(opts.localeStrings.renderError);
            }
        } catch (e) {
            if (typeof console !== 'undefined' && console !== null) { console.error(e.stack); }
            result = $("<span>").html(opts.localeStrings.computeError);
        }
        
        let x = this[0];
        while (x.hasChildNodes()) { x.removeChild(x.lastChild); }
        return this.append(result);
    };


    /*
    Pivot Table UI: calls Pivot Table core above with options set by user
    */

    $.fn.pivotUI = function(input, inputOpts, overwrite = false, locale="en") {
        if (locales[locale] == null) {
            locale = "en";
        }
        let defaults = {
            derivedAttributes: {},
            aggregators: locales[locale].aggregators,
            renderers: locales[locale].renderers,
            hiddenAttributes: [],
            menuLimit: 200,
            cols: [], rows: [], vals: [],
            dataClass: PivotData,
            exclusions: {},
            inclusions: {},
            unusedAttrsVertical: 85,
            autoSortUnusedAttrs: false,
            rendererOptions: { localeStrings: locales[locale].localeStrings
        },
            onRefresh: null,
            filter() { return true; },
            sorters() {}, 
            localeStrings: locales[locale].localeStrings
        };

        let existingOpts = this.data("pivotUIOptions");
        if ((existingOpts == null) || overwrite) {
            var opts = $.extend(defaults, inputOpts);
        } else {
            var opts = existingOpts;
        }

        try {
            //cache the input in some useful form
            input = PivotData.convertToArray(input);
            let tblCols = ((() => {
                let result = [];
                for (let k of Object.keys(input[0])) {
                    result.push(k);
                }
                return result;
            })());
            for (var c of Object.keys(opts.derivedAttributes)) { if (!(tblCols.includes(c))) { tblCols.push(c); } }

            //figure out the cardinality and some stats
            let axisValues = {};
            for (var x of tblCols) { axisValues[x] = {}; }

            PivotData.forEachRecord(input, opts.derivedAttributes, record =>
                (() => {
                    let result1 = [];
                    for (let k of Object.keys(record)) {
                        let v = record[k];
                        if (opts.filter(record)) {
                            if (typeof v === 'undefined' || v === null) { v = "null"; }
                            if (axisValues[k][v] == null) { axisValues[k][v] = 0; }
                            result1.push(axisValues[k][v]++);
                        }
                    }
                    return result1;
                })()
            );

            //start building the output
            let uiTable = $("<table>", {"class": "pvtUi"}).attr("cellpadding", 5);

            //renderer control
            let rendererControl = $("<td>");

            let renderer = $("<select>")
                .addClass('pvtRenderer')
                .appendTo(rendererControl)
                .bind("change", () => refresh()); //capture reference
            for (x of Object.keys(opts.renderers)) {
                $("<option>").val(x).html(x).appendTo(renderer);
            }


            //axis list, including the double-click menu
            let colList = $("<td>").addClass('pvtAxisContainer pvtUnused');
            let shownAttributes = (tblCols.filter((c) => !opts.hiddenAttributes.includes(c)).map((c) => c));

            let unusedAttrsVerticalAutoOverride = false;
            if (opts.unusedAttrsVertical === "auto") {
                var unusedAttrsVerticalAutoCutoff = 120; // legacy support
            } else {
                var unusedAttrsVerticalAutoCutoff = parseInt(opts.unusedAttrsVertical);
            }

            if (!isNaN(unusedAttrsVerticalAutoCutoff)) {
                let attrLength = 0;
                for (let a of shownAttributes) { attrLength += a.length; }
                unusedAttrsVerticalAutoOverride = attrLength > unusedAttrsVerticalAutoCutoff;
            }

            if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
                colList.addClass('pvtVertList');
            } else {
                colList.addClass('pvtHorizList');
            }

            for (var i of Object.keys(shownAttributes)) {
                c = shownAttributes[i];
                (function(c) {
                    let keys = ((() => {
                        let result1 = [];
                        for (let k in axisValues[c]) {
                            result1.push(k);
                        }
                        return result1;
                    })());
                    let hasExcludedItem = false;
                    let valueList = $("<div>").addClass('pvtFilterBox').hide();

                    valueList.append($("<h4>").text(`${c} (${keys.length})`));
                    if (keys.length > opts.menuLimit) {
                        valueList.append($("<p>").html(opts.localeStrings.tooMany));
                    } else {
                        let btns = $("<p>").appendTo(valueList);
                        btns.append($("<button>", {type:"button"}).html(opts.localeStrings.selectAll).bind("click", () => valueList.find("input:visible").prop("checked", true))
                        );
                        btns.append($("<button>", {type:"button"}).html(opts.localeStrings.selectNone).bind("click", () => valueList.find("input:visible").prop("checked", false))
                        );
                        btns.append($("<br>"));
                        btns.append($("<input>", {type: "text", placeholder: opts.localeStrings.filterResults, class: "pvtSearch"}).bind("keyup", function() {
                            let filter = $(this).val().toLowerCase();
                            return valueList.find('.pvtCheckContainer p').each(function() {
                                let testString = $(this).text().toLowerCase().indexOf(filter);
                                if (testString !== -1) {
                                    return $(this).show();
                                } else {
                                    return $(this).hide();
                                }
                            });
                        })
                        );

                        let checkContainer = $("<div>").addClass("pvtCheckContainer").appendTo(valueList);

                        for (let k of keys.sort(getSort(opts.sorters, c))) {
                             let v = axisValues[c][k];
                             let filterItem = $("<label>");
                             let filterItemExcluded = false;
                             if (opts.inclusions[c]) {
                                filterItemExcluded = (!opts.inclusions[c].includes(k));
                             } else if (opts.exclusions[c]) {
                                filterItemExcluded = (opts.exclusions[c].includes(k));
                           }
                             if (!hasExcludedItem) { hasExcludedItem = filterItemExcluded; }
                             $("<input>")
                                .attr("type", "checkbox").addClass('pvtFilter')
                                .attr("checked", !filterItemExcluded).data("filter", [c,k])
                                .appendTo(filterItem);
                             filterItem.append($("<span>").text(k));
                             filterItem.append($("<span>").text(` (${v})`));
                             checkContainer.append($("<p>").append(filterItem));
                        }
                    }

                    let updateFilter = function() {
                        let unselectedCount = valueList.find("[type='checkbox']").length -
                                          valueList.find("[type='checkbox']:checked").length;
                        if (unselectedCount > 0) {
                            attrElem.addClass("pvtFilteredAttribute");
                        } else {
                            attrElem.removeClass("pvtFilteredAttribute");
                        }
                        if (keys.length > opts.menuLimit) {
                            return valueList.toggle();
                        } else {
                            return valueList.toggle(0, refresh);
                        }
                    };

                    $("<p>").appendTo(valueList)
                        .append($("<button>", {type:"button"}).text("OK").bind("click", updateFilter));

                    let showFilterList = function(e) {
                        let {left: clickLeft, top: clickTop, } = $(e.currentTarget).position();
                        valueList.css({left: clickLeft+10, top: clickTop+10}).toggle();
                        valueList.find('.pvtSearch').val('');
                        return valueList.find('.pvtCheckContainer p').show();
                    };

                    let triangleLink = $("<span>").addClass('pvtTriangle').html(" &#x25BE;")
                        .bind("click", showFilterList);

                    var attrElem = $("<li>").addClass(`axis_${i}`)
                        .append($("<span>").addClass('pvtAttr').text(c).data("attrName", c).append(triangleLink));
                    if (hasExcludedItem) { attrElem.addClass('pvtFilteredAttribute'); }
                    colList.append(attrElem).append(valueList);

                    return attrElem.bind("dblclick", showFilterList);
                })(c);
            }

            let tr1 = $("<tr>").appendTo(uiTable);

            //aggregator menu and value area

            let aggregator = $("<select>").addClass('pvtAggregator')
                .bind("change", () => refresh()); //capture reference
            for (x of Object.keys(opts.aggregators)) {
                aggregator.append($("<option>").val(x).html(x));
            }

            $("<td>").addClass('pvtVals')
              .appendTo(tr1)
              .append(aggregator)
              .append($("<br>"));

            //column axes
            $("<td>").addClass('pvtAxisContainer pvtHorizList pvtCols').appendTo(tr1);

            let tr2 = $("<tr>").appendTo(uiTable);

            //row axes
            tr2.append($("<td>").addClass('pvtAxisContainer pvtRows').attr("valign", "top"));

            //the actual pivot table container
            let pivotTable = $("<td>")
                .attr("valign", "top")
                .addClass('pvtRendererArea')
                .appendTo(tr2);

            //finally the renderer dropdown and unused attribs are inserted at the requested location
            if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
                uiTable.find('tr:nth-child(1)').prepend(rendererControl);
                uiTable.find('tr:nth-child(2)').prepend(colList);
            } else {
                uiTable.prepend($("<tr>").append(rendererControl).append(colList));
            }

            //render the UI in its default state
            this.html(uiTable);

            //set up the UI initial state as requested by moving elements around

            for (x of opts.cols) {
                this.find(".pvtCols").append(this.find(`.axis_${$.inArray(x, shownAttributes)}`));
            }
            for (x of opts.rows) {
                this.find(".pvtRows").append(this.find(`.axis_${$.inArray(x, shownAttributes)}`));
            }
            if (opts.aggregatorName != null) {
                this.find(".pvtAggregator").val(opts.aggregatorName);
            }
            if (opts.rendererName != null) {
                this.find(".pvtRenderer").val(opts.rendererName);
            }

            let initialRender = true;

            //set up for refreshing
            let refreshDelayed = () => {
                let base;
                let subopts = {
                    derivedAttributes: opts.derivedAttributes,
                    localeStrings: opts.localeStrings,
                    rendererOptions: opts.rendererOptions,
                    sorters: opts.sorters,
                    cols: [], rows: [],
                    dataClass: opts.dataClass
                };

                let numInputsToProcess = (base = opts.aggregators[aggregator.val()]([])()).numInputs != null ? base.numInputs : 0;
                let vals = [];
                this.find(".pvtRows li span.pvtAttr").each(function() { return subopts.rows.push($(this).data("attrName")); });
                this.find(".pvtCols li span.pvtAttr").each(function() { return subopts.cols.push($(this).data("attrName")); });
                this.find(".pvtVals select.pvtAttrDropdown").each(function() {
                    if (numInputsToProcess === 0) {
                        return $(this).remove();
                    } else {
                        numInputsToProcess--;
                        if ($(this).val() !== "") { return vals.push($(this).val()); }
                    }
                });

                if (numInputsToProcess !== 0) {
                    let pvtVals = this.find(".pvtVals");
                    for (x of __range__(0, numInputsToProcess, false)) {
                        let newDropdown = $("<select>")
                            .addClass('pvtAttrDropdown')
                            .append($("<option>"))
                            .bind("change", () => refresh());
                        for (let attr of shownAttributes) {
                            newDropdown.append($("<option>").val(attr).text(attr));
                        }
                        pvtVals.append(newDropdown);
                    }
                }

                if (initialRender) {
                    ({ vals } = opts);
                    i = 0;
                    this.find(".pvtVals select.pvtAttrDropdown").each(function() {
                        $(this).val(vals[i]);
                        return i++;
                    });
                    initialRender = false;
                }

                subopts.aggregatorName = aggregator.val();
                subopts.vals = vals;
                subopts.aggregator = opts.aggregators[aggregator.val()](vals);
                subopts.renderer = opts.renderers[renderer.val()];

                //construct filter here
                let exclusions = {};
                this.find('input.pvtFilter').not(':checked').each(function() {
                    let filter = $(this).data("filter");
                    if (exclusions[filter[0]] != null) {
                        return exclusions[filter[0]].push( filter[1] );
                    } else {
                        return exclusions[filter[0]] = [ filter[1] ];
                    }});
                //include inclusions when exclusions present
                let inclusions = {};
                this.find('input.pvtFilter:checked').each(function() {
                    let filter = $(this).data("filter");
                    if (exclusions[filter[0]] != null) {
                        if (inclusions[filter[0]] != null) {
                            return inclusions[filter[0]].push( filter[1] );
                        } else {
                            return inclusions[filter[0]] = [ filter[1] ];
                        }
                    }});

                subopts.filter = function(record) {
                    if (!opts.filter(record)) { return false; }
                    for (let k in exclusions) {
                        let excludedItems = exclusions[k];
                        if (excludedItems.includes(`${record[k]}`)) { return false; }
                    }
                    return true;
                };

                pivotTable.pivot(input,subopts);
                let pivotUIOptions = $.extend(opts, {
                    cols: subopts.cols,
                    rows: subopts.rows,
                    vals,
                    exclusions,
                    inclusions,
                    inclusionsInfo: inclusions, //duplicated for backwards-compatibility
                    aggregatorName: aggregator.val(),
                    rendererName: renderer.val()
                }
                );

                this.data("pivotUIOptions", pivotUIOptions);

                // if requested make sure unused columns are in alphabetical order
                if (opts.autoSortUnusedAttrs) {
                    let unusedAttrsContainer = this.find("td.pvtUnused.pvtAxisContainer");
                    $(unusedAttrsContainer).children("li")
                        .sort((a, b) => naturalSort($(a).text(), $(b).text()))
                        .appendTo(unusedAttrsContainer);
                }

                pivotTable.css("opacity", 1);
                if (opts.onRefresh != null) { return opts.onRefresh(pivotUIOptions); }
            };

            var refresh = () => {
                pivotTable.css("opacity", 0.5);
                return setTimeout(refreshDelayed, 10);
            };

            //the very first refresh will actually display the table
            refresh();

            this.find(".pvtAxisContainer").sortable({
                    update(e, ui) { if (ui.sender == null) { return refresh(); } },
                    connectWith: this.find(".pvtAxisContainer"),
                    items: 'li',
                    placeholder: 'pvtPlaceholder'
            });
        } catch (e) {
            if (typeof console !== 'undefined' && console !== null) { console.error(e.stack); }
            this.html(opts.localeStrings.uiRenderError);
        }
        return this;
    };

    /*
    Heatmap post-processing
    */

    $.fn.heatmap = function(scope = "heatmap", opts) {
        let numRows = this.data("numrows");
        let numCols = this.data("numcols");

        // given a series of values
        // must return a function to map a given value to a CSS color
        let colorScaleGenerator = __guard__(__guard__(opts, x1 => x1.heatmap), x => x.colorScaleGenerator);
        if (typeof colorScaleGenerator === 'undefined' || colorScaleGenerator === null) { colorScaleGenerator = function(values) {
            let min = Math.min(...values);
            let max = Math.max(...values);
            return function(x) {
                let nonRed = 255 - Math.round((255*(x-min))/(max-min));
                return `rgb(255,${nonRed},${nonRed})`;
            };
        }; }

        let heatmapper = scope => {
            let forEachCell = f => {
                return this.find(scope).each(function() {
                    let x = $(this).data("value");
                    if ((x != null) && isFinite(x)) { return f(x, $(this)); }
                });
            };

            let values = [];
            forEachCell(x => values.push(x));
            let colorScale = colorScaleGenerator(values);
            return forEachCell((x, elem) => elem.css("background-color", colorScale(x)));
        };

        switch (scope) {
            case "heatmap":    heatmapper(".pvtVal"); break;
            case "rowheatmap": for (let i of __range__(0, numRows, false)) { heatmapper(`.pvtVal.row${i}`); } break;
            case "colheatmap": for (let j of __range__(0, numCols, false)) { heatmapper(`.pvtVal.col${j}`); } break;
        }

        heatmapper(".pvtTotal.rowTotal");
        heatmapper(".pvtTotal.colTotal");

        return this;
    };

    /*
    Barchart post-processing
    */

    return $.fn.barchart =  function() {
        let numRows = this.data("numrows");
        let numCols = this.data("numcols");

        let barcharter = scope => {
            let forEachCell = f => {
                return this.find(scope).each(function() {
                    let x = $(this).data("value");
                    if ((x != null) && isFinite(x)) { return f(x, $(this)); }
                });
            };

            let values = [];
            forEachCell(x => values.push(x));
            let max = Math.max(...values);
            let scaler = x => (100*x)/(1.4*max);
            return forEachCell(function(x, elem) {
                let text = elem.text();
                let wrapper = $("<div>").css({
                    "position": "relative",
                    "height": "55px"
                });
                wrapper.append($("<div>").css({
                    "position": "absolute",
                    "bottom": 0,
                    "left": 0,
                    "right": 0,
                    "height": scaler(x) + "%",
                    "background-color": "gray"
                })
                );
                wrapper.append($("<div>").text(text).css({
                    "position":"relative",
                    "padding-left":"5px",
                    "padding-right":"5px"
                })
                );

                return elem.css({"padding": 0,"padding-top": "5px", "text-align": "center"}).html(wrapper);
            });
        };

        for (let i of __range__(0, numRows, false)) { barcharter(`.pvtVal.row${i}`); }
        barcharter(".pvtTotal.colTotal");

        return this;
    };
});



function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
