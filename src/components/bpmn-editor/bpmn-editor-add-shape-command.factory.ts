import * as angular from "angular";
import * as ORYX from "oryx";


class AddShapeCommand extends ORYX.Core.Command {
    private docker:any;
    private dockedShapeParent:any;
    private selection:any;
    private shape:any;
    private parent:any;

    constructor (private option:any,private dockedShape:any,private canAttach:boolean,private position:any,private facade:ORYX.IPluginFacade) {    
        super();    
        this.docker = null;        
        this.dockedShapeParent = dockedShape.parent || facade.getCanvas();        
        
        this.selection = facade.getSelection();
        
    }
    execute () {
        var self = this;
        if (!self.shape) {
            self.shape = self.facade.createShape(self.option);
            self.parent = self.shape.parent;
        } else if (self.parent) {
            self.parent.add(self.shape);
        }
        if (self.canAttach && self.shape.dockers && self.shape.dockers.length) {
            self.docker = self.shape.dockers[0];

            self.dockedShapeParent.add(self.docker.parent);

            // Set the Docker to the new Shape
            self.docker.setDockedShape(undefined);
            self.docker.bounds.centerMoveTo(self.position);
            if (self.dockedShape !== self.facade.getCanvas()) {
                self.docker.setDockedShape(self.dockedShape);
            }
            self.facade.setSelection([self.docker.parent]);
        }

        self.facade.getCanvas().update();
        self.facade.updateSelection();

    }
    rollback() {
        var self = this;
        if (self.shape) {
            self.facade.setSelection(self.selection.without(self.shape));
            self.facade.deleteShape(self.shape);
        }
        if (self.canAttach && self.docker) {
            self.docker.setDockedShape(undefined);
        }
        self.facade.getCanvas().update();
        self.facade.updateSelection();
    }
}
export type oryxAddShapeCommandFactory = (option:any,dockedShape:any,canAttach:boolean,position:any,facade:ORYX.IPluginFacade) => any;
oryxAddShapeCommand.$inject = [];
function oryxAddShapeCommand(): oryxAddShapeCommandFactory {
    return (option:any,dockedShape:any,canAttach:boolean, position:any,facade:ORYX.IPluginFacade): any => {
        return new AddShapeCommand(option,dockedShape,canAttach,position,facade);
    }
}
angular.module("oryx.bpmnEditor").factory("oryxAddShapeCommandFactory", oryxAddShapeCommand);
