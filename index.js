"use strict";

import fetch from "node-fetch";
import pkg from "prompts";
const { prompt } = pkg;

export async function getSnykProjectsFromOrganisation(snykToken, organisationId) {
  const res = await fetch(
    `https://snyk.io/api/v1/org/${organisationId}/projects`,
    {
      headers: {
        Authorization: snykToken,
      },
    }
  );
  if (!res.ok) {
    console.error(`response (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const { projects } = await res.json();
  return projects;
}

export function findGitHubProjectsScannedBySnyk(projects) {
  const githubScannedProjects = projects.flatMap((project) => {
    if (project.origin === "github" && project.isMonitored) {
      return {
        name: project.name.split(":")[0],
        id: project.id,
      };
    } else if (project.origin === "cli" && project.isMonitored) {
      return {
        name: project.remoteRepoUrl.split(".")[0],
        id: project.id,
      };
    } else {
      return [];
    }
  });
  const uniqueGithubScannedProjects = Array.from(
    new Set(githubScannedProjects)
  );
  return uniqueGithubScannedProjects;
}

export async function isGitHubRepositoryArchivedOrDeleted(
  githubToken,
  repositoryName
) {
  const url = `https://api.github.com/repos/${repositoryName}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${githubToken}`,
    },
  });
  // 404 means the repository was deleted
  if (res.status === 404) {
    return true;
  }
  if (!res.ok) {
    console.error(
      `${url} response (${
        res.status
      }): ${await res.text()} --- x-ratelimit-reset: ${res.headers.get(
        "x-ratelimit-reset"
      )} x-ratelimit-limit: ${res.headers.get("x-ratelimit-limit")}`
    );
    process.exit(1);
  }
  const { archived } = await res.json();
  return archived;
}

export async function getSnykOrgs(snykToken) {
  const res = await fetch(`https://snyk.io/api/v1/orgs`, {
    headers: {
      Authorization: snykToken,
    },
  });

  if (!res.ok) {
    console.error(`response (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const { orgs } = await res.json();
  return orgs;
}

export async function requestToDeleteTheSnykProject(
  repository,
  snykOrg,
  snykOrgSlug,
  SNYK_TOKEN,
  deactivationCount
) {
  const { remove } = await prompt([
    {
      type: "confirm",
      name: "remove",
      message: `The GitHub repository https://github.com/${repository.name} is archived - shall we remove the Snyk scanning? https://app.snyk.io/org/${snykOrgSlug}/project/${repository.id}`,
      initial: false,
    },
  ]);
  if (!remove) {
    return deactivationCount;
  }
  const url = `https://snyk.io/api/v1/org/${snykOrgSlug}/project/${repository.id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: SNYK_TOKEN,
    },
  });
  if (!res.ok) {
    console.error(`${url} response (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  return deactivationCount + 1;
}

export async function requestSnykAndGithubTokens(){
    return await prompt([
        {
          type: "password",
          name: "snykToken",
          message: `What's your Snyk API key?`,
          // validate: key => /^\p{Hex_Digit}{8}-\p{Hex_Digit}{4}-\p{Hex_Digit}{4}-\p{Hex_Digit}{4}-\p{Hex_Digit}{12}$/u.test(key) ? true : `Your key looks to be invalid - if you think this is wrong please contact Jake Champion`
        },
        {
          type: "password",
          name: "githubToken",
          message: `What's your GitHub API key?`,
        },
      ]);
}

export async function requestSnykOrganisationsToTidy(allAvailableSnykOrganisations){
    return await prompt([
        {
          type: "multiselect",
          name: "chosenSnykOrganisations",
          message: "Pick Snyk organisations to tidy up",
          choices: allAvailableSnykOrganisations.map((org) => {
            return {
              title: org.name,
              value: org,
            };
          }),
        },
      ]);
}
