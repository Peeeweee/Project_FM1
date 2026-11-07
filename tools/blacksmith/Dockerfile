FROM python:3.13-slim-bookworm@sha256:413041be39649714885528a06586416279db85744b6dcdf290af0ae557d782f6
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev libstdc++6 pkg-config libraqm-dev libjpeg-dev zlib1g-dev libfreetype6-dev xz-utils && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir --no-binary=Pillow Pillow==11.3.0 fonttools==4.60.1
COPY toolchain.tar.xz /tmp/toolchain.tar.xz
RUN mkdir -p /opt/jieli && tar -xJf /tmp/toolchain.tar.xz --strip-components=1 -C /opt/jieli && rm /tmp/toolchain.tar.xz
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 JIELI_DOCKER=0 JIELI_TOOLCHAIN=/opt/jieli AC79_SDK=/sdk
WORKDIR /work
