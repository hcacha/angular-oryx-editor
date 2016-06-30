import * as angular from "angular";
import {bpmnEditorOryxFactory} from './bpmn-editor-oryx.factory';

export interface IBpmnEditorCanvasController {
    modelData:any;
    stencilSetData:any;
    reloadModel(): void;
    getCanvas():any;
}

class BpmnEditorCanvasController implements IBpmnEditorCanvasController{
    modelData:any;
    stencilSetData:any;
    private oryxEditor:any;

    constructor(private bpmnEditorOryxFactory:bpmnEditorOryxFactory){
        this.createInstanceEditor();
    }
    private createInstanceEditor=():void=>{
        var self = this;   
        if(!self.oryxEditor && self.stencilSetData && self.modelData){
            self.oryxEditor=self.bpmnEditorOryxFactory(self.stencilSetData,self.modelData);
        }
    }
    reloadModel():void {
        var self = this;       
         self.createInstanceEditor();
         self.oryxEditor.loadSerialized(self.modelData.model);
    }    
    getCanvas():any{
        var self = this;
       return self.oryxEditor.getCanvas();        
    }

}

@angular.typescript.decorators.directive("$timeout")
class BpmnEditorCanvasDirective implements angular.IDirective{    
    restrict: string = "E";    
    scope: Object = {

    };
    bindToController:Object= {
        modelData: '=',
        stencilSetData:'='        
    };    
    controller: Function = BpmnEditorCanvasController;
    controllerAs: string = "bpmnEditorCanvasController";

    constructor(private $timeout:angular.ITimeoutService){

    }

    public link: Function = (scope: angular.IScope, element: angular.IAugmentedJQuery, attrs, controller:IBpmnEditorCanvasController): void => {
        var self=this;
        scope.$watch(function(){
           return controller.modelData;
        },function (newValue,oldValue) {
            if (newValue === void 0) {
                return;
            }
            if (oldValue !== newValue) {
                controller.reloadModel();
                
                if(element.find("svg").length<=0){
                    self.$timeout(function() { 
                       var canvas= controller.getCanvas();
                       element.append(canvas.rootNode);
                       canvas.update();
                    });
                }
            }
        });



    }
}
angular.module("oryx.bpmnEditor").directive("oryxBpmnCanvas",<any>BpmnEditorCanvasDirective);