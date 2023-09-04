"use babel";

const fs = require("fs");
const progressGantt = require("progress-gantt");

const NUMBER_OF_TEST_IMAGES = 0;
let actuals = [];
let expected = [];
let settings;

function makeTestSettings() {
  settings = {};
  settings.svg = document.createElement("svg");
  return settings;
}

function writeTestFile(path, content) {
  fs.writeFile(path, content);
}

function readTestFile(path) {
  return fs.readFileSync(path).toString();
}

function readExpectedFiles(folder, count) {
  let expected = [];
  for (let i = 0; i < count; i++) {
    expected.push(readTestFile(folder + "/expect" + i + ".svg"));
  }
  return expected;
}

beforeAll(() => {
  expected = readExpectedFiles("./test", NUMBER_OF_TEST_IMAGES);
});

test("write test results into file", () => {
  let testFileContent =
    '<!DOCTYPE html>\n<meta charset="utf-8">\n' +
    "<body><style>* {font-family:sans-serif;}\n" +
    ".image-set {border-bottom: 1px solid black; padding:2em 0;}\n" +
    ".label {text-transform:uppercase; color:white; background:gray; margin:1em 0em;}\n" +
    ".label.mismatch {color:white; background:red;}\n" +
    ".label.expected {color:white; background:green;}\n" +
    ".box {display:inline-block; margin-right: 1em;}</style>" +
    "<h1>Expected Test Results with Actual Values</h1>";

  for (let i = 0; i < actuals.length; i++) {
    writeTestFile("./test/actual" + i + ".svg", actuals[i]);
    let match = expected[i] == actuals[i];
    if (match) {
      testFileContent +=
        '<div class="image-set"><div class="box"><div class="label">Expected ' +
        i +
        "</div>" +
        expected[i] +
        "</div>" +
        '<div class="box"><div class="label expected">Actual ' +
        i +
        " is as expected</div>" +
        actuals[i] +
        "</div></div>";
    } else {
      testFileContent +=
        '<div class="image-set"><div class="box"><div class="label">Expected ' +
        i +
        "</div>" +
        expected[i] +
        "</div>" +
        '<div class="box"><div class="label mismatch">Actual ' +
        i +
        " has a mismatch</div>" +
        actuals[i] +
        "</div></div>";
    }
  }
  testFileContent += "</body";
  writeTestFile("./test/horiz-gauge.html", testFileContent);

  //have a look at ./test/progress-gantt.html to view the result
});
