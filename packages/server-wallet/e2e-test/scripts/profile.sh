#!/bin/bash
set -e
set -u

yarn prepare

if [ -d ./.clinic ]; then
  echo "Deleting .clinic folder"
  rm -r ./.clinic
fi

echo "Generating flamegraph"
 NODE_ENV=test npx ts-node ./e2e-test/scripts/generate-profile-data.ts flamegraph
npx clinic flame --visualize-only .clinic/*.clinic-flame

echo "Generating bubbleprof"
NODE_ENV=test npx ts-node ./e2e-test/scripts/generate-profile-data.ts bubbleprof
npx clinic bubbleprof --visualize-only .clinic/*.clinic-bubbleprof

echo "Generating doctor"
NODE_ENV=test npx ts-node ./e2e-test/scripts/generate-profile-data.ts doctor
npx clinic doctor --visualize-only .clinic/*.clinic-doctor
