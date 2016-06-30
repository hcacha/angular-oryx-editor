import * as angular from "angular";
import * as ORYX from "../oryx";

export interface ISelectedRect {
    node:HTMLElement;
    dashedArea:HTMLElement;
    hide():void;
    show():void;
    resize(bounds:any):void;
}

class SelectedRect implements ISelectedRect{
    node:HTMLElement;
    dashedArea:HTMLElement;

	constructor(private parentId:angular.IAugmentedJQuery) {
            
	}
    private init = (): void => {
        var self = this;
        self.node = ORYX.Editor.graft("http://www.w3.org/2000/svg", self.parentId[0],
					['g']);

		self.dashedArea = ORYX.Editor.graft("http://www.w3.org/2000/svg", self.node,
			['rect', {x: 0, y: 0,
				'stroke-width': 1, stroke: '#777777', fill: 'none',
				'stroke-dasharray': '2,2',
				'pointer-events': 'none'}]);

		self.hide();
    }
	hide() {
        var self = this;
		self.node.setAttributeNS(null, 'display', 'none');
	}

	show() {
        var self = this;
		this.node.setAttributeNS(null, 'display', '');
	}
	resize(bounds) {
        var self = this;
		var upL = bounds.upperLeft();
		var padding = ORYX.CONFIG.SELECTED_AREA_PADDING||0;

		self.dashedArea.setAttributeNS(null, 'width', bounds.width() + 2*padding);
		self.dashedArea.setAttributeNS(null, 'height', bounds.height() + 2*padding);
		self.node.setAttributeNS(null, 'transform', "translate("+ (upL.x - padding) +", "+ (upL.y - padding) +")");
	}
}
