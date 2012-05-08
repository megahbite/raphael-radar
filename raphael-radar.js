/**
 * Raphael Radar - JavaScript library to draw a controlable radar chart using Raphael.js
 *
 * Licensed under the MIT.
 * This library is a customized from Original version: https://github.com/jsoma/raphael-radar
 */
(function () {
  // Gets a position on a radar line.
  function lined_on(origin, base, bias) {
    return origin + (base - origin) * bias;
  }

  // Gets SVG path string for a group of scores.
  function path_string(center, points, scores) {
    var vertex = [];
    for (var i = 0; i < points.length; i++) {
      var x = lined_on(center.x, points[i].x, scores[i]);
      var y = lined_on(center.y, points[i].y, scores[i]);
      vertex.push("" + x + " " + y);
    }
    return "M " + vertex.join("L ") + "L " + vertex[0];
  }

  function Radar(raphael, cx, cy, radius, labels, min_score, max_score, score_groups, user_draw_options) {
    var self = this;

    self.raphael = raphael;
    self.chart = {};
    self.points = [];
    self.cx = cx;
    self.cy = cy;
    self.radius = radius;
    self.bottom = 0;
    self.min_score = min_score;
    self.max_score = max_score;
    self.labels = labels;
    self.score_groups = score_groups;
    self.user_draw_options = user_draw_options;
    self.global_draw_defaults = {
      text: {
        fill: "#222",
        "max-chars": 10,
        "key": true
      }
    };
    self.global_draw_options = $.extend(true, self.global_draw_defaults, user_draw_options);
  }

  Radar.prototype.draw = function () {
    var self = this;

    self.drawChartFrame();
    self.drawMeasures();
    self.drawScore();
    self.drawLable();
  };

  /**
   * Draws a polygon.
   *
   * @param {Array} points Point array of polygon.
   */
  Radar.prototype.polygon = function (points) {
    var self = this;

    // Initial parameter makes an effect... mysterious...
    var path_string = "M 100 100";
    var i, length = points.length, x, y, s;

    for (i = 0; i < length; ++i) {
      x = points[i].x;
      y = points[i].y;
      s = (i == 0) ? "M " + x + " " + y + " " : "L " + x + " " + y + " ";
      if (i === length - 1) {
        s += "L " + points[0].x + " " + points[0].y + " ";
      }
      path_string += s;
    }
    return self.raphael.path(path_string);
  };

  /**
   * Genarates points of the chart frame
   */
  Radar.prototype.drawChartFrame = function () {
    var self = this;

    var sides = self.labels.length;
    var angle = -90;
    var i, x, y, rad;

    self.bottom = 0;
    for (i = 0; i < sides; i++) {
      rad = (angle / 360.0) * (2 * Math.PI);
      x = self.cx + self.radius * Math.cos(rad);
      y = self.cy + self.radius * Math.sin(rad);
      self.points.push({ x: x, y: y });
      angle += 360.0 / sides;

      if (y > self.bottom) {
        self.bottom = y;
      }
    }

    // Draws a frame of the chart and sets styles it
    self.chart["frame"] = self.polygon(self.points).attr({ "stroke": "#777" });
  };

  /**
   * Draws measures of the chart.
   */
  Radar.prototype.drawMeasures = function () {
    var self = this;

    var points = self.points;
    var measures = [], rulers = [], ruler_text= [];
    var i, j, length = points.length, x, y, x1, x2, y1, y2, cl, text;
    var scale = (self.max_score - self.min_score) / 5;
    var r_len = 0.025;

    for (i = 0; i < length; ++i) {
      x = points[i].x;
      y = points[i].y;
      measures.push(self.raphael.path("M " + self.cx + " " + self.cy + " L " + x + " " + y).attr("stroke", "#777"));

      // Draws ruler and label
      rulers[i] = [];
      for (j = 0; j <= 5; ++j) {
        x1 = lined_on(self.cx, points[i].x, j * 0.20 - r_len);
        y1 = lined_on(self.cy, points[i].y, j * 0.20 - r_len);
        x2 = lined_on(self.cx, points[i].x, j * 0.20 + r_len);
        y2 = lined_on(self.cy, points[i].y, j * 0.20 + r_len);

        if (j !== 0 && j !== 5) {
          cl = self.raphael.path("M " + x1 + " " + y1 + " L " + x2 + " " + y2).attr({ "stroke": "#777" });
          cl.rotate(90);
          rulers[i].push(cl);
        }

        if (i === 0) {
          text = self.raphael.text(x1 - 10, y1, self.min_score + j * scale).attr($.extend(true, self.global_draw_options["text"], { "text-anchor": "end" }));
          ruler_text.push(text);
        }
      }
    }

    self.chart["measures"] = measures;
    self.chart["rulers"] = rulers;
    self.chart["ruler_text"] = ruler_text;
  };

  /**
   * Draws scores.
   */
  Radar.prototype.drawScore = function () {
    var self = this;

    var i, j, x, y, x1, x2, y1, y2, title, line, point, text, value;
    var draw_options;
    var default_draw_options = {
      points: {"fill":"#333", "stroke-width":"0", "size":4.5},
      text: {"fill":"#222", "text-anchor":"start"},
      lines: {"stroke-width":"1" }
    };
    var length = self.score_groups.length;
    var points = self.points;
    var center = { x: self.cx, y: self.cy };

    var score_groups = self.score_groups;
    var labels = self.labels;

    self.chart["scores"] = [];
    for (i = 0; i < length; ++i) {
      var scores = [];
      var vector = {};
      var v_points = [];

      draw_options = $.extend(true, default_draw_options, score_groups[i]["draw_options"]);

      // If a score_groups object doesn"t respond to "scores",
      // loop through the labels attribute to try querying the
      // keys on the object
      if (score_groups[i].scores) {
        for (j = 0; j < score_groups[i].scores.length; ++j)
          scores.push(score_groups[i].scores[j] / self.max_score);
      } else {
        for (j = 0; j < labels.length; ++j) {
          value = score_groups[i][labels[j]] || score_groups[i][labels[j].toLowerCase().replace(" ", "_")];
          scores.push(value / self.max_score);
        }
      }

      title = score_groups[i].title;
      line = self.raphael.path(path_string(center, points, scores)).attr(draw_options["lines"]);
      vector["line"] = line;

      // Draws points for chart
      for (j = 0; j < scores.length; j++) {
        x = lined_on(self.cx, points[j].x, scores[j]);
        y = lined_on(self.cy, points[j].y, scores[j]);

        point = self.raphael.circle(x, y, draw_options["points"]["size"]).attr(draw_options["points"]);
        v_points.push(point);
      }
      vector["points"] = v_points;

      // title with line sample
      if (title && self.global_draw_options["text"]["key"]) {
        x1 = self.cx - 50;
        y1 = self.bottom + 40 + 20 * i;
        x2 = self.cx;
        y2 = y1;
        line = self.raphael.path("M " + x1 + " " + y1 + " L " + x2 + " " + y2).attr(draw_options["lines"]);
        point = self.raphael.circle(x1, y1, draw_options["points"]["size"]).attr(draw_options["points"]);
        text = self.raphael.text(x2 + 10, y2, title).attr(draw_options["text"])
        vector["title"] = { line: line, point: point, text: text };
      }
      self.chart["scores"].push(vector);
    }
  };

  /**
   * Draws labels
   */
  Radar.prototype.drawLable = function () {
    var self = this;

    var points = self.points;
    var length = points.length;
    var i, x, y, label, text, anchor;

    self.chart["labels"] = [];
    for (i = 0; i < length; ++i) {
      anchor = "middle";
      x = lined_on(self.cx, points[i].x, 1.1);
      y = lined_on(self.cy, points[i].y, 1.1);
      if (x > self.cx) anchor = "start";
      if (x < self.cx) anchor = "end";

      label = self.labels[i];
      if (label.length > self.global_draw_options["text"]["max-chars"]) {
        label = label.replace(" ", "\n");
      }
      text = self.raphael.text(x, y, label).attr($.extend(true, self.global_draw_options["text"], { "text-anchor": anchor }));
      self.chart["labels"].push(text);
    }
  };

  /**
   * Draws a radarchart.
   *
   * @param cx x coodinates of center.
   * @param cy y coodinates of center.
   * @param radius radius of the radar chart. you may need more height and width for labels.
   * @param labels labels of axes. e.g. ["Speed", "Technic", "Height", "Stamina", "Strength"]
   * @param min_score minimum score.
   * @param max_score maximum score.
   * @param score_groups groups has 1+ group(s) of scores and name.
   * @param user_draw_options other options you want to use
   */
  Raphael.fn.radarchart = function (cx, cy, radius, labels, min_score, max_score, score_groups, user_draw_options) {
    var radar = new Radar(this, cx, cy, radius, labels, min_score, max_score, score_groups, user_draw_options);
    radar.draw();
    return radar.chart;
  };

})();