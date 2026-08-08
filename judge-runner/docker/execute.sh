#!/bin/sh

set -eu

project_dir=/workspace/project
gradle_home=/workspace/gradle-home

mkdir -p "$project_dir" "$gradle_home"
cp -R /input/. "$project_dir/"
cp -R /opt/gradle-cache-seed/. "$gradle_home/"

export GRADLE_USER_HOME="$gradle_home"
cd "$project_dir" || exit 30

echo "judge stage: compile" >&2
if ! gradle --offline --no-daemon --console=plain --max-workers=1 compileJava compileTestJava; then
    exit 20
fi

echo "judge stage: test" >&2
if ! gradle --offline --no-daemon --console=plain --max-workers=1 test; then
    exit 21
fi
