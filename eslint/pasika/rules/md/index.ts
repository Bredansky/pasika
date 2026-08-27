/**
 * @fileoverview All markdown ESLint rules for documentation checks.
 */
import { docKindSuffixRule } from "./doc-kind-suffix";
import { titleMatchesFileNameRule } from "./title-matches-file-name";
import { overviewPresentRule } from "./overview-present";
import { overviewLengthRule } from "./overview-length";
import { guideOverviewNoLinksRule } from "./guide-overview-no-links";
import { guideStepSingleSentenceRule } from "./guide-step-single-sentence";
import { guideStepSingleLinkRule } from "./guide-step-single-link";
import { guideStatesNoRequirementRule } from "./guide-states-no-requirement";
import { requirementPresentRule } from "./requirement-present";
import { rulePairedExamplesRule } from "./rule-paired-examples";
import { exampleHeadingDescriptionRule } from "./example-heading-description";
import { policyNoExamplesRule } from "./policy-no-examples";
import { policySingleDocumentRule } from "./policy-single-document";
import { noCrossDocumentLinkRule } from "./no-cross-document-link";
import { referenceNoRfcVocabularyRule } from "./reference-no-rfc-vocabulary";
import { referenceBlockHeadingsRule } from "./reference-block-headings";
import { supportDocumentPlacementRule } from "./support-document-placement";
import { noTemplatePromptRule } from "./no-template-prompt";
import { guideFolderEntryPointRule } from "./guide-folder-entry-point";
import { rfcOnlyInBulletsRule } from "./rfc-only-in-bullets";
import { policySubjectHeadingsRule } from "./policy-subject-headings";
import { guideLinkAnchorsRule } from "./guide-link-anchors";
import { noNestedHowToRule } from "./no-nested-how-to";
import { glossaryTermLinkingRule } from "./glossary-term-linking";

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
