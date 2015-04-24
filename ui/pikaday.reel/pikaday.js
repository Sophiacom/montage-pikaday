/**
 * @module ui/reusable/pikaday.reel
 * @requires montage/ui/component
 */
 var Component = require("montage/ui/component").Component;
 var defaultLocalizer = require("montage/core/localizer").defaultLocalizer;
 var PressComposer = require("montage/composer/press-composer").PressComposer;
 var Moment = require("montage-moment").Moment;

/**
 * @class Pikaday
 * @extends Component
 */
 exports.Pikaday = Component.specialize(/** @lends Pikaday# */ {
    constructor: {
        value: function Pikaday() {
            this.super();

            this._pressComposer = new PressComposer();
            this._pressComposer.lazyLoad = true;

            this._years = [];
            this.rows = [];
        }
    },

    _pressComposer: { value: null },

    position: { value: 'bottom left'},
    format: { value: null },

    enabled: { value: true },

    // number of years either side, or array of upper/lower range
    yearRange: { value: 5 },

    _years: { value: null },
    _months: { value: null },
    _weekdays: { value: null },

    _selectedYear: { value: null },
    _selectedMonth: { value: null },
    _selectedDay: { value: null },

    minDate: { value: null },
    maxDate: { value: null },

    value: { value: null },
    _currentDate: { value: Moment() },

    _firstDayOfWeek: { value: null },

    templateDidLoad: {
        value: function() {
            this._firstDayOfWeek = Moment.localeData()._week.dow;

            this._months = Moment.months().map(function(month, index) {
                return {
                    text: month,
                    value: index
                };
            });

            this._weekdays = [];
            for(var i = 0; i < 7; i++) {
                var dayOfWeek = (this._firstDayOfWeek + i) % 7;
                this._weekdays.push({
                    title: Moment.weekdays()[dayOfWeek],
                    abbr: Moment.weekdaysShort()[dayOfWeek]
                })
            }

            this.format = Moment.localeData().longDateFormat('l');
        }
    },

    enterDocument: {
        value: function(firstTime) {
            this.super(firstTime);

            var self = this;
            if(firstTime) {
                this.addComposerForElement(this._pressComposer, this.element.ownerDocument);

                var initMoment = this.value?this.value:Moment();
                for(var i = initMoment.year() - this.yearRange; i <= initMoment.year() + this.yearRange; i++)
                    this._years.push({text: i.toString(), value: i});

                this._selectedMonth = initMoment.month();
                this._selectedYear = initMoment.year();
            }

            this.templateObjects.dateField.element.addEventListener("focus", this, false);
            this._pressComposer.addEventListener("pressStart", this, false);

            this.addPathChangeListener("_selectedMonth", this, "updateMonth");
            this.addPathChangeListener("_selectedYear", this, "updateYear");

            this.addPathChangeListener("minDate", this, "updateCells");
            this.addPathChangeListener("maxDate", this, "updateCells");

            this.addPathChangeListener("format", this, "updateValue");
        }
    },

    exitDocument: {
        value: function() {
            this.removePathChangeListener("format", this);

            this.removePathChangeListener("maxDate", this);
            this.removePathChangeListener("minDate", this);

            this.removePathChangeListener("_selectedYear", this);
            this.removePathChangeListener("_selectedMonth", this);

            this._pressComposer.removeEventListener("pressStart", this, false);
            this.templateObjects.dateField.element.removeEventListener("focus", this, false);

            this.super();
        }
    },

    updateValue: {
        value: function() {
            this.dispatchOwnPropertyChange("value", this.value, false);
        }
    },

    updateCells: {
        value: function() {
            this.needsDraw = true;
        }
    },

    updateMonth: {
        value: function() {
            if(this._selectedMonth < 0) {
                this._selectedYear--;
                this._selectedMonth += 12;
            } else if(this._selectedMonth >= 12) {
                this._selectedYear++;
                this._selectedMonth -= 12;
            }

            this.needsDraw = true;
        }
    },

    updateYear: {
        value: function() {
            if(this._selectedYear === this._years[this.yearRange].value)
                return;

            for(var i = 0; i <= 2 * this.yearRange; i++) {
                var year = this._selectedYear - this.yearRange + i;
                this._years[i].text = year.toString();
                this._years[i].value = year;
            }

            this.needsDraw = true;
        }
    },

    handleFocus: {
        value: function() {
            this._pressComposer.load();
            this.templateObjects.calendar.show();
        }
    },

    handlePressStart: {
        value: function(event) {
            if (!this.element.contains(event.targetElement) &&
                !this.templateObjects.calendar.element.contains(event.targetElement)) {
                this.hideCalendar();
            }
        }
    },

    hideCalendar: {
        value: function() {
            this._pressComposer.unload();
            this.templateObjects.calendar.hide();
        }
    },

    captureNextButtonAction: {
        value: function() {
            this._selectedMonth++;
        }
    },
    capturePrevButtonAction: {
        value: function() {
            this._selectedMonth--;
        }
    },

    capturePikaDayAction: {
        value: function(event) {
            var day = event.detail.selectedDay;
            this._selectedDay = day.day;

            if(this.value)
                var baseMoment = this.value.clone();
            else
                var baseMoment = Moment().startOf('day');
            this.value = baseMoment.year(day.year).month(day.month).date(day.day);

            this.hideCalendar();
        }
    },

    willPositionOverlay: {
        value: function(overlay, position) {
            var width = overlay.element.offsetWidth;
            var height = overlay.element.offsetHeight;
            var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            var scrollTop = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;

            var field = this.templateObjects.dateField.element;
            var clientRect = field.getBoundingClientRect();
            var left = clientRect.left + window.pageXOffset;
            var top = clientRect.bottom + window.pageYOffset;

            // default position is bottom & left
            var topRequested = this.position.indexOf('top') > -1;
            var rightRequested = this.position.indexOf('right') > -1;

            if (left + width > viewportWidth ||
                (rightRequested && left - width + field.offsetWidth > 0)) {
                left = left - width + field.offsetWidth;
            }
            if (top + height > viewportHeight + scrollTop ||
                (topRequested && top - height - field.offsetHeight > 0)) {
                top = top - height - field.offsetHeight;
            }

            return { top: top, left: left };
        }
    },

    draw: {
        value: function() {
            var month = Moment().year(this._selectedYear).month(this._selectedMonth).startOf('month');
            // looks like month.day() starts at 1: add 6 to have a positive % 7
            var before = (month.day() - this._firstDayOfWeek + 6) % 7;
            var days = month.daysInMonth();

            var cells = days + before;
            var after = 7 - (cells % 7);
            cells += after;

            while(this.rows.length) this.rows.pop();
            for(var row = 0; row < cells / 7; row++) {
                this.rows.push([]);

                for(var col = 0; col < 7; col++) {
                    var cell = (row * 7) + col;

                    if(cell > before && cell <= before + days) {
                        var currentDay = Moment([this._selectedYear, this._selectedMonth, cell - before]);
                        var currentCell = { day: cell - before, month: this._selectedMonth, year: this._selectedYear, active: true };

                        currentCell.value = currentDay;
                        if (this.maxDate)
                            currentCell.active = !currentDay.isAfter(this.maxDate);
                        if (this.minDate)
                            currentCell.active = !currentDay.isBefore(this.minDate) && currentCell.active;

                        this.rows[row].push(currentCell);
                    } else
                        this.rows[row].push(null);
                }
            }

            this.super();
        }
    },

    rows: { value: null }
});
