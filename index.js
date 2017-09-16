/**
 * Original Author: https://github.com/fbalicchia
 * https://github.com/sematext/logagent-js/pull/81
 * https://github.com/sematext/logagent-js/pull/77
 */
'use strict'
var uuid = require('uuid')
var async = require('async')
var ConsumerGroup = require('kafka-node').ConsumerGroup

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
function InputKafka (config, eventEmitter) {
  this.config = config
  this.eventEmitter = eventEmitter
}
/**
 * Plugin start function, called after constructor
 *
 */
InputKafka.prototype.start = function () {
  if (!this.started) {
    this.started = true
    this.createServer()
    consoleLogger.log('kafka input plugin started')
  }
}

InputKafka.prototype.createServer = function () {
  let kafkaHost = this.config.kafkaHost
  let groupId = this.config.groupId
  let topic = this.config.topics || [ this.config.topic ]
  let sessionTimeout = this.config.sessionTimeout
  let autoCommit = this.config.autoCommit
  let protocol = this.config.protocol || 'roundrobin'
  let self = this
  if (!kafkaHost) {
    throw new Error ("No kafkaHost value defined in configuration")
  }
  if (!topic[0]) {
    throw new Error ("No topic value defined in configuration")
  }
  consoleLogger.log('Init kafka consumer')
  var consumerOptions = {
    kafkaHost: kafkaHost,
    groupId: groupId,
    autoCommit: autoCommit,
    sessionTimeout: sessionTimeout,
    // Strategy to Assign partition possible value can be "range" or "roundrobin"
    protocol: [protocol], // default: ['roundrobin'],
    // Offsets to use for new groups other options could be 'earliest' or 'none'
    // (none will emit an error  if no offsets were saved)
    // equivalent to Java client's auto.offset.reset
    // From kafka documentation
    // What to do when there is no initial offset in ZooKeeper or if an offset is out of range:
    // * smallest : automatically reset the offset to the smallest offset
    // * largest : automatically reset the offset to the largest offset
    // * anything else: throw exception to the consumer
    fromOffset: this.config.fromOffset || 'earliest',
    connectRetryOptions: {
      forever: true
    }
  }

  if (this.config.sslEnable) {
    consumerOptions = Object.assign({ssl: this.config.sslOptions[0]}, consumerOptions)
  }
  let topics = topic
  let consumerId = 'kafka-logagent-consumer' + uuid.v4()
  var consumerGroup = new ConsumerGroup(Object.assign({id: consumerId}, consumerOptions), topics)
  this.config.consumerGroup = consumerGroup
  consumerGroup.on('error', onError)
  consumerGroup.on('message', function (message) {
    self.eventEmitter.emit('data.raw', message.value.toString(), {sourceName: 'kafka ' + kafkaHost, topic: message.topic, partition: message.partition, offset: message.offset})
  })
  consoleLogger.log('start kafka consumer ')
}

function onError (error) {
  consoleLogger.error(error)
  consoleLogger.error(error.stack)
}

/**
 * Plugin stop function, called when logagent terminates
 * we close kafka consumer.
 */
InputKafka.prototype.stop = function (cb) {
  async.each([this.config.consumerGroup], function (consumer, callback) {
    consoleLogger.log('closing kafka consumer')
    consumer.close(true, callback)
  })
  this.start = false
  cb()
}
module.exports = InputKafka