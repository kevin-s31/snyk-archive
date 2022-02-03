#!/usr/bin/env node

"use strict";

import { requestSnykAndGithubTokens, getSnykOrgs, requestSnykOrganisationsToTidy, getSnykProjectsFromOrganisation, findGitHubProjectsScannedBySnyk, isGitHubRepositoryArchivedOrDeleted, requestToDeleteTheSnykProject } from "./index.js";

// These are used to minimise the amount API calls we make to GitHub
// We check if a repository first exists in one of these arrays
// If it does then we don't need to make another API call to GitHub
let globalActive = [];
let globalArchivedRepos = [];

// Used to inform the user how many projects they tidied up
let globalDeactivationCount = 0;

const { githubToken, snykToken } = await requestSnykAndGithubTokens();

const allAvailableSnykOrganisations = await getSnykOrgs(snykToken);

const { chosenSnykOrganisations } = await requestSnykOrganisationsToTidy(allAvailableSnykOrganisations)

for (const organisation of chosenSnykOrganisations) {
  const name = organisation.name;
  const slug = organisation.slug;

  console.log(`Scanning snyk org named ${name}`);

  const projects = await getSnykProjectsFromOrganisation(
    snykToken,
    organisation.id
  );
  const repositories = findGitHubProjectsScannedBySnyk(projects);
  console.log(`Found ${repositories.length} GitHub repositories being scanned in ${name}`);

  let archivedRepos = [];
  let deactivationCount = 0;
  for (const repository of repositories) {
    // If we already know the repository is active then we can skip past it
    if (globalActive.find((repo) => repo.name === repository.name)) {
      continue;
    }
    const archivedOrDeleted = globalArchivedRepos.find((repo) => repo.name === repository.name) || await isGitHubRepositoryArchivedOrDeleted(
      githubToken,
      repository.name
    );

    if (archivedOrDeleted) {
      archivedRepos.push(repository);
      globalArchivedRepos.push(repository);
      deactivationCount = await requestToDeleteTheSnykProject(
        repository,
        organisation,
        slug,
        snykToken
      );
    } else {
      globalActive.push(repository);
    }
  }

  globalDeactivationCount += deactivationCount

  if (archivedRepos.length === 0) {
    console.log(
      `All of the GitHub repositories being scanned in ${name} are unarchived - there is nothing to tidy up - nice work!`
    );
  } else {
    console.log(
      `You tidied up ${deactivationCount} out of a possible ${archivedRepos.length} projects`
    );
  }
  console.log();
}
console.log(
  `All done -- you tidied up ${globalDeactivationCount} out of a possible ${globalArchivedRepos.length} projects`
);
