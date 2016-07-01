if (!Event.prototype.pointerX) {
    Event.prototype.pointerX = function() {
        var docElement = document.documentElement,
            body = document.body || {
                scrollLeft: 0
            };

        return this.pageX || (this.clientX +
            (docElement.scrollLeft || body.scrollLeft) -
            (docElement.clientLeft || 0));
    }
}
if (!Event.prototype.pointerY) {
    Event.prototype.pointerY = function() {
        var docElement = document.documentElement,
            body = document.body || {
                scrollTop: 0
            };

        return this.pageY || (this.clientY +
            (docElement.scrollTop || body.scrollTop) -
            (docElement.clientTop || 0));
    }
}
