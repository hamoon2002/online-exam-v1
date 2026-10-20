# Build official, fixed upstream releases: public prebuilt images are no longer reliable.
# Sources and AGPL-3.0 license: https://github.com/minio/minio and https://github.com/minio/mc
FROM golang:1-bookworm AS minio-build
RUN CGO_ENABLED=0 go install -p 2 github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z
FROM golang:1-bookworm AS mc-build
RUN CGO_ENABLED=0 go install -p 2 github.com/minio/mc@RELEASE.2025-08-13T08-35-41Z
FROM alpine:3 AS minio
RUN apk add --no-cache ca-certificates && mkdir -p /data
COPY --from=minio-build /go/bin/minio /usr/local/bin/minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
FROM alpine:3 AS mc
RUN apk add --no-cache ca-certificates
COPY --from=mc-build /go/bin/mc /usr/local/bin/mc
ENTRYPOINT ["mc"]
