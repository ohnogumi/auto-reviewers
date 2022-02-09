const fs = require("fs");
const readline = require("readline");
const core = require("@actions/core");
const github = require("@actions/github");
const minimatch = require("minimatch");

async function run() {
  try {
    const token = core.getInput("token");
    const config = core.getInput("config");
    const octokit = github.getOctokit(token);

    // get changed files
    const listFilesResponse = await octokit.rest.pulls.listFiles({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number,
    });
    const changedFiles = listFilesResponse.data.map((f) => f.filename);

    // read config
    // https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-on-github/about-code-owners
    const noms = [];
    const reader = readline.createInterface({
      input: fs.createReadStream(config),
    });
    for await (const line of reader) {
      // delete comment and split line
      const splitLine = line.replace(/#.*$/, "").split(/( +|\t+)/);
      if (splitLine.length < 2) {
        continue;
      }
      if (
        minimatch.match(changedFiles, splitLine[0], { matchBase: true })
          .length > 0
      ) {
        noms.push(...splitLine.slice(1));
      }
    }

    // divide reviewers and teams
    const reviewers = [];
    const teamReviewers = [];
    const teamPrefix = `@${github.context.repo.owner}/`;
    const teamRegex = new RegExp(`^${teamPrefix}`);
    for await (const nom of noms) {
      if (!nom.startsWith("@")) {
        continue;
      }
      if (nom.startsWith(teamPrefix)) {
        teamReviewers.push(nom.replace(teamRegex, ""));
      } else {
        reviewers.push(nom.replace(/^@/, ""));
      }
    }

    // get reviewers
    const { data: pr } = await octokit.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number,
    });
    console.log(pr.requested_reviewers, pr.requested_teams);
    pr.requested_reviewers.forEach((value) => {
      reviewers.push(value.login);
    });
    pr.requested_teams.forEach((value) => {
      teamReviewers.push(value.name);
    });
    console.log(JSON.stringify(github.context));
    //filter reviewers
    const filteredReviewers = reviewers
      .filter((v) => v && v !== github.context.actor)
      .filter(unique);
    // set reviewers
    await octokit.rest.pulls.requestReviewers({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number,
      reviewers: filteredReviewers,
      team_reviewers: teamReviewers.filter((v) => v).filter(unique),
    });
    // show result
    core.info("success to assign reviewers");
    core.info(`reviewers: ${reviewers.filter((v) => v).filter(unique)}`);
    core.info(`teams: ${teamReviewers.filter((v) => v).filter(unique)}`);
  } catch (error) {
    core.info("failed to assign reviewers ");
    core.setFailed(error);
  }
}

function unique(value, index, self) {
  return self.indexOf(value) === index;
}

run();
