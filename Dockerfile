#====================================================================#
#
#       Description:
#           Dockerfile for EdgeBox Updater.
#
#       Notes: Copyright 2022 Sony Semiconductor Solutions Corporation
#
#====================================================================#

FROM kmn18/runtime-env:kmn18_1.0.0-0 as builder

WORKDIR /root
RUN apt update
RUN apt install -y wget
RUN wget -q https://nodejs.org/dist/v16.14.0/node-v16.14.0-linux-arm64.tar.xz


FROM kmn18/runtime-env:kmn18_1.0.0-0

WORKDIR /root
COPY --from=builder /root/node-v16.14.0-linux-arm64.tar.xz /root/
RUN xz -dc node-v16.14.0-linux-arm64.tar.xz | tar xf -
RUN cp -ra node-v16.14.0-linux-arm64/bin/* /usr/local/bin/
RUN cp -ra node-v16.14.0-linux-arm64/lib/* /usr/local/lib/
RUN cp -ra node-v16.14.0-linux-arm64/include/* /usr/local/include/
RUN cp -ra node-v16.14.0-linux-arm64/share/* /usr/local/share/
RUN rm -rf node-v16.14.0-linux-arm64 node-v16.14.0-linux-arm64.tar.xz

WORKDIR /root
COPY src/*.js src/*.json src/
COPY v1/*.proto v1/
COPY edgebox-agent-stub/kpj-edgebox-agent/v1/*.proto edgebox-agent-stub/kpj-edgebox-agent/v1/
COPY system-service-stub/kpj-system-utility/EBSystemService/v1/*.proto system-service-stub/kpj-system-utility/EBSystemService/v1/

WORKDIR /root/src
RUN npm ci --production

CMD ["node", "main.js"]
