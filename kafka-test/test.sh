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
logagent --config ../logagent-kafka-input.yml | tee output.txt & 
sleep 5
node producer-ssl.js
grep -m 1 "message : 1" output.txt 
