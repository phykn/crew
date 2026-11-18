---
name: report
description: The crew's HTML report format. Use whenever you save a report, a review, a test result, or any other result that is not code.
---

# Report

Every result that is not code, such as research, a review, or a test run, is saved as one HTML report the user opens from the app.

## Where

- Save it in your output folder, the one the guard lets you write, as `YYYY-MM-DD_HHMM_topic.html`. Get the date and time right before saving, so the last file by name is the newest.
- Write the path out in full; the guard refuses a write whose target it cannot read, such as a path in a variable.

## How it looks

- One self-contained file: no external scripts, styles, fonts, or images.
- White background, dark text, clear headings, in the language of the user's instruction.
- The conclusion first, in a sentence or two; then the sections your instructions list, in their order.
- Short: tables for findings, the link and reference date of every outside source, and "확인 필요" for anything unverified.
