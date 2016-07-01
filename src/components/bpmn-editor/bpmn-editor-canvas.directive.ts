import * as angular from "angular";
import {oryxBpmnEditorFactory} from './bpmn-editor-oryx.factory';

export interface IBpmnEditorCanvasController {
    modelData:any;
    stencilSetData:any;
    reloadModel($element:angular.IAugmentedJQuery): void;
    getCanvas():any;
}

class BpmnEditorCanvasController implements IBpmnEditorCanvasController{
    modelData:any;
    stencilSetData:any;
    private oryxEditor:any;

    constructor(private oryxBpmnEditorFactory:oryxBpmnEditorFactory){
        this.createInstanceEditor();
    }
    private createInstanceEditor=($element?:angular.IAugmentedJQuery):void=>{
        var self = this;   
        if(!self.oryxEditor && self.stencilSetData && self.modelData){
            self.oryxEditor=self.oryxBpmnEditorFactory(self.stencilSetData,self.modelData,{
                parentNode:$element && $element.length?$element[0]:null
            });            
        }
    }
    reloadModel($element:angular.IAugmentedJQuery):void {
        var self = this;       
         self.createInstanceEditor($element);
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
    template :string= '<div class="resizer_southeast"></div><div class="resizer_northwest"><i class="zmdi zmdi-sort-amount-desc zmdi-hc-fw"></i></div>';
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
                controller.reloadModel(element);                
                self.$timeout(function() { 
                    var canvas= controller.getCanvas();
                      // element.append(canvas.rootNode);
                    canvas.update();
                });
            }
        });



    }
}
angular.module("oryx.bpmnEditor").directive("oryxBpmnCanvas",<any>BpmnEditorCanvasDirective);