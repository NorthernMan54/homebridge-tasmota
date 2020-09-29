var mqttClient = require('mqtt');

var config = {
  mqttHost: 'mqtt.local'
};

var options = {
  username: config['mqttUsername'] || "",
  password: config['mqttPassword'] || ""
}
var connection = mqttClient.connect('mqtt://' + config.mqttHost, options);

var topic = 'tasmota-4214/cmnd/';   // This is my test device

async function sendMessage(message, sleepTime, description) {
  var sendTopic = topic + message.split(' ')[0];
  connection.publish(sendTopic, message.split(' ')[1]);
  console.log('Sending %s %s -> %s', sendTopic, message.split(' ')[1], description);
  await sleep(sleepTime);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

async function test() {
  await sendMessage('setoption19 1', 10, 'Add device');
  await sendMessage('setoption30 1', 10, 'Change to lamp');
  await sendMessage('setoption30 0', 10, 'Change to switch');
  await sendMessage('setoption30 1', 10, 'Change to lamp');
  await sendMessage('setoption30 0', 10, 'Change to switch');
  await sendMessage('setoption19 0', 1, 'Remove device');
  process.exit();
}

test();
