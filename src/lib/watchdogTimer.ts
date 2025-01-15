import events from 'events';
const watchdogTimer = new events.EventEmitter();

const watchdogTimerValueQueue: { [key: string]: number } = {};
const watchdogTickQueue: { [key: string]: number } = {};
const watchdogCallbackQueue: {
    [key: string]: (param1: unknown, param2: unknown, param3: unknown) => void;
} = {};
const watchdogParam1Queue: { [key: string]: unknown } = {};
const watchdogParam2Queue: { [key: string]: unknown } = {};
const watchdogParam3Queue: { [key: string]: unknown } = {};

setInterval(() => {
    watchdogTimer.emit('watchdog');
}, 1000);

watchdogTimer.on('watchdog', () => {
    for (const id in watchdogTimerValueQueue) {
        // eslint-disable-next-line no-prototype-builtins
        if (watchdogTimerValueQueue.hasOwnProperty(id)) {
            ++watchdogTickQueue[id];
            if (watchdogTickQueue[id] % watchdogTimerValueQueue[id] === 0) {
                watchdogTickQueue[id] = 0;
                if (watchdogCallbackQueue[id]) {
                    watchdogCallbackQueue[id](
                        watchdogParam1Queue[id],
                        watchdogParam2Queue[id],
                        watchdogParam3Queue[id],
                    );
                }
            }
        }
    }
});

const setWatchdogTimer = (
    id: string,
    sec: number,
    callbackFunc: () => void,
    param1?: unknown,
    param2?: unknown,
    param3?: unknown,
): void => {
    watchdogTimerValueQueue[id] = sec;
    watchdogTickQueue[id] = 0;
    watchdogCallbackQueue[id] = callbackFunc;
    watchdogParam1Queue[id] = param1;
    watchdogParam2Queue[id] = param2;
    watchdogParam3Queue[id] = param3;
};

const getWatchdogTimerCallback = (id: string) => {
    return watchdogCallbackQueue[id];
};

const getWatchdogTimerValue = (id: string) => {
    return watchdogTimerValueQueue[id];
};

const deleteWatchdogTimer = (id: string) => {
    delete watchdogTimerValueQueue[id];
    delete watchdogTickQueue[id];
    delete watchdogCallbackQueue[id];
};

export { setWatchdogTimer, getWatchdogTimerCallback, getWatchdogTimerValue, deleteWatchdogTimer };
