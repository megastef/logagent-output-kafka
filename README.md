## Logagent Plugin: Apache Kafka

Output plugin for [@sematext/logagent](http://sematext.com/logagent/). The plugin acts as message producer for Apache Kafka.
This project is specular project of [@sematext/logagent-input-kafka](https://github.com/megastef/logagent-input-kafka)

## Installation 

Install [@sematext/logagent](https://www.npmjs.com/package/@sematext/logagent) and [logagent-input-kafka](https://www.npmjs.com/package/logagent-output-kafka) npm package: 

```
npm i -g @sematext/logagent 
npm i -g logagent-output-kafka
```
 
### Configuration

```
# Global options
options:
  includeOriginalLine: false

input:
  stdin: true

output:
  kafka: 
   module: logagent-output-kafka
   kafkaHost: localhost
   topic: test
   requireAcks: 1
   sslEnable: false
   sslOptions: 
      - rejectUnauthorized: false

```

Start logagent

```
logagent --config logagent-kafka-output.yaml
```
