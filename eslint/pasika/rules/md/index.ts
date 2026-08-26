/**
 * @fileoverview All markdown ESLint rules for documentation checks.
 */
import { docKindSuffixRule } from "./doc-kind-suffix.js";
import { titleMatchesFileNameRule } from "./title-matches-file-name.js";
import { overviewPresentRule } from "./overview-present.js";
import { overviewLengthRule } from "./overview-length.js";
import { guideOverviewNoLinksRule } from "./guide-overview-no-links.js";
import { guideStepSingleSentenceRule } from "./guide-step-single-sentence.js";
import { guideStepSingleLinkRule } from "./guide-step-single-link.js";
import { guideStatesNoRequirementRule } from "./guide-states-no-requirement.js";
import { requirementPresentRule } from "./requirement-present.js";
import { rulePairedExamplesRule } from "./rule-paired-examples.js";
import { exampleHeadingDescriptionRule } from "./example-heading-description.js";
import { policyNoExamplesRule } from "./policy-no-examples.js";
import { policySingleDocumentRule } from "./policy-single-document.js";
import { noCrossDocumentLinkRule } from "./no-cross-document-link.js";
import { referenceNoRfcVocabularyRule } from "./reference-no-rfc-vocabulary.js";
import { referenceBlockHeadingsRule } from "./reference-block-headings.js";
import { supportDocumentPlacementRule } from "./support-document-placement.js";
import { noTemplatePromptRule } from "./no-template-prompt.js";
import { guideFolderEntryPointRule } from "./guide-folder-entry-point.js";
import { rfcOnlyInBulletsRule } from "./rfc-only-in-bullets.js";
import { policySubjectHeadingsRule } from "./policy-subject-headings.js";
import { guideLinkAnchorsRule } from "./guide-link-anchors.js";
import { noNestedHowToRule } from "./no-nested-how-to.js";
import { glossaryTermLinkingRule } from "./glossary-term-linking.js";

export const mdRules = {
  "doc-kind-suffix": docKindSuffixRule,
  "title-matches-file-name": titleMatchesFileNameRule,
  "overview-present": overviewPresentRule,
  "overview-length": overviewLengthRule,
  "guide-overview-no-links": guideOverviewNoLinksRule,
  "guide-step-single-sentence": guideStepSingleSentenceRule,
  "guide-step-single-link": guideStepSingleLinkRule,
  "guide-states-no-requirement": guideStatesNoRequirementRule,
  "requirement-present": requirementPresentRule,
  "rule-paired-examples": rulePairedExamplesRule,
  "example-heading-description": exampleHeadingDescriptionRule,
  "policy-no-examples": policyNoExamplesRule,
  "policy-single-document": policySingleDocumentRule,
  "no-cross-document-link": noCrossDocumentLinkRule,
  "reference-no-rfc-vocabulary": referenceNoRfcVocabularyRule,
  "reference-block-headings": referenceBlockHeadingsRule,
  "support-document-placement": supportDocumentPlacementRule,
  "no-template-prompt": noTemplatePromptRule,
  "guide-folder-entry-point": guideFolderEntryPointRule,
  "rfc-only-in-bullets": rfcOnlyInBulletsRule,
  "policy-subject-headings": policySubjectHeadingsRule,
  "guide-link-anchors": guideLinkAnchorsRule,
  "no-nested-how-to": noNestedHowToRule,
  "glossary-term-linking": glossaryTermLinkingRule,
};

export type MdRuleName = keyof typeof mdRules;
