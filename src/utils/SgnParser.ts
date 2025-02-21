import Logger from 'utils/Logger';

// oneM2M 메시지에서 ContentInstance에 대한 타입 정의
interface ContentInstance {
    sud?: string;
    vrq?: string;
    [key: string]: unknown;
}

// oneM2M 알림(Sgn)에 대한 타입 정의
interface Sgn {
    sur: string; // subscription URL
    nev?: {
        rep?: {
            'm2m:cin'?: ContentInstance;
            cin?: ContentInstance;
        };
    };
    sud?: string;
    vrq?: string;
}

// primitiveContent가 가질 수 있는 타입 정의
interface PrimitiveContent {
    sgn?: Sgn;
    singleNotification?: Sgn;
    [key: string]: unknown;
}

// callback 타입 정의: path_arr는 문자열 배열, cinObj는 Cin 또는 null, requestIdentifier는 string
type SgnParserCallback = (
    path_arr: string[],
    cinObj: ContentInstance | null,
    requestIdentifier: string
) => void;

const SgnParser = (requestIdentifier: string, primitiveContent: PrimitiveContent, callback: SgnParserCallback) => {
    let sgnObj: Sgn;
    let cinObj: ContentInstance | null = {};
    let pathArray: string[] = []; // callback에서 사용할 path 배열 선언

    if(primitiveContent.sgn) {
        // sgnObj 결정 (primitiveContent.sgn 이 존재하면 short, 아니면 singleNotification)
        sgnObj = primitiveContent.sgn !== null ? primitiveContent.sgn : primitiveContent.singleNotification as Sgn;
        const nmtype = primitiveContent.sgn !== null ? 'short' : 'long';

        if (nmtype === 'long') {
            Logger.info('[SgnParser]: oneM2M spec. define only short name for resource')
        }
        else {
            // nmtype === 'short'
            if (sgnObj.sur) {
                if(sgnObj.sur.charAt(0) !== '/') {
                    sgnObj.sur = `/${sgnObj.sur}`;
                }
                pathArray = sgnObj.sur.split('/');
            }

            if (sgnObj.nev) {
                if (sgnObj.nev.rep) {
                    if (sgnObj.nev.rep['m2m:cin']) {
                        sgnObj.nev.rep.cin = sgnObj.nev.rep['m2m:cin'];
                        delete sgnObj.nev.rep['m2m:cin'];
                    }

                    if (sgnObj.nev.rep.cin) {
                        cinObj = sgnObj.nev.rep.cin;
                    }
                    else {
                        Logger.info('[SgnParser-mqttNotificationAction]: m2m:cin is none');
                        cinObj = null;
                    }
                }
                else {
                    Logger.info('[SgnParser-mqttNotificationAction]: rep tag of m2m:sgn.nev is none. m2m:notification format mismatch with oneM2M spec.');
                    cinObj = null;
                }
            }
            else if (sgnObj.sud) {
                Logger.info('[SgnParser-mqttNotificationAction]: received notification of verification');
                cinObj = {};
                cinObj.sud = sgnObj.sud;
            }
            else if (sgnObj.vrq) {
                Logger.info('[SgnParser-mqttNotificationAction]: received notification of verification');
                cinObj = {};
                cinObj.vrq = sgnObj.vrq;
            }

            else {
                Logger.info('[SgnParser-mqttNotificationAction]: nev tag of m2m:sgn is none. m2m:notification format mismatch with oneM2M spec.');
                cinObj = null;
            }
        }
    }
    else {
        Logger.info('[SgnParser-mqttNotificationAction]: m2m:sgn tag is none. m2m:notification format mismatch with oneM2M spec.');
        Logger.info(`[SgnParser-mqttNotificationAction]: ${primitiveContent}`);
    }

    callback(pathArray, cinObj, requestIdentifier);
};

export default SgnParser;