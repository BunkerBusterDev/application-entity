import Events from 'events';

type WatchdogCallback = (param1?: any, param2?: any, param3?: any) => void;

const watchdogTimer = new Events.EventEmitter();

let intervalHandle: NodeJS.Timeout | undefined;
const timerMap = new Map<string, {sec: number, callback: WatchdogCallback, tick: number, params: [any?, any?, any?]}>();

// 내부에서 1초마다 이벤트 발생
const startWatchdog = () => {
    if (!intervalHandle) {
        intervalHandle = setInterval(() => {
            watchdogTimer.emit('watchdog');
        }, 1000);
    }
};

const stopWatchdog = () => {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = undefined;
    }
};

watchdogTimer.on('watchdog', () => {
    for (const [id, timer] of timerMap) {
        timer.tick++;
        if (timer.tick % timer.sec === 0) {
            timer.tick = 0; // tick 초기화
            try {
                timer.callback(...timer.params);
            } catch (error) {
                console.error(`[Watchdog Error]: Callback for ${id} failed - ${error}`);
            }
        }
    }
});

// 타이머 설정 함수
const setWatchdogTimer = (
    id: string,
    sec: number,
    callback: WatchdogCallback,
    param1?: any,
    param2?: any,
    param3?: any
) => {
    timerMap.set(id, { sec, callback, tick: 0, params: [param1, param2, param3] });
};

// 타이머 삭제 함수
const deleteWatchdogTimer = (id: string) => {
    timerMap.delete(id);
};

// 타미어 전체 삭제 함수
const deleteAllWatchdogTimer = () => {
    timerMap.clear();
}

const WatchdogTimer = {
    startWatchdog: startWatchdog,
    stopWatchdog: stopWatchdog,
    setWatchdogTimer: setWatchdogTimer,
    deleteWatchdogTimer: deleteWatchdogTimer,
    deleteAllWatchdogTimer: deleteAllWatchdogTimer
};

export = WatchdogTimer;
