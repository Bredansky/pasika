/**
 * @fileoverview All markdown ESLint rules for documentation checks.
 */
import { docKindSuffixRule } from "./doc-kind-suffix";
import { exampleHeadingDescriptionRule } from "./example-heading-description";
import { glossaryTermLinkingRule } from "./glossary-term-linking";
import { guideFolderEntryPointRule } from "./guide-folder-entry-point";
import { guideLinkAnchorsRule } from "./guide-link-anchors";
import { guideMentionsDocumentsRule } from "./guide-mentions-documents";
import { guideSectionShapeRule } from "./guide-section-shape";
import { guideStatesNoRequirementRule } from "./guide-states-no-requirement";
import { guideStepSingleLinkRule } from "./guide-step-single-link";
import { guideStepSingleSentenceRule } from "./guide-step-single-sentence";
import { noCrossDocumentLinkRule } from "./no-cross-document-link";
import { noNestedHowToRule } from "./no-nested-how-to";
import { noTemplatePromptRule } from "./no-template-prompt";
import { overviewRule } from "./overview";
import { policyNoExamplesRule } from "./policy-no-examples";
import { policySubjectHeadingsRule } from "./policy-subject-headings";
import { referenceBlockHeadingsRule } from "./reference-block-headings";
import { referenceMaxHeadingDepthRule } from "./reference-max-heading-depth";
import { referenceNoRfcVocabularyRule } from "./reference-no-rfc-vocabulary";
import { requirementPresentRule } from "./requirement-present";
import { rfcKeywordInEveryBulletRule } from "./rfc-keyword-in-every-bullet";
import { rfcOnlyInBulletsRule } from "./rfc-only-in-bullets";
import { rulePairedExamplesRule } from "./rule-paired-examples";
import { supportDocumentPlacementRule } from "./support-document-placement";
import { titleMatchesFileNameRule } from "./title-matches-file-name";

export const documentationRules = {
  "doc-kind-suffix": docKindSuffixRule,
  "title-matches-file-name": titleMatchesFileNameRule,
  overview: overviewRule,
  "guide-step-single-sentence": guideStepSingleSentenceRule,
  "guide-step-single-link": guideStepSingleLinkRule,
  "guide-states-no-requirement": guideStatesNoRequirementRule,
  "requirement-present": requirementPresentRule,
  "rule-paired-examples": rulePairedExamplesRule,
  "example-heading-description": exampleHeadingDescriptionRule,
  "policy-no-examples": policyNoExamplesRule,
  "no-cross-document-link": noCrossDocumentLinkRule,
  "reference-no-rfc-vocabulary": referenceNoRfcVocabularyRule,
  "reference-block-headings": referenceBlockHeadingsRule,
  "reference-max-heading-depth": referenceMaxHeadingDepthRule,
  "support-document-placement": supportDocumentPlacementRule,
  "no-template-prompt": noTemplatePromptRule,
  "guide-folder-entry-point": guideFolderEntryPointRule,
  "rfc-only-in-bullets": rfcOnlyInBulletsRule,
  "rfc-keyword-in-every-bullet": rfcKeywordInEveryBulletRule,
  "policy-subject-headings": policySubjectHeadingsRule,
  "guide-link-anchors": guideLinkAnchorsRule,
  "no-nested-how-to": noNestedHowToRule,
  "glossary-term-linking": glossaryTermLinkingRule,
  "guide-mentions-documents": guideMentionsDocumentsRule,
  "guide-section-shape": guideSectionShapeRule,
};

export type DocumentationRuleName = keyof typeof documentationRules;
