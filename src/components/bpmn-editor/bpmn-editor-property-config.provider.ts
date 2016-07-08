import * as angular from "angular";

export interface IProperty {
    name:string;
    readModeTemplateUrl:string;
    writeModeTemplateUrl:string;
    templateUrl:string;
    modal:boolean;
    controllerAs:string;
    controller:string;
}

export interface IBpmnEditorPropertyConfigService {
    properties: Array<IProperty>;
}

export interface IBpmnEditorPropertyConfigProvider extends angular.IServiceProvider {
    addProperty(property: IProperty): void;
}
class BpmnEditorPropertyConfigProvider implements IBpmnEditorPropertyConfigProvider {
    private properties: Array<IProperty> = [];
  
    addProperty(property: IProperty): void {
        this.properties.push(property);
    } 
    $get(): IBpmnEditorPropertyConfigService {
        var self = this;
        return {
            properties: self.properties            
        };
    }
}
angular.module("oryx.bpmnEditor").provider("oryxBpmnPropertyConfigService", BpmnEditorPropertyConfigProvider);
