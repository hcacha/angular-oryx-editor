import * as angular from "angular";

if(!angular.typescript) angular.typescript={};
if(!angular.typescript.decorators) angular.typescript.decorators={};

angular.typescript.decorators.directive=function directive(...values: string[]): any {
    return (target: Function) => {
        const directive: Function = (...args: any[]): Object => {
            return ((classConstructor: Function, args: any[], ctor: any): Object => {
                ctor.prototype = classConstructor.prototype;
                const child: Object = new ctor;
                const result: Object = classConstructor.apply(child, args);
                return typeof result === "object" ? result : child;
            })(target, args, () => {
                return null;
            });
        };
        directive.$inject = values;
        return directive;
    };
};
