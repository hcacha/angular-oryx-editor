import * as angular from "angular";
import * as ORYX from "../../oryx";

export interface IResizerNode {
	dragEnable:boolean;
    node: HTMLElement;
	offSetPosition:any;
	bounds:any;
	canvasNode:any;
	minSize :any;
	maxSize :any;
	aspectRatio :any;
	scrollNode:Node;
	offsetScroll:any;
	position:any;
	containmentParentNode:any;
	resizeCallbacks :Array<any>;
	resizeStartCallbacks:Array<any> ;
	resizeEndCallbacks:Array<any>;
}

class ResizerNode implements IResizerNode {
	dragEnable:boolean=false;
	node: HTMLElement;
	scrollNode:HTMLElement;
	offSetPosition:any={ x: 0, y: 0 };
	bounds:any;
	canvasNode:any;
	minSize :any;
	maxSize :any;
	aspectRatio :any;
	offsetScroll:any;
	position:any;
	containmentParentNode:any;
	resizeCallbacks :Array<any>=[];
	resizeStartCallbacks:Array<any>=[] ;
	resizeEndCallbacks:Array<any>=[];


	constructor(private parent: angular.IAugmentedJQuery, private orientation: string, private facade: any) {
		this.init();
	}
	private init = (): void => {
        var self = this;
		self.node=<HTMLElement>self.parent[0].querySelector('.resizer_' + self.orientation);
		if(!self.node){
			self.node = ORYX.Editor.graft("http://www.w3.org/1999/xhtml", self.parent[0],
				['div', { 'class': 'resizer_' + self.orientation, style: 'left:0px; top:0px;position:absolute' }]);
		}else{
			angular.element(self.node)
					.css('left',"0px")
					.css('top',"0px")
					.css('position',"absolute");
		}        

		angular.element(self.node).on(ORYX.CONFIG.EVENT_MOUSEDOWN,self.handleMouseDown.bind(self));

		//self.node.addEventListener(ORYX.CONFIG.EVENT_MOUSEDOWN, self.handleMouseDown.bind(self), true);
		self.parent.on(ORYX.CONFIG.EVENT_MOUSEUP,self.handleMouseUp.bind(self));
		//document.documentElement.addEventListener(ORYX.CONFIG.EVENT_MOUSEUP, self.handleMouseUp.bind(self), true);
		self.parent.on(ORYX.CONFIG.EVENT_MOUSEMOVE,self.handleMouseMove.bind(self));
		//document.documentElement.addEventListener(ORYX.CONFIG.EVENT_MOUSEMOVE, self.handleMouseMove.bind(self), false);

		self.canvasNode = self.facade.getCanvas().node;
		
		self.hide();

		// Calculate the Offset
		self.scrollNode = <any>self.node.parentNode.parentNode.parentNode;
    }

	handleMouseDown(event:Event) {
		var self = this;

		self.dragEnable = true;

		self.offsetScroll = { x: self.scrollNode.scrollLeft, y: self.scrollNode.scrollTop };

		self.offSetPosition = {
			x: (<any>event).pointerX() - self.position.x,
			y: (<any>event).pointerY() - self.position.y
		};

		self.resizeStartCallbacks.forEach(function (value) {
			value(self.bounds);
		});

	}

	handleMouseUp(event) {
		var self = this;
		self.dragEnable = false;
		self.containmentParentNode = null;
		self.resizeEndCallbacks.forEach(function (value) {
			value(self.bounds);
		});

	}

	handleMouseMove(event:Event) {
		var self = this;

		if (!self.dragEnable) { return }

		if ((<any>event).shiftKey || (<any>event).ctrlKey) {
			self.aspectRatio = self.bounds.width() / self.bounds.height();
		} else {
			self.aspectRatio = undefined;
		}

		var position = {
			x: (<any>event).pointerX() - self.offSetPosition.x,
			y: (<any>event).pointerY() - self.offSetPosition.y
		}


		position.x -= self.offsetScroll.x - self.scrollNode.scrollLeft;
		position.y -= self.offsetScroll.y - self.scrollNode.scrollTop;

		position.x = Math.min(position.x, self.facade.getCanvas().bounds.width())
		position.y = Math.min(position.y, self.facade.getCanvas().bounds.height())

		var offset = {
			x: position.x - self.position.x,
			y: position.y - self.position.y
		}

		if (self.aspectRatio) {
			// fixed aspect ratio
			var newAspectRatio = (self.bounds.width() + offset.x) / (self.bounds.height() + offset.y);
			if (newAspectRatio > self.aspectRatio) {
				offset.x = self.aspectRatio * (self.bounds.height() + offset.y) - self.bounds.width();
			} else if (newAspectRatio < self.aspectRatio) {
				offset.y = (self.bounds.width() + offset.x) / self.aspectRatio - self.bounds.height();
			}
		}

		// respect minimum and maximum sizes of stencil
		if (self.orientation === "northwest") {
			if (self.bounds.width() - offset.x > self.maxSize.width) {
				offset.x = -(self.maxSize.width - self.bounds.width());
				if (self.aspectRatio)
					offset.y = self.aspectRatio * offset.x;
			}
			if (self.bounds.width() - offset.x < self.minSize.width) {
				offset.x = -(self.minSize.width - self.bounds.width());
				if (self.aspectRatio)
					offset.y = self.aspectRatio * offset.x;
			}
			if (self.bounds.height() - offset.y > self.maxSize.height) {
				offset.y = -(self.maxSize.height - self.bounds.height());
				if (self.aspectRatio)
					offset.x = offset.y / self.aspectRatio;
			}
			if (self.bounds.height() - offset.y < self.minSize.height) {
				offset.y = -(self.minSize.height - self.bounds.height());
				if (self.aspectRatio)
					offset.x = offset.y / self.aspectRatio;
			}
		} else { // defaults to southeast
			if (self.bounds.width() + offset.x > self.maxSize.width) {
				offset.x = self.maxSize.width - self.bounds.width();
				if (self.aspectRatio)
					offset.y = self.aspectRatio * offset.x;
			}
			if (self.bounds.width() + offset.x < self.minSize.width) {
				offset.x = self.minSize.width - self.bounds.width();
				if (self.aspectRatio)
					offset.y = self.aspectRatio * offset.x;
			}
			if (self.bounds.height() + offset.y > self.maxSize.height) {
				offset.y = self.maxSize.height - self.bounds.height();
				if (self.aspectRatio)
					offset.x = offset.y / self.aspectRatio;
			}
			if (self.bounds.height() + offset.y < self.minSize.height) {
				offset.y = self.minSize.height - self.bounds.height();
				if (self.aspectRatio)
					offset.x = offset.y / self.aspectRatio;
			}
		}

		if (self.orientation === "northwest") {
			var oldLR = { x: self.bounds.lowerRight().x, y: self.bounds.lowerRight().y };
			self.bounds.extend({ x: -offset.x, y: -offset.y });
			self.bounds.moveBy(offset);
		} else { // defaults to southeast
			self.bounds.extend(offset);
		}

		self.update();

		self.resizeCallbacks.forEach(function (value) {
			value(self.bounds);
		});
		event.preventDefault();
		event.stopPropagation();		
	}
	
	registerOnResizeStart(callback) {
		var self = this;
		if (self.resizeStartCallbacks.indexOf(callback)==-1) {
			self.resizeStartCallbacks.push(callback);
		}
	}
	
	unregisterOnResizeStart(callback) {
		var self = this;
		if (self.resizeStartCallbacks.indexOf(callback)>-1) {
			self.resizeStartCallbacks = self.resizeStartCallbacks.filter(function(item) {				
				return item!=callback;
			});
		}
	}

	registerOnResizeEnd(callback) {
		var self = this;
		if (self.resizeEndCallbacks.indexOf(callback)==-1) {
			self.resizeEndCallbacks.push(callback);
		}
	}
	
	unregisterOnResizeEnd(callback) {
		var self = this;
		if (self.resizeEndCallbacks.indexOf(callback)>-1) {
			self.resizeEndCallbacks = self.resizeEndCallbacks.filter(function(item) {				
				return item!=callback;
			});
		}
	}
		
	registerOnResize(callback) {
		var self = this;
		if (self.resizeCallbacks.indexOf(callback)==-1) {
			self.resizeCallbacks.push(callback);
		}
	}

	unregisterOnResize(callback) {
		var self = this;
		if (self.resizeCallbacks.indexOf(callback)>-1) {
			self.resizeCallbacks = self.resizeCallbacks.filter(function(item) {				
				return item!=callback;
			});
		}
	}

	hide() {
		var self = this;
		self.node.style.display = "none";
	}

	show() {
		var self = this;
		if (self.bounds)
			self.node.style.display = "";
	}
	setBounds(bounds, min, max, aspectRatio) {
		var self = this;
		self.bounds = bounds;

		if (!min)
			min = { width: ORYX.CONFIG.MINIMUM_SIZE, height: ORYX.CONFIG.MINIMUM_SIZE };

		if (!max)
			max = { width: ORYX.CONFIG.MAXIMUM_SIZE, height: ORYX.CONFIG.MAXIMUM_SIZE };

		self.minSize = min;
		self.maxSize = max;

		self.aspectRatio = aspectRatio;

		self.update();
	}

	update() {
		var self = this;
		if (!self.bounds) { return; }

		var upL = self.bounds.upperLeft();

		if (self.bounds.width() < self.minSize.width) { self.bounds.set(upL.x, upL.y, upL.x + self.minSize.width, upL.y + self.bounds.height()) };
		if (self.bounds.height() < self.minSize.height) { self.bounds.set(upL.x, upL.y, upL.x + self.bounds.width(), upL.y + self.minSize.height) };
		if (self.bounds.width() > self.maxSize.width) { self.bounds.set(upL.x, upL.y, upL.x + self.maxSize.width, upL.y + self.bounds.height()) };
		if (self.bounds.height() > self.maxSize.height) { self.bounds.set(upL.x, upL.y, upL.x + self.bounds.width(), upL.y + self.maxSize.height) };

		var a = self.canvasNode.getScreenCTM();

		upL.x *= a.a;
		upL.y *= a.d;

		if (self.orientation === "northwest") {
			upL.x -= 13;
			upL.y -= 26;
		} else { // defaults to southeast
			upL.x += (a.a * self.bounds.width()) + 3;
			upL.y += (a.d * self.bounds.height()) + 3;
		}

		self.position = upL;

		self.node.style.left = self.position.x + "px";
		self.node.style.top = self.position.y + "px";
	}
}
export type oryxResizerNodeFactory = ( parent: angular.IAugmentedJQuery,  orientation: string,  facade: any) => any;
oryxResizerNode.$inject = [];
function oryxResizerNode(): oryxResizerNodeFactory {
    return ( parent: angular.IAugmentedJQuery,  orientation: string,  facade: any):any => {
        return new ResizerNode(parent,orientation,facade);
    }
}
angular.module("oryx.resize").factory("oryxResizerNodeFactory",oryxResizerNode);