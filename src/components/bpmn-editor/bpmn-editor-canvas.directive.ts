import * as angular from "angular";
import * as ORYX from "oryx";
import {oryxBpmnEditorFactory} from './bpmn-editor-oryx.factory';
import {oryxAddShapeCommandFactory} from './bpmn-editor-add-shape-command.factory';
import {IBpmnEditorPropertyConfigService, IProperty} from './bpmn-editor-property-config.provider';
import {oryxUpdatePropertyCommandFactory} from './bpmn-editor-update-property-command.factory';

export interface IBpmnEditorCanvasController {
    reloadModel($element: angular.IAugmentedJQuery,
        modelData: any,
        stencilSetData: any): void;
    getCanvas(): any;
    onDropComplete($event: any, $data: any): void;
    getModelMetaData();
    updatePropertyShape(selectedItemShape: ISelectedItemShape,property:any): any;
    dispose():void;
}
export interface ISelectedItemProperty {
    key: string;
    title: string;
    description: string;
    type: string;
    mode: string;
    hidden: boolean;
    value: any;
    readModeTemplateUrl: string;
    writeModeTemplateUrl: string;
    templateUrl: string;
    hasReadWriteMode: boolean;
    noValue: boolean;
    modal?: boolean;
    controllerAs?: string;
    controller?: string;
}
export interface ISelectedItemShape {
    title: string;
    properties: Array<ISelectedItemProperty>;
    auditData: any;
}
@angular.typescript.decorators.inject("oryxBpmnEditorFactory",
    "oryxAddShapeCommandFactory",
    "$scope",
    "oryxBpmnPropertyConfigService",
    "oryxUpdatePropertyCommandFactory")
class BpmnEditorCanvasController implements IBpmnEditorCanvasController {
    private modelData: any;
    private stencilSetData: any;
    private oryxEditor: ORYX.IEditor;
    private selectedShape:ORYX.IShape;

    constructor(private oryxBpmnEditorFactory: oryxBpmnEditorFactory,
        private oryxAddShapeCommandFactory: oryxAddShapeCommandFactory,
        private $scope: angular.IScope,
        private oryxBpmnPropertyConfigService: IBpmnEditorPropertyConfigService,
        private oryxUpdatePropertyCommandFactory: oryxUpdatePropertyCommandFactory) {
        this.createInstanceEditor();
    }
    private init = (): void => {
        var self = this;
        // self.$scope.$on('$destroy',function() {
        //    self.modelData=null;
        //    self.stencilSetData=null;
        //    self=null;
        // });
    }
    //privates
    private createInstanceEditor = ($element?: angular.IAugmentedJQuery): void => {
        var self = this;
        if (!self.oryxEditor && self.stencilSetData && self.modelData) {
            self.oryxEditor = self.oryxBpmnEditorFactory(self.stencilSetData, self.modelData, {
                parentNode: $element && $element.length ? $element[0] : null
            });
            self.oryxEditor.registerOnEvent(ORYX.CONFIG.EVENT_SELECTION_CHANGED, self.selectionShapeChanged);
        }
    }
    private getAdditionalIEZoom = (): number => {
        var self = this;
        var additionalIEZoom = 1;
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            var ua = navigator.userAgent;
            if (ua.indexOf('MSIE') >= 0) {
                //IE 10 and below
                var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100);
                if (zoom !== 100) {
                    additionalIEZoom = zoom / 100
                }
            }
        }
        return additionalIEZoom;
    }
    private getStencilItemById = (stencilItemId: string): any => {
        var self = this;
        return self.stencilSetData.stencils.find(function (stencil: any) {
            self.convertStencilId(stencil.id) == stencilItemId;
        });
    }
    private convertStencilId = (stencilItemId: string): string => {
        var self = this;
        if (angular.isString(stencilItemId) && stencilItemId.indexOf("http") > -1) {
            var deli = stencilItemId.lastIndexOf("#");
            if (deli > -1) {
                return stencilItemId.substring(deli + 1);
            }
        }
        return stencilItemId;
    }
    private getParentCandidateShape = (ev: any, id: any, stencilItem: any): any => {
        var self = this;
        var parentCandidate = null;
        var coord = self.oryxEditor.eventCoordinates({ clientX: ev.pageX, clientY: ev.pageY });
        var additionalIEZoom = self.getAdditionalIEZoom();
        if (additionalIEZoom !== 1) {
            coord.x = coord.x / additionalIEZoom;
            coord.y = coord.y / additionalIEZoom;
        }
        var aShapes = self.oryxEditor.getCanvas().getAbstractShapesAtPosition(coord);
        if (aShapes.length <= 0) {
            return parentCandidate;
        }
        if (aShapes.length == 1 && aShapes[0] instanceof ORYX.Core.Canvas) {
            if (id === 'Lane' || id === 'BoundaryErrorEvent' || id === 'BoundaryMessageEvent' ||
                id === 'BoundarySignalEvent' || id === 'BoundaryTimerEvent' ||
                id === 'BoundaryCancelEvent' || id === 'BoundaryCompensationEvent') {
                return parentCandidate;
            } else {
                parentCandidate = aShapes[0];
                return parentCandidate;
            }
        } else {
            parentCandidate = aShapes.reverse().find(function (candidate) {
                return (candidate instanceof ORYX.Core.Canvas
                    || candidate instanceof ORYX.Core.Node
                    || candidate instanceof ORYX.Core.Edge);
            });
            if (!parentCandidate) {
                return parentCandidate;
            }
            if (stencilItem.type === "node") {
                var parentStencilId = parentCandidate.getStencil().id();
                var canContain: boolean = false;
                var parentItem = self.getStencilItemById(parentCandidate.getStencil().idWithoutNs());
                if (parentItem.roles.indexOf("Activity") > -1) {
                    if (stencilItem.roles.indexOf("IntermediateEventOnActivityBoundary") > -1) {
                        canContain = true;
                    }
                }
                else if (parentCandidate.getStencil().idWithoutNs() === 'Pool') {
                    if (stencilItem.id === 'Lane') {
                        canContain = true;
                    }
                }
                if (canContain) {
                    // $scope.editor.handleEvents({
                    //     type: ORYX.CONFIG.EVENT_HIGHLIGHT_SHOW,
                    //     highlightId: "shapeRepo.attached",
                    //     elements: [parentCandidate],
                    //     style: ORYX.CONFIG.SELECTION_HIGHLIGHT_STYLE_RECTANGLE,
                    //     color: ORYX.CONFIG.SELECTION_VALID_COLOR
                    // });

                    // $scope.editor.handleEvents({
                    //     type: ORYX.CONFIG.EVENT_HIGHLIGHT_HIDE,
                    //     highlightId: "shapeRepo.added"
                    // });
                }
                else {
                    for (var i = 0; i < self.stencilSetData.rules.containmentRules.length; i++) {
                        var rule = self.stencilSetData.rules.containmentRules[i];
                        if (rule.role === parentItem.id) {
                            for (var j = 0; j < rule.contains.length; j++) {
                                if (stencilItem.roles.indexOf(rule.contains[j]) > -1) {
                                    canContain = true;
                                    break;
                                }
                            }
                            if (canContain) {
                                break;
                            }
                        }
                    }
                    if (!canContain) parentCandidate = null;
                }
                return parentCandidate;
            }
        }
        return parentCandidate;
    }
    private selectionShapeChanged = (event: any): void => {
        var selectedItem: ISelectedItemShape = null;
        self.selectedShape=null;
        var self = this;
        var shapes = event.elements;
        var canvasSelected = false;
        if (shapes && shapes.length == 0) {
            shapes = [self.oryxEditor.getCanvas()];
            canvasSelected = true;
        }
        if (shapes && shapes.length > 0) {
            self.selectedShape = <ORYX.IShape>shapes[0];
            var stencil = self.selectedShape.getStencil();

            // if (stencil.id().indexOf('BPMNDiagram') !== -1) {
            //     // ignore canvas event because of empty selection when scrolling stops
            //     return;
            // }
            selectedItem = { title: '', properties: [], auditData: null };
            if (canvasSelected) {
                selectedItem.auditData = {
                    author: self.modelData.createdByUser,
                    createDate: self.modelData.createDate
                };
            }
            var properties = stencil.properties();
            for (var i = 0; i < properties.length; i++) {
                var property = properties[i];
                if (property.popular() == false) continue;
                var key = property.prefix() + "-" + property.id();
                if (key === 'oryx-name') {
                    selectedItem.title = self.selectedShape.properties[key];
                }
                var name = key + '-' + property.type();
                var propertyConfig = <IProperty>(<any>self.oryxBpmnPropertyConfigService.properties).find(function (item: IProperty) {
                    return item.name === name;
                });

                if (propertyConfig === undefined || propertyConfig === null) {
                    name = property.type();
                    propertyConfig = <IProperty>(<any>self.oryxBpmnPropertyConfigService.properties).find(function (item: IProperty) {
                        return item.name === name;
                    });
                }
                if (propertyConfig && property.visible()) {
                    if (self.selectedShape.properties[key] === 'true') {
                        self.selectedShape.properties[key] = true;
                    }
                    var currentProperty: ISelectedItemProperty = {
                        key: key,
                        title: property.title(),
                        description: property.description(),
                        type: property.type(),
                        mode: 'read',
                        hidden: !property.visible(),
                        value: self.selectedShape.properties[key],
                        readModeTemplateUrl: null,
                        writeModeTemplateUrl: null,
                        templateUrl: null,
                        hasReadWriteMode: null,
                        noValue: false,
                        modal: propertyConfig.modal,
                        controller: propertyConfig.controller,
                        controllerAs: propertyConfig.controllerAs
                    };
                    if ((currentProperty.type === 'complex' || currentProperty.type === 'multiplecomplex') && angular.isString(currentProperty.value)) {
                        try {
                            currentProperty.value = JSON.parse(currentProperty.value);
                        } catch (err) {
                            // ignore
                        }
                    }
                    if (propertyConfig.readModeTemplateUrl !== undefined && propertyConfig.readModeTemplateUrl !== null) {
                        currentProperty.readModeTemplateUrl = propertyConfig.readModeTemplateUrl;
                    }
                    if (propertyConfig.writeModeTemplateUrl !== undefined && propertyConfig.writeModeTemplateUrl !== null) {
                        currentProperty.writeModeTemplateUrl = propertyConfig.writeModeTemplateUrl;
                    }

                    if (propertyConfig.templateUrl !== undefined && propertyConfig.templateUrl !== null) {
                        currentProperty.templateUrl = propertyConfig.templateUrl;
                        currentProperty.hasReadWriteMode = false;
                    }
                    else {
                        currentProperty.hasReadWriteMode = true;
                    }

                    if (currentProperty.value === undefined
                        || currentProperty.value === null
                        || currentProperty.value.length == 0) {
                        currentProperty.noValue = true;
                    }
                    selectedItem.properties.push(currentProperty);
                }
            }
        }
        self.$scope.$emit("bpmn-editor-canvas:selectionShapeChanged", selectedItem);
        return;
    }
    //public function
    reloadModel($element: angular.IAugmentedJQuery, modelData: any, stencilSetData: any): void {
        var self = this;
        self.modelData = modelData;
        self.stencilSetData = stencilSetData;
        self.createInstanceEditor($element);
        self.oryxEditor.loadSerialized(self.modelData.model);
    }
    getCanvas(): any {
        var self = this;
        return self.oryxEditor.getCanvas();
    }
    onDropComplete($event: any, stencilItem: any): void {
        var self = this;
        if (!stencilItem.id) return;
        var id = self.convertStencilId(stencilItem.id);
        var parentCandidate = self.getParentCandidateShape($event.event, id, stencilItem);
        if (!parentCandidate) return;

        var pos = { x: $event.event.pageX, y: $event.event.pageY };

        var additionalIEZoom = self.getAdditionalIEZoom();

        var screenCTM = self.oryxEditor.getCanvas().node.getScreenCTM();
        pos.x -= (screenCTM.e / additionalIEZoom);
        pos.y -= (screenCTM.f / additionalIEZoom);

        pos.x /= screenCTM.a;
        pos.y /= screenCTM.d;

        pos.x -= document.documentElement.scrollLeft;
        pos.y -= document.documentElement.scrollTop;

        var parentAbs = parentCandidate.absoluteXY();
        pos.x -= parentAbs.x;
        pos.y -= parentAbs.y;

        var containedStencil = null;
        var stencilSets = self.oryxEditor.getStencilSets().values();
        for (var i = 0; i < stencilSets.length; i++) {
            var stencilSet = stencilSets[i];
            var nodes = stencilSet.nodes();
            for (var j = 0; j < nodes.length; j++) {
                if (nodes[j].idWithoutNs() === self.convertStencilId(stencilItem.id)) {
                    containedStencil = nodes[j];
                    break;
                }
            }
            if (!containedStencil) {
                var edges = stencilSet.edges();
                for (var j = 0; j < edges.length; j++) {
                    if (edges[j].idWithoutNs() === self.convertStencilId(stencilItem.id)) {
                        containedStencil = edges[j];
                        break;
                    }
                }
            }
        }

        if (!containedStencil) return;

        var canAttach = false;
        if (containedStencil.idWithoutNs() === 'BoundaryErrorEvent' || containedStencil.idWithoutNs() === 'BoundaryTimerEvent' ||
            containedStencil.idWithoutNs() === 'BoundarySignalEvent' || containedStencil.idWithoutNs() === 'BoundaryMessageEvent' ||
            containedStencil.idWithoutNs() === 'BoundaryCancelEvent' || containedStencil.idWithoutNs() === 'BoundaryCompensationEvent') {
            // Modify position, otherwise boundary event will get position related to left corner of the canvas instead of the container
            pos = self.oryxEditor.eventCoordinates($event.event);
            canAttach = true;
        }
        var option = {};
        option['type'] = stencilItem.id;
        option['namespace'] = self.stencilSetData.namespace;
        option['position'] = pos;
        option['parent'] = parentCandidate;

        var command = self.oryxAddShapeCommandFactory(option, parentCandidate, canAttach, pos, self.oryxEditor._getPluginFacade());
        self.oryxEditor._getPluginFacade().executeCommands([command]);
    }
    getModelMetaData(): any {
        var self = this;
        return self.oryxEditor ? self.oryxEditor.getModelMetaData() : null;
    }
    updatePropertyShape(selectedItemShape: ISelectedItemShape,property:any): any {
        var self = this;
        if(!self.selectedShape) return;
        var key=property.key;
        var newValue = property.value;
        var oldValue = selectedItemShape.properties[key];
        var facade= self.oryxEditor._getPluginFacade();
        // Instantiate the class
        var command = self.oryxUpdatePropertyCommandFactory(facade,
                                                            key,
                                                            newValue,
                                                            oldValue,
                                                            self.selectedShape);
        // Execute the command
       facade.executeCommands([command]);
    }
    dispose():void{
         var self = this;
         self.oryxEditor.unregisterOnEvent(ORYX.CONFIG.EVENT_SELECTION_CHANGED, self.selectionShapeChanged);
    }
}

@angular.typescript.decorators.directive("$timeout", "$window")
class BpmnEditorCanvasDirective implements angular.IDirective {
    restrict: string = "E";
    scope: Object = {
        selectedItemShape: '=',
        modelData: '=',
        stencilSetData: '='
    };
    // bindToController: Object = {

    // };
    template: string =
    '<div ng-drop="true" ng-drop-success="bpmnEditorCanvasController.onDropComplete($event,$data)" class="_oryx-bpmn-canvas-content">' +
    '<div class="_oryx-bpmn-canvas-container">' +
    '<svg><defs></defs></svg>' +
    '</div>' +
    '<md-icon class="resizer_southeast" md-font-icon="zmdi zmdi-playlist-plus zmdi-hc-fw"></md-icon>' +
    '<md-icon class="resizer_northwest" md-font-icon="zmdi zmdi-sort-amount-desc zmdi-hc-fw"></md-icon>' +
    '</div>';
    controller: Function = BpmnEditorCanvasController;
    controllerAs: string = "bpmnEditorCanvasController";

    constructor(private $timeout: angular.ITimeoutService,
        private $window: angular.IWindowService) {

    }

    public link: Function = (scope: angular.IScope, element: angular.IAugmentedJQuery, attrs, controller: IBpmnEditorCanvasController): void => {
        var self = this;
        var positions = element[0].getBoundingClientRect();
        var availableWidth = self.$window.innerWidth - positions.left;

        scope.$watch(function () {
            return (<any>scope).modelData;
        }, function (newValue, oldValue) {
            if (newValue === void 0 || !(<any>scope).stencilSetData) {
                return;
            }
            if (controller.getModelMetaData() !== newValue) {
                controller.reloadModel(element, (<any>scope).modelData, (<any>scope).stencilSetData);
                self.$timeout(function () {
                    var canvas = controller.getCanvas();
                    canvas.update();
                });
            }
        });

        scope.$on("bpmn-editor-canvas:selectionShapeChanged", function (ev: angular.IAngularEvent, data: any) {
            (<any>scope).selectedItemShape = data;
        });
        scope.$on("bpmn-editor-canvas:updatePropertyShape", function (ev: angular.IAngularEvent, property:any) {
            if(property && (<any>scope).selectedItemShape){
                controller.updatePropertyShape((<any>scope).selectedItemShape,property);
            }
        });
        scope.$on("$destroy", function () {
            controller.dispose();
            element.remove();
        });
    }    
}
angular.module("oryx.bpmnEditor").directive("oryxBpmnCanvas", <any>BpmnEditorCanvasDirective);