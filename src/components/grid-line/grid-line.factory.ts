import * as angular from "angular";
import * as ORYX from "oryx";

enum GridLineDir {
    DIR_HORIZONTAL = <any>"hor",
    DIR_VERTICAL = <any>"ver"
}

export interface IGridLine {
    direction: string;
    node:SVGAElement;
    line:SVGAElement;
    hide():void;
    show():void;
    getScale():void;
    update(pos:any):void
}

class GridLine implements IGridLine {
    direction: string;
    node:SVGAElement;
    line:SVGAElement;

    constructor(private parent: angular.IAugmentedJQuery, direction: string) {

        if (<any>GridLineDir.DIR_HORIZONTAL !== direction && <any>GridLineDir.DIR_VERTICAL !== direction) {
            direction =<any>GridLineDir.DIR_HORIZONTAL;
        }
        this.direction = direction;
        this.init();
    }
    private init = (): void => {
        var self = this;
        self.node = ORYX.Editor.graft("http://www.w3.org/2000/svg", self.parent[0],
            ['g']);

        self.line = ORYX.Editor.graft("http://www.w3.org/2000/svg", self.node,
            ['path', {
                'stroke-width': 1, stroke: 'silver', fill: 'none',
                'stroke-dasharray': '5,5',
                'pointer-events': 'none'
            }]);

        self.hide();
    }

    hide():void {
        var self = this;
        this.node.setAttributeNS(null, 'display', 'none');
    }

    show():void {
        var self = this;
        self.node.setAttributeNS(null, 'display', '');
    }

    getScale():number {
        var self = this;
        try {
            var baseVal= (<any>self.parent[0].parentNode).transform.baseVal;
            return baseVal && baseVal.length? baseVal.getItem(0).matrix.a:1;
        } catch (e) {
            return 1;
        }
    }

    update(pos:any):void {
        var self = this;

        if (self.direction === <any>GridLineDir.DIR_HORIZONTAL) {
            var y = pos instanceof Object ? pos.y : pos;
            var cWidth = (<any>self.parent[0].parentNode.parentNode).width.baseVal.value / this.getScale();
            self.line.setAttributeNS(null, 'd', 'M 0 ' + y + ' L ' + cWidth + ' ' + y);
        } else {
            var x = pos instanceof Object ? pos.x : pos;
            var cHeight = (<any>self.parent[0].parentNode.parentNode).height.baseVal.value / this.getScale();
            self.line.setAttributeNS(null, 'd', 'M' + x + ' 0 L ' + x + ' ' + cHeight);
        }
        self.show();
    }
}
export type oryxGridLineFactory = (parent: angular.IAugmentedJQuery, direction: string) => any;
oryxGridLine.$inject = [];
function oryxGridLine(): oryxGridLineFactory {
    return (parent: angular.IAugmentedJQuery, direction: string):any => {
        return new GridLine(parent,direction);
    }
}
angular.module("oryx.gridLine").factory("oryxGridLineFactory",oryxGridLine);

