FROM gradle:8.10.2-jdk21 AS dependency-cache

USER gradle
WORKDIR /seed-project
COPY --chown=gradle:gradle problems/role-update-001/v1/base/ ./
COPY --chown=gradle:gradle judge-runner/testdata/fixed/ ./
COPY --chown=gradle:gradle problems/role-update-001/v1/judge-only/target-tests/ /judge-tests/target-tests/
COPY --chown=gradle:gradle problems/role-update-001/v1/judge-only/regression-tests/ /judge-tests/regression-tests/
RUN gradle --no-daemon --console=plain test

FROM gradle:8.10.2-jdk21

USER root
COPY --from=dependency-cache --chown=gradle:gradle /home/gradle/.gradle /opt/gradle-cache-seed
COPY judge-runner/docker/execute.sh /usr/local/bin/coditto-judge-execute
RUN chmod 0555 /usr/local/bin/coditto-judge-execute

USER 1000:1000
ENTRYPOINT ["/usr/local/bin/coditto-judge-execute"]
