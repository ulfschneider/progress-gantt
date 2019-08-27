'use babel';

const d3 = require('d3');
const Base64 = require('js-base64').Base64;
const _ = require('underscore');

function validateSettings(settings) {

    if (!settings) {
        throw "No settings";
    }

    if (!settings.svg && settings.id) {
        settings.svg = document.getElementById(settings.id);
    }

    if (!settings.svg || settings.svg.tagName.toLowerCase() !== 'svg') {
        throw "No svg";
    }

    settings.d3svg = d3.select(settings.svg);
    settings.fontSize = settings.fontSize ? settings.fontSize : 16;
    settings.fontFamily = settings.fontFamily ? settings.fontFamily : 'sans-serif';
    settings.width = settings.width ? settings.width : 600;
    settings.height = settings.height ? settings.height : 400;

    if (_.isUndefined(settings.margin) || _.isEmpty(settings.margin)) {
        settings.margin = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
        }
    } else {
        settings.margin.left = settings.margin.left ? settings.margin.left : 0;
        settings.margin.top = settings.margin.top ? settings.margin.top : 0;
        settings.margin.right = settings.margin.right ? settings.margin.right : 0;
        settings.margin.bottom = settings.margin.bottom ? settings.margin.bottom : 0;
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


function drawProgressGantt(settings) {
    validateSettings(settings);
    removeProgressGantt(settings);

    let d3svg = settings.d3svg;

    d3svg
        .attr('width', settings.width + settings.margin.left + settings.margin.right + settings.borderWidth * 2)
        .attr('height', settings.height + settings.margin.top + settings.margin.bottom + settings.borderWidth * 2);

    settings.g = d3svg.append('g')
        .attr('transform', 'translate(' + (settings.margin.left) + "," + (settings.margin.top) + ')');
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
 * Draw the gauge.
 * @param {Object} [settings] - The configuration object for the gauge. Optional.
 * If provided, will overwrite the settings object already given to the constructor.
 */
ProgressGantt.prototype.draw = function (settings) {
    if (settings) {
        this.settings = settings;
    }
    drawGauge(this.settings);
}

/**
 * Clear the gauge.
 */
ProgressGantt.prototype.remove = function () {
    removeGauge(this.settings);
}

/**
 * Draw the gauge and return the result as a string which can be assigned to the SRC attribute of an HTML IMG tag.
 * @returns {string}
 */
ProgressGantt.prototype.imageSource = function () {
    this.draw();
    let html = this.settings.svg.outerHTML;
    return 'data:image/svg+xml;base64,' + Base64.encode(html);
}

/**
 * Draw the gauge and return the result as a SVG tag string.
 * @returns {string}
 */
ProgressGantt.prototype.svgSource = function () {
    this.draw();
    return this.settings.svg.outerHTML;
}

module.exports = function (settings) {
    return new ProgressGantt(settings);
}

