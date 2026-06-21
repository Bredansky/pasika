# Documentation Guide

## Summary

- This guide defines how Markdown documentation should be structured in this repository.
- It is for engineers and agents writing or reviewing engineering docs.

## Scope

- Reusable markdown template for documents
- Section structure, ordering, and rules

## Core Concept

- The underlying idea is that every new doc is built from the template plus the rules in this guide.
- It matters because this combination creates a predictable structure for humans and agents.
- When creating a new doc, find the answers to doc-structure questions in this guide.

## Template Reference

- The template defines the structural skeleton every doc in this repo follows.
- A shared skeleton gives readers predictable navigation.
- When writing or auditing a doc, follow this skeleton — see [documentation-template.md](./documentation-template.md).

## Doc Structure Rule

- A doc MUST have Summary, Scope, and Core Concept sections, in that order, before any factory section.

## Requirement Words Rule

- Rules MUST use `MUST`, `MUST NOT`, `SHOULD`, or `MAY`, where `MUST` is required, `MUST NOT` is forbidden, `SHOULD` is recommended with exceptions possible, and `MAY` is optional.

## Factory Coverage Rule

- A doc MUST contain at least one `[Rule Name] Rule`, `[Topic] Reference`, or `How To [Workflow]` section.
- Factory sections MAY appear multiple times in one doc.
- Each factory instance is named specifically — e.g., `## Kebab Case Rule`, `## Semantic UI Tokens Reference`, `## How To Add a Feature`. A factory instance is self-contained and linkable.
