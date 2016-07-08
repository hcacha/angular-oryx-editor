import * as angular from "angular";
import * as ORYX from "oryx";
import {ISelectedRect, oryxSelectedRectFactory} from "../selected-rect/selected-rect.factory";
import {IGridLine, oryxGridLineFactory} from "../grid-line/grid-line.factory";
import {IResizerNode, oryxResizerNodeFactory} from "../resize/resizer-node.factory";


class ResizeCommand extends ORYX.Core.Command {
    private oldBounds: any;
    constructor(private shape: any,
        private newBounds: any,
        private plugin: IDragDropResize) {
        super();
        this.oldBounds = shape.bounds.clone();
    }
    execute() {
        var self = this;
        self.shape.bounds.set(self.newBounds.a, self.newBounds.b);
        self.update(self.getOffset(self.oldBounds, self.newBounds));

    }
    rollback() {
        var self = this;
        self.shape.bounds.set(self.oldBounds.a, self.oldBounds.b);
        self.update(self.getOffset(self.newBounds, self.oldBounds))
    }

    getOffset(b1: any, b2: any) {
        var self = this;
        return {
            x: b2.a.x - b1.a.x,
            y: b2.a.y - b1.a.y,
            xs: b2.width() / b1.width(),
            ys: b2.height() / b1.height()
        }
    }
    update(offset: any) {
        var self = this;
        self.shape.getLabels().forEach(function (label) {
            label.changed();
        });

        var allEdges = [].concat(self.shape.getIncomingShapes())
            .concat(self.shape.getOutgoingShapes())
            .filter(function (r) {
                return r instanceof ORYX.Core.Edge;
            });

        self.plugin.layoutEdges(self.shape, allEdges, offset);

        self.plugin.facade.setSelection([self.shape]);
        self.plugin.facade.getCanvas().update();
        self.plugin.facade.updateSelection();
    }
}
class DockCommand extends ORYX.Core.Command {
    private newPosition: any;
    private newParent: any;
    private oldPosition: any;
    private oldDockedShape: any;
    private oldParent: any;

    constructor(private docker: any, position: any, private newDockedShape: any, private facade: oryx.IPluginFacade) {
        super();
        this.newPosition = position;
        //self.newDockedShape = newDockedShape;
        this.newParent = newDockedShape.parent || facade.getCanvas();
        this.oldPosition = docker.parent.bounds.center();
        this.oldDockedShape = docker.getDockedShape();
        this.oldParent = docker.parent.parent || facade.getCanvas();

        if (this.oldDockedShape) {
            this.oldPosition = docker.parent.absoluteBounds().center();
        }

    }
    execute() {
        var self = this;
        self.dock(self.newDockedShape, self.newParent, self.newPosition);

        // Raise Event for having the docked shape on top of the other shape
        self.facade.raiseEvent({ type: ORYX.CONFIG.EVENT_ARRANGEMENT_TOP, excludeCommand: true })
    }
    rollback() {
        var self = this;
        self.dock(self.oldDockedShape, self.oldParent, self.oldPosition);
    }
    dock(toDockShape, parent, pos) {
        var self = this;
        // Add to the same parent Shape
        parent.add(self.docker.parent);

        // Set the Docker to the new Shape
        self.docker.setDockedShape(undefined);
        self.docker.bounds.centerMoveTo(pos)
        self.docker.setDockedShape(toDockShape);
        //self.docker.update();

        self.facade.setSelection([self.docker.parent]);
        self.facade.getCanvas().update();
        self.facade.updateSelection();
    }
}
class MoveCommand extends ORYX.Core.Command {
    private newParents: any;
    private oldParents: any;
    private dockedNodes: any;

    constructor(private moveShapes: any,
        private offset: any,
        private parent: any,
        private selectedShapes: any,
        private plugin: IDragDropResize) {
        super();
        // Defines the old/new parents for the particular shape
        this.newParents = moveShapes.map(function (t) {
            return parent || t.parent;
        });
        this.oldParents = moveShapes.map(function (shape) {
            return shape.parent;
        });
        this.dockedNodes = moveShapes.filter(function (shape) {
            return shape instanceof ORYX.Core.Node && shape.dockers.length == 1;
        }).map(function (shape) {
            return {
                docker: shape.dockers[0],
                dockedShape: shape.dockers[0].getDockedShape(),
                refPoint: shape.dockers[0].referencePoint
            }
        });
    }
    execute() {
        var self = this;
        self.dockAllShapes()
        // Moves by the offset
        self.move(self.offset);
        // Addes to the new parents
        self.addShapeToParent(self.newParents);
        // Set the selection to the current selection
        self.selectCurrentShapes();
        self.plugin.facade.getCanvas().update();
        self.plugin.facade.updateSelection();
    }
    rollback() {
        var self = this;
        // Moves by the inverted offset
        var offset = { x: -self.offset.x, y: -self.offset.y };
        self.move(offset);
        // Addes to the old parents
        self.addShapeToParent(self.oldParents);
        self.dockAllShapes(true)

        // Set the selection to the current selection
        self.selectCurrentShapes();
        self.plugin.facade.getCanvas().update();
        self.plugin.facade.updateSelection();

    }
    move(offset: any, doLayout?: any) {
        var self = this;
        // Move all Shapes by these offset
        for (var i = 0; i < self.moveShapes.length; i++) {
            var value = self.moveShapes[i];
            value.bounds.moveBy(offset);

            if (value instanceof ORYX.Core.Node) {

                (value.dockers || []).forEach(function (d) {
                    d.bounds.moveBy(offset);
                });

                var allEdges = [].concat(value.getIncomingShapes())
                    .concat(value.getOutgoingShapes())
                    // Remove all edges which are included in the selection from the list
                    .filter(function (r) {
                        return r instanceof ORYX.Core.Edge &&
                            !self.moveShapes.some(function (d) {
                                return d == r || (d instanceof ORYX.Core.Controls.Docker && d.parent == r);
                            })
                    })
                    // Remove all edges which are between the node and a node contained in the selection from the list
                    .filter(function (r) {
                        return (r.dockers[0].getDockedShape() == value ||
                            !self.moveShapes.include(r.dockers[0].getDockedShape())) &&
                            (r.dockers[r.dockers.length - 1].getDockedShape() == value ||
                                !self.moveShapes.include(r.dockers[r.dockers.length - 1].getDockedShape()));
                    });

                // Layout all outgoing/incoming edges
                self.plugin.layoutEdges(value, allEdges, offset);


                var allSameEdges = [].concat(value.getIncomingShapes())
                    .concat(value.getOutgoingShapes())
                    // Remove all edges which are included in the selection from the list
                    .filter(function (r) {
                        return r instanceof ORYX.Core.Edge &&
                            r.dockers[0].isDocked()
                            && r.dockers[r.dockers.length - 1].isDocked() &&
                            !self.moveShapes.include(r) &&
                            !self.moveShapes.some(function (d) {
                                return d == r || (d instanceof ORYX.Core.Controls.Docker && d.parent == r);
                            });
                    })
                    // Remove all edges which are included in the selection from the list
                    .filter(function (r) {
                        return self.moveShapes.indexOf(r.dockers[0].getDockedShape()) > i
                            || self.moveShapes.indexOf(r.dockers[r.dockers.length - 1].getDockedShape()) > i;
                    });

                for (var j = 0; j < allSameEdges.length; j++) {
                    for (var k = 1; k < allSameEdges[j].dockers.length - 1; k++) {
                        var docker = allSameEdges[j].dockers[k];
                        if (!docker.getDockedShape() && !self.moveShapes.include(docker)) {
                            docker.bounds.moveBy(offset);
                        }
                    }
                }
            }
        }

    }
    dockAllShapes(shouldDocked?: any) {
        // Undock all Nodes
        for (var i = 0; i < this.dockedNodes.length; i++) {
            var docker = this.dockedNodes[i].docker;

            docker.setDockedShape(shouldDocked ? this.dockedNodes[i].dockedShape : undefined)
            if (docker.getDockedShape()) {
                docker.setReferencePoint(this.dockedNodes[i].refPoint);
                //docker.update();
            }
        }
    }

    addShapeToParent(parents: any) {

        // For every Shape, add this and reset the position		
        for (var i = 0; i < this.moveShapes.length; i++) {
            var currentShape = this.moveShapes[i];
            if (currentShape instanceof ORYX.Core.Node &&
                currentShape.parent !== parents[i]) {

                // Calc the new position
                var unul = parents[i].absoluteXY();
                var csul = currentShape.absoluteXY();
                var x = csul.x - unul.x;
                var y = csul.y - unul.y;

                // Add the shape to the new contained shape
                parents[i].add(currentShape);
                // Add all attached shapes as well
                currentShape.getOutgoingShapes((function (shape) {
                    if (shape instanceof ORYX.Core.Node && this.moveShapes.indexOf(shape)==-1) {
                        parents[i].add(shape);
                    }
                }).bind(this));

                // Set the new position
                if (currentShape instanceof ORYX.Core.Node && currentShape.dockers.length == 1) {
                    var b = currentShape.bounds;
                    x += b.width() / 2; y += b.height() / 2
                    currentShape.dockers[0].bounds.centerMoveTo(x, y);
                } else {
                    currentShape.bounds.moveTo(x, y);
                }

            }

            // Update the shape
            //currentShape.update();

        }
    }
    selectCurrentShapes() {
        this.plugin.facade.setSelection(this.selectedShapes);
    }
}
class UndockEdgeCommand extends ORYX.Core.Command {
    private dockers: any;

    constructor(moveShapes) {
        super();
        this.dockers = moveShapes.map(function (shape) { 
            return shape instanceof ORYX.Core.Controls.Docker 
                    ? 
                        { docker: shape, dockedShape: shape.getDockedShape(), refPoint: shape.referencePoint } 
                    : undefined 
        }).filter(function(item){
            return item !=null;
        });
    }
    execute() {
        var self=this;
        self.dockers.forEach(function (el) {
            el.docker.setDockedShape(undefined);
        });
    }
    rollback() {
        var self=this;
        self.dockers.forEach(function (el) {
            el.docker.setDockedShape(el.dockedShape);
            el.docker.setReferencePoint(el.refPoint);
            //el.docker.update();
        });
    }
}


export interface IDragDropResize extends ORYX.IAbstractPlugin {
    handleMouseDown(event, uiObj): void;
    handleMouseUp(event): void;
    handleMouseMove(event): void;
    checkRules(options): void;
    refreshSelectedShapes(): void;
    onResize(bounds): void;
    onResizeStart(): void;
    onResizeEnd(): void;
    beforeDrag(): void;
    hideAllLabels(shape): void;
    afterDrag(): void;
    showAllLabels(shape): void;
    onSelectionChanged(event): void;
    snapToGrid(position): any;
    showGridLine(): void;
    resizeRectangle(bounds): void;
    facade: ORYX.IPluginFacade;
}

class DragDropResize extends ORYX.Core.AbstractPlugin implements IDragDropResize {
    facade: ORYX.IPluginFacade;
    currentShapes: Array<any> = [];			// Current selected Shapes	
    toMoveShapes: Array<any> = [];			// Shapes there will be moved
    distPoints: Array<any> = [];			// Distance Points for Snap on Grid
    isResizing: boolean = false;		// Flag: If there was currently resized
    dragEnable: boolean = false;		// Flag: If Dragging is enabled
    dragIntialized: boolean = false;		// Flag: If the Dragging is initialized
    edgesMovable: boolean = true;			// Flag: If an edge is docked it is not movable
    offSetPosition: any = { x: 0, y: 0 };	// Offset of the Dragging
    faktorXY: any = { x: 1, y: 1 };	// The Current Zoom-Faktor
    containmentParentNode: any;				// the current future parent node for the dragged shapes
    isAddingAllowed: boolean = false;		// flag, if adding current selected shapes to containmentParentNode is allowed
    isAttachingAllowed: boolean = false;		// flag, if attaching to the current shape is allowed
    callbackMouseMove: any;
    callbackMouseUp: any;
    vLine: any;
    hLine: any;
    private scrollNode: any;
    private resizerSE: any;
    private resizerNW: any;
    private dragBounds: any;
    private offsetScroll: any;
    private _onlyEdges: boolean;
    private _currentUnderlyingNodes: Array<any>;
    private oldDragBounds: any;
    private distPointTimeout: any;
    private _undockedEdgesCommand: any;

    constructor(facade: ORYX.IPluginFacade,
        private selectedRect: ISelectedRect,
        private oryxResizerNodeFactory: oryxResizerNodeFactory,
        private oryxGridLineFactory: oryxGridLineFactory,
        private $timeout: angular.ITimeoutService) {
        super(facade);
        // Show grid line if enabled
        this.facade = facade;
        var containerNode;
        if (ORYX.CONFIG.SHOW_GRIDLINE) {
            containerNode = angular.element(this.facade.getCanvas().getSvgContainer());
            this.vLine = oryxGridLineFactory(containerNode, "ver");
            this.hLine = oryxGridLineFactory(containerNode, "hor");
        }
        containerNode = angular.element(this.facade.getCanvas().getHTMLContainer());

        this.resizerSE = oryxResizerNodeFactory(containerNode, "southeast", this.facade);
        this.resizerNW = oryxResizerNodeFactory(containerNode, "northwest", this.facade);
        this.init();

    }
    private init = (): void => {
        var self = this;
        self.callbackMouseMove = self.handleMouseMove.bind(self);
        self.callbackMouseUp = self.handleMouseUp.bind(self);


        self.scrollNode = self.facade.getCanvas().rootNode.parentNode.parentNode;

        // Create the southeastern button for resizing

        self.resizerSE.registerOnResize(self.onResize.bind(self)); // register the resize callback
        self.resizerSE.registerOnResizeEnd(self.onResizeEnd.bind(self)); // register the resize end callback
        self.resizerSE.registerOnResizeStart(self.onResizeStart.bind(self)); // register the resize start callback

        // Create the northwestern button for resizing		
        self.resizerNW.registerOnResize(self.onResize.bind(self)); // register the resize callback
        self.resizerNW.registerOnResizeEnd(self.onResizeEnd.bind(self)); // register the resize end callback
        self.resizerNW.registerOnResizeStart(self.onResizeStart.bind(self)); // register the resize start callback

        // For the Drag and Drop
        // Register on MouseDown-Event on a Shape
        self.facade.registerOnEvent(ORYX.CONFIG.EVENT_MOUSEDOWN, self.handleMouseDown.bind(self));
    }

	/**
	 * On Mouse Down
	 *
	 */
    handleMouseDown(event, uiObj): void {
        var self = this;

        // If the selection Bounds not intialized and the uiObj is not member of current selectio
        // then return
        if (!self.dragBounds || self.currentShapes.indexOf(uiObj) == -1 || !self.toMoveShapes.length) {
            return;
        }

        // Start Dragging
        self.dragEnable = true;
        self.dragIntialized = true;
        self.edgesMovable = true;

        // Calculate the current zoom factor
        var a = self.facade.getCanvas().node.getScreenCTM();
        self.faktorXY.x = a.a;
        self.faktorXY.y = a.d;

        // Set the offset position of dragging
        var upL = self.dragBounds.upperLeft();
        self.offSetPosition = {
            x: (<any>event).pointerX() - (upL.x * self.faktorXY.x),
            y: (<any>event).pointerY() - (upL.y * self.faktorXY.y)
        };

        self.offsetScroll = { x: self.scrollNode.scrollLeft, y: self.scrollNode.scrollTop };

        // Register on Global Mouse-MOVE Event
		//document.documentElement.addEventListener(ORYX.CONFIG.EVENT_MOUSEMOVE, this.callbackMouseMove, false);	
		// Register on Global Mouse-UP Event
		//document.documentElement.addEventListener(ORYX.CONFIG.EVENT_MOUSEUP, this.callbackMouseUp, true);			

        // // Register on Global Mouse-MOVE Event
        // //document.documentElement.addEventListener(ORYX.CONFIG.EVENT_MOUSEMOVE, self.callbackMouseMove, false);
        var containerNode = angular.element(self.facade.getCanvas().getHTMLContainer());
        containerNode.on(ORYX.CONFIG.EVENT_MOUSEMOVE, self.callbackMouseMove);
        // // Register on Global Mouse-UP Event
        // document.documentElement.addEventListener(ORYX.CONFIG.EVENT_MOUSEUP, self.callbackMouseUp, true);
        containerNode.on(ORYX.CONFIG.EVENT_MOUSEUP, self.callbackMouseUp);
        // //self.facade.getCanvas().getHTMLContainer().addEventListener(ORYX.CONFIG.EVENT_MOUSEUP, self.callbackMouseUp, true);
        
    }

	/**
	 * On Key Mouse Up
	 *
	 */
    handleMouseUp(event): void {
        var self = this;
        //disable containment highlighting
        self.facade.raiseEvent({
            type: ORYX.CONFIG.EVENT_HIGHLIGHT_HIDE,
            highlightId: "dragdropresize.contain"
								});

        self.facade.raiseEvent({
            type: ORYX.CONFIG.EVENT_HIGHLIGHT_HIDE,
            highlightId: "dragdropresize.attached"
								});

        // If Dragging is finished
        if (self.dragEnable) {

            // and update the current selection
            if (!self.dragIntialized) {

                // Do Method after Dragging
                self.afterDrag();

                // Check if the Shape is allowed to dock to the other Shape						
                if (self.isAttachingAllowed &&
                    self.toMoveShapes.length == 1 && self.toMoveShapes[0] instanceof ORYX.Core.Node &&
                    self.toMoveShapes[0].dockers.length > 0) {

                    // Get the position and the docker					
                    var position = self.facade.eventCoordinates(event);
                    var docker = self.toMoveShapes[0].dockers[0];

                    //Command-Pattern for dragging several Shapes
                    // // Instanziate the dockCommand
                    var commands = [new DockCommand(docker, position, self.containmentParentNode, self.facade)];
                    self.facade.executeCommands(commands);

                    // Check if adding is allowed to the other Shape	
                } else if (self.isAddingAllowed) {


                    // Refresh all Shapes --> Set the new Bounds
                    self.refreshSelectedShapes();

                }

                self.facade.updateSelection();

                //self.currentShapes.each(function(shape) {shape.update()})
                // Raise Event: Dragging is finished
                self.facade.raiseEvent({ type: ORYX.CONFIG.EVENT_DRAGDROP_END });
            }

            if (self.vLine)
                self.vLine.hide();
            if (self.hLine)
                self.hLine.hide();
        }

        // Disable 
        self.dragEnable = false;

        // UnRegister on Global Mouse-UP/-Move Event
        // document.documentElement.removeEventListener(ORYX.CONFIG.EVENT_MOUSEUP, self.callbackMouseUp, true);
        var containerNode = angular.element(self.facade.getCanvas().getHTMLContainer());
        containerNode.off(ORYX.CONFIG.EVENT_MOUSEUP, self.callbackMouseUp);
        // ((self.facade.getCanvas().getHTMLContainer().removeEventListener(ORYX.CONFIG.EVENT_MOUSEUP, self.callbackMouseUp, true);
        containerNode.off(ORYX.CONFIG.EVENT_MOUSEMOVE, self.callbackMouseMove);

        // document.documentElement.removeEventListener(ORYX.CONFIG.EVENT_MOUSEUP, this.callbackMouseUp, true);	
		// document.documentElement.removeEventListener(ORYX.CONFIG.EVENT_MOUSEMOVE, this.callbackMouseMove, false);				
    }

	/**
	* On Key Mouse Move
	*
	*/
    handleMouseMove(event): void {
        var self = this;
        // If dragging is not enabled, go return
        if (!self.dragEnable) { return; }
        // If Dragging is initialized
        if (self.dragIntialized) {
            // Raise Event: Drag will be started
            self.facade.raiseEvent({ type: ORYX.CONFIG.EVENT_DRAGDROP_START });
            self.dragIntialized = false;

            // And hide the resizers and the highlighting
            self.resizerSE.hide();
            self.resizerNW.hide();

            // if only edges are selected, containmentParentNode must be the canvas
            self._onlyEdges = self.currentShapes.every(function (currentShape) {
                return (currentShape instanceof ORYX.Core.Edge);
            });

            //			/* If only edges are selected, check if they are movable. An Edge is
            //			 * movable in case it is not docked
            //			 */
            //			if(self._onlyEdges) {
            //				self.currentShapes.each(function(edge) {
            //					if(edge.isDocked()) {
            //						self.edgesMovable = false;
            //						throw $break;
            //					}
            //				}.bind(self));
            //			}

            // Do method before Drag
            self.beforeDrag();

            self._currentUnderlyingNodes = [];

        }


        // Calculate the new position
        var position = {
            x: (<any>event).pointerX() - self.offSetPosition.x,
            y: (<any>event).pointerY() - self.offSetPosition.y
        }

        position.x -= self.offsetScroll.x - self.scrollNode.scrollLeft;
        position.y -= self.offsetScroll.y - self.scrollNode.scrollTop;

        // If not the Control-Key are pressed
        var modifierKeyPressed = event.shiftKey || event.ctrlKey;
        if (ORYX.CONFIG.GRID_ENABLED && !modifierKeyPressed) {
            // Snap the current position to the nearest Snap-Point
            position = self.snapToGrid(position);
        } else {
            if (self.vLine)
                self.vLine.hide();
            if (self.hLine)
                self.hLine.hide();
        }

        // Adjust the point by the zoom faktor 
        position.x /= self.faktorXY.x;
        position.y /= self.faktorXY.y;

        // Set that the position is not lower than zero
        position.x = Math.max(0, position.x)
        position.y = Math.max(0, position.y)

        // Set that the position is not bigger than the canvas
        var c = self.facade.getCanvas();
        position.x = Math.min(c.bounds.width() - self.dragBounds.width(), position.x)
        position.y = Math.min(c.bounds.height() - self.dragBounds.height(), position.y)


        // Drag self bounds
        self.dragBounds.moveTo(position);

        // Update all selected shapes and the selection rectangle
        //self.refreshSelectedShapes();
        self.resizeRectangle(self.dragBounds);

        self.isAttachingAllowed = false;

        //check, if a node can be added to the underlying node
        var underlyingNodes = self.facade.getCanvas().getAbstractShapesAtPosition(self.facade.eventCoordinates(event));

        var checkIfAttachable = self.toMoveShapes.length == 1 && self.toMoveShapes[0] instanceof ORYX.Core.Node && self.toMoveShapes[0].dockers.length > 0
        checkIfAttachable = checkIfAttachable && underlyingNodes.length != 1


        if (!checkIfAttachable &&
            underlyingNodes.length === self._currentUnderlyingNodes.length &&
            underlyingNodes.every(function (node, index) {
                return self._currentUnderlyingNodes[index] === node;
            })) {

            return

        } else if (self._onlyEdges) {

            self.isAddingAllowed = true;
            self.containmentParentNode = self.facade.getCanvas();

        } else {

            /* Check the containment and connection rules */
            var options = {
                event: event,
                underlyingNodes: underlyingNodes,
                checkIfAttachable: checkIfAttachable
            };
            self.checkRules(options);

        }

        self._currentUnderlyingNodes = underlyingNodes.reverse();

        //visualize the containment result
        if (self.isAttachingAllowed) {

            self.facade.raiseEvent({
                type: ORYX.CONFIG.EVENT_HIGHLIGHT_SHOW,
                highlightId: "dragdropresize.attached",
                elements: [self.containmentParentNode],
                style: ORYX.CONFIG.SELECTION_HIGHLIGHT_STYLE_RECTANGLE,
                color: ORYX.CONFIG.SELECTION_VALID_COLOR
            });

        } else {

            self.facade.raiseEvent({
                type: ORYX.CONFIG.EVENT_HIGHLIGHT_HIDE,
                highlightId: "dragdropresize.attached"
            });
        }

        if (!self.isAttachingAllowed) {
            if (self.isAddingAllowed) {

                self.facade.raiseEvent({
                    type: ORYX.CONFIG.EVENT_HIGHLIGHT_SHOW,
                    highlightId: "dragdropresize.contain",
                    elements: [self.containmentParentNode],
                    color: ORYX.CONFIG.SELECTION_VALID_COLOR
                });

            } else {

                self.facade.raiseEvent({
                    type: ORYX.CONFIG.EVENT_HIGHLIGHT_SHOW,
                    highlightId: "dragdropresize.contain",
                    elements: [self.containmentParentNode],
                    color: ORYX.CONFIG.SELECTION_INVALID_COLOR
                });

            }
        } else {
            self.facade.raiseEvent({
                type: ORYX.CONFIG.EVENT_HIGHLIGHT_HIDE,
                highlightId: "dragdropresize.contain"
            });
        }

        // Stop the Event
        //Event.stop(event);
        return;
    }

    //	/**
    //	 * Rollbacks the docked shape of an edge, if the edge is not movable.
    //	 */
    //	redockEdges() {
    //		self._undockedEdgesCommand.dockers.each(function(el){
    //			el.docker.setDockedShape(el.dockedShape);
    //			el.docker.setReferencePoint(el.refPoint);
    //		})
    //	},

	/**
	 *  Checks the containment and connection rules for the selected shapes.
	 */
    checkRules(options): void {
        var self = this;

        var event = options.event;
        var underlyingNodes = options.underlyingNodes;
        var checkIfAttachable = options.checkIfAttachable;
        var noEdges = options.noEdges;

        //get underlying node that is not the same than one of the currently selected shapes or
        // a child of one of the selected shapes with the highest z Order.
        // The result is a shape or the canvas
        self.containmentParentNode = underlyingNodes.reverse().find(function (node) {
            return (node instanceof ORYX.Core.Canvas) ||
                (((node instanceof ORYX.Core.Node) || ((node instanceof ORYX.Core.Edge) && !noEdges))
                    && (!(self.currentShapes.indexOf(node) > -1 ||
                        self.currentShapes.some(function (shape) {
                            return (shape.children.length > 0 && shape.getChildNodes(true).indexOf(node)>-1);
                        }))));
        });

        if (checkIfAttachable && self.containmentParentNode) {

            self.isAttachingAllowed = self.facade.getRules().canConnect({
                sourceShape: self.containmentParentNode,
                edgeShape: self.toMoveShapes[0],
                targetShape: self.toMoveShapes[0]
												});

            if (self.isAttachingAllowed) {
                var point = self.facade.eventCoordinates(event);
                self.isAttachingAllowed = self.containmentParentNode.isPointOverOffset(point.x, point.y);
            }
        }

        if (!self.isAttachingAllowed) {
            //check all selected shapes, if they can be added to containmentParentNode
            self.isAddingAllowed = self.toMoveShapes.every(function (currentShape) {
                if (currentShape instanceof ORYX.Core.Edge ||
                    currentShape instanceof ORYX.Core.Controls.Docker ||
                    self.containmentParentNode === currentShape.parent) {
                    return true;
                } else if (self.containmentParentNode !== currentShape) {

                    if (!(self.containmentParentNode instanceof ORYX.Core.Edge) || !noEdges) {

                        if (self.facade.getRules().canContain({
                            containingShape: self.containmentParentNode,
                            containedShape: currentShape
                        })) {
                            return true;
                        }
                    }
                }
                return false;
            });
        }

        if (!self.isAttachingAllowed && !self.isAddingAllowed &&
            (self.containmentParentNode instanceof ORYX.Core.Edge)) {
            options.noEdges = true;
            options.underlyingNodes.reverse();
            self.checkRules(options);
        }
    }

	/**
	 * Redraw the selected Shapes.
	 *
	 */
    refreshSelectedShapes(): void {
        var self = this;
        // If the selection bounds not initialized, return
        if (!self.dragBounds) { return }

        // Calculate the offset between the bounds and the old bounds
        var upL = self.dragBounds.upperLeft();
        var oldUpL = self.oldDragBounds.upperLeft();
        var offset = {
            x: upL.x - oldUpL.x,
            y: upL.y - oldUpL.y
        };

        // // Instanciate the dragCommand
        var commands = [new MoveCommand(self.toMoveShapes, offset, self.containmentParentNode, self.currentShapes, self)];

        // If the undocked edges command is setted, add this command
        if (self._undockedEdgesCommand instanceof ORYX.Core.Command) {
            commands.unshift(self._undockedEdgesCommand);
        }

        // // Execute the commands			
        self.facade.executeCommands(commands);

        // copy the bounds to the old bounds
        if (self.dragBounds)
            self.oldDragBounds = self.dragBounds.clone();

    }

	/**
	 * Callback for Resize
	 *
	 */
    onResize(bounds): void {
        var self = this;
        // If the selection bounds not initialized, return
        if (!self.dragBounds) { return }

        self.dragBounds = bounds;
        self.isResizing = true;

        // Update the rectangle 
        self.resizeRectangle(self.dragBounds);
    }

    onResizeStart(): void {
        var self = this;
        self.facade.raiseEvent({ type: ORYX.CONFIG.EVENT_RESIZE_START });
    }

    onResizeEnd(): void {
        var self = this;
        if (!(self.currentShapes instanceof Array) || self.currentShapes.length <= 0) {
            return;
        }
        // If Resizing finished, the Shapes will be resize
        if (self.isResizing) {

            var bounds = self.dragBounds.clone();
            var shape = self.currentShapes[0];

            if (shape.parent) {
                var parentPosition = shape.parent.absoluteXY();
                bounds.moveBy(-parentPosition.x, -parentPosition.y);
            }

            var command = new ResizeCommand(shape, bounds, self);
            self.facade.executeCommands([command]);
            self.isResizing = false;
            self.facade.raiseEvent({ type: ORYX.CONFIG.EVENT_RESIZE_END });
        }
    }


	/**
	 * Prepare the Dragging
	 *
	 */
    beforeDrag(): void {
        var self = this;

        // var undockEdgeCommand = ORYX.Core.Command.extend({
        //     construct(moveShapes) {
        //         self.dockers = moveShapes.collect(function (shape) { return shape instanceof ORYX.Core.Controls.Docker ? { docker: shape, dockedShape: shape.getDockedShape(), refPoint: shape.referencePoint } : undefined }).compact();
        //     },
        //     execute() {
        //         self.dockers.each(function (el) {
        //             el.docker.setDockedShape(undefined);
        //         })
        //     },
        //     rollback() {
        //         self.dockers.each(function (el) {
        //             el.docker.setDockedShape(el.dockedShape);
        //             el.docker.setReferencePoint(el.refPoint);
        //             //el.docker.update();
        //         })
        //     }
        // });

        self._undockedEdgesCommand = new UndockEdgeCommand(self.toMoveShapes);
        self._undockedEdgesCommand.execute();

    }

    hideAllLabels(shape): void {
        var self = this;
        // Hide all labels from the shape
        shape.getLabels().forEach(function (label) {
            label.hide();
        });
        // Hide all labels from docked shapes
        shape.getAllDockedShapes().forEach(function (dockedShape) {
            var labels = dockedShape.getLabels();
            if (labels.length > 0) {
                labels.forEach(function (label) {
                    label.hide();
                });
            }
        });

        // Do self recursive for all child shapes
        // EXP-NICO use getShapes
        shape.getChildren().forEach(function (value) {
            if (value instanceof ORYX.Core.Shape)
                self.hideAllLabels(value);
        });
    }

	/**
	 * Finished the Dragging
	 *
	 */
    afterDrag(): void {

    }

	/**
	 * Show all Labels at these shape
	 * 
	 */
    showAllLabels(shape): void {
        var self = this;
        // Show the label of these shape
        //shape.getLabels().each(function(label) {
        for (var i = 0; i < shape.length; i++) {
            var label = shape[i];
            label.show();
        }//);
        // Show all labels at docked shapes
        //shape.getAllDockedShapes().each(function(dockedShape) {
        var allDockedShapes = shape.getAllDockedShapes()
        for (var i = 0; i < allDockedShapes.length; i++) {
            var dockedShape = allDockedShapes[i];
            var labels = dockedShape.getLabels();
            if (labels.length > 0) {
                labels.forEach(function (label) {
                    label.show();
                });
            }
        }//);

        // Do self recursive
        //shape.children.each((function(value) {
        for (var i = 0; i < shape.children.length; i++) {
            var value = shape.children[i];
            if (value instanceof ORYX.Core.Shape)
                self.showAllLabels(value);
        }//).bind(self));
    }

	/**
	 * Intialize Method, if there are new Plugins
	 *
	 */
	/*registryChanged(pluginsData) {
		// Save all new Plugin, sorted by group and index
		self.pluginsData = pluginsData.sortBy( function(value) {
			return (value.group + "" + value.index);
		});
	},*/

	/**
	 * On the Selection-Changed
	 *
	 */
    onSelectionChanged(event): void {
        var self = this;
        var elements = event.elements;

        // Reset the drag-variables
        self.dragEnable = false;
        self.dragIntialized = false;
        self.resizerSE.hide();
        self.resizerNW.hide();

        // If there is no elements
        if (!elements || elements.length == 0) {
            // Hide all things and reset all variables
            self.selectedRect.hide();
            self.currentShapes = [];
            self.toMoveShapes = [];
            self.dragBounds = undefined;
            self.oldDragBounds = undefined;
        } else {

            // Set the current Shapes
            self.currentShapes = elements;

            // Get all shapes with the highest parent in object hierarchy (canvas is the top most parent)
            var topLevelElements = self.facade.getCanvas().getShapesWithSharedParent(elements);
            self.toMoveShapes = topLevelElements;

            self.toMoveShapes = self.toMoveShapes.filter(function (shape) {
                return shape instanceof ORYX.Core.Node &&
                    (shape.dockers.length === 0 || elements.indexOf(shape.dockers[0].getDockedShape())==-1)
            });

            elements.forEach(function (shape) {
                if (!(shape instanceof ORYX.Core.Edge)) { return }

                var dks = shape.getDockers()

                var firstDockedShape = dks && dks.length ? dks[0].getDockedShape() : null;
                var lastDockedShape = dks && dks.length ? dks[dks.length - 1].getDockedShape() : null;

                var hasF = firstDockedShape ? elements.indexOf(firstDockedShape) : -1;
                var hasL = lastDockedShape ? elements.indexOf(lastDockedShape) : -1;

                /* Enable movement of undocked edges */
                if (hasF == -1 && hasL == -1) {
                    var isUndocked = !firstDockedShape && !lastDockedShape
                    if (isUndocked) {
                        self.toMoveShapes = self.toMoveShapes.concat(dks);
                    }
                }

                if (shape.dockers.length > 2 && hasF > -1 && hasL > -1) {
                    self.toMoveShapes = self.toMoveShapes.concat(dks.filter(function (el, index) { return index > 0 && index < dks.length - 1 }))
                }

            });

            // Calculate the new area-bounds of the selection
            var newBounds = undefined;
            self.toMoveShapes.forEach(function (value) {
                var shape = value;
                if (value instanceof ORYX.Core.Controls.Docker) {
                    /* Get the Shape */
                    shape = value.parent;
                }

                if (!newBounds) {
                    newBounds = shape.absoluteBounds();
                }
                else {
                    newBounds.include(shape.absoluteBounds());
                }
            });

            if (!newBounds) {
                elements.forEach(function (value) {
                    if (!newBounds) {
                        newBounds = value.absoluteBounds();
                    } else {
                        newBounds.include(value.absoluteBounds());
                    }
                });
            }

            // Set the new bounds
            self.dragBounds = newBounds;
            self.oldDragBounds = newBounds.clone();

            // Update and show the rectangle
            self.resizeRectangle(newBounds);
            self.selectedRect.show();

            // Show the resize button, if there is only one element and self is resizeable
            if (elements.length == 1 && elements[0].isResizable) {
                var aspectRatio = elements[0].getStencil().fixedAspectRatio() ? elements[0].bounds.width() / elements[0].bounds.height() : undefined;
                self.resizerSE.setBounds(self.dragBounds, elements[0].minimumSize, elements[0].maximumSize, aspectRatio);
                self.resizerSE.show();
                self.resizerNW.setBounds(self.dragBounds, elements[0].minimumSize, elements[0].maximumSize, aspectRatio);
                self.resizerNW.show();
            } else {
                self.resizerSE.setBounds(undefined);
                self.resizerNW.setBounds(undefined);
            }

            // If Snap-To-Grid is enabled, the Snap-Point will be calculate
            if (ORYX.CONFIG.GRID_ENABLED) {

                // Reset all points
                self.distPoints = [];

                if (self.distPointTimeout)
                    self.$timeout.cancel(self.distPointTimeout);
                //window.clearTimeout(self.distPointTimeout)

                self.distPointTimeout = self.$timeout(function () {
                    // Get all the shapes, there will consider at snapping
                    // Consider only those elements who shares the same parent element
                    var distShapes = self.facade.getCanvas().getChildShapes(true).filter(function (value) {
                        var parentShape = value.parent;
                        while (parentShape) {
                            if (elements.indexOf(parentShape) > -1) return false;
                            parentShape = parentShape.parent
                        }
                        return true;
                    })

                    // The current selection will delete from self array
                    //elements.each(function(shape) {
                    //	distShapes = distShapes.without(shape);
                    //});

                    // For all these shapes
                    distShapes.forEach(function (value) {
                        if (!(value instanceof ORYX.Core.Edge)) {
                            var ul = value.absoluteXY();
                            var width = value.bounds.width();
                            var height = value.bounds.height();

                            // Add the upperLeft, center and lowerRight - Point to the distancePoints
                            self.distPoints.push({
                                ul: {
                                    x: ul.x,
                                    y: ul.y
                                },
                                c: {
                                    x: ul.x + (width / 2),
                                    y: ul.y + (height / 2)
                                },
                                lr: {
                                    x: ul.x + width,
                                    y: ul.y + height
                                }
                            });
                        }
                    });

                }, 10);

            }
        }
    }

	/**
	 * Adjust an Point to the Snap Points
	 *
	 */
    snapToGrid(position): any {
        var self = this;

        // Get the current Bounds
        var bounds = self.dragBounds;

        var point = {};

        var ulThres = 6;
        var cThres = 10;
        var lrThres = 6;

        var scale = self.vLine ? self.vLine.getScale() : 1;

        var ul = { x: (position.x / scale), y: (position.y / scale) };
        var c = { x: (position.x / scale) + (bounds.width() / 2), y: (position.y / scale) + (bounds.height() / 2) };
        var lr = { x: (position.x / scale) + (bounds.width()), y: (position.y / scale) + (bounds.height()) };

        var offsetX, offsetY;
        var gridX, gridY;

        // For each distant point
        self.distPoints.forEach(function (value) {

            var x, y, gx, gy;
            if (Math.abs(value.c.x - c.x) < cThres) {
                x = value.c.x - c.x;
                gx = value.c.x;
            }/* else if (Math.abs(value.ul.x-ul.x) < ulThres){
				x = value.ul.x-ul.x;
				gx = value.ul.x;
			} else if (Math.abs(value.lr.x-lr.x) < lrThres){
				x = value.lr.x-lr.x;
				gx = value.lr.x;
			} */


            if (Math.abs(value.c.y - c.y) < cThres) {
                y = value.c.y - c.y;
                gy = value.c.y;
            }/* else if (Math.abs(value.ul.y-ul.y) < ulThres){
				y = value.ul.y-ul.y;
				gy = value.ul.y;
			} else if (Math.abs(value.lr.y-lr.y) < lrThres){
				y = value.lr.y-lr.y;
				gy = value.lr.y;
			} */

            if (x !== undefined) {
                offsetX = offsetX === undefined ? x : (Math.abs(x) < Math.abs(offsetX) ? x : offsetX);
                if (offsetX === x)
                    gridX = gx;
            }

            if (y !== undefined) {
                offsetY = offsetY === undefined ? y : (Math.abs(y) < Math.abs(offsetY) ? y : offsetY);
                if (offsetY === y)
                    gridY = gy;
            }
        });


        if (offsetX !== undefined) {
            ul.x += offsetX;
            ul.x *= scale;
            if (self.vLine && gridX)
                self.vLine.update(gridX);
        } else {
            ul.x = (position.x - (position.x % (ORYX.CONFIG.GRID_DISTANCE / 2)));
            if (self.vLine)
                self.vLine.hide()
        }

        if (offsetY !== undefined) {
            ul.y += offsetY;
            ul.y *= scale;
            if (self.hLine && gridY)
                self.hLine.update(gridY);
        } else {
            ul.y = (position.y - (position.y % (ORYX.CONFIG.GRID_DISTANCE / 2)));
            if (self.hLine)
                self.hLine.hide();
        }

        return ul;
    }

    showGridLine(): void {

    }
	/**
	 * Redraw of the Rectangle of the SelectedArea
	 * @param {Object} bounds
	 */
    resizeRectangle(bounds): void {
        var self = this;
        // Resize the Rectangle
        self.selectedRect.resize(bounds);
    }
}

export type oryxDragDropResizeFactory = (facade: any) => any;
oryxDragDropResize.$inject = ["oryxSelectedRectFactory", "oryxResizerNodeFactory", "oryxGridLineFactory", "$timeout"];
function oryxDragDropResize(oryxSelectedRectFactory: oryxSelectedRectFactory,
    oryxResizerNodeFactory: oryxResizerNodeFactory,
    oryxGridLineFactory: oryxGridLineFactory,
    $timeout: angular.ITimeoutService): oryxDragDropResizeFactory {
    return (facade: any): any => {

        return new DragDropResize(facade,
            oryxSelectedRectFactory(angular.element(facade.getCanvas().getSvgContainer())),
            oryxResizerNodeFactory,
            oryxGridLineFactory,
            $timeout
        );
    }
}
angular.module("oryx.dragDrop").factory("oryxDragDropResizeFactory", oryxDragDropResize);
