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

            this.years = [];
            this.rows = [];

            //this.maxDate = Moment();
        }
    },

    _pressComposer: { value: null },

    position: { value: 'bottom left'},
    format: { value: null },

    // number of years either side, or array of upper/lower range
    yearRange: { value: 5 },

    years: { value: null },
    months: { value: null },
    weekdays: { value: null },

    selectedYear: { value: null },
    selectedMonth: { value: null },
    selectedDay: { value: null },

    minDate: { value: null },
    maxDate: { value: null },

    value: { value: null },

    _firstDayOfWeek: { value: null },

    templateDidLoad: {
        value: function() {
            this._firstDayOfWeek = Moment.localeData()._week.dow;

            this.months = Moment.months().map(function(month, index) {
                return {
                    text: month,
                    value: index
                };
            });

            this.weekdays = [];
            for(var i = 0; i < 7; i++) {
                var dayOfWeek = (this._firstDayOfWeek + i) % 7;
                this.weekdays.push({
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
                    this.years.push({text: i.toString(), value: i});

                this.selectedMonth = initMoment.month();
                this.selectedYear = initMoment.year();
            }

            this.templateObjects.dateField.element.addEventListener("focus", this, false);
            this._pressComposer.addEventListener("pressStart", this, false);

            this.addPathChangeListener("selectedMonth", this, "updateMonth");
            this.addPathChangeListener("selectedYear", this, "updateYear");

            this.addPathChangeListener("minDate", this, "updateCells");           
            this.addPathChangeListener("maxDate", this, "updateCells");            
        }
    },

    exitDocument: {
        value: function() {
            this.removePathChangeListener("selectedYear", this);
            this.removePathChangeListener("selectedMonth", this);

            this._pressComposer.removeEventListener("pressStart", this, false);
            this.templateObjects.dateField.element.removeEventListener("focus", this, false);

            this.super();
        }
    },

    updateCells: {
        value: function() {
            this.needsDraw = true;
        }
    },

    updateMonth: {
        value: function() {
            if(this.selectedMonth < 0) {
                this.selectedYear--;
                this.selectedMonth += 12;
            } else if(this.selectedMonth >= 12) {
                this.selectedYear++;
                this.selectedMonth -= 12;
            }

            this.needsDraw = true;
        }
    },

    updateYear: {
        value: function() {
            if(this.selectedYear === this.years[this.yearRange].value)
                return;

            for(var i = 0; i <= 2 * this.yearRange; i++) {
                var year = this.selectedYear - this.yearRange + i;
                this.years[i].text = year.toString();
                this.years[i].value = year;
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
            this.selectedMonth++;
        }
    },
    capturePrevButtonAction: {
        value: function() {
            this.selectedMonth--;
        }
    },

    capturePikaDayAction: {
        value: function(event) {
            var day = event.detail.selectedDay;
            this.selectedDay = day.day;

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
            var field = this.templateObjects.dateField.element;
            var width = this.element.offsetWidth;
            var height = this.element.offsetHeight;
            var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            var scrollTop = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;

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
            var month = Moment().year(this.selectedYear).month(this.selectedMonth).startOf('month');
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
                        var currentCell = {day: cell - before, month: this.selectedMonth, year: this.selectedYear, active: true};
                        var currentDay = Moment([this.selectedYear, this.selectedMonth, cell - before]);

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
