// build commonServiceEntity
const commonServiceEntity = {
    id: '/CommonServiceEntity',
    name: 'CommonServiceEntity',
    host: 'ip',
    useProtocol: 'mqtt',
    port: 7579,
    mqttPort: 1883,
};

// build applicationEntity
const aeName = 'SensingAE';
const applicationEntity = {
    state: 'createAE',
    parent: `/${commonServiceEntity.name}`,
    name: `${aeName}`,
    id: `S${aeName}`,
    appID: `${aeName}AppId`,
    ip: 'ip',
    port: 0,
    thingPort: 0,
    bodyType: 'json',
};

// build container
interface iConatinerArray {
    parent: string;
    name: string;
}
const containerArray: Array<iConatinerArray> = [];

// in SensingAE
let count = 0;
containerArray[count++] = {
    parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
    name: `container_rgbIllum`,
};
containerArray[count++] = {
    parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
    name: `container_rgbCCT`,
};
containerArray[count++] = {
    parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
    name: `container_intIllum`,
};
containerArray[count++] = {
    parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
    name: `container_intPower`,
};

// const numIntIllum = 9;
// for (let i = 0; i < numIntIllum; i++) {
//     containerArray[count++] = {
//         parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
//         name: `container_intIllum_${i + 1}`,
//     };
// }
// const numRgbIllum = 9;
// for (let i = 0; i < numRgbIllum; i++) {
//     containerArray[count++] = {
//         parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
//         name: `container_rgbIllum_${i + 1}`,
//     };
// }
// const numRgbCCT = 9;
// for (let i = 0; i < numRgbCCT; i++) {
//     containerArray[count++] = {
//         parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
//         name: `container_rgbCCT_${i + 1}`,
//     };
// }
// const numIntPower = 10;
// for (let i = 0; i < numIntPower; i++) {
//     containerArray[count++] = {
//         parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
//         name: `container_intPower_${i + 1}`,
//     };
// }


// in ControlAE
// const numLED = 5;
// for (let i = 0; i < numLED; i++) {
//     containerArray[count+i] = {
//         parent: `/${commonServiceEntity.name}/${applicationEntity.name}`,
//         name: `container_led_${i + 1}`,
//     };
// }

// build subscription
interface iSubscriptionArray extends iConatinerArray {
    nu: string;
}
const subscriptionArray: Array<iSubscriptionArray> = [];
// for (let i = 0; i < numLED; i++) {
//     if (commonServiceEntity.useProtocol === 'http') {
//         subscriptionArray[i] = {
//             parent: `/${commonServiceEntity.name}/${applicationEntity.name}/${containerArray[count+i].name}`,
//             name: `subscription_led_${i + 1}`,
//             nu: `http://${applicationEntity.ip}:${applicationEntity.port}/noti?ct=json`,
//         };
//     } else if (commonServiceEntity.useProtocol === 'mqtt') {
//         subscriptionArray[i] = {
//             parent: `/${commonServiceEntity.name}/${applicationEntity.name}/${containerArray[count+i].name}`,
//             name: `subscription_led_${i + 1}`,
//             nu: `mqtt://${commonServiceEntity.host}/${applicationEntity.id}?ct=${applicationEntity.bodyType}`,
//         };
//     }
// }

const config = {
    commonServiceEntity: commonServiceEntity,
    applicationEntity: applicationEntity,
    containerArray: containerArray,
    subscriptionArray: subscriptionArray
}

export = config;