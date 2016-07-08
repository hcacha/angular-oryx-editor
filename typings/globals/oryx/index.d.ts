// Support AMD require

declare namespace oryx {
    interface ICommand {
        new (): ICommand;
    }
    interface ICanvas{
        new():ICanvas;
    }
    interface IUIObject{
        new():IUIObject;
    }
    interface IStencilSet{
        loadStencilSet(url:string, editorId:any,stencilSetData?:any):void;
    }
    interface IAbstractPlugin {
        new(facade:IPluginFacade):IAbstractPlugin;
        layoutEdges(node:INode, allEdges:any, offset:any):void;
    }
    interface ICore {
        Command: ICommand;
        Node: INode;
        Edge: IEdge;
        Controls: IControls;
        Shape: IShape;
        Canvas:ICanvas;  
        UIObject:IUIObject;
        StencilSet:IStencilSet;
        AbstractPlugin:IAbstractPlugin;
    }
    interface INode {
        new (): INode;
    }
    interface IEdge {
        new (): IEdge;
    }
    interface IControls {
        Docker: IDocker;
    }
    interface IDocker {
        new (): IDocker;
    }
    interface IShape {
        new (): IShape;
        setProperty(key:any, value:any, force?:boolean):void;
        properties:any;
        getStencil():any;
    }
    interface IEditor {
        new(config:any, options:any):IEditor;
        graft(namespace:string, parent:any, t:any, doc?:any);
        _getPluginFacade():any;
        registerOnEvent(eventType:string, callback:Function);
        eventCoordinates(event:any);
        getCanvas():any;
        loadSerialized(model:any);
        getStencilSets():any;
        unregisterOnEvent(eventType, callback):void;
        getModelMetaData():any;
    }
    interface IConfig {
        SHOW_GRIDLINE: boolean;
        EVENT_MOUSEDOWN: string;
        EVENT_MOUSEMOVE: string;
        EVENT_MOUSEUP: string;
        EVENT_HIGHLIGHT_HIDE: string;
        EVENT_DRAGDROP_END: string;
        EVENT_DRAGDROP_START: string;
        GRID_ENABLED: boolean;
        EVENT_HIGHLIGHT_SHOW: string;
        SELECTION_HIGHLIGHT_STYLE_RECTANGLE: string;
        SELECTION_VALID_COLOR: string;
        SELECTION_INVALID_COLOR: string;
        EVENT_RESIZE_START: string;
        EVENT_RESIZE_END: string;
        GRID_DISTANCE: number;
        SELECTED_AREA_PADDING:number;
        MINIMUM_SIZE:number;
        MAXIMUM_SIZE:number;
        BACKEND_SWITCH:boolean;
        STENCILSET_HANDLER:string;
        SS_EXTENSIONS_CONFIG:any;
        EVENT_MOUSEOVER:string;
        EVENT_MOUSEOUT:string;
        EVENT_DBLCLICK:string;
        EVENT_SELECTION_CHANGED:string;
        EVENT_ARRANGEMENT_TOP:string;
    }
    interface IPluginFacade {
        activatePluginByName(): void;
        getAvailablePlugins(): any;
        offer(): void;
        getStencilSets(): any;
        getRules(): any;
        loadStencilSet(): void;
        createShape(option:any): any;
        deleteShape(shape:any): void;
        getSelection(): any;
        setSelection(elements:Array<any>, subSelectionElement?:any, force?:boolean): void;
        updateSelection(): void;
        getCanvas(): any;
        importJSON(): void;
        importERDF(): void;
        getERDF(): any;
        getJSON(): any;
        getSerializedJSON(): any;
        executeCommands(commands:Array<any>): void;
        registerOnEvent(eventType:string, callback:Function): void,
        unregisterOnEvent(): void;
        raiseEvent(event:any, uiObj?:any): void;
        enableEvent(): void;
        disableEvent(): void;
        eventCoordinates(event:any): any;
        addToRegion(): void;
        getModelMetaData(): void;
    }
    interface IORYXStatic {
        Core: ICore;
        CONFIG: IConfig;
        Editor:IEditor;
    }
}
declare var oryx: oryx.IORYXStatic;
declare module 'oryx' {
    export = oryx;
}