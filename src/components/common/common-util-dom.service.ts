import * as angular from "angular";

export interface ICommonUtilDomService {
    elementWidth(elem: angular.IAugmentedJQuery, extra?: any): any;
    elementHeight(elem: angular.IAugmentedJQuery, extra?: any): any;
    offset(element: angular.IAugmentedJQuery): any;
    outerElementWidth(elem: angular.IAugmentedJQuery, margin?: boolean): any;
    outerElementHeight(elem: angular.IAugmentedJQuery, margin?: boolean): any;
}
angular.typescript.decorators.inject("$window");
class CommonUtilDomService implements ICommonUtilDomService {
    private rdisplayswap: RegExp = /^(block|none|table(?!-c[ea]).+)/;
    private cssShow: Object = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
    };
    private rnumnonpx = new RegExp("^(" + (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source + ")(?!px)[a-z%]+$", "i");

    constructor(private $window: angular.IWindowService) {

    }
    private getStyles = (elem: angular.IAugmentedJQuery): any => {
        var e = elem[0];
        return e.ownerDocument.defaultView.getComputedStyle(e, null);
    }
    private swap = (elem: HTMLElement, options: any, callback: Function, args?: any): any => {
        var ret, name,
            old = {};

        // Remember the old values, and insert the new ones
        for (name in options) {
            old[name] = elem.style[name];
            elem.style[name] = options[name];
        }

        ret = callback.apply(elem, args || []);

        // Revert the old values
        for (name in options) {
            elem.style[name] = old[name];
        }

        return ret;
    }
    private augmentWidthOrHeight = (elem: HTMLElement, name: string, extra: any, isBorderBox: boolean, styles: any): any => {
        var i = extra === (isBorderBox ? 'border' : 'content') ?
            // If we already have the right measurement, avoid augmentation
            4 :
            // Otherwise initialize for horizontal or vertical properties
            name === 'width' ? 1 : 0,

            val = 0;

        var sides = ['Top', 'Right', 'Bottom', 'Left'];

        for (; i < 4; i += 2) {
            var side = sides[i];
            // dump('side', side);

            // both box models exclude margin, so add it if we want it
            if (extra === 'margin') {
                var marg = parseFloat(styles[extra + side]);
                if (!isNaN(marg)) {
                    val += marg;
                }
            }
            // dump('val1', val);

            if (isBorderBox) {
                // border-box includes padding, so remove it if we want content
                if (extra === 'content') {
                    var padd = parseFloat(styles['padding' + side]);
                    if (!isNaN(padd)) {
                        val -= padd;
                        // dump('val2', val);
                    }
                }

                // at this point, extra isn't border nor margin, so remove border
                if (extra !== 'margin') {
                    var bordermarg = parseFloat(styles['border' + side + 'Width']);
                    if (!isNaN(bordermarg)) {
                        val -= bordermarg;
                        // dump('val3', val);
                    }
                }
            }
            else {
                // at this point, extra isn't content, so add padding
                var nocontentPad = parseFloat(styles['padding' + side]);
                if (!isNaN(nocontentPad)) {
                    val += nocontentPad;
                    // dump('val4', val);
                }

                // at this point, extra isn't content nor padding, so add border
                if (extra !== 'padding') {
                    var nocontentnopad = parseFloat(styles['border' + side + 'Width']);
                    if (!isNaN(nocontentnopad)) {
                        val += nocontentnopad;
                        // dump('val5', val);
                    }
                }
            }
        }

        // dump('augVal', val);

        return val;
    }
    private getWidthOrHeight = (elem: angular.IAugmentedJQuery, name: string, extra: any): any => {
        var self = this;
        // Start with offset property, which is equivalent to the border-box value
        var valueIsBorderBox = true,
            val, // = name === 'width' ? elem.offsetWidth : elem.offsetHeight,
            styles = self.getStyles(elem),
            isBorderBox = styles['boxSizing'] === 'border-box';

        // some non-html elements return undefined for offsetWidth, so check for null/undefined
        // svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
        // MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
        if (val <= 0 || val == null) {
            // Fall back to computed then uncomputed css if necessary
            val = styles[name];
            if (val < 0 || val == null) {
                val = elem[0].style[name];
            }

            // Computed unit is not pixels. Stop here and return.
            if (self.rnumnonpx.test(val)) {
                return val;
            }

            // we need the check for style in case a browser which returns unreliable values
            // for getComputedStyle silently falls back to the reliable elem.style
            valueIsBorderBox = isBorderBox &&
                (true || val === elem[0].style[name]); // use 'true' instead of 'support.boxSizingReliable()'

            // Normalize "", auto, and prepare for extra
            val = parseFloat(val) || 0;
        }

        // use the active box-sizing model to add/subtract irrelevant styles
        var ret = (val +
            self.augmentWidthOrHeight(
                elem[0],
                name,
                extra || (isBorderBox ? "border" : "content"),
                valueIsBorderBox,
                styles
            )
        );

        // dump('ret', ret, val);
        return ret;
    }
    private getElementWidthOrHeight = (type: string, elem: angular.IAugmentedJQuery, extra: any): any => {
        var self = this;
        var e = elem[0];

        if (e) {
            var styles = self.getStyles(elem);
            return e.offsetWidth === 0 && self.rdisplayswap.test(styles.display) ?
                self.swap(e, self.cssShow, function () {
                    return self.getWidthOrHeight(elem, type, extra);
                }) :
                self.getWidthOrHeight(elem, type, extra);
        }
        else {
            return null;
        }
    }
    elementWidth(elem: angular.IAugmentedJQuery, extra: any): any {
        var self = this;
        return self.getElementWidthOrHeight("width", elem, extra);
    }
    elementHeight(elem: angular.IAugmentedJQuery, extra: any): any {
        var self = this;
        return self.getElementWidthOrHeight("height", elem, extra);
    }
    offset(element: angular.IAugmentedJQuery): any {
        var self = this;
        var docElem, win, rect, doc,
            elem = element[0];

        if (!elem) {
            return;
        }

        rect = elem.getBoundingClientRect();

        // Make sure element is not hidden (display: none) or disconnected
        if (rect.width || rect.height || elem.getClientRects().length) {
            doc = elem.ownerDocument;
            win = self.$window;
            docElem = doc.documentElement;

            return {
                top: rect.top + win.pageYOffset - docElem.clientTop,
                left: rect.left + win.pageXOffset - docElem.clientLeft
            };
        }
    }
    outerElementHeight(elem: angular.IAugmentedJQuery, margin?: boolean) {
        var self = this;
        return elem ? self.elementHeight(elem, margin ? 'margin' : 'border') : null;
    };
    outerElementWidth(elem: angular.IAugmentedJQuery, margin?: boolean) {
        var self = this;
        return elem ? self.elementWidth(elem, margin ? 'margin' : 'border') : null;
    };
}

angular.module("oryx.common").service("oryxCommonUtilDomService", CommonUtilDomService);