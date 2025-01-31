import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Logger 설정
const logger = createLogger({
    level: 'info', // 로그 수준 설정 (error, warn, info, http, verbose, debug, silly)
    format: format.combine(
        format.colorize(), // 로그에 색상 추가
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 타임스탬프 추가
        format.printf(({ timestamp, level, message }) => {
            const logMessage =
                typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
            return `[${timestamp}] ${level}: ${logMessage}`;
        })
    ),
    transports: [
        // 콘솔 출력
        new transports.Console(),
        // info 로그 파일
        new DailyRotateFile({
            dirname: 'logs/info', // 로그 저장 폴더
            filename: 'info-%DATE%.log', // 파일 이름
            datePattern: 'YYYY-MM-DD',
            level: 'info', // info 이상의 로그만 저장
            maxSize: '20m',
            maxFiles: '14d',
        }),
        // error 로그 파일
        new DailyRotateFile({
            dirname: 'logs/error',
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error', // error 이상의 로그만 저장
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
});

export default logger;