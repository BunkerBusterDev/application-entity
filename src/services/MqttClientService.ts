// MqttClientService.ts
import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import * as xml2js from 'xml2js';
import * as cbor from 'cbor';
import shortid from 'shortid';
import js2xmlparser from 'js2xmlparser';

export interface MqttConfig {
  host: string;
  port: number;
  protocol: 'mqtt' | 'mqtts';
  username?: string;
  password?: string;
  keepalive: number;
  clientId?: string;
  clean: boolean;
  reconnectPeriod: number;
  connectTimeout: number;
  key?: Buffer;
  cert?: Buffer;
  rejectUnauthorized: boolean;
}

/**
 * MQTT 메시지 핸들러의 시그니처
 */
export type MqttMessageHandler = (topic: string, message: any) => void;

interface PendingRequest {
  resolve: (msg: any) => void;
  reject: (err: Error) => void;
  path: string;
}

/**
 * MQTT 연결, 구독, 발행 및 메시지 디스패칭을 담당하는 서비스
 */
export class MqttClientService extends EventEmitter {
  private client: MqttClient;
  private config: MqttConfig;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  public notificationHandler?: MqttMessageHandler;

  constructor(config: MqttConfig) {
    super();
    this.config = config;
    this.client = mqtt.connect({
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      username: config.username,
      password: config.password,
      keepalive: config.keepalive,
      clientId: config.clientId,
      clean: config.clean,
      reconnectPeriod: config.reconnectPeriod,
      connectTimeout: config.connectTimeout,
      key: config.key,
      cert: config.cert,
      rejectUnauthorized: config.rejectUnauthorized,
    });

    this.client.on('connect', () => {
      console.log('MQTT connected');
      this.emit('connect');
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  public subscribe(topics: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.subscribe(topics, (err) => {
        if (err) reject(err);
        else {
          console.log('Subscribed to topics:', topics);
          resolve();
        }
      });
    });
  }

  public publish(topic: string, message: string | Buffer): void {
    this.client.publish(topic, message);
  }

  /**
   * 지정한 토픽으로 메시지를 발행한 후 고유 rqi에 해당하는 응답을 기다립니다.
   */
  public sendRequest(
    topic: string,
    message: string | Buffer,
    rqi: string,
    path: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // 요청에 대한 응답을 보관
      this.pendingRequests.set(rqi, { resolve, reject, path });
      this.publish(topic, message);
      // 타임아웃 (예: 5초)
      setTimeout(() => {
        if (this.pendingRequests.has(rqi)) {
          this.pendingRequests.delete(rqi);
          reject(new Error('Timeout waiting for response'));
        }
      }, 5000);
    });
  }

  /**
   * 수신된 메시지를 파싱한 후 응답 메시지(또는 알림)를 처리합니다.
   */
  private async handleMessage(topic: string, message: Buffer) {
    let parsedMessage: any;
    // 우선 JSON으로 파싱을 시도
    try {
      parsedMessage = JSON.parse(message.toString());
    } catch (e) {
      // JSON 파싱 실패 시 XML 파싱 시도
      try {
        const parser = new xml2js.Parser({ explicitArray: false });
        parsedMessage = await parser.parseStringPromise(message.toString());
      } catch (e2) {
        // XML 파싱 실패 시 CBOR 파싱 시도
        try {
          parsedMessage = await cbor.decodeFirst(message);
        } catch (e3) {
          console.error('Failed to parse message:', e3);
          return;
        }
      }
    }

    // 응답 메시지 (예: /oneM2M/resp/ 또는 /oneM2M/reg_resp/)인지, 알림 메시지 (/oneM2M/req/)인지 판별
    if (topic.includes('/resp/') || topic.includes('/reg_resp/')) {
      // 응답 메시지 – m2m:rsp 객체 내 rqi 필드 기준 매칭
      const rqi = parsedMessage['m2m:rsp']?.rqi || parsedMessage.rqi;
      if (rqi && this.pendingRequests.has(rqi)) {
        const pending = this.pendingRequests.get(rqi)!;
        this.pendingRequests.delete(rqi);
        pending.resolve(parsedMessage);
      } else {
        console.warn('No pending request for rqi:', rqi);
      }
    } else if (topic.includes('/req/')) {
      // 알림 메시지 – 별도 핸들러로 위임
      if (this.notificationHandler) {
        this.notificationHandler(topic, parsedMessage);
      } else {
        console.log('Notification received on topic:', topic, parsedMessage);
      }
    } else {
      console.log('Received message on unsupported topic:', topic);
    }
  }
}
