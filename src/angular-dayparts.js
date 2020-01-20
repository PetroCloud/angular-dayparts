"use strict";

angular.module('angular-dayparts', []).directive('angularDayparts', ['$window', '$document', '$timeout', function ($window, $document, $timeout) {
  return {
    restrict: 'E',
    scope: {
      options: '=?',
      reload: '=?'
    },
    templateUrl: 'template.html',
    controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
      
      $scope.options = $scope.options || {};
      $scope.options.reset = $scope.options.reset === undefined ? true : $scope.options.reset;
      var days = [{
        name: 'monday',
        position: 1
      }, {
        name: 'tuesday',
        position: 2
      }, {
        name: 'wednesday',
        position: 3
      }, {
        name: 'thursday',
        position: 4
      }, {
        name: 'friday',
        position: 5
      }, {
        name: 'saturday',
        position: 6
      }, {
        name: 'sunday',
        position: 7
      }];
      var hours = [];

      for (var i = 0; i < 24; i = i + .5) {
        var hour = parseInt(i, 10);
        var label = "".concat(hour % 12 === 0 ? '12' : hour % 12, ":").concat(hour < i ? '30' : '00', " ").concat(i / 12 < 1 ? 'AM' : 'PM');

        if ($scope.options.twelveOClockLabel) {
          switch (label) {
            case '12:00 AM':
              label = '(midnight) ' + label;
              break;

            case '12:00 PM':
              label = '(noon) ' + label;
              break;
          }
        }

        hours.push({
          value: i,
          label: label
        });
      }

      var mapDay = function mapDay(day) {
        return {
          title: day.name,
          data: day.position,
          type: 'day'
        };
      };

      var mapHour = function mapHour(hour) {
        return {
          title: hour.label,
          data: hour.value,
          type: 'hour'
        };
      };

      $scope.getDayTitleHourValue = function (row, col) {
        return row.type === 'day' ? row.title + '-' + col.data : col.title + '-' + row.data;
      };

      if ($scope.options.reverse) {
        $scope.rows = hours.map(mapHour);
        $scope.columns = days.map(mapDay);
      } else {
        $scope.rows = days.map(mapDay);
        $scope.columns = hours.map(mapHour);
      }

      var klass = 'selected';
      var startCell = null;
      var isDragging = false;
      var selected = [];
      var isStartSelected = false;

      $scope.reload = function () {
        clearElements();
        if ($scope.options.selected) {
          $timeout(function () {
            repopulate($scope.options.selected);
            onChangeCallback();
          }, 100);
        }
      }
      $scope.reload(); // initial call
      /**
       * When user stop clicking make the callback with selected elements
       */


      function mouseUp() {
        if (!isDragging) {
          return;
        }

        isDragging = false;
        onChangeCallback();
      }
      /**
       * Call 'onChange' function from passed options
       */


      function onChangeCallback() {
        if ($scope.options && $scope.options.onChange) {
          // Sort by day name and time
          var sortedSelected = [];
          selected.forEach(function (item) {
            var el = item.split('-');
            var o = {
              day: _.find(days, {
                name: el[0]
              }),
              time: parseFloat(el[1])
            };
            sortedSelected.push(o);
          });
          sortedSelected = _.sortBy(_.sortBy(sortedSelected, function (item) {
            return item.time;
          }), function (item) {
            return item.day.position;
          });
          selected = sortedSelected.map(function (item) {
            return item.day.name + '-' + item.time;
          });
          $scope.options.onChange(selected);
        }
      }
      /**
       * User start to click
       * @param {jQuery DOM element}
       */


      function mouseDown(el) {
        isDragging = true;
        setStartCell(el);
        setEndCell(el);
      }
      /**
       * User enter in a cell still triggering click
       * @param {jQuery DOM element}
       */


      function mouseEnter(el) {
        if (!isDragging) {
          return;
        }

        setEndCell(el);
      }
      /**
       * Get the first cell clicked
       * @param {jQuery DOM element}
       */


      function setStartCell(el) {
        startCell = el;
        isStartSelected = _.contains(selected, el.data('time'));
      }
      /**
       * Get the last cell
       * @param {jQuery DOM element}
       */


      function setEndCell(el) {
        cellsBetween(startCell, el).each(function () {
          var el = angular.element(this);

          if (!isStartSelected) {
            if (!_.contains(selected, el.data('time'))) {
              _addCell($(el));
            }
          } else {
            _removeCell(el);
          }
        });
      }
      /**
       * Get all the cells between first and last
       * @param  {jQuery DOM element} start cell
       * @param  {jQuery DOM element} end cell
       * @return {jQuery DOM elements} cells between start and end
       */


      function cellsBetween(start, end) {
        var coordsStart = getCoords(start);
        var coordsEnd = getCoords(end);
        var topLeft = {
          column: $window.Math.min(coordsStart.column, coordsEnd.column),
          row: $window.Math.min(coordsStart.row, coordsEnd.row)
        };
        var bottomRight = {
          column: $window.Math.max(coordsStart.column, coordsEnd.column),
          row: $window.Math.max(coordsStart.row, coordsEnd.row)
        };
        return $element.find('td').filter(function () {
          var el = angular.element(this);
          var coords = getCoords(el);
          return coords.column >= topLeft.column && coords.column <= bottomRight.column && coords.row >= topLeft.row && coords.row <= bottomRight.row;
        });
      }
      /**
       * Get the coordinates of a given cell
       * @param  {jQuery DOM element}
       * @return {object}
       */


      function getCoords(cell) {
        var row = cell.parents('row');
        return {
          column: cell[0].cellIndex,
          row: cell.parent()[0].rowIndex
        };
      }
      /**
       * Passing 'selected' property will make repopulate table
       */


      function repopulate() {
        selected = _.clone($scope.options.selected);
        $element.find('td').each(function (i, el) {
          if (_.contains(selected, $(el).data('time'))) {
            $(el).addClass(klass);
          }
        });
      }

      $scope.selectLine = function (colOrRow) {
        var searchSymbol;
        var correctAttr;

        if (colOrRow.type === 'day') {
          searchSymbol = '^="';
          correctAttr = 'title';
        } else {
          searchSymbol = '$="-';
          correctAttr = 'data';
        }

        var wholeLine = $element.find('.dayparts td[data-time' + searchSymbol + colOrRow[correctAttr] + '"]');
        var selectedOfLine = wholeLine.filter('.selected');

        if (wholeLine.length === selectedOfLine.length) {
          wholeLine.each(function (i, el) {
            _removeCell($(el));
          });
        } else {
          wholeLine.each(function (i, el) {
            _addCell($(el));
          });
        }

        onChangeCallback();
      };
      /**
       * Remove all selected hours
       */


      function reset() {
        clearElements();
        onChangeCallback();
      };

      function clearElements() {
        selected = [];
        $element.find('td').each(function (i, el) {
          $(el).removeClass(klass);
        });
      }
      /**
       * Remove css class from table and element from selected array
       * @param  {jQuery DOM element} cell
       */


      function _removeCell(el) {
        el.removeClass(klass);
        selected = _.without(selected, el.data('time'));
      } // TODO: make add unique

      /** 
       * Add css class to table and element to selected array
       * @param  {jQuery DOM element} cell
       */


      function _addCell(el) {
        el.addClass(klass);
        selected = _.union(selected, [el.data('time')])
      }

      function wrap(fn) {
        return function () {
          var el = angular.element(this);
          $scope.$apply(function () {
            fn(el);
          });
        };
      }
      /**
       * Mouse events
       */


      $element.delegate('.dayparts td', 'mousedown', wrap(mouseDown));
      $element.delegate('.dayparts td', 'mouseenter', wrap(mouseEnter));
      $document.delegate('body', 'mouseup', wrap(mouseUp));
    }]
  };
}]);