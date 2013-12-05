/*! BootstrapRRD 0.1.0 */

var BootstrapRRD = {};

BootstrapRRD.defaultRanges = [
    ['last hour', function(now) { return [now-60*60*1000*1, now]; }],
    ['last 3 hours', function(now) { return [now-60*60*1000*3, now]; }],
    ['last 6 hours', function(now) { return [now-60*60*1000*6, now]; }],
    ['last 12 hours', function(now) { return [now-60*60*1000*12, now]; }],
    ['last day', function(now) { return [now-60*60*1000*24, now]; }],
    ['last week', function(now) { return [now-60*60*1000*24*7, now]; }],
    ['last month', function(now) { return [now-60*60*1000*24*31, now]; }],
    ['last year', function(now) { return [now-60*60*1000*24*365, now]; }],
];

BootstrapRRD.BASIC_CHART = {
    grid: {
        clickable: false,
        borderWidth: 1,
        borderColor: "#333",
        color: "#333",
        backgroundColor: "#FFF",
        tickColor: "#E6E6E6",
    },
    legend: {
        position: 'nw',
        noColumns: 1,
        toggle: true,
    },
    series: {
        stack: false,
        outline: false,
        points: { show: false },
        lines: {
            show: true,
            steps: false,
            shadowSize: 0,
            lineWidth: 1,
        },
        shadowSize: 0,
    },
    xaxis: {
        mode: "time",
    },
    yaxis: {
        si: true,
    },
};

BootstrapRRD.STACKED_CHART = {
    series: {
        stack: true,
        lines: {
            fill: 0.5,
        },
    },
};

BootstrapRRD.NOSCALING_CHART = {
    yaxis: {
        si: false,
    },
};

BootstrapRRD.OUTLINE_RANGE = {
    series: {
        outline: true,
    },
};

/*
 * Initializes BootstrapRRD.
 *
 * configTabs - list of tabs with specified panels,
 * configPanels - configuration for panels,
 * rangeBox - box for time range manipulation,
 * navigationBox - box for tabs elements,
 * target - box for panels.
 */
BootstrapRRD.load = function(configTabs, configPanels, rangeBox, navigationBox, target)
{
    var self = this;
    self.configTabs     = configTabs;
    self.configPanels   = configPanels;
    self.rangeBox       = rangeBox;
    self.navigationBox  = navigationBox;
    self.target         = target;
    self.panels         = [];
    self.tzoffset       = -1 * new Date().getTimezoneOffset() * 60 * 1000;
    self.range          = {xaxis: {min: 0 + self.tzoffset, max: new Date().getTime() + self.tzoffset}}
    self.rra_id         = 0;

    /* Placeholder to allow flot draw plot of hidden panels. */
    self.placeholder    = $('<div style="position: absolute; left: -2000px; width: 2000px; height: 2000px;"></div>').appendTo(window.document.body).show();

    /* Global progressbar */
    self.progress       = {
        bar: $('<div class="progress progress-striped active" style="position: fixed; top: 10px; right: 10px; width: 100px; margin-bottom: 0; z-index: 1000;"><span>0%</span><div class="progress-bar"></div></div>').prependTo(window.document.body).hide(),
        finished: 0,
    };

    self.progress.progress = self.progress.bar.find('.progress-bar');

    /* Updates queues. */
    self.updates = {
        alive: 0,
        calls: [0, 0, 0, 0, 0],
        p: 0,
    };

    /* initialize time range picker */
    var rangeForm       = rangeBox.find('form[name="range"]');
    var fromCustom      = rangeBox.find('input[name="fromCustom"]');
    var toCustom        = rangeBox.find('input[name="toCustom"]');
    var standardRange   = rangeBox.find('select[name="fromStandard"]');
    standardRange.empty();
    $.each(BootstrapRRD.defaultRanges, function(d)
    {
        standardRange.append($('<option value="' + d + '">' + this[0] + '</option>'));
    });

    standardRange.append('<option value="custom">custom</option>');
    standardRange.val(0);
    standardRange.change(function(e)
    {
        rangeForm.submit();
        e.preventDefault();
    });

    rangeBox.find('form[name="range"]').submit(function(e)
    {
        if(standardRange.val() !== 'custom')
            self.updateRange(BootstrapRRD.defaultRanges[parseInt(standardRange.val())][1](new Date().getTime() + self.tzoffset));

        else
            self.updateRange([fromCustom[0].valueAsNumber, toCustom[0].valueAsNumber]);

        e.preventDefault();
    });

    /* initialize navigation, panels and charts */
    target.empty();
    navigationBox.empty();
    $.each(configTabs, function()
    {
        var title   = this[0];
        var url     = this[0].replace(/ /gi, '_');
        var panels  = this[1];
        navigationBox.append('<li><a href="#' + url + '" title="' + title + '" data-toggle="tab">' + title + '</a>');
        var section = $('<section id="' + url + '"></section>').appendTo(target); // global section not yet class=tab-pane to allow for width calculation for flot
        $.each(panels, function()
        {
            var config = configPanels[this];
            var panel = $('<section class="row-fluid" id="' + this + '"></section>');
            var body = $('<article class="chart-box col-md-10 col-md-offset-1 well well-sm"></article>').appendTo(panel);

            body.append($('<div class="progress progress-striped active"><span>0%</span><div class="progress-bar progress-bar-success"></div></div>').hide());
            body.append($('<p class="alert"></p>').hide());
            body.append($('<header><h4 class="title">' + config.title + '</h4></header>'));
            var chart = $('<div class="chart">this is just placeholder</div>');
            body.append(chart);
            section.append(panel);
            chart.width(chart.width());
            chart.height(chart.height());
            self.panels.push({
                id: this,
                dom: body,
                error: body.find('.alert'),
                progress: body.find('.progress'),
                plot: $.plot(chart.empty().show(), [], $.extend(true, {}, config.options, self.range)),
                rrd: [],
            });
        });

        section.addClass('tab-pane');                           // activate tabs
        navigationBox.children(':first').addClass('active');    // activate first tab
        target.children(':first').addClass('active');           // activate first section
    });

    /* load charts data */
    self.updateRange(BootstrapRRD.defaultRanges[parseInt(standardRange.val())][1](new Date().getTime() + self.tzoffset));
    setInterval(function()
    {
        if(standardRange.val() == 'custom')
            return;

        self.updateRange(BootstrapRRD.defaultRanges[parseInt(standardRange.val())][1](new Date().getTime() + self.tzoffset));
    }, 60*5*1000); // update charts every 5min
};

BootstrapRRD.updateRange = function(range)
{
    var self = this;
    self.range.xaxis.min = range[0];
    self.range.xaxis.max = range[1];
    var now = new Date().getTime() + self.tzoffset;
    if(range[0] >= BootstrapRRD.defaultRanges[1][1](now)[0])
        self.rra_id = 0;

    else if(range[0] >= BootstrapRRD.defaultRanges[4][1](now)[0])
        self.rra_id = 3;

    else if(range[0] >= BootstrapRRD.defaultRanges[5][1](now)[0])
        self.rra_id = 6;

    else if(range[0] >= BootstrapRRD.defaultRanges[6][1](now)[0])
        self.rra_id = 9;

    else if(range[0] >= BootstrapRRD.defaultRanges[7][1](now)[0])
        self.rra_id = 12;

    // console.log(self.rra_id);
    self.rangeBox.find('input[name="fromCustom"]')[0].valueAsNumber = Math.round(range[0] / 60000) * 60000;
    self.rangeBox.find('input[name="toCustom"]')[0].valueAsNumber = Math.round(range[1] / 60000) * 60000;
    $.each(self.updates.calls, function(){try{this.abort();}catch(err){}});
    self.runChartsUpdater();
};

BootstrapRRD.runChartsUpdater = function()
{
    var self = this;
    if(self.updates.alive != 0) // if updater still works dont start new one
        return;

    var showError = function(panel, status, error)
    {
        panel.error.addClass('alert-error').removeClass('alert-success');
        panel.error.html('<strong>' + status + '</strong>: ' + error);
        panel.progress.hide();
        panel.error.show();
    };

    var updateProgress = function(progress, percent)
    {
        if(percent != undefined)
        {
            progress.children('.progress-bar').width(percent + '%');
            progress.children('span').text(percent + '%');
        }

        else
        {
            progress.children('.progress-bar').width('100%');
            progress.children('span').text('unknown');
        }
    };

    self.progress.finished = 0;
    updateProgress(self.progress.bar, 0);
    self.progress.progress.addClass('progress-bar-success');
    self.progress.bar.show();

    /* Prepare panels for update */
    $.each(self.panels, function()
    {
        // Hide error
        this.error.empty().hide();

        // Set progress to 0%
        updateProgress(this.progress, 0);
        this.progress.find('.progress-bar').addClass('progress-bar-success').removeClass('progress-bar-danger');
        this.progress.show();

        // Remove old RRDs
        this.rrd.length = 0;
    });

    // Run updater queues
    $.each(self.updates.calls, function(w)
    {
        if(w >= self.panels.length) // more queues than panels
            return;

        /* every queue works on (w + n * self.calls.length)th panel */
        ++ self.updates.alive;
        var worker = function(p, d) // p - panel, d - data
        {
            //console.log('Worker starting for ' + p + ' ' + d + ' ' + w);
            var panel = self.panels[p];
            var config = self.configPanels[panel.id];
            // starting ajax chain
            self.updates.calls[w] = $.ajax({
                url: config.data[d][0],
                dataType: 'text',
                cache: false,
                mimeType: 'text/plain; charset=x-user-defined',
                success: function(data, status, req)
                {
                    // when downloaded save RRD file for chart drawing
                    panel.rrd.push(new BinaryFile(data));
                },

                error: function(req, status, error)
                {
                    showError(panel, status, error);
                },

                complete: function(req, status)
                {
                    if(status == 'abort')
                    {
                        -- self.updates.alive;
                        return;
                    }

                    //console.log('Worker finished for ' + p + ' ' + d);
                    if(status == 'error' || ++ d == config.data.length) // "finished" downloading data for panel
                    {
                        try
                        {
                            // turn progress to red while drawing chart
                            panel.progress.find('.progress-bar').addClass('progress-bar-danger').removeClass('progress-bar-success');
                            self.updatePanel(panel);
                            panel.progress.hide();
                        }
                        catch(err)
                        {
                            showError(panel, 'error', err);
                        }

                        // update global progess
                        ++ self.progress.finished;
                        updateProgress(self.progress.bar, Math.round(self.progress.finished * 100 / self.panels.length));

                        // go to next panel
                        p += self.updates.calls.length;
                        d = 0;
                    }

                    // last panel in queue
                    if(p >= self.panels.length)
                    {
                        if(!-- self.updates.alive) // last panel
                            self.progress.bar.hide();

                        return;
                    }

                    worker(p, d);
                },

                xhr: function()
                {
                    // stuff for download progress
                    var xhr = new window.XMLHttpRequest();
                    xhr.addEventListener("progress", function(e)
                    {
                        if(e.lengthComputable)
                        {
                            var percent = Math.round((d + Math.min(e.loaded / e.total, 1)) * 100 / config.data.length);
                            updateProgress(panel.progress, percent);
                        }

                        else
                            updateProgress(panel.progress, undefined);

                    }, false);
                    return xhr;
                },
            });
        }

        worker(w, 0);
    });
};

BootstrapRRD.updatePanel = function(panel)
{
    var self = this;
    var config = self.configPanels[panel.id];
    var series = [];
    if(config.data.length > panel.rrd.length)
        throw "Cannot load data!";

    //console.log(config);
    // process series data
    $.each(config.data, function(c)
    {
        if(panel.rrd[c].getLength() <= 0)
            throw "Cannot load data!";

        var obj = new RRDFile(panel.rrd[c]);
        //console.log(obj);
        var ds_id = 0;
        if(typeof this[1] !== 'number') // translate name to DS id
        {
            var ds_names = obj.getDSNames();
            for(; ds_id < ds_names.length && this[1] !== ds_names[ds_id]; ++ ds_id);
        }
        else
            ds_id = this[1];

        //console.log(this[1] + ' ' + ds_id);
        var loadData = function(obj, ds_id, rra_id, label)
        {
            var flot = rrdDS2FlotSeries(obj, ds_id, rra_id);

            // filter out of bounds data
            flot.data = flot.data.filter(function(d)
            {
                return self.range.xaxis.min <= d[0] + self.tzoffset && d[0] + self.tzoffset <= self.range.xaxis.max;
            });

            $.each(flot.data, function(d)
            {
                flot.data[d][0] += self.tzoffset; // update time with timezone
                if(config.data[c][4] !== undefined) // apply config given function to scale data
                    flot.data[d][1] = config.data[c][4](flot.data[d][1]);
            });

            flot.label = label; // set series label
            flot.min = self.range.xaxis.min;
            flot.max = self.range.xaxis.max;
            return flot;
        }

        series.push(loadData(obj, ds_id, self.rra_id, this[2]));
        if(config.options.series.outline)
        {
            series.push(loadData(obj, ds_id, self.rra_id + 1, this[2] + '-min'));
            series.push(loadData(obj, ds_id, self.rra_id + 2, this[2] + '-max'));
        }
    });

    // scaling axis
    var liveOptions = {
        yaxis: {
            ticks: function(axis)
            {
                var siPrefixes = {
                    0: '',
                    1: 'K',
                    2: 'M',
                    3: 'G',
                    4: 'T'
                };

                var si = 0;
                while(config.options.yaxis.si) {
                    if( Math.pow(1000, si+1)*0.9 > axis.max ) {
                        break;
                    }
                    si++;
                }

                var minVal = axis.min/Math.pow(1000, si);
                var maxVal = axis.max/Math.pow(1000, si);

                var stepSizes = [0.01, 0.05, 0.1, 0.25, 0.5,
                                 1, 5, 10, 25, 50, 100, 250,
                                 500, 1000, 2000, 5000,
                                 10000, 20000, 50000,
                                 100000, 200000, 500000,
                                 1000000];
                var realStep = (maxVal - minVal)/5.0;

                var stepSize, decimalPlaces = 0;
                for(var i=0; i<stepSizes.length; i++) {
                    stepSize = stepSizes[i];
                    if( realStep < stepSize ) {
                        if(stepSize < 10) {
                            decimalPlaces = 2;
                        }
                        break;
                    }
                }

                var tickMin = minVal - minVal % stepSize;
                var tickMax = maxVal - maxVal % stepSize + stepSize;

                var ticks = [];
                for(var j=tickMin; j<=tickMax; j+=stepSize) {
                    ticks.push([
                        j*Math.pow(1000, si),
                        j.toFixed(decimalPlaces)
                    ]);
                }

                self.siPrefix = siPrefixes[si];

                return ticks;
            },
        },
    };

    var chart = panel.dom.find('.chart');
    var place = chart.parent();
    chart.detach();
    chart.appendTo(self.placeholder);

    // redraw plot
    panel.plot = $.plot(chart.empty().show(), series, $.extend(true, {}, config.options, self.range, liveOptions));

    // write units
    chart.append($('<div>').text(self.siPrefix + config.data[0][3]).css({
        'width': '100px',
        'position': 'absolute',
        'top': '80px',
        'left': '-110px',
        'text-align': 'right',
    }));

    chart.detach();
    chart.appendTo(place);
};
