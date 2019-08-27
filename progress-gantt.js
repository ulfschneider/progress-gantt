'use babel';

const d3 = require('d3');
const Base64 = require('js-base64').Base64;
const _ = require('underscore');
const moment = require('moment');

function getStartOfDay(date) {
    return getMoment(date).startOf('day');
}

function getMoment(date) {
    return moment(date);
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

    settings.d3svg = d3.select(settings.svg);
    settings.fontSize = settings.fontSize ? settings.fontSize : 16;
    settings.fontFamily = settings.fontFamily ? settings.fontFamily : 'sans-serif';
    settings.width = settings.width ? settings.width : 600;
    settings.height = settings.height ? settings.height : 400;

    if (_.isUndefined(settings.margin) || _.isEmpty(settings.margin)) {
        settings.margin = {
            left: 100,
            top: 50,
            right: 50,
            bottom: 50
        }
    } else {
        settings.margin.left = settings.margin.left ? settings.margin.left : 100;
        settings.margin.top = settings.margin.top ? settings.margin.top : 50;
        settings.margin.right = settings.margin.right ? settings.margin.right : 50;
        settings.margin.bottom = settings.margin.bottom ? settings.margin.bottom : 50;
    }

    if (_.isUndefined(settings.style) || _.isEmpty(settings.style)) {
        settings.style = {
            backgroundColor: '#fff',
            color: '#222',
            overrunColor: '#bbb',
            barColor: '#bbb',
            progressColor: '#222'
        }
    } else {
        settings.style.backgroundColor = settings.style.backgroundColor ? settings.style.backgroundColor : '#fff';
        settings.style.color = settings.style.color ? settings.style.color : '#222';
        settings.style.barColor = settings.style.barColor ? settings.style.barColor : '#bbb';
        settings.style.overrunColor = settings.style.overrunColor ? settings.style.overrunColor : settings.style.barColor;
        settings.style.progressColor = settings.style.progressColor ? settings.style.progressColor : settings.style.color;
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

    settings.y = d3.scaleBand().padding(0.05).range([0, settings.height]);
    settings.y.domain(settings.data.map(function (d) { return d.label }));

    settings.fromDate = d3.min(settings.data, function (d) { return getStartOfDay(d.startDate); });
    settings.toDate = d3.max(settings.data, function (d) { return getStartOfDay(d.endDate); });
    settings.x = d3.scaleLinear().range([0, settings.width]).domain([getStartOfDay(settings.fromDate), getStartOfDay(settings.toDate)]).nice();

}

function drawAxis(settings) {
    settings.yAxis = settings.g.append('g')
        .call(d3.axisLeft(settings.y).tickSize(0));

    settings.topAxis = settings.g.append('g')
        .call(d3.axisTop(settings.x).tickFormat(d3.timeFormat("%b %d")));
    settings.bottomAxis = settings.g.append('g')
        .attr('transform', 'translate(0,' + settings.height + ')')
        .call(d3.axisBottom(settings.x).tickFormat(d3.timeFormat("%b %d")));
}

function drawBars(settings) {
    settings.g
        .selectAll('.bar')
        .data(settings.data).enter().append('rect')
        .attr('class', 'bar')
        .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate)) })
        .attr('width',
            function (d) {
                if (d.overrun && !d.overrunDate) {
                    return settings.x(getStartOfDay(getMoment())) - settings.x(getStartOfDay(d.startDate));
                } else if (d.overrunDate) {
                    return settings.x(getStartOfDay(d.overrunDate)) - settings.x(getStartOfDay(d.startDate));
                } else {
                    return settings.x(getStartOfDay(d.endDate)) - settings.x(getStartOfDay(d.startDate));
                }
            })
        .attr('y', function (d) { return settings.y(d.label) })
        .attr('height', settings.y.bandwidth())
        .attr('fill', function (d) { return d.overrun || d.overrunDate ? settings.style.overrunColor : settings.style.barColor; });

    settings.g
        .selectAll('.progress-bar')
        .data(settings.data).enter().append('rect')
        .attr('class', 'progress-bar')
        .attr('x', function (d) { return settings.x(getStartOfDay(d.startDate)) })
        .attr('width',
            function (d) {
                if (d.overrun && !d.overrunDate) {
                    return (settings.x(getStartOfDay(getMoment())) - settings.x(getStartOfDay(d.startDate))) * d.progress;
                } else if (d.overrunDate) {
                    return (settings.x(getStartOfDay(d.overrunDate)) - settings.x(getStartOfDay(d.startDate))) * d.progress;
                } else {
                    return (settings.x(getStartOfDay(d.endDate)) - settings.x(getStartOfDay(d.startDate))) * d.progress;
                }
            })
        .attr('y', function (d) { return settings.y(d.label) })
        .attr('height', settings.y.bandwidth() / 3)
        .attr('fill', settings.style.progressColor);
}

function drawToday(settings) {
    let x = settings.x(getMoment()) + 0.5;
    let y1 = settings.height;
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
        .style('stroke', settings.style.color);
}

function drawProgressGantt(settings) {
    validateSettings(settings);
    removeProgressGantt(settings);

    let d3svg = settings.d3svg;

    d3svg
        .attr('width', settings.width + settings.margin.left + settings.margin.right)
        .attr('height', settings.height + settings.margin.top + settings.margin.bottom);

    settings.g = d3svg.append('g')
        .attr('transform', 'translate(' + (settings.margin.left) + "," + (settings.margin.top) + ')');

    prepareDataFunctions(settings);
    drawBars(settings);
    drawToday(settings);
    drawAxis(settings);

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

