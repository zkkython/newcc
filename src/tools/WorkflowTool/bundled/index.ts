export type BundledWorkflowDefinition = {
  name: string
  description: string
  prompt: string
  disableModelInvocation?: boolean
}

const bundledWorkflows: BundledWorkflowDefinition[] = []
let isInitialized = false

export function initBundledWorkflows(): void {
  if (isInitialized) return
  isInitialized = true
}

export function getBundledWorkflows(): readonly BundledWorkflowDefinition[] {
  if (!isInitialized) {
    initBundledWorkflows()
  }
  return bundledWorkflows
}
