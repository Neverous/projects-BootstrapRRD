/* Example config */
CHART_TABS = [
    ['System', ['load', 'cpu', 'memory']],
    ['Network', ['eth0']],
];

CHART_PANELS = {
    'load': {
        title: 'Load Average',
        data: [
            ['data/load.rrd', 'shortterm', 'Short Term', ''],
            ['data/load.rrd', 'midterm', 'Medium Term', ''],
            ['data/load.rrd', 'longterm', 'Long Term', '']
        ],
        options: jQuery.extend(true, {}, BootstrapRRD.BASIC_CHART,
                                         BootstrapRRD.NOSCALING_CHART)
    },

    'cpu': {
        title: 'CPU Usage',
        data: [
            ['data/cpu-wait.rrd', 0, 'Wait', '%'],
            ['data/cpu-system.rrd', 0, 'System', '%'],
            ['data/cpu-user.rrd', 0, 'User', '%'],
        ],
        options: jQuery.extend(true, {}, BootstrapRRD.BASIC_CHART,
                                         BootstrapRRD.STACKED_CHART)
    },

    'memory': {
        title: 'Memory Usage',
        data: [
            ['data/memory-buffered.rrd', 0, 'Buffered', 'B'],
            ['data/memory-used.rrd', 0, 'Used', 'B'],
            ['data/memory-cached.rrd', 0, 'Cached', 'B'],
            ['data/memory-free.rrd', 0, 'Free', 'B']
        ],
        options: jQuery.extend(true, {}, BootstrapRRD.BASIC_CHART,
                                         BootstrapRRD.STACKED_CHART)
    },

    'eth0': {
        title: 'eth0',
        data: [
            ['data/if_eth0_octets.rrd', 'tx', 'Transmit', 'bit/s', function (v) { return v*8; }],
            ['data/if_eth0_octets.rrd', 'rx', 'Receive', 'bit/s', function (v) { return v*8; }]
        ],
        options: jQuery.extend(true, {}, BootstrapRRD.BASIC_CHART)
    },
};
