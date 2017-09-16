'use strict'

var uuid = require('uuid')
var async = require('async')
var kafka = require('kafka-node')
var safeStringify = require('fast-safe-stringify')

// replacement for Logagent consoleLogger, which logs only to stderr stream
// to keep stdin free for data pipelines
function logToErrorStream (message) {
  console.error(new Date().toISOString(), message)
}
var consoleLogger = {
  log: logToErrorStream,
  debug: logToErrorStream,
  error: logToErrorStream
}

/**
 * Constructor called by logagent
 * @config cli arguments and config.configFile entries
 * @eventEmitter logagent eventEmitter object
 */
function OutputKafka (config, eventEmitter) {
  this.config = config
  var producer = this.getProducer(config)
  this.config.producer = producer
  this.eventEmitter = eventEmitter
}

OutputKafka.prototype.getProducer = function (config) {
  var producer
  if (!producer) {
    // TODO error handling

    var KafkaClient = kafka.Client
    var KafkaProducer = kafka.Producer
    let requireAcksFlag = config.requireAcks
    let kafkaHost = config.kafkaHost
    var clientId = 'kafka-logagent-producer-' + uuid.v4()
    var sslOptions
    if (config.sslEnable) {
      sslOptions = config.sslOptions[0]
    }
    var client = new KafkaClient(kafkaHost, clientId, undefined, undefined, sslOptions)
    // 0 = No ack required
    // 1 = Leader ack required
    // -1 = All in sync replicas ack required
    producer = new KafkaProducer(client, { requireAcks: requireAcksFlag })
  }

  //https://github.com/SOHU-Co/kafka-node/issues/117
  //To test reconnect configuration cause 
  consoleLogger.log('start Kafka Producer')
  return producer
}

OutputKafka.prototype.eventHandler = function (data, context) {
  var producer = this.config.producer
  var topic = this.config.topic || [ this.config.topic ]
  // here is possible to declare partition where's possibile to write
  // example of request  { topic: topic, partition: p, messages: [data, keyedMessage], attributes: a }
  producer.send([
    {topic: topic, messages: safeStringify(data)}
  ], function (err, result) {
    consoleLogger.log(err || result)
  })
}

OutputKafka.prototype.start = function () {
  this.eventEmitter.on('data.parsed', this.eventHandler.bind(this))
}

OutputKafka.prototype.stop = function (cb) {
  this.eventEmitter.removeListener('data.parsed', this.eventHandler)
  async.each([this.config.producer], function (producer, callback) {
    consoleLogger.log('closing kafka producer')
    producer.close()
  })
  cb()
}

module.exports = OutputKafka
