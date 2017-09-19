cd kafka-test
docker-compose version 
docker version
export KAFKA_ADVERTISED_HOST_NAME=127.0.0.1
if [[ "$(docker ps)" =~ "kafka" ]]; then 
  docker-compose stop && true
  docker-compose rm -f && true
fi 
docker-compose up -d 
sleep 25
logagent --config ../logagent-kafka-output.yml <<< "Hi from logagent example" & 
sleep 5
node consumer.js
sleep 5
grep -m 1 "logagent example" output.txt 
