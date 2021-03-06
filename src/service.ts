import * as core from "@actions/core";
import * as github from "@actions/github";
import buildBody from "./build_body";
import RTD, { IProject } from "./rtd";

export async function deactivateProject(
  translates: IProject[],
  rtd: RTD,
  branch: string,
  githubToken: string,
  project: string
): Promise<void> {
  const context = github.context;
  const octokit = github.getOctokit(githubToken);
  const disabled = await Promise.all(
    translates
      .map((p) => p.slug)
      .map((slug) => {
        return rtd.disableBuild(slug, branch);
      })
  )
    .then((allResult: boolean[]) => {
      return allResult.reduce((l, r) => l || r);
    })
    .catch((e) => {
      octokit.rest.issues.createComment({
        owner: context.issue.owner,
        repo: context.issue.repo,
        issue_number: context.issue.number,
        body: e.message,
      });
      throw e;
    });
  if (disabled) {
    core.info(
      `Successfully disabled RTD build for ${branch} branch in ${project}.`
    );
  } else {
    core.info(
      `RTD build for ${branch} branch in ${project} is already disabled, so no reaction needed.`
    );
  }
}

export async function activateProject(
  translates: IProject[],
  rtd: RTD,
  branch: string,
  githubToken: string,
  project: string
): Promise<void> {
  const context = github.context;
  const octokit = github.getOctokit(githubToken);
  const enabled = await Promise.all(
    translates
      .map((p) => p.slug)
      .map((slug) => {
        return rtd.enableBuild(slug, branch);
      })
  )
    .then((allResult: boolean[]) => {
      return allResult.reduce((l, r) => l || r);
    })
    .catch((e) => {
      octokit.rest.issues.createComment({
        owner: context.issue.owner,
        repo: context.issue.repo,
        issue_number: context.issue.number,
        body: e.message,
      });
      throw e;
    });

  if (enabled) {
    core.info(
      `Reporting document URL to GitHub PR page of ${branch} branch in ${project}.`
    );
    const body = buildBody(
      context.payload.pull_request?.body || "",
      project,
      branch,
      translates.map((t) => t.language)
    );
    octokit.rest.issues.update({
      owner: context.issue.owner,
      repo: context.issue.repo,
      issue_number: context.issue.number,
      body,
    });
  } else {
    core.info(
      `RTD build for ${branch} branch in ${project} is already activated, so no reaction needed.`
    );
  }
}
