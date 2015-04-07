describe("Deferred bindings", function() {
    var testNode, bindingSpy;

    beforeEach(function() {
        testNode = document.createElement("div");
        testNode.id = "testNode";
        document.body.appendChild(testNode);
        jasmine.Clock.useMockForTasks();

        ko.options.deferUpdates = true;

        bindingSpy = jasmine.createSpy('bindingSpy');
        ko.bindingHandlers.test = {
            init: function (element, valueAccessor) { bindingSpy('init', ko.unwrap(valueAccessor())); },
            update: function (element, valueAccessor) { bindingSpy('update', ko.unwrap(valueAccessor())); }
        };
    });
    afterEach(function() {
        ko.options.deferUpdates = false;

        document.body.removeChild(testNode);
        bindingSpy = testNode = ko.bindingHandlers.test = null;
    });

    it("Should update bindings asynchronously", function() {
        var observable = ko.observable('A');

        // The initial "applyBindings" is synchronous
        testNode.innerHTML = "<div data-bind='test: myObservable'></div>";
        ko.applyBindings({ myObservable: observable }, testNode);
        expect(bindingSpy.argsForCall).toEqual([ ['init', 'A'], ['update', 'A'] ]);

        // When changing the observable, the update is deferred
        bindingSpy.reset();
        observable('B');
        expect(bindingSpy).not.toHaveBeenCalled();

        // Update is still deferred
        observable('C');
        expect(bindingSpy).not.toHaveBeenCalled();

        jasmine.Clock.tick(1);
        // Only the latest value is notified
        expect(bindingSpy.argsForCall).toEqual([ ['update', 'C'] ]);
    });

    it("Should update templates asynchronously", function() {
        var observable = ko.observable('A');

        testNode.innerHTML = "<div data-bind='template: {data: myObservable}'><div data-bind='test: $data'></div></div>";
        ko.applyBindings({ myObservable: observable }, testNode);
        expect(bindingSpy.argsForCall).toEqual([ ['init', 'A'], ['update', 'A'] ]);

        // mutate; template should not be updated yet
        bindingSpy.reset();
        observable('B');
        expect(bindingSpy).not.toHaveBeenCalled();

        // mutate again; template should not be updated yet
        observable('C');
        expect(bindingSpy).not.toHaveBeenCalled();

        jasmine.Clock.tick(1);
        // only the latest value should be used
        expect(bindingSpy.argsForCall).toEqual([ ['init', 'C'], ['update', 'C'] ]);
    });

    it("Should update 'foreach' items asynchronously", function() {
        var observable = ko.observableArray(["A"]);

        testNode.innerHTML = "<div data-bind='foreach: {data: myObservables}'><div data-bind='test: $data'></div></div>";
        ko.applyBindings({ myObservables: observable }, testNode);
        expect(bindingSpy.argsForCall).toEqual([ ['init', 'A'], ['update', 'A'] ]);

        // mutate; template should not be updated yet
        bindingSpy.reset();
        observable(["B"]);
        expect(bindingSpy).not.toHaveBeenCalled();

        // mutate again; template should not be updated yet
        observable(["C"]);
        expect(bindingSpy).not.toHaveBeenCalled();

        jasmine.Clock.tick(10);
        // only the latest value should be used
        expect(bindingSpy.argsForCall).toEqual([ ['init', 'C'], ['update', 'C'] ]);
    });
});
