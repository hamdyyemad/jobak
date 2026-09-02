# Hugging Face Docker Space — see README.md for the Space metadata block.
#
# The *stealth* build is the whole point of this image. The public
# `h4ckf0r0day/obscura` image on Docker Hub is compiled without the `stealth`
# cargo feature, and there `--stealth` is a no-op at the TLS layer: measured
# against tls.peet.ws it reorders ClientHello extensions but leaves JA4
# identical (t13d1011h1_61a7ad8aa9b6_3fcd1a44f3e3), with no GREASE and HTTP/1.1
# only. Cloudflare reads that as a library, and Bayt 403s it exactly as it 403s
# undici. The release archives with `-stealth` in the name are a different
# binary — wreq/BoringSSL — and they present a real Chrome ClientHello.
#
# So: pin the release asset, verify it, and never silently fall back to the
# Docker Hub image, which would look like it works and quietly collect nothing.

FROM node:22-bookworm-slim

ARG OBSCURA_VERSION=v0.2.1
ARG OBSCURA_ASSET=obscura-x86_64-linux-no-render-stealth.tar.gz
# GitHub publishes this digest on the release asset; it matched the downloaded
# artifact byte for byte on 2026-09-02. A mismatch here should fail the build.
ARG OBSCURA_SHA256=d3f6b73be9081e5f85f3d1069ffd66dd62f1265caddd54cb5431e9b4cceb1e4d

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# `no-render` drops screenshots, PDF and screencasting — none of which this
# service uses, since every page it reads is parsed as HTML server-side. It is
# also the smaller binary. Swap to `obscura-x86_64-linux-stealth.tar.gz` the day
# a source genuinely needs a rendered DOM.
RUN curl -fsSL -o /tmp/obscura.tar.gz \
      "https://github.com/h4ckf0r0day/obscura/releases/download/${OBSCURA_VERSION}/${OBSCURA_ASSET}" \
    && echo "${OBSCURA_SHA256}  /tmp/obscura.tar.gz" | sha256sum -c - \
    && tar xzf /tmp/obscura.tar.gz -C /usr/local/bin \
    && chmod 0755 /usr/local/bin/obscura /usr/local/bin/obscura-worker \
    && rm /tmp/obscura.tar.gz \
    && /usr/local/bin/obscura --version

# Spaces run the container as uid 1000. The node image already ships a `node`
# user at exactly that uid, so adopt it — `useradd -u 1000` fails here ("UID
# 1000 is not unique"), which is the trap in HF's own Dockerfile example when
# the base image is not a bare distro.
USER node
ENV HOME=/home/node
WORKDIR /home/node/app

COPY --chown=node:node server.mjs ./

# Spaces route external traffic to a single port, 7860 by default.
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.mjs"]
