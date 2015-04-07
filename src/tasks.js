ko.tasks = (function () {
    var scheduler,
        taskQueue = [],
        taskQueueLength = 0,
        nextHandle = 1,
        nextIndexToProcess = 0;

    if (window['MutationObserver']) {
        // Chrome 27+, Firefox 14+, IE 11+, Opera 15+, Safari 6.1+; borrowed from https://github.com/petkaantonov/bluebird
        scheduler = (function (callback) {
            var div = document.createElement("div");
            new MutationObserver(callback).observe(div, {attributes: true});
            return function () { div.classList.toggle("foo"); };
        })(processTasks);
    } else if (document && "onreadystatechange" in document.createElement("script")) {
        // IE 6-10; borrowed from https://github.com/YuzuJS/setImmediate
        scheduler = function (callback) {
            var script = document.createElement("script");
            script.onreadystatechange = function () {
                script.onreadystatechange = null;
                document.documentElement.removeChild(script);
                script = null;
                callback();
            };
            document.documentElement.appendChild(script);
        };
    } else {
        scheduler = function (callback) {
            setTimeout(callback, 0);
        };
    }

    function processTasks() {
        if (!taskQueueLength) {
            return;
        }

        try {
            // Each mark represents the end of a logical group of tasks and the number of these groups is
            // limited to prevent unchecked recursion.
            var mark = taskQueueLength, countMarks = 0;

            // Always start at nextIndexToProcess
            for (var task; nextIndexToProcess < taskQueueLength; ) {
                if (task = taskQueue[nextIndexToProcess++]) {
                    if (nextIndexToProcess > mark) {
                        if (++countMarks >= 5000)
                            throw Error("'Too much recursion' after processing " + countMarks + " task groups.");
                        mark = taskQueueLength;
                    }
                    task();
                }
            }
        } finally {
            // Remove the tasks we've just processed from the queue and reset the timer
            if (nextIndexToProcess < taskQueueLength) {
                // There are still tasks to process because a task threw an exception
                taskQueueLength -= nextIndexToProcess;
                taskQueue = taskQueue.slice(nextIndexToProcess);
                nextIndexToProcess = 0;
                scheduleTaskProcessing();
            } else {
                // All tasks have been processed
                nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
            }
        }
    }

    function scheduleTaskProcessing() {
        ko.tasks['scheduler'](processTasks);
    }

    var tasks = {
        'scheduler': scheduler,     // Allow overriding the scheduler

        schedule: function (func) {
            if (!taskQueueLength) {
                scheduleTaskProcessing();
            }

            taskQueue[taskQueueLength++] = func;
            return nextHandle++;
        },

        cancel: function (handle) {
            var index = handle - (nextHandle - taskQueueLength);
            if (index >= 0 && index < taskQueueLength) {
                taskQueue[index] = null;
            }
        },

        // For testing only: return the queue length
        length: function () {
            return taskQueueLength;
        },

        runEarly: processTasks
    };

    return tasks;
})();

ko.exportSymbol('tasks', ko.tasks);
ko.exportSymbol('tasks.schedule', ko.tasks.schedule);
//ko.exportSymbol('tasks.cancel', ko.tasks.cancel);  "cancel" isn't minified
ko.exportSymbol('tasks.runEarly', ko.tasks.runEarly);
