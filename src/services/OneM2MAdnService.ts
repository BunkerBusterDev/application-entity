// OneM2MAdnService.ts
import { MqttClientService } from './MqttClientService';
import * as js2xmlparser from 'js2xmlparser';
import * as cbor from 'cbor';
import shortid from 'shortid';

export interface OneM2MConfig {
  ae: {
    id: string;
    name: string;
    appid: string;
    parent: string;
    bodytype: 'xml' | 'json' | 'cbor';
  };
  cse: {
    host: string;
    mqttport: number;
    id: string;
  };
  cnt: Array<{
    name: string;
    parent: string;
  }>;
  sub: Array<{
    name: string;
    parent: string;
    nu: string;
  }>;
}

/**
 * OneM2M ADN 기능을 제공하는 서비스  
 * 각 메서드는 내부에서 요청 메시지를 구성한 후 MQTT 발행을 통해 응답을 Promise로 반환합니다.
 */
export class OneM2MAdnService {
  private mqttService: MqttClientService;
  private config: OneM2MConfig;
  private reqTopic: string;

  constructor(mqttService: MqttClientService, config: OneM2MConfig) {
    this.mqttService = mqttService;
    this.config = config;
    // 초기 요청 토픽: /oneM2M/req/{ae.id}/{cse.id}/{bodytype}
    this.reqTopic = `/oneM2M/req/${config.ae.id}/${config.cse.id}/${config.ae.bodytype}`;
  }

  /**
   * 메시지 인코딩 (xml, cbor, json)
   */
  private encodeMessage(message: any): string | Buffer {
    if (this.config.ae.bodytype === 'xml') {
      // XML 인코딩 시 네임스페이스 속성 추가
      message['@'] = {
        "xmlns:m2m": "http://www.onem2m.org/xml/protocols",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      };
      return js2xmlparser.parse("m2m:rqp", message);
    } else if (this.config.ae.bodytype === 'cbor') {
      return cbor.encode(message).toString('hex');
    } else {
      return JSON.stringify(message);
    }
  }

  /**
   * OneM2M 요청 메시지를 구성하여 MQTT를 통해 발행한 후 응답을 기다립니다.
   */
  private async sendOneM2MRequest(rqp: any, to: string): Promise<any> {
    const rqi = shortid.generate();
    rqp.rqi = rqi;
    rqp.fr = this.config.ae.id;
    rqp.to = to;
    // 최종 요청 객체 (m2m:rqp)
    const requestObj = rqp;
    const encodedMessage = this.encodeMessage(requestObj);
    return this.mqttService.sendRequest(this.reqTopic, encodedMessage, rqi, to);
  }

  // ==================== ADN 기능 메서드 ====================

  /** AE (Application Entity) 생성 */
  public async createAE(): Promise<any> {
    const rqp: any = {
      op: '1', // create
      ty: '2', // AE 타입
      pc: {
        "m2m:ae": {
          rn: this.config.ae.name,
          api: this.config.ae.appid,
          rr: 'true',
        },
      },
    };
    return this.sendOneM2MRequest(rqp, this.config.ae.parent);
  }

  /** AE 검색 */
  public async retrieveAE(): Promise<any> {
    const rqp: any = {
      op: '2', // retrieve
      pc: {},
    };
    const target = `${this.config.ae.parent}/${this.config.ae.name}`;
    return this.sendOneM2MRequest(rqp, target);
  }

  /** 컨테이너 생성 (cnt 배열의 index에 해당하는 컨테이너) */
  public async createContainer(index: number): Promise<any> {
    const container = this.config.cnt[index];
    const rqp: any = {
      op: '1', // create
      ty: '3', // container 타입
      pc: {
        "m2m:cnt": {
          rn: container.name,
          lbl: [container.name],
        },
      },
    };
    return this.sendOneM2MRequest(rqp, container.parent);
  }

  /** 구독 삭제 (sub 배열의 index에 해당하는 구독) */
  public async deleteSubscription(index: number): Promise<any> {
    const sub = this.config.sub[index];
    const target = `${sub.parent}/${sub.name}`;
    const rqp: any = {
      op: '4', // delete
      pc: {},
    };
    return this.sendOneM2MRequest(rqp, target);
  }

  /** 구독 생성 (sub 배열의 index에 해당하는 구독) */
  public async createSubscription(index: number): Promise<any> {
    const sub = this.config.sub[index];
    const rqp: any = {
      op: '1', // create
      ty: '23', // subscription 타입
      pc: {
        "m2m:sub": {
          rn: sub.name,
          enc: { net: ['3'] },
          nu: [sub.nu],
          nct: '2',
        },
      },
    };
    return this.sendOneM2MRequest(rqp, sub.parent);
  }

  /** 콘텐츠 인스턴스 생성 (cnt 배열의 index에 해당하는 컨테이너에 content를 생성) */
  public async createContentInstance(
    containerIndex: number,
    content: string,
    socket?: any
  ): Promise<any> {
    const container = this.config.cnt[containerIndex];
    const rqp: any = {
      op: '1', // create
      ty: '4', // 콘텐츠 인스턴스 타입
      pc: {
        "m2m:cin": {
          con: content,
        },
      },
    };
    const target = `${container.parent}/${container.name}`;
    return this.sendOneM2MRequest(rqp, target);
  }
}
