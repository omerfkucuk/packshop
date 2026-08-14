// This barrel is exported as its own client-safe subpath ("./use-cases")
// specifically because it's provider-free - never let anything reachable
// from here import a concrete LlmProvider (openai-provider.ts pulls in the
// `openai` SDK), or a client component importing this subpath would bundle
// a server-only dependency, exactly the trap the architecture doc's
// history already records once for the storefront.
export * from "./compose-design"
export * from "./resolve-theme-template"
