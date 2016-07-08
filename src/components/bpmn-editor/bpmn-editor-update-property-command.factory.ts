import * as angular from "angular";
import * as ORYX from "oryx";


class UpdatePropertyCommand extends ORYX.Core.Command {

    constructor(private facade: ORYX.IPluginFacade,
        private key: any,
        private oldValue: any,
        private newValue: boolean,
        private shape: ORYX.IShape) {
        super();
    }
    execute() {
        var self = this;

        self.shape.setProperty(self.key, self.newValue);
        self.facade.getCanvas().update();
        self.facade.updateSelection();
    }
    rollback() {
        var self = this;
        self.shape.setProperty(self.key, self.oldValue);
        self.facade.getCanvas().update();
        self.facade.updateSelection();
    }
}
export type oryxUpdatePropertyCommandFactory = (facade: ORYX.IPluginFacade,
                                                key: any,
                                                oldValue: any,
                                                newValue: any,
                                                shape: ORYX.IShape) => any;
oryxUpdatePropertyCommand.$inject = [];
function oryxUpdatePropertyCommand(): oryxUpdatePropertyCommandFactory {
    return (facade: ORYX.IPluginFacade,
            key: any,
            oldValue: any,
            newValue: any,
            shape: ORYX.IShape): any => {
        return new UpdatePropertyCommand(facade,key,oldValue,newValue,shape);
    }
}
angular.module("oryx.bpmnEditor").factory("oryxUpdatePropertyCommandFactory", oryxUpdatePropertyCommand);
