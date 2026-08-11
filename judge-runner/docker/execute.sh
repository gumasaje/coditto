#!/bin/sh

set -eu

project_dir=/workspace/project
gradle_home=/workspace/gradle-home

mkdir -p "$project_dir" "$gradle_home"
cp -R /input/. "$project_dir/"
cp -R /opt/gradle-cache-seed/. "$gradle_home/"

export GRADLE_USER_HOME="$gradle_home"
cd "$project_dir" || exit 30

exec python3 -B /usr/local/lib/coditto-judge/judge_entrypoint.py
