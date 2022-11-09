# latest-version

[![Try Run This Action](https://github.com/mogeko/latest-version/actions/workflows/run.yml/badge.svg)](https://github.com/mogeko/latest-version/actions/workflows/run.yml)

A GitHub Action that checks and outputs the latest version of the specified repo.

We require a GitHub repo name in the format `{owner}/{repo}`. Whenever this script runs, the version information of the target repo (`master`/`main` branch and [Git Tags](https://git-scm.com/book/en/v2/Git-Basics-Tagging)) will be checked and a **version information report** will be generated. At the same time, we will compare it with the existing reports in the [workflows cache](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows) to determine whether the target repo is updated.

By the way, we will output an output that can be understood by [the `tags` input option](https://github.com/marketplace/actions/docker-metadata-action#tags-input) of the GitHub Action [`docker/metadata-action`](https://github.com/marketplace/actions/docker-metadata-action). It can help you manage your Docker Image tags if you need.

> **Note**
>
> We use [`@actions/cache`](https://github.com/actions/toolkit/tree/main/packages/cache) to help us determine whether the target repo has been updated. However, due to the limitations of GitHub Action, **we can only pull reports less than 7 days old** and compare them; that is, **the interval between running this script should be less than 7 days**.

## Input

| Input  | Type   | Required? | Description                        |
| ------ | ------ | --------- | ---------------------------------- |
| `repo` | String | Yes       | The repo that needs to be watched. |

The repo should be formatted like `{owner}/{repo}`. For example, the repo `https://github.com/mogeko/latest-version` should be written as `mogeko/latest-version`.

## Output

### `is_update` output

Determine whether the target repo is updated based on the results of the check and the previous reports in the cache.

Use with the `if` of GitHub Actions workflows:

```yml
if: needs.check.outputs.is_update == 'true'
```

### `stable_ver` output

The latest stable version of the tracked repo.

If `.versions.latest` exists, it is always equal to `versions.latest.name`; otherwise, degenerates to `.versions.edge.short_sha`.

### `result` output

Version information report output in JSON format.

At the same time, we will also output it as a file to `./.latest-version/index.json`.

It will look like this:

```json
{
  "repo": {
    "name": "mogeko/latest-version",
    "url": "https://github.com/mogeko/latest-version"
  },
  "stable_version": "v1.0.1",
  "versions": {
    "latest": {
      "name": "v1.0.1",
      "sha": "f16f36e0c1786a1bf1603d0c28926dbf41fb956c",
      "short_sha": "f16f36e"
    },
    "edge": {
      "name": "master",
      "sha": "f16f36e0c1786a1bf1603d0c28926dbf41fb956c",
      "short_sha": "f16f36e"
    }
  },
  "timestamp": "2022-11-09T03:03:17.517Z"
}
```

### `docker_tags` output

An onput that can be understood by [the `tags` input option](https://github.com/marketplace/actions/docker-metadata-action#tags-input) of the GitHub Action [`docker/metadata-action`](https://github.com/marketplace/actions/docker-metadata-action) based on the version report. Includes `latest`, `edge`, version number, hash value (short) of commit, etc.

Among them, `latest` and version number correspond to the [Git Tags](https://git-scm.com/book/en/v2/Git-Basics-Tagging) of the target repo, and `edge` corresponds to the `master`/`main` branch of the target repo.

Here is an example of this output:

```txt
type=raw,value=v0.2.1,enable=false
type=raw,value=148b201,enable=false
type=raw,value=latest,enable=false
type=raw,value=edge,enable=true
type=raw,value=ceb2a31,enable=true
```

you can use it like this:

```yml
tags: |
  type=schedule,pattern={{date 'YYYYMMDD'}}
  ${{ needs.check.outputs.docker_tags }}
```

## Example

Here is a complete example of using this GitHub Action:

```yml
on:
  schedule:
    - cron: "30 0 * * *" # Triggers the workflow every day at 0:30 UTC
  workflow_dispatch: # Allow manual trigger workflows

jobs:
  check:
    name: Check Version
    runs-on: ubuntu-latest
    outputs:
      # output as this job,
      # see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idoutputs
      is_update: ${{ steps.check_ver.outputs.is_update }}
      result: ${{ steps.check_ver.outputs.result }}
      docker_tags: ${{ steps.check_ver.outputs.docker_tags }}
    steps:
      - uses: mogeko/latest-version@v1
        id: check_ver
        with:
          repo: mogeko/latest-version

  print: # Just for show the output
    name: Print the result from check
    runs-on: ubuntu-latest
    needs: check
    steps:
      - run: |
          echo '${{ needs.check.outputs.is_update }}'
          echo '${{ needs.check.outputs.result }}' | jq '.'
          echo '${{ needs.check.outputs.docker_tags }}'

  docker:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: check
    if: needs.check.outputs.is_update == 'true'
    steps:
      - uses: actions/checkout@v3
      # see https://github.com/marketplace/actions/docker-login
      - uses: docker/login-action@v2.0.0
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      # see https://github.com/marketplace/actions/docker-metadata-action
      - uses: docker/metadata-action@v4.0.1
        id: meta
        with:
          images: |
            ${{ github.repository_owner }}/latest-version
          tags: |
            type=schedule,pattern={{date 'YYYYMMDD'}}
            ${{ needs.check.outputs.docker_tags }}
        # see https://github.com/marketplace/actions/build-and-push-docker-images
      - uses: docker/build-push-action@v3
        with:
          context: .
          tags: ${{ steps.meta.outputs.tags }}
```

## LICENSE

The code in this project is released under the [MIT License](./LICENSE).
