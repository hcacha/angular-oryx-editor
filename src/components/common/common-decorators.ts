import * as angular from "angular";

if(!angular.typescript) angular.typescript={};
if(!angular.typescript.decorators) angular.typescript.decorators={};

export interface IClassAnnotationDecorator {
    (target: any): void;
    (t: any, key: string, index: number): void;
}

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
angular.typescript.decorators.inject=function(...args: string[]): IClassAnnotationDecorator {
    return (target: any, key?: string, index?: number): void => {
        if (angular.isNumber(index)) {
            target.$inject = target.$inject || [];
            target.$inject[index] = args[0];
        } else {
            target.$inject = args;
        }
    };
}