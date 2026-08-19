FROM gradle:8.10.2-jdk21 AS dependency-cache

USER root
RUN install -d -o gradle -g gradle /seed-project /opt/coditto-gradle-cache
ENV GRADLE_USER_HOME=/opt/coditto-gradle-cache
USER gradle
WORKDIR /seed-project
COPY --chown=gradle:gradle problems/role-update-001/v1/base/ ./
COPY --chown=gradle:gradle judge-runner/testdata/fixed/ ./
COPY --chown=gradle:gradle problems/role-update-001/v1/judge-only/target-tests/ /judge-tests/target-tests/
COPY --chown=gradle:gradle problems/role-update-001/v1/judge-only/regression-tests/ /judge-tests/regression-tests/
RUN gradle --no-daemon --console=plain test

FROM gradle:8.10.2-jdk21

USER root
COPY --from=dependency-cache --chown=gradle:gradle /opt/coditto-gradle-cache /opt/gradle-cache-seed
COPY judge-runner/docker/execute.sh /usr/local/bin/coditto-judge-execute
COPY judge-runner/docker/judge_entrypoint.py /usr/local/lib/coditto-judge/judge_entrypoint.py
RUN chmod 0555 /usr/local/bin/coditto-judge-execute \
    /usr/local/lib/coditto-judge/judge_entrypoint.py

USER 1000:1000
ENTRYPOINT ["/usr/local/bin/coditto-judge-execute"]
