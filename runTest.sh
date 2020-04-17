K6SCRIPT=${1:-script.js}
export $(grep -v '^#' secrets.properties | xargs)
docker run --rm -v ${PWD}:/app -w /app -e ROOT_USR=$root_user -e ROOT_PWD=$root_password loadimpact/k6 run $K6SCRIPT
