import * as angular from "angular";

import * as ORYX from "../oryx";

ORYX.CONFIG.BACKEND_SWITCH = true;
ORYX.CONFIG.STENCILSET_HANDLER = "";
ORYX.CONFIG.SS_EXTENSIONS_CONFIG = null;



export type bpmnEditorOryxFactory = (stencilSetData:any,modelData:any,options?:any) => any;

bpmnEditorOryx.$inject = [];
function bpmnEditorOryx(): bpmnEditorOryxFactory {
    return (stencilSetData:any,modelData:any,options?:any):any => {
        
        ORYX.Core.UIObject.prototype.addEventHandlers=function(node) {
            var $node=angular.element(node);
            $node.on(ORYX.CONFIG.EVENT_MOUSEDOWN, this._delegateEvent.bind(this));
		    $node.on(ORYX.CONFIG.EVENT_MOUSEMOVE, this._delegateEvent.bind(this));	
		    $node.on(ORYX.CONFIG.EVENT_MOUSEUP, this._delegateEvent.bind(this));
		    $node.on(ORYX.CONFIG.EVENT_MOUSEOVER, this._delegateEvent.bind(this));
		    $node.on(ORYX.CONFIG.EVENT_MOUSEOUT, this._delegateEvent.bind(this));
		    $node.on('click', this._delegateEvent.bind(this));
		    $node.on(ORYX.CONFIG.EVENT_DBLCLICK, this._delegateEvent.bind(this));            
        };       

        if(!options) options={};

        var ssUrl = (modelData.model.stencilset.namespace || modelData.model.stencilset.url).replace("#", "%23");
        ORYX.Core.StencilSet.loadStencilSet(ORYX.CONFIG.STENCILSET_HANDLER + ssUrl, modelData.model.resourceId, stencilSetData);       

        angular.extend(options,{
            createCanvasWrapper:false,
		    isGenerateGUI:false,
		    enableMakeExtModalWindowKeysave:false,
		    enableLoadContentModel:false,
		    enableLoadPlugins:false,
        });
        return new ORYX.Editor(modelData,options);
    }
}
angular.module("oryx.bpmnEditor").factory("bpmnEditorOryxFactory",bpmnEditorOryx);

