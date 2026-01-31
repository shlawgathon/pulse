# CS Scenario Ideas

Creative directions for computer science situated evaluations.

---

## Agent Orchestration & Communication

**Multi-Agent Coordination**
Give them 3 agents with different capabilities and token budgets. The task requires coordination across all three. Tests decomposition, prompt clarity, knowing when to intervene versus letting agents run.

**Stuck Agent Recovery**
An agent is stuck in a loop - retrying the same failed approach. Do they recognize it? How do they unstick it? Do they know when to take over manually?

**Blind Trust Detection**
An agent produces subtly wrong code that passes all tests. Do they catch it or blindly trust the green checkmarks? Tests skepticism and verification habits.

---

## Code Archaeology

**Zero Documentation Feature Addition**
Drop them into a legacy codebase with no documentation. Task: add a feature. Tests code reading, pattern recognition, inferring intent from structure alone.

**The Weird Decision**
The original author made a strange architectural choice. Is it a bug? A workaround for something non-obvious? Or just bad code? Tests judgment under uncertainty - do they "fix" something that was actually intentional?

---

## Review & Critique

**AI PR Review**
They don't write code. They review a pull request from an "AI agent" or "junior dev." Tests reading comprehension, catching subtle bugs, security awareness, ability to give constructive feedback.

**Buried Flaw**
The PR is mostly good but has one critical flaw buried in boring boilerplate. Do they skim or actually read?

---

## System Failure Roleplay

**Production Is Down**
Clock is ticking. They have logs, metrics, access to rollback. Tests triage, prioritization, staying calm, knowing when to escalate versus keep digging.

**Cascading Failure**
The "fix" they implement causes a different failure. Do they notice? Do they have the humility to rollback their own change?

---

## Adversarial Debugging

**Misleading Code**
Code works but is intentionally deceptive. Variable names lie. Comments are outdated or wrong. Tests deep reading versus surface skimming.

**False Positive Tests**
A test passes but for the wrong reason - it's not actually verifying what it claims to verify. Do they investigate behavior or trust the green checkmark?

---

## Collaboration Simulation

**Context Switch**
They're mid-task when a "teammate" messages with a question. Do they context-switch gracefully? Help without derailing themselves? Recognize when the question reveals a deeper misunderstanding worth addressing?

**Conflicting Stakeholders**
Two "stakeholders" give conflicting requirements. Navigate the ambiguity. Tests communication, clarification, and knowing when to push back.

---

## Resource-Constrained Problem Solving

**Budget Limits**
Limited API calls. Limited compute. Limited time. Tests efficiency, prioritization, knowing when "good enough" is the right answer.

**Cost Awareness**
"You have $5 of compute budget." Every agent call, every test run, every deployment has a cost. Finish the task under budget.

---

## Teaching as Testing

**Explain to a Junior**
They explain a concept to a simulated junior dev who asks increasingly probing questions. Tests depth of understanding - you only truly know something if you can teach it.

**Catch the Misconception**
The "junior" deliberately misunderstands in common ways. Do they catch and correct the misconception, or let it slide?

---

## Specification Ambiguity

**Vague Requirements**
Intentionally unclear spec. What questions do they ask before coding? Do they assume or clarify? Do they document their assumptions?

**Letter vs Spirit**
They ship something that technically meets the spec but completely misses the obvious user intent. Tests product thinking, not just code execution.

---

## The "Do Nothing" Test

**Restraint**
A scenario where the correct answer is to not change anything. The code looks weird but is actually correct. The "bug report" is user error. The performance "issue" is within acceptable bounds.

Tests investigation before action. The instinct to fix can be a liability when nothing is broken.
