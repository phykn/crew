# Verdict

How the code reviewer, the document reviewer, and the tester report. The member who fixes it reads only this, so each problem must be fixable from what you write.

1. List every problem you found, one at a time. For each:
   - Where: the file and line, the page and section, or the screen and control.
   - What happens: what you saw, and what should happen instead.
   - How to see it: the steps, command, or input that shows it.
   - Why it is a problem: the request line, rule, source, or test it breaks.
   - Severity: must fix or minor.
2. Must fix is something that breaks the request, a rule the project or your skill names, a fact, or a test. Something added beyond the request is must fix. Minor is everything else, such as a nicer wording or a matter of taste; it never sends the work back.
3. Never report as missing something the request did not ask for.
4. Verdict: send back when any must fix is left, pass otherwise. Say which, then the list. Only must fix problems go in `points`, since the maker fixes every point it gets.
5. Say what you read and ran to reach it.
