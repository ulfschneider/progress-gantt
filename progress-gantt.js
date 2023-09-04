'use babel';

const d3 = require('d3');
const Base64 = require('js-base64').Base64;
const _ = require('underscore');
const moment = require('moment');
const DATE_FORMAT = 'YYYY-MM-DD';
const TICK_SIZE = 6;

function createId() {
    return Math.random().toString(36).substr(2, 9);
}

function equalsIgnoreCase(a, b) {
    return String(a).toLowerCase() == String(b).toLowerCase();
}

function getStartOfDay(date) {
    return getMoment(date).startOf('day');
}

function getMoment(date) {
    return date ? moment(date) : moment();
}

function formatPercentage(percentage) {
    let fixed = 0;
    if (percentage > 0 && percentage < 0.01) {
        fixed = 2;
    } else if (percentage < 1 && percentage > 0.99) {
        fixed = 2;
    }
    return (percentage ? percentage * 100 : 0).toFixed(fixed) + '%';
}


function labelLineFactor(settings) {
    return settings.data.hasDescription ? 2 : 1;
}

function lineHeight(settings) {
    return Math.min(settings.y.bandwidth() / (2 + labelLineFactor(settings)), settings.style.fontSize);
}

function overrunBarHeight(settings) {
    return lineHeight(settings) / 2;
}

function fontSize(settings) {
    return lineHeight(settings);
}


function validateSettings(settings) {

    if (!settings) {
        throw 'No settings';
    }

    if (!settings.svg && settings.id) {
        settings.svg = document.getElementById(settings.id);
    }

    if (!settings.svg || settings.svg.tagName.toLowerCase() !== 'svg') {
        throw 'No svg';
    }

    if (!settings.data) {
        throw 'No data';
    }

    settings.data.hasDescription = false;
    for (let d of settings.data) {
        d.id = createId();
        if (d.description) {
            settings.data.hasDescription = true;
        }
    }

    settings.d3svg = d3.select(settings.svg);
    settings.width = settings.width ? settings.width : 600;
    settings.height = settings.height ? settings.height : 400;
    settings.showTimeAxis = _.isUndefined(settings.showTimeAxis) ? true : settings.showTimeAxis;

    if (!settings.markers) {
        settings.markers = [];
    }

    if (_.isUndefined(settings.margin) || _.isEmpty(settings.margin)) {
        settings.margin = {
            left: 0,
            top: 50,
            right: 50,
            bottom: 50
        }
    } else {
        settings.margin.left = _.isUndefined(settings.margin.left) ? 0 : settings.margin.left;
        settings.margin.top = _.isUndefined(settings.margin.top) ? 50 : settings.margin.top;
        settings.margin.right = _.isUndefined(settings.margin.right) ? 50 : settings.margin.right;
        settings.margin.bottom = _.isUndefined(settings.margin.bottom) ? 50 : settings.margin.bottom;
    }

    settings.innerWidth = settings.width - settings.margin.left - settings.margin.right;
    settings.innerHeight = settings.height - settings.margin.top - settings.margin.bottom;

    if (_.isUndefined(settings.style) || _.isEmpty(settings.style)) {
        settings.style = {
            backgroundColor: '#fff',
            color: '#222',
            todayColor: '#222',
            labelColor: '#222',
            barColor: '#ccc',
            progressBarColor: '#222',
            overrunBarColor: 'red',
            overrunProgressBarColor: '#222',
            fontFamily: 'sans-serif',
            fontSize: 12,
            axis: {
                color: '#222'
            }
        }
    } else {
        settings.style.backgroundColor = settings.style.backgroundColor ? settings.style.backgroundColor : '#fff';
        settings.style.color = settings.style.color ? settings.style.color : '#222';
        settings.style.todayColor = settings.style.todayColor ? settings.style.todayColor : settings.style.color;
        settings.style.labelColor = settings.style.labelColor ? settings.style.labelColor : settings.style.color;
        settings.style.barColor = settings.style.barColor ? settings.style.barColor : '#ccc';
        settings.style.progressBarColor = settings.style.progressBarColor ? settings.style.progressBarColor : settings.style.color;
        settings.style.overrunBarColor = settings.style.overrunBarColor ? settings.style.overrunBarColor : settings.style.barColor;
        settings.style.overrunProgressBarColor = settings.style.overrunProgressBarColor ? settings.style.overrunProgressBarColor : settings.style.progressBarColor;
        settings.style.fontFamily = settings.style.fontFamily ? settings.style.fontFamily : 'sans-serif';
        settings.style.fontSize = settings.style.fontSize ? settings.style.fontSize : 12;

        if (!settings.style.axis) {
            settings.style.axis = {
                color: settings.style.color
            }
        } else {
            settings.style.axis.color = settings.style.axis.color ? settings.style.axis.color : settings.style.color;
        }
    }

    return settings;
}


function removeProgressGantt(settings) {
    if (settings && settings.svg) {
        let svg = settings.svg;
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }
}

function prepareDataFunctions(settings) {

    settings.y = d3.scaleBand().padding(0.1).range([0, settings.innerHeight]);
    settings.y.domain(settings.data.map(function (d) { return d.label }));

    settings.fromDate = d3.min(settings.data,
        function (d) {
            if (d.startDate) {
                return getStartOfDay(d.startDate);
            } else {
                return getStartOfDay();
            }
        });
    if (settings.markers && settings.markers.length) {
        settings.fromDate = d3.min(settings.markers, function (d) {
            if (d.date) {
                return Math.min(settings.fromDate, getStartOfDay(d.date));
            }
            return settings.fromDate;
        });
    }

    settings.toDate = d3.max(settings.data,
        function (d) {
            if (d.endDate && d.overrunDate) {
                return Math.max(getStartOfDay(d.endDate), getStartOfDay(d.overrunDate));
            } else if (d.overrun) {
                return getStartOfDay();
            } else {
                return getStartOfDay(d.endDate || d.overrunDate);
            }
        });
    if (settings.markers && settings.markers.length) {
        settings.toDate = d3.max(settings.markers, function (d) {
            if (d.date) {
                return Math.max(settings.toDate, getStartOfDay(d.date));
            }
            return settings.toDate;
        });
    }

    settings.x = d3.scaleTime()
        .range([0, settings.innerWidth])
        .domain([getStartOfDay(settings.fromDate), getStartOfDay(settings.toDate)]);
}

function drawAxis(settings) {

    if (equalsIgnoreCase(settings.showTimeAxis, 'top') ||
        settings.showTimeAxis && !equalsIgnoreCase(settings.showTimeAxis, 'bottom') && !equalsIgnoreCase(settings.showTimeAxis, 'false')) {
        settings.topAxis = settings.g.append('g')
            .call(d3.axisTop(settings.x).ticks(Math.floor(settings.innerWidth / 120)).tickFormat(d3.timeFormat("%b %d")).tickSize(TICK_SIZE));
        settings.topAxis
            .selectAll('text')
            .attr('font-size', settings.style.fontSize + 'px')
            .attr('font-family', settings.style.fontFamily)
            .style('fill', settings.style.axis.color)
            .style('text-anchor', 'start');
    }
    if (equalsIgnoreCase(settings.showTimeAxis, 'bottom') ||
        settings.showTimeAxis && !equalsIgnoreCase(settings.showTimeAxis, 'top') && !equalsIgnoreCase(settings.showTimeAxis, 'false')) {
        settings.bottomAxis = settings.g.append('g')
            .attr('transform', 'translate(0,' + settings.innerHeight + ')')
            .call(d3.axisBottom(settings.x).ticks(Math.floor(settings.innerWidth / 120)).tickFormat(d3.timeFormat("%b %d")).tickSize(TICK_SIZE));
        settings.bottomAxis
            .selectAll('text')
            .attr('font-size', settings.style.fontSize + 'px')
            .attr('font-family', settings.style.fontFamily)
            .style('fill', settings.style.axis.color)
            .style('text-anchor', 'start');
    }
}

function drawText({
    text,
    textAnchor,
    x,
    y,
    color,
    settings
}) {
    settings.g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('font-size', settings.style.fontSize + 'px')
        .attr('font-family', settings.style.fontFamily)
        .style('fill', color)
        .style('text-anchor', textAnchor ? textAnchor : 'start')
        .text(text);
}

function isInTimeRange(d, settings) {
    let start = getStartOfDay(d.startDate || settings.fromDate);
    let end = getStartOfDay((d.overrun && !d.overrunDate) ? getStartOfDay(getMoment()) : d.overrunDate || d.endDate);
    return start && end && settings.fromDate.valueOf() <= start.valueOf() && start.valueOf() < end.valueOf();
}

function drawTimeConsumptionBars(settings) {
    settings.g
        .selectAll('.bar')
        .data(settings.data.filter(function (d) {
            return isInTimeRange(d, settings);
        }))
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate || settings.fromDate)) })
        .attr('width',
            function (d) {
                if (d.overrun && !d.overrunDate) {
                    return settings.x(getStartOfDay(getMoment())) - settings.x(getStartOfDay(d.startDate || settings.fromDate));
                } else if (d.overrunDate) {
                    return settings.x(getStartOfDay(d.overrunDate)) - settings.x(getStartOfDay(d.startDate || settings.fromDate));
                } else {
                    return settings.x(getStartOfDay(d.endDate)) - settings.x(getStartOfDay(d.startDate || settings.fromDate));
                }
            })
        .attr('y', function (d) { return settings.y(d.label) })
        .attr('height', settings.y.bandwidth())
        .attr('fill', settings.style.barColor)
        
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
    
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        })
        .append("svg:title")
        .text(function(d) { return d.toolTip })
}


function drawOverrunBars(settings) {

    settings.g
        .selectAll('.overrun-bar')
        .data(settings.data.filter(function (d) {
            return isInTimeRange(d, settings) && d.endDate && (d.overrun || d.overrunDate) && getStartOfDay(d.overrunDate).valueOf() > getStartOfDay(d.endDate).valueOf();
        }))
        .enter().append('rect')
        .attr('class', 'overrun-bar')
        .attr('x', function (d) { return settings.x(getStartOfDay(d.endDate)) })
        .attr('width',
            function (d) {
                if (d.overrunDate) {
                    return (settings.x(getStartOfDay(d.overrunDate)) - settings.x(getStartOfDay(d.endDate)));
                } else {
                    return (settings.x(getStartOfDay(getMoment())) - settings.x(getStartOfDay(d.endDate)));
                }
            })
        .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings) - overrunBarHeight(settings); })
        .attr('height', overrunBarHeight(settings))
        .attr('fill', settings.style.overrunBarColor)
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        });



}

function drawProgressBars(settings) {

    settings.g
        .selectAll('.progress-bar')
        .data(settings.data.filter(function (d) {
            return isInTimeRange(d, settings) && d.progress;
        }))
        .enter().append('rect')
        .attr('class', 'progress-bar')
        .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate || settings.fromDate)) })
        .attr('width',
            function (d) {
                if (d.overrun && !d.overrunDate) {
                    return (settings.x(getStartOfDay(getMoment())) - settings.x(getStartOfDay(d.startDate || settings.fromDate))) * Math.min(d.progress, 1.0);
                } else if (d.overrunDate) {
                    return (settings.x(getStartOfDay(d.overrunDate)) - settings.x(getStartOfDay(d.startDate || settings.fromDate))) * Math.min(d.progress, 1.0);
                } else {
                    return (settings.x(getStartOfDay(d.endDate)) - settings.x(getStartOfDay(d.startDate || settings.fromDate))) * Math.min(d.progress, 1.0);
                }
            })
        .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings); })
        .attr('height', lineHeight(settings))
        .attr('fill', function (d) { return d.overrun || d.overrunDate ? settings.style.overrunProgressBarColor : settings.style.progressBarColor; })
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        })
        .append("svg:title")
        .text(function(d) { return d.toolTip});

}

function drawBarLabels(settings) {

    const addBarLabels = function (d, i) {

        d3.select(this).append('text')
            .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate || settings.fromDate)); })
            .attr('y', function (d) { return settings.y(d.label) + lineHeight(settings) / 2; })
            .attr('dominant-baseline', 'central')
            .attr('font-size', fontSize(settings) + 'px')
            .attr('font-family', settings.style.fontFamily)
            .style('white-space', 'pre')
            .style('text-anchor', 'start')
            .style('fill', settings.style.labelColor)
            .text(function (d) { return d.label; })

        d3.select(this).append('text')
            .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate || settings.fromDate)) })
            .attr('y', function (d) { return settings.y(d.label) + lineHeight(settings) + lineHeight(settings) / 2; })
            .attr('dominant-baseline', 'central')
            .attr('font-size', fontSize(settings) + 'px')
            .attr('font-family', settings.style.fontFamily)
            .style('white-space', 'pre')
            .style('text-anchor', 'start')
            .style('fill', settings.style.labelColor)
            .text(function (d) { return d.description; });
    }

    settings.g
        .selectAll('.bar-label')
        .data(settings.data.filter(function (d) { return (d.startDate || settings.fromDate) }))
        .enter()
        .append('g')
        .attr('class', 'bar-label')
        .each(addBarLabels)
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        });

}

function drawDateLabels(settings) {
    let formatTime = d3.timeFormat('%b %d');

    settings.g
        .selectAll('.start-date-label')
        .data(settings.data.filter(function (d) { return d.startDate || settings.fromDate; }))
        .enter().append('text')
        .attr('class', 'start-date-label')
        .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate || settings.fromDate)) })
        .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings) - lineHeight(settings) / 2; })
        .attr('dominant-baseline', 'central')
        .attr('font-size', fontSize(settings) + 'px')
        .attr('font-family', settings.style.fontFamily)
        .style('text-anchor', 'start')
        .style('fill', settings.style.labelColor)
        .text(function (d) { return d.startDate ? formatTime(getMoment(d.startDate)) : ''; })
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        });


    settings.g
        .selectAll('.end-date-label')
        .data(settings.data.filter(function (d) { return d.startDate || settings.fromDate; }))
        .enter().append('text')
        .attr('class', 'end-date-label')
        .attr('x', function (d) {
            if (d.overrun && !d.overrunDate) {
                return 2 + settings.x(getStartOfDay(getMoment()));
            } else if (d.overrunDate) {
                return 2 + settings.x(getStartOfDay(d.overrunDate));
            } else {
                return 2 + settings.x(getStartOfDay(d.endDate));
            }
        })
        .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings) - lineHeight(settings) / 2; })
        .attr('dominant-baseline', 'central')
        .attr('font-size', fontSize(settings) + 'px')
        .attr('font-family', settings.style.fontFamily)
        .style('text-anchor', 'start')
        .style('fill', settings.style.labelColor)
        .text(function (d) {
            if (d.overrun && !d.overrunDate) {
                return formatTime(getStartOfDay(getMoment()));
            } else if (d.overrunDate) {
                return formatTime(getStartOfDay(d.overrunDate));
            } else {
                return formatTime(getStartOfDay(d.endDate));
            }
        })
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        });
}


function drawProgressLabels(settings) {

    const getBackgroundOffset = function (progressLabel) {
        try {
            let width = progressLabel.node().getComputedTextLength();
            return width ? width + 1 : 1;
        } catch (e) {
            //JSDOM is not able to operate with getComputedTextLength
            //therefore this code is not going to run in the tests
        }
        return 2;
    }

    const getBackgroundWidth = function (progressTag) {
        try {
            return progressTag.node().getComputedTextLength() + 2;
        } catch (e) {
            //JSDOM is not able to operate with getComputedTextLength
            //therefore this code is not going to run in the tests
        }
        return 0;
    }

    const addProgressLabels = function (d, i) {
        let progressLabel = d3.select(this).append('text')
            .attr('x',
                function (d) {
                    if (d.overrun && !d.overrunDate) {
                        return 2 + settings.x(getStartOfDay(getMoment()));
                    } else if (d.overrunDate) {
                        return 2 + settings.x(getStartOfDay(d.overrunDate));
                    } else {
                        return 2 + settings.x(getStartOfDay(d.endDate));
                    }
                })
            .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings) / 2; })
            .attr('dominant-baseline', 'central')
            .attr('font-size', fontSize(settings) + 'px')
            .attr('font-family', settings.style.fontFamily)
            .style('text-anchor', 'start')
            .style('fill', function (d) { return d.overrun || d.overrunDate ? settings.style.overrunProgressBarColor : settings.style.progressBarColor; })
            .text(function (d) { return formatPercentage(d.progress); });


        if (d.progressTag) {
            let rect = d3.select(this).append('rect')
                .style('fill', function (d) {
                    if (d.progressTagBackgroundColor) {
                        return d.progressTagBackgroundColor;
                    } else {
                        return d.overrun || d.overrunDate ? settings.style.overrunProgressBarColor : settings.style.progressBarColor;
                    }
                });

            let text = d3.select(this).append('text')
                .attr('x',
                    function (d) {
                        try {
                            let offset = getBackgroundOffset(progressLabel) + 1;
                            if (d.overrun && !d.overrunDate) {
                                return 2 + settings.x(getStartOfDay(getMoment())) + offset;
                            } else if (d.overrunDate) {
                                return 2 + settings.x(getStartOfDay(d.overrunDate)) + offset;
                            } else {
                                return 2 + settings.x(getStartOfDay(d.endDate)) + offset;
                            }
                        } catch (e) {
                            //JSDOM is not able to operate with getComputedTextLength
                            //therefore this code is not going to run in the tests
                        }
                    })
                .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings) / 2; })
                .attr('dominant-baseline', 'central')
                .attr('font-size', fontSize(settings) + 'px')
                .attr('font-family', settings.style.fontFamily)
                .style('text-anchor', 'start')
                .style('fill', d.progressTagTextColor ? d.progressTagTextColor : settings.style.backgroundColor)
                .text(function (d) { return d.progressTag; });

            rect.attr('x',
                function (d) {
                    let offset = getBackgroundOffset(progressLabel);
                    if (d.overrun && !d.overrunDate) {
                        return 2 + settings.x(getStartOfDay(getMoment())) + offset;
                    } else if (d.overrunDate) {
                        return 2 + settings.x(getStartOfDay(d.overrunDate)) + offset;
                    } else {
                        return 2 + settings.x(getStartOfDay(d.endDate)) + offset;
                    }
                })
                .attr('y', function (d) { return settings.y(d.label) + settings.y.bandwidth() - lineHeight(settings); })
                .attr('width', function (d) { return getBackgroundWidth(text); })
                .attr('height', function (d) { return fontSize(settings); });
        }
    }

    settings.g
        .selectAll('.progress-label')
        .data(settings.data.filter(function (d) { return (d.startDate || settings.fromDate) }))
        .enter()
        .append('g')
        .attr('class', 'progress-label')
        .each(addProgressLabels)
        .on('click', function (d) {
            if (d.onClick) { d.onClick(d, d3.event) }
        })
        .on('mouseover', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'pointer') };
        })
        .on('mouseout', function (d) {
            if (d.onClick) { d3.select(this).style('cursor', 'default') };
        });
}

function drawBars(settings) {
    drawTimeConsumptionBars(settings);
    drawOverrunBars(settings);
    drawProgressBars(settings);
}


function isDateInRange(date, settings) {

    let momentDate = getStartOfDay(date);

    if (settings.fromDate.valueOf() <= momentDate.valueOf() && momentDate.valueOf() <= settings.toDate.valueOf()) {
        return true;
    }
    return false;
}

function drawToday(settings) {
    let today = getStartOfDay(getMoment());
    if (isDateInRange(today, settings)) {
        let x = settings.x(getStartOfDay(getMoment())) + 0.5;
        let y1 = settings.innerHeight;
        let y2 = 0;
        settings.g.append('line')
            .attr('x1', x)
            .attr('y1', y1)
            .attr('x2', x)
            .attr('y2', y2)
            .style('stroke-width', '3')
            .style('stroke', settings.style.backgroundColor);


        settings.g.append('line')
            .attr('x1', x)
            .attr('y1', y1)
            .attr('x2', x)
            .attr('y2', y2)
            .style('stroke-width', '1')
            .style('stroke', settings.style.color)
            .style('stroke-dasharray', ('3, 3'));
    }
}

function drawMarkers(settings) {

    let mark = function (date, label, color) {
        let x1 = settings.x(getStartOfDay(date)) + 0.5; //perfect align marker
        let y1 = settings.innerHeight + TICK_SIZE;
        let y2 = -TICK_SIZE;

        if (x1 > 0.5) {
            settings.g.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x1)
                .attr('y2', y2)
                .style('stroke-width', '3')
                .style('stroke', settings.style.backgroundColor);
        }
        settings.g.append('line')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x1)
            .attr('y2', y2)
            .style('stroke-width', '1')
            .style('stroke', color ? color : settings.style.color);


        drawText({
            text: (label ? label : getMoment(date).format(DATE_FORMAT)),
            x: x1,
            y: -lineHeight(settings) * 2 - TICK_SIZE,
            color: color ? color : settings.style.color,
            textAnchor: 'start',
            settings: settings
        });

    }

    settings.markers.forEach(m => {
        if (isDateInRange(m.date, settings)) {
            mark(m.date, m.label, m.color);
        }
    });

}

function drawProgressGantt(settings) {
    validateSettings(settings);
    removeProgressGantt(settings);

    let d3svg = settings.d3svg;

    d3svg
        .attr('width', settings.width)
        .attr('height', settings.height);

    settings.g = d3svg.append('g')
        .attr('transform', 'translate(' + (settings.margin.left) + "," + (settings.margin.top) + ')');

    prepareDataFunctions(settings);
    drawAxis(settings);
    drawBars(settings);
    drawMarkers(settings);
    drawToday(settings);
    drawBarLabels(settings);
    drawDateLabels(settings);
    drawProgressLabels(settings);
}

/**
 * <a href='https://travis-ci.com/ulfschneider/progress-gantt'><img src='https://travis-ci.com/ulfschneider/progress-gantt.svg?branch=master'/></a>
 * <a href='https://coveralls.io/github/ulfschneider/progress-gantt?branch=master'><img src='https://coveralls.io/repos/github/ulfschneider/progress-gantt/badge.svg?branch=master' /></a>
 * <a href='https://badge.fury.io/js/progress-gantt'><img src='https://badge.fury.io/js/progress-gantt.svg' /></a>
 *
 * Draw a progress gantt.
 * 
 * <img src="https://github.com/ulfschneider/progress-gantt/blob/master/progress-gantt.png?raw=true"/>
 *
 * Play with the settings of the progress-gantt by visiting the [progress-gantt playground](https://htmlpreview.github.io/?https://github.com/ulfschneider/progress-gantt/blob/master/progress-gantt-playground.html).
 *
 * Install in your Node project with 
 * <pre>
 * npm i progress-gantt
 * </pre>
 * 
 * and use it inside your code via 
 * 
 * <pre>
 * const progressGantt = require('progress-gantt');
 * </pre>
 * 
 * or, alternatively 
 * 
 * <pre>
 * import progressGantt from 'progress-gantt';
 * </pre>
 * 
 * Create the new progress gantt objects via
 * 
 * <pre>
 * let diagram = progressGantt(settings);
 * </pre> 
 * 
 * @constructor
 * @param {Object} settings - The configuration object for the progress gantt. 
 * All data for the progress gantt is provided with this object. 
* @param {Object} settings.svg - The DOM tree element, wich must be an svg tag.
 * The progress gantt will be attached to this DOM tree element. Example:
 * <pre>settings.svg = document.getElementById('progressGantt');</pre>
 * <code>'progressGantt'</code> is the id of a svg tag.
 * @param {String} [settings.id] - The id of a domtree svg element, to which the progress gantt will be bound to. 
 * The id will only be used in case settings.svg is not provided.
 * @param {Number} [settings.width] - Width in pixels for the progress gantt without borders and margins. Default is <code>600</code>.
 * @param {Number} [settings.height] - Height in pixels for the progress gantt without borders and margins. Default is <code>400</code>.
 * @param {Number} [settings.fontSize] - Size in pixels for all labels. Default is <code>16</code>
 * @param {String} [settings.fontFamily] - The font to use for all labels. Default is <code>sans-serif</code>.
 * @param {{top: Number, right: Number, bottom: Number, left: Number}} [settings.margin] - The margin for the progress gantt. 
 * Default values are:
 * <pre>settings.margin = {
 * top: 0,
 * right: 0,
 * bottom: 0,
 * left: 0 }
 * </pre>
 */
function ProgressGantt(settings) {
    this.settings = settings;
}

/**
 * Draw the progress gantt.
 * @param {Object} [settings] - The configuration object for the progress gantt. Optional.
 * If provided, will overwrite the settings object already given to the constructor.
 */
ProgressGantt.prototype.draw = function (settings) {
    if (settings) {
        this.settings = settings;
    }

    drawProgressGantt(this.settings);
}

/**
 * Clear the progress gantt.
 */
ProgressGantt.prototype.remove = function () {
    removeProgressGantt(this.settings);
}

/**
 * Draw the progress gantt and return the result as a string which can be assigned to the SRC attribute of an HTML IMG tag.
 * @returns {string}
 */
ProgressGantt.prototype.imageSource = function () {
    this.draw();
    let html = this.settings.svg.outerHTML;
    return 'data:image/svg+xml;base64,' + Base64.encode(html);
}

/**
 * Draw the progress gantt and return the result as a SVG tag string.
 * @returns {string}
 */
ProgressGantt.prototype.svgSource = function () {
    this.draw();
    return this.settings.svg.outerHTML;
}

module.exports = function (settings) {
    return new ProgressGantt(settings);
}

