# crew agents

> Settled 2026-11-25

| Agent       | Role        | What it does                                                                                                                                                                                                                | Takes                                    | Gives                 | Tools                                                |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------- | ---------------------------------------------------- |
| Interpreter | Front desk  | • Answers general questions outside the app<br>• Asked about a member's work, asks that member and passes it on<br>• Asks back when a request is unclear<br>• Answered in chat about a conductor's card, points to the card | • User                                   | • User                | • Choice questions<br>• Ask a member                 |
|             | Translate   | • Turns the user's request into the conductor's brief (original attached)<br>• Reports results in words the user follows<br>• Words that fix a finished task or add to one at work go back as the same task                 | • User<br>• App (the conductor's report) | • Conductor<br>• User | • Start a task<br>• Reopen a task                    |
|             | App help    | • Explains the app's features and use<br>• Changes settings and moves screens for the user<br>• Hands a task stuck by a member who left to another member and resumes it                                                    | • User                                   | • User                | • App actions                                        |
| Conductor   | Plan        | • Finds the request's goal and scope<br>• Splits the work into ordered steps<br>• Plans again (failure, plan sent back, request changed)                                                                                    | • Interpreter                            |                       |                                                      |
|             | Assign      | • Sets the task's kind, size, and lone member<br>• The app gives each step to its workflow's member<br>• Work at the same time goes to copies the app makes<br>• The app hands work sent back to its maker again            | • Interpreter                            | • Workers             | • Call workers                                       |
|             | Supervise   | • The app runs the steps; decides how to go on when one is stuck or the request changes<br>• Judges from the reviews and tests whether the goal is met<br>• Asks the user, with choices, what only they decide              | • Workers<br>• User (card answers)       | • Interpreter         | • Choice questions                                   |
| Researcher  | Gather      | • Finds what is needed on the web, in documents, and in the project                                                                                                                                                         | • Conductor                              |                       | • Web search<br>• Read PDF and Office                |
|             | Check       | • Checks that sources are official and current                                                                                                                                                                              |                                          |                       | • Web search                                         |
|             | Report      | • Passes on what it found, with sources                                                                                                                                                                                     |                                          | • Conductor           |                                                      |
| Coder       | Write       | • Writes and changes code within the brief<br>• Sent back, fixes only the points raised<br>• Keeps the build working                                                                                                        | • Conductor (brief, points sent back)    |                       | • Run commands                                       |
|             | Report      | • Passes on the files it changed                                                                                                                                                                                            |                                          | • Conductor           |                                                      |
| Writer      | Write       | • Writes documents and material within the brief<br>• Sent back, fixes only the points raised                                                                                                                               | • Conductor (brief, points sent back)    |                       | • Write PDF and Office<br>• Make charts and pictures |
|             | Report      | • Passes on what it made                                                                                                                                                                                                    |                                          | • Conductor           |                                                      |
| Reviewer    | Plan        | • Before big work starts, checks the plan's scope and order                                                                                                                                                                 | • Conductor (plan)                       | • Conductor           |                                                      |
|             | Scope       | • Checks for features the request did not ask for<br>• Checks for features the request asked for that are missing                                                                                                           | • Conductor (request and result only)    |                       | • Compare changes                                    |
|             | Correctness | • Checks the code does what it means to<br>• Checks edge cases and error handling                                                                                                                                           |                                          |                       | • Compare changes                                    |
|             | Structure   | • Checks the coding style<br>• Checks the folder and file layout<br>• Front end: checks the design system<br>• Back end: checks the layered architecture                                                                    |                                          |                       | • Compare changes                                    |
|             | Improve     | • Looks at the whole project and suggests what to fix<br>• Changes no code                                                                                                                                                  | • Conductor                              | • Conductor           |                                                      |
|             | Report      | • Each problem in detail (where, what, how to reproduce, why)<br>• A severity on each (must fix, note)<br>• Sends back if anything must be fixed, passes otherwise                                                          |                                          | • Conductor           |                                                      |
| Proofreader | Scope       | • Checks for content the request did not ask for<br>• Checks for content the request asked for that is missing                                                                                                              | • Conductor (request and result only)    |                       | • Read PDF and Office                                |
|             | Correctness | • Checks facts and figures<br>• Checks the parts agree with each other                                                                                                                                                      |                                          |                       | • Web search                                         |
|             | Report      | • Each problem in detail (where, what, why)<br>• A severity on each (must fix, note)<br>• Sends back if anything must be fixed, passes otherwise                                                                            |                                          | • Conductor           |                                                      |
| Tester      | Run         | • Runs the tests<br>• Checks the behavior on the real screen                                                                                                                                                                | • Conductor (request and result only)    |                       | • Run commands<br>• Screenshots                      |
|             | Report      | • Each failure in detail (where, output, how to reproduce)<br>• A severity on each (must fix, note)<br>• Sends back if anything must be fixed, passes otherwise                                                             |                                          | • Conductor           |                                                      |
| Images      | Describe    | • Describes screenshots, charts, and photos in words                                                                                                                                                                        | • Workers                                | • Workers             | • View images                                        |
| Librarian   | Record      | • When a task ends, records its report, memories, and changed files in the wiki<br>• Records commits made outside the app                                                                                                   | • App (task ends, commits)               |                       | • Run commands (git log)                             |
|             | Tidy        | • Finds clashing, stale, and unlinked documents, and topics with none<br>• Merges documents on the same topic                                                                                                               |                                          |                       |                                                      |

Workers are the researcher, coder, writer, reviewer, proofreader, and tester. Searching, reading, and writing files, reading the wiki, and memory are everyone's, so they are left out.

| Agent       | Skills                                         | Writes        | Starting model |
| ----------- | ---------------------------------------------- | ------------- | -------------- |
| Interpreter | brief                                          | Nothing       | Sonnet         |
| Conductor   | plan                                           | Output folder | Opus           |
| Researcher  | research                                       | Output folder | Sonnet         |
| Coder       | code, conventions                              | Project       | Sonnet         |
| Writer      | write                                          | Project       | Sonnet         |
| Reviewer    | plan-review, code-review, conventions, verdict | Output folder | Opus           |
| Proofreader | doc-review, verdict                            | Output folder | Sonnet         |
| Tester      | verify, verdict                                | Output folder | Haiku          |
| Images      | image                                          | Output folder | Sonnet         |
| Librarian   | wiki                                           | Wiki only     | Sonnet         |

**Workflows**

- Every task starts with assign (conductor). The interpreter passes on the request only.
- Once every step passes, judge (conductor) decides to finish, send back, plan again, or stop.
- Code change: plan (conductor) → plan review (reviewer) → develop (coder) → code review (reviewer) and test (tester) together
  - A small change skips the plan and the plan review.
- Document: write (writer) → doc review (proofreader)
- Research: research (researcher)
- Improvement: structure review (reviewer)
- Work the conductor gives one agent alone is one step.

**Why**

- Translate: the original goes along, so the conductor can check the reading against it.
- Plan: work sent back is fixed by its maker. Sent back past the limit, the plan is made again. A task with no plan is sent back another way or stopped by judge.
- Assign: a copy has its original's definition, so it needs no approval, and it leaves when the task ends.
- Review and test: the most important steps. A review checks by reading, a test by running.
  - Nothing the request did not ask for is called "missing", and anything added beyond the request is sent back.
  - The maker's own account is not read, only the request and the result, so it cannot lead the check.
  - "Note" is its own severity so small points do not grow the feature.
  - The reviewer's structure rules are the project's own. A taste no rule states is only a "note".
- Write: something that looks better is suggested in the report, not built.
- Images: called when a worker on a text-only model has to deal with a picture.
- Asking a peer: a worker stuck mid-step asks a fellow worker directly, never one at work and never itself.

**Rules**

- There is one conductor per chat session. Tasks at the same time are shared by conductor copies.
- A changed request goes from the interpreter to that task's conductor, who plans again. A separate request gets a new task.
- Only the coder and the writer change project files.
- Skills and tools never change mid-task. Only the user changes them.
- Each step may be sent back a set number of times. Past it, or sent back again with nothing changed, the conductor plans again once. Past it again, the task stops and the user is told.
- A failed run is tried again after a wait.

**Memory**

- Each agent remembers what only it needs on its next run: tastes the user told it, commands that work in this project.
- Memory is one file per agent, `.crew/memory/<agent>.md` at the project root. A copy uses its original's.
- Kept: when the user states a taste or a way of working, when sent back or corrected, when a command or a workaround is found to work
- Not kept: progress that matters only to this task. A line is never written twice, and a wrong one is fixed.
- Tidied just before handing back.
- Facts about the project go in the wiki, not memory.

**Wiki**

- Follows Karpathy's LLM Wiki: sources stay as they are, only the librarian writes the wiki, and every new source is taken in.
- Sources: each agent's memory, the project files, commit messages, and task reports. The librarian only reads them.
- The wiki is one file per document in `.crew/wiki/` at the project root, linked with `[[title]]`. The links are the graph.
- `index.md` (each document's link and first line) and `log.md` (the change log) are made by the app. Other agents get the list on each run.
- The librarian runs apart from tasks: when a task ends, and at start when commits were made outside the app. A project opened the first time only marks the current commit and reads no history.
- Other agents only read the wiki, and put what is worth keeping in their handback.
- The user reads it on screen and may edit the files directly.

**Not settled yet**

- Reasoning effort
- Whether to show the user what agents said to each other
